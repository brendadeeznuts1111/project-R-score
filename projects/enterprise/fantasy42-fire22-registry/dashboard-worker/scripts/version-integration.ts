#!/usr/bin/env bun

/**
 * Version Integration Demo for Fire22 Dashboard
 * Demonstrates enhanced versioning capabilities with bun pm pkg integration
 */

import { execSync } from 'child_process';

class VersionIntegration {
  async demonstrateMultiplePropertyRetrieval(): Promise<void> {
    console.log('🔍 Demonstrating Multiple Property Retrieval\n');

    const properties = [
      'name version',
      'name version description',
      'config.environment config.port',
      'metadata.versioning metadata.environment.supportedEnvironments',
      'scripts.version:status scripts.version:validate',
    ];

    for (const prop of properties) {
      console.log(`📊 Getting: ${prop}`);
      try {
        const result = execSync(`bun pm pkg get ${prop}`, { encoding: 'utf8' });
        console.log(`✅ Result: ${result.trim().substring(0, 100)}...\n`);
      } catch (error) {
        console.log(`❌ Error: ${error}\n`);
      }
    }
  }

  async demonstrateVersionCommands(): Promise<void> {
    console.log('🚀 Demonstrating Enhanced Version Commands\n');

    const commands = [
      { name: 'Version Status', command: 'bun run version:status' },
      { name: 'Version Validation', command: 'bun run version:validate' },
      { name: 'Current Version', command: 'bun pm pkg get version' },
      { name: 'Version Metadata', command: 'bun pm pkg get metadata.versioning' },
    ];

    for (const cmd of commands) {
      console.log(`📋 ${cmd.name}:`);
      try {
        const result = execSync(cmd.command, { encoding: 'utf8' });
        console.log(`✅ ${result.trim().substring(0, 80)}...\n`);
      } catch (error) {
        console.log(`❌ Error: ${error}\n`);
      }
    }
  }

  async demonstrateVersionWorkflow(): Promise<void> {
    console.log('🔄 Demonstrating Complete Version Workflow\n');

    console.log('1️⃣ Current State:');
    try {
      const currentVersion = execSync('bun pm pkg get version', { encoding: 'utf8' });
      console.log(`   Current Version: ${currentVersion.trim()}`);
    } catch (error) {
      console.log(`   ❌ Could not get current version: ${error}`);
    }

    console.log('\n2️⃣ Version Metadata:');
    try {
      const metadata = execSync('bun pm pkg get metadata.versioning', { encoding: 'utf8' });
      console.log(`   Metadata: ${metadata.trim().substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ Could not get metadata: ${error}`);
    }

    console.log('\n3️⃣ Available Scripts:');
    try {
      const scripts = execSync('bun pm pkg get scripts | grep version', { encoding: 'utf8' });
      console.log(`   Version Scripts: ${scripts.trim().substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ Could not get scripts: ${error}`);
    }

    console.log('\n4️⃣ Environment Configuration:');
    try {
      const env = execSync('bun pm pkg get config.environment config.envFiles', {
        encoding: 'utf8',
      });
      console.log(`   Environment Config: ${env.trim().substring(0, 100)}...`);
    } catch (error) {
      console.log(`   ❌ Could not get environment config: ${error}`);
    }
  }

  async showIntegrationBenefits(): Promise<void> {
    console.log('💡 Version Integration Benefits\n');

    console.log('✅ Multiple Property Retrieval:');
    console.log('   • Get multiple values in one command');
    console.log('   • Efficient batch operations');
    console.log('   • Structured JSON output');

    console.log('\n✅ Enhanced Version Management:');
    console.log('   • Automated version bumping');
    console.log('   • Metadata synchronization');
    console.log('   • Release notes generation');
    console.log('   • Version validation');

    console.log('\n✅ CI/CD Integration:');
    console.log('   • Version-aware deployments');
    console.log('   • Automated testing with version context');
    console.log('   • Environment-specific configurations');

    console.log('\n✅ Developer Experience:');
    console.log('   • Single command for common operations');
    console.log('   • Consistent output format');
    console.log('   • Error handling and validation');
  }

  async runIntegrationDemo(): Promise<void> {
    console.log('🎯 Fire22 Dashboard - Version Integration Demo\n');
    console.log('This demo showcases the enhanced versioning capabilities');
    console.log('and bun pm pkg integration features.\n');

    await this.demonstrateMultiplePropertyRetrieval();
    await this.demonstrateVersionCommands();
    await this.demonstrateVersionWorkflow();
    await this.showIntegrationBenefits();

    console.log('🎉 Version Integration Demo Complete!\n');
    console.log('🚀 Next Steps:');
    console.log('   1. Use bun pm pkg get with multiple properties');
    console.log('   2. Run version management commands');
    console.log('   3. Integrate versioning into your CI/CD pipeline');
    console.log('   4. Customize version metadata for your needs');
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
        console.log('🎯 Fire22 Dashboard - Version Integration\n');
        console.log('Usage:');
        console.log('  bun run version:integration demo       - Run full demo');
        console.log('  bun run version:integration properties - Show property retrieval');
        console.log('  bun run version:integration commands   - Show version commands');
        console.log('  bun run version:integration workflow   - Show version workflow');
        console.log('  bun run version:integration benefits   - Show integration benefits');
        console.log('\nExamples:');
        console.log('  bun run version:integration demo');
        console.log('  bun pm pkg get name version description');
        console.log('  bun run version:status');
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
