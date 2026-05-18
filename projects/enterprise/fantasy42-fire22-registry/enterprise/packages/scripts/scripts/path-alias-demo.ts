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

console.info('🔧 Fire22 Path Alias Demo');
console.info('='.repeat(50));

console.info('📁 Available Path Aliases:');
console.info('   @ff/* → ./src/* (project root)');
console.info('   @/* → ./src/* (source directory)');
console.info('   @/domains/* → ./src/domains/*');
console.info('   @/shared/* → ./src/shared/*');
console.info('   @/collections/* → ./src/collections/*');
console.info('   @/interfaces/* → ./src/interfaces/*');
console.info('   @/application/* → ./src/application/*');

console.info('\n📦 Importing from @ff/ (project root):');
console.info(`   Project Name: ${fire22Config.name}`);
console.info(`   Version: ${fire22Config.version}`);
console.info(`   Author: ${fire22Config.author.name}`);

console.info('\n⚙️  Bunfig Configuration via @ff/:');
console.info(`   JSX: ${bunfig.jsx}`);
console.info(`   Log Level: ${bunfig.logLevel}`);
console.info(`   Test Root: ${bunfig.test?.root}`);

console.info('\n📋 Package.json via @ff/:');
console.info(`   Name: ${packageJson.name}`);
console.info(`   Version: ${packageJson.version}`);
console.info(`   Scripts: ${Object.keys(packageJson.scripts || {}).length} available`);

console.info('\n🔗 Cross-alias imports:');
console.info(`   Timezone Config: ${TestTimezoneConfiguration ? 'Available' : 'Not found'}`);

console.info('\n✅ @ff/ alias is working correctly!');
console.info('   You can now import any file from the project root using @ff/');

export { fire22Config, bunfig, packageJson };
