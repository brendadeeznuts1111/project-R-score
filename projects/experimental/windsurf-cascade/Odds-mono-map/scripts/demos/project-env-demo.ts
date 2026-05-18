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

console.info(chalk.blue.bold('🌍 Project Environment Variables Demo'));
console.info(chalk.gray('Showing automatically loaded .env variables with expansion\n'));

console.info(chalk.yellow('📋 Project Configuration:'));
console.info(chalk.gray(`   📦 Project Name: ${Bun.env.PROJECT_NAME}`));
console.info(chalk.gray(`   🏷️  Version: ${Bun.env.VERSION}`));
console.info(chalk.gray(`   🐛 Debug Mode: ${Bun.env.DEBUG}`));
console.info(chalk.gray(`   🌍 Environment: ${Bun.env.NODE_ENV}`));

console.info(chalk.yellow('\n🗄️  Database Configuration:'));
console.info(chalk.gray(`   🏠 Host: ${Bun.env.DB_HOST}`));
console.info(chalk.gray(`   🔌 Port: ${Bun.env.DB_PORT}`));
console.info(chalk.gray(`   👤 User: ${Bun.env.DB_USER}`));
console.info(chalk.gray(`   🔐 Password: ${Bun.env.DB_PASSWORD ? '*** configured ***' : 'not set'}`));
console.info(chalk.gray(`   📊 Database: ${Bun.env.DB_NAME}`));
console.info(chalk.gray(`   🔗 Connection URL: ${Bun.env.DB_URL}`));

console.info(chalk.yellow('\n🌐 API Configuration:'));
console.info(chalk.gray(`   🏢 Base URL: ${Bun.env.API_BASE}`));
console.info(chalk.gray(`   📈 Version: ${Bun.env.API_VERSION}`));
console.info(chalk.gray(`   🎯 Endpoint: ${Bun.env.API_ENDPOINT}`));
console.info(chalk.gray(`   ⏱️  Timeout: ${Bun.env.API_TIMEOUT}ms`));

console.info(chalk.yellow('\n🚀 Feature Flags:'));
console.info(chalk.gray(`   💾 Cache Enabled: ${Bun.env.ENABLE_CACHE}`));
console.info(chalk.gray(`   📝 Logging Enabled: ${Bun.env.ENABLE_LOGGING}`));
console.info(chalk.gray(`   📊 Metrics Enabled: ${Bun.env.ENABLE_METRICS}`));

console.info(chalk.yellow('\n⚙️  Bun Configuration:'));
console.info(chalk.gray(`   🌐 Max HTTP Requests: ${Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS}`));
console.info(chalk.gray(`   🎨 Colors: ${Bun.env.NO_COLOR ? 'Disabled' : 'Enabled'}`));
console.info(chalk.gray(`   💾 Transpiler Cache: ${Bun.env.BUN_RUNTIME_TRANSPILER_CACHE_PATH || 'Default location'}`));

// Demonstrate TypeScript types
console.info(chalk.blue('\n🔧 TypeScript Type Examples:'));

console.info(chalk.gray('   // Environment variable access patterns:'));
console.info(chalk.gray('   const projectName = Bun.env.PROJECT_NAME; // string | undefined'));
console.info(chalk.gray('   const debugMode = Bun.env.DEBUG === "true"; // boolean conversion'));
console.info(chalk.gray('   const timeout = parseInt(Bun.env.API_TIMEOUT || "5000"); // number conversion'));
console.info(chalk.gray('   const maxRequests = Number(Bun.env.BUN_CONFIG_MAX_HTTP_REQUESTS) || 256;'));

// Practical usage
console.info(chalk.blue('\n💡 Practical Usage in Application:'));

console.info(chalk.gray('   // Database connection'));
console.info(chalk.gray('   const dbConfig = {'));
console.info(chalk.gray('     url: Bun.env.DB_URL,'));
console.info(chalk.gray('     host: Bun.env.DB_HOST,'));
console.info(chalk.gray('     port: Number(Bun.env.DB_PORT),'));
console.info(chalk.gray('     user: Bun.env.DB_USER,'));
console.info(chalk.gray('     password: Bun.env.DB_PASSWORD'));
console.info(chalk.gray('   };'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // API client configuration'));
console.info(chalk.gray('   const apiConfig = {'));
console.info(chalk.gray('     baseURL: Bun.env.API_BASE,'));
console.info(chalk.gray('     version: Bun.env.API_VERSION,'));
console.info(chalk.gray('     timeout: Number(Bun.env.API_TIMEOUT)'));
console.info(chalk.gray('   };'));
console.info(chalk.gray(''));

console.info(chalk.gray('   // Feature flags'));
console.info(chalk.gray('   const features = {'));
console.info(chalk.gray('     cache: Bun.env.ENABLE_CACHE === "true",'));
console.info(chalk.gray('     logging: Bun.env.ENABLE_LOGGING === "true",'));
console.info(chalk.gray('     metrics: Bun.env.ENABLE_METRICS === "true"'));
console.info(chalk.gray('   };'));

console.info(chalk.green('\n✅ Project environment variables loaded successfully!'));
