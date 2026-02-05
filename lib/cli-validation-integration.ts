/**
 * CLI Validation Integration Helper
 * 
 * Minimal integration for existing CLI tools to add validation
 * with just a few lines of code.
 * 
 * @version 1.0.0
 * @author Enterprise Platform Team
 */

import { quickValidate, validateAndReport } from './cli-self-validation';

// ============================================================================
// MINIMAL INTEGRATION FUNCTIONS
// ============================================================================

/**
 * Add validation to any CLI tool with one line
 * 
 * Usage: await validateOrExit('my-tool', ['--help']);
 */
export async function validateOrExit(
  toolName: string,
  args: string[] = [],
  autoHeal: boolean = true
): Promise<void> {
  const isValid = await quickValidate(toolName, args, autoHeal);
  
  if (!isValid) {
    console.error(`❌ Validation failed for ${toolName}`);
    console.error('💡 Run with --heal flag to auto-fix issues');
    console.error('💡 Or run: bun run lib/platform-validator.ts --cli');
    process.exit(1);
  }
}

/**
 * Add validation with detailed reporting
 * 
 * Usage: await validateAndReport('my-tool', ['--help']);
 */
export { validateAndReport };

/**
 * Validate with custom error handling
 * 
 * Usage: await validateWithFallback('primary-tool', ['--arg'], 'fallback-tool');
 */
export async function validateWithFallback(
  primaryTool: string,
  args: string[] = [],
  fallbackTool?: string,
  autoHeal: boolean = true
): Promise<{ tool: string; valid: boolean }> {
  // Try primary tool
  const primaryValid = await quickValidate(primaryTool, args, autoHeal);
  
  if (primaryValid) {
    return { tool: primaryTool, valid: true };
  }
  
  console.warn(`⚠️  Primary tool '${primaryTool}' validation failed`);
  
  // Try fallback if provided
  if (fallbackTool) {
    console.log(`🔄 Trying fallback tool: ${fallbackTool}`);
    const fallbackValid = await quickValidate(fallbackTool, args, autoHeal);
    
    if (fallbackValid) {
      console.log(`✅ Using fallback tool: ${fallbackTool}`);
      return { tool: fallbackTool, valid: true };
    }
  }
  
  return { tool: primaryTool, valid: false };
}

// ============================================================================
// ENVIRONMENT VALIDATION
// ============================================================================

/**
 * Validate required environment variables
 */
export function validateEnvironment(requiredVars: string[]): void {
  const missing = requiredVars.filter(varName => !process.env[varName]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:');
    missing.forEach(varName => console.error(`   • ${varName}`));
    console.error('\n💡 Set these variables and try again');
    process.exit(1);
  }
}

/**
 * Set default environment variables if not present
 */
export function setDefaults(defaults: Record<string, string>): void {
  let setCount = 0;
  
  for (const [key, value] of Object.entries(defaults)) {
    if (!process.env[key]) {
      process.env[key] = value;
      console.log(`🔧 Set default environment variable: ${key}=${value}`);
      setCount++;
    }
  }
  
  if (setCount > 0) {
    console.log(`✅ Applied ${setCount} default environment variables`);
  }
}

// ============================================================================
// QUICK START INSTRUCTIONS
// ============================================================================

/**
 * Show integration instructions
 */
export function showIntegrationHelp(): void {
  console.log(`
🚀 CLI Validation Integration - Quick Start

Add validation to your CLI tools in seconds:

1️⃣  MINIMAL INTEGRATION (1 line):
   import { validateOrExit } from './lib/cli-validation-integration';
   await validateOrExit('your-tool', ['--help']);

2️⃣  DETAILED REPORTING:
   import { validateAndReport } from './lib/cli-validation-integration';
   await validateAndReport('your-tool', ['--help']);

3️⃣  WITH FALLBACK:
   import { validateWithFallback } from './lib/cli-validation-integration';
   const { tool } = await validateWithFallback('primary', ['--arg'], 'fallback');

4️⃣  ENVIRONMENT VALIDATION:
   import { validateEnvironment, setDefaults } from './lib/cli-validation-integration';
   validateEnvironment(['NODE_ENV', 'API_KEY']);
   setDefaults({ NODE_ENV: 'development' });

5️⃣  COMPLETE EXAMPLE:
   #!/usr/bin/env bun
   import { validateOrExit, setDefaults } from './lib/cli-validation-integration';
   
   // Set defaults and validate
   setDefaults({ NODE_ENV: 'development' });
   await validateOrExit('bun', ['--version']);
   
   // Your CLI logic here
   console.log('✅ CLI tool ready to execute!');

🔧 AUTO-HEALING:
   Most validation issues can be auto-fixed by:
   • Adding --heal flag to validation calls
   • Running: bun run lib/platform-validator.ts --heal

📊 VALIDATION CATEGORIES:
   • CLI Tools: Binary availability and permissions
   • URLs: Connectivity and protocol compliance  
   • Constants: Type safety and required values
   • Environment: Required variables and defaults

🎯 BENEFITS:
   • Prevent runtime errors before execution
   • Auto-fix common configuration issues
   • Provide clear error messages and fixes
   • Maintain consistent validation across all CLI tools
`);
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  validateOrExit,
  validateAndReport,
  validateWithFallback,
  validateEnvironment,
  setDefaults,
  showIntegrationHelp
};
