#!/usr/bin/env bun
// debug-r2.ts - Simple R2 connection test

// Load environment variables from .env file
import { config } from 'dotenv';
config({ path: './.env' });

import { BunR2AppleManager } from '../../src/storage/r2-apple-manager.js';

console.info('🔍 R2 Connection Debug');
console.info('Bucket:', Bun.env.R2_BUCKET);
console.info('Endpoint:', Bun.env.S3_ENDPOINT);
console.info('Key ID:', Bun.env.S3_ACCESS_KEY_ID?.substring(0, 10) + '...');

try {
  const manager = new BunR2AppleManager({}, Bun.env.R2_BUCKET || 'test');
  await manager.initialize();
  console.info('✅ R2 Manager initialized successfully');
  
  // Test basic operation
  await manager.getPresignedUrl('test-key.json', 'PUT');
  console.info('✅ Presign URL generation successful');
} catch (error: any) {
  console.error('❌ Error:', error.message);
  console.error('Code:', error.code);
}
