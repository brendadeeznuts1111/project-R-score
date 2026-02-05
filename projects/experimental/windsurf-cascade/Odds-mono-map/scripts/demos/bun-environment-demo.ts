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

console.log(chalk.blue.bold('🌍 Bun Environment Variables Demo'));
console.log(chalk.gray('Demonstrating Bun configuration and debugging environment variables\n'));

// Display current environment variables
console.log(chalk.yellow('🔧 Current Environment Variables:'));

function displayEnvVar(name: string, description: string) {
    const value = Bun.env[name];
    if (value !== undefined) {
        console.log(chalk.green(`   ✅ ${name}: ${value}`));
    } else {
        console.log(chalk.gray(`   ⚪ ${name}: (not set)`));
    }
    console.log(chalk.gray(`      ${description}`));
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
console.log(chalk.yellow('\n🎨 Color Control Demonstration:'));

const originalNoColor = Bun.env.NO_COLOR;
const originalForceColor = Bun.env.FORCE_COLOR;

console.log(chalk.gray('   Testing color output with different settings...'));

// Test with colors (normal)
console.log(chalk.blue('   🔵 Normal blue text (colors enabled)'));

// Test NO_COLOR effect
Bun.env.NO_COLOR = '1';
console.log(chalk.blue('   🔵 Blue text with NO_COLOR=1 (should be plain)'));

// Reset NO_COLOR and test FORCE_COLOR
delete Bun.env.NO_COLOR;
Bun.env.FORCE_COLOR = '1';
console.log(chalk.blue('   🔵 Blue text with FORCE_COLOR=1 (forced colors)'));

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

console.log(chalk.gray('   ✅ Color settings restored to original values'));

// Demonstrate verbose fetch
console.log(chalk.yellow('\n🌐 Verbose Fetch Demonstration:'));

const originalVerboseFetch = Bun.env.BUN_CONFIG_VERBOSE_FETCH;

console.log(chalk.gray('   Testing fetch with different verbose settings...'));

// Test without verbose fetch
console.log(chalk.gray('   📡 Fetch without verbose logging:'));
Bun.env.BUN_CONFIG_VERBOSE_FETCH = undefined;
try {
    const response = await fetch('https://httpbin.org/get');
    console.log(chalk.gray(`      Status: ${response.status} (no detailed logging)`));
} catch (error) {
    console.log(chalk.gray(`      Error: ${error.message}`));
}

// Test with verbose fetch
console.log(chalk.gray('   📡 Fetch with BUN_CONFIG_VERBOSE_FETCH=curl:'));
Bun.env.BUN_CONFIG_VERBOSE_FETCH = 'curl';
try {
    const response = await fetch('https://httpbin.org/get');
    console.log(chalk.gray(`      Status: ${response.status} (detailed curl-style logging above)`));
} catch (error) {
    console.log(chalk.gray(`      Error: ${error.message}`));
}

// Restore original setting
if (originalVerboseFetch !== undefined) {
    Bun.env.BUN_CONFIG_VERBOSE_FETCH = originalVerboseFetch;
} else {
    delete Bun.env.BUN_CONFIG_VERBOSE_FETCH;
}

// Demonstrate transpiler cache
console.log(chalk.yellow('\n💾 Transpiler Cache Demonstration:'));

const originalCachePath = Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH;

console.log(chalk.gray('   Current transpiler cache settings:'));
if (Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH) {
    console.log(chalk.green(`   ✅ Custom cache path: ${Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH}`));
} else {
    console.log(chalk.gray('   ⚪ Using default platform-specific cache directory'));
}

// Demonstrate HTTP requests limit
console.log(chalk.yellow('\n🌐 HTTP Requests Configuration:'));

const maxRequests = Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS || '256';
console.log(chalk.gray(`   📊 Maximum concurrent HTTP requests: ${maxRequests}`));
console.log(chalk.gray('   💡 Reduce this if you encounter rate limits or connection issues'));

// Demonstrate BUN_OPTIONS
console.log(chalk.yellow('\n⚙️  BUN_OPTIONS Demonstration:'));

if (Bun.env.BUN_OPTIONS) {
    console.log(chalk.green(`   ✅ Current BUN_OPTIONS: ${Bun.env.BUN_OPTIONS}`));
    console.log(chalk.gray('   💡 These options will be prepended to all Bun commands'));
} else {
    console.log(chalk.gray('   ⚪ No BUN_OPTIONS set'));
}

// Practical usage examples
console.log(chalk.blue('\n💡 Practical Usage Examples:'));

console.log(chalk.gray('   // Disable SSL verification for testing'));
console.log(chalk.gray('   NODE_TLS_REJECT_UNAUTHORIZED=0 bun run test-ssl.ts'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Debug fetch requests'));
console.log(chalk.gray('   BUN_CONFIG_VERBOSE_FETCH=curl bun run api-client.ts'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Disable colors for CI/CD'));
console.log(chalk.gray('   NO_COLOR=1 bun run build'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Force colors in logs'));
console.log(chalk.gray('   FORCE_COLOR=1 bun run script | tee log.txt'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Limit concurrent requests'));
console.log(chalk.gray('   BUN_CONFIG_MAX_HTTP_REQUESTS=50 bun run bulk-downloader.ts'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Custom transpiler cache'));
console.log(chalk.gray('   BUN_RUNTIME_TRANSPILER_CACHE_PATH=./cache bun run large-project.ts'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Disable crash reports'));
console.log(chalk.gray('   DO_NOT_TRACK=1 bun run production-app.ts'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Default options for all commands'));
console.log(chalk.gray('   BUN_OPTIONS="--hot --watch" bun run dev'));

// Development workflow recommendations
console.log(chalk.blue('\n🛠️  Development Workflow Recommendations:'));

console.log(chalk.yellow('   🧪 Testing Environment:'));
console.log(chalk.gray('   • NODE_TLS_REJECT_UNAUTHORIZED=0 for SSL testing'));
console.log(chalk.gray('   • BUN_CONFIG_VERBOSE_FETCH=curl for API debugging'));
console.log(chalk.gray('   • BUN_CONFIG_NO_CLEAR_TERMINAL_ON_RELOAD=true for watch mode'));
console.log(chalk.gray(''));

console.log(chalk.yellow('   🚀 Production Environment:'));
console.log(chalk.gray('   • DO_NOT_TRACK=1 to disable telemetry'));
console.log(chalk.gray('   • BUN_CONFIG_MAX_HTTP_REQUESTS=100 for rate limiting'));
console.log(chalk.gray('   • Remove NODE_TLS_REJECT_UNAUTHORIZED for security'));
console.log(chalk.gray(''));

console.log(chalk.yellow('   🎨 CI/CD Environment:'));
console.log(chalk.gray('   • NO_COLOR=1 for clean logs'));
console.log(chalk.gray('   • BUN_RUNTIME_TRANSPILER_CACHE_PATH=./tmp for caching'));
console.log(chalk.gray('   • FORCE_COLOR=1 if you want colored output in logs'));

console.log(chalk.green('\n✅ Environment variables demo completed!'));
