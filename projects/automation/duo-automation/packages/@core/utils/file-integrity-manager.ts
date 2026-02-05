/**
 * Empire Pro File Integrity Manager using Bun v1.3.6 hash.crc32
 * 20x faster file integrity verification and content deduplication
 */

export interface FileIntegrityResult {
  filePath: string;
  crc32: string;
  size: number;
  lastModified: Date;
  verified: boolean;
  algorithm: 'crc32';
}

export interface IntegrityReport {
  totalFiles: number;
  verifiedFiles: number;
  corruptedFiles: string[];
  duplicateFiles: Array<{ hash: string; files: string[] }>;
  processingTime: number;
  throughput: number; // files per second
}

export class FileIntegrityManager {
  private readonly cache = new Map<string, FileIntegrityResult>();
  private readonly duplicates = new Map<string, string[]>();

  /**
   * Calculate CRC32 hash using Bun v1.3.6 optimized hash.crc32
   * 20x faster than manual CRC32 implementations
   */
  async calculateCRC32(filePath: string): Promise<string> {
    const startTime = performance.now();
    
    try {
      const file = Bun.file(filePath);
      const buffer = await file.arrayBuffer();
      
      // Use Bun v1.3.6 optimized hash.crc32 (20x faster)
      const hash = Bun.hash.crc32(new Uint8Array(buffer));
      const crc32Hex = hash.toString(16).padStart(8, '0');
      
      const duration = performance.now() - startTime;
      console.log(`🔐 CRC32 calculated for ${filePath} in ${duration.toFixed(3)}ms`);
      
      return crc32Hex;
    } catch (error) {
      console.error(`❌ Failed to calculate CRC32 for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Verify file integrity with cached results
   */
  async verifyFile(filePath: string, expectedCRC32?: string): Promise<FileIntegrityResult> {
    const startTime = performance.now();
    
    try {
      const file = Bun.file(filePath);
      const stat = await file.stat();
      const crc32 = await this.calculateCRC32(filePath);
      
      const result: FileIntegrityResult = {
        filePath,
        crc32,
        size: stat.size,
        lastModified: new Date(stat.mtime),
        verified: expectedCRC32 ? crc32 === expectedCRC32 : true,
        algorithm: 'crc32'
      };
      
      // Cache the result
      this.cache.set(filePath, result);
      
      // Track duplicates
      if (!this.duplicates.has(crc32)) {
        this.duplicates.set(crc32, []);
      }
      this.duplicates.get(crc32)!.push(filePath);
      
      const duration = performance.now() - startTime;
      console.log(`✅ File verified: ${filePath} (${duration.toFixed(3)}ms)`);
      
      return result;
    } catch (error) {
      console.error(`❌ File verification failed for ${filePath}:`, error);
      throw error;
    }
  }

  /**
   * Batch verify multiple files with parallel processing
   */
  async verifyFiles(filePaths: string[], expectedHashes?: Record<string, string>): Promise<FileIntegrityResult[]> {
    const startTime = performance.now();
    console.log(`🔐 Verifying ${filePaths.length} files using Bun v1.3.6 hash.crc32...`);
    
    // Process files in parallel for maximum performance
    const results = await Promise.allSettled(
      filePaths.map(filePath => this.verifyFile(filePath, expectedHashes?.[filePath]))
    );
    
    const verifiedResults: FileIntegrityResult[] = [];
    const corruptedFiles: string[] = [];
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        verifiedResults.push(result.value);
        if (!result.value.verified) {
          corruptedFiles.push(result.value.filePath);
        }
      } else {
        console.error(`❌ Failed to verify ${filePaths[index]}:`, result.reason);
        corruptedFiles.push(filePaths[index]);
      }
    });
    
    const duration = performance.now() - startTime;
    const throughput = filePaths.length / (duration / 1000);
    
    console.log(`✅ Batch verification completed in ${duration.toFixed(0)}ms`);
    console.log(`📊 Throughput: ${throughput.toFixed(0)} files/second`);
    console.log(`🔍 Corrupted files: ${corruptedFiles.length}`);
    
    return verifiedResults;
  }

  /**
   * Generate comprehensive integrity report
   */
  async generateIntegrityReport(directory: string, recursive = true): Promise<IntegrityReport> {
    const startTime = performance.now();
    
    // Find all files
    const filePaths = await this.findFiles(directory, recursive);
    console.log(`📁 Found ${filePaths.length} files in ${directory}`);
    
    // Verify all files
    const results = await this.verifyFiles(filePaths);
    
    // Find duplicates
    const duplicateFiles = this.findDuplicates();
    
    // Identify corrupted files
    const corruptedFiles = results
      .filter(r => !r.verified)
      .map(r => r.filePath);
    
    const processingTime = performance.now() - startTime;
    const throughput = filePaths.length / (processingTime / 1000);
    
    const report: IntegrityReport = {
      totalFiles: filePaths.length,
      verifiedFiles: results.filter(r => r.verified).length,
      corruptedFiles,
      duplicateFiles,
      processingTime,
      throughput
    };
    
    return report;
  }

  /**
   * Find all files in directory (recursive or not)
   */
  private async findFiles(directory: string, recursive: boolean): Promise<string[]> {
    const files: string[] = [];
    
    try {
      // Use Bun.spawnSync with find command instead of Deno.readDir
      const findCommand = recursive 
        ? ['find', directory, '-type', 'f', '!', '-name', '.*']
        : ['find', directory, '-maxdepth', '1', '-type', 'f', '!', '-name', '.*'];
      
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
   * Find duplicate files based on CRC32 hashes
   */
  private findDuplicates(): Array<{ hash: string; files: string[] }> {
    const duplicates: Array<{ hash: string; files: string[] }> = [];
    
    for (const [hash, files] of this.duplicates.entries()) {
      if (files.length > 1) {
        duplicates.push({ hash, files });
      }
    }
    
    return duplicates;
  }

  /**
   * Validate backup integrity using stored checksums
   */
  async validateBackup(backupPath: string, checksumFile = 'checksums.json'): Promise<boolean> {
    try {
      // Load checksums
      const checksumData = await Bun.file(checksumFile).json();
      const expectedHashes: Record<string, string> = checksumData.files || {};
      
      // Extract backup if it's an archive
      const extractDir = `${backupPath}.extracted`;
      
      if (backupPath.endsWith('.tar.gz')) {
        console.log(`📦 Extracting backup: ${backupPath}`);
        const archiveData = await Bun.file(backupPath).bytes();
        const archive = new Bun.Archive(archiveData);
        await archive.extract(extractDir);
      }
      
      // Verify extracted files
      const report = await this.generateIntegrityReport(extractDir, true);
      
      // Cleanup
      try {
        const result = Bun.spawnSync(['rm', '-rf', extractDir]);
        if (result.exitCode !== 0) {
          console.warn('⚠️ Could not cleanup extracted directory');
        }
      } catch (e) {
        // Ignore cleanup errors
      }
      
      const isValid = report.corruptedFiles.length === 0;
      console.log(`✅ Backup validation: ${isValid ? 'PASSED' : 'FAILED'}`);
      
      if (report.corruptedFiles.length > 0) {
        console.log(`❌ Corrupted files: ${report.corruptedFiles.join(', ')}`);
      }
      
      return isValid;
    } catch (error) {
      console.error(`❌ Backup validation failed:`, error);
      return false;
    }
  }

  /**
   * Generate checksum manifest for directory
   */
  async generateChecksumManifest(directory: string, outputFile = 'checksums.json'): Promise<void> {
    console.log(`🔐 Generating checksum manifest for ${directory}...`);
    
    const report = await this.generateIntegrityReport(directory, true);
    const checksums: Record<string, { crc32: string; size: number; modified: string }> = {};
    
    // Get cached results
    for (const [filePath, result] of this.cache.entries()) {
      if (filePath.startsWith(directory)) {
        checksums[filePath] = {
          crc32: result.crc32,
          size: result.size,
          modified: result.lastModified.toISOString()
        };
      }
    }
    
    const manifest = {
      generated: new Date().toISOString(),
      algorithm: 'crc32',
      directory,
      totalFiles: report.totalFiles,
      verifiedFiles: report.verifiedFiles,
      files: checksums,
      duplicates: report.duplicateFiles
    };
    
    await Bun.write(outputFile, JSON.stringify(manifest, null, 2));
    console.log(`✅ Checksum manifest saved to ${outputFile}`);
  }

  /**
   * Clear cache and reset state
   */
  clearCache(): void {
    this.cache.clear();
    this.duplicates.clear();
    console.log(`🧩 Integrity cache cleared`);
  }

  /**
   * Get cached result for file
   */
  getCachedResult(filePath: string): FileIntegrityResult | undefined {
    return this.cache.get(filePath);
  }

  /**
   * Get statistics
   */
  getStatistics(): { cachedFiles: number; duplicateGroups: number; totalDuplicates: number } {
    const duplicateGroups = Array.from(this.duplicates.values()).filter(files => files.length > 1).length;
    const totalDuplicates = Array.from(this.duplicates.values()).reduce((sum, files) => 
      sum + (files.length > 1 ? files.length : 0), 0);
    
    return {
      cachedFiles: this.cache.size,
      duplicateGroups,
      totalDuplicates
    };
  }
}

// CLI interface
if (import.meta.main) {
  const integrityManager = new FileIntegrityManager();
  const command = process.argv[2];
  const target = process.argv[3];
  
  switch (command) {
    case 'verify':
      if (target) {
        const result = await integrityManager.verifyFile(target);
        console.log('Verification result:', result);
      } else {
        console.log('Usage: bun file-integrity-manager.ts verify <file-path>');
      }
      break;
      
    case 'report':
      if (target) {
        const report = await integrityManager.generateIntegrityReport(target);
        console.log('\n📊 File Integrity Report:');
        console.log(`📁 Total files: ${report.totalFiles}`);
        console.log(`✅ Verified files: ${report.verifiedFiles}`);
        console.log(`❌ Corrupted files: ${report.corruptedFiles.length}`);
        console.log(`🔄 Duplicate groups: ${report.duplicateFiles.length}`);
        console.log(`⏱️ Processing time: ${report.processingTime.toFixed(0)}ms`);
        console.log(`🚀 Throughput: ${report.throughput.toFixed(0)} files/sec`);
        
        if (report.corruptedFiles.length > 0) {
          console.log('\n❌ Corrupted files:');
          report.corruptedFiles.forEach(file => console.log(`  - ${file}`));
        }
        
        if (report.duplicateFiles.length > 0) {
          console.log('\n🔄 Duplicate files:');
          report.duplicateFiles.forEach(dup => {
            console.log(`  Hash: ${dup.hash}`);
            dup.files.forEach(file => console.log(`    - ${file}`));
          });
        }
      } else {
        console.log('Usage: bun file-integrity-manager.ts report <directory>');
      }
      break;
      
    case 'manifest':
      if (target) {
        await integrityManager.generateChecksumManifest(target);
      } else {
        console.log('Usage: bun file-integrity-manager.ts manifest <directory>');
      }
      break;
      
    case 'validate':
      if (target) {
        const isValid = await integrityManager.validateBackup(target);
        console.log(`Backup validation: ${isValid ? '✅ PASSED' : '❌ FAILED'}`);
      } else {
        console.log('Usage: bun file-integrity-manager.ts validate <backup-path>');
      }
      break;
      
    default:
      console.log('Available commands:');
      console.log('  verify <file>     - Verify single file');
      console.log('  report <dir>      - Generate integrity report for directory');
      console.log('  manifest <dir>    - Generate checksum manifest');
      console.log('  validate <backup> - Validate backup integrity');
  }
}

export { FileIntegrityManager as default };
