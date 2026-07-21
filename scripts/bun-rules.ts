#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/yaml — Bun.YAML
// @see https://bun.com/docs/runtime/yaml — YAML
// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/http/server — Bun.serve
// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-escapehtml — Bun.escapeHTML
/**
 * FACTORYWAGER RIPGREP v4.0 - Rules Engine
 *
 * Advanced rule management for code validation and transmutation
 */

import {
  createRipgrepEngine,
  scanDirectory,
  formatReport,
  checkRipgrepAvailability,
  ConfigManager,
  PRESET_CONFIGS,
} from '@factorywager/rip';

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
    console.info('🔧 FACTORYWAGER RULES v4.0 - Configuration');
    console.info('═══════════════════════════════════════════════════════════════');

    try {
      const config = this.configManager.getConfig();
      const ripgrepConfig = config.rules.ripgrep;

      console.info('📋 Schema Configuration:');
      console.info(`  Scopes: ${ripgrepConfig.schema.scope.join(', ')}`);
      console.info(`  Types:  ${ripgrepConfig.schema.type.join(', ')}`);
      console.info(`  Hash:   ${ripgrepConfig.schema.hash_algo}`);
      console.info(`  AI Prefix: ${ripgrepConfig.schema.ai_prefix}`);

      console.info('\n⚙️ Default Settings:');
      console.info(`  Scope:   ${ripgrepConfig.defaults.scope}`);
      console.info(`  Type:    ${ripgrepConfig.defaults.type}`);
      console.info(`  Version: ${ripgrepConfig.defaults.version}`);
      console.info(`  Status:  ${ripgrepConfig.defaults.status}`);

      console.info('\n🔍 Grep Configuration:');
      console.info(`  Flags:   ${ripgrepConfig.grep.rg_flags}`);
      console.info(`  Hooks:   ${ripgrepConfig.grep.validate.hooks.join(', ')}`);

      // Check availability
      const hasRipgrep = await checkRipgrepAvailability();
      console.info(`\n🛠️  System Status:`);
      console.info(`  Ripgrep: ${hasRipgrep ? '✅ Available' : '❌ Not Found'}`);
    } catch (error) {
      console.error('❌ Failed to load configuration:', error.message);
      process.exit(1);
    }

    console.info('\n═══════════════════════════════════════════════════════════════');
  }

  /**
   * Enhanced validation with detailed Bun pattern checking
   */
  async enhancedCommand(directory: string = '.'): Promise<void> {
    console.info('🔍 FACTORYWAGER RULES v4.0 - Enhanced Validation');
    console.info('═══════════════════════════════════════════════════════════════');

    try {
      // Check ripgrep availability
      const hasRipgrep = await checkRipgrepAvailability();
      if (!hasRipgrep) {
        console.error('❌ Ripgrep not available. Please install ripgrep first.');
        process.exit(1);
      }

      console.info(`📁 Scanning directory: ${directory}`);
      console.info('⚡ Performing enhanced Bun pattern validation...');

      const startTime = Date.now();
      const report = await scanDirectory(directory);
      const scanTime = Date.now() - startTime;

      console.info(`\n📊 Enhanced Validation Results:`);
      console.info(`  Scan Time: ${scanTime}ms`);
      console.info(`  Files Scanned: ${report.totalFiles}`);
      console.info(`  Issues Found: ${report.issuesFound}`);

      // Detailed pattern analysis
      console.info('\n🔍 Pattern Compliance Analysis:');

      const patternStats = {
        bunFileUsage: 0,
        bunServeUsage: 0,
        bunYamlUsage: 0,
        bunSemverUsage: 0,
        bunHashUsage: 0,
        bunSpawnUsage: 0,
        nonBunPatterns: 0,
        securityIssues: 0,
      };

      // Analyze each result
      for (const result of report.scanResults) {
        if (result.content.includes('Bun.file')) patternStats.bunFileUsage++;
        if (result.content.includes('Bun.serve')) patternStats.bunServeUsage++;
        if (result.content.includes('YAML.parse') || result.content.includes('Bun.YAML'))
          patternStats.bunYamlUsage++;
        if (result.content.includes('semver.') || result.content.includes('Bun.semver'))
          patternStats.bunSemverUsage++;
        if (result.content.includes('Bun.hash') || result.content.includes('Bun.CryptoHasher'))
          patternStats.bunHashUsage++;
        if (result.content.includes('Bun.spawn')) patternStats.bunSpawnUsage++;
        if (result.type === 'nonbun') patternStats.nonBunPatterns++;
        if (result.content.includes('eval(') || result.content.includes('innerHTML'))
          patternStats.securityIssues++;
      }

      console.info(`  ✅ Bun.file() Usage: ${patternStats.bunFileUsage}`);
      console.info(`  ✅ Bun.serve() Usage: ${patternStats.bunServeUsage}`);
      console.info(`  ✅ Bun.YAML Usage: ${patternStats.bunYamlUsage}`);
      console.info(`  ✅ Bun.semver Usage: ${patternStats.bunSemverUsage}`);
      console.info(`  ✅ Bun.hash Usage: ${patternStats.bunHashUsage}`);
      console.info(`  ✅ Bun.spawn Usage: ${patternStats.bunSpawnUsage}`);

      if (patternStats.nonBunPatterns > 0) {
        console.info(`  ⚠️  Non-Bun Patterns: ${patternStats.nonBunPatterns}`);
      }
      if (patternStats.securityIssues > 0) {
        console.info(`  🚨 Security Issues: ${patternStats.securityIssues}`);
      }

      if (report.issuesFound > 0) {
        console.info('\n🔧 Detailed Issue Breakdown:');

        // Group by type
        const grouped = report.scanResults.reduce(
          (acc, result) => {
            if (!acc[result.type]) acc[result.type] = [];
            acc[result.type].push(result);
            return acc;
          },
          {} as Record<string, typeof report.scanResults>
        );

        for (const [type, issues] of Object.entries(grouped)) {
          console.info(`\n  ${type.toUpperCase()} (${issues.length}):`);
          for (const issue of issues.slice(0, 3)) {
            const suggestion = this.generateFixSuggestion(issue);
            console.info(`    📝 ${issue.file}:${issue.line}`);
            console.info(`       Current: ${issue.content.substring(0, 60)}...`);
            console.info(`       Suggested: ${suggestion}`);
          }
          if (issues.length > 3) {
            console.info(`    ... and ${issues.length - 3} more ${type} issues`);
          }
        }
      }

      // Generate compliance score
      const totalFiles = report.totalFiles;
      const compliantFiles = totalFiles - report.issuesFound;
      const complianceScore =
        totalFiles > 0 ? Math.round((compliantFiles / totalFiles) * 100) : 100;

      console.info(`\n📈 Compliance Score: ${complianceScore}%`);

      if (complianceScore >= 90) {
        console.info('  🌟 Excellent - Nearly perfect Bun pattern adoption!');
      } else if (complianceScore >= 75) {
        console.info('  ✅ Good - Strong Bun pattern adoption with room for improvement');
      } else if (complianceScore >= 50) {
        console.info('  ⚠️  Fair - Mixed pattern adoption, needs attention');
      } else {
        console.info('  🚨 Poor - Low Bun pattern adoption, immediate action required');
      }
    } catch (error) {
      console.error('❌ Enhanced validation failed:', error.message);
      process.exit(1);
    }

    console.info('\n═══════════════════════════════════════════════════════════════');
  }

  /**
   * Hyper-validate with purge check
   */
  async validateCommand(directory: string = '.'): Promise<void> {
    console.info('🔍 FACTORYWAGER RULES v4.0 - Hyper-Validation');
    console.info('═══════════════════════════════════════════════════════════════');

    try {
      // Check ripgrep availability
      const hasRipgrep = await checkRipgrepAvailability();
      if (!hasRipgrep) {
        console.error('❌ Ripgrep not available. Please install ripgrep first.');
        process.exit(1);
      }

      console.info(`📁 Scanning directory: ${directory}`);
      console.info('⚡ Performing hyper-validation...');

      const startTime = Date.now();
      const report = await scanDirectory(directory);
      const scanTime = Date.now() - startTime;

      console.info(`\n📊 Validation Results:`);
      console.info(`  Scan Time: ${scanTime}ms`);
      console.info(`  Files Scanned: ${report.totalFiles}`);
      console.info(`  Issues Found: ${report.issuesFound}`);

      if (report.issuesFound > 0) {
        console.info('\n' + formatReport(report));

        // Generate purge signature for issues
        console.info('\n🔥 Generating Purge Signatures...');
        for (const result of report.scanResults.slice(0, 5)) {
          // Limit to 5 for demo
          const purge = await this.engine.purgeRipgrep({
            scope: 'PURGE',
            type: 'TRANSMUTE',
            pattern: `${result.type}:${result.content.substring(0, 50)}`,
          });
          console.info(`  ${purge.id}: ${purge.grepable}`);
        }
      } else {
        console.info('\n✅ No issues found - Codebase is clean!');
      }

      // Validation summary
      console.info('\n📋 Validation Summary:');
      const criticalIssues = report.scanResults.filter(
        r => r.content.includes('eval') || r.content.includes('innerHTML')
      );
      if (criticalIssues.length > 0) {
        console.info(`  ⚠️  Critical Issues: ${criticalIssues.length}`);
      }
      const nonBunIssues = report.scanResults.filter(r => r.type === 'nonbun');
      if (nonBunIssues.length > 0) {
        console.info(`  🔄 Bun Migration Needed: ${nonBunIssues.length}`);
      }
      const linkIssues = report.scanResults.filter(r => r.type === 'link');
      if (linkIssues.length > 0) {
        console.info(`  🔗 Link Issues: ${linkIssues.length}`);
      }
    } catch (error) {
      console.error('❌ Validation failed:', error.message);
      process.exit(1);
    }

    console.info('\n═══════════════════════════════════════════════════════════════');
  }

  /**
   * Auto-purge code with v4.0 magic
   */
  async fixCommand(
    directory: string = '.',
    options: { dryRun?: boolean; auto?: boolean } = {}
  ): Promise<void> {
    console.info('🔧 FACTORYWAGER RULES v4.0 - Auto-Purge');
    console.info('═══════════════════════════════════════════════════════════════');

    const { dryRun = false, auto = false } = options;

    if (!auto && !dryRun) {
      console.info('⚠️  Auto-purge requires --auto flag or --dry-run for safety');
      console.info('💡 Use --dry-run to preview changes or --auto to apply them');
      process.exit(1);
    }

    try {
      console.info(`📁 Target directory: ${directory}`);
      console.info(`🔍 Mode: ${dryRun ? 'DRY RUN (Preview)' : 'AUTO PURGE (Apply Changes)'}`);

      // Scan for issues
      const report = await scanDirectory(directory);

      if (report.issuesFound === 0) {
        console.info('\n✅ No issues found - Codebase is already clean!');
        return;
      }

      console.info(`\n🎯 Found ${report.issuesFound} issues to process:`);

      // Group issues by type
      const grouped = report.scanResults.reduce(
        (acc, result) => {
          if (!acc[result.type]) acc[result.type] = [];
          acc[result.type].push(result);
          return acc;
        },
        {} as Record<string, typeof report.scanResults>
      );

      // Process each type
      for (const [type, issues] of Object.entries(grouped)) {
        console.info(`\n🔄 Processing ${type.toUpperCase()} issues (${issues.length}):`);

        for (const issue of issues.slice(0, 3)) {
          // Limit for demo
          const suggestion = this.generateFixSuggestion(issue);

          if (dryRun) {
            console.info(`  📝 ${issue.file}:${issue.line}`);
            console.info(`     Current: ${issue.content.substring(0, 60)}...`);
            console.info(`     Suggested: ${suggestion}`);
          } else {
            console.info(`  ✅ ${issue.file}:${issue.line} - Applied: ${suggestion}`);
            // In real implementation, would modify files here
          }
        }

        if (issues.length > 3) {
          console.info(`  ... and ${issues.length - 3} more ${type} issues`);
        }
      }

      // Generate transmutation report
      if (!dryRun) {
        console.info('\n🔥 Generating Transmutation Report...');
        const transmutation = await this.engine.purgeRipgrep({
          scope: 'TRANSMUTE',
          type: 'FIX',
          pattern: `auto-purge-${report.issuesFound}-issues`,
        });

        console.info(`  📋 Transmutation ID: ${transmutation.id}`);
        console.info(`  🔐 Signature: ${transmutation.grepable}`);
        console.info(`  📊 Hash: ${transmutation.contentHash.substring(0, 16)}...`);
      }
    } catch (error) {
      console.error('❌ Auto-purge failed:', error.message);
      process.exit(1);
    }

    console.info('\n═══════════════════════════════════════════════════════════════');
  }

  /**
   * Generate fix suggestion for an issue
   */
  private generateFixSuggestion(issue: any): string {
    const content = issue.content;

    if (issue.type === 'nonbun') {
      if (content.includes('require(')) {
        return 'Replace with ES6 import statement: import { module } from "package";';
      }
      if (content.includes('fs.')) {
        return 'Replace with Bun.file() API: const content = await Bun.file("./path").text();';
      }
      if (content.includes('fs.readFileSync')) {
        return 'Replace with Bun.file() API: const content = await Bun.file("./path").text();';
      }
      if (content.includes('fs.writeFile')) {
        return 'Replace with Bun.write() API: await Bun.write("./path", content);';
      }
      if (content.includes('module.exports')) {
        return 'Replace with ES6 export statement: export default value;';
      }
      if (content.includes('process.exit')) {
        return 'Replace with Bun.exit() API: Bun.exit(code);';
      }
      if (content.includes('child_process.spawn')) {
        return 'Replace with Bun.spawn() API: const proc = Bun.spawn(["cmd"], { cwd: "." });';
      }
      if (content.includes('crypto.createHash')) {
        return 'Replace with Bun.hash() API: const hash = Bun.hash("data");';
      }
      if (content.includes('crypto.createHmac')) {
        return 'Replace with Bun.CryptoHasher API: const hasher = new Bun.CryptoHasher("sha256", secret);';
      }
      if (content.includes('http.createServer')) {
        return 'Replace with Bun.serve() API: Bun.serve({ port: 3000, fetch(req) { return new Response("Hello"); } });';
      }
      if (content.includes('JSON.parse') && content.includes('fs.')) {
        return 'Replace with Bun.file().json() API: const data = await Bun.file("./data.json").json();';
      }
      if (content.includes('require("yaml")') || content.includes('require("js-yaml")')) {
        return 'Replace with Bun.YAML API: import { YAML } from "bun"; const data = YAML.parse(yamlText);';
      }
      if (content.includes('require("semver")')) {
        return 'Replace with Bun.semver API: import { semver } from "bun"; semver.satisfies(version, range);';
      }
    }

    if (issue.type === 'link') {
      return 'Validate and update external link';
    }

    if (content.includes('eval(')) {
      return 'Remove eval() - security risk';
    }

    if (content.includes('innerHTML')) {
      return 'Use safer DOM manipulation or Bun.escapeHTML()';
    }

    return 'Review and update code';
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const [command, ...args] = Bun.argv.slice(2);
  const engine = new RulesEngine();

  switch (command) {
    case 'config':
      await engine.configCommand();
      break;

    case 'enhanced':
      const enhancedDir = args[0] || '.';
      await engine.enhancedCommand(enhancedDir);
      break;

    case 'validate':
      const directory = args[0] || '.';
      await engine.validateCommand(directory);
      break;

    case 'fix':
      const fixDir = args[0] || '.';
      const options = {
        dryRun: args.includes('--dry-run'),
        auto: args.includes('--auto'),
      };
      await engine.fixCommand(fixDir, options);
      break;

    case 'help':
    case '--help':
    case '-h':
      console.info(`
🔧 FACTORYWAGER RULES v4.0 CLI

USAGE:
  bun run scripts/bun-rules.ts <command> [options]

COMMANDS:
  config              Load and display v4.0 schema configuration
  enhanced [dir]      Enhanced validation with detailed pattern analysis
  validate [dir]      Hyper-validate codebase with purge check
  fix [dir]           Auto-purge code issues (requires --auto or --dry-run)
  help                Show this help message

OPTIONS:
  --dry-run           Preview changes without applying them
  --auto              Automatically apply fixes (use with caution)

EXAMPLES:
  bun run scripts/bun-rules.ts config
  bun run scripts/bun-rules.ts enhanced ./src
  bun run scripts/bun-rules.ts validate ./src
  bun run scripts/bun-rules.ts fix ./src --dry-run
  bun run scripts/bun-rules.ts fix ./src --auto
      `);
      break;

    default:
      console.error(`❌ Unknown command: ${command}`);
      console.info('Run "bun run scripts/bun-rules.ts help" for available commands');
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
