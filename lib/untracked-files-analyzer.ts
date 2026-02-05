#!/usr/bin/env bun
/**
 * Comprehensive Untracked Files Analysis
 * 
 * Analyzes all untracked files in the repository to identify
 * important files that should be tracked, validate their content,
 * and provide recommendations for repository management.
 */

// Entry guard check
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

import { readFileSync, existsSync, statSync } from 'fs';
import { join } from 'path';

// ============================================================================
// UNTRACKED FILES ANALYZER
// ============================================================================

interface FileAnalysis {
  path: string;
  size: number;
  type: 'config' | 'documentation' | 'code' | 'data' | 'tool' | 'temp' | 'binary';
  priority: 'high' | 'medium' | 'low';
  recommendation: 'track' | 'ignore' | 'review' | 'cleanup';
  reason: string;
}

class UntrackedFilesAnalyzer {
  private static readonly IMPORTANT_PATTERNS = [
    { pattern: /\.md$/, type: 'documentation', priority: 'high' as const, reason: 'Documentation files should be tracked' },
    { pattern: /\.json$/, type: 'config', priority: 'medium' as const, reason: 'Configuration files may need tracking' },
    { pattern: /\.toml$/, type: 'config', priority: 'medium' as const, reason: 'Configuration files may need tracking' },
    { pattern: /\.ts$/, type: 'code', priority: 'high' as const, reason: 'TypeScript files should be tracked' },
    { pattern: /\.js$/, type: 'code', priority: 'high' as const, reason: 'JavaScript files should be tracked' },
    { pattern: /package\.json$/, type: 'config', priority: 'high' as const, reason: 'Package configuration should be tracked' },
    { pattern: /bunfig\.toml$/, type: 'config', priority: 'high' as const, reason: 'Bun configuration should be tracked' },
    { pattern: /tsconfig\.json$/, type: 'config', priority: 'high' as const, reason: 'TypeScript configuration should be tracked' },
    { pattern: /\.gitignore$/, type: 'config', priority: 'high' as const, reason: 'Git ignore should be tracked' },
    { pattern: /\.env\.example$/, type: 'config', priority: 'medium' as const, reason: 'Environment examples should be tracked' },
    { pattern: /README$/, type: 'documentation', priority: 'high' as const, reason: 'README files should be tracked' },
    { pattern: /\.sh$/, type: 'tool', priority: 'medium' as const, reason: 'Shell scripts may need tracking' },
    { pattern: /node_modules/, type: 'binary', priority: 'low' as const, reason: 'Dependencies should be ignored' },
    { pattern: /\.lock/, type: 'binary', priority: 'low' as const, reason: 'Lock files should be ignored' },
    { pattern: /\.DS_Store/, type: 'temp', priority: 'low' as const, reason: 'System files should be ignored' },
    { pattern: /\.log$/, type: 'temp', priority: 'low' as const, reason: 'Log files should be ignored' },
    { pattern: /\.tmp/, type: 'temp', priority: 'low' as const, reason: 'Temporary files should be ignored' },
    { pattern: /\.cache/, type: 'temp', priority: 'low' as const, reason: 'Cache files should be ignored' },
    { pattern: /\.bun-build/, type: 'temp', priority: 'low' as const, reason: 'Build artifacts should be ignored' }
  ];

  private static readonly HIGH_VALUE_DIRECTORIES = [
    'docs/', 'examples/', 'scripts/', 'tools/', 'config/', 'src/', 'lib/'
  ];

  private static readonly IGNORE_DIRECTORIES = [
    'node_modules/', '.git/', 'dist/', 'build/', '.cache/', '.tmp/', '.DS_Store'
  ];

  /**
   * Get all untracked files
   */
  static async getUntrackedFiles(): Promise<string[]> {
    const result = await Bun.$`git status --porcelain`.text();
    const lines = result.split('\n');
    
    return lines
      .filter(line => line.startsWith('??'))
      .map(line => line.substring(3).trim())
      .filter(path => !path.includes(' -> ')); // Filter out renames
  }

  /**
   * Analyze a single file
   */
  static analyzeFile(filePath: string): FileAnalysis {
    // Validate path to prevent traversal attacks
    if (filePath.includes('..') || filePath.startsWith('/') || filePath.includes('\\')) {
      return {
        path: filePath,
        size: 0,
        type: 'temp',
        priority: 'low',
        recommendation: 'ignore',
        reason: 'Invalid path - potential security risk'
      };
    }

    const fullPath = join(process.cwd(), filePath);
    
    // Check if file exists and get stats safely
    let stats;
    try {
      stats = statSync(fullPath);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return {
          path: filePath,
          size: 0,
          type: 'temp',
          priority: 'low',
          recommendation: 'ignore',
          reason: 'File does not exist'
        };
      }
      // Other errors (permissions, etc.)
      return {
        path: filePath,
        size: 0,
        type: 'temp',
        priority: 'low',
        recommendation: 'review',
        reason: `File access error: ${error.message}`
      };
    }

    const isDirectory = stats.isDirectory();

    // Determine file type and priority
    for (const { pattern, type, priority, reason } of this.IMPORTANT_PATTERNS) {
      if (pattern.test(filePath)) {
        let recommendation: 'track' | 'ignore' | 'review' | 'cleanup' = 'track';
        
        if (priority === 'low') {
          recommendation = 'ignore';
        } else if (type === 'config' && filePath.includes('.env')) {
          recommendation = 'ignore'; // Never track actual .env files
        } else if (isDirectory) {
          recommendation = 'review'; // Directories need review
        }

        return {
          path: filePath,
          size: stats.size,
          type,
          priority,
          recommendation,
          reason
        };
      }
    }

    // Check for high-value directories
    for (const dir of this.HIGH_VALUE_DIRECTORIES) {
      if (filePath.startsWith(dir)) {
        return {
          path: filePath,
          size: stats.size,
          type: isDirectory ? 'code' : 'code',
          priority: 'high',
          recommendation: 'track',
          reason: `File in important directory: ${dir}`
        };
      }
    }

    // Check for ignore directories
    for (const dir of this.IGNORE_DIRECTORIES) {
      if (filePath.includes(dir)) {
        return {
          path: filePath,
          size: stats.size,
          type: 'binary',
          priority: 'low',
          recommendation: 'ignore',
          reason: `File in ignored directory: ${dir}`
        };
      }
    }

    // Default analysis
    return {
      path: filePath,
      size: stats.size,
      type: isDirectory ? 'data' : 'data',
      priority: 'medium',
      recommendation: 'review',
      reason: 'Unknown file type - needs manual review'
    };
  }

  /**
   * Analyze all untracked files
   */
  static async analyzeAllFiles(): Promise<{
    total: number;
    byType: Record<string, number>;
    byPriority: Record<string, number>;
    byRecommendation: Record<string, number>;
    analyses: FileAnalysis[];
    highPriorityFiles: FileAnalysis[];
    largeFiles: FileAnalysis[];
  }> {
    const untrackedFiles = await this.getUntrackedFiles();
    
    console.log(`📊 Analyzing ${untrackedFiles.length} untracked files...`);
    
    const analyses: FileAnalysis[] = [];
    const byType: Record<string, number> = {};
    const byPriority: Record<string, number> = {};
    const byRecommendation: Record<string, number> = {};

    for (const filePath of untrackedFiles) {
      const analysis = this.analyzeFile(filePath);
      analyses.push(analysis);

      // Update counters
      byType[analysis.type] = (byType[analysis.type] || 0) + 1;
      byPriority[analysis.priority] = (byPriority[analysis.priority] || 0) + 1;
      byRecommendation[analysis.recommendation] = (byRecommendation[analysis.recommendation] || 0) + 1;
    }

    const highPriorityFiles = analyses.filter(f => f.priority === 'high');
    const largeFiles = analyses.filter(f => f.size > 1024 * 1024); // > 1MB

    return {
      total: untrackedFiles.length,
      byType,
      byPriority,
      byRecommendation,
      analyses,
      highPriorityFiles,
      largeFiles
    };
  }

  /**
   * Generate comprehensive report
   */
  static async generateReport(): Promise<void> {
    console.log('🔍 COMPREHENSIVE UNTRACKED FILES ANALYSIS');
    console.log('=' .repeat(60));

    const analysis = await this.analyzeAllFiles();

    console.log(`\n📈 ANALYSIS SUMMARY:`);
    console.log(`   Total untracked files: ${analysis.total}`);
    
    console.log('\n   By Type:');
    for (const [type, count] of Object.entries(analysis.byType)) {
      console.log(`      ${type}: ${count}`);
    }

    console.log('\n   By Priority:');
    for (const [priority, count] of Object.entries(analysis.byPriority)) {
      console.log(`      ${priority}: ${count}`);
    }

    console.log('\n   By Recommendation:');
    for (const [recommendation, count] of Object.entries(analysis.byRecommendation)) {
      console.log(`      ${recommendation}: ${count}`);
    }

    // High priority files
    if (analysis.highPriorityFiles.length > 0) {
      console.log('\n🚨 HIGH PRIORITY FILES (Should be tracked):');
      analysis.highPriorityFiles.forEach(file => {
        const sizeStr = file.size > 1024 * 1024 ? `${(file.size / 1024 / 1024).toFixed(1)}MB` : 
                        file.size > 1024 ? `${(file.size / 1024).toFixed(1)}KB` : `${file.size}B`;
        console.log(`   • ${file.path} (${sizeStr}) - ${file.reason}`);
      });
    }

    // Large files
    if (analysis.largeFiles.length > 0) {
      console.log('\n📦 LARGE FILES (>1MB):');
      analysis.largeFiles.forEach(file => {
        console.log(`   • ${file.path} (${(file.size / 1024 / 1024).toFixed(1)}MB) - ${file.recommendation}`);
      });
    }

    // Recommendations by category
    const trackFiles = analysis.analyses.filter(f => f.recommendation === 'track');
    const reviewFiles = analysis.analyses.filter(f => f.recommendation === 'review');
    const ignoreFiles = analysis.analyses.filter(f => f.recommendation === 'ignore');

    console.log('\n💡 RECOMMENDATIONS:');

    if (trackFiles.length > 0) {
      console.log(`\n   📂 FILES TO TRACK (${trackFiles.length}):`);
      trackFiles.slice(0, 10).forEach(file => {
        console.log(`      • ${file.path}`);
      });
      if (trackFiles.length > 10) {
        console.log(`      ... and ${trackFiles.length - 10} more`);
      }
      console.log(`      Command: git add ${trackFiles.slice(0, 5).map(f => `"${f.path}"`).join(' ')}`);
    }

    if (reviewFiles.length > 0) {
      console.log(`\n   🔍 FILES TO REVIEW (${reviewFiles.length}):`);
      reviewFiles.slice(0, 10).forEach(file => {
        console.log(`      • ${file.path} - ${file.reason}`);
      });
      if (reviewFiles.length > 10) {
        console.log(`      ... and ${reviewFiles.length - 10} more`);
      }
    }

    if (ignoreFiles.length > 0) {
      console.log(`\n   🚫 FILES TO IGNORE (${ignoreFiles.length}):`);
      console.log(`      These files should be added to .gitignore if not already present`);
      
      // Check if they're already in gitignore
      const gitignorePath = '.gitignore';
      let gitignoreContent = '';
      if (existsSync(gitignorePath)) {
        gitignoreContent = readFileSync(gitignorePath, 'utf-8');
      }

      const missingFromGitignore = ignoreFiles.filter(file => 
        !gitignoreContent.includes(file.path.split('/')[0])
      );

      if (missingFromGitignore.length > 0) {
        console.log('      Consider adding to .gitignore:');
        const uniqueDirs = [...new Set(missingFromGitignore.map(f => f.path.split('/')[0]))];
        uniqueDirs.forEach(dir => {
          console.log(`         ${dir}/`);
        });
      }
    }

    // Git commands
    console.log('\n🛠️  SUGGESTED GIT COMMANDS:');
    if (trackFiles.length > 0) {
      console.log(`   # Add important files`);
      console.log(`   git add ${trackFiles.slice(0, 3).map(f => `"${f.path}"`).join(' ')}`);
    }
    
    console.log(`   # Check status after adding files`);
    console.log(`   git status --porcelain | head -10`);

    console.log('\n' + '='.repeat(60));
  }
}

// ============================================================================
// EXPORTS
// ============================================================================

export { UntrackedFilesAnalyzer };

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  try {
    await UntrackedFilesAnalyzer.generateReport();
    console.log('\n✅ Untracked files analysis completed!');
  } catch (error) {
    console.error('\n❌ Analysis failed:', error);
    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
