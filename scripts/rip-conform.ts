#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * FACTORYWAGER RIPGREP v4.0 - Ripgrep Conform Script
 *
 * Advanced purge rule generation with signature management
 */

import { createRipgrepEngine } from '@factorywager/rip';

// ============================================================================
// RIPGREP CONFORM ENGINE
// ============================================================================

class RipgrepConform {
  private engine = createRipgrepEngine();

  /**
   * Generate new purge rule with signature
   */
  async generatePurgeRule(
    options: {
      scope?: string;
      type?: string;
      pattern?: string;
      description?: string;
    } = {}
  ) {
    const {
      scope = 'PURGE',
      type = 'TRANS',
      pattern = '',
      description = 'Auto-generated purge rule',
    } = options;

    console.info('⚡ FACTORYWAGER RIPGREP v4.0 - Conform Engine');
    console.info('═══════════════════════════════════════════════════════════════');

    try {
      console.info(`🔥 Generating Purge Rule...`);
      console.info(`   Scope: ${scope}`);
      console.info(`   Type: ${type}`);
      console.info(`   Pattern: ${pattern}`);
      console.info(`   Description: ${description}`);

      // Generate purge signature
      const purge = await this.engine.purgeRipgrep({
        scope,
        type,
        pattern,
      });

      console.info(`\n📋 Purge Rule Generated:`);
      console.info(`   ID: ${purge.id}`);
      console.info(`   Signature: ${purge.signature}`);
      console.info(`   Grepable: ${purge.grepable}`);
      console.info(`   Hash: ${purge.contentHash}`);
      console.info(`   Timestamp: ${new Date(purge.timestamp).toISOString()}`);

      // Generate rule file content
      const ruleContent = this.generateRuleFile(purge, pattern, description);

      console.info(`\n📄 Rule File Content:`);
      console.info('```yaml');
      console.info(ruleContent);
      console.info('```');

      // Save rule file
      const ruleFileName = `rule-${purge.id.toLowerCase()}.yaml`;
      await Bun.write(`./rules/${ruleFileName}`, ruleContent);

      console.info(`\n💾 Rule saved to: ./rules/${ruleFileName}`);

      // Generate grep command
      const grepCommand = `rg --type js --type ts --type jsx --type tsx "${pattern}" .`;
      console.info(`\n🔍 Grep Command:`);
      console.info(`   ${grepCommand}`);

      return purge;
    } catch (error) {
      console.error('❌ Failed to generate purge rule:', error.message);
      process.exit(1);
    }
  }

  /**
   * Generate rule file content
   */
  private generateRuleFile(purge: any, pattern: string, description: string): string {
    return `# FACTORYWAGER RIPGREP v4.0 - Purge Rule
# Generated: ${new Date(purge.timestamp).toISOString()}
# ID: ${purge.id}
# Hash: ${purge.contentHash}

rule:
  id: ${purge.id}
  signature: "${purge.signature}"
  grepable: "${purge.grepable}"

metadata:
  scope: ${purge.signature.match(/\[(\w+)\]/)?.[1] || 'PURGE'}
  type: ${purge.signature.match(/\[(\w+)\]/)?.[2] || 'TRANS'}
  version: v4.0
  status: ACTIVE
  pattern: "${pattern}"
  description: "${description}"

config:
  severity: medium
  auto_fix: false
  requires_review: true

validation:
  hooks:
    - pattern-match
    - security-scan
    - performance-check

actions:
  on_match:
    - log: "Purge rule ${purge.id} matched"
    - tag: "purge-${purge.id.toLowerCase()}"
    - suggest: "Review and update code pattern"

  on_fix:
    - generate: "transmutation-suggestion"
    - validate: "post-fix-validation"
`;
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

async function main() {
  const args = process.argv.slice(2);
  const conform = new RipgrepConform();

  // Parse command line arguments
  const options: any = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    const next = args[i + 1];

    switch (arg) {
      case '--scope':
        if (next) options.scope = next;
        break;
      case '--type':
        if (next) options.type = next;
        break;
      case '--pattern':
        if (next) options.pattern = next;
        break;
      case '--description':
        if (next) options.description = next;
        break;
      case '--help':
      case '-h':
        console.info(`
⚡ FACTORYWAGER RIPGREP v4.0 - Conform Engine

USAGE:
  bun run scripts/rip-conform.js [options]

OPTIONS:
  --scope <value>        Set scope (FACTORY, LINK, CODE, BUN, PURGE, AI)
  --type <value>         Set type (SCAN, VALIDATE, FIX, TRANSMUTE, OPTIMIZE, AGENT)
  --pattern <value>      Search pattern for the rule
  --description <value>  Rule description
  --help, -h             Show this help message

EXAMPLES:
  # Generate purge rule for non-Bun patterns
  bun run scripts/rip-conform.js --scope PURGE --type TRANS --pattern "fs\\."

  # Generate security rule
  bun run scripts/rip-conform.js --scope SECURITY --type VALIDATE --pattern "eval\\("

  # Generate performance rule
  bun run scripts/rip-conform.js --scope PERFORMANCE --type OPTIMIZE --pattern "for.*in"
        `);
        process.exit(0);
    }
  }

  if (!options.pattern) {
    console.error('❌ --pattern is required');
    console.info('Use --help for usage information');
    process.exit(1);
  }

  // Ensure rules directory exists
  const { spawn } = await import('bun');
  try {
    await spawn(['mkdir', '-p', './rules'], {
      stdout: 'ignore',
      stderr: 'ignore',
    });
  } catch (error) {
    // Directory creation failed, continue anyway
  }

  // Generate purge rule
  await conform.generatePurgeRule(options);
}

// Run if executed directly
if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Conform engine error:', error.message);
    process.exit(1);
  });
}

export default RipgrepConform;
