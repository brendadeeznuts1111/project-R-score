// lib/validation/platform-validator.ts — Platform validation CLI for tools, URLs, and constants

// Entry guard check
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

import {
  CLIToolValidator,
  URLValidator,
  ConstantValidator,
  ValidationReporter,
  AutoHealer,
} from './cli-constants-validation';

// Import documentation validator for integration
import { DocumentationValidator } from '../../packages/docs-tools/src/documentation-validator';

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface CLIOptions {
  heal: boolean;
  cli: boolean;
  urls: boolean;
  constants: boolean;
  docs: boolean;
  verbose: boolean;
  help: boolean;
}

function parseArgs(): CLIOptions {
  const args = process.argv.slice(2);

  return {
    heal: args.includes('--heal') || args.includes('-h'),
    cli: args.includes('--cli') || args.includes('-c'),
    urls: args.includes('--urls') || args.includes('-u'),
    constants: args.includes('--constants') || args.includes('-k'),
    docs: args.includes('--docs') || args.includes('-d'),
    verbose: args.includes('--verbose') || args.includes('-v'),
    help: args.includes('--help') || args.includes('--help'),
  };
}

// ============================================================================
// VALIDATION FUNCTIONS
// ============================================================================

async function validateCLI(): Promise<void> {
  console.log('\n🛠️  VALIDATING CLI TOOLS...');

  const tools = ['bun', 'overseer-cli'];
  const results = [];

  for (const tool of tools) {
    const result = await CLIToolValidator.validateTool(tool, [], process.env);
    results.push({ tool, ...result });

    if (result.isValid) {
      console.log(`   ✅ ${tool}: Valid`);
    } else {
      console.log(`   ❌ ${tool}: Invalid`);
      result.errors.forEach(error => console.log(`      Error: ${error}`));
      result.fixes.forEach(fix => console.log(`      Fix: ${fix}`));
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log(`      ⚠️  ${warning}`));
    }
  }
}

async function validateURLs(): Promise<void> {
  console.log('\n🌐 VALIDATING URLs...');

  const urls = ['bun-official-docs', 'github-api'];
  const results = [];

  for (const url of urls) {
    const result = await URLValidator.validateURL(url);
    results.push({ url, ...result });

    if (result.isValid) {
      const time = result.responseTime ? ` (${result.responseTime.toFixed(0)}ms)` : '';
      console.log(`   ✅ ${url}: Valid${time}`);
    } else {
      console.log(`   ❌ ${url}: Invalid`);
      result.errors.forEach(error => console.log(`      Error: ${error}`));
      result.fixes.forEach(fix => console.log(`      Fix: ${fix}`));
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log(`      ⚠️  ${warning}`));
    }
  }
}

function validateConstants(): void {
  console.log('\n📊 VALIDATING CONSTANTS...');

  const constants = [
    'default-timeout',
    'max-retries',
    'cli-categories-count',
    'utils-categories-count',
    'documentation-base-url',
  ];
  const results = [];

  for (const constant of constants) {
    const result = ConstantValidator.validateConstant(constant);
    results.push({ constant, ...result });

    if (result.isValid) {
      console.log(`   ✅ ${constant}: Valid`);
    } else {
      console.log(`   ❌ ${constant}: Invalid`);
      result.errors.forEach(error => console.log(`      Error: ${error}`));
      result.fixes.forEach(fix => console.log(`      Fix: ${fix}`));
    }

    if (result.warnings.length > 0) {
      result.warnings.forEach(warning => console.log(`      ⚠️  ${warning}`));
    }
  }
}

async function validateDocumentation(): Promise<void> {
  console.log('\n📚 VALIDATING DOCUMENTATION...');

  try {
    await DocumentationValidator.generateDocumentationReport();
  } catch (error) {
    console.log(`   ❌ Documentation validation failed: ${error}`);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function showHelp(): void {
  console.log(`
🔍 Platform Validation CLI Tool

USAGE:
  bun run lib/platform-validator.ts [OPTIONS]

OPTIONS:
  --heal, -h        Auto-fix detected issues
  --cli, -c         Validate CLI tools only
  --urls, -u        Validate URLs only
  --constants, -k   Validate constants only
  --docs, -d        Validate documentation URLs and constants
  --verbose, -v     Show detailed output
  --help            Show this help message

EXAMPLES:
  bun run lib/platform-validator.ts              # Full validation report
  bun run lib/platform-validator.ts --heal       # Auto-fix issues
  bun run lib/platform-validator.ts --cli        # CLI tools only
  bun run lib/platform-validator.ts --urls       # URLs only
  bun run lib/platform-validator.ts --constants  # Constants only
  bun run lib/platform-validator.ts --docs       # Documentation only

VALIDATION CATEGORIES:
  🛠️  CLI Tools      - Validates binary availability and environment
  🌐 URLs           - Tests connectivity and protocol compliance
  📊 Constants      - Checks type safety and required values
  📚 Documentation  - Validates all documentation URLs and constants

AUTO-HEALING:
  The --heal flag attempts to automatically fix common issues:
    • Add missing CLI arguments
    • Set default environment variables
    • Fix URL protocols and formatting
    • Apply constant value corrections
    • Validate documentation links

DOCUMENTATION VALIDATION:
  The --docs flag provides specialized validation for:
    • CLI documentation URLs (installation, commands, options, debugging)
    • Utils documentation URLs (file system, networking, process, etc.)
    • Documentation-related constants and counts
`);
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('🔍 PLATFORM VALIDATION TOOL');
  console.log('='.repeat(50));

  try {
    // Run validation based on options
    if (options.cli || (!options.urls && !options.constants && !options.docs)) {
      await validateCLI();
    }

    if (options.urls || (!options.cli && !options.constants && !options.docs)) {
      await validateURLs();
    }

    if (options.constants || (!options.cli && !options.urls && !options.docs)) {
      validateConstants();
    }

    if (options.docs) {
      await validateDocumentation();
    }

    // Auto-heal if requested
    if (options.heal) {
      await AutoHealer.healAndReport();
    }

    // Show comprehensive report if no specific category was selected
    if (!options.cli && !options.urls && !options.constants && !options.docs) {
      await ValidationReporter.printReport();
    }

    console.log('\n✅ Validation completed!');
  } catch (error) {
    console.error('\n❌ Validation failed:', error);

    if (options.verbose) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    process.exit(1);
  }
}

// Run main function
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
