#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-env-files-demo
 * 
 * Bun Env Files Demo
 * Demonstration script for feature showcase
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,demonstration,example,bun,runtime,performance
 */

#!/usr/bin/env bun

import chalk from 'chalk';
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs';

console.info(chalk.blue.bold('🌍 Bun Environment Variables & .env Files Demo'));
console.info(chalk.gray('Demonstrating automatic .env loading, variable expansion, and configuration\n'));

// Create test .env files
console.info(chalk.yellow('📝 Creating Test .env Files:'));

const basicEnv = `# Basic environment variables
FOO=hello
BAR=world
API_TOKEN=secret123
DEBUG=true
`;

const developmentEnv = `# Development-specific overrides
NODE_ENV=development
DB_HOST=localhost
DB_PORT=5432
LOG_LEVEL=debug
`;

const localEnv = `# Local overrides (highest precedence)
API_TOKEN=local_secret_456
DEBUG=false
CUSTOM_SETTING=local_value
`;

// Write .env files
writeFileSync('.env', basicEnv);
writeFileSync('.env.development', developmentEnv);
writeFileSync('.env.local', localEnv);

console.info(chalk.gray('   ✅ Created .env (basic variables)'));
console.info(chalk.gray('   ✅ Created .env.development (development overrides)'));
console.info(chalk.gray('   ✅ Created .env.local (local overrides)'));

// Demonstrate variable expansion
console.info(chalk.yellow('\n🔄 Variable Expansion Demo:'));

const expandedEnv = `# Variable expansion examples
DB_USER=postgres
DB_PASSWORD=secret
DB_HOST=localhost
DB_PORT=5432
DB_NAME=myapp
DB_URL=postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME

API_BASE=https://api.example.com
API_VERSION=v1
API_ENDPOINT=$API_BASE/$API_VERSION/users

# Escaped expansion (literal $)
LITERAL_DOLLAR=hello\\$FOO
`;

writeFileSync('.env.expanded', expandedEnv);

console.info(chalk.gray('   ✅ Created .env.expanded with variable examples'));

// Test different .env file loading
console.info(chalk.yellow('\n🧪 Testing .env File Loading:'));

// Test with default .env files
console.info(chalk.gray('   📋 Loading default .env files:'));
console.info(chalk.gray(`      FOO: ${Bun.env.FOO || 'not found'}`));
console.info(chalk.gray(`      BAR: ${Bun.env.BAR || 'not found'}`));
console.info(chalk.gray(`      NODE_ENV: ${Bun.env.NODE_ENV || 'not found'}`));
console.info(chalk.gray(`      API_TOKEN: ${Bun.env.API_TOKEN || 'not found'}`));
console.info(chalk.gray(`      DEBUG: ${Bun.env.DEBUG || 'not found'}`));
console.info(chalk.gray(`      CUSTOM_SETTING: ${Bun.env.CUSTOM_SETTING || 'not found'}`));

// Test with custom .env file
console.info(chalk.gray('\n   📋 Loading custom .env file:'));
const customEnv = `CUSTOM_FILE_VAR=from_custom_file
ANOTHER_VAR=custom_value
`;
writeFileSync('.env.custom', customEnv);

// Note: In a real scenario, you'd restart the process with --env-file
console.info(chalk.gray('      To test custom .env: bun --env-file=.env.custom script.ts'));

// Demonstrate different access methods
console.info(chalk.yellow('\n🔍 Environment Variable Access Methods:'));

console.info(chalk.gray('   📋 process.env vs Bun.env vs import.meta.env:'));
console.info(chalk.gray(`      process.env.FOO: ${process.env.FOO}`));
console.info(chalk.gray(`      Bun.env.FOO: ${Bun.env.FOO}`));
console.info(chalk.gray(`      import.meta.env.FOO: ${import.meta.env.FOO}`));

console.info(chalk.gray('\n   📋 Variable types in TypeScript:'));
console.info(chalk.gray(`      typeof Bun.env.FOO: ${typeof Bun.env.FOO}`));
console.info(chalk.gray(`      Bun.env.UNDEFINED_VAR: ${Bun.env.UNDEFINED_VAR}`));
console.info(chalk.gray(`      typeof Bun.env.UNDEFINED_VAR: ${typeof Bun.env.UNDEFINED_VAR}`));

// Demonstrate variable expansion results
console.info(chalk.yellow('\n🔄 Variable Expansion Results:'));

// Load expanded env (simulated)
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'myapp';
process.env.API_BASE = 'https://api.example.com';
process.env.API_VERSION = 'v1';

console.info(chalk.gray('   📋 Expanded database URL:'));
console.info(chalk.gray(`      postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME`));
console.info(chalk.gray(`      Result: postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`));

console.info(chalk.gray('\n   📋 Expanded API endpoint:'));
console.info(chalk.gray(`      $API_BASE/$API_VERSION/users`));
console.info(chalk.gray(`      Result: ${process.env.API_BASE}/${process.env.API_VERSION}/users`));

// Demonstrate runtime transpiler cache
console.info(chalk.yellow('\n💾 Runtime Transpiler Cache Demo:'));

console.info(chalk.gray(`   📊 Current cache setting: ${Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH || 'Default platform location'}`));
console.info(chalk.gray('   💡 Files >50KB are automatically cached for faster CLI loading'));
console.info(chalk.gray('   🗂️  Cache is content-addressable and safe to delete'));
console.info(chalk.gray('   🐳 Recommended to disable in Docker: BUN_RUNTIME_TRANSPILER_CACHE_PATH=0'));

// Environment variable precedence
console.info(chalk.yellow('\n📊 Environment Variable Precedence:'));

console.info(chalk.gray('   🥇 Highest: Command line variables'));
console.info(chalk.gray('   🥈 2nd: .env.local'));
console.info(chalk.gray('   🥉 3rd: .env.{NODE_ENV} (development/production/test)'));
console.info(chalk.gray('   4th: .env'));
console.info(chalk.gray('   🏅 Lowest: System environment'));

// Practical usage examples
console.info(chalk.blue('\n💡 Practical Usage Examples:'));

console.info(chalk.gray('   // Database configuration with expansion'));
console.info(chalk.gray('   DB_USER=postgres'));
console.info(chalk.gray('   DB_PASSWORD=secret'));
console.info(chalk.gray('   DB_URL=postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // API configuration'));
console.info(chalk.gray('   API_BASE=https://api.example.com'));
console.info(chalk.gray('   API_VERSION=v1'));
console.info(chalk.gray('   API_ENDPOINT=$API_BASE/$API_VERSION/users'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Feature flags'));
console.info(chalk.gray('   DEBUG=true'));
console.info(chalk.gray('   LOG_LEVEL=debug'));
console.info(chalk.gray('   CACHE_ENABLED=false'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Environment-specific settings'));
console.info(chalk.gray('   NODE_ENV=development'));
console.info(chalk.gray('   # .env.production would override this'));
console.info(chalk.gray('   # .env.local would override everything'));

// TypeScript interface merging example
console.info(chalk.blue('\n🔧 TypeScript Interface Merging:'));

console.info(chalk.gray('   // Add to any .ts file for autocompletion:'));
console.info(chalk.gray('   declare module "bun" {'));
console.info(chalk.gray('     interface Env {'));
console.info(chalk.gray('       API_TOKEN: string;'));
console.info(chalk.gray('       DEBUG: string;'));
console.info(chalk.gray('       DB_URL: string;'));
console.info(chalk.gray('     }'));
console.info(chalk.gray('   }'));
console.info(chalk.gray(''));
console.info(chalk.gray('   // Now these are typed as string instead of string | undefined'));
console.info(chalk.gray('   const token = Bun.env.API_TOKEN; // string'));

// Cleanup
console.info(chalk.yellow('\n🧹 Cleaning up test files:'));

const filesToCleanup = ['.env', '.env.development', '.env.local', '.env.expanded', '.env.custom'];
filesToCleanup.forEach(file => {
    if (existsSync(file)) {
        unlinkSync(file);
        console.info(chalk.gray(`   🗑️  Removed ${file}`));
    }
});

// Best practices summary
console.info(chalk.blue('\n✅ Environment Variables Best Practices:'));
console.info(chalk.gray('   • Use .env for default values'));
console.info(chalk.gray('   • Use .env.{environment} for environment-specific overrides'));
console.info(chalk.gray('   • Use .env.local for local development secrets (add to .gitignore)'));
console.info(chalk.gray('   • Leverage variable expansion for complex configurations'));
console.info(chalk.gray('   • Use TypeScript interface merging for autocompletion'));
console.info(chalk.gray('   • Set NODE_ENV appropriately (development/production/test)'));
console.info(chalk.gray('   • Use BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 in Docker'));
console.info(chalk.gray('   • Disable cache on ephemeral filesystems'));

console.info(chalk.green('\n✅ Environment variables and .env files demo completed!'));
