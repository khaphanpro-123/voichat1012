import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { randomUUID } from 'crypto';
import { getR2Client } from '@/lib/r2-client';
import { getRedisClient } from '@/lib/redis-client';
import { getAsyncQueueDB } from '@/lib/async-queue-db';
import type { UploadResponse, Job } from '@/types/async-queue';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB in bytes

/**
 * POST /api/async-upload
 * Upload a file for asynchronous processing
 * 
 * Requirements: 1.1, 1.4, 11.1
 */
export async function POST(req: NextRequest): Promise<NextResponse<UploadResponse>> {
  try {
    // 1. Validate authentication (Requirement 11.1)
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json(
        {
          success: false,
          message: 'Invalid or expired authentication token',
          error: 'Unauthorized',
        },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const userRole = (session.user as any).role;

    // 2. Parse multipart form data and extract file
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json(
        {
          success: false,
          message: 'No file provided',
          error: 'Missing file',
        },
        { status: 400 }
      );
    }

    // 3. Validate file size (Requirement 1.4)
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        {
          success: false,
          message: `File size exceeds 50MB limit`,
          error: 'File too large',
        },
        { status: 413 }
      );
    }

    // Validate file size is not zero
    if (file.size === 0) {
      return NextResponse.json(
        {
          success: false,
          message: 'File is empty',
          error: 'Invalid file',
        },
        { status: 400 }
      );
    }

    // 4. Generate unique job ID (Requirement 1.2)
    const jobId = randomUUID();

    // 5. Upload file to R2 storage (Requirement 1.1)
    const r2Client = getR2Client();
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const storageKey = `uploads/${jobId}/${file.name}`;
    
    let storageUrl: string;
    try {
      storageUrl = await r2Client.uploadFile(
        storageKey,
        fileBuffer,
        file.type || 'application/octet-stream',
        { retries: 3 }
      );
    } catch (error) {
      console.error('R2 upload error:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Storage service temporarily unavailable',
          error: 'Storage unavailable',
        },
        { status: 503, headers: { 'Retry-After': '60' } }
      );
    }

    // 6. Determine priority based on user role (Requirement 2.2)
    const priority = userRole === 'premium' ? 10 : 0;

    // 7. Create job metadata in MongoDB (Requirement 1.3)
    const job: Job = {
      jobId,
      userId,
      filename: file.name,
      fileSize: file.size,
      storageUrl,
      status: 'queued',
      priority,
      retryCount: 0,
      createdAt: new Date(),
    };

    const db = getAsyncQueueDB();
    try {
      await db.createJob(job);
    } catch (error) {
      console.error('MongoDB job creation error:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Database temporarily unavailable',
          error: 'Database unavailable',
        },
        { status: 503, headers: { 'Retry-After': '60' } }
      );
    }

    // 8. Push job to Redis queue (Requirement 2.1)
    const redisClient = getRedisClient();
    try {
      await redisClient.pushToQueue({
        jobId,
        storageUrl,
        priority,
        queuedAt: Date.now(),
      });
    } catch (error) {
      console.error('Redis queue push error:', error);
      return NextResponse.json(
        {
          success: false,
          message: 'Queue service temporarily unavailable',
          error: 'Queue unavailable',
        },
        { status: 503, headers: { 'Retry-After': '30' } }
      );
    }

    // 9. Estimate processing time based on file size
    const estimatedTime = Math.ceil(file.size / (1024 * 1024)) * 10; // ~10 seconds per MB

    // 10. Return job ID immediately (Requirement 1.2)
    return NextResponse.json(
      {
        success: true,
        jobId,
        message: 'File uploaded successfully and queued for processing',
        estimatedTime,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('Upload API error:', error);
    return NextResponse.json(
      {
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
