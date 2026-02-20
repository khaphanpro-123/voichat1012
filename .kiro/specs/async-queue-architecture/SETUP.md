# Async Queue Architecture - Setup Instructions

## Task 1: Infrastructure Setup - COMPLETED ✅

This document describes the infrastructure setup completed for the async queue architecture.

## Files Created

### 1. Type Definitions
- **`types/async-queue.ts`**: Shared TypeScript types for Job, JobStatus, JobResult, API responses, and queue operations

### 2. Infrastructure Clients
- **`lib/r2-client.ts`**: Cloudflare R2 client with upload/download and signed URL generation
- **`lib/redis-client.ts`**: Upstash Redis client for queue operations and caching
- **`lib/async-queue-db.ts`**: MongoDB operations for job persistence and results storage
- **`lib/async-queue-config.ts`**: Centralized configuration for all async queue settings

### 3. Verification Script
- **`scripts/verify-async-queue-setup.ts`**: Script to verify all infrastructure connections

### 4. Environment Configuration
- Updated **`.env.example`** with new environment variables for R2 and Redis

## Required Dependencies

The following npm packages need to be installed:

```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @upstash/redis uuid
```

### Package Details:
- **`@aws-sdk/client-s3`**: AWS SDK for S3-compatible storage (Cloudflare R2)
- **`@aws-sdk/s3-request-presigner`**: Generate signed URLs for secure file access
- **`@upstash/redis`**: Upstash Redis client for serverless Redis operations
- **`uuid`**: Generate unique job IDs (UUID v4)

## Environment Variables Required

Add the following to your `.env` file:

```bash
# Async Queue Architecture - Cloudflare R2
R2_ACCOUNT_ID=your_r2_account_id
R2_ACCESS_KEY_ID=your_r2_access_key_id
R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
R2_BUCKET=document-uploads

# Async Queue Architecture - Upstash Redis
UPSTASH_REDIS_URL=your_upstash_redis_url
UPSTASH_REDIS_TOKEN=your_upstash_redis_token
```

## Setup Steps

### 1. Install Dependencies
```bash
npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner @upstash/redis uuid
```

### 2. Set Up Cloudflare R2
1. Go to Cloudflare Dashboard → R2
2. Create a new bucket named `document-uploads`
3. Generate API tokens:
   - Account ID: Found in R2 dashboard
   - Access Key ID & Secret: Create under "Manage R2 API Tokens"
4. Add credentials to `.env`

### 3. Set Up Upstash Redis
1. Go to https://upstash.com/
2. Create a new Redis database
3. Copy the REST URL and Token
4. Add credentials to `.env`

### 4. Verify MongoDB Connection
MongoDB connection is already configured in `lib/mongodb.ts`. The async queue will use the existing connection.

### 5. Run Verification Script
```bash
npx ts-node scripts/verify-async-queue-setup.ts
```

This will:
- Test R2 connection
- Test Redis connection and queue operations
- Test MongoDB connection
- Create required indexes in MongoDB

## MongoDB Collections Created

The verification script creates the following collections with indexes:

### `jobs` Collection
Stores job metadata and status.

**Indexes:**
- `{ jobId: 1 }` - Unique index for job lookup
- `{ userId: 1, createdAt: -1 }` - User's jobs sorted by date
- `{ status: 1, createdAt: -1 }` - Jobs by status

### `job_results` Collection
Stores processing results.

**Indexes:**
- `{ jobId: 1 }` - Unique index for result lookup

### `job_errors` Collection
Stores error logs for debugging.

**Indexes:**
- `{ jobId: 1, timestamp: -1 }` - Errors for a job
- `{ timestamp: -1 }` - Recent errors

## Infrastructure Components Summary

### Cloudflare R2 (Storage)
- **Purpose**: Store uploaded files
- **Features**: S3-compatible, signed URLs, 7-day expiration
- **Cost**: $0.015/GB storage

### Upstash Redis (Queue + Cache)
- **Purpose**: Job queue and status caching
- **Features**: Serverless, priority queue (sorted sets), 24-hour TTL
- **Cost**: Free tier or $20/month

### MongoDB (Database)
- **Purpose**: Persistent storage for jobs, results, and errors
- **Features**: Existing connection, indexed collections
- **Cost**: Existing infrastructure

## Configuration

All configuration is centralized in `lib/async-queue-config.ts`:

- **Max file size**: 50MB
- **Priority levels**: Standard (0), Premium (10)
- **Max retries**: 3 with exponential backoff
- **Cache TTL**: 24 hours for job status
- **Signed URL expiration**: 7 days
- **Polling interval**: 2 seconds (frontend)
- **Max polling duration**: 5 minutes

## Next Steps

After completing this setup:

1. ✅ Infrastructure connections established
2. ✅ Type definitions created
3. ✅ Configuration centralized
4. ✅ MongoDB indexes created

**Ready for Task 2**: Implement Upload API core functionality

## Troubleshooting

### R2 Connection Issues
- Verify Account ID is correct
- Check Access Key ID and Secret Access Key
- Ensure bucket name matches (default: `document-uploads`)

### Redis Connection Issues
- Verify UPSTASH_REDIS_URL format: `https://...upstash.io`
- Check UPSTASH_REDIS_TOKEN is correct
- Test connection in Upstash dashboard

### MongoDB Connection Issues
- Verify MONGO_URI is correct
- Check network access (IP whitelist in MongoDB Atlas)
- Ensure database user has read/write permissions

## Testing the Setup

Run the verification script:
```bash
npx ts-node scripts/verify-async-queue-setup.ts
```

Expected output:
```
🚀 Starting async queue infrastructure verification...
============================================================

🔍 Verifying Cloudflare R2 connection...
✅ R2 client initialized successfully

🔍 Verifying Upstash Redis connection...
✅ Redis connection successful
   Queue length: 0

🔍 Verifying MongoDB connection...
✅ MongoDB connection successful
   Creating indexes...
✅ Async queue indexes created successfully

============================================================

📊 Verification Summary:
   Cloudflare R2: ✅ Connected
   Upstash Redis: ✅ Connected
   MongoDB: ✅ Connected

✅ All infrastructure connections verified successfully!
   You can now proceed with implementing the Upload API.

============================================================
```
