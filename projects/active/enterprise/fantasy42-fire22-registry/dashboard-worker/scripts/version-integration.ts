#!/usr/bin/env bun

/**
 * Version Integration Demo for Fire22 Dashboard
 * Demonstrates enhanced versioning capabilities with bun pm pkg integration
 */

import { execSync } from 'child_process';

class VersionIntegration {
  async demonstrateMultiplePropertyRetrieval(): Promise<void> {
    console.info('🔍 Demonstrating Multiple Property Retrieval\n');

    const properties = [
      'name version',
      'name version description',
      'config.environment config.port',
      'metadata.versioning metadata.environment.supportedEnvironments',
      'scripts.version:status scripts.version:validate',
    ];

    for (const prop of properties) {
      console.info(`📊 Getting: ${prop}`);
      try {
        const result = execSync(`bun pm pkg get ${prop}`, { encoding: 'utf8' });
        console.info(`✅ Result: ${result.trim().substring(0, 100)}...\n`);
      } catch (error) {
        console.info(`❌ Error: ${error}\n`);
      }
    }
  }

  async demonstrateVersionCommands(): Promise<void> {
    console.info('🚀 Demonstrating Enhanced Version Commands\n');

    const commands = [
      { name: 'Version Status', command: 'bun run version:status' },
      { name: 'Version Validation', command: 'bun run version:validate' },
      { name: 'Current Version', command: 'bun pm pkg get version' },
      { name: 'Version Metadata', command: 'bun pm pkg get metadata.versioning' },
    ];

    for (const cmd of commands) {
      console.info(`📋 ${cmd.name}:`);
      try {
        const result = execSync(cmd.command, { encoding: 'utf8' });
        console.info(`✅ ${result.trim().substring(0, 80)}...\n`);
      } catch (error) {
        console.info(`❌ Error: ${error}\n`);
      }
    }
  }

  async demonstrateVersionWorkflow(): Promise<void> {
    console.info('🔄 Demonstrating Complete Version Workflow\n');

    console.info('1️⃣ Current State:');
    try {
      const currentVersion = execSync('bun pm pkg get version', { encoding: 'utf8' });
      console.info(`   Current Version: ${currentVersion.trim()}`);
    } catch (error) {
      console.info(`   ❌ Could not get current version: ${error}`);
    }

    console.info('\n2️⃣ Version Metadata:');
    try {
      const metadata = execSync('bun pm pkg get metadata.versioning', { encoding: 'utf8' });
      console.info(`   Metadata: ${metadata.trim().substring(0, 100)}...`);
    } catch (error) {
      console.info(`   ❌ Could not get metadata: ${error}`);
    }

    console.info('\n3️⃣ Available Scripts:');
    try {
      const scripts = execSync('bun pm pkg get scripts | grep version', { encoding: 'utf8' });
      console.info(`   Version Scripts: ${scripts.trim().substring(0, 100)}...`);
    } catch (error) {
      console.info(`   ❌ Could not get scripts: ${error}`);
    }

    console.info('\n4️⃣ Environment Configuration:');
    try {
      const env = execSync('bun pm pkg get config.environment config.envFiles', {
        encoding: 'utf8',
      });
      console.info(`   Environment Config: ${env.trim().substring(0, 100)}...`);
    } catch (error) {
      console.info(`   ❌ Could not get environment config: ${error}`);
    }
  }

  async showIntegrationBenefits(): Promise<void> {
    console.info('💡 Version Integration Benefits\n');

    console.info('✅ Multiple Property Retrieval:');
    console.info('   • Get multiple values in one command');
    console.info('   • Efficient batch operations');
    console.info('   • Structured JSON output');

    console.info('\n✅ Enhanced Version Management:');
    console.info('   • Automated version bumping');
    console.info('   • Metadata synchronization');
    console.info('   • Release notes generation');
    console.info('   • Version validation');

    console.info('\n✅ CI/CD Integration:');
    console.info('   • Version-aware deployments');
    console.info('   • Automated testing with version context');
    console.info('   • Environment-specific configurations');

    console.info('\n✅ Developer Experience:');
    console.info('   • Single command for common operations');
    console.info('   • Consistent output format');
    console.info('   • Error handling and validation');
  }

  async runIntegrationDemo(): Promise<void> {
    console.info('🎯 Fire22 Dashboard - Version Integration Demo\n');
    console.info('This demo showcases the enhanced versioning capabilities');
    console.info('and bun pm pkg integration features.\n');

    await this.demonstrateMultiplePropertyRetrieval();
    await this.demonstrateVersionCommands();
    await this.demonstrateVersionWorkflow();
    await this.showIntegrationBenefits();

    console.info('🎉 Version Integration Demo Complete!\n');
    console.info('🚀 Next Steps:');
    console.info('   1. Use bun pm pkg get with multiple properties');
    console.info('   2. Run version management commands');
    console.info('   3. Integrate versioning into your CI/CD pipeline');
    console.info('   4. Customize version metadata for your needs');
  }
}

// CLI Interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  const integration = new VersionIntegration();

  try {
    switch (command) {
      case 'demo':
        await integration.runIntegrationDemo();
        break;

      case 'properties':
        await integration.demonstrateMultiplePropertyRetrieval();
        break;

      case 'commands':
        await integration.demonstrateVersionCommands();
        break;

      case 'workflow':
        await integration.demonstrateVersionWorkflow();
        break;

      case 'benefits':
        await integration.showIntegrationBenefits();
        break;

      default:
        console.info('🎯 Fire22 Dashboard - Version Integration\n');
        console.info('Usage:');
        console.info('  bun run version:integration demo       - Run full demo');
        console.info('  bun run version:integration properties - Show property retrieval');
        console.info('  bun run version:integration commands   - Show version commands');
        console.info('  bun run version:integration workflow   - Show version workflow');
        console.info('  bun run version:integration benefits   - Show integration benefits');
        console.info('\nExamples:');
        console.info('  bun run version:integration demo');
        console.info('  bun pm pkg get name version description');
        console.info('  bun run version:status');
        break;
    }
  } catch (error) {
    console.error('❌ Version integration error:', error);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
