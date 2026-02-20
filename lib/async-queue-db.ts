// MongoDB collections and operations for async queue
import { MongoClient, Db, Collection } from 'mongodb';
import { connectToDatabase } from './mongodb';
import type { Job, JobResult, JobErrorLog, JobStatus } from '@/types/async-queue';

export class AsyncQueueDB {
  private db: Db | null = null;
  private client: MongoClient | null = null;

  async connect(): Promise<void> {
    if (this.db) return;
    const connection = await connectToDatabase();
    this.client = connection.client;
    this.db = connection.db;
  }

  private async getCollection<T>(name: string): Promise<Collection<T>> {
    await this.connect();
    return this.db!.collection<T>(name);
  }

  /**
   * Create required indexes for async queue collections
   */
  async createIndexes(): Promise<void> {
    await this.connect();

    // Jobs collection indexes
    const jobsCollection = await this.getCollection<Job>('jobs');
    await jobsCollection.createIndex({ jobId: 1 }, { unique: true });
    await jobsCollection.createIndex({ userId: 1, createdAt: -1 });
    await jobsCollection.createIndex({ status: 1, createdAt: -1 });

    // Results collection indexes
    const resultsCollection = await this.getCollection<JobResult>('job_results');
    await resultsCollection.createIndex({ jobId: 1 }, { unique: true });

    // Errors collection indexes
    const errorsCollection = await this.getCollection<JobErrorLog>('job_errors');
    await errorsCollection.createIndex({ jobId: 1, timestamp: -1 });
    await errorsCollection.createIndex({ timestamp: -1 });

    console.log('✅ Async queue indexes created successfully');
  }

  /**
   * Create a new job
   */
  async createJob(job: Job): Promise<void> {
    const collection = await this.getCollection<Job>('jobs');
    await collection.insertOne(job as any);
  }

  /**
   * Get a job by ID
   */
  async getJob(jobId: string): Promise<Job | null> {
    const collection = await this.getCollection<Job>('jobs');
    return await collection.findOne({ jobId } as any) as Job | null;
  }

  /**
   * Update job status
   */
  async updateJobStatus(
    jobId: string,
    status: JobStatus,
    additionalFields?: Partial<Job>
  ): Promise<void> {
    const collection = await this.getCollection<Job>('jobs');
    const update: any = {
      status,
      updatedAt: new Date(),
      ...additionalFields,
    };

    if (status === 'processing' && !additionalFields?.startedAt) {
      update.startedAt = new Date();
    } else if (status === 'completed' && !additionalFields?.completedAt) {
      update.completedAt = new Date();
    }

    await collection.updateOne(
      { jobId } as any,
      { $set: update }
    );
  }

  /**
   * Increment retry count
   */
  async incrementRetryCount(jobId: string): Promise<number> {
    const collection = await this.getCollection<Job>('jobs');
    const result = await collection.findOneAndUpdate(
      { jobId } as any,
      { $inc: { retryCount: 1 } },
      { returnDocument: 'after' }
    );
    return result?.retryCount || 0;
  }

  /**
   * Save job results
   */
  async saveResult(result: JobResult): Promise<void> {
    const collection = await this.getCollection<JobResult>('job_results');
    await collection.insertOne(result as any);
  }

  /**
   * Get job result
   */
  async getResult(jobId: string): Promise<JobResult | null> {
    const collection = await this.getCollection<JobResult>('job_results');
    return await collection.findOne({ jobId } as any) as JobResult | null;
  }

  /**
   * Log an error
   */
  async logError(error: JobErrorLog): Promise<void> {
    const collection = await this.getCollection<JobErrorLog>('job_errors');
    await collection.insertOne(error as any);
  }

  /**
   * Get errors for a job
   */
  async getErrors(jobId: string): Promise<JobErrorLog[]> {
    const collection = await this.getCollection<JobErrorLog>('job_errors');
    return await collection
      .find({ jobId } as any)
      .sort({ timestamp: -1 })
      .toArray() as JobErrorLog[];
  }

  /**
   * Get jobs by user ID
   */
  async getJobsByUser(userId: string, limit: number = 50): Promise<Job[]> {
    const collection = await this.getCollection<Job>('jobs');
    return await collection
      .find({ userId } as any)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray() as Job[];
  }

  /**
   * Get jobs by status
   */
  async getJobsByStatus(status: JobStatus, limit: number = 100): Promise<Job[]> {
    const collection = await this.getCollection<Job>('jobs');
    return await collection
      .find({ status } as any)
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray() as Job[];
  }

  /**
   * Check if MongoDB is available
   */
  async ping(): Promise<boolean> {
    try {
      await this.connect();
      await this.db!.admin().ping();
      return true;
    } catch (error) {
      return false;
    }
  }
}

// Singleton instance
let asyncQueueDBInstance: AsyncQueueDB | null = null;

export function getAsyncQueueDB(): AsyncQueueDB {
  if (!asyncQueueDBInstance) {
    asyncQueueDBInstance = new AsyncQueueDB();
  }
  return asyncQueueDBInstance;
}
