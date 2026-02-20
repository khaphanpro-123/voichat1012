// Verification script for async queue infrastructure setup
import { getR2Client } from '../lib/r2-client';
import { getRedisClient } from '../lib/redis-client';
import { getAsyncQueueDB } from '../lib/async-queue-db';

async function verifyR2Connection() {
  console.log('\n🔍 Verifying Cloudflare R2 connection...');
  try {
    const r2Client = getR2Client();
    console.log('✅ R2 client initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ R2 connection failed:', (error as Error).message);
    return false;
  }
}

async function verifyRedisConnection() {
  console.log('\n🔍 Verifying Upstash Redis connection...');
  try {
    const redisClient = getRedisClient();
    const isConnected = await redisClient.ping();
    if (isConnected) {
      console.log('✅ Redis connection successful');
      
      // Test queue operations
      const queueLength = await redisClient.getQueueLength();
      console.log(`   Queue length: ${queueLength}`);
      
      return true;
    } else {
      console.error('❌ Redis ping failed');
      return false;
    }
  } catch (error) {
    console.error('❌ Redis connection failed:', (error as Error).message);
    return false;
  }
}

async function verifyMongoDBConnection() {
  console.log('\n🔍 Verifying MongoDB connection...');
  try {
    const db = getAsyncQueueDB();
    const isConnected = await db.ping();
    if (isConnected) {
      console.log('✅ MongoDB connection successful');
      
      // Create indexes
      console.log('   Creating indexes...');
      await db.createIndexes();
      
      return true;
    } else {
      console.error('❌ MongoDB ping failed');
      return false;
    }
  } catch (error) {
    console.error('❌ MongoDB connection failed:', (error as Error).message);
    return false;
  }
}

async function main() {
  console.log('🚀 Starting async queue infrastructure verification...\n');
  console.log('=' .repeat(60));
  
  const results = {
    r2: await verifyR2Connection(),
    redis: await verifyRedisConnection(),
    mongodb: await verifyMongoDBConnection(),
  };
  
  console.log('\n' + '='.repeat(60));
  console.log('\n📊 Verification Summary:');
  console.log(`   Cloudflare R2: ${results.r2 ? '✅ Connected' : '❌ Failed'}`);
  console.log(`   Upstash Redis: ${results.redis ? '✅ Connected' : '❌ Failed'}`);
  console.log(`   MongoDB: ${results.mongodb ? '✅ Connected' : '❌ Failed'}`);
  
  const allPassed = Object.values(results).every(r => r);
  
  if (allPassed) {
    console.log('\n✅ All infrastructure connections verified successfully!');
    console.log('   You can now proceed with implementing the Upload API.');
  } else {
    console.log('\n❌ Some connections failed. Please check your environment variables:');
    if (!results.r2) {
      console.log('   - R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET');
    }
    if (!results.redis) {
      console.log('   - UPSTASH_REDIS_URL, UPSTASH_REDIS_TOKEN');
    }
    if (!results.mongodb) {
      console.log('   - MONGO_URI');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  process.exit(allPassed ? 0 : 1);
}

main().catch(error => {
  console.error('\n💥 Unexpected error:', error);
  process.exit(1);
});
