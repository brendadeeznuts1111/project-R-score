#!/usr/bin/env bun

/**
 * Environment Package Integration Demo
 *
 * This script demonstrates how to use bun pm pkg commands
 * with the enhanced package.json environment configuration
 */

import { readFileSync } from 'fs';
import { join } from 'path';

interface PackageConfig {
  config: {
    envFiles: Record<string, string>;
    envValidation: {
      required: string[];
      optional: string[];
      secrets: string[];
    };
    environment: string;
  };
  metadata: {
    environment: {
      cliCommands: string[];
      supportedEnvironments: string[];
      validationRules: Record<string, string>;
    };
  };
}

async function main() {
  console.log('🚀 Environment Package Integration Demo\n');

  try {
    // Read package.json
    const packagePath = join(process.cwd(), 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const pkg: PackageConfig = JSON.parse(packageContent);

    console.log('📋 Current Environment Configuration:');
    console.log(`   Environment: ${pkg.config.environment}`);
    console.log(`   Environment Files:`, pkg.config.envFiles);
    console.log(`   Required Variables: ${pkg.config.envValidation.required.length}`);
    console.log(`   Secret Variables: ${pkg.config.envValidation.secrets.length}`);

    console.log('\n🔧 Available CLI Commands:');
    pkg.metadata.environment.cliCommands.forEach((cmd, index) => {
      console.log(`   ${index + 1}. bun run ${cmd}`);
    });

    console.log('\n🌍 Supported Environments:');
    pkg.metadata.environment.supportedEnvironments.forEach(env => {
      console.log(`   • ${env}`);
    });

    console.log('\n📖 Validation Rules:');
    Object.entries(pkg.metadata.environment.validationRules).forEach(([rule, description]) => {
      console.log(`   • ${rule}: ${description}`);
    });

    console.log('\n💡 Demo Commands to Try:');
    console.log('   # Get environment file for current environment');
    console.log(`   bun pm pkg get config.envFiles.${pkg.config.environment}`);

    console.log('\n   # List all required environment variables');
    console.log('   bun pm pkg get config.envValidation.required');

    console.log('\n   # Check validation rules');
    console.log('   bun pm pkg get metadata.environment.validationRules.secrets');

    console.log('\n   # Update environment configuration');
    console.log('   bun pm pkg set config.environment="staging"');

    console.log('\n   # Add new environment file');
    console.log('   bun pm pkg set config.envFiles.demo=".env.demo"');

    console.log('\n✅ Integration Complete!');
    console.log('   Your package.json and environment management are now fully integrated.');
    console.log('   Use the commands above to explore and modify your configuration.');
  } catch (error) {
    console.error('❌ Error reading package.json:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { main };
