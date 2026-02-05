#!/usr/bin/env bun

/**
 * Simple Directory Watch Test
 * 
 * This is a simple test to demonstrate directory watching functionality.
 */

import { watch } from 'fs';
import fs from 'fs';

// Make this file a module
export {};

console.log('🔍 Simple Directory Watch Test');
console.log('===============================');

// Create a test directory
const testDir = './simple-watch-test';
if (!fs.existsSync(testDir)) {
  fs.mkdirSync(testDir);
  console.log(`Created test directory: ${testDir}`);
}

console.log(`\nWatching ${testDir} for changes...`);
console.log('Try creating or modifying files in this directory');
console.log('Press Ctrl+C to stop watching\n');

// Watch the test directory
const watcher = watch(testDir, (event, filename) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${event.toUpperCase()} -> ${filename}`);
});

// Create a test file
fs.writeFileSync(`${testDir}/test-file.txt`, 'Initial content');
console.log('Created test-file.txt');

// Set up cleanup
process.on('SIGINT', () => {
  console.log('\nCleaning up and closing watcher...');
  
  // Clean up test files
  try {
    fs.rmSync(testDir, { recursive: true, force: true });
    console.log(`Removed test directory: ${testDir}`);
  } catch (error: any) {
    console.error(`Error cleaning up: ${error.message}`);
  }
  
  watcher.close();
  process.exit(0);
});

// Keep the process alive for demonstration
console.log('Watching for 30 seconds...\n');
setTimeout(() => {
  console.log('Test completed. Press Ctrl+C to exit.');
}, 5000);
