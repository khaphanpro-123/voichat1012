# Implementation Plan: Async Queue Architecture

## Overview

This implementation plan breaks down the async queue architecture into discrete, incremental coding tasks. The approach follows a bottom-up strategy: first establishing infrastructure connections, then implementing core components (Upload API, Worker, Status API), adding testing throughout, and finally integrating everything together. Each task builds on previous work to ensure no orphaned code.

## Tasks

- [x] 1. Set up infrastructure connections and configuration
  - Create environment configuration files for all services (Vercel, Railway)
  - Set up Cloudflare R2 client with authentication
  - Set up Upstash Redis client with connection pooling
  - Verify MongoDB connection and create required collections
  - Create shared TypeScript types for Job, JobStatus, and API responses
  - _Requirements: 1.1, 2.1, 11.1, 11.2_

- [ ] 2. Implement Upload API core functionality
  - [x] 2.1 Create file upload endpoint with multipart form handling
    - Implement POST /api/upload endpoint in Next.js
    - Add file size validation (reject > 50MB)
    - Add authentication token validation
    - Parse multipart form data and extract file
    - _Requirements: 1.1, 1.4, 11.1_
  
  - [x] 2.2 Implement R2 storage upload with retry logic
    - Create uploadToR2 function with exponential backoff retry (3 attempts)
    - Generate unique storage keys using UUID v4
    - Generate signed URLs with 7-day expiration
    - Handle storage errors and return appropriate error codes
    - _Requirements: 1.1, 1.2, 1.5, 11.2_
  
  - [x] 2.3 Write property test for file upload acceptance
    - **Property 1: File Upload Acceptance**
    - **Validates: Requirements 1.1, 1.2**
  
  - [ ] 2.4 Write property test for file size rejection
    - **Property 2: File Size Rejection**
    - **Validates: Requirements 1.4**
  
  - [ ] 2.5 Create job metadata in MongoDB
    - Implement createJob function to insert job document
    - Include all required fields: jobId, userId, filename, fileSize, storageUrl, status, priority, createdAt, retryCount
    - Add error handling for MongoDB write failures
    - _Requirements: 1.3, 2.1_
  
  - [ ] 2.6 Write property test for job metadata completeness
    - **Property 3: Job Metadata Completeness**
    - **Validates: Requirements 1.3**
  
  - [ ] 2.7 Push job to Redis queue with priority
    - Implement pushToQueue function using Redis ZADD for priority queue
    - Set initial job status in Redis with 24-hour TTL
    - Add notification to job_notification list for worker wake-up
    - Determine priority based on user type (premium = 10, standard = 0)
    - _Requirements: 2.1, 2.2, 2.3_
  
  - [ ] 2.8 Write property test for priority assignment
    - **Property 6: Priority Assignment**
    - **Validates: Requirements 2.2**
  
  - [ ] 2.9 Write unit tests for Upload API error scenarios
    - Test invalid authentication (401)
    - Test Redis unavailable (503)
    - Test Storage unavailable (503)
    - Test MongoDB unavailable (503)
    - _Requirements: 11.1, 12.1, 12.2_

- [ ] 3. Checkpoint - Verify Upload API functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 4. Implement Worker process core functionality
  - [ ] 4.1 Create Worker main loop with queue polling
    - Implement Worker class in Python with __init__ and run methods
    - Set up Redis, R2, and MongoDB clients
    - Implement blocking pop from priority queue (ZPOPMAX + BRPOP fallback)
    - Add graceful shutdown handling
    - _Requirements: 3.1, 3.2_
  
  - [ ] 4.2 Implement job processing pipeline
    - Create process_job method that updates status to "processing"
    - Implement download_file method using signed URLs
    - Create process_document method with progress updates (20%, 50%, 90%)
    - Implement save_results method to store in MongoDB
    - Update status to "completed" with 100% progress
    - _Requirements: 3.2, 3.3, 3.4, 3.5_
  
  - [ ] 4.3 Write property test for status transition to processing
    - **Property 10: Status Transition to Processing**
    - **Validates: Requirements 3.2**
  
  - [ ] 4.4 Write property test for progress updates
    - **Property 12: Progress Updates**
    - **Validates: Requirements 3.4**
  
  - [ ] 4.5 Implement retry mechanism for failed jobs
    - Create handle_failure method that increments retry count
    - Log error details to MongoDB errors collection
    - Re-queue job if retry count < 3
    - Set status to "failed" permanently if retry count = 3
    - Send notification for permanent failures
    - _Requirements: 3.6, 3.7, 6.1, 6.2, 6.3_
  
  - [ ] 4.6 Write property test for retry on failure
    - **Property 14: Retry on Failure**
    - **Validates: Requirements 3.6, 6.1, 6.2**
  
  - [ ] 4.7 Write unit test for permanent failure after 3 retries
    - Test that job status becomes "failed" after 3 retries
    - Test that error is logged to MongoDB
    - Test that notification is sent
    - _Requirements: 3.7, 6.3_
  
  - [ ] 4.8 Implement MongoDB write fallback with Redis caching
    - Add try-catch around MongoDB writes in save_results
    - Cache results in Redis with extended TTL (7 days) on MongoDB failure
    - Implement background retry for MongoDB writes
    - _Requirements: 12.4_
  
  - [ ] 4.9 Write property test for MongoDB write fallback
    - **Property 33: MongoDB Write Fallback**
    - **Validates: Requirements 12.4**

- [ ] 5. Checkpoint - Verify Worker functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 6. Implement Status API
  - [ ] 6.1 Create job status endpoint with caching
    - Implement GET /api/job-status/[jobId] endpoint in Next.js
    - Add authentication and job ownership verification
    - Check Redis cache first for job status
    - Fall back to MongoDB if cache miss
    - Cache MongoDB results in Redis with 24-hour TTL
    - _Requirements: 4.1, 4.4, 4.5, 11.4_
  
  - [ ] 6.2 Write property test for status API response completeness
    - **Property 16: Status API Response Completeness**
    - **Validates: Requirements 4.1**
  
  - [ ] 6.3 Add conditional response data based on job status
    - Include result field when status is "completed"
    - Include error field when status is "failed"
    - Calculate and include processing time (completedAt - startedAt)
    - _Requirements: 4.2, 4.3_
  
  - [ ] 6.4 Write property tests for completed and failed job responses
    - **Property 17: Completed Job Response**
    - **Property 18: Failed Job Response**
    - **Validates: Requirements 4.2, 4.3**
  
  - [ ] 6.5 Implement error handling for Status API
    - Return 404 for non-existent jobs
    - Return 403 for unauthorized access
    - Return 503 when both Redis and MongoDB unavailable
    - Add Retry-After header for 503 responses
    - _Requirements: 4.6, 12.5_
  
  - [ ] 6.6 Write unit tests for Status API error scenarios
    - Test 404 for non-existent job
    - Test 403 for unauthorized access
    - Test 503 when databases unavailable
    - _Requirements: 4.6, 11.4, 12.5_

- [ ] 7. Implement Frontend polling component
  - [ ] 7.1 Create useJobPolling React hook
    - Implement polling logic with 2-second intervals
    - Add automatic stop on completion, failure, or timeout (5 minutes)
    - Handle polling errors gracefully
    - Clean up polling on component unmount
    - _Requirements: 5.1, 5.5, 5.6_
  
  - [ ] 7.2 Create DocumentUpload component with progress display
    - Implement file upload form with file input
    - Display progress bar with percentage during polling
    - Display results when status is "completed"
    - Display error message when status is "failed"
    - Display timeout message after 5 minutes
    - _Requirements: 5.2, 5.3, 5.4, 5.5_
  
  - [ ] 7.3 Write integration test for upload-poll-complete flow
    - Test complete flow from upload to result display
    - Verify polling stops on completion
    - Verify timeout after 5 minutes
    - _Requirements: 5.1, 5.3, 5.5_

- [ ] 8. Implement monitoring and logging
  - [ ] 8.1 Add structured logging for all job state changes
    - Log job state transitions with timestamp, jobId, old_status, new_status
    - Log processing time for completed jobs
    - Log full error stack traces for failures
    - Use structured JSON format for all logs
    - _Requirements: 7.1, 7.2, 7.5_
  
  - [ ] 8.2 Write property test for state change logging
    - **Property 21: State Change Logging**
    - **Validates: Requirements 7.1**
  
  - [ ] 8.3 Implement alerting for critical conditions
    - Add alert when queue length exceeds 100 jobs
    - Add alert when error rate exceeds 1% over 5 minutes
    - Add alert when worker is down for > 5 minutes
    - Implement alert notification function (email/webhook)
    - _Requirements: 7.3, 7.4_
  
  - [ ] 8.4 Write unit test for queue length alert
    - Test that alert is sent when queue length > 100
    - _Requirements: 7.3_

- [ ] 9. Implement security features
  - [ ] 9.1 Add authentication validation to all endpoints
    - Implement validateAuth middleware for Upload API
    - Implement validateAuth middleware for Status API
    - Verify JWT token signature and expiration
    - Return 401 for invalid tokens
    - _Requirements: 11.1_
  
  - [ ] 9.2 Write property test for authentication validation
    - **Property 28: Authentication Validation**
    - **Validates: Requirements 11.1**
  
  - [ ] 9.3 Add job ownership verification
    - Verify requesting user owns the job before returning status
    - Return 403 for unauthorized access attempts
    - Log unauthorized access attempts
    - _Requirements: 11.4_
  
  - [ ] 9.4 Write property test for job ownership verification
    - **Property 31: Job Ownership Verification**
    - **Validates: Requirements 11.4**
  
  - [ ] 9.5 Implement signed URL generation and validation
    - Generate signed URLs with 7-day expiration for R2 uploads
    - Verify Worker uses signed URLs from job metadata
    - Add URL expiration handling in Worker
    - _Requirements: 11.2, 11.3_
  
  - [ ] 9.6 Write property tests for signed URL usage
    - **Property 29: Signed URL Generation**
    - **Property 30: Signed URL Usage**
    - **Validates: Requirements 11.2, 11.3**

- [ ] 10. Implement data persistence and cleanup
  - [ ] 10.1 Add Redis TTL management
    - Set 24-hour TTL on job status in Redis
    - Verify TTL is set correctly on all Redis writes
    - _Requirements: 9.1_
  
  - [ ] 10.2 Write property test for job persistence in Redis
    - **Property 24: Job Persistence in Redis**
    - **Validates: Requirements 9.1**
  
  - [ ] 10.3 Ensure permanent MongoDB persistence
    - Verify all completed jobs are stored in MongoDB
    - Add indexes for efficient querying (jobId, userId + createdAt, status + createdAt)
    - _Requirements: 9.2_
  
  - [ ] 10.4 Write property test for job persistence in MongoDB
    - **Property 25: Job Persistence in MongoDB**
    - **Validates: Requirements 9.2**
  
  - [ ] 10.5 Implement cache miss fallback
    - Verify Status API falls back to MongoDB when Redis cache expired
    - Re-cache MongoDB data in Redis after retrieval
    - _Requirements: 9.4_
  
  - [ ] 10.6 Write property test for cache miss fallback
    - **Property 26: Cache Miss Fallback**
    - **Validates: Requirements 9.4**
  
  - [ ] 10.7 Add result compression
    - Compress results before storing in MongoDB using gzip
    - Decompress results when retrieving from MongoDB
    - _Requirements: 10.4_
  
  - [ ] 10.8 Write property test for result compression
    - **Property 27: Result Compression**
    - **Validates: Requirements 10.4**

- [ ] 11. Implement graceful degradation
  - [ ] 11.1 Add error handling for Redis unavailability
    - Return 503 from Upload API when Redis unavailable
    - Log incident and include retry-after header
    - _Requirements: 6.4, 12.1_
  
  - [ ] 11.2 Add error handling for Storage unavailability
    - Return 503 from Upload API when R2 unavailable
    - Retry 3 times with exponential backoff before failing
    - _Requirements: 6.5, 12.2_
  
  - [ ] 11.3 Implement upload resilience during worker downtime
    - Verify Upload API continues accepting uploads when workers are down
    - Verify jobs are queued correctly for later processing
    - _Requirements: 12.3_
  
  - [ ] 11.4 Write property test for upload resilience
    - **Property 32: Upload Resilience During Worker Downtime**
    - **Validates: Requirements 12.3**
  
  - [ ] 11.5 Write unit tests for graceful degradation scenarios
    - Test Redis unavailable returns 503
    - Test Storage unavailable returns 503
    - Test uploads work when workers are down
    - _Requirements: 12.1, 12.2, 12.3_

- [ ] 12. Checkpoint - Verify all core functionality
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement scalability features
  - [ ] 13.1 Add priority queue ordering
    - Verify jobs are popped in priority order (highest first)
    - Test with mixed priority jobs
    - _Requirements: 2.4_
  
  - [ ] 13.2 Write property test for priority queue ordering
    - **Property 8: Priority Queue Ordering**
    - **Validates: Requirements 2.4**
  
  - [ ] 13.3 Implement atomic job dequeue
    - Verify ZPOPMAX provides atomic pop operation
    - Test with multiple workers to ensure no duplicate processing
    - _Requirements: 2.5, 8.3_
  
  - [ ] 13.4 Write property test for atomic job dequeue
    - **Property 9: Atomic Job Dequeue**
    - **Validates: Requirements 2.5, 8.3**
  
  - [ ] 13.5 Add concurrent upload handling
    - Test system with 100 concurrent uploads
    - Verify all uploads complete within 2 seconds each
    - Verify all job IDs are unique
    - _Requirements: 8.1_
  
  - [ ] 13.6 Write property test for concurrent upload handling
    - **Property 23: Concurrent Upload Handling**
    - **Validates: Requirements 8.1**

- [ ] 14. Create deployment configurations
  - [ ] 14.1 Create Vercel deployment configuration
    - Create vercel.json with API routes configuration
    - Set up environment variables in Vercel dashboard
    - Configure build settings for Next.js
    - _Requirements: All Upload API and Status API requirements_
  
  - [ ] 14.2 Create Railway deployment configuration
    - Create railway.toml with worker configuration
    - Set up environment variables in Railway dashboard
    - Configure restart policy (ON_FAILURE, max 10 retries)
    - Set resource limits (2GB RAM, 2 vCPU)
    - _Requirements: All Worker requirements_
  
  - [ ] 14.3 Create MongoDB indexes
    - Create unique index on jobs.jobId
    - Create compound index on jobs.userId + jobs.createdAt
    - Create index on jobs.status + jobs.createdAt
    - Create unique index on results.jobId
    - _Requirements: 9.2_
  
  - [ ] 14.4 Set up Cloudflare R2 bucket
    - Create bucket named "document-uploads"
    - Configure CORS if needed
    - Set up lifecycle policy for 7-day file deletion
    - Generate access keys for API access
    - _Requirements: 1.1, 11.2_
  
  - [ ] 14.5 Set up Upstash Redis instance
    - Create Redis instance with persistence enabled
    - Configure connection pooling
    - Set up password authentication
    - Generate connection URL and token
    - _Requirements: 2.1, 4.5_

- [ ] 15. Integration testing and final wiring
  - [ ] 15.1 Write end-to-end integration test
    - Test complete flow: upload → queue → process → retrieve
    - Verify all components work together
    - Test with various file sizes and types
    - _Requirements: All requirements_
  
  - [ ] 15.2 Write load test for concurrent uploads
    - Test 100 concurrent uploads
    - Verify system handles load gracefully
    - Measure response times and throughput
    - _Requirements: 8.1_
  
  - [ ] 15.3 Write integration test for retry mechanism
    - Simulate processing failures
    - Verify retry logic works end-to-end
    - Verify permanent failure after 3 retries
    - _Requirements: 3.6, 3.7, 6.1, 6.2, 6.3_
  
  - [ ] 15.4 Create monitoring dashboard queries
    - Create MongoDB aggregation queries for job statistics
    - Create Redis queries for queue length monitoring
    - Document key metrics to track
    - _Requirements: 7.1, 7.2, 7.3_
  
  - [ ] 15.5 Create deployment runbook
    - Document deployment steps for all components
    - Document rollback procedures
    - Document troubleshooting steps for common issues
    - Document scaling procedures
    - _Requirements: All requirements_

- [ ] 16. Final checkpoint - Production readiness
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties across all inputs
- Unit tests validate specific examples, edge cases, and error conditions
- Integration tests validate end-to-end flows and component interactions
- The implementation follows a bottom-up approach: infrastructure → components → integration
- All code should be production-ready with proper error handling and logging
- Security features (authentication, authorization) are integrated throughout, not added at the end
