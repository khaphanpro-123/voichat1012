// Centralized configuration for async queue architecture

export const asyncQueueConfig = {
  // File upload limits
  maxFileSize: 50 * 1024 * 1024, // 50MB in bytes
  
  // Priority levels
  priority: {
    standard: 0,
    premium: 10,
  },
  
  // Retry configuration
  maxRetries: 3,
  retryDelays: [1000, 2000, 4000], // Exponential backoff in milliseconds
  
  // Cache TTL
  cacheTTL: {
    jobStatus: 24 * 60 * 60, // 24 hours in seconds
    extendedCache: 7 * 24 * 60 * 60, // 7 days for fallback
  },
  
  // Signed URL expiration
  signedUrlExpiration: 7 * 24 * 60 * 60, // 7 days in seconds
  
  // Polling configuration (frontend)
  polling: {
    interval: 2000, // 2 seconds in milliseconds
    maxDuration: 5 * 60 * 1000, // 5 minutes in milliseconds
    maxAttempts: 150, // 5 minutes / 2 seconds
  },
  
  // Worker configuration
  worker: {
    blockingPopTimeout: 5, // 5 seconds
    processingTimeout: 60 * 60, // 1 hour in seconds
  },
  
  // Progress milestones
  progressMilestones: {
    queued: 0,
    downloaded: 20,
    processing: 50,
    almostDone: 90,
    completed: 100,
  },
  
  // Monitoring thresholds
  monitoring: {
    queueLengthAlert: 100,
    errorRateThreshold: 0.01, // 1%
    workerDowntimeAlert: 5 * 60, // 5 minutes in seconds
  },
  
  // File retention
  fileRetention: {
    storage: 7, // 7 days
    results: -1, // -1 = permanent
  },
} as const;

export type AsyncQueueConfig = typeof asyncQueueConfig;
