#!/usr/bin/env bun
/**
 * Path Alias Demo for Fire22
 * Demonstrates the @ff/ alias for importing from project root
 */

// Import from project root using @ff/ alias
import { fire22Config } from '@ff/scripts/toml-import-demo';
import bunfig from '@ff/bunfig.toml';
import packageJson from '@ff/package.json';

// Import using existing @/ aliases for comparison
import { TestTimezoneConfiguration } from '@/shared/timezone-configuration';

console.log('🔧 Fire22 Path Alias Demo');
console.log('='.repeat(50));

console.log('📁 Available Path Aliases:');
console.log('   @ff/* → ./src/* (project root)');
console.log('   @/* → ./src/* (source directory)');
console.log('   @/domains/* → ./src/domains/*');
console.log('   @/shared/* → ./src/shared/*');
console.log('   @/collections/* → ./src/collections/*');
console.log('   @/interfaces/* → ./src/interfaces/*');
console.log('   @/application/* → ./src/application/*');

console.log('\n📦 Importing from @ff/ (project root):');
console.log(`   Project Name: ${fire22Config.name}`);
console.log(`   Version: ${fire22Config.version}`);
console.log(`   Author: ${fire22Config.author.name}`);

console.log('\n⚙️  Bunfig Configuration via @ff/:');
console.log(`   JSX: ${bunfig.jsx}`);
console.log(`   Log Level: ${bunfig.logLevel}`);
console.log(`   Test Root: ${bunfig.test?.root}`);

console.log('\n📋 Package.json via @ff/:');
console.log(`   Name: ${packageJson.name}`);
console.log(`   Version: ${packageJson.version}`);
console.log(`   Scripts: ${Object.keys(packageJson.scripts || {}).length} available`);

console.log('\n🔗 Cross-alias imports:');
console.log(`   Timezone Config: ${TestTimezoneConfiguration ? 'Available' : 'Not found'}`);

console.log('\n✅ @ff/ alias is working correctly!');
console.log('   You can now import any file from the project root using @ff/');

export { fire22Config, bunfig, packageJson };
