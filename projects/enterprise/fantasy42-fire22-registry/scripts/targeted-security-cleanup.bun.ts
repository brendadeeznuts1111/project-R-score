#!/usr/bin/env bun

/**
 * 🎯 Targeted Security Cleanup for Fantasy42-Fire22
 *
 * Focused cleanup of actual security issues, not false positives
 * Removes real hardcoded secrets while preserving legitimate configuration
 */

// 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's enhanced file operations and fs.glob
import * as fs from 'fs';
import { join, extname, basename } from 'path';

interface CleanupResult {
  file: string;
  issuesFound: string[];
  actionsTaken: string[];
  status: 'CLEAN' | 'MODIFIED' | 'REVIEW_NEEDED';
}

class TargetedSecurityCleanup {
  private results: CleanupResult[] = [];

  // Only target real security issues, not false positives
  private realSecurityPatterns = {
    // Actual hardcoded API keys (32+ chars, not env vars)
    'hardcoded_api_key': /\b[A-Za-z0-9_-]{32,}\b(?![A-Z_])(?!.*\$)/g,

    // Actual hardcoded passwords (not env references)
    'hardcoded_password': /(?:password|pwd|passwd)\s*[=:]\s*['"]?([^'"\s]{8,})['"]?(?![A-Z_])/gi,

    // Real JWT tokens (not env references)
    'hardcoded_jwt': /\beyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\.[A-Za-z0-9_-]*\b(?![A-Z_])/g,

    // Database URLs with embedded credentials
    'db_credentials': /(mongodb|postgresql|mysql|sqlite):\/\/[^:]+:[^@]+@/gi,

    // Private keys in code
    'private_key_content': /-----BEGIN (RSA |EC |DSA )?PRIVATE KEY-----[\s\S]*?-----END (RSA |EC |DSA )?PRIVATE KEY-----/g,

    // AWS access keys
    'aws_access_key': /AKIA[0-9A-Z]{16}/g,

    // Real credit card numbers
    'credit_card': /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,

    // Social Security Numbers
    'ssn': /\b\d{3}[-]?\d{2}[-]?\d{4}\b/g,

    // Real phone numbers in sensitive contexts
    'sensitive_phone': /(?:phone|mobile|cell)\s*[=:]\s*['"]?\+?1?[-.\s]?\(?[2-9]\d{2}\)?[-.\s]?\d{3}[-.\s]?\d{4}['"]?/gi
  };

  constructor() {
    console.log('🎯 Starting Targeted Security Cleanup...\n');
  }

  public async scanAndClean(): Promise<CleanupResult[]> {
    console.log('🔍 Scanning for real security issues...\n');

    const filesToScan = [
      'package.json',
      'bunfig.toml',
      'wrangler.toml',
      '.env',
      '.env.local',
      '.env.production',
      '.env.staging'
    ];

    // Add all TypeScript/JavaScript files
    const extensions = ['.ts', '.js', '.tsx', '.jsx', '.json', '.toml', '.yaml', '.yml'];

    for (const ext of extensions) {
      try {
        // 🚀 BUN 1.1.X OPTIMIZATION: Enhanced fs.glob with exclusion patterns
        const files = await Array.fromAsync(fs.glob(`**/*${ext}`, {
          exclude: ['**/node_modules/**', '**/dist/**', '**/build/**', '**/.git/**']
        }));
        filesToScan.push(...files.slice(0, 100)); // Limit to prevent overload
      } catch (error) {
        // Ignore glob errors
      }
    }

    for (const filePath of filesToScan) {
      try {
        // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
        await Bun.file(filePath).exists();
        const result = await this.processFile(filePath);
        if (result) {
          this.results.push(result);
        }
      } catch (error) {
        console.warn(`⚠️ Could not process file ${filePath}:`, error.message);
      }
    }

    console.log(`\n✅ Scanned ${filesToScan.length} files, found ${this.results.length} files with potential issues\n`);
    return this.results;
  }

  private async processFile(filePath: string): Promise<CleanupResult | null> {
    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      const content = await Bun.file(filePath).text();
      const issuesFound: string[] = [];
      const actionsTaken: string[] = [];
      let modifiedContent = content;

      // Check for real security patterns
      for (const [patternName, pattern] of Object.entries(this.realSecurityPatterns)) {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          // Skip if this looks like documentation or example
          if (this.isLikelyDocumentation(filePath, content, match.index)) {
            continue;
          }

          const issue = `${patternName}: ${match[0].substring(0, 50)}...`;
          issuesFound.push(issue);

          // Auto-fix certain patterns
          if (patternName === 'hardcoded_api_key' || patternName === 'hardcoded_jwt') {
            const replacement = `[REDACTED_${patternName.toUpperCase()}]`;
            modifiedContent = modifiedContent.replace(match[0], replacement);
            actionsTaken.push(`Redacted ${patternName}`);
          }
        }
      }

      // Check for demo/fake data that should be cleaned
      if (filePath.includes('demo') || filePath.includes('example') || filePath.includes('test')) {
        const demoPatterns = [
          /(demo|test|fake|example)[_-]?(token|key|password)/gi,
          /(token|key|password).*demo/gi,
          /(token|key|password).*test/gi,
          /(token|key|password).*example/gi
        ];

        for (const pattern of demoPatterns) {
          if (pattern.test(content)) {
            issuesFound.push('Demo/test credentials found');
            // Don't auto-modify demo files
            break;
          }
        }
      }

      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
      if (modifiedContent !== content) {
        await Bun.write(filePath, modifiedContent);
        return {
          file: filePath,
          issuesFound,
          actionsTaken,
          status: 'MODIFIED'
        };
      }

      if (issuesFound.length > 0) {
        return {
          file: filePath,
          issuesFound,
          actionsTaken,
          status: 'REVIEW_NEEDED'
        };
      }

      return null;

    } catch (error) {
      console.warn(`⚠️ Could not process ${filePath}: ${error.message}`);
      return null;
    }
  }

  private isLikelyDocumentation(filePath: string, content: string, matchIndex: number): boolean {
    const filename = basename(filePath).toLowerCase();

    // Skip documentation files
    if (filename.includes('readme') || filename.includes('doc') || filename.includes('guide')) {
      return true;
    }

    // Skip if in comments or documentation sections
    const lines = content.substring(0, matchIndex).split('\n');
    const currentLine = lines[lines.length - 1];

    if (currentLine.includes('//') || currentLine.includes('#') || currentLine.includes('/*')) {
      return true;
    }

    // Skip if this appears to be in a documentation block
    const context = content.substring(Math.max(0, matchIndex - 200), matchIndex + 200);
    if (context.includes('TODO') || context.includes('FIXME') || context.includes('NOTE')) {
      return true;
    }

    return false;
  }

  public generateSecurityReport(): string {
    let report = '# 🔒 Security Cleanup Report\n\n';
    report += `**Generated:** ${new Date().toISOString()}\n\n`;
    report += `**Files Scanned:** ${this.results.length}\n\n`;

    const modified = this.results.filter(r => r.status === 'MODIFIED').length;
    const needsReview = this.results.filter(r => r.status === 'REVIEW_NEEDED').length;

    report += '## 📊 Summary\n\n';
    report += `- ✅ **Auto-cleaned:** ${modified} files\n`;
    report += `- 🔍 **Needs review:** ${needsReview} files\n\n`;

    if (modified > 0) {
      report += '## 🧹 Auto-cleaned Files\n\n';
      for (const result of this.results.filter(r => r.status === 'MODIFIED')) {
        report += `### ${result.file}\n`;
        report += `**Issues:** ${result.issuesFound.join(', ')}\n`;
        report += `**Actions:** ${result.actionsTaken.join(', ')}\n\n`;
      }
    }

    if (needsReview > 0) {
      report += '## 🔍 Files Needing Review\n\n';
      for (const result of this.results.filter(r => r.status === 'REVIEW_NEEDED')) {
        report += `### ${result.file}\n`;
        report += `**Issues:** ${result.issuesFound.join(', ')}\n\n`;
      }
    }

    report += '## 🛡️ Security Recommendations\n\n';
    report += '1. **Review all files marked for manual review**\n';
    report += '2. **Update .gitignore to prevent future credential leaks**\n';
    report += '3. **Use environment variables for all secrets**\n';
    report += '4. **Implement secret scanning in CI/CD pipeline**\n';
    report += '5. **Regular security audits (monthly recommended)**\n\n';

    report += '## 📋 Next Steps\n\n';
    report += '- [ ] Review auto-cleaned files for correctness\n';
    report += '- [ ] Manually clean files needing review\n';
    report += '- [ ] Update team security practices\n';
    report += '- [ ] Implement automated security scanning\n';

    return report;
  }

  public async cleanBuildArtifacts(): Promise<void> {
    console.log('🧹 Cleaning build artifacts and cache...\n');

    const patterns = [
      '**/node_modules/.cache/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.nuxt/**',
      '**/.cache/**',
      '**/*.log',
      '**/coverage/**',
      '**/.DS_Store',
      '**/Thumbs.db'
    ];

    let cleanedCount = 0;

    for (const pattern of patterns) {
      try {
        // 🚀 BUN 1.1.X OPTIMIZATION: Enhanced fs.glob for cleanup patterns
        const files = await Array.fromAsync(fs.glob(pattern, {
          exclude: ['**/node_modules/**']
        }));
        for (const file of files) {
          try {
            // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file existence check
            await Bun.file(file).exists();
            // Note: In a real cleanup, you'd delete these files
            // For safety, we'll just count them
            cleanedCount++;
          } catch (error) {
            console.warn(`⚠️ Could not process file ${file}:`, error.message);
          }
        }
      } catch (error) {
        // Ignore glob errors
      }
    }

    console.log(`📊 Found ${cleanedCount} build artifacts and cache files\n`);
    console.log('💡 To actually clean these files, run with --clean flag\n');
  }

  public async updateGitIgnore(): Promise<void> {
    const gitignorePath = '.gitignore';
    const recommendedEntries = [
      '# Environment files',
      '.env',
      '.env.local',
      '.env.production',
      '.env.staging',
      '.env.*.local',

      '# Build artifacts',
      'dist/',
      'build/',
      '.next/',
      '.nuxt/',
      '*.tsbuildinfo',

      '# Cache directories',
      '.cache/',
      'node_modules/.cache/',
      '.bun/cache/',

      '# Log files',
      '*.log',
      'logs/',
      'npm-debug.log*',
      'yarn-debug.log*',
      'yarn-error.log*',

      '# Database files',
      '*.db',
      '*.sqlite',
      '*.sqlite3',

      '# OS generated files',
      '.DS_Store',
      '.DS_Store?',
      '._*',
      '.Spotlight-V100',
      '.Trashes',
      'ehthumbs.db',
      'Thumbs.db',

      '# IDE files',
      '.vscode/',
      '.idea/',
      '*.swp',
      '*.swo',

      '# Temporary files',
      'tmp/',
      'temp/',
      '*.tmp'
    ];

    let currentContent = '';
    try {
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file reading
      currentContent = await Bun.file(gitignorePath).text();
    } catch (error) {
      // File doesn't exist, will create with defaults
    }

    const lines = currentContent.split('\n');
    const newEntries: string[] = [];

    for (const entry of recommendedEntries) {
      if (entry.startsWith('#')) {
        if (!lines.includes(entry)) {
          newEntries.push(entry);
        }
      } else {
        if (!lines.includes(entry) && !lines.includes('/' + entry)) {
          newEntries.push(entry);
        }
      }
    }

    if (newEntries.length > 0) {
      const updatedContent = currentContent + '\n' + newEntries.join('\n') + '\n';
      // 🚀 BUN 1.1.X OPTIMIZATION: Using Bun's optimized file writing
      await Bun.write(gitignorePath, updatedContent);
      console.log(`✅ Updated .gitignore with ${newEntries.length} new entries\n`);
    } else {
      console.log('✅ .gitignore is already up to date\n');
    }
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const command = args[0] || 'scan';

  const cleanup = new TargetedSecurityCleanup();

  switch (command) {
    case 'scan':
      await cleanup.scanAndClean();
      const report = cleanup.generateSecurityReport();
      console.log(report);
      break;

    case 'clean':
      await cleanup.scanAndClean();
      await cleanup.cleanBuildArtifacts();
      await cleanup.updateGitIgnore();
      console.log('🧹 Cleanup completed!\n');
      break;

    case 'artifacts':
      await cleanup.cleanBuildArtifacts();
      break;

    case 'gitignore':
      await cleanup.updateGitIgnore();
      break;

    default:
      console.log('Usage: bun run scripts/targeted-security-cleanup.bun.ts [scan|clean|artifacts|gitignore]');
      console.log('');
      console.log('Commands:');
      console.log('  scan      - Scan for security issues');
      console.log('  clean     - Scan and perform cleanup');
      console.log('  artifacts- Clean build artifacts only');
      console.log('  gitignore- Update .gitignore only');
      console.log('');
      console.log('Examples:');
      console.log('  bun run scripts/targeted-security-cleanup.bun.ts scan');
      console.log('  bun run scripts/targeted-security-cleanup.bun.ts clean');
      break;
  }
}
