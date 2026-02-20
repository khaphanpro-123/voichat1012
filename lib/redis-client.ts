// Upstash Redis client configuration
import { Redis } from '@upstash/redis';
import type { QueueJob, CachedJobStatus, JobStatus } from '@/types/async-queue';

export interface RedisConfig {
  url: string;
  token: string;
}

export class RedisQueueClient {
  private client: Redis;

  constructor(config?: RedisConfig) {
    const url = config?.url || process.env.UPSTASH_REDIS_URL;
    const token = config?.token || process.env.UPSTASH_REDIS_TOKEN;

    if (!url || !token) {
      throw new Error('Missing Redis configuration. Required: UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN');
    }

    this.client = new Redis({
      url,
      token,
    });
  }

  /**
   * Push a job to the priority queue
   */
  async pushToQueue(job: QueueJob): Promise<void> {
    // Use sorted set for priority queue (score = priority, higher = processed first)
    await this.client.zadd('job_queue', {
      score: job.priority,
      member: JSON.stringify(job),
    });

    // Set initial status
    await this.setJobStatus(job.jobId, {
      status: 'queued',
      progress: 0,
      queuedAt: job.queuedAt,
    });

    // Notify workers of new job
    await this.client.lpush('job_notification', '1');
  }

  /**
   * Pop the highest priority job from the queue
   * Returns null if queue is empty
   */
  async popFromQueue(): Promise<QueueJob | null> {
    // Use ZPOPMAX to get highest priority job
    const result = await this.client.zpopmax('job_queue', 1);

    if (!result || result.length === 0) {
      return null;
    }

    // Result format: [member, score]
    const [jobData] = result;
    return JSON.parse(jobData as string) as QueueJob;
  }

  /**
   * Blocking pop - waits for a job notification
   * Returns after timeout seconds if no notification received
   */
  async waitForJob(timeout: number = 5): Promise<boolean> {
    const result = await this.client.brpop('job_notification', timeout);
    return result !== null;
  }

  /**
   * Get the current queue length
   */
  async getQueueLength(): Promise<number> {
    return await this.client.zcard('job_queue');
  }

  /**
   * Set job status in cache
   */
  async setJobStatus(
    jobId: string,
    status: CachedJobStatus,
    ttl: number = 24 * 60 * 60 // 24 hours default
  ): Promise<void> {
    await this.client.setex(
      `job:${jobId}:status`,
      ttl,
      JSON.stringify(status)
    );
  }

  /**
   * Get job status from cache
   */
  async getJobStatus(jobId: string): Promise<CachedJobStatus | null> {
    const data = await this.client.get(`job:${jobId}:status`);
    if (!data) return null;
    return JSON.parse(data as string) as CachedJobStatus;
  }

  /**
   * Update job progress
   */
  async updateProgress(jobId: string, progress: number): Promise<void> {
    const status = await this.getJobStatus(jobId);
    if (status) {
      status.progress = progress;
      await this.setJobStatus(jobId, status);
    }
  }

  /**
   * Update job status and progress
   */
  async updateJobStatus(
    jobId: string,
    newStatus: JobStatus,
    progress: number,
    additionalData?: Partial<CachedJobStatus>
  ): Promise<void> {
    const currentStatus = await this.getJobStatus(jobId);
    const updatedStatus: CachedJobStatus = {
      ...(currentStatus || {}),
      status: newStatus,
      progress,
      ...additionalData,
    };

    await this.setJobStatus(jobId, updatedStatus);
  }

  /**
   * Delete job status from cache
   */
  async deleteJobStatus(jobId: string): Promise<void> {
    await this.client.del(`job:${jobId}:status`);
  }

  /**
   * Check if Redis is available
   */
  async ping(): Promise<boolean> {
    try {
      const result = await this.client.ping();
      return result === 'PONG';
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let redisClientInstance: RedisQueueClient | null = null;

export function getRedisClient(): RedisQueueClient {
  if (!redisClientInstance) {
    redisClientInstance = new RedisQueueClient();
  }
  return redisClientInstance;
}
