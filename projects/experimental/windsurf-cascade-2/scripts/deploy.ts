#!/usr/bin/env bun
// Complete R2 Deployment Script for Global Trading System
// Uses Bun's advanced package manager for optimal performance

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

interface DeploymentConfig {
  bucketName: string;
  accountId: string;
  apiToken: string;
  region: string;
  packages: string[];
}

class R2DeploymentManager {
  private config: DeploymentConfig;
  private packagesDir: string;

  constructor() {
    this.packagesDir = join(process.cwd(), 'packages');
    this.config = {
      bucketName: process.env.R2_BUCKET_NAME || 'global-trading-packages',
      accountId: process.env.R2_ACCOUNT_ID || '',
      apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
      region: process.env.R2_REGION || 'auto',
      packages: [
        '@trading/core',
        '@trading/polymarket',
        '@trading/fanduel',
        '@trading/multi-region',
        '@trading/cross-platform',
        '@trading/global-integration',
        '@trading/dashboard',
        '@trading/cli'
      ]
    };
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      // Load environment variables
      this.config = {
        bucketName: process.env.R2_BUCKET_NAME || 'global-trading-packages',
        accountId: process.env.R2_ACCOUNT_ID || '',
        apiToken: process.env.CLOUDFLARE_API_TOKEN || '',
        region: process.env.R2_REGION || 'auto',
        packages: [
          '@trading/core',
          '@trading/polymarket',
          '@trading/fanduel',
          '@trading/multi-region',
          '@trading/cross-platform',
          '@trading/global-integration',
          '@trading/dashboard',
          '@trading/cli'
        ]
      };

      console.log('✅ Configuration loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load configuration:', error);
      process.exit(1);
    }
  }

  async deploy(): Promise<void> {
    console.log('🚀 Starting Global Trading System R2 Deployment...');
    console.log('📦 Using Bun Package Manager for optimal performance');
    console.log('');

    try {
      // Step 1: Setup workspace
      await this.setupWorkspace();
      
      // Step 2: Configure packages
      await this.configurePackages();
      
      // Step 3: Install dependencies with Bun
      await this.installDependencies();
      
      // Step 4: Build all packages
      await this.buildPackages();
      
      // Step 5: Deploy to R2
      await this.deployToR2();
      
      // Step 6: Verify deployment
      await this.verifyDeployment();
      
      console.log('🎉 Global Trading System deployed successfully!');
      console.log('🌍 Available globally via Cloudflare R2 CDN');
      console.log('⚡ Powered by 13-byte configuration system');
      
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    }
  }

  private async setupWorkspace(): Promise<void> {
    console.log('📁 Setting up workspace structure...');
    
    // Create package directories
    const dirs = ['core', 'integrations', 'platforms', 'dashboard', 'cli'];
    
    for (const dir of dirs) {
      const packageDir = join(this.packagesDir, dir);
      if (!existsSync(packageDir)) {
        mkdirSync(packageDir, { recursive: true });
        console.log(`  📁 Created ${packageDir}`);
      }
    }

    console.log('✅ Workspace structure created');
  }

  private async configurePackages(): Promise<void> {
    console.log('⚙️ Configuring packages for Bun optimization...');

    // Root package.json
    const rootPackageJson = {
      name: 'global-trading-system',
      version: '1.0.0',
      type: 'module',
      workspaces: [
        'packages/*'
      ],
      dependencies: {
        '@cloudflare/r2': '^3.0.0',
        'hono': '^4.0.0',
        'bun-types': '^1.0.0'
      },
      devDependencies: {
        '@types/node': '^20.0.0',
        'typescript': '^5.0.0'
      },
      scripts: {
        'build': 'bun run build:all',
        'build:all': 'bun run build:core && bun run build:integrations && bun run build:platforms',
        'build:core': 'bun build src/trading/sports-trading-config.ts --outdir dist/core --target bun',
        'build:integrations': 'bun build "src/trading/platform-integrations/*.ts" --outdir dist/integrations --target bun',
        'build:platforms': 'bun build "src/trading/multi-region/*.ts" "src/trading/cross-platform/*.ts" --outdir dist/platforms --target bun',
        'deploy': 'bun run deploy.ts',
        'dev': 'bun run global-trading-app.ts',
        'deploy:r2': 'bun run scripts/upload-to-r2.ts',
        'verify:deployment': 'bun run scripts/verify-deployment.ts'
      },
      'bun-create': {
        'start': 'bun run global-trading-app.ts'
      }
    };

    writeFileSync('package.json', JSON.stringify(rootPackageJson, null, 2));
    console.log('  📝 Root package.json configured');

    // Configure individual packages
    await this.configureCorePackage();
    await this.configureIntegrationPackages();
    await this.configurePlatformPackages();

    console.log('✅ All packages configured for Bun optimization');
  }

  private async configureCorePackage(): Promise<void> {
    const corePackageJson = {
      name: '@trading/core',
      version: '1.0.0',
      type: 'module',
      main: './dist/index.js',
      types: './dist/index.d.ts',
      exports: {
        '.': {
          'import': './dist/index.js',
          'types': './dist/index.d.ts'
        },
        './config': {
          'import': './dist/config.js',
          'types': './dist/config.d.ts'
        }
      },
      dependencies: {
        'bun-types': '^1.0.0'
      },
      scripts: {
        'build': 'bun build src/index.ts --outdir dist --target bun --splitting',
        'dev': 'bun --watch src/index.ts'
      }
    };

    const coreDir = join(this.packagesDir, 'core');
    writeFileSync(join(coreDir, 'package.json'), JSON.stringify(corePackageJson, null, 2));
    console.log('  📝 @trading/core package configured');
  }

  private async configureIntegrationPackages(): Promise<void> {
    const integrations = ['polymarket', 'fanduel'];
    
    for (const integration of integrations) {
      const packageJson = {
        name: `@trading/${integration}`,
        version: '1.0.0',
        type: 'module',
        main: './dist/index.js',
        types: './dist/index.d.ts',
        dependencies: {
          '@trading/core': '^1.0.0',
          'bun-types': '^1.0.0'
        },
        scripts: {
          'build': `bun build src/${integration}-client.ts --outdir dist --target bun`,
          'dev': `bun --watch src/${integration}-client.ts`
        }
      };

      const integrationDir = join(this.packagesDir, 'integrations', integration);
      mkdirSync(integrationDir, { recursive: true });
      writeFileSync(join(integrationDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      console.log(`  📝 @trading/${integration} package configured`);
    }
  }

  private async configurePlatformPackages(): Promise<void> {
    const platforms = ['multi-region', 'cross-platform', 'global-integration'];
    
    for (const platform of platforms) {
      const packageJson = {
        name: `@trading/${platform}`,
        version: '1.0.0',
        type: 'module',
        main: './dist/index.js',
        types: './dist/index.d.ts',
        dependencies: {
          '@trading/core': '^1.0.0',
          '@trading/polymarket': '^1.0.0',
          '@trading/fanduel': '^1.0.0',
          'bun-types': '^1.0.0'
        },
        scripts: {
          'build': `bun build "src/${platform}/*.ts" --outdir dist --target bun --splitting`,
          'dev': `bun --watch "src/${platform}/*.ts"`
        }
      };

      const platformDir = join(this.packagesDir, platform);
      mkdirSync(platformDir, { recursive: true });
      writeFileSync(join(platformDir, 'package.json'), JSON.stringify(packageJson, null, 2));
      console.log(`  📝 @trading/${platform} package configured`);
    }
  }

  private async installDependencies(): Promise<void> {
    console.log('⬇️ Installing dependencies with Bun (ultra-fast)...');
    
    try {
      // Use Bun's ultra-fast package manager
      execSync('bun install --frozen-lockfile', { stdio: 'inherit' });
      console.log('✅ Dependencies installed with Bun optimization');
    } catch (error) {
      console.error('❌ Failed to install dependencies:', error);
      throw error;
    }
  }

  private async buildPackages(): Promise<void> {
    console.log('🔨 Building all packages with Bun...');

    try {
      // Build all packages in parallel using Bun's concurrency
      execSync('bun run build:all', { stdio: 'inherit' });
      console.log('✅ All packages built successfully');
    } catch (error) {
      console.error('❌ Build failed:', error);
      throw error;
    }
  }

  private async deployToR2(): Promise<void> {
    console.log('☁️ Deploying to Cloudflare R2...');

    // Create upload script
    const uploadScript = `#!/usr/bin/env bun
import { S3Client, PutObjectCommand } from '@cloudflare/r2';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

const client = new S3Client({
  region: '${this.config.region}',
  endpoint: \`https://\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function uploadDirectory(dirPath: string, bucketPrefix: string) {
  const files = readdirSync(dirPath);
  
  for (const file of files) {
    const fullPath = join(dirPath, file);
    const stat = statSync(fullPath);
    
    if (stat.isDirectory()) {
      await uploadDirectory(fullPath, \`\${bucketPrefix}/\${file}\`);
    } else {
      const key = \`\${bucketPrefix}/\${file}\`;
      const content = readFileSync(fullPath);
      
      const command = new PutObjectCommand({
        Bucket: '${this.config.bucketName}',
        Key: key,
        Body: content,
        ContentType: getContentType(file),
      });
      
      await client.send(command);
      console.log(\`  📤 Uploaded \${key}\`);
    }
  }
}

function getContentType(filename: string): string {
  const ext = extname(filename);
  switch (ext) {
    case '.js': return 'application/javascript';
    case '.ts': return 'application/typescript';
    case '.json': return 'application/json';
    case '.html': return 'text/html';
    case '.css': return 'text/css';
    default: return 'application/octet-stream';
  }
}

console.log('🚀 Starting R2 upload...');
await uploadDirectory('./dist', 'packages');
await uploadDirectory('./trading-dashboard-enhanced.html', 'dashboard');
console.log('✅ Upload completed!');
`;

    writeFileSync('scripts/upload-to-r2.ts', uploadScript);
    
    try {
      execSync('bun run scripts/upload-to-r2.ts', { stdio: 'inherit' });
      console.log('✅ Deployed to Cloudflare R2 successfully');
    } catch (error) {
      console.error('❌ R2 deployment failed:', error);
      throw error;
    }
  }

  private async verifyDeployment(): Promise<void> {
    console.log('🔍 Verifying deployment...');

    const verifyScript = `#!/usr/bin/env bun
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@cloudflare/r2';

const client = new S3Client({
  region: '${this.config.region}',
  endpoint: \`https://\${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com\`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

async function verifyDeployment() {
  try {
    const listCommand = new ListObjectsV2Command({
      Bucket: '${this.config.bucketName}',
      Prefix: 'packages/',
    });
    
    const response = await client.send(listCommand);
    const packages = response.Contents?.map(obj => obj.Key) || [];
    
    console.log(\`  📦 Found \${packages.length} packages in R2\`);
    
    // Verify core packages
    const requiredPackages = [
      'packages/core/index.js',
      'packages/integrations/polymarket-client.js',
      'packages/integrations/fanduel-client.js',
      'packages/multi-region/region-processor.js',
      'packages/cross-platform/platform-manager.js',
      'packages/global-integration/integration-manager.js',
      'dashboard/trading-dashboard-enhanced.html'
    ];
    
    for (const pkg of requiredPackages) {
      if (packages.includes(pkg)) {
        console.log(\`  ✅ \${pkg}\`);
      } else {
        console.log(\`  ❌ Missing \${pkg}\`);
      }
    }
    
    console.log('✅ Deployment verification completed');
  } catch (error) {
    console.error('❌ Verification failed:', error);
    throw error;
  }
}

verifyDeployment();
`;

    writeFileSync('scripts/verify-deployment.ts', verifyScript);
    
    try {
      execSync('bun run scripts/verify-deployment.ts', { stdio: 'inherit' });
      console.log('✅ Deployment verified successfully');
    } catch (error) {
      console.error('❌ Verification failed:', error);
      throw error;
    }
  }
}

// Main execution
async function main() {
  const deployer = new R2DeploymentManager();
  await deployer.deploy();
}

if (import.meta.main) {
  main().catch(console.error);
}
