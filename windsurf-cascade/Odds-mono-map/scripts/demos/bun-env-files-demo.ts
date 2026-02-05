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

console.log(chalk.blue.bold('🌍 Bun Environment Variables & .env Files Demo'));
console.log(chalk.gray('Demonstrating automatic .env loading, variable expansion, and configuration\n'));

// Create test .env files
console.log(chalk.yellow('📝 Creating Test .env Files:'));

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

console.log(chalk.gray('   ✅ Created .env (basic variables)'));
console.log(chalk.gray('   ✅ Created .env.development (development overrides)'));
console.log(chalk.gray('   ✅ Created .env.local (local overrides)'));

// Demonstrate variable expansion
console.log(chalk.yellow('\n🔄 Variable Expansion Demo:'));

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

console.log(chalk.gray('   ✅ Created .env.expanded with variable examples'));

// Test different .env file loading
console.log(chalk.yellow('\n🧪 Testing .env File Loading:'));

// Test with default .env files
console.log(chalk.gray('   📋 Loading default .env files:'));
console.log(chalk.gray(`      FOO: ${Bun.env.FOO || 'not found'}`));
console.log(chalk.gray(`      BAR: ${Bun.env.BAR || 'not found'}`));
console.log(chalk.gray(`      NODE_ENV: ${Bun.env.NODE_ENV || 'not found'}`));
console.log(chalk.gray(`      API_TOKEN: ${Bun.env.API_TOKEN || 'not found'}`));
console.log(chalk.gray(`      DEBUG: ${Bun.env.DEBUG || 'not found'}`));
console.log(chalk.gray(`      CUSTOM_SETTING: ${Bun.env.CUSTOM_SETTING || 'not found'}`));

// Test with custom .env file
console.log(chalk.gray('\n   📋 Loading custom .env file:'));
const customEnv = `CUSTOM_FILE_VAR=from_custom_file
ANOTHER_VAR=custom_value
`;
writeFileSync('.env.custom', customEnv);

// Note: In a real scenario, you'd restart the process with --env-file
console.log(chalk.gray('      To test custom .env: bun --env-file=.env.custom script.ts'));

// Demonstrate different access methods
console.log(chalk.yellow('\n🔍 Environment Variable Access Methods:'));

console.log(chalk.gray('   📋 process.env vs Bun.env vs import.meta.env:'));
console.log(chalk.gray(`      process.env.FOO: ${process.env.FOO}`));
console.log(chalk.gray(`      Bun.env.FOO: ${Bun.env.FOO}`));
console.log(chalk.gray(`      import.meta.env.FOO: ${import.meta.env.FOO}`));

console.log(chalk.gray('\n   📋 Variable types in TypeScript:'));
console.log(chalk.gray(`      typeof Bun.env.FOO: ${typeof Bun.env.FOO}`));
console.log(chalk.gray(`      Bun.env.UNDEFINED_VAR: ${Bun.env.UNDEFINED_VAR}`));
console.log(chalk.gray(`      typeof Bun.env.UNDEFINED_VAR: ${typeof Bun.env.UNDEFINED_VAR}`));

// Demonstrate variable expansion results
console.log(chalk.yellow('\n🔄 Variable Expansion Results:'));

// Load expanded env (simulated)
process.env.DB_USER = 'postgres';
process.env.DB_PASSWORD = 'secret';
process.env.DB_HOST = 'localhost';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'myapp';
process.env.API_BASE = 'https://api.example.com';
process.env.API_VERSION = 'v1';

console.log(chalk.gray('   📋 Expanded database URL:'));
console.log(chalk.gray(`      postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME`));
console.log(chalk.gray(`      Result: postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`));

console.log(chalk.gray('\n   📋 Expanded API endpoint:'));
console.log(chalk.gray(`      $API_BASE/$API_VERSION/users`));
console.log(chalk.gray(`      Result: ${process.env.API_BASE}/${process.env.API_VERSION}/users`));

// Demonstrate runtime transpiler cache
console.log(chalk.yellow('\n💾 Runtime Transpiler Cache Demo:'));

console.log(chalk.gray(`   📊 Current cache setting: ${Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH || 'Default platform location'}`));
console.log(chalk.gray('   💡 Files >50KB are automatically cached for faster CLI loading'));
console.log(chalk.gray('   🗂️  Cache is content-addressable and safe to delete'));
console.log(chalk.gray('   🐳 Recommended to disable in Docker: BUN_RUNTIME_TRANSPILER_CACHE_PATH=0'));

// Environment variable precedence
console.log(chalk.yellow('\n📊 Environment Variable Precedence:'));

console.log(chalk.gray('   🥇 Highest: Command line variables'));
console.log(chalk.gray('   🥈 2nd: .env.local'));
console.log(chalk.gray('   🥉 3rd: .env.{NODE_ENV} (development/production/test)'));
console.log(chalk.gray('   4th: .env'));
console.log(chalk.gray('   🏅 Lowest: System environment'));

// Practical usage examples
console.log(chalk.blue('\n💡 Practical Usage Examples:'));

console.log(chalk.gray('   // Database configuration with expansion'));
console.log(chalk.gray('   DB_USER=postgres'));
console.log(chalk.gray('   DB_PASSWORD=secret'));
console.log(chalk.gray('   DB_URL=postgres://$DB_USER:$DB_PASSWORD@$DB_HOST:$DB_PORT/$DB_NAME'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // API configuration'));
console.log(chalk.gray('   API_BASE=https://api.example.com'));
console.log(chalk.gray('   API_VERSION=v1'));
console.log(chalk.gray('   API_ENDPOINT=$API_BASE/$API_VERSION/users'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Feature flags'));
console.log(chalk.gray('   DEBUG=true'));
console.log(chalk.gray('   LOG_LEVEL=debug'));
console.log(chalk.gray('   CACHE_ENABLED=false'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Environment-specific settings'));
console.log(chalk.gray('   NODE_ENV=development'));
console.log(chalk.gray('   # .env.production would override this'));
console.log(chalk.gray('   # .env.local would override everything'));

// TypeScript interface merging example
console.log(chalk.blue('\n🔧 TypeScript Interface Merging:'));

console.log(chalk.gray('   // Add to any .ts file for autocompletion:'));
console.log(chalk.gray('   declare module "bun" {'));
console.log(chalk.gray('     interface Env {'));
console.log(chalk.gray('       API_TOKEN: string;'));
console.log(chalk.gray('       DEBUG: string;'));
console.log(chalk.gray('       DB_URL: string;'));
console.log(chalk.gray('     }'));
console.log(chalk.gray('   }'));
console.log(chalk.gray(''));
console.log(chalk.gray('   // Now these are typed as string instead of string | undefined'));
console.log(chalk.gray('   const token = Bun.env.API_TOKEN; // string'));

// Cleanup
console.log(chalk.yellow('\n🧹 Cleaning up test files:'));

const filesToCleanup = ['.env', '.env.development', '.env.local', '.env.expanded', '.env.custom'];
filesToCleanup.forEach(file => {
    if (existsSync(file)) {
        unlinkSync(file);
        console.log(chalk.gray(`   🗑️  Removed ${file}`));
    }
});

// Best practices summary
console.log(chalk.blue('\n✅ Environment Variables Best Practices:'));
console.log(chalk.gray('   • Use .env for default values'));
console.log(chalk.gray('   • Use .env.{environment} for environment-specific overrides'));
console.log(chalk.gray('   • Use .env.local for local development secrets (add to .gitignore)'));
console.log(chalk.gray('   • Leverage variable expansion for complex configurations'));
console.log(chalk.gray('   • Use TypeScript interface merging for autocompletion'));
console.log(chalk.gray('   • Set NODE_ENV appropriately (development/production/test)'));
console.log(chalk.gray('   • Use BUN_RUNTIME_TRANSPILER_CACHE_PATH=0 in Docker'));
console.log(chalk.gray('   • Disable cache on ephemeral filesystems'));

console.log(chalk.green('\n✅ Environment variables and .env files demo completed!'));
