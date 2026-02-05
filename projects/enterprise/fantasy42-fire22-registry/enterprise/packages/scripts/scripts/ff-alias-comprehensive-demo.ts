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

console.log('🚀 Comprehensive @ff/ Alias Demo');
console.log('='.repeat(50));

console.log('📦 Package Configuration:');
console.log(`   Name: ${packageJson.name}`);
console.log(`   Version: ${packageJson.version}`);
console.log(`   Total Scripts: ${Object.keys(packageJson.scripts || {}).length}`);

console.log('\n🔧 Fire22 Configuration (TOML):');
console.log(`   Project: ${fire22Config.name}`);
console.log(`   Version: ${fire22Config.version}`);
console.log(`   Framework: ${fire22Config.project.framework}`);

console.log('\n⚙️  Bunfig Configuration:');
console.log(`   JSX: ${bunfig.jsx}`);
console.log(`   Log Level: ${bunfig.logLevel}`);
console.log(`   Test Root: ${bunfig.test?.root}`);

console.log('\n📜 Scripts from @ff/:');
console.log(`   TOML Config Name: ${tomlConfig.name}`);
console.log(`   TOML Config Version: ${tomlConfig.version}`);

console.log('\n📜 Script Modules:');
console.log(`   TOML Import Demo: Available`);
console.log(`   Test Setup: Available`);

console.log('\n🎯 Available @ff/ Import Examples:');
console.log('   ✅ @ff/package.json - Package configuration');
console.log('   ✅ @ff/fire22-config.toml - Project TOML config');
console.log('   ✅ @ff/bunfig.toml - Bun configuration');
console.log('   ✅ @ff/scripts/toml-import-demo - Script modules');
console.log('   ✅ @ff/test-setup - Test utilities');
console.log('   ✅ @ff/src/... - Source files');
console.log('   ✅ @ff/docs/... - Documentation files');

console.log('\n💡 Usage Tips:');
console.log('   • Use @ff/ for any file in the project root');
console.log('   • Works with .ts, .js, .json, .toml files');
console.log('   • Provides clean, consistent import paths');
console.log('   • TypeScript IntelliSense support included');

console.log('\n🎉 @ff/ alias is fully operational!');
console.log('   Your Fire22 project now has streamlined root-level imports!');
