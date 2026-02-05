/**
 * Empire Pro Enhanced File Processor using Bun v1.3.6 SIMD Buffer.indexOf()
 * 2x faster pattern matching and file processing operations
 */

export interface ProcessingResult {
  filePath: string;
  size: number;
  patternsFound: Array<{ pattern: string; count: number; positions: number[] }>;
  processingTime: number;
  throughput: number; // bytes per second
}

export interface BatchProcessingResult {
  totalFiles: number;
  totalBytes: number;
  totalPatterns: number;
  processingTime: number;
  throughput: number;
  results: ProcessingResult[];
}

export class EnhancedFileProcessor {
  private static readonly SIMD_THRESHOLD = 1024; // Use SIMD for buffers > 1KB
  private readonly patternCache = new Map<string, RegExp>();

  /**
   * Process single file with SIMD-optimized pattern matching
   * Uses Bun v1.3.6 Buffer.indexOf() with 2x faster SIMD acceleration
   */
  async processFile(filePath: string, patterns: string[]): Promise<ProcessingResult> {
    const startTime = performance.now();
    
    try {
      const file = Bun.file(filePath);
      const buffer = Buffer.from(await file.arrayBuffer());
      const size = buffer.length;
      
      console.log(`📁 Processing ${filePath} (${(size / 1024).toFixed(2)}KB)`);
      
      const patternsFound: Array<{ pattern: string; count: number; positions: number[] }> = [];
      
      // Use SIMD-optimized search for large buffers
      for (const pattern of patterns) {
        if (buffer.length >= EnhancedFileProcessor.SIMD_THRESHOLD) {
          const result = this.searchPatternSIMD(buffer, pattern);
          patternsFound.push(result);
        }
      }
      
      const processingTime = performance.now() - startTime;
      const throughput = size / (processingTime / 1000);
      
      console.log(`✅ Processed ${filePath} in ${processingTime.toFixed(3)}ms (${(throughput / 1024 / 1024).toFixed(2)}MB/s)`);
      
      return {
        filePath,
        size,
        patternsFound,
        processingTime,
        throughput
      };
    } catch (error) {
      console.error(`❌ Failed to process ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * SIMD-optimized pattern search using Bun v1.3.6 Buffer.indexOf()
   * Automatically uses SIMD acceleration for buffers > 1KB
   */
  private searchPatternSIMD(buffer: Buffer, pattern: string): { pattern: string; count: number; positions: number[] } {
    const positions: number[] = [];
    let searchIndex = 0;
    let count = 0;
    
    // Use Bun v1.3.6 optimized Buffer.indexOf() with SIMD acceleration
    while (true) {
      const index = buffer.indexOf(pattern, searchIndex);
      
      if (index === -1) break;
      
      positions.push(index);
      count++;
      searchIndex = index + pattern.length;
    }
    
    const simdUsed = buffer.length > this.SIMD_THRESHOLD;
    console.log(`🔍 Pattern "${pattern}": ${count} matches (SIMD: ${simdUsed ? 'ON' : 'OFF'})`);
    
    return {
      pattern,
      count,
      positions
    };
  }

  /**
   * Process multiple files in parallel with SIMD optimization
   */
  async processBatch(filePaths: string[], patterns: string[], concurrency = 4): Promise<BatchProcessingResult> {
    const startTime = performance.now();
    console.log(`🚀 Processing ${filePaths.length} files with ${patterns.length} patterns (concurrency: ${concurrency})`);
    
    // Process files in batches to control memory usage
    const results: ProcessingResult[] = [];
    const totalBytes = filePaths.reduce((sum, path) => {
      try {
        return sum + Bun.file(path).size;
      } catch {
        return sum;
      }
    }, 0);
    
    for (let i = 0; i < filePaths.length; i += concurrency) {
      const batch = filePaths.slice(i, i + concurrency);
      console.log(`📦 Processing batch ${Math.floor(i / concurrency) + 1}/${Math.ceil(filePaths.length / concurrency)}`);
      
      // Process batch in parallel
      const batchResults = await Promise.allSettled(
        batch.map(filePath => this.processFile(filePath, patterns))
      );
      
      batchResults.forEach(result => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`❌ Batch processing failed:`, result.reason);
        }
      });
    }
    
    const processingTime = performance.now() - startTime;
    const totalPatterns = results.reduce((sum, result) => 
      sum + result.patternsFound.reduce((pSum, pattern) => pSum + pattern.count, 0), 0);
    const throughput = totalBytes / (processingTime / 1000);
    
    console.log(`✅ Batch processing completed in ${processingTime.toFixed(0)}ms`);
    console.log(`📊 Total patterns found: ${totalPatterns}`);
    console.log(`🚀 Overall throughput: ${(throughput / 1024 / 1024).toFixed(2)}MB/s`);
    
    return {
      totalFiles: filePaths.length,
      totalBytes,
      totalPatterns,
      processingTime,
      throughput,
      results
    };
  }

  /**
   * Analyze log files with common error patterns
   */
  async analyzeLogFiles(logDirectory: string, recursive = true): Promise<BatchProcessingResult> {
    const logPatterns = [
      'ERROR',
      'WARN',
      'CRITICAL',
      'Exception',
      'Failed',
      'Timeout',
      'Connection refused',
      'Out of memory',
      'Stack trace',
      'Fatal error'
    ];
    
    const logFiles = await this.findLogFiles(logDirectory, recursive);
    console.log(`📋 Found ${logFiles.length} log files in ${logDirectory}`);
    
    return await this.processBatch(logFiles, logPatterns);
  }

  /**
 * Search for sensitive data patterns in files
 */
  async scanForSensitiveData(directory: string, recursive = true): Promise<BatchProcessingResult> {
    const sensitivePatterns = [
      'password',
      'secret',
      'token',
      'api_key',
      'private_key',
      'credential',
      'auth',
      'session',
      'jwt',
      'bearer'
    ];
    
    // Temporarily remove extension filter for testing
    const files = await this.findFiles(directory, recursive);
    console.log(`🔍 Scanning ${files.length} files for sensitive data`);
    
    return await this.processBatch(files, sensitivePatterns);
  }

  /**
   * Process large files in chunks with SIMD optimization
   */
  async processLargeFile(filePath: string, patterns: string[], chunkSize = 1024 * 1024): Promise<ProcessingResult> {
    const startTime = performance.now();
    
    try {
      const file = Bun.file(filePath);
      const totalSize = await file.size();
      
      console.log(`📄 Processing large file: ${filePath} (${(totalSize / 1024 / 1024).toFixed(2)}MB)`);
      
      const allPatternsFound: Array<{ pattern: string; count: number; positions: number[] }> = [];
      
      // Initialize pattern counters
      const patternCounters = new Map<string, number>();
      const patternPositions = new Map<string, number[]>();
      
      patterns.forEach(pattern => {
        patternCounters.set(pattern, 0);
        patternPositions.set(pattern, []);
      });
      
      // Process file in chunks
      let processedBytes = 0;
      let chunkIndex = 0;
      const remainingBytes = totalSize;
      
      for (let offset = 0; offset < totalSize; offset += chunkSize) {
        const currentChunkSize = Math.min(chunkSize, remainingBytes - offset);
        const chunk = await file.slice(offset, offset + currentChunkSize).arrayBuffer();
        const buffer = Buffer.from(chunk);
        
        // Search for patterns in chunk using SIMD
        for (const pattern of patterns) {
          const result = this.searchPatternSIMD(buffer, pattern);
          const currentCount = patternCounters.get(pattern) || 0;
          const currentPositions = patternPositions.get(pattern) || [];
          
          patternCounters.set(pattern, currentCount + result.count);
          
          // Adjust positions to global file coordinates
          const adjustedPositions = result.positions.map(pos => pos + offset);
          patternPositions.set(pattern, [...currentPositions, ...adjustedPositions]);
        }
        
        processedBytes += buffer.length;
        chunkIndex++;
        
        // Progress reporting
        if (chunkIndex % 10 === 0) {
          const progress = (processedBytes / totalSize * 100).toFixed(1);
          console.log(`📈 Progress: ${progress}% (${chunkIndex} chunks)`);
        }
      }
      
      // Compile results
      patterns.forEach(pattern => {
        allPatternsFound.push({
          pattern,
          count: patternCounters.get(pattern) || 0,
          positions: patternPositions.get(pattern) || []
        });
      });
      
      const processingTime = performance.now() - startTime;
      const throughput = totalSize / (processingTime / 1000);
      
      console.log(`✅ Large file processed in ${processingTime.toFixed(0)}ms`);
      console.log(`🚀 Throughput: ${(throughput / 1024 / 1024).toFixed(2)}MB/s`);
      
      return {
        filePath,
        size: totalSize,
        patternsFound: allPatternsFound,
        processingTime,
        throughput
      }
    } catch (error) {
      console.error(`❌ Failed to process large file ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Find log files in directory
   */
  private async findLogFiles(directory: string, recursive: boolean): Promise<string[]> {
    const logExtensions = ['.log', '.out', '.err', '.trace'];
    return await this.findFiles(directory, recursive, logExtensions);
  }

  /**
   * Find files by extension
   */
  private async findFiles(directory: string, recursive: boolean, extensions: string[] = []): Promise<string[]> {
    const files: string[] = [];
    
    try {
      // Build find command based on parameters
      let findCommand = ['find', directory, '-type', 'f', '!', '-name', '.*'];
      
      if (extensions.length > 0) {
        // Add extension filters using -o (OR) operator
        findCommand.push('(');
        extensions.forEach((ext, index) => {
          findCommand.push('-name', `*.${ext}`);
          if (index < extensions.length - 1) {
            findCommand.push('-o');
          }
        });
        findCommand.push(')');
      }
      
      if (!recursive) {
        findCommand.splice(1, 0, '-maxdepth', '1');
      }
      
      const result = Bun.spawnSync(findCommand, { stdout: 'pipe' });
      
      if (result.exitCode === 0 && result.stdout) {
        const fileNames = new TextDecoder().decode(result.stdout).trim().split('\n').filter(Boolean);
        files.push(...fileNames);
      }
    } catch (error) {
      console.error(`❌ Failed to read directory ${directory}:`, error);
    }
    
    return files;
  }

  /**
   * Generate processing report
   */
  generateReport(results: BatchProcessingResult): string {
    const report = [
      '# 📊 Enhanced File Processing Report',
      '=' .repeat(50),
      '',
      `**Total Files Processed**: ${results.totalFiles}`,
      `**Total Data**: ${(results.totalBytes / 1024 / 1024).toFixed(2)}MB`,
      `**Total Patterns Found**: ${results.totalPatterns}`,
      `**Processing Time**: ${results.processingTime.toFixed(0)}ms`,
      `**Throughput**: ${(results.throughput / 1024 / 1024).toFixed(2)}MB/s`,
      '',
      '## 📁 File Details',
      ''
    ];
    
    results.results.forEach(result => {
      report.push(`### ${result.filePath}`);
      report.push(`- **Size**: ${(result.size / 1024).toFixed(2)}KB`);
      report.push(`- **Processing Time**: ${result.processingTime.toFixed(3)}ms`);
      report.push(`- **Throughput**: ${(result.throughput / 1024).toFixed(2)}KB/s`);
      report.push(`- **Patterns Found**: ${result.patternsFound.length}`);
      
      const patternsWithMatches = result.patternsFound.filter(p => p.count > 0);
      if (patternsWithMatches.length > 0) {
        report.push('  **Matches**:');
        patternsWithMatches.forEach(pattern => {
          report.push(`    - ${pattern.pattern}: ${pattern.count} occurrences`);
        });
      }
      report.push('');
    });
    
    return report.join('\n');
  }
}

// CLI interface
if (import.meta.main) {
  const processor = new EnhancedFileProcessor();
  const command = process.argv[2];
  const target = process.argv[3];
  
  switch (command) {
    case 'analyze':
      if (target) {
        const result = await processor.analyzeLogFiles(target);
        console.log('\n' + processor.generateReport(result));
      } else {
        console.log('Usage: bun enhanced-file-processor.ts analyze <log-directory>');
      }
      break;
      
    case 'scan':
      if (target) {
        const result = await processor.scanForSensitiveData(target);
        console.log('\n' + processor.generateReport(result));
      } else {
        console.log('Usage: bun enhanced-file-processor.ts scan <directory>');
      }
      break;
      
    case 'process':
      if (target) {
        const patterns = ['error', 'warning', 'info'];
        const result = await processor.processFile(target, patterns);
        console.log('\n📊 Processing Result:');
        console.log(`✅ File: ${result.filePath}`);
        console.log(`📏 Size: ${(result.size / 1024).toFixed(2)}KB`);
        console.log(`⏱️ Time: ${result.processingTime.toFixed(3)}ms`);
        console.log(`🚀 Throughput: ${(result.throughput / 1024).toFixed(2)}KB/s`);
        console.log(`🔍 Patterns: ${result.patternsFound.length}`);
        result.patternsFound.forEach(pattern => {
          if (pattern.count > 0) {
            console.log(`   - ${pattern.pattern}: ${pattern.count} matches`);
          }
        });
      } else {
        console.log('Usage: bun enhanced-file-processor.ts process <file-path>');
      }
      break;
      
    default:
      console.log('Available commands:');
      console.log('  analyze <dir>    - Analyze log files for error patterns');
      console.log('  scan <dir>       - Scan files for sensitive data');
      console.log('  process <file>   - Process single file with patterns');
      console.log('');
      console.log('All operations use Bun v1.3.6 SIMD-optimized Buffer.indexOf() for 2x faster performance');
  }
}

export { EnhancedFileProcessor as default };
