#!/usr/bin/env bun
/**
 * [DOMAIN][DEMO][TYPE][DEMONSTRATION][SCOPE][FEATURE][META][EXAMPLE][#REF]project-env-demo
 * 
 * Project Env Demo
 * Demonstration script for feature showcase
 * 
 * @fileoverview Feature demonstration and reference implementation
 * @author Odds Protocol Team
 * @version 1.0.0
 * @since 2025-11-19
 * @category demos
 * @tags demos,demonstration,example
 */

#!/usr/bin/env bun

import chalk from 'chalk';

console.log(chalk.blue.bold('🌍 Project Environment Variables Demo'));
console.log(chalk.gray('Showing automatically loaded .env variables with expansion\n'));

console.log(chalk.yellow('📋 Project Configuration:'));
console.log(chalk.gray(`   📦 Project Name: ${Bun.env.PROJECT_NAME}`));
console.log(chalk.gray(`   🏷️  Version: ${Bun.env.VERSION}`));
console.log(chalk.gray(`   🐛 Debug Mode: ${Bun.env.DEBUG}`));
console.log(chalk.gray(`   🌍 Environment: ${Bun.env.NODE_ENV}`));

console.log(chalk.yellow('\n🗄️  Database Configuration:'));
console.log(chalk.gray(`   🏠 Host: ${Bun.env.DB_HOST}`));
console.log(chalk.gray(`   🔌 Port: ${Bun.env.DB_PORT}`));
console.log(chalk.gray(`   👤 User: ${Bun.env.DB_USER}`));
console.log(chalk.gray(`   🔐 Password: ${Bun.env.DB_PASSWORD ? '*** configured ***' : 'not set'}`));
console.log(chalk.gray(`   📊 Database: ${Bun.env.DB_NAME}`));
console.log(chalk.gray(`   🔗 Connection URL: ${Bun.env.DB_URL}`));

console.log(chalk.yellow('\n🌐 API Configuration:'));
console.log(chalk.gray(`   🏢 Base URL: ${Bun.env.API_BASE}`));
console.log(chalk.gray(`   📈 Version: ${Bun.env.API_VERSION}`));
console.log(chalk.gray(`   🎯 Endpoint: ${Bun.env.API_ENDPOINT}`));
console.log(chalk.gray(`   ⏱️  Timeout: ${Bun.env.API_TIMEOUT}ms`));

console.log(chalk.yellow('\n🚀 Feature Flags:'));
console.log(chalk.gray(`   💾 Cache Enabled: ${Bun.env.ENABLE_CACHE}`));
console.log(chalk.gray(`   📝 Logging Enabled: ${Bun.env.ENABLE_LOGGING}`));
console.log(chalk.gray(`   📊 Metrics Enabled: ${Bun.env.ENABLE_METRICS}`));

console.log(chalk.yellow('\n⚙️  Bun Configuration:'));
console.log(chalk.gray(`   🌐 Max HTTP Requests: ${Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS}`));
console.log(chalk.gray(`   🎨 Colors: ${Bun.env.NO_COLOR ? 'Disabled' : 'Enabled'}`));
console.log(chalk.gray(`   💾 Transpiler Cache: ${Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH || 'Default location'}`));

// Demonstrate TypeScript types
console.log(chalk.blue('\n🔧 TypeScript Type Examples:'));

console.log(chalk.gray('   // Environment variable access patterns:'));
console.log(chalk.gray('   const projectName = Bun.env.PROJECT_NAME; // string | undefined'));
console.log(chalk.gray('   const debugMode = Bun.env.DEBUG === "true"; // boolean conversion'));
console.log(chalk.gray('   const timeout = parseInt(Bun.env.API_TIMEOUT || "5000"); // number conversion'));
console.log(chalk.gray('   const maxRequests = Number(Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS) || 256;'));

// Practical usage
console.log(chalk.blue('\n💡 Practical Usage in Application:'));

console.log(chalk.gray('   // Database connection'));
console.log(chalk.gray('   const dbConfig = {'));
console.log(chalk.gray('     url: Bun.env.DB_URL,'));
console.log(chalk.gray('     host: Bun.env.DB_HOST,'));
console.log(chalk.gray('     port: Number(Bun.env.DB_PORT),'));
console.log(chalk.gray('     user: Bun.env.DB_USER,'));
console.log(chalk.gray('     password: Bun.env.DB_PASSWORD'));
console.log(chalk.gray('   };'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // API client configuration'));
console.log(chalk.gray('   const apiConfig = {'));
console.log(chalk.gray('     baseURL: Bun.env.API_BASE,'));
console.log(chalk.gray('     version: Bun.env.API_VERSION,'));
console.log(chalk.gray('     timeout: Number(Bun.env.API_TIMEOUT)'));
console.log(chalk.gray('   };'));
console.log(chalk.gray(''));

console.log(chalk.gray('   // Feature flags'));
console.log(chalk.gray('   const features = {'));
console.log(chalk.gray('     cache: Bun.env.ENABLE_CACHE === "true",'));
console.log(chalk.gray('     logging: Bun.env.ENABLE_LOGGING === "true",'));
console.log(chalk.gray('     metrics: Bun.env.ENABLE_METRICS === "true"'));
console.log(chalk.gray('   };'));

console.log(chalk.green('\n✅ Project environment variables loaded successfully!'));
