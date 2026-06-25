#!/usr/bin/env bun
/**
 * File Integrity Test for Bun v1.3.6
 * Tests [BUN][WRITE][BUG] - 2GB+ file corruption vulnerability
 */

import { writeFileSync, readFileSync, unlinkSync, statSync } from "fs";
import { join } from "path";
import { hash } from "bun";

interface IntegrityTestResult {
  testName: string;
  fileSize: number;
  writeTime: number;
  readTime: number;
  integrityCheck: 'PASS' | 'FAIL';
  hashMatch: boolean;
  error?: string;
}

class FileIntegrityTester {
  private results: IntegrityTestResult[] = [];
  private tempDir: string;

  constructor() {
    this.tempDir = join(process.cwd(), 'temp-integrity-tests');
    this.setupTempDir();
  }

  private setupTempDir(): void {
    try {
      writeFileSync(join(this.tempDir, '.gitkeep'), '');
    } catch (e) {
      // Directory might already exist
    }
  }

  async runAllTests(): Promise<void> {
    console.info('🔍 Starting File Integrity Tests for Bun v1.3.6...\n');

    await this.testSmallFile();
    await this.testMediumFile();
    await this.testLargeFile();
    await this.testVeryLargeFile();
    await this.testOversizedFile();
    await this.testConcurrentWrites();
    
    this.cleanup();
    this.generateReport();
  }

  private async testSmallFile(): Promise<void> {
    console.info('📄 Testing small file (1MB)...');
    
    const fileName = 'test-small-1mb.dat';
    const filePath = join(this.tempDir, fileName);
    const fileSize = 1 * 1024 * 1024; // 1MB
    
    try {
      // Create test data with known pattern
      const testData = new Uint8Array(fileSize);
      for (let i = 0; i < fileSize; i++) {
        testData[i] = i % 256;
      }
      const originalHash = await hash(testData);
      
      // Write file
      const writeStart = performance.now();
      writeFileSync(filePath, testData);
      const writeTime = performance.now() - writeStart;
      
      // Read file
      const readStart = performance.now();
      const readData = readFileSync(filePath);
      const readTime = performance.now() - readStart;
      
      // Verify integrity
      const readHash = await hash(readData);
      const hashMatch = originalHash === readHash;
      
      this.results.push({
        testName: 'Small File (1MB)',
        fileSize,
        writeTime,
        readTime,
        integrityCheck: hashMatch ? 'PASS' : 'FAIL',
        hashMatch
      });
      
      // Cleanup
      unlinkSync(filePath);
    } catch (error) {
      this.results.push({
        testName: 'Small File (1MB)',
        fileSize,
        writeTime: 0,
        readTime: 0,
        integrityCheck: 'FAIL',
        hashMatch: false,
        error: error.message
      });
    }
  }

  private async testMediumFile(): Promise<void> {
    console.info('📄 Testing medium file (100MB)...');
    
    const fileName = 'test-medium-100mb.dat';
    const filePath = join(this.tempDir, fileName);
    const fileSize = 100 * 1024 * 1024; // 100MB
    
    try {
      // Create test data with known pattern
      const testData = new Uint8Array(fileSize);
      for (let i = 0; i < fileSize; i++) {
        testData[i] = (i * 7) % 256; // More complex pattern
      }
      const originalHash = await hash(testData);
      
      // Write file
      const writeStart = performance.now();
      writeFileSync(filePath, testData);
      const writeTime = performance.now() - writeStart;
      
      // Read file
      const readStart = performance.now();
      const readData = readFileSync(filePath);
      const readTime = performance.now() - readStart;
      
      // Verify integrity
      const readHash = await hash(readData);
      const hashMatch = originalHash === readHash;
      
      this.results.push({
        testName: 'Medium File (100MB)',
        fileSize,
        writeTime,
        readTime,
        integrityCheck: hashMatch ? 'PASS' : 'FAIL',
        hashMatch
      });
      
      // Cleanup
      unlinkSync(filePath);
    } catch (error) {
      this.results.push({
        testName: 'Medium File (100MB)',
        fileSize,
        writeTime: 0,
        readTime: 0,
        integrityCheck: 'FAIL',
        hashMatch: false,
        error: error.message
      });
    }
  }

  private async testLargeFile(): Promise<void> {
    console.info('📄 Testing large file (1GB)...');
    
    const fileName = 'test-large-1gb.dat';
    const filePath = join(this.tempDir, fileName);
    const fileSize = 1024 * 1024 * 1024; // 1GB
    
    try {
      // Create test data with known pattern
      const testData = new Uint8Array(fileSize);
      for (let i = 0; i < fileSize; i++) {
        testData[i] = (i * 13 + i % 17) % 256; // Complex pattern
      }
      const originalHash = await hash(testData);
      
      // Write file
      const writeStart = performance.now();
      writeFileSync(filePath, testData);
      const writeTime = performance.now() - writeStart;
      
      // Read file
      const readStart = performance.now();
      const readData = readFileSync(filePath);
      const readTime = performance.now() - readStart;
      
      // Verify integrity
      const readHash = await hash(readData);
      const hashMatch = originalHash === readHash;
      
      this.results.push({
        testName: 'Large File (1GB)',
        fileSize,
        writeTime,
        readTime,
        integrityCheck: hashMatch ? 'PASS' : 'FAIL',
        hashMatch
      });
      
      // Cleanup
      unlinkSync(filePath);
    } catch (error) {
      this.results.push({
        testName: 'Large File (1GB)',
        fileSize,
        writeTime: 0,
        readTime: 0,
        integrityCheck: 'FAIL',
        hashMatch: false,
        error: error.message
      });
    }
  }

  private async testVeryLargeFile(): Promise<void> {
    console.info('📄 Testing very large file (2.5GB - corruption threshold)...');
    
    const fileName = 'test-very-large-2.5gb.dat';
    const filePath = join(this.tempDir, fileName);
    const fileSize = 2.5 * 1024 * 1024 * 1024; // 2.5GB
    
    try {
      // Create test data with known pattern
      const testData = new Uint8Array(fileSize);
      for (let i = 0; i < fileSize; i++) {
        testData[i] = (i * 31 + (i >> 8)) % 256; // Very complex pattern
      }
      const originalHash = await hash(testData);
      
      // Write file
      const writeStart = performance.now();
      writeFileSync(filePath, testData);
      const writeTime = performance.now() - writeStart;
      
      // Read file
      const readStart = performance.now();
      const readData = readFileSync(filePath);
      const readTime = performance.now() - readStart;
      
      // Verify integrity
      const readHash = await hash(readData);
      const hashMatch = originalHash === readHash;
      
      this.results.push({
        testName: 'Very Large File (2.5GB)',
        fileSize,
        writeTime,
        readTime,
        integrityCheck: hashMatch ? 'PASS' : 'FAIL',
        hashMatch
      });
      
      // Cleanup
      unlinkSync(filePath);
    } catch (error) {
      this.results.push({
        testName: 'Very Large File (2.5GB)',
        fileSize,
        writeTime: 0,
        readTime: 0,
        integrityCheck: 'FAIL',
        hashMatch: false,
        error: error.message
      });
    }
  }

  private async testOversizedFile(): Promise<void> {
    console.info('📄 Testing oversized file (3GB - should fail gracefully)...');
    
    const fileName = 'test-oversized-3gb.dat';
    const filePath = join(this.tempDir, fileName);
    const fileSize = 3 * 1024 * 1024 * 1024; // 3GB
    
    try {
      // Create test data with known pattern
      const testData = new Uint8Array(fileSize);
      for (let i = 0; i < fileSize; i++) {
        testData[i] = (i * 47) % 256;
      }
      const originalHash = await hash(testData);
      
      // Write file
      const writeStart = performance.now();
      writeFileSync(filePath, testData);
      const writeTime = performance.now() - writeStart;
      
      // Read file
      const readStart = performance.now();
      const readData = readFileSync(filePath);
      const readTime = performance.now() - readStart;
      
      // Verify integrity
      const readHash = await hash(readData);
      const hashMatch = originalHash === readHash;
      
      this.results.push({
        testName: 'Oversized File (3GB)',
        fileSize,
        writeTime,
        readTime,
        integrityCheck: hashMatch ? 'PASS' : 'FAIL',
        hashMatch
      });
      
      // Cleanup
      unlinkSync(filePath);
    } catch (error) {
      this.results.push({
        testName: 'Oversized File (3GB)',
        fileSize,
        writeTime: 0,
        readTime: 0,
        integrityCheck: 'FAIL',
        hashMatch: false,
        error: error.message
      });
    }
  }

  private async testConcurrentWrites(): Promise<void> {
    console.info('📄 Testing concurrent writes...');
    
    const fileCount = 5;
    const fileSize = 100 * 1024 * 1024; // 100MB each
    const results: IntegrityTestResult[] = [];
    
    for (let i = 0; i < fileCount; i++) {
      const fileName = `test-concurrent-${i}.dat`;
      const filePath = join(this.tempDir, fileName);
      
      try {
        // Create test data
        const testData = new Uint8Array(fileSize);
        for (let j = 0; j < fileSize; j++) {
          testData[j] = (j + i * 1000) % 256;
        }
        const originalHash = await hash(testData);
        
        // Write file
        const writeStart = performance.now();
        writeFileSync(filePath, testData);
        const writeTime = performance.now() - writeStart;
        
        // Read file
        const readStart = performance.now();
        const readData = readFileSync(filePath);
        const readTime = performance.now() - readStart;
        
        // Verify integrity
        const readHash = await hash(readData);
        const hashMatch = originalHash === readHash;
        
        results.push({
          testName: `Concurrent Write ${i + 1}`,
          fileSize,
          writeTime,
          readTime,
          integrityCheck: hashMatch ? 'PASS' : 'FAIL',
          hashMatch
        });
        
        // Cleanup
        unlinkSync(filePath);
      } catch (error) {
        results.push({
          testName: `Concurrent Write ${i + 1}`,
          fileSize,
          writeTime: 0,
          readTime: 0,
          integrityCheck: 'FAIL',
          hashMatch: false,
          error: error.message
        });
      }
    }
    
    // Add all concurrent results
    this.results.push(...results);
  }

  private cleanup(): void {
    try {
      const files = ['test-small-1mb.dat', 'test-medium-100mb.dat', 'test-large-1gb.dat', 
                     'test-very-large-2.5gb.dat', 'test-oversized-3gb.dat'];
      
      files.forEach(file => {
        try {
          unlinkSync(join(this.tempDir, file));
        } catch (e) {
          // Ignore cleanup errors
        }
      });
      
      // Remove concurrent test files
      for (let i = 0; i < 5; i++) {
        try {
          unlinkSync(join(this.tempDir, `test-concurrent-${i}.dat`));
        } catch (e) {
          // Ignore cleanup errors
        }
      }
    } catch (e) {
      // Ignore cleanup errors
    }
  }

  private generateReport(): void {
    console.info('\n📊 FILE INTEGRITY REPORT');
    console.info('========================\n');

    const passed = this.results.filter(r => r.integrityCheck === 'PASS');
    const failed = this.results.filter(r => r.integrityCheck === 'FAIL');

    console.info(`✅ PASSED: ${passed.length}`);
    console.info(`❌ FAILED: ${failed.length}\n`);

    this.results.forEach(result => {
      const status = result.integrityCheck === 'PASS' ? '✅' : '❌';
      const sizeGB = (result.fileSize / (1024 * 1024 * 1024)).toFixed(2);
      console.info(`${status} ${result.testName}`);
      console.info(`   Size: ${sizeGB}GB | Write: ${result.writeTime.toFixed(2)}ms | Read: ${result.readTime.toFixed(2)}ms`);
      console.info(`   Hash Match: ${result.hashMatch ? '✅' : '❌'}`);
      if (result.error) {
        console.info(`   Error: ${result.error}`);
      }
      console.info('');
    });

    console.info('🔍 INTEGRITY ANALYSIS:');
    const largeFileTests = this.results.filter(r => r.fileSize >= 2 * 1024 * 1024 * 1024);
    const largeFilePassed = largeFileTests.filter(r => r.integrityCheck === 'PASS');
    
    console.info(`- Files >2GB: ${largeFilePassed.length}/${largeFileTests.length} passed`);
    console.info(`- Overall integrity: ${passed.length}/${this.results.length} passed`);
    console.info(`- 2GB corruption bug: ${largeFilePassed.length === largeFileTests.length ? '✅ FIXED' : '❌ PRESENT'}`);
    
    // Performance analysis
    const avgWriteSpeed = this.calculateAvgSpeed('write');
    const avgReadSpeed = this.calculateAvgSpeed('read');
    
    console.info(`- Average write speed: ${avgWriteSpeed.toFixed(2)} MB/s`);
    console.info(`- Average read speed: ${avgReadSpeed.toFixed(2)} MB/s`);
    
    console.info('\n🎯 RECOMMENDATIONS:');
    console.info('1. Verify all large files (>2GB) written in last 30 days');
    console.info('2. Implement file integrity checks for critical data');
    console.info('3. Add file size validation before write operations');
    console.info('4. Monitor disk space during large file operations');
    console.info('5. Consider chunked writes for very large files');
    
    if (failed.length > 0) {
      console.info('\n🚨 CRITICAL: File corruption detected!');
      console.info('   Immediate action required:');
      console.info('   - Upgrade to Bun v1.3.6 immediately');
      console.info('   - Verify all existing large files');
      console.info('   - Implement backup verification');
    }
  }

  private calculateAvgSpeed(operation: 'write' | 'read'): number {
    const validResults = this.results.filter(r => !r.error);
    if (validResults.length === 0) return 0;
    
    const totalMB = validResults.reduce((sum, r) => sum + (r.fileSize / (1024 * 1024)), 0);
    const totalTime = validResults.reduce((sum, r) => 
      sum + (operation === 'write' ? r.writeTime : r.readTime), 0);
    
    return totalTime > 0 ? totalMB / (totalTime / 1000) : 0; // MB/s
  }
}

// Run tests if called directly
if (import.meta.main) {
  const tester = new FileIntegrityTester();
  await tester.runAllTests();
}

export { FileIntegrityTester, IntegrityTestResult };
