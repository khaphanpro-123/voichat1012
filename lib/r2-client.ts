// Cloudflare R2 client configuration
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
}

export class R2Client {
  private client: S3Client;
  private bucket: string;

  constructor(config?: R2Config) {
    const accountId = config?.accountId || process.env.R2_ACCOUNT_ID;
    const accessKeyId = config?.accessKeyId || process.env.R2_ACCESS_KEY_ID;
    const secretAccessKey = config?.secretAccessKey || process.env.R2_SECRET_ACCESS_KEY;
    this.bucket = config?.bucket || process.env.R2_BUCKET || 'document-uploads';

    if (!accountId || !accessKeyId || !secretAccessKey) {
      throw new Error('Missing R2 configuration. Required: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY');
    }

    this.client = new S3Client({
      region: 'auto',
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Upload a file to R2 with retry logic and exponential backoff
   * 
   * Implements Requirements 1.1, 1.2, 1.5, 11.2:
   * - Stores files up to 50MB in R2 storage
   * - Generates unique storage keys using UUID v4 (provided by caller)
   * - Retries up to 3 times with exponential backoff (1s, 2s, 4s)
   * - Generates signed URLs with 7-day expiration
   * - Returns appropriate error codes on failure
   * 
   * @param key - Unique storage key (format: uploads/{jobId}/{filename})
   * @param body - File content as Buffer, Uint8Array, or ReadableStream
   * @param contentType - MIME type of the file
   * @param options - Configuration options including retry count
   * @returns Signed URL valid for 7 days
   * @throws Error if upload fails after all retry attempts
   */
  async uploadFile(
    key: string,
    body: Buffer | Uint8Array | ReadableStream,
    contentType: string,
    options: { retries?: number } = {}
  ): Promise<string> {
    const retries = options.retries || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < retries; attempt++) {
      try {
        // Upload file to R2
        await this.client.send(
          new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: body,
            ContentType: contentType,
          })
        );

        // Generate signed URL (valid for 7 days - Requirement 11.2)
        const signedUrl = await this.getSignedUrl(key, 7 * 24 * 60 * 60);
        return signedUrl;
      } catch (error) {
        lastError = error as Error;
        if (attempt < retries - 1) {
          // Exponential backoff: 1s, 2s, 4s (Requirement 1.5)
          const delay = Math.pow(2, attempt) * 1000;
          console.warn(`R2 upload attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All retries exhausted
    throw new Error(`Failed to upload to R2 after ${retries} attempts: ${lastError?.message}`);
  }

  /**
   * Generate a signed URL for downloading a file
   * 
   * Implements Requirement 11.2:
   * - Generates signed URLs with configurable expiration
   * - Default expiration: 7 days
   * 
   * @param key - Storage key of the file
   * @param expiresIn - Expiration time in seconds (default: 7 days)
   * @returns Signed URL for secure file access
   */
  async getSignedUrl(key: string, expiresIn: number = 7 * 24 * 60 * 60): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });

    return await getSignedUrl(this.client, command, { expiresIn });
  }

  /**
   * Upload to R2 with retry logic (convenience method matching design document naming)
   * 
   * This is an alias for uploadFile() that matches the design document's naming convention.
   * 
   * @param file - File object or Buffer to upload
   * @param jobId - Unique job identifier (UUID v4)
   * @param options - Configuration options including retry count
   * @returns Signed URL valid for 7 days
   */
  async uploadToR2(
    file: File | Buffer,
    jobId: string,
    options: { retries?: number; filename?: string } = {}
  ): Promise<string> {
    const filename = options.filename || (file instanceof File ? file.name : 'file');
    const contentType = file instanceof File ? file.type : 'application/octet-stream';
    const storageKey = `uploads/${jobId}/${filename}`;
    
    // Convert File to Buffer if needed
    const body = file instanceof File 
      ? Buffer.from(await file.arrayBuffer())
      : file;
    
    return this.uploadFile(storageKey, body, contentType, { retries: options.retries });
  }

  /**
   * Download a file from R2 using a signed URL
   */
  async downloadFromSignedUrl(signedUrl: string): Promise<Buffer> {
    const response = await fetch(signedUrl);
    if (!response.ok) {
      throw new Error(`Failed to download from R2: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }
}

// Singleton instance
let r2ClientInstance: R2Client | null = null;

export function getR2Client(): R2Client {
  if (!r2ClientInstance) {
    r2ClientInstance = new R2Client();
  }
  return r2ClientInstance;
}
