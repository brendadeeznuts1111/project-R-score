#!/usr/bin/env bun

// tools/publish-to-cloudflare.ts
import { $ } from "bun";
import { join } from "path";

interface PackageConfig {
  name: string;
  version: string;
  path: string;
  dependencies?: Record<string, string>;
}

interface CloudflarePublishConfig {
  registry: string;
  token: string;
  packages: PackageConfig[];
}

class CloudflarePublisher {
  private config: CloudflarePublishConfig;
  
  constructor(config: CloudflarePublishConfig) {
    this.config = config;
  }
  
  async publishAll() {
    console.log('🚀 Publishing DuoPlus Enterprise Components to Cloudflare Registry...\n');
    
    // Validate configuration
    await this.validateConfig();
    
    // Publish packages in dependency order
    for (const pkg of this.config.packages) {
      await this.publishPackage(pkg);
    }
    
    console.log('\n✅ All packages published successfully!');
    this.generateReport();
  }
  
  private async validateConfig() {
    console.log('🔍 Validating configuration...');
    
    if (!this.config.registry) {
      throw new Error('Registry URL is required');
    }
    
    if (!this.config.token) {
      throw new Error('Registry token is required');
    }
    
    // Test registry connection
    try {
      const response = await fetch(`${this.config.registry}/health`);
      if (!response.ok) {
        throw new Error('Registry health check failed');
      }
      console.log('  ✅ Registry connection successful');
    } catch (error) {
      throw new Error(`Registry connection failed: ${error.message}`);
    }
  }
  
  private async publishPackage(pkg: PackageConfig) {
    console.log(`📦 Publishing ${pkg.name}@${pkg.version}...`);
    
    try {
      // 1. Validate package
      await this.validatePackage(pkg);
      
      // 2. Build package
      await this.buildPackage(pkg);
      
      // 3. Create tarball
      const tarballPath = await this.createTarball(pkg);
      
      // 4. Upload to registry
      await this.uploadToRegistry(pkg, tarballPath);
      
      // 5. Verify publication
      await this.verifyPublication(pkg);
      
      console.log(`  ✅ ${pkg.name} published successfully`);
      
    } catch (error) {
      throw new Error(`Failed to publish ${pkg.name}: ${error.message}`);
    }
  }
  
  private async validatePackage(pkg: PackageConfig) {
    console.log(`  🔍 Validating ${pkg.name}...`);
    
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
      
      console.log(`    ✅ Package validation passed`);
      
    } catch (error) {
      throw new Error(`Package validation failed: ${error.message}`);
    }
  }
  
  private async buildPackage(pkg: PackageConfig) {
    console.log(`  🔨 Building ${pkg.name}...`);
    
    try {
      await $`cd ${pkg.path} && bun run build`.quiet();
      console.log(`    ✅ Build complete`);
    } catch (error) {
      throw new Error(`Build failed: ${error.message}`);
    }
  }
  
  private async createTarball(pkg: PackageConfig): Promise<string> {
    console.log(`  📦 Creating tarball for ${pkg.name}...`);
    
    const tarballName = `${pkg.name.replace('@', '').replace('/', '-')}-${pkg.version}.tgz`;
    const tempDir = join(process.cwd(), 'temp');
    
    try {
      // Create temp directory
      await $`mkdir -p ${tempDir}`.quiet();
      
      // Copy package files
      const packageDir = join(tempDir, 'package');
      await $`cp -r ${pkg.path}/* ${packageDir}`.quiet();
      
      // Create tarball
      const tarballPath = join(tempDir, tarballName);
      await $`cd ${tempDir} && tar -czf ${tarballName} package/`.quiet();
      
      console.log(`    ✅ Tarball created: ${tarballName}`);
      return tarballPath;
      
    } catch (error) {
      throw new Error(`Tarball creation failed: ${error.message}`);
    }
  }
  
  private async uploadToRegistry(pkg: PackageConfig, tarballPath: string) {
    console.log(`  ⬆️  Uploading ${pkg.name} to registry...`);
    
    try {
      // Read package metadata
      const packageJsonPath = join(pkg.path, 'package.json');
      const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));
      
      // Read tarball
      const tarballBuffer = await Bun.file(tarballPath).arrayBuffer();
      
      // Prepare upload data
      const uploadData = {
        metadata: packageJson,
        tarball: Array.from(new Uint8Array(tarballBuffer))
      };
      
      // Upload to registry
      const response = await fetch(`${this.config.registry}/@duoplus/${pkg.name.split('/')[1]}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${this.config.token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(uploadData)
      });
      
      if (!response.ok) {
        const error = await response.text();
        throw new Error(`Upload failed: ${error}`);
      }
      
      const result = await response.json();
      console.log(`    ✅ Upload successful: ${result.url}`);
      
    } catch (error) {
      throw new Error(`Upload failed: ${error.message}`);
    }
  }
  
  private async verifyPublication(pkg: PackageConfig) {
    console.log(`  ✅ Verifying publication of ${pkg.name}...`);
    
    try {
      const response = await fetch(`${this.config.registry}/@duoplus/${pkg.name.split('/')[1]}/${pkg.version}`);
      
      if (!response.ok) {
        throw new Error('Package not found after publication');
      }
      
      const metadata = await response.json();
      
      if (metadata.name !== pkg.name || metadata.version !== pkg.version) {
        throw new Error('Package metadata mismatch');
      }
      
      console.log(`    ✅ Publication verified`);
      
    } catch (error) {
      throw new Error(`Verification failed: ${error.message}`);
    }
  }
  
  private generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      registry: this.config.registry,
      packages: this.config.packages.map(pkg => ({
        name: pkg.name,
        version: pkg.version,
        status: 'published',
        url: `${this.config.registry}/@duoplus/${pkg.name.split('/')[1]}/${pkg.version}`
      }))
    };
    
    const reportPath = join(process.cwd(), 'cloudflare-publish-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log(`\n📊 Report generated: ${reportPath}`);
    
    // Create installation instructions
    const instructions = `
# DuoPlus Enterprise Components - Installation

## Registry Configuration

Add this to your \`.npmrc\`:

\`\`
@duoplus:registry=${this.config.registry}
//${this.config.registry.replace('https://', '')}/:_authToken=${this.config.token}
always-auth=true
\`\`

## Installation

\`\`bash
# Install all packages
bun add @duoplus/core @duoplus/disputes @duoplus/monitoring

# Install individual packages
bun add @duoplus/core
bun add @duoplus/disputes
bun add @duoplus/monitoring
\`\`

## Published Packages

${this.config.packages.map(pkg => 
  `- **${pkg.name}@${pkg.version}**: ${this.config.registry}/@duoplus/${pkg.name.split('/')[1]}/${pkg.version}`
).join('\n')}

## Verification

\`\`bash
# Verify installation
bunx @duoplus/core --version
bunx @duoplus/disputes --version
bunx @duoplus/monitoring --version
\`\`
    `.trim();
    
    writeFileSync('INSTALLATION.md', instructions);
    console.log('📝 Installation instructions created: INSTALLATION.md');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  // Load configuration
  const configPath = join(process.cwd(), 'publish.config.json');
  let config: CloudflarePublishConfig;
  
  try {
    const configData = readFileSync(configPath, 'utf8');
    config = JSON.parse(configData);
  } catch (error) {
    console.error('Failed to load publish.config.json:', error.message);
    process.exit(1);
  }
  
  // Override with environment variables
  config.registry = process.env.DUOPLUS_REGISTRY_URL || config.registry;
  config.token = process.env.DUOPLUS_REGISTRY_TOKEN || config.token;
  
  const publisher = new CloudflarePublisher(config);
  
  switch (command) {
    case 'publish':
      await publisher.publishAll();
      break;
      
    case 'validate':
      console.log('🔍 Validating configuration...');
      await publisher.validateConfig();
      console.log('✅ Configuration valid');
      break;
      
    default:
      console.log(`
Usage: bun run tools/publish-to-cloudflare.ts [command]

Commands:
  publish   - Publish all packages to Cloudflare registry
  validate  - Validate configuration and registry connection

Environment Variables:
  DUOPLUS_REGISTRY_URL   - Registry URL (overrides config)
  DUOPLUS_REGISTRY_TOKEN - Registry token (overrides config)

Example:
  export DUOPLUS_REGISTRY_URL=https://registry.duoplus.com
  export DUOPLUS_REGISTRY_TOKEN=your-token
  bun run tools/publish-to-cloudflare.ts publish
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
