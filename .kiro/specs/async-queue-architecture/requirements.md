# Requirements Document: Async Queue Architecture

## Introduction

This document specifies requirements for an asynchronous queue-based architecture to handle document processing at production scale. The system addresses current limitations including Railway rate limits (500 logs/sec), timeout issues (>60 seconds), and inability to handle concurrent uploads. The architecture enables scalable processing for 1,000-100,000+ users, each uploading 10-1,000 documents (1MB-50MB, 1,000-100,000 words), with 10-100 concurrent uploads.

## Glossary

- **Upload_API**: Vercel-hosted API endpoint that receives file uploads and creates processing jobs
- **Worker**: Railway-hosted Python process that pulls jobs from queue and processes documents
- **Status_API**: Vercel-hosted API endpoint that returns job status and progress
- **Queue_System**: Upstash Redis-based job queue for managing processing tasks
- **Storage_Service**: Cloudflare R2 or AWS S3 for storing uploaded files
- **Job**: A unit of work representing one document to be processed
- **Job_ID**: Unique identifier for tracking a specific processing job
- **Progress_Percentage**: Integer value 0-100 indicating job completion status
- **Job_Status**: Enumeration of states: queued, processing, completed, failed
- **Priority_Level**: Integer value determining job processing order (higher = earlier processing)
- **Retry_Count**: Number of times a failed job has been retried (max 3)

## Requirements

### Requirement 1: File Upload and Storage

**User Story:** As a user, I want to upload large documents up to 50MB, so that I can process documents without size limitations.

#### Acceptance Criteria

1. WHEN a user uploads a file up to 50MB, THE Upload_API SHALL accept the file and store it in Storage_Service
2. WHEN a file is uploaded, THE Upload_API SHALL generate a unique Job_ID within 1 second
3. WHEN a file is stored, THE Upload_API SHALL create job metadata in MongoDB with Job_ID, user_id, filename, file_size, upload_timestamp, and storage_url
4. WHEN the Upload_API receives a file larger than 50MB, THE Upload_API SHALL reject the upload and return an error message
5. WHEN storage upload fails, THE Upload_API SHALL retry up to 3 times before returning an error

### Requirement 2: Job Queue Management

**User Story:** As a system administrator, I want jobs to be queued and prioritized, so that the system can handle high load and prioritize premium users.

#### Acceptance Criteria

1. WHEN a file is successfully uploaded, THE Upload_API SHALL push a job entry to Queue_System with Job_ID, storage_url, and Priority_Level
2. WHEN a premium user uploads a file, THE Queue_System SHALL assign a higher Priority_Level than standard users
3. WHEN a job is pushed to the queue, THE Queue_System SHALL set Job_Status to "queued" in Redis
4. WHEN multiple jobs exist in the queue, THE Queue_System SHALL order jobs by Priority_Level (highest first)
5. WHEN a Worker pulls a job, THE Queue_System SHALL remove it from the queue atomically to prevent duplicate processing

### Requirement 3: Worker Processing

**User Story:** As a system operator, I want workers to process documents without timeout limits, so that large documents can be fully processed.

#### Acceptance Criteria

1. WHEN a Worker starts, THE Worker SHALL continuously poll Queue_System using blocking pop (BRPOP) for new jobs
2. WHEN a Worker receives a job, THE Worker SHALL update Job_Status to "processing" in Redis and MongoDB
3. WHEN a Worker begins processing, THE Worker SHALL download the file from Storage_Service using the storage_url
4. WHEN a Worker processes a document, THE Worker SHALL update Progress_Percentage in Redis at intervals (0%, 20%, 50%, 90%, 100%)
5. WHEN processing completes successfully, THE Worker SHALL save results to MongoDB, set Job_Status to "completed", and set Progress_Percentage to 100%
6. WHEN processing fails, THE Worker SHALL increment Retry_Count, set Job_Status to "failed", and re-queue the job if Retry_Count is less than 3
7. WHEN Retry_Count reaches 3, THE Worker SHALL set Job_Status to "failed" permanently and log the error to MongoDB

### Requirement 4: Status Tracking and API

**User Story:** As a user, I want to check my document processing status in real-time, so that I know when my results are ready.

#### Acceptance Criteria

1. WHEN a client requests GET /api/job-status/{job_id}, THE Status_API SHALL return Job_Status, Progress_Percentage, and processing_time
2. WHEN Job_Status is "completed", THE Status_API SHALL include the processing results in the response
3. WHEN Job_Status is "failed", THE Status_API SHALL include the error message in the response
4. WHEN a status is requested, THE Status_API SHALL first check Redis cache before querying MongoDB
5. WHEN status data is retrieved from MongoDB, THE Status_API SHALL cache it in Redis with TTL of 24 hours
6. WHEN a job does not exist, THE Status_API SHALL return a 404 error with message "Job not found"

### Requirement 5: Frontend Polling and Progress Display

**User Story:** As a user, I want to see real-time progress of my document processing, so that I know how long to wait.

#### Acceptance Criteria

1. WHEN a user uploads a file, THE Frontend SHALL receive Job_ID from Upload_API and begin polling Status_API every 2 seconds
2. WHEN polling Status_API, THE Frontend SHALL display Progress_Percentage in a progress bar
3. WHEN Job_Status changes to "completed", THE Frontend SHALL stop polling and display the results
4. WHEN Job_Status changes to "failed", THE Frontend SHALL stop polling and display the error message
5. WHEN polling continues for 5 minutes without completion, THE Frontend SHALL stop polling and display a timeout message
6. WHEN the user navigates away from the page, THE Frontend SHALL stop polling

### Requirement 6: Error Handling and Retry Mechanism

**User Story:** As a system operator, I want failed jobs to retry automatically, so that transient errors don't require manual intervention.

#### Acceptance Criteria

1. WHEN a Worker encounters an error during processing, THE Worker SHALL increment Retry_Count and re-queue the job if Retry_Count is less than 3
2. WHEN a job is retried, THE Worker SHALL log the error details to MongoDB with timestamp, error_message, and Retry_Count
3. WHEN Retry_Count reaches 3, THE Worker SHALL set Job_Status to "failed" permanently and send a notification
4. WHEN Queue_System (Redis) is unavailable, THE Upload_API SHALL return an error and log the incident
5. WHEN Storage_Service is unavailable, THE Upload_API SHALL retry the upload 3 times with exponential backoff before failing

### Requirement 7: Monitoring and Logging

**User Story:** As a system administrator, I want comprehensive logging and monitoring, so that I can identify and resolve issues quickly.

#### Acceptance Criteria

1. WHEN any job state changes (queued, processing, completed, failed), THE System SHALL log the event to MongoDB with timestamp, Job_ID, old_status, new_status, and processing_time
2. WHEN a Worker processes a job, THE System SHALL record the processing_time in MongoDB
3. WHEN the queue length exceeds 100 jobs, THE System SHALL send an alert notification
4. WHEN a Worker crashes or stops responding, THE System SHALL send an alert notification
5. WHEN any error occurs, THE System SHALL log the full error stack trace to MongoDB with Job_ID and timestamp

### Requirement 8: Scalability and Concurrency

**User Story:** As a system architect, I want the system to handle high concurrent load, so that it can scale to thousands of users.

#### Acceptance Criteria

1. WHEN 100 users upload files concurrently, THE System SHALL accept all uploads and queue all jobs within 2 seconds per upload
2. WHEN the queue length exceeds 50 jobs, THE System SHALL support adding additional Worker instances
3. WHEN multiple Workers are running, THE Queue_System SHALL distribute jobs evenly without duplication
4. WHEN a Worker is added or removed, THE System SHALL continue processing jobs without interruption
5. WHEN database load increases, THE System SHALL support MongoDB sharding for horizontal scaling

### Requirement 9: Data Persistence and Cleanup

**User Story:** As a system administrator, I want job data to be persisted appropriately, so that users can retrieve results and the system doesn't accumulate stale data.

#### Acceptance Criteria

1. WHEN a job completes, THE System SHALL persist job status and results in Redis for 24 hours
2. WHEN a job completes, THE System SHALL persist job status and results in MongoDB permanently
3. WHEN 24 hours have passed since job completion, THE System SHALL remove the job data from Redis cache
4. WHEN a user requests job status after 24 hours, THE Status_API SHALL retrieve data from MongoDB
5. WHEN a file is successfully processed, THE System SHALL optionally delete the file from Storage_Service after 7 days (configurable)

### Requirement 10: Cost Optimization

**User Story:** As a business owner, I want the system to be cost-effective, so that it remains profitable at scale.

#### Acceptance Criteria

1. THE System SHALL use Cloudflare R2 for storage to minimize storage costs ($0.015/GB vs AWS S3 $0.023/GB)
2. THE System SHALL use Upstash Redis serverless to minimize queue infrastructure costs
3. WHEN queue is empty, THE Worker SHALL use blocking pop (BRPOP) to minimize Redis command usage
4. WHEN processing is complete, THE Worker SHALL compress results before storing to MongoDB to minimize storage costs
5. THE System SHALL support configuration of file retention period to balance user needs with storage costs

### Requirement 11: Security and Access Control

**User Story:** As a security engineer, I want proper access controls and data protection, so that user data remains secure.

#### Acceptance Criteria

1. WHEN a user uploads a file, THE Upload_API SHALL validate the user's authentication token before accepting the upload
2. WHEN storing files, THE Storage_Service SHALL use signed URLs with expiration times for secure access
3. WHEN a Worker downloads a file, THE Worker SHALL use the signed URL from the job metadata
4. WHEN a user requests job status, THE Status_API SHALL verify the user owns the job before returning data
5. WHEN storing sensitive data, THE System SHALL encrypt data at rest in MongoDB and Storage_Service

### Requirement 12: Graceful Degradation

**User Story:** As a system operator, I want the system to degrade gracefully when components fail, so that partial functionality remains available.

#### Acceptance Criteria

1. WHEN Redis is unavailable, THE Upload_API SHALL return an error message indicating the queue is temporarily unavailable
2. WHEN Storage_Service is unavailable, THE Upload_API SHALL return an error message indicating storage is temporarily unavailable
3. WHEN all Workers are down, THE System SHALL continue accepting uploads and queuing jobs for later processing
4. WHEN MongoDB is unavailable for writes, THE Worker SHALL cache results in Redis and retry MongoDB writes
5. WHEN Status_API cannot reach Redis or MongoDB, THE Status_API SHALL return a 503 error with retry-after header
