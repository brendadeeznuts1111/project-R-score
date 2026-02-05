#!/usr/bin/env bun
/**
 * Bun-Native Binary Validation Utility
 * 
 * Ultra-fast binary detection and validation using Bun.which (6x faster than which package)
 * 
 * @author DuoPlus Automation Suite
 * @version 1.0.0
 */

export interface BinaryValidationResult {
  valid: boolean;
  missing: string[];
  present: string[];
  paths: Map<string, string>;
}

export interface BinaryPathResult {
  binary: string;
  path: string | null;
  found: boolean;
}

export class BunBinaryValidator {
  /**
   * Validates all required binaries exist with Bun.which (6x faster than which package)
   */
  static validateBinaries(required: string[]): BinaryValidationResult {
    const missing: string[] = [];
    const present: string[] = [];
    const paths = new Map<string, string>();

    for (const binary of required) {
      const path = Bun.which(binary);
      if (path) {
        present.push(binary);
        paths.set(binary, path);
      } else {
        missing.push(binary);
        paths.set(binary, 'NOT_FOUND');
      }
    }

    return {
      valid: missing.length === 0,
      missing,
      present,
      paths
    };
  }

  /**
   * Get binary paths in parallel with timeout
   */
  static async getBinaryPaths(binaries: string[], timeoutMs: number = 5000): Promise<Map<string, string>> {
    const paths = new Map<string, string>();
    
    const promises = binaries.map(async (binary) => {
      try {
        const pathPromise = new Promise<string>((resolve, reject) => {
          const path = Bun.which(binary, { 
            PATH: process.env.PATH,
            cwd: process.cwd() 
          });
          if (path) {
            resolve(path);
          } else {
            reject(new Error(`Binary not found: ${binary}`));
          }
        });

        const path = await Promise.race([
          pathPromise,
          new Promise<never>((_, reject) => 
            setTimeout(() => reject(new Error(`Timeout for ${binary}`)), timeoutMs)
          )
        ]);

        return { binary, path, found: true } as BinaryPathResult;
      } catch (error) {
        return { binary, path: null, found: false } as BinaryPathResult;
      }
    });

    const results = await Promise.all(promises);
    
    for (const result of results) {
      paths.set(result.binary, result.path || 'NOT_FOUND');
    }
    
    return paths;
  }

  /**
   * Check if a specific binary is available
   */
  static isBinaryAvailable(binary: string): boolean {
    return !!Bun.which(binary);
  }

  /**
   * Get binary version with common version flags
   */
  static async getBinaryVersion(binary: string): Promise<string | null> {
    if (!this.isBinaryAvailable(binary)) {
      return null;
    }

    const commonFlags = ['--version', '-v', '-V', 'version'];
    
    for (const flag of commonFlags) {
      try {
        const result = await Bun.$`"${binary}" ${flag}`.quiet();
        if (result.exitCode === 0) {
          const output = result.stdout.toString().trim();
          if (output) {
            return output;
          }
        }
      } catch {
        continue;
      }
    }

    try {
      const result = await Bun.$`"${binary}" --help`.quiet();
      if (result.exitCode === 0) {
        return 'UNKNOWN_VERSION';
      }
    } catch {
      return null;
    }

    return null;
  }

  /**
   * Validate DuoPlus-specific binaries
   */
  static validateDuoPlusBinaries(): BinaryValidationResult {
    const required = [
      'git',
      'bun',
      'node',
      'npm',
      'aws',
      'docker',
      'curl',
      'wget'
    ];

    return this.validateBinaries(required);
  }

  /**
   * Get system binary information
   */
  static async getSystemBinaryInfo(): Promise<Map<string, { path: string; version: string | null }>> {
    const binaries = ['git', 'bun', 'node', 'npm', 'aws', 'docker', 'curl', 'wget'];
    const paths = await this.getBinaryPaths(binaries);
    const info = new Map();

    for (const [binary, path] of paths) {
      if (path !== 'NOT_FOUND') {
        const version = await this.getBinaryVersion(binary);
        info.set(binary, { path, version });
      } else {
        info.set(binary, { path: 'NOT_FOUND', version: null });
      }
    }

    return info;
  }

  /**
   * Check for conflicting binaries
   */
  static findConflictingBinaries(binaries: string[]): Map<string, string[]> {
    const conflicts = new Map<string, string[]>();
    const pathGroups = new Map<string, string[]>();

    for (const binary of binaries) {
      const path = Bun.which(binary);
      if (path) {
        if (!pathGroups.has(path)) {
          pathGroups.set(path, []);
        }
        pathGroups.get(path)!.push(binary);
      }
    }

    for (const [path, bins] of pathGroups) {
      if (bins.length > 1) {
        conflicts.set(path, bins);
      }
    }

    return conflicts;
  }

  /**
   * Generate validation report
   */
  static generateValidationReport(result: BinaryValidationResult): string {
    const lines: string[] = [];
    
    lines.push('=== Binary Validation Report ===');
    lines.push(`Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
    lines.push(`Total checked: ${result.present.length + result.missing.length}`);
    lines.push(`Present: ${result.present.length}`);
    lines.push(`Missing: ${result.missing.length}`);
    lines.push('');

    if (result.present.length > 0) {
      lines.push('✅ Present Binaries:');
      for (const binary of result.present) {
        const path = result.paths.get(binary);
        lines.push(`  ${binary}: ${path}`);
      }
      lines.push('');
    }

    if (result.missing.length > 0) {
      lines.push('❌ Missing Binaries:');
      for (const binary of result.missing) {
        lines.push(`  ${binary}: NOT_FOUND`);
      }
      lines.push('');
    }

    return lines.join('\n');
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    // Default: validate DuoPlus binaries
    const result = BunBinaryValidator.validateDuoPlusBinaries();
    console.log(BunBinaryValidator.generateValidationReport(result));
    process.exit(result.valid ? 0 : 1);
  } else if (args[0] === 'system') {
    // System binary info
    console.log('=== System Binary Information ===');
    const info = await BunBinaryValidator.getSystemBinaryInfo();
    for (const [binary, { path, version }] of info) {
      console.log(`${binary}:`);
      console.log(`  Path: ${path}`);
      console.log(`  Version: ${version || 'Unknown'}`);
      console.log('');
    }
  } else if (args[0] === 'check' && args[1]) {
    // Check specific binary
    const available = BunBinaryValidator.isBinaryAvailable(args[1]);
    console.log(`${args[1]}: ${available ? '✅ Available' : '❌ Not found'}`);
    if (available) {
      const version = await BunBinaryValidator.getBinaryVersion(args[1]);
      if (version) {
        console.log(`Version: ${version}`);
      }
    }
  } else {
    // Check provided binaries
    const binaries = args;
    const result = BunBinaryValidator.validateBinaries(binaries);
    console.log(BunBinaryValidator.generateValidationReport(result));
    process.exit(result.valid ? 0 : 1);
  }
}
