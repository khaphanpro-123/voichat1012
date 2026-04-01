#!/usr/bin/env node

/**
 * Environment Setup Script
 * Helps manage different environment configurations
 */

const fs = require('fs');
const path = require('path');

const environments = {
  development: {
    NEXT_PUBLIC_API_URL: 'http://localhost:3000',
    NEXTAUTH_URL: 'http://localhost:3000',
    NODE_ENV: 'development'
  },
  production: {
    NEXT_PUBLIC_API_URL: 'https://voichat1012-production.up.railway.app',
    NEXTAUTH_URL: 'https://voichat1012.vercel.app',
    NODE_ENV: 'production'
  }
};

function setupEnvironment(env = 'development') {
  console.log(`🔧 Setting up ${env} environment...`);
  
  const envFile = env === 'development' ? '.env.local' : '.env.production';
  const config = environments[env];
  
  if (!config) {
    console.error(`❌ Unknown environment: ${env}`);
    process.exit(1);
  }
  
  // Read existing .env file
  let existingEnv = '';
  try {
    existingEnv = fs.readFileSync('.env', 'utf8');
  } catch (err) {
    console.warn('⚠️ No .env file found');
  }
  
  // Create environment-specific file
  let envContent = `# ${env.toUpperCase()} Environment\n`;
  envContent += `# Generated on ${new Date().toISOString()}\n\n`;
  
  // Add environment-specific variables
  Object.entries(config).forEach(([key, value]) => {
    envContent += `${key}=${value}\n`;
  });
  
  // Add other variables from .env (excluding the ones we're overriding)
  const overrideKeys = Object.keys(config);
  existingEnv.split('\n').forEach(line => {
    const [key] = line.split('=');
    if (key && !overrideKeys.includes(key) && !line.startsWith('#')) {
      envContent += `${line}\n`;
    }
  });
  
  fs.writeFileSync(envFile, envContent);
  console.log(`✅ Created ${envFile}`);
  
  // Show current configuration
  console.log('\n📋 Current configuration:');
  Object.entries(config).forEach(([key, value]) => {
    console.log(`  ${key}=${value}`);
  });
}

// Parse command line arguments
const env = process.argv[2] || 'development';
setupEnvironment(env);