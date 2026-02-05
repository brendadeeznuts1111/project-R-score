/**
 * Exercise 1: File I/O Mastery
 * 
 * Goal: Replace Node.js synchronous I/O with Bun-native async patterns
 * 
 * Instructions:
 * 1. Run `bun run skills scan` to see annotations
 * 2. Fix all [PERF][SYNC_IO] annotations
 * 3. Run `bun run skills benchmark` to verify improvement
 * 4. Ensure all tests pass
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs'; // ❌ Node.js patterns

// ❌ PROBLEM 1: Synchronous file reading blocks the event loop
export function readConfigFile(): Record<string, unknown> {
  // [PERF][GLOBAL][SYNC_IO][META:{fix:"Bun.file().text()",severity:"critical",complexity:"simple",estimatedTime:"2min"}][ConfigManager][readConfigFile][IConfigReader][#REF:skills-file-io][BUN-NATIVE]
  const configPath = './config.json';
  
  if (!existsSync(configPath)) { // ❌ Synchronous check
    // [PERF][GLOBAL][SYNC_IO][META:{fix:"Bun.file().exists()",severity:"critical",complexity:"simple",estimatedTime:"1min"}][ConfigManager][readConfigFile][IConfigReader][#REF:skills-file-io][BUN-NATIVE]
    throw new Error('Config file not found');
  }
  
  const data = readFileSync(configPath, 'utf8'); // ❌ Blocking read
  // [PERF][GLOBAL][SYNC_IO][META:{fix:"await Bun.file(configPath).text()",severity:"critical",complexity:"simple",estimatedTime:"2min"}][ConfigManager][readConfigFile][IConfigReader][#REF:skills-file-io][BUN-NATIVE]
  
  return JSON.parse(data);
}

// ❌ PROBLEM 2: Synchronous file writing with error handling issues
export function saveUserData(userId: string, data: Record<string, unknown>): void {
  const userDir = `./users/${userId}`;
  
  if (!existsSync(userDir)) { // ❌ Synchronous directory check
    // [PERF][GLOBAL][SYNC_IO][META:{fix:"await ensureDir(userDir)",severity:"critical",complexity:"moderate",estimatedTime:"3min"}][UserService][saveUserData][IUserStorage][#REF:skills-file-io][BUN-NATIVE]
    mkdirSync(userDir, { recursive: true }); // ❌ Blocking directory creation
    // [PERF][GLOBAL][SYNC_IO][META:{fix:"await Bun.write(userDir, '')",severity:"critical",complexity:"moderate",estimatedTime:"3min"}][UserService][saveUserData][IUserStorage][#REF:skills-file-io][BUN-NATIVE]
  }
  
  const filePath = `${userDir}/data.json`;
  const jsonData = JSON.stringify(data, null, 2);
  
  writeFileSync(filePath, jsonData, 'utf8'); // ❌ Blocking write
  // [PERF][GLOBAL][SYNC_IO][META:{fix:"await Bun.write(filePath, jsonData)",severity:"critical",complexity:"simple",estimatedTime:"2min"}][UserService][saveUserData][IUserStorage][#REF:skills-file-io][BUN-NATIVE]
}

// ❌ PROBLEM 3: Batch processing with inefficient file operations
export async function processLogFiles(logDir: string): Promise<string[]> {
  const logFiles: string[] = [];
  
  // ❌ This should use Bun.glob for better performance
  const files = require('fs').readdirSync(logDir); // ❌ Synchronous directory read
  // [PERF][GLOBAL][SYNC_IO][META:{fix:"Bun.glob('*.log')",severity:"critical",complexity:"moderate",estimatedTime:"5min"}][LogProcessor][processLogFiles][ILogReader][#REF:skills-file-io][BUN-NATIVE]
  
  for (const file of files) {
    if (file.endsWith('.log')) {
      const content = readFileSync(`${logDir}/${file}`, 'utf8'); // ❌ Blocking read in loop
      // [PERF][GLOBAL][SYNC_IO][META:{fix:"await Bun.file().text() with Promise.all",severity:"critical",complexity:"moderate",estimatedTime:"5min"}][LogProcessor][processLogFiles][ILogReader][#REF:skills-file-io][BUN-NATIVE]
      logFiles.push(content);
    }
  }
  
  return logFiles;
}

// ❌ PROBLEM 4: Large file processing without streaming
export function analyzeLargeFile(filePath: string): { lines: number; size: number } {
  // [PERF][GLOBAL][SYNC_IO][META:{fix:"Stream with Bun.file().stream()",severity:"critical",complexity:"complex",estimatedTime:"10min"}[FileAnalyzer][analyzeLargeFile][IFileAnalyzer][#REF:skills-file-io][BUN-NATIVE]
  const content = readFileSync(filePath, 'utf8'); // ❌ Loads entire file into memory
  // [PERF][GLOBAL][SYNC_IO][META:{fix:"await Bun.file(filePath).text()",severity:"critical",complexity:"complex",estimatedTime:"10min"}[FileAnalyzer][analyzeLargeFile][IFileAnalyzer][#REF:skills-file-io][BUN-NATIVE]
  
  const lines = content.split('\\n').length;
  const size = Buffer.byteLength(content, 'utf8'); // ❌ Buffer usage
  
  return { lines, size };
}

// ❌ PROBLEM 5: Configuration watcher with inefficient polling
export class ConfigWatcher {
  private configPath: string;
  private lastModified: number;
  private interval: NodeJS.Timeout | null = null;
  
  constructor(configPath: string) {
    this.configPath = configPath;
    this.lastModified = 0;
  }
  
  start(callback: (config: Record<string, unknown>) => void): void {
    this.interval = setInterval(() => {
      try {
        const stats = require('fs').statSync(this.configPath); // ❌ Synchronous stat
        // [PERF][GLOBAL][SYNC_IO][META:{fix:"Bun.file().lastModified",severity:"high",complexity:"moderate",estimatedTime:"5min"}][ConfigWatcher][start][IConfigWatcher][#REF:skills-file-io][BUN-NATIVE]
        
        if (stats.mtimeMs > this.lastModified) {
          this.lastModified = stats.mtimeMs;
          const config = readFileSync(this.configPath, 'utf8'); // ❌ Synchronous read
          // [PERF][GLOBAL][SYNC_IO][META:{fix:"await Bun.file().text()",severity:"high",complexity:"moderate",estimatedTime:"5min"}][ConfigWatcher][start][IConfigWatcher][#REF:skills-file-io][BUN-NATIVE]
          callback(JSON.parse(config));
        }
      } catch (error) {
        console.error('Config watch error:', error);
      }
    }, 1000); // ❌ Inefficient polling
  }
  
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
}

// Helper function that students should implement
export async function ensureDir(dirPath: string): Promise<void> {
  // 🎯 STUDENT TASK: Implement directory creation using Bun
  // Should be async and handle existing directories gracefully
}

// Helper function for streaming large files
export async function* streamLines(filePath: string): AsyncGenerator<string> {
  // 🎯 STUDENT TASK: Implement line-by-line streaming
  // Should use Bun.file().stream() for memory efficiency
}

// Benchmark utilities
export class BenchmarkRunner {
  static async measureFileRead(filePath: string, iterations = 100): Promise<{ avgTime: number; totalTime: number }> {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      // This will be replaced with student's implementation
      const content = readFileSync(filePath, 'utf8');
      const end = performance.now();
      times.push(end - start);
    }
    
    const totalTime = times.reduce((a, b) => a + b, 0);
    return {
      avgTime: totalTime / iterations,
      totalTime
    };
  }
  
  static async measureFileWrite(filePath: string, data: string, iterations = 100): Promise<{ avgTime: number; totalTime: number }> {
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      // This will be replaced with student's implementation
      writeFileSync(filePath, data);
      const end = performance.now();
      times.push(end - start);
    }
    
    const totalTime = times.reduce((a, b) => a + b, 0);
    return {
      avgTime: totalTime / iterations,
      totalTime
    };
  }
}

// Test data generator
export function generateTestData(size: number): string {
  const lines = [];
  for (let i = 0; i < size; i++) {
    lines.push(`Line ${i}: ${Math.random().toString(36).repeat(50)}`);
  }
  return lines.join('\\n');
}
