// cli/commands/registry.ts - NPM Registry Management CLI

import { Command } from 'commander';
import { $ } from 'bun';

const REGISTRY_URL = 'https://duo-npm-registry.utahj4754.workers.dev';
const PACKAGE_NAME = 'windsurf-project';

export const registryCommand = new Command('registry')
  .description('Manage custom NPM registry v3.7')
  .version('3.7.0');

// Info command
registryCommand
  .command('info')
  .description('Get package information from registry')
  .argument('[package]', 'Package name', PACKAGE_NAME)
  .option('-j, --json', 'Output as JSON')
  .action(async (packageName, options) => {
    try {
      console.info(`🔍 Getting info for: ${packageName}`);
      console.info(`🌐 Registry: ${REGISTRY_URL}`);
      
      const response = await fetch(`${REGISTRY_URL}/${packageName}`, {
        headers: {
          'Authorization': `Bearer Njk3NjVkZDczODc2NmJjYTM4YmU2M2U3ZDAxOTJjZjg6MWQ5MzI2ZmZiMGM1OWViZWNiNjEyZjQwMWE4N2Y3MTk0MjU3NDk4NDM3NWZiMjgzZmM0MzU5NjMwZDdkOTI5YQ==`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const packageData = await response.json();
      
      if (options.json) {
        console.info(JSON.stringify(packageData, null, 2));
      } else {
        console.info('✅ Package info retrieved:');
        console.info(`📦 Name: ${packageData.name}`);
        console.info(`📋 Latest version: ${packageData['dist-tags']?.latest}`);
        console.info(`📋 Description: ${packageData.description || 'Enterprise automation framework with CLI tools and utilities'}`);
        console.info(`📋 Versions available: ${Object.keys(packageData.versions || {}).join(', ')}`);
        console.info(`📋 Maintainers: ${packageData.maintainers?.map((m: any) => m.name).join(', ') || 'Unknown'}`);
        
        if (packageData.repository) {
          console.info(`📋 Repository: ${packageData.repository.url || packageData.repository}`);
        }
        
        if (packageData.bin) {
          console.info(`📋 Binaries: ${Object.keys(packageData.bin).join(', ')}`);
        }
      }
    } catch (error: unknown) {
      console.error('❌ Failed to get package info:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Search command
registryCommand
  .command('search')
  .description('Search available packages in registry')
  .option('-j, --json', 'Output as JSON')
  .action(async (options) => {
    try {
      console.info(`🔍 Searching registry: ${REGISTRY_URL}`);
      
      const response = await fetch(`${REGISTRY_URL}/${PACKAGE_NAME}`, {
        headers: {
          'Authorization': `Bearer Njk3NjVkZDczODc2NmJjYTM4YmU2M2U3ZDAxOTJjZjg6MWQ5MzI2ZmZiMGM1OWViZWNiNjEyZjQwMWE4N2Y3MTk0MjU3NDk4NDM3NWZiMjgzZmM0MzU5NjMwZDdkOTI5YQ==`
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const packageData = await response.json();
      
      if (options.json) {
        console.info(JSON.stringify([packageData], null, 2));
      } else {
        console.info('📋 Available packages:');
        console.info('✅ Registry is accessible');
        console.info(`📦 Found package: ${packageData.name}`);
        console.info(`📋 Version: ${packageData['dist-tags']?.latest}`);
        console.info(`📋 Description: ${packageData.description || 'Enterprise automation framework with CLI tools and utilities'}`);
        console.info(`📋 Size: ${packageData.dist?.unpackedSize ? `${packageData.dist.unpackedSize} bytes` : '8.35MB (unpacked)'}`);
        
        console.info('\n💡 To get detailed info for a specific package:');
        console.info('   windsurf-cli registry info <package-name>');
      }
    } catch (error: unknown) {
      console.error('❌ Failed to access registry:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Publish command
registryCommand
  .command('publish')
  .description('Publish package to registry')
  .option('-d, --dry-run', 'Dry run without actually publishing')
  .action(async (options) => {
    try {
      console.info('🚀 Publishing to custom NPM registry v3.7');
      
      if (options.dryRun) {
        console.info('🔍 DRY RUN: Would publish with the following configuration:');
        console.info(`🌐 Registry: ${REGISTRY_URL}`);
        console.info('📦 Package: windsurf-project');
        console.info('🔐 Authentication: Bearer token');
        console.info('⚠️  This is a dry run - no actual publishing will occur');
        return;
      }

      // Load environment variables from .env.local
      const envFile = await Bun.file('.env.local').text();
      const envVars: Record<string, string> = {};

      envFile.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          envVars[key] = valueParts.join('=');
        }
      });

      // Run the publish script
      const result = await $`bun scripts/publish.ts`.env(envVars).quiet();

      if (result.exitCode === 0) {
        console.info('✅ Package published successfully to registry v3.7!');
      } else {
        console.error('❌ Publish failed');
        process.exit(1);
      }
    } catch (error: unknown) {
      console.error('❌ Failed to publish:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Test command
registryCommand
  .command('test')
  .description('Test registry deployment and accessibility')
  .action(async () => {
    try {
      console.info('🧪 Testing deployment from registry...');
      
      // Run the test script
      const result = await $`bun scripts/test-install.ts`.quiet();

      if (result.exitCode === 0) {
        console.info('✅ Registry deployment test passed!');
      } else {
        console.error('❌ Registry deployment test failed');
        process.exit(1);
      }
    } catch (error: unknown) {
      console.error('❌ Failed to test registry:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Install command
registryCommand
  .command('install')
  .description('Install package from custom registry')
  .argument('[package]', 'Package name', PACKAGE_NAME)
  .option('-g, --global', 'Install globally')
  .option('-D, --save-dev', 'Save as dev dependency')
  .action(async (packageName, options) => {
    try {
      console.info(`📦 Installing ${packageName} from custom registry...`);
      
      let installCmd = `bun install ${packageName} --registry ${REGISTRY_URL}`;
      
      if (options.global) {
        installCmd += ' --global';
      }
      
      if (options.saveDev) {
        installCmd += ' --save-dev';
      }

      const result = await $`${installCmd}`.quiet();

      if (result.exitCode === 0) {
        console.info('✅ Package installed successfully!');
      } else {
        console.error('❌ Installation failed');
        process.exit(1);
      }
    } catch (error: unknown) {
      console.error('❌ Failed to install:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });

// Status command
registryCommand
  .command('status')
  .description('Show registry status and information')
  .action(async () => {
    try {
      console.info('📊 NPM Registry v3.7 Status');
      console.info('='.repeat(40));
      console.info(`🌐 URL: ${REGISTRY_URL}`);
      console.info(`📦 Package: ${PACKAGE_NAME}`);
      
      // Test registry accessibility
      const response = await fetch(`${REGISTRY_URL}/${PACKAGE_NAME}`, {
        headers: {
          'Authorization': `Bearer Njk3NjVkZDczODc2NmJjYTM4YmU2M2U3ZDAxOTJjZjg6MWQ5MzI2ZmZiMGM1OWViZWNiNjEyZjQwMWE4N2Y3MTk0MjU3NDk4NDM3NWZiMjgzZmM0MzU5NjMwZDdkOTI5YQ==`
        }
      });

      if (response.ok) {
        const packageData = await response.json();
        console.info(`✅ Status: Online and accessible`);
        console.info(`📋 Version: ${packageData['dist-tags']?.latest}`);
        console.info(`🔐 Authentication: Working`);
        console.info(`💾 Storage: Cloudflare R2`);
      } else {
        console.info(`❌ Status: Offline or error (${response.status})`);
      }
      
      console.info('\n🔧 Available Commands:');
      console.info('  windsurf-cli registry info     - Get package info');
      console.info('  windsurf-cli registry search   - Search packages');
      console.info('  windsurf-cli registry publish  - Publish package');
      console.info('  windsurf-cli registry test     - Test deployment');
      console.info('  windsurf-cli registry install  - Install package');
      console.info('  windsurf-cli registry status   - Show this status');
    } catch (error: unknown) {
      console.error('❌ Failed to get status:', error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  });
