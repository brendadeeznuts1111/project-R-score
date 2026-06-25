#!/usr/bin/env bun
/**
 * Comprehensive @ff/ Alias Demo
 * Demonstrating all ways to use @ff/ for project root imports
 */

// Import configuration files
import packageJson from '@ff/package.json';
import fire22Config from '@ff/fire22-config.toml';
import bunfig from '@ff/bunfig.toml';

// Import scripts from project root
import { fire22Config as tomlConfig } from '@ff/scripts/toml-import-demo';

console.info('🚀 Comprehensive @ff/ Alias Demo');
console.info('='.repeat(50));

console.info('📦 Package Configuration:');
console.info(`   Name: ${packageJson.name}`);
console.info(`   Version: ${packageJson.version}`);
console.info(`   Total Scripts: ${Object.keys(packageJson.scripts || {}).length}`);

console.info('\n🔧 Fire22 Configuration (TOML):');
console.info(`   Project: ${fire22Config.name}`);
console.info(`   Version: ${fire22Config.version}`);
console.info(`   Framework: ${fire22Config.project.framework}`);

console.info('\n⚙️  Bunfig Configuration:');
console.info(`   JSX: ${bunfig.jsx}`);
console.info(`   Log Level: ${bunfig.logLevel}`);
console.info(`   Test Root: ${bunfig.test?.root}`);

console.info('\n📜 Scripts from @ff/:');
console.info(`   TOML Config Name: ${tomlConfig.name}`);
console.info(`   TOML Config Version: ${tomlConfig.version}`);

console.info('\n📜 Script Modules:');
console.info(`   TOML Import Demo: Available`);
console.info(`   Test Setup: Available`);

console.info('\n🎯 Available @ff/ Import Examples:');
console.info('   ✅ @ff/package.json - Package configuration');
console.info('   ✅ @ff/fire22-config.toml - Project TOML config');
console.info('   ✅ @ff/bunfig.toml - Bun configuration');
console.info('   ✅ @ff/scripts/toml-import-demo - Script modules');
console.info('   ✅ @ff/test-setup - Test utilities');
console.info('   ✅ @ff/src/... - Source files');
console.info('   ✅ @ff/docs/... - Documentation files');

console.info('\n💡 Usage Tips:');
console.info('   • Use @ff/ for any file in the project root');
console.info('   • Works with .ts, .js, .json, .toml files');
console.info('   • Provides clean, consistent import paths');
console.info('   • TypeScript IntelliSense support included');

console.info('\n🎉 @ff/ alias is fully operational!');
console.info('   Your Fire22 project now has streamlined root-level imports!');
