#!/usr/bin/env bun

/**
 * File Existence Checking Example
 * 
 * This example demonstrates how to check if files exist using
 * the .exists() method of BunFile instances in Bun.
 */

// Import fs for file operations
import fs from 'fs';

// Make this file a module
export {};

// Example 1: Basic file existence checking
async function basicFileExistence() {
  console.info('🔍 Basic File Existence Checking:');
  
  // Check existing files
  const existingFiles = [
    '../package.json',
    '../server.ts',
    '../dashboard.html',
    '../README.md'
  ];
  
  for (const filePath of existingFiles) {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    console.info(`${filePath}: ${exists ? '✅ Exists' : '❌ Not found'}`);
  }
  
  // Check non-existing files
  const nonExistingFiles = [
    '../non-existent-file.txt',
    '../missing.json',
    './temp-file.tmp'
  ];
  
  console.info('\nChecking non-existing files:');
  for (const filePath of nonExistingFiles) {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    console.info(`${filePath}: ${exists ? '✅ Exists' : '❌ Not found'}`);
  }
}

// Example 2: Conditional file operations based on existence
async function conditionalOperations() {
  console.info('\n🔄 Conditional File Operations:');
  
  const configFiles = [
    'app-config.json',
    'user-config.json',
    'default-config.json'
  ];
  
  // Create a sample config file
  const sampleConfig = {
    appName: 'FileExistenceDemo',
    version: '1.0.0',
    features: ['existence-checking', 'file-io']
  };
  
  await Bun.write('app-config.json', JSON.stringify(sampleConfig, null, 2));
  console.info('Created app-config.json');
  
  // Check for config files and load the first one that exists
  let config = null;
  let configPath = '';
  
  for (const configFile of configFiles) {
    const file = Bun.file(configFile);
    if (await file.exists()) {
      console.info(`Found config file: ${configFile}`);
      configPath = configFile;
      try {
        config = await file.json();
        break;
      } catch (error: any) {
        console.info(`Error reading ${configFile}: ${error.message}`);
      }
    } else {
      console.info(`Config file not found: ${configFile}`);
    }
  }
  
  if (config) {
    console.info(`Loaded config from ${configPath}:`, config);
  } else {
    console.info('No valid config file found, using defaults');
    config = { appName: 'DefaultApp', version: '1.0.0', features: [] };
  }
  
  return config;
}

// Example 3: File existence with metadata
async function existenceWithMetadata() {
  console.info('\n📊 File Existence with Metadata:');
  
  const files = [
    '../package.json',
    '../server.ts',
    '../dashboard.html',
    '../non-existent-file.txt'
  ];
  
  for (const filePath of files) {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    
    console.info(`\nFile: ${filePath}`);
    console.info(`  Exists: ${exists ? '✅ Yes' : '❌ No'}`);
    
    if (exists) {
      // Get additional metadata
      console.info(`  Size: ${file.size} bytes`);
      console.info(`  Type: ${file.type}`);
      
      // Try to get last modified time (this might not be available in all cases)
      try {
        const text = await file.text();
        console.info(`  Content preview: ${text.substring(0, 50)}...`);
      } catch (error: any) {
        console.info(`  Content preview: Error - ${error.message}`);
      }
    }
  }
}

// Example 4: Batch file existence checking
async function batchExistenceChecking() {
  console.info('\n📦 Batch File Existence Checking:');
  
  const projectFiles = [
    '../package.json',
    '../server.ts',
    '../dashboard.html',
    '../README.md',
    '../bun.lockb',
    '../tsconfig.json',
    '../.gitignore',
    '../non-existent-file.txt'
  ];
  
  // Check all files in parallel
  const existenceChecks = projectFiles.map(async (filePath) => {
    const file = Bun.file(filePath);
    const exists = await file.exists();
    return { path: filePath, exists };
  });
  
  const results = await Promise.all(existenceChecks);
  
  console.info('Batch results:');
  const existingFiles = results.filter(result => result.exists);
  const missingFiles = results.filter(result => !result.exists);
  
  console.info(`Found ${existingFiles.length} existing files:`);
  existingFiles.forEach(result => console.info(`  ✅ ${result.path}`));
  
  console.info(`\nMissing ${missingFiles.length} files:`);
  missingFiles.forEach(result => console.info(`  ❌ ${result.path}`));
  
  console.info(`\nSuccess rate: ${((existingFiles.length / results.length) * 100).toFixed(1)}%`);
  
  return results;
}

// Example 5: File existence utilities
async function fileExistenceUtilities() {
  console.info('\n🔧 File Existence Utilities:');
  
  // Utility function to check multiple files
  async function checkAnyExists(filePaths: string[]): Promise<string | null> {
    for (const filePath of filePaths) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        return filePath;
      }
    }
    return null;
  }
  
  // Utility function to check all exist
  async function checkAllExist(filePaths: string[]): Promise<boolean> {
    for (const filePath of filePaths) {
      const file = Bun.file(filePath);
      if (!(await file.exists())) {
        return false;
      }
    }
    return true;
  }
  
  // Utility function to get existing files
  async function getExistingFiles(filePaths: string[]): Promise<string[]> {
    const existing: string[] = [];
    for (const filePath of filePaths) {
      const file = Bun.file(filePath);
      if (await file.exists()) {
        existing.push(filePath);
      }
    }
    return existing;
  }
  
  // Test the utilities
  const testFiles = [
    '../package.json',
    '../server.ts',
    '../non-existent-file.txt',
    '../dashboard.html'
  ];
  
  const firstExisting = await checkAnyExists(testFiles);
  console.info(`First existing file: ${firstExisting || 'None found'}`);
  
  const allExist = await checkAllExist(testFiles);
  console.info(`All files exist: ${allExist}`);
  
  const existingFiles = await getExistingFiles(testFiles);
  console.info(`Existing files: ${existingFiles.join(', ')}`);
}

// Example 6: File existence in conditional logic
async function existenceInConditionalLogic() {
  console.info('\n🧠 File Existence in Conditional Logic:');
  
  // Create some test files
  await Bun.write('test-file-1.txt', 'This is test file 1');
  await Bun.write('test-file-2.txt', 'This is test file 2');
  
  const file1 = Bun.file('test-file-1.txt');
  const file2 = Bun.file('test-file-2.txt');
  const file3 = Bun.file('test-file-3.txt');
  
  // Complex conditional logic
  if (await file1.exists() && await file2.exists()) {
    console.info('✅ Both test files exist');
    
    if (!(await file3.exists())) {
      console.info('✅ File 3 does not exist (as expected)');
      
      // Create file 3
      await Bun.write('test-file-3.txt', 'This is test file 3');
      console.info('✅ Created file 3');
      
      if (await file3.exists()) {
        console.info('✅ File 3 now exists');
      }
    }
  } else {
    console.info('❌ Required test files are missing');
  }
  
  // Clean up
  try {
    await fs.promises.unlink('test-file-1.txt');
    await fs.promises.unlink('test-file-2.txt');
    await fs.promises.unlink('test-file-3.txt');
    console.info('🧹 Cleaned up test files');
  } catch (error: any) {
    console.info(`🧹 Error cleaning up: ${error.message}`);
  }
}

// Main execution
async function main() {
  console.info('🚀 File Existence Checking Examples');
  console.info('===================================');
  
  try {
    await basicFileExistence();
    await conditionalOperations();
    await existenceWithMetadata();
    await batchExistenceChecking();
    await fileExistenceUtilities();
    await existenceInConditionalLogic();
    
    console.info('\n✅ All file existence examples completed successfully!');
  } catch (error) {
    console.error('❌ Error running examples:', error);
  }
}

// Run the examples
await main();
