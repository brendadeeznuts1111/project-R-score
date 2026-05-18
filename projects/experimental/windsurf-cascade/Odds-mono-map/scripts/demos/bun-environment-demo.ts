#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]bun-environment-demo
 * 
 * Bun Environment Demo
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

console.info(chalk.blue.bold('🌍 Bun Environment Variables Demo'));
console.info(chalk.gray('Demonstrating Bun configuration and debugging environment variables\n'));

// Display current environment variables
console.info(chalk.yellow('🔧 Current Environment Variables:'));

function displayEnvVar(name: string, description: string) {
    const value = Bun.env[name];
    if (value !== undefined) {
        console.info(chalk.green(`   ✅ ${name}: ${value}`));
    } else {
        console.info(chalk.gray(`   ⚪ ${name}: (not set)`));
    }
    console.info(chalk.gray(`      ${description}`));
}

// Core Bun environment variables
displayEnvVar('NODE_TLS_REJECT_UNAUTHORIZED', 'Disables SSL certificate validation when set to "0"');
displayEnvVar('BUN_CONFIG_VERBOSE_FETCH', 'Logs fetch requests when set to "curl" or "1"');
displayEnvVar('BUN_RUNTIME_TRANSPILER_CACHE_PATH', 'Sets transpiler cache directory');
displayEnvVar('TMPDIR', 'Temporary directory for intermediate assets');
displayEnvVar('NO_COLOR', 'Disables ANSI color output when set to "1"');
displayEnvVar('FORCE_COLOR', 'Force enables ANSI color output when set to "1"');
displayEnvVar('BUN_CONFIG_MAX_HTTP_REQUESTS', 'Controls maximum concurrent HTTP requests (default: 256)');
displayEnvVar('BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD', 'Prevents terminal clearing on watch reload');
displayEnvVar('DO_NOT_TRACK', 'Disables crash reports and telemetry when set to "1"');
displayEnvVar('BUN_OPTIONS', 'Prepends command-line arguments to Bun execution');

// Demonstrate environment variable effects
console.info(chalk.yellow('\n🎨 Color Control Demonstration:'));

const originalNoColor = Bun.env.NO_COLOR;
const originalForceColor = Bun.env.FORCE_COLOR;

console.info(chalk.gray('   Testing color output with different settings...'));

// Test with colors (normal)
console.info(chalk.blue('   🔵 Normal blue text (colors enabled)'));

// Test NO_COLOR effect
Bun.env.NO_COLOR = '1';
console.info(chalk.blue('   🔵 Blue text with NO_COLOR=1 (should be plain)'));

// Reset NO_COLOR and test FORCE_COLOR
delete Bun.env.NO_COLOR;
Bun.env.FORCE_COLOR = '1';
console.info(chalk.blue('   🔵 Blue text with FORCE_COLOR=1 (forced colors)'));

// Restore original settings
if (originalNoColor !== undefined) {
    Bun.env.NO_COLOR = originalNoColor;
} else {
    delete Bun.env.NO_COLOR;
}
if (originalForceColor !== undefined) {
    Bun.env.FORCE_COLOR = originalForceColor;
} else {
    delete Bun.env.FORCE_COLOR;
}

console.info(chalk.gray('   ✅ Color settings restored to original values'));

// Demonstrate verbose fetch
console.info(chalk.yellow('\n🌐 Verbose Fetch Demonstration:'));

const originalVerboseFetch = Bun.env.BUN_CONFIG_VERBOSE_FETCH;

console.info(chalk.gray('   Testing fetch with different verbose settings...'));

// Test without verbose fetch
console.info(chalk.gray('   📡 Fetch without verbose logging:'));
Bun.env.BUN_CONFIG_VERBOSE_FETCH = undefined;
try {
    const response = await fetch('https://httpbin.org/get');
    console.info(chalk.gray(`      Status: ${response.status} (no detailed logging)`));
} catch (error) {
    console.info(chalk.gray(`      Error: ${error.message}`));
}

// Test with verbose fetch
console.info(chalk.gray('   📡 Fetch with BUN_CONFIG_VERBOSE_FETCH=curl:'));
Bun.env.BUN_CONFIG_VERBOSE_FETCH = 'curl';
try {
    const response = await fetch('https://httpbin.org/get');
    console.info(chalk.gray(`      Status: ${response.status} (detailed curl-style logging above)`));
} catch (error) {
    console.info(chalk.gray(`      Error: ${error.message}`));
}

// Restore original setting
if (originalVerboseFetch !== undefined) {
    Bun.env.BUN_CONFIG_VERBOSE_FETCH = originalVerboseFetch;
} else {
    delete Bun.env.BUN_CONFIG_VERBOSE_FETCH;
}

// Demonstrate transpiler cache
console.info(chalk.yellow('\n💾 Transpiler Cache Demonstration:'));

const originalCachePath = Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;

console.info(chalk.gray('   Current transpiler cache settings:'));
if (Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH) {
    console.info(chalk.green(`   ✅ Custom cache path: ${Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH}`));
} else {
    console.info(chalk.gray('   ⚪ Using default platform-specific cache directory'));
}

// Demonstrate HTTP requests limit
console.info(chalk.yellow('\n🌐 HTTP Requests Configuration:'));

const maxRequests = Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS || '256';
console.info(chalk.gray(`   📊 Maximum concurrent HTTP requests: ${maxRequests}`));
console.info(chalk.gray('   💡 Reduce this if you encounter rate limits or connection issues'));

// Demonstrate BUN_OPTIONS
console.info(chalk.yellow('\n⚙️  BUN_OPTIONS Demonstration:'));

if (Bun.env.BUN_OPTIONS) {
    console.info(chalk.green(`   ✅ Current BUN_OPTIONS: ${Bun.env.BUN_OPTIONS}`));
    console.info(chalk.gray('   💡 These options will be prepended to all Bun commands'));
} else {
    console.info(chalk.gray('   ⚪ No BUN_OPTIONS set'));
}

// Practical usage examples
console.info(chalk.blue('\n💡 Practical Usage Examples:'));

console.info(chalk.gray('   // Disable SSL verification for testing'));
console.info(chalk.gray('   NODE_TLS_REJECT_UNAUTHORIZED=0 bun run test-ssl.ts'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Debug fetch requests'));
console.info(chalk.gray('   BUN_CONFIG_VERBOSE_FETCH=curl bun run api-client.ts'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Disable colors for CI/CD'));
console.info(chalk.gray('   NO_COLOR=1 bun run build'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Force colors in logs'));
console.info(chalk.gray('   FORCE_COLOR=1 bun run script | tee log.txt'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Limit concurrent requests'));
console.info(chalk.gray('   BUN_CONFIG_MAX_HTTP_REQUESTS=50 bun run bulk-downloader.ts'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Custom transpiler cache'));
console.info(chalk.gray('   BUN_RUNTIME_TRANSPILER_CACHE_PATH=./cache bun run large-project.ts'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Disable crash reports'));
console.info(chalk.gray('   DO_NOT_TRACK=1 bun run production-app.ts'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Default options for all commands'));
console.info(chalk.gray('   BUN_OPTIONS="--hot --watch" bun run dev'));

// Development workflow recommendations
console.info(chalk.blue('\n🛠️  Development Workflow Recommendations:'));

console.info(chalk.yellow('   🧪 Testing Environment:'));
console.info(chalk.gray('   • NODE_TLS_REJECT_UNAUTHORIZED=0 for SSL testing'));
console.info(chalk.gray('   • BUN_CONFIG_VERBOSE_FETCH=curl for API debugging'));
console.info(chalk.gray('   • BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD=true for watch mode'));
console.info(chalk.gray(''));

console.info(chalk.yellow('   🚀 Production Environment:'));
console.info(chalk.gray('   • DO_NOT_TRACK=1 to disable telemetry'));
console.info(chalk.gray('   • BUN_CONFIG_MAX_HTTP_REQUESTS=100 for rate limiting'));
console.info(chalk.gray('   • Remove NODE_TLS_REJECT_UNAUTHORIZED for security'));
console.info(chalk.gray(''));

console.info(chalk.yellow('   🎨 CI/CD Environment:'));
console.info(chalk.gray('   • NO_COLOR=1 for clean logs'));
console.info(chalk.gray('   • BUN_RUNTIME_TRANSPILER_CACHE_PATH=./tmp for caching'));
console.info(chalk.gray('   • FORCE_COLOR=1 if you want colored output in logs'));

console.info(chalk.green('\n✅ Environment variables demo completed!'));
