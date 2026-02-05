#!/usr/bin/env bun

/**
 * Directory Watching Example
 * 
 * This example demonstrates how to watch directories for changes using
 * fs.watch from the node:fs module in Bun.
 */

// Import fs for directory watching
import { watch } from 'fs';
import { watch as watchPromises } from 'fs/promises';
import fs from 'fs';

// Make this file a module
export {};

// Example 1: Basic directory watching (shallow)
async function basicDirectoryWatching() {
  console.log('🔍 Basic Directory Watching (Shallow):');
  console.log('Watching current directory for changes...');
  console.log('Press Ctrl+C to stop watching');
  
  // Watch the current directory
  const watcher = watch(import.meta.dir, (event, filename) => {
    console.log(`[${new Date().toISOString()}] Detected ${event} in ${filename}`);
  });
  
  // Set up cleanup
  process.on('SIGINT', () => {
    console.log('\nClosing watcher...');
    watcher.close();
    process.exit(0);
  });
  
  // Keep the process alive for a short time to demonstrate
  setTimeout(() => {
    console.log('Shallow watching example completed.');
  }, 10000);
  
  return watcher;
}

// Example 2: Recursive directory watching
async function recursiveDirectoryWatching() {
  console.log('\n🔄 Recursive Directory Watching:');
  console.log('Watching current directory and subdirectories...');
  console.log('Press Ctrl+C to stop watching');
  
  // Watch the current directory recursively
  const watcher = watch(import.meta.dir, { recursive: true }, (event, relativePath) => {
    console.log(`[${new Date().toISOString()}] Detected ${event} in ${relativePath}`);
  });
  
  // Set up cleanup
  process.on('SIGINT', () => {
    console.log('\nClosing recursive watcher...');
    watcher.close();
    process.exit(0);
  });
  
  // Keep the process alive for a short time to demonstrate
  setTimeout(() => {
    console.log('Recursive watching example completed.');
  }, 10000);
  
  return watcher;
}

// Example 3: Directory watching with for await...of
async function asyncIteratorWatching() {
  console.log('\n🔁 Async Iterator Directory Watching:');
  console.log('Watching with for await...of pattern...');
  console.log('Press Ctrl+C to stop watching');
  
  // Watch the current directory
  const watcher = watchPromises(import.meta.dir);
  
  // Handle events with for await...of
  (async () => {
    try {
      for await (const event of watcher) {
        console.log(`[${new Date().toISOString()}] Detected ${event.eventType} in ${event.filename}`);
      }
    } catch (error: any) {
      console.error('Watcher error:', error.message);
    }
  })();
  
  // Set up cleanup
  process.on('SIGINT', () => {
    console.log('\nClosing async iterator watcher...');
    // Note: Async iterator watchers don't have a close method
    process.exit(0);
  });
  
  // Keep the process alive for a short time to demonstrate
  setTimeout(() => {
    console.log('Async iterator watching example completed.');
  }, 10000);
  
  return watcher;
}

// Example 4: Practical file monitoring
async function practicalFileMonitoring() {
  console.log('\n📊 Practical File Monitoring:');
  
  // Create a test directory to monitor
  const testDir = './watch-test';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
    console.log(`Created test directory: ${testDir}`);
  }
  
  console.log(`Monitoring ${testDir} for file changes...`);
  console.log('Try creating, modifying, or deleting files in this directory');
  console.log('Press Ctrl+C to stop monitoring');
  
  // Watch the test directory
  const watcher = watch(testDir, { recursive: true }, (event, filename) => {
    const fullPath = filename ? `${testDir}/${filename}` : testDir;
    console.log(`[${new Date().toISOString()}] ${event.toUpperCase()} -> ${fullPath}`);
    
    // Add some context based on event type
    switch (event) {
      case 'rename':
        // This could be either a create or delete
        fs.access(fullPath, fs.constants.F_OK, (err) => {
          if (err) {
            console.log(`  🗑️  File deleted: ${filename}`);
          } else {
            console.log(`  🆕 File created: ${filename}`);
          }
        });
        break;
      case 'change':
        console.log(`  ✏️  File modified: ${filename}`);
        break;
    }
  });
  
  // Create some initial files for demonstration
  fs.writeFileSync(`${testDir}/initial-file.txt`, 'This file was created at startup');
  console.log('Created initial test file');
  
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
  
  // Keep the process alive
  console.log('Monitoring for 30 seconds...');
  setTimeout(() => {
    console.log('Monitoring period completed.');
  }, 30000);
  
  return watcher;
}

// Example 5: Advanced watcher with filtering
async function advancedWatcherWithFiltering() {
  console.log('\n🔍 Advanced Watcher with Filtering:');
  
  // Create a test directory
  const testDir = './filter-test';
  if (!fs.existsSync(testDir)) {
    fs.mkdirSync(testDir);
    console.log(`Created test directory: ${testDir}`);
  }
  
  console.log(`Monitoring ${testDir} with file type filtering...`);
  console.log('Only .txt and .json files will be reported');
  console.log('Press Ctrl+C to stop monitoring');
  
  // Watch with filtering
  const watcher = watch(testDir, (event, filename) => {
    if (filename) {
      // Filter by file extension
      const extension = filename.split('.').pop()?.toLowerCase();
      const allowedExtensions = ['txt', 'json'];
      
      if (allowedExtensions.includes(extension || '')) {
        console.log(`[${new Date().toISOString()}] ${event.toUpperCase()} -> ${filename} (.${extension})`);
      } else if (filename.includes('.')) {
        // Silently ignore other file types
        console.log(`[${new Date().toISOString()}] Ignored ${event} for ${filename} (.${extension})`);
      } else {
        // Handle directories
        console.log(`[${new Date().toISOString()}] ${event.toUpperCase()} -> directory: ${filename}`);
      }
    }
  });
  
  // Create some test files
  fs.writeFileSync(`${testDir}/document.txt`, 'Text document');
  fs.writeFileSync(`${testDir}/data.json`, '{"key": "value"}');
  fs.writeFileSync(`${testDir}/script.js`, 'console.log("JavaScript");');
  console.log('Created test files with different extensions');
  
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
  
  // Keep the process alive
  console.log('Filtering monitoring for 30 seconds...');
  setTimeout(() => {
    console.log('Filtering monitoring period completed.');
  }, 30000);
  
  return watcher;
}

// Example 6: Multiple directory watchers
async function multipleDirectoryWatchers() {
  console.log('\n📦 Multiple Directory Watchers:');
  
  // Create test directories
  const dirs = ['./multi-test-1', './multi-test-2'];
  dirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir);
      console.log(`Created test directory: ${dir}`);
    }
  });
  
  console.log('Watching multiple directories...');
  console.log('Press Ctrl+C to stop all watchers');
  
  // Create multiple watchers
  const watchers = dirs.map((dir, index) => {
    console.log(`Watcher ${index + 1}: Monitoring ${dir}`);
    return watch(dir, (event, filename) => {
      console.log(`[Watcher ${index + 1}] [${new Date().toISOString()}] ${event.toUpperCase()} -> ${dir}/${filename}`);
    });
  });
  
  // Create some test files
  fs.writeFileSync('./multi-test-1/file1.txt', 'Content for file 1');
  fs.writeFileSync('./multi-test-2/file2.txt', 'Content for file 2');
  console.log('Created initial test files');
  
  // Set up cleanup for all watchers
  process.on('SIGINT', () => {
    console.log('\nClosing all watchers and cleaning up...');
    
    // Close all watchers
    watchers.forEach((watcher, index) => {
      console.log(`Closing watcher ${index + 1}...`);
      watcher.close();
    });
    
    // Clean up test directories
    dirs.forEach(dir => {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`Removed test directory: ${dir}`);
      } catch (error: any) {
        console.error(`Error removing ${dir}: ${error.message}`);
      }
    });
    
    process.exit(0);
  });
  
  // Keep the process alive
  console.log('Multiple watchers active for 30 seconds...');
  setTimeout(() => {
    console.log('Multiple watchers period completed.');
  }, 30000);
  
  return watchers;
}

// Main execution
async function main() {
  console.log('🚀 Directory Watching Examples');
  console.log('=============================');
  
  try {
    // Run examples one by one
    console.log('\nRunning examples sequentially. Press Ctrl+C to move to the next example.');
    
    // Note: These examples are designed to be run individually
    // Uncomment the one you want to test
    
    // await basicDirectoryWatching();
    // await recursiveDirectoryWatching();
    // await asyncIteratorWatching();
    await practicalFileMonitoring();
    // await advancedWatcherWithFiltering();
    // await multipleDirectoryWatchers();
    
    console.log('\n✅ Directory watching examples completed!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run the examples
// await main(); // Uncomment to run automatically

// Export functions for manual testing
export { 
  basicDirectoryWatching, 
  recursiveDirectoryWatching, 
  asyncIteratorWatching, 
  practicalFileMonitoring, 
  advancedWatcherWithFiltering, 
  multipleDirectoryWatchers 
};
