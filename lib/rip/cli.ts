/**
 * FACTORYWAGER RIPGREP v4.0 - CLI Interface
 * 
 * Command-line interface for code analysis and transmutation
 */

import { createRipgrepEngine, type PurgeParams } from './index';

// ============================================================================
// CLI COMMANDS
// ============================================================================

class RipgrepCLI {
  private engine = createRipgrepEngine();

  /**
   * Show help information
   */
  showHelp(): void {
    console.log(`
🚀 FACTORYWAGER RIPGREP v4.0 CLI

USAGE:
  bun rip <command> [options]

COMMANDS:
  purge       Generate purge signature
  links       Scan for broken links
  nonbun      Scan for non-Bun code patterns
  config      Show current configuration
  help        Show this help message

OPTIONS:
  --scope     Set scope (FACTORY, LINK, CODE, BUN, PURGE, AI)
  --type      Set type (SCAN, VALIDATE, FIX, TRANSMUTE, OPTIMIZE, AGENT)
  --pattern   Search pattern
  --dry-run   Show what would be done without executing
  --auto      Auto-approve changes (use with caution)

EXAMPLES:
  bun rip purge --scope PURGE --pattern "deprecated code"
  bun rip links
  bun rip nonbun --scope CODE
  bun rip purge --dry-run --pattern "TODO.*fix"
`);
  }

  /**
   * Execute purge command
   */
  async purgeCommand(args: string[]): Promise<void> {
    const params = this.parseArgs(args);
    
    try {
      console.log('⚡ Generating RIPGREP purge...');
      const result = await this.engine.purgeRipgrep(params);
      
      console.log(`
📋 Purge Generated
═══════════════════════════════════════════════════════════════

ID: ${result.id}
Signature: ${result.signature}
Grepable: ${result.grepable}
Hash: ${result.contentHash}
Timestamp: ${new Date(result.timestamp).toISOString()}

Results:
${result.results.map(r => `  • ${r}`).join('\n')}

═══════════════════════════════════════════════════════════════
      `);
    } catch (error) {
      console.error('❌ Purge failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Scan for broken links
   */
  async linksCommand(args: string[]): Promise<void> {
    const directory = args[0] || '.';
    
    try {
      console.log(`🔍 Scanning for broken links in: ${directory}`);
      const links = await this.engine.scanBrokenLinks(directory);
      
      if (links.length === 0) {
        console.log('✅ No broken links found');
        return;
      }
      
      console.log(`
🔗 Broken Links Found (${links.length})
═══════════════════════════════════════════════════════════════

${links.map(link => `  • ${link}`).join('\n')}

═══════════════════════════════════════════════════════════════
      `);
    } catch (error) {
      console.error('❌ Link scan failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Scan for non-Bun code
   */
  async nonbunCommand(args: string[]): Promise<void> {
    const directory = args[0] || '.';
    
    try {
      console.log(`🔍 Scanning for non-Bun code in: ${directory}`);
      const nonBun = await this.engine.scanNonBunCode(directory);
      
      if (nonBun.length === 0) {
        console.log('✅ No non-Bun code patterns found');
        return;
      }
      
      console.log(`
⚠️  Non-Bun Code Found (${nonBun.length})
═══════════════════════════════════════════════════════════════

${nonBun.map(code => `  • ${code}`).join('\n')}

═══════════════════════════════════════════════════════════════
💡 Consider replacing with Bun equivalents:
   • fs.readFile → Bun.file
   • require → import
   • child_process → Bun.spawn
      `);
    } catch (error) {
      console.error('❌ Non-Bun scan failed:', error.message);
      process.exit(1);
    }
  }

  /**
   * Show configuration
   */
  configCommand(): void {
    const config = this.engine.getConfig();
    
    console.log(`
⚙️  RIPGREP Configuration
═══════════════════════════════════════════════════════════════

Schema:
  Scopes: ${config.schema.scope.join(', ')}
  Types:  ${config.schema.type.join(', ')}
  Hash:   ${config.schema.hash_algo}

Defaults:
  Scope:   ${config.defaults.scope}
  Type:    ${config.defaults.type}
  Version: ${config.defaults.version}
  Status:  ${config.defaults.status}

═══════════════════════════════════════════════════════════════
    `);
  }

  /**
   * Parse command line arguments
   */
  private parseArgs(args: string[]): PurgeParams {
    const params: PurgeParams = {};
    
    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      const next = args[i + 1];
      
      switch (arg) {
        case '--scope':
          if (next) params.scope = next;
          break;
        case '--type':
          if (next) params.type = next;
          break;
        case '--pattern':
          if (next) params.pattern = next;
          break;
        case '--dry-run':
          params.dryRun = true;
          break;
        case '--auto':
          params.autoApprove = true;
          break;
      }
    }
    
    return params;
  }

  /**
   * Main CLI entry point
   */
  async run(argv: string[]): Promise<void> {
    const [command, ...args] = argv;
    
    switch (command) {
      case 'purge':
        await this.purgeCommand(args);
        break;
      case 'links':
        await this.linksCommand(args);
        break;
      case 'nonbun':
        await this.nonbunCommand(args);
        break;
      case 'config':
        this.configCommand();
        break;
      case 'help':
      case '--help':
      case '-h':
        this.showHelp();
        break;
      default:
        if (!command) {
          this.showHelp();
        } else {
          console.error(`❌ Unknown command: ${command}`);
          console.log('Run "bun rip help" for available commands');
          process.exit(1);
        }
    }
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

/**
 * Run CLI if this file is executed directly
 */
if (import.meta.main) {
  const cli = new RipgrepCLI();
  const [, , ...argv] = process.argv;
  cli.run(argv).catch(error => {
    console.error('❌ CLI error:', error.message);
    process.exit(1);
  });
}

export default RipgrepCLI;
