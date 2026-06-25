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
  console.info('🚀 Environment Package Integration Demo\n');

  try {
    // Read package.json
    const packagePath = join(process.cwd(), 'package.json');
    const packageContent = readFileSync(packagePath, 'utf-8');
    const pkg: PackageConfig = JSON.parse(packageContent);

    console.info('📋 Current Environment Configuration:');
    console.info(`   Environment: ${pkg.config.environment}`);
    console.info(`   Environment Files:`, pkg.config.envFiles);
    console.info(`   Required Variables: ${pkg.config.envValidation.required.length}`);
    console.info(`   Secret Variables: ${pkg.config.envValidation.secrets.length}`);

    console.info('\n🔧 Available CLI Commands:');
    pkg.metadata.environment.cliCommands.forEach((cmd, index) => {
      console.info(`   ${index + 1}. bun run ${cmd}`);
    });

    console.info('\n🌍 Supported Environments:');
    pkg.metadata.environment.supportedEnvironments.forEach(env => {
      console.info(`   • ${env}`);
    });

    console.info('\n📖 Validation Rules:');
    Object.entries(pkg.metadata.environment.validationRules).forEach(([rule, description]) => {
      console.info(`   • ${rule}: ${description}`);
    });

    console.info('\n💡 Demo Commands to Try:');
    console.info('   # Get environment file for current environment');
    console.info(`   bun pm pkg get config.envFiles.${pkg.config.environment}`);

    console.info('\n   # List all required environment variables');
    console.info('   bun pm pkg get config.envValidation.required');

    console.info('\n   # Check validation rules');
    console.info('   bun pm pkg get metadata.environment.validationRules.secrets');

    console.info('\n   # Update environment configuration');
    console.info('   bun pm pkg set config.environment="staging"');

    console.info('\n   # Add new environment file');
    console.info('   bun pm pkg set config.envFiles.demo=".env.demo"');

    console.info('\n✅ Integration Complete!');
    console.info('   Your package.json and environment management are now fully integrated.');
    console.info('   Use the commands above to explore and modify your configuration.');
  } catch (error) {
    console.error('❌ Error reading package.json:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}

export { main };
