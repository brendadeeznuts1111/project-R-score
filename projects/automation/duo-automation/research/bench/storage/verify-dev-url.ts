#!/usr/bin/env bun
// verify-dev-url.ts - Test R2 dev URL access

// Load environment variables from .env file
import { config } from 'dotenv';
config({ path: './.env' });

export {}; // Make this file a module to allow top-level await

console.log('🌐 R2 Dev URL Verification');
console.log('Dev URL: https://pub-dc0e1ef5dd2245be81d6670a9b7b1550.r2.dev');

// Test accessing the dev URL
try {
  const response = await fetch('https://pub-dc0e1ef5dd2245be81d6670a9b7b1550.r2.dev');
  console.log(`Status: ${response.status} ${response.statusText}`);
  
  if (response.status === 404) {
    console.log('✅ Dev URL is accessible (404 expected for empty bucket)');
  } else {
    console.log('Response:', await response.text());
  }
} catch (error: any) {
  console.error('❌ Error accessing dev URL:', error.message);
}

console.log('\n📧 To access uploaded files:');
console.log('https://pub-dc0e1ef5dd2245be81d6670a9b7b1550.r2.dev/apple-ids/your-file.json');
