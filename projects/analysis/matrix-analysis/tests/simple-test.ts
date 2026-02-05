#!/usr/bin/env bun
/**
 * Simple Test Script
 */

console.log('🚀 Testing Basic Import...');

try {
  const module = await import('./tools/enterprise/index.ts');
  console.log('✅ Import successful');
  console.log('Available exports:', Object.keys(module));
} catch (error) {
  console.error('❌ Import failed:', error);
}
