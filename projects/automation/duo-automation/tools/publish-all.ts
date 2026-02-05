#!/usr/bin/env bun

// tools/publish-all.ts
import { $ } from "bun";
import { join } from "path";
import { file } from "bun";

interface PackageConfig {
  name: string;
  version: string;
  path: string;
  dependencies?: Record<string, string>;
}

interface PublishConfig {
  registry: string;
  token: string;
  packages: PackageConfig[];
}

class ComponentPublisher {
  private config: PublishConfig;
  
  constructor() {
    this.config = this.loadConfig();
  }
  
  private loadConfig(): PublishConfig {
    try {
      const configPath = join(process.cwd(), 'publish.config.json');
      const configData = readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (error) {
      console.error('Failed to load publish config:', error);
      process.exit(1);
    }
  }
  
  async publishAll() {
    console.log('🚀 Publishing DuoPlus Enterprise Components...\n');
    
    // Set registry
    process.env.NPM_CONFIG_REGISTRY = this.config.registry;
    process.env.NPM_CONFIG_AUTH_TOKEN = this.config.token;
    
    // Validate all packages first
    console.log('📋 Validating packages...');
    for (const pkg of this.config.packages) {
      await this.validatePackage(pkg);
    }
    
    // Build all packages
    console.log('\n🔨 Building packages...');
    for (const pkg of this.config.packages) {
      await this.buildPackage(pkg);
    }
    
    // Test all packages
    console.log('\n🧪 Testing packages...');
    for (const pkg of this.config.packages) {
      await this.testPackage(pkg);
    }
    
    // Publish packages in dependency order
    console.log('\n📦 Publishing packages...');
    for (const pkg of this.config.packages) {
      await this.publishPackage(pkg);
    }
    
    console.log('\n✅ All packages published successfully!');
    this.generateReport();
  }
  
  private async validatePackage(pkg: PackageConfig) {
    console.log(`  ✓ Validating ${pkg.name}...`);
    
    // Check package.json exists
    const packageJsonPath = join(pkg.path, 'package.json');
    try {
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      if (packageJson.name !== pkg.name) {
        throw new Error(`Package name mismatch: expected ${pkg.name}, got ${packageJson.name}`);
      }
      
      if (packageJson.version !== pkg.version) {
        throw new Error(`Version mismatch: expected ${pkg.version}, got ${packageJson.version}`);
      }
      
      // Check required files
      const requiredFiles = ['README.md', 'LICENSE'];
      for (const file of requiredFiles) {
        const filePath = join(pkg.path, file);
        try {
          readFileSync(filePath, 'utf8');
        } catch {
          console.warn(`    ⚠️  Missing ${file}`);
        }
      }
      
    } catch (error) {
      throw new Error(`Validation failed for ${pkg.name}: ${error.message}`);
    }
  }
  
  private async buildPackage(pkg: PackageConfig) {
    console.log(`  🔨 Building ${pkg.name}...`);
    
    try {
      await $`cd ${pkg.path} && bun run build`.quiet();
      console.log(`    ✅ Build complete`);
    } catch (error) {
      throw new Error(`Build failed for ${pkg.name}: ${error.message}`);
    }
  }
  
  private async testPackage(pkg: PackageConfig) {
    console.log(`  🧪 Testing ${pkg.name}...`);
    
    try {
      await $`cd ${pkg.path} && bun test`.quiet();
      console.log(`    ✅ Tests passed`);
    } catch (error) {
      throw new Error(`Tests failed for ${pkg.name}: ${error.message}`);
    }
  }
  
  private async publishPackage(pkg: PackageConfig) {
    console.log(`  📦 Publishing ${pkg.name}@${pkg.version}...`);
    
    try {
      // Check if already published
      const checkResult = await $`npm view ${pkg.name}@${pkg.version} --registry=${this.config.registry}`.quiet().nothrow();
      
      if (checkResult.exitCode === 0) {
        console.log(`    ⚠️  Already published, skipping...`);
        return;
      }
      
      // Publish the package
      await $`cd ${pkg.path} && bun publish --registry=${this.config.registry}`.quiet();
      console.log(`    ✅ Published successfully`);
      
    } catch (error) {
      throw new Error(`Publish failed for ${pkg.name}: ${error.message}`);
    }
  }
  
  private generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      registry: this.config.registry,
      packages: this.config.packages.map(pkg => ({
        name: pkg.name,
        version: pkg.version,
        status: 'published'
      }))
    };
    
    const reportPath = join(process.cwd(), 'publish-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Report generated: ${reportPath}`);
  }
}

// CLI interface
const publisher = new ComponentPublisher();

if (import.meta.main) {
  const command = process.argv[2];
  
  switch (command) {
    case 'validate':
      console.log('📋 Validating all packages...');
      for (const pkg of publisher.config.packages) {
        await publisher.validatePackage(pkg);
      }
      console.log('✅ All packages validated!');
      break;
      
    case 'build':
      console.log('🔨 Building all packages...');
      for (const pkg of publisher.config.packages) {
        await publisher.buildPackage(pkg);
      }
      console.log('✅ All packages built!');
      break;
      
    case 'test':
      console.log('🧪 Testing all packages...');
      for (const pkg of publisher.config.packages) {
        await publisher.testPackage(pkg);
      }
      console.log('✅ All packages tested!');
      break;
      
    case 'publish':
      await publisher.publishAll();
      break;
      
    default:
      console.log(`
Usage: bun run tools/publish-all.ts [command]

Commands:
  validate   - Validate all packages
  build      - Build all packages
  test       - Test all packages
  publish    - Validate, build, test, and publish all packages
      `);
  }
}
