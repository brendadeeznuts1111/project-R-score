#!/usr/bin/env bun

// Duo Automation - Advanced Workspace Management Script
// Implements full Bun PM toolkit with workspaces, catalogs, linking, and packing

import { spawn } from 'bun';

interface WorkspacePackage {
  name: string;
  path: string;
  version: string;
}

class DuoWorkspaceManager {
  private readonly packages = [
    { name: '@duoplus/cli-core', path: 'packages/cli' },
    { name: '@duoplus/ui-components', path: 'packages/components' },
    { name: '@duoplus/utils', path: 'packages/utils' },
    { name: '@duoplus/testing-utils', path: 'packages/testing' },
    { name: '@duoplus/build-tools', path: 'packages/build' },
    { name: '@duoplus/registry-gateway', path: 'packages/modules/registry-gateway' },
    { name: '@duoplus/security-vault', path: 'packages/modules/security-vault' },
    { name: '@duoplus/telemetry-kernel', path: 'packages/modules/telemetry-kernel' },
  ];

  async runCommand(command: string, args: string[] = []): Promise<void> {
    console.info(`🚀 Running: bun ${command} ${args.join(' ')}`);
    
    try {
      const result = await Bun.spawn({
        cmd: ['bun', command, ...args],
        stdout: 'inherit',
        stderr: 'inherit'
      });

      const exitCode = await result.exited;
      if (exitCode !== 0) {
        console.error(`❌ Command failed with exit code: ${exitCode}`);
        process.exit(exitCode);
      }
    } catch (error) {
      console.error(`❌ Error running command:`, error);
      process.exit(1);
    }
  }

  async packWorkspace(packageName: string, options: string[] = []): Promise<void> {
    const pkg = this.packages.find(p => p.name === packageName);
    if (!pkg) {
      console.error(`❌ Package ${packageName} not found`);
      return;
    }

    console.info(`📦 Packing ${packageName}...`);
    
    const packArgs = ['pm', 'pack', ...options];
    await this.runCommandInDirectory(pkg.path, packArgs);
  }

  async linkAllWorkspaces(): Promise<void> {
    console.info('🔗 Linking all workspaces...');
    
    for (const pkg of this.packages) {
      console.info(`  Linking ${pkg.name}...`);
      await this.runCommandInDirectory(pkg.path, ['link']);
    }
    
    console.info('✅ All workspaces linked!');
  }

  async unlinkAllWorkspaces(): Promise<void> {
    console.info('🔓 Unlinking all workspaces...');
    
    for (const pkg of this.packages) {
      console.info(`  Unlinking ${pkg.name}...`);
      await this.runCommandInDirectory(pkg.path, ['unlink']);
    }
    
    console.info('✅ All workspaces unlinked!');
  }

  async packAllWorkspaces(options: string[] = []): Promise<void> {
    console.info('📦 Packing all workspaces...');
    
    for (const pkg of this.packages) {
      await this.packWorkspace(pkg.name, options);
    }
    
    console.info('✅ All workspaces packed!');
  }

  public async runCommandInDirectory(dir: string, args: string[]): Promise<void> {
    try {
      const result = await Bun.spawn({
        cmd: ['bun', ...args],
        cwd: dir,
        stdout: 'inherit',
        stderr: 'inherit'
      });

      const exitCode = await result.exited;
      if (exitCode !== 0) {
        console.error(`❌ Command failed in ${dir} with exit code: ${exitCode}`);
        process.exit(exitCode);
      }
    } catch (error) {
      console.error(`❌ Error running command in ${dir}:`, error);
      process.exit(1);
    }
  }

  async installWorkspaces(): Promise<void> {
    console.info('📥 Installing all workspace dependencies...');
    await this.runCommand('install');
    console.info('✅ Workspaces installed successfully!');
  }

  async buildWorkspaces(): Promise<void> {
    console.info('🔨 Building all workspaces...');
    await this.runCommand('run', ['build', '--workspaces']);
    console.info('✅ Workspaces built successfully!');
  }

  async testWorkspaces(): Promise<void> {
    console.info('🧪 Testing all workspaces...');
    await this.runCommand('test', ['--filter', '@duoplus/*']);
    console.info('✅ Workspaces tested successfully!');
  }

  showWorkspaceInfo(): void {
    console.info('📋 DuoPlus Workspaces:');
    console.info('');
    
    for (const pkg of this.packages) {
      console.info(`  📦 ${pkg.name}`);
      console.info(`     Path: ${pkg.path}`);
      console.info('');
    }
    
    console.info(`Total: ${this.packages.length} workspaces`);
  }

  showCatalogInfo(): void {
    console.info('📚 Catalog Configuration:');
    console.info('');
    console.info('📦 Main Catalog (catalog:):');
    console.info('  - commander, elysia, figlet, inquirer');
    console.info('  - console-table-printer, libphonenumber-js');
    console.info('  - mailparser, nodemailer, puppeteer');
    console.info('  - tesseract.js, zstd, @supabase/supabase-js');
    console.info('  - http-proxy-middleware, https-proxy-agent');
    console.info('  - socks-proxy-agent, imap, reflect-metadata');
    console.info('  - @types/*, typescript');
    console.info('');
    console.info('🧪 Testing Catalog (catalog:testing):');
    console.info('  - jest, @types/jest');
    console.info('');
    console.info('🔨 Build Catalog (catalog:build):');
    console.info('  - vite, @vitejs/plugin-react');
  }
}

async function main() {
  const manager = new DuoWorkspaceManager();
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case 'install':
      await manager.installWorkspaces();
      break;
      
    case 'build':
      await manager.buildWorkspaces();
      break;
      
    case 'test':
      await manager.testWorkspaces();
      break;
      
    case 'pack':
      if (args[0] === 'all') {
        await manager.packAllWorkspaces(args.slice(1));
      } else {
        await manager.packWorkspace(args[0], args.slice(1));
      }
      break;
      
    case 'link':
      if (args[0] === 'all') {
        await manager.linkAllWorkspaces();
      } else {
        await manager.runCommandInDirectory(`packages/${args[0]}`, ['link']);
      }
      break;
      
    case 'unlink':
      if (args[0] === 'all') {
        await manager.unlinkAllWorkspaces();
      } else {
        await manager.runCommandInDirectory(`packages/${args[0]}`, ['unlink']);
      }
      break;
      
    case 'info':
      manager.showWorkspaceInfo();
      manager.showCatalogInfo();
      break;
      
    default:
      console.info('DuoPlus Workspace Manager');
      console.info('');
      console.info('Usage: bun run scripts/workspace-manager.ts <command> [args]');
      console.info('');
      console.info('Commands:');
      console.info('  install           Install all workspace dependencies');
      console.info('  build             Build all workspaces');
      console.info('  test              Test all workspaces');
      console.info('  pack <pkg|all>    Pack specific package or all');
      console.info('  link <pkg|all>    Link specific package or all');
      console.info('  unlink <pkg|all>  Unlink specific package or all');
      console.info('  info              Show workspace and catalog info');
      console.info('');
      console.info('Examples:');
      console.info('  bun run scripts/workspace-manager.ts install');
      console.info('  bun run scripts/workspace-manager.ts pack all --destination ./dist');
      console.info('  bun run scripts/workspace-manager.ts link all');
      console.info('  bun run scripts/workspace-manager.ts info');
  }
}

main().catch(console.error);
