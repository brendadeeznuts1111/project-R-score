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
    console.log(`🚀 Running: bun ${command} ${args.join(' ')}`);
    
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

    console.log(`📦 Packing ${packageName}...`);
    
    const packArgs = ['pm', 'pack', ...options];
    await this.runCommandInDirectory(pkg.path, packArgs);
  }

  async linkAllWorkspaces(): Promise<void> {
    console.log('🔗 Linking all workspaces...');
    
    for (const pkg of this.packages) {
      console.log(`  Linking ${pkg.name}...`);
      await this.runCommandInDirectory(pkg.path, ['link']);
    }
    
    console.log('✅ All workspaces linked!');
  }

  async unlinkAllWorkspaces(): Promise<void> {
    console.log('🔓 Unlinking all workspaces...');
    
    for (const pkg of this.packages) {
      console.log(`  Unlinking ${pkg.name}...`);
      await this.runCommandInDirectory(pkg.path, ['unlink']);
    }
    
    console.log('✅ All workspaces unlinked!');
  }

  async packAllWorkspaces(options: string[] = []): Promise<void> {
    console.log('📦 Packing all workspaces...');
    
    for (const pkg of this.packages) {
      await this.packWorkspace(pkg.name, options);
    }
    
    console.log('✅ All workspaces packed!');
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
    console.log('📥 Installing all workspace dependencies...');
    await this.runCommand('install');
    console.log('✅ Workspaces installed successfully!');
  }

  async buildWorkspaces(): Promise<void> {
    console.log('🔨 Building all workspaces...');
    await this.runCommand('run', ['build', '--workspaces']);
    console.log('✅ Workspaces built successfully!');
  }

  async testWorkspaces(): Promise<void> {
    console.log('🧪 Testing all workspaces...');
    await this.runCommand('test', ['--filter', '@duoplus/*']);
    console.log('✅ Workspaces tested successfully!');
  }

  showWorkspaceInfo(): void {
    console.log('📋 DuoPlus Workspaces:');
    console.log('');
    
    for (const pkg of this.packages) {
      console.log(`  📦 ${pkg.name}`);
      console.log(`     Path: ${pkg.path}`);
      console.log('');
    }
    
    console.log(`Total: ${this.packages.length} workspaces`);
  }

  showCatalogInfo(): void {
    console.log('📚 Catalog Configuration:');
    console.log('');
    console.log('📦 Main Catalog (catalog:):');
    console.log('  - commander, elysia, figlet, inquirer');
    console.log('  - console-table-printer, libphonenumber-js');
    console.log('  - mailparser, nodemailer, puppeteer');
    console.log('  - tesseract.js, zstd, @supabase/supabase-js');
    console.log('  - http-proxy-middleware, https-proxy-agent');
    console.log('  - socks-proxy-agent, imap, reflect-metadata');
    console.log('  - @types/*, typescript');
    console.log('');
    console.log('🧪 Testing Catalog (catalog:testing):');
    console.log('  - jest, @types/jest');
    console.log('');
    console.log('🔨 Build Catalog (catalog:build):');
    console.log('  - vite, @vitejs/plugin-react');
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
      console.log('DuoPlus Workspace Manager');
      console.log('');
      console.log('Usage: bun run scripts/workspace-manager.ts <command> [args]');
      console.log('');
      console.log('Commands:');
      console.log('  install           Install all workspace dependencies');
      console.log('  build             Build all workspaces');
      console.log('  test              Test all workspaces');
      console.log('  pack <pkg|all>    Pack specific package or all');
      console.log('  link <pkg|all>    Link specific package or all');
      console.log('  unlink <pkg|all>  Unlink specific package or all');
      console.log('  info              Show workspace and catalog info');
      console.log('');
      console.log('Examples:');
      console.log('  bun run scripts/workspace-manager.ts install');
      console.log('  bun run scripts/workspace-manager.ts pack all --destination ./dist');
      console.log('  bun run scripts/workspace-manager.ts link all');
      console.log('  bun run scripts/workspace-manager.ts info');
  }
}

main().catch(console.error);
