#!/usr/bin/env bun
/**
 * Simple Test Script
 */

console.info('🚀 Testing Basic Import...');

try {
  const module = await import('./tools/enterprise/index.ts');
  console.info('✅ Import successful');
  console.info('Available exports:', Object.keys(module));
} catch (error) {
  console.error('❌ Import failed:', error);
}
