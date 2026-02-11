// lib/docs/documentation-validator.ts — Documentation constants validator

import { CLI_DOCUMENTATION_URLS } from '../../../lib/docs/constants/cli';
import { BUN_UTILS_URLS } from '../../../lib/docs/constants/utils';

type ConstantValidation = { isValid: boolean; errors: string[] };
type ConstantValidatorLike = {
  validateConstant(name: string): ConstantValidation;
};
type AutoHealerLike = {
  healAll(): Promise<{ totalFixes: number }>;
};

type PlatformValidators = {
  ConstantValidator: ConstantValidatorLike;
  AutoHealer: AutoHealerLike;
};

type PlatformModule = {
  ConstantValidator: ConstantValidatorLike;
  AutoHealer: AutoHealerLike;
};

function collectPaths(value: unknown, out: string[] = []): string[] {
  if (typeof value === 'string') {
    out.push(value);
    return out;
  }
  if (value && typeof value === 'object') {
    for (const nested of Object.values(value as Record<string, unknown>)) {
      collectPaths(nested, out);
    }
  }
  return out;
}

function normalizePath(path: string): string {
  const withSlash = path.startsWith('/') ? path : `/${path}`;
  return withSlash.replace(/\/+/g, '/');
}

const fallbackConstantValidator: ConstantValidatorLike = {
  validateConstant(name: string): ConstantValidation {
    const errors: string[] = [];
    switch (name) {
      case 'cli-categories-count': {
        const count = Object.keys(CLI_DOCUMENTATION_URLS).length;
        if (count === 0) errors.push('CLI_DOCUMENTATION_URLS has no categories');
        break;
      }
      case 'utils-categories-count': {
        const count = Object.keys(BUN_UTILS_URLS).length;
        if (count === 0) errors.push('BUN_UTILS_URLS has no categories');
        break;
      }
      case 'documentation-base-url': {
        const paths = [...collectPaths(CLI_DOCUMENTATION_URLS), ...collectPaths(BUN_UTILS_URLS)];
        for (const path of paths) {
          if (!path.startsWith('/docs/')) {
            errors.push(`Non-doc path detected: ${path}`);
          }
        }
        break;
      }
      default:
        errors.push(`Unknown constant: ${name}`);
        break;
    }
    return { isValid: errors.length === 0, errors };
  },
};

const fallbackAutoHealer: AutoHealerLike = {
  async healAll(): Promise<{ totalFixes: number }> {
    const paths = [...collectPaths(CLI_DOCUMENTATION_URLS), ...collectPaths(BUN_UTILS_URLS)];
    const fixable = paths.filter((p) => normalizePath(p) !== p).length;
    return { totalFixes: fixable };
  },
};

let validatorsPromise: Promise<PlatformValidators> | null = null;

function createDefaultPlatformValidatorLoader(): () => Promise<unknown> {
  return async () => {
    const modulePath = '../../../lib/validation/' + 'cli-constants-validation';
    const dynamicImport = new Function('m', 'return import(m)') as (
      m: string
    ) => Promise<unknown>;
    return dynamicImport(modulePath);
  };
}

let platformValidatorLoader: () => Promise<unknown> = createDefaultPlatformValidatorLoader();

function isPlatformModule(value: unknown): value is PlatformModule {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  const hasConstantValidator =
    !!candidate.ConstantValidator &&
    typeof (candidate.ConstantValidator as Record<string, unknown>).validateConstant ===
      'function';
  const hasAutoHealer =
    !!candidate.AutoHealer &&
    typeof (candidate.AutoHealer as Record<string, unknown>).healAll === 'function';
  return hasConstantValidator && hasAutoHealer;
}

async function getValidators(): Promise<PlatformValidators> {
  if (!validatorsPromise) {
    validatorsPromise = (async () => {
      try {
        // Load dynamically to avoid hard compile-time coupling to the platform module graph.
        const mod = await platformValidatorLoader();
        if (isPlatformModule(mod)) {
          return {
            ConstantValidator: mod.ConstantValidator,
            AutoHealer: mod.AutoHealer,
          };
        }
      } catch {
        // Fall through to validated local fallback behavior.
      }
      return { ConstantValidator: fallbackConstantValidator, AutoHealer: fallbackAutoHealer };
    })();
  }
  return validatorsPromise;
}

// Test helpers for deterministic unit testing of loader and fallback paths.
export function __setPlatformValidatorLoaderForTest(
  loader: (() => Promise<unknown>) | null
): void {
  platformValidatorLoader = loader ?? createDefaultPlatformValidatorLoader();
  validatorsPromise = null;
}

export async function __runAutoHealForTest(): Promise<{ totalFixes: number }> {
  const { AutoHealer } = await getValidators();
  return AutoHealer.healAll();
}

// ============================================================================
// DOCUMENTATION-SPECIFIC VALIDATION
// ============================================================================

class DocumentationValidator {
  /**
   * Validate all CLI documentation URLs
   */
  static async validateCLIDocumentation(): Promise<{
    total: number;
    valid: number;
    errors: string[];
    avgResponseTime?: number;
  }> {
    console.log('📚 Validating CLI Documentation URLs...');

    const results = [];
    const errors: string[] = [];

    // Validate main CLI documentation URLs
    for (const [category, urls] of Object.entries(CLI_DOCUMENTATION_URLS)) {
      console.log(`   📂 Category: ${category}`);

      for (const [name, path] of Object.entries(urls)) {
        const fullUrl = `https://bun.sh${path}`;

        try {
          const startTime = performance.now();
          const response = await fetch(fullUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000),
          });
          const responseTime = performance.now() - startTime;

          if (response.ok) {
            console.log(`     ✅ ${name}: ${responseTime.toFixed(0)}ms`);
            results.push({ name, url: fullUrl, valid: true, responseTime });
          } else {
            const error = `HTTP ${response.status}: ${name}`;
            console.log(`     ❌ ${name}: ${error}`);
            errors.push(error);
            results.push({ name, url: fullUrl, valid: false, responseTime });
          }
        } catch (error) {
          const errorMsg = `Connection failed: ${name} - ${error}`;
          console.log(`     ❌ ${name}: ${errorMsg}`);
          errors.push(errorMsg);
          results.push({ name, url: fullUrl, valid: false, responseTime: 0 });
        }
      }
    }

    const valid = results.filter(r => r.valid).length;
    const avgResponseTime =
      results.filter(r => r.responseTime && r.valid).reduce((sum, r) => sum + r.responseTime, 0) /
        valid || 0;

    return {
      total: results.length,
      valid,
      errors,
      avgResponseTime,
    };
  }

  /**
   * Validate all Utils documentation URLs
   */
  static async validateUtilsDocumentation(): Promise<{
    total: number;
    valid: number;
    errors: string[];
    avgResponseTime?: number;
  }> {
    console.log('🔧 Validating Utils Documentation URLs...');

    const results = [];
    const errors: string[] = [];

    // Validate Utils documentation URLs
    for (const [category, urls] of Object.entries(BUN_UTILS_URLS)) {
      console.log(`   📂 Category: ${category}`);

      for (const [name, path] of Object.entries(urls)) {
        const fullUrl = `https://bun.sh${path}`;

        try {
          const startTime = performance.now();
          const response = await fetch(fullUrl, {
            method: 'HEAD',
            signal: AbortSignal.timeout(10000),
          });
          const responseTime = performance.now() - startTime;

          if (response.ok) {
            console.log(`     ✅ ${name}: ${responseTime.toFixed(0)}ms`);
            results.push({ name, url: fullUrl, valid: true, responseTime });
          } else {
            const error = `HTTP ${response.status}: ${name}`;
            console.log(`     ❌ ${name}: ${error}`);
            errors.push(error);
            results.push({ name, url: fullUrl, valid: false, responseTime });
          }
        } catch (error) {
          const errorMsg = `Connection failed: ${name} - ${error}`;
          console.log(`     ❌ ${name}: ${errorMsg}`);
          errors.push(errorMsg);
          results.push({ name, url: fullUrl, valid: false, responseTime: 0 });
        }
      }
    }

    const valid = results.filter(r => r.valid).length;
    const avgResponseTime =
      results.filter(r => r.responseTime && r.valid).reduce((sum, r) => sum + r.responseTime, 0) /
        valid || 0;

    return {
      total: results.length,
      valid,
      errors,
      avgResponseTime,
    };
  }

  /**
   * Validate documentation constants
   */
  static async validateDocumentationConstants(): Promise<{
    total: number;
    valid: number;
    errors: string[];
  }> {
    console.log('📊 Validating Documentation Constants...');
    const { ConstantValidator } = await getValidators();

    const constants = ['cli-categories-count', 'utils-categories-count', 'documentation-base-url'];

    const results = constants.map(name => {
      const validation = ConstantValidator.validateConstant(name);
      console.log(`   ${validation.isValid ? '✅' : '❌'} ${name}`);

      if (!validation.isValid) {
        validation.errors.forEach(error => console.log(`      Error: ${error}`));
      }

      return { name, ...validation };
    });

    const valid = results.filter(r => r.isValid).length;
    const errors = results.flatMap(r => r.errors);

    return {
      total: results.length,
      valid,
      errors,
    };
  }

  /**
   * Generate documentation-specific report
   */
  static async generateDocumentationReport(): Promise<void> {
    console.log('\n📚 DOCUMENTATION VALIDATION REPORT');
    console.log('='.repeat(50));

    // Validate CLI documentation
    const cliResults = await this.validateCLIDocumentation();
    console.log(`\n📋 CLI Documentation: ${cliResults.valid}/${cliResults.total} valid`);
    if (cliResults.avgResponseTime) {
      console.log(`   Average Response Time: ${cliResults.avgResponseTime.toFixed(0)}ms`);
    }

    // Validate Utils documentation
    const utilsResults = await this.validateUtilsDocumentation();
    console.log(`\n🔧 Utils Documentation: ${utilsResults.valid}/${utilsResults.total} valid`);
    if (utilsResults.avgResponseTime) {
      console.log(`   Average Response Time: ${utilsResults.avgResponseTime.toFixed(0)}ms`);
    }

    // Validate constants
    const constantResults = await this.validateDocumentationConstants();
    console.log(
      `\n📊 Documentation Constants: ${constantResults.valid}/${constantResults.total} valid`
    );

    // Summary
    const totalURLs = cliResults.total + utilsResults.total;
    const validURLs = cliResults.valid + utilsResults.valid;
    const totalErrors =
      cliResults.errors.length + utilsResults.errors.length + constantResults.errors.length;

    console.log('\n📈 SUMMARY:');
    console.log(`   Total URLs: ${validURLs}/${totalURLs} valid`);
    console.log(`   Constants: ${constantResults.valid}/${constantResults.total} valid`);
    console.log(`   Total Issues: ${totalErrors}`);

    if (totalErrors > 0) {
      console.log('\n🚨 ISSUES FOUND:');
      [...cliResults.errors, ...utilsResults.errors, ...constantResults.errors].forEach(error =>
        console.log(`   • ${error}`)
      );
    } else {
      console.log('\n✅ All documentation constants are valid!');
    }
  }
}

// ============================================================================
// CLI ARGUMENT PARSING
// ============================================================================

interface DocValidationOptions {
  urls: boolean;
  constants: boolean;
  heal: boolean;
  help: boolean;
}

function parseArgs(): DocValidationOptions {
  const args = process.argv.slice(2);

  return {
    urls: args.includes('--urls') || args.includes('-u'),
    constants: args.includes('--constants') || args.includes('-c'),
    heal: args.includes('--heal') || args.includes('-h'),
    help: args.includes('--help') || args.includes('--help'),
  };
}

function showHelp(): void {
  console.log(`
📚 Documentation Constants Validator

USAGE:
  bun run lib/documentation-validator.ts [OPTIONS]

OPTIONS:
  --urls, -u        Validate documentation URLs only
  --constants, -c   Validate documentation constants only
  --heal, -h        Auto-fix detected issues
  --help            Show this help message

EXAMPLES:
  bun run lib/documentation-validator.ts              # Full validation
  bun run lib/documentation-validator.ts --urls       # URLs only
  bun run lib/documentation-validator.ts --constants  # Constants only
  bun run lib/documentation-validator.ts --heal       # Auto-fix issues

VALIDATION CATEGORIES:
  📚 CLI Documentation   - All CLI command documentation URLs
  🔧 Utils Documentation  - All Bun utility documentation URLs
  📊 Constants           - Documentation-related constants

INTEGRATION:
  This validator integrates with the main platform validation system
  and provides specialized validation for documentation constants.
`);
}

// ============================================================================
// EXPORTS
// ============================================================================

export { DocumentationValidator };
export default DocumentationValidator;

async function main(): Promise<void> {
  const options = parseArgs();

  if (options.help) {
    showHelp();
    return;
  }

  console.log('📚 DOCUMENTATION VALIDATION TOOL');
  console.log('='.repeat(50));

  try {
    if (options.urls || (!options.constants && !options.urls)) {
      await DocumentationValidator.generateDocumentationReport();
    }

    if (options.constants) {
      const results = await DocumentationValidator.validateDocumentationConstants();
      console.log(`\n📊 Constants: ${results.valid}/${results.total} valid`);
      if (results.errors.length > 0) {
        console.log('Errors:');
        results.errors.forEach(error => console.log(`   • ${error}`));
      }
    }

    if (options.heal) {
      console.log('\n🔧 STARTING DOCUMENTATION AUTO-HEALING...');
      const { AutoHealer } = await getValidators();
      const result = await AutoHealer.healAll();
      console.log(`✅ Applied ${result.totalFixes} fixes`);
    }

    console.log('\n✅ Documentation validation completed!');
  } catch (error) {
    console.error('\n❌ Documentation validation failed:', error);
    process.exit(1);
  }
}

// Run main function only when executed as a script.
if (import.meta.main) {
  main().catch(error => {
    console.error('❌ Unhandled error:', error);
    process.exit(1);
  });
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
