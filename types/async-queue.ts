// Shared TypeScript types for async queue architecture

export type JobStatus = 'queued' | 'processing' | 'completed' | 'failed';

export interface Job {
  jobId: string;           // UUID v4
  userId: string;          // User who uploaded
  filename: string;        // Original filename
  fileSize: number;        // Bytes
  storageUrl: string;      // Signed R2 URL
  status: JobStatus;
  priority: number;        // 0 = normal, 10 = premium
  retryCount: number;      // 0-3
  createdAt: Date;         // Upload time
  startedAt?: Date;        // Processing start time
  completedAt?: Date;      // Processing end time
  error?: string;          // Error message if failed
}

export interface JobResult {
  jobId: string;
  result: {
    vocabulary: Array<{
      word: string;
      definition: string;
      examples: string[];
    }>;
    flashcards: Array<{
      front: string;
      back: string;
    }>;
    wordCount: number;
  };
  createdAt: Date;
}

export interface JobErrorLog {
  jobId: string;
  error: string;
  stackTrace?: string;
  retryCount: number;
  timestamp: Date;
}

export interface CachedJobStatus {
  status: JobStatus;
  progress: number; // 0-100
  queuedAt?: number;
  startedAt?: number;
  completedAt?: number;
  error?: string;
  result?: JobResult['result'];
}

export interface UploadResponse {
  success: boolean;
  jobId?: string;
  message: string;
  estimatedTime?: number; // Estimated processing time in seconds
  error?: string;
}

export interface StatusResponse {
  success: boolean;
  status?: JobStatus;
  progress?: number;  // 0-100
  queuedAt?: number;
  startedAt?: number;
  completedAt?: number;
  processingTime?: number;  // milliseconds
  result?: JobResult['result'];
  error?: string;
}

export interface QueueJob {
  jobId: string;
  storageUrl: string;
  priority: number;
  queuedAt: number;
}
