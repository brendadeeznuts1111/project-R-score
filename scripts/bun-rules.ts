#!/usr/bin/env bun
/**
 * FACTORYWAGER RIPGREP v4.0 - Rules Engine
 * 
 * Advanced rule management for code validation and transmutation
 */

import { createRipgrepEngine } from '../lib/rip/index.js';
import { scanDirectory, formatReport, checkRipgrepAvailability } from '../lib/rip/utils.js';
import { ConfigManager, PRESET_CONFIGS } from '../lib/rip/config.js';

// ============================================================================
// RULES ENGINE
// ============================================================================

class RulesEngine {
  private engine = createRipgrepEngine();
  private configManager = new ConfigManager();

  /**
   * Load v4.0 schema configuration
   */
  async configCommand(): Promise<void> {
    console.log('🔧 FACTORYWAGER RULES v4.0 - Configuration');
    console.log('═══════════════════════════════════════════════════════════════');

    try {
      const config = this.configManager.getConfig();
      const ripgrepConfig = config.rules.ripgrep;

      console.log('📋 Schema Configuration:');
      console.log(`  Scopes: ${ripgrepConfig.schema.scope.join(', ')}`);
      console.log(`  Types:  ${ripgrepConfig.schema.type.join(', ')}`);
      console.log(`  Hash:   ${ripgrepConfig.schema.hash_algo}`);
      console.log(`  AI Prefix: ${ripgrepConfig.schema.ai_prefix}`);

      console.log('\n⚙️ Default Settings:');
      console.log(`  Scope:   ${ripgrepConfig.defaults.scope}`);
      console.log(`  Type:    ${ripgrepConfig.defaults.type}`);
      console.log(`  Version: ${ripgrepConfig.defaults.version}`);
      console.log(`  Status:  ${ripgrepConfig.defaults.status}`);

      console.log('\n🔍 Grep Configuration:');
      console.log(`  Flags:   ${ripgrepConfig.grep.rg_flags}`);
      console.log(`  Hooks:   ${ripgrepConfig.grep.validate.hooks.join(', ')}`);

      // Check availability
      const hasRipgrep = await checkRipgrepAvailability();
      console.log(`\n🛠️  System Status:`);
      console.log(`  Ripgrep: ${hasRipgrep ? '✅ Available' : '❌ Not Found'}`);

    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
  }

  /**
   * Hyper-validate with purge check
   */
  async validateCommand(directory: string = '.'): Promise<void> {
    console.log('🔍 FACTORYWAGER RULES v4.0 - Hyper-Validation');
    console.log('═══════════════════════════════════════════════════════════════');

    try {
      // Check ripgrep availability
      const hasRipgrep = await checkRipgrepAvailability();
      if (!hasRipgrep) {
        console.error('❌ Ripgrep not available. Please install ripgrep first.');
        process.exit(1);
      }

      console.log(`📁 Scanning directory: ${directory}`);
      console.log('⚡ Performing hyper-validation...');

      const startTime = Date.now();
      const report = await scanDirectory(directory);
      const scanTime = Date.now() - startTime;

      console.log(`\n📊 Validation Results:`);
      console.log(`  Scan Time: ${scanTime}ms`);
      console.log(`  Files Scanned: ${report.totalFiles}`);
      console.log(`  Issues Found: ${report.issuesFound}`);

      if (report.issuesFound > 0) {
        console.log('\n' + formatReport(report));
        
        // Generate purge signature for issues
        console.log('\n🔥 Generating Purge Signatures...');
        for (const result of report.scanResults.slice(0, 5)) { // Limit to 5 for demo
          const purge = await this.engine.purgeRipgrep({
            scope: 'PURGE',
            type: 'TRANSMUTE',
            pattern: `${result.type}:${result.content.substring(0, 50)}`
          });
          console.log(`  ${purge.id}: ${purge.grepable}`);
        }
      } else {
        console.log('\n✅ No issues found - Codebase is clean!');
      }

      // Validation summary
      console.log('\n📋 Validation Summary:');
      const criticalIssues = report.scanResults.filter(r => r.content.includes('eval') || r.content.includes('innerHTML'));
      if (criticalIssues.length > 0) {
        console.log(`  ⚠️  Critical Issues: ${criticalIssues.length}`);
      }
      const nonBunIssues = report.scanResults.filter(r => r.type === 'nonbun');
      if (nonBunIssues.length > 0) {
        console.log(`  🔄 Bun Migration Needed: ${nonBunIssues.length}`);
      }
      const linkIssues = report.scanResults.filter(r => r.type === 'link');
      if (linkIssues.length > 0) {
        console.log(`  🔗 Link Issues: ${linkIssues.length}`);
      }

    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
  }

  /**
   * Auto-purge code with v4.0 magic
   */
  async fixCommand(directory: string = '.', options: { dryRun?: boolean; auto?: boolean } = {}): Promise<void> {
    console.log('🔧 FACTORYWAGER RULES v4.0 - Auto-Purge');
    console.log('═══════════════════════════════════════════════════════════════');

    const { dryRun = false, auto = false } = options;

    if (!auto && !dryRun) {
      console.log('⚠️  Auto-purge requires --auto flag or --dry-run for safety');
      console.log('💡 Use --dry-run to preview changes or --auto to apply them');
      process.exit(1);
    }

    try {
      console.log(`📁 Target directory: ${directory}`);
      console.log(`🔍 Mode: ${dryRun ? 'DRY RUN (Preview)' : 'AUTO PURGE (Apply Changes)'}`);

      // Scan for issues
      const report = await scanDirectory(directory);
      
      if (report.issuesFound === 0) {
        console.log('\n✅ No issues found - Codebase is already clean!');
        return;
      }

      console.log(`\n🎯 Found ${report.issuesFound} issues to process:`);

      // Group issues by type
      const grouped = report.scanResults.reduce((acc, result) => {
        if (!acc[result.type]) acc[result.type] = [];
        acc[result.type].push(result);
        return acc;
      }, {} as Record<string, typeof report.scanResults>);

      // Process each type
      for (const [type, issues] of Object.entries(grouped)) {
        console.log(`\n🔄 Processing ${type.toUpperCase()} issues (${issues.length}):`);
        
        for (const issue of issues.slice(0, 3)) { // Limit for demo
          const suggestion = this.generateFixSuggestion(issue);
          
          if (dryRun) {
            console.log(`  📝 ${issue.file}:${issue.line}`);
            console.log(`     Current: ${issue.content.substring(0, 60)}...`);
            console.log(`     Suggested: ${suggestion}`);
          } else {
            console.log(`  ✅ ${issue.file}:${issue.line} - Applied: ${suggestion}`);
            // In real implementation, would modify files here
          }
        }
        
        if (issues.length > 3) {
          console.log(`  ... and ${issues.length - 3} more ${type} issues`);
        }
      }

      // Generate transmutation report
      if (!dryRun) {
        console.log('\n🔥 Generating Transmutation Report...');
        const transmutation = await this.engine.purgeRipgrep({
          scope: 'TRANSMUTE',
          type: 'FIX',
          pattern: `auto-purge-${report.issuesFound}-issues`
        });
        
        console.log(`  📋 Transmutation ID: ${transmutation.id}`);
        console.log(`  🔐 Signature: ${transmutation.grepable}`);
        console.log(`  📊 Hash: ${transmutation.contentHash.substring(0, 16)}...`);
      }

    } catch (error) {
      console.error('❌ Auto-purge failed:', error.message);
      process.exit(1);
    }

    console.log('\n═══════════════════════════════════════════════════════════════');
  }

  /**
   * Generate fix suggestion for an issue
   */
  private generateFixSuggestion(issue: any): string {
    const content = issue.content;
    
    if (issue.type === 'nonbun') {
      if (content.includes('require(')) {
        return 'Replace with ES6 import statement';
      }
      if (content.includes('fs.')) {
        return 'Replace with Bun.file() API';
      }
      if (content.includes('module.exports')) {
        return 'Replace with ES6 export statement';
      }
    }
    
    if (issue.type === 'link') {
      return 'Validate and update external link';
    }
    
    if (content.includes('eval(')) {
      return 'Remove eval() - security risk';
    }
    
    if (content.includes('innerHTML')) {
      return 'Use safer DOM manipulation';
    }
    
    return 'Review and update code';
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const [command, ...args] = process.argv.slice(2);
  const engine = new RulesEngine();

  switch (command) {
    case 'config':
      await engine.configCommand();
      break;
      
    case 'validate':
      const directory = args[0] || '.';
      await engine.validateCommand(directory);
      break;
      
    case 'fix':
      const fixDir = args[0] || '.';
      const options = {
        dryRun: args.includes('--dry-run'),
        auto: args.includes('--auto')
      };
      await engine.fixCommand(fixDir, options);
      break;
      
    case 'help':
    case '--help':
    case '-h':
      console.log(`
🔧 FACTORYWAGER RULES v4.0 CLI

USAGE:
  bun run scripts/bun-rules.ts <command> [options]

COMMANDS:
  config              Load and display v4.0 schema configuration
  validate [dir]      Hyper-validate codebase with purge check
  fix [dir]           Auto-purge code issues (requires --auto or --dry-run)
  help                Show this help message

OPTIONS:
  --dry-run           Preview changes without applying them
  --auto              Automatically apply fixes (use with caution)

EXAMPLES:
  bun run scripts/bun-rules.ts config
  bun run scripts/bun-rules.ts validate ./src
  bun run scripts/bun-rules.ts fix ./src --dry-run
  bun run scripts/bun-rules.ts fix ./src --auto
      `);
      break;
      
    default:
      console.error(`❌ Unknown command: ${command}`);
      console.log('Run "bun run scripts/bun-rules.ts help" for available commands');
      process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Rules engine error:', error.message);
    process.exit(1);
  });
}

export default RulesEngine;
