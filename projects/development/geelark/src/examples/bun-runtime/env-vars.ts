#!/usr/bin/env bun

// TypeScript interface merging for environment variable type safety
// This demonstrates the pattern shown in Bun documentation
declare module "bun" {
  interface Env {
    API_TOKEN: string;
    FOO: string;
    BAR: string;
    CUSTOM_VAR?: string;
    BASE_URL?: string;
    API_VERSION?: string;
    TIMEOUT?: string;
    FULL_API_URL?: string;
  }
}

export {}; // Make this file a module to enable top-level await

/**
 * Environment Variables Examples - Complete Configuration Management
 *
 * This comprehensive example demonstrates Bun's environment variable features:
 * - Accessing variables via Bun.env, process.env, and import.meta.env
 * - Automatic .env file loading (.env, .env.production, .env.development, .env.test, .env.local)
 * - Command-line environment variable setting with cross-platform syntax
 * - Environment-based configuration patterns
 * - Variable expansion and composition
 * - TypeScript type safety with interface merging
 * - Quotation marks support (single, double, backticks)
 * - Environment variable escaping
 * - Debug printing of all environment variables
 */

console.info("🚀 Environment Variables Examples - Complete Configuration Management!\n");

// Example 1: Accessing environment variables
console.info("1. Accessing environment variables:");

// Bun.env is a simple alias of process.env in Bun
console.info(`Bun.env.NODE_ENV: ${Bun.env.NODE_ENV}`);
console.info(`process.env.NODE_ENV: ${process.env.NODE_ENV}`);
console.info(`Bun.env.USER: ${Bun.env.USER}`);
console.info(`process.env.USER: ${process.env.USER}`);

console.info("Note: Bun.env is simply an alias of process.env in Bun");
console.info("To debug all environment variables, run: bun --print process.env");

// Example 2: Setting environment variables programmatically
console.info("\n2. Setting environment variables programmatically:");
process.env.CUSTOM_VAR = "custom_value";
console.info(`process.env.CUSTOM_VAR: ${process.env.CUSTOM_VAR}`);
console.info(`Bun.env.CUSTOM_VAR: ${Bun.env.CUSTOM_VAR}`);

// Example 3: Checking for environment-based configuration
console.info("\n3. Environment-based configuration patterns:");

const config = {
  apiUrl: process.env.NODE_ENV === 'production'
    ? 'https://api.production.com'
    : 'http://localhost:3001',
  debug: process.env.NODE_ENV !== 'production' && process.env.DEBUG === 'true',
  port: parseInt(process.env.PORT || '3000'),
};

console.info(`API URL: ${config.apiUrl}`);
console.info(`Debug mode: ${config.debug}`);
console.info(`Port: ${config.port}`);

// Example 4: Demonstrating .env file usage
console.info("\n4. .env file usage (.env files are automatically loaded):");
console.info("From .env files (FOO and BAR should be defined):");
console.info(`FOO: ${process.env.FOO || 'Not set - add to .env file'}`);
console.info(`BAR: ${process.env.BAR || 'Not set - add to .env file'}`);

// Example 4.5: API_TOKEN example (common for service authentication)
console.info("\n4.5 API_TOKEN example:");
console.info(`API_TOKEN: ${process.env.API_TOKEN || 'Not set - add to .env file'}`);
console.info("process.env.API_TOKEN; // => 'secret'");
console.info("Bun.env.API_TOKEN; // => 'secret'");

// Example 5: Command line environment variables (OS-specific syntax)
console.info("\n5. Command line environment variable setting:");
console.info("OS-specific syntax for setting environment variables:");
console.info("");
console.info("  🐧 Linux/macOS:");
console.info("    FOO=hello bun run examples/env-vars.ts");
console.info("    MY_VAR=test NODE_ENV=production bun run examples/env-vars.ts");
console.info("");
console.info("  🪟 Windows CMD:");
console.info("    set FOO=hello && bun run examples/env-vars.ts");
console.info("    set MY_VAR=test && set NODE_ENV=production && bun run examples/env-vars.ts");
console.info("");
console.info("  💙 Windows PowerShell:");
console.info("    $env:FOO='hello'; bun run examples/env-vars.ts");
console.info("    $env:MY_VAR='test'; $env:NODE_ENV='production'; bun run examples/env-vars.ts");

console.info("\n📁 Create .env files in your project root:");
console.info("  .env            (always loaded)");
console.info("  .env.production (loaded when NODE_ENV=production)");
console.info("  .env.development (loaded when NODE_ENV=development)");
console.info("  .env.test        (loaded when NODE_ENV=test)");
console.info("  .env.local       (always loaded, but ignored in NODE_ENV=test)");

// Example 6: Environment variable expansion
console.info("\n6. Environment variable expansion (automatic composition):");

process.env.BASE_URL = "https://api.example.com";
process.env.API_VERSION = "v2";
process.env.TIMEOUT = "5000";

// Variables can reference previously defined ones (from .env.local: FOO=hello_from_env)
process.env.FULL_API_URL = `${process.env.BASE_URL}/${process.env.API_VERSION}`;

console.info(`BASE_URL: ${process.env.BASE_URL}`);
console.info(`API_VERSION: ${process.env.API_VERSION}`);
console.info(`TIMEOUT: ${process.env.TIMEOUT}ms`);
console.info(`FULL_API_URL (composed): ${process.env.FULL_API_URL}`);

// Example 7: TypeScript type safety demonstrations
console.info("\n7. TypeScript type safety (requires interface merging):");

// This demonstrates how interface merging works for known env vars
type RequiredEnvVar = "NODE_ENV" | "USER" | "HOME";
console.info(`Known env vars are typed as string | undefined: ${(process.env as any).NODE_ENV}`);

// Example 8: Using import.meta.env (alias of process.env)
console.info("\n8. Using import.meta.env (Modern ES module alternative):");
console.info(`import.meta.env.NODE_ENV: ${import.meta.env.NODE_ENV}`);
console.info(`import.meta.env.USER: ${import.meta.env.USER}`);
console.info("Note: import.meta.env is functionally identical to process.env in Bun");

// Example 9: Quotation marks support
console.info("\n9. Quotation marks support:");
console.info("Bun supports: single quotes ('value'), double quotes (\"value\"), and backticks (`value`)");

// Example 10: Bun-specific environment variables
console.info("\n10. Demo of common Bun environment variables:");

// These work in Bun runtime and some control Bun's behavior
const bunEnvVars = {
  verboseFetch: process.env.BUN_CONFIG_VERBOSE_FETCH,
  maxHttpRequests: process.env.BUN_CONFIG_MAX_HTTP_REQUESTS,
  tlsRejectUnauthorized: process.env.NODE_TLS_REJECT_UNAUTHORIZED,
  noColor: process.env.NO_COLOR,
  doNotTrack: process.env.DO_NOT_TRACK
};

console.info("Common Bun environment variables:");
Object.entries(bunEnvVars).forEach(([key, value]) => {
  console.info(`  ${key}: ${value || '(not set)'}`);
});

// Example 11: Cross-platform command examples
console.info("\n11. Cross-platform environment variable setting:");
console.info("Use 'bun exec' for consistent cross-platform command-line env vars:");
console.info("  bun exec 'NODE_ENV=production bun run examples/env-vars.ts'");
console.info("  bun exec 'FOO=test BAR=value bun run examples/env-vars.ts'");

// Example 12: Runtime debugging
console.info("\n12. Runtime debugging capabilities:");
console.info("To print ALL environment variables: bun --print process.env");
console.info("To disable .env loading: bun --no-env-file run examples/env-vars.ts");
console.info("To load specific .env file: bun --env-file=.env.prod run examples/env-vars.ts");

// Example 13: Advanced configuration patterns
console.info("\n13. Advanced configuration patterns:");

const advancedConfig = {
  // Database URL composition
  databaseUrl: process.env.DATABASE_URL ||
    `postgres://${process.env.DB_USER || 'user'}:${process.env.DB_PASS || 'pass'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'app'}`,

  // Boolean flags with fallbacks
  enableLogging: process.env.LOGGING_ENABLED !== 'false', // true unless explicitly 'false'
  isProduction: process.env.NODE_ENV === 'production',
  debugMode: process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development',

  // Numeric values with defaults
  port: Number(process.env.PORT) || 3000,
  timeout: Number(process.env.TIMEOUT) || 30000,
  maxRetries: Number(process.env.MAX_RETRIES) || 3,
};

console.info("Database URL (composed with fallbacks):", advancedConfig.databaseUrl);
console.info("Configuration flags:", {
  enableLogging: advancedConfig.enableLogging,
  isProduction: advancedConfig.isProduction,
  debugMode: advancedConfig.debugMode
});

console.info("\n✅ Complete environment variables examples demonstrated!");
console.info("\n📚 Learn more: https://bun.com/docs/runtime/env");
console.info("🔧 Quick debug: bun --print process.env");
console.info("🚀 Advanced: bun --env-file=.env.prod run examples/env-vars.ts");
