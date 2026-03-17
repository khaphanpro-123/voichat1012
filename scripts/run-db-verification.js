/**
 * Simple Node.js script to run database verification
 * Usage: node scripts/run-db-verification.js
 */

require('dotenv').config();
const { execSync } = require('child_process');

console.log('🚀 Running Database Schema Verification...\n');

try {
  // Run the TypeScript verification script
  execSync('npx tsx scripts/verify-database-relationships.ts', { 
    stdio: 'inherit',
    cwd: process.cwd()
  });
} catch (error) {
  console.error('❌ Verification failed:', error.message);
  process.exit(1);
}