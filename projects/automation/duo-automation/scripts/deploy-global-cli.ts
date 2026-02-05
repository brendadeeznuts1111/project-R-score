#!/usr/bin/env bun

/**
 * FactoryWager CLI Inspector - Production Deployment Script
 * Global CLI installation with enterprise features
 */

import { spawn } from 'child_process';
import { writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const CLI_NAME = 'factorywager';
const INSTALL_DIR = '/usr/local/bin';
const PACKAGE_NAME = 'factorywager-cli';

interface PackageConfig {
  name: string;
  version: string;
  description: string;
  bin: { [key: string]: string };
  scripts: { [key: string]: string };
  dependencies: { [key: string]: string };
  devDependencies: { [key: string]: string };
  files: string[];
  keywords: string[];
  author: string;
  license: string;
  repository: { type: string; url: string };
  engines: { [key: string]: string };
}

const PACKAGE_CONFIG: PackageConfig = {
  name: PACKAGE_NAME,
  version: '2.0.0',
  description: 'FactoryWager CLI Inspector - Enterprise Deployment with PCI/GDPR Compliance',
  bin: {
    'factorywager': './dist/cli.js',
    'fw': './dist/cli.js'
  },
  scripts: {
    build: 'bun build ./cli/factorywager-inspector-enhanced.ts --outdir ./dist --target node --minify',
    start: 'bun run ./cli/factorywager-inspector-enhanced.ts',
    dev: 'bun --watch ./cli/factorywager-inspector-enhanced.ts',
    test: 'bun test',
    'build:production': 'bun build ./cli/factorywager-inspector-enhanced.ts --outdir ./dist --target node --minify --external all',
    'deploy:global': 'bun run ./scripts/deploy-global.ts',
    'package': 'npm pack',
    'publish': 'npm publish'
  },
  dependencies: {
    'commander': '^11.0.0',
    'chalk': '^5.3.0',
    'readline': '^1.3.0'
  },
  devDependencies: {
    '@types/node': '^20.0.0',
    'bun-types': '^1.0.0',
    'typescript': '^5.0.0'
  },
  files: [
    'dist/**/*',
    'config/**/*',
    'server/**/*',
    'README.md',
    'LICENSE'
  ],
  keywords: [
    'factorywager',
    'cli',
    'inspector',
    'enterprise',
    'pci',
    'gdpr',
    'compliance',
    'qr-onboarding',
    'dashboard'
  ],
  author: 'DuoPlus Enterprise',
  license: 'MIT',
  repository: {
    type: 'git',
    url: 'https://github.com/duoplus/factorywager-cli.git'
  },
  engines: {
    'node': '>=18.0.0',
    'bun': '>=1.0.0'
  }
};

class ProductionDeployer {
  private projectRoot: string;
  
  constructor() {
    this.projectRoot = process.cwd();
  }

  async deploy(): Promise<void> {
    console.log('🚀 FactoryWager CLI - Production Deployment');
    console.log('==========================================');
    
    try {
      await this.createPackageJson();
      await this.buildCLI();
      await this.setupGlobalInstall();
      await this.verifyInstallation();
      await this.createSystemdService();
      
      console.log('✅ Production deployment complete!');
      console.log('🔧 Available commands:');
      console.log('   factorywager inspect --help');
      console.log('   factorywager dashboard --port 8090');
      console.log('   fw inspect --tui');
      
    } catch (error) {
      console.error('❌ Deployment failed:', error);
      process.exit(1);
    }
  }

  private async createPackageJson(): Promise<void> {
    const packageJsonPath = join(this.projectRoot, 'package.json');
    
    console.log('📦 Creating package.json...');
    writeFileSync(packageJsonPath, JSON.stringify(PACKAGE_CONFIG, null, 2));
    console.log('✅ package.json created');
  }

  private async buildCLI(): Promise<void> {
    console.log('🔨 Building CLI for production...');
    
    // Ensure dist directory exists
    const distDir = join(this.projectRoot, 'dist');
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }
    
    // Build the CLI
    const buildProcess = spawn('bun', ['build', './cli/factorywager-inspector-enhanced.ts', '--outdir', './dist', '--target', 'node', '--minify'], {
      stdio: 'inherit',
      cwd: this.projectRoot
    });
    
    return new Promise((resolve, reject) => {
      buildProcess.on('close', (code) => {
        if (code === 0) {
          console.log('✅ CLI build complete');
          resolve();
        } else {
          reject(new Error(`Build failed with code ${code}`));
        }
      });
      
      buildProcess.on('error', reject);
    });
  }

  private async setupGlobalInstall(): Promise<void> {
    console.log('🌍 Setting up global installation...');
    
    // Create executable script
    const executableScript = `#!/bin/bash
exec bun run "${join(this.projectRoot, 'cli/factorywager-inspector-enhanced.ts')}" "$@"
`;
    
    const cliPath = join(INSTALL_DIR, CLI_NAME);
    const fwPath = join(INSTALL_DIR, 'fw');
    
    try {
      // Write main executable
      writeFileSync(cliPath, executableScript, { mode: 0o755 });
      writeFileSync(fwPath, executableScript, { mode: 0o755 });
      
      console.log(`✅ CLI installed globally as: ${CLI_NAME}`);
      console.log(`✅ Short command available: fw`);
      
    } catch (error) {
      console.warn('⚠️  Global installation failed - using npm link instead');
      
      // Fallback to npm link
      const npmLinkProcess = spawn('npm', ['link'], {
        stdio: 'inherit',
        cwd: this.projectRoot
      });
      
      return new Promise((resolve, reject) => {
        npmLinkProcess.on('close', (code) => {
          if (code === 0) {
            console.log('✅ CLI linked via npm');
            resolve();
          } else {
            reject(new Error(`npm link failed with code ${code}`));
          }
        });
        
        npmLinkProcess.on('error', reject);
      });
    }
  }

  private async verifyInstallation(): Promise<void> {
    console.log('🔍 Verifying installation...');
    
    // Test the CLI
    const testProcess = spawn('factorywager', ['--version'], {
      stdio: 'pipe'
    });
    
    return new Promise((resolve, reject) => {
      let output = '';
      
      testProcess.stdout?.on('data', (data) => {
        output += data.toString();
      });
      
      testProcess.on('close', (code) => {
        if (code === 0 && output.includes('2.0.0')) {
          console.log('✅ CLI verification successful');
          resolve();
        } else {
          reject(new Error('CLI verification failed'));
        }
      });
      
      testProcess.on('error', reject);
    });
  }

  private async createSystemdService(): Promise<void> {
    console.log('🔧 Creating systemd service...');
    
    const serviceContent = `[Unit]
Description=FactoryWager Inspector Dashboard
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=${this.projectRoot}
ExecStart=/usr/bin/bun run ${join(this.projectRoot, 'server/inspector-dashboard.ts')}
Restart=always
RestartSec=10
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
`;
    
    const servicePath = '/etc/systemd/system/factorywager-inspector.service';
    
    try {
      writeFileSync(servicePath, serviceContent);
      
      // Enable and start the service
      const systemctlEnable = spawn('systemctl', ['enable', 'factorywager-inspector.service'], {
        stdio: 'inherit'
      });
      
      const systemctlStart = spawn('systemctl', ['start', 'factorywager-inspector.service'], {
        stdio: 'inherit'
      });
      
      console.log('✅ Systemd service created and started');
      console.log('🌐 Dashboard available at: http://localhost:8090/inspector');
      
    } catch (error) {
      console.warn('⚠️  Systemd service creation failed - manual setup required');
      console.log('   To manually start: factorywager dashboard --live');
    }
  }
}

// Deployment script execution
if (import.meta.main) {
  const deployer = new ProductionDeployer();
  await deployer.deploy();
}

export { ProductionDeployer, PACKAGE_CONFIG };
