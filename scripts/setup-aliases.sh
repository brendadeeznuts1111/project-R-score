#!/usr/bin/env bun

/**
 * 🚀 FactoryWager CLI Setup Script
 * 
 * Automatically installs shell aliases for optimal development workflow.
 * Supports bash, zsh, and fish shells.
 */

import { color } from "bun";

interface ShellConfig {
  name: string;
  configFile: string;
  aliasFile: string;
  detection: string[];
}

const SHELLS: ShellConfig[] = [
  {
    name: 'zsh',
    configFile: '~/.zshrc',
    aliasFile: '.shell-aliases.sh',
    detection: ['zsh', '.zshrc']
  },
  {
    name: 'bash',
    configFile: '~/.bashrc',
    aliasFile: '.shell-aliases.sh',
    detection: ['bash', '.bashrc']
  },
  {
    name: 'fish',
    configFile: '~/.config/fish/config.fish',
    aliasFile: '.shell-aliases.fish',
    detection: ['fish', 'config.fish']
  }
];

function detectShell(): string {
  const shell = process.env.SHELL || '';
  
  if (shell.includes('zsh')) return 'zsh';
  if (shell.includes('bash')) return 'bash';
  if (shell.includes('fish')) return 'fish';
  
  // Fallback detection
  if (process.env.ZSH_VERSION) return 'zsh';
  if (process.env.BASH_VERSION) return 'bash';
  if (process.env.FISH_VERSION) return 'fish';
  
  return 'unknown';
}

function expandPath(path: string): string {
  return path.replace('~', process.env.HOME || '');
}

async function backupFile(filePath: string): Promise<void> {
  try {
    const file = Bun.file(expandPath(filePath));
    if (await file.exists()) {
      const backupPath = `${filePath}.backup.${Date.now()}`;
      await Bun.write(expandPath(backupPath), await file.text());
      console.log(color(`  📋 Backed up to ${backupPath}`, 'yellow'));
    }
  } catch (error) {
    console.error(color(`  ❌ Backup failed: ${error.message}`, 'red'));
  }
}

async function appendToFile(filePath: string, content: string): Promise<void> {
  try {
    const expandedPath = expandPath(filePath);
    const file = Bun.file(expandedPath);
    
    let existingContent = '';
    if (await file.exists()) {
      existingContent = await file.text();
    }
    
    // Check if aliases already exist
    if (existingContent.includes('FactoryWager Bun CLI Aliases')) {
      console.log(color(`  ⚠️  Aliases already exist in ${filePath}`, 'yellow'));
      return;
    }
    
    // Append new content
    const newContent = existingContent + (existingContent.endsWith('\n') ? '' : '\n') + content;
    await Bun.write(expandedPath, newContent);
    console.log(color(`  ✅ Added aliases to ${filePath}`, 'green'));
  } catch (error) {
    console.error(color(`  ❌ Failed to write to ${filePath}: ${error.message}`, 'red'));
  }
}

async function installAliases(shell: string): Promise<void> {
  const shellConfig = SHELLS.find(s => s.name === shell);
  
  if (!shellConfig) {
    console.error(color(`❌ Unsupported shell: ${shell}`, 'red'));
    return;
  }
  
  console.log(color(`\n🔧 Installing for ${shell.toUpperCase()}...`, 'cyan'));
  
  // Backup existing config
  await backupFile(shellConfig.configFile);
  
  // Read alias file content
  const aliasFile = Bun.file(shellConfig.aliasFile);
  if (!await aliasFile.exists()) {
    console.error(color(`❌ Alias file not found: ${shellConfig.aliasFile}`, 'red'));
    return;
  }
  
  const aliasContent = await aliasFile.text();
  
  // Add to shell config
  await appendToFile(shellConfig.configFile, aliasContent);
  
  console.log(color(`\n✅ Installation complete for ${shell}!`, 'green', 'bold'));
}

async function showUsage(): Promise<void> {
  console.log(color('🚀 FactoryWager CLI Alias Setup', 'cyan', 'bold'));
  console.log(color('─'.repeat(50), 'gray'));
  
  const detected = detectShell();
  console.log(color(`\n🔍 Detected shell: ${color(detected, 'green')}`, 'white'));
  
  console.log(color('\n📋 Available commands:', 'yellow', 'bold'));
  console.log('  bun run setup-aliases.sh auto     - Auto-detect and install');
  console.log('  bun run setup-aliases.sh zsh      - Install for Zsh');
  console.log('  bun run setup-aliases.sh bash     - Install for Bash');
  console.log('  bun run setup-aliases.sh fish     - Install for Fish');
  console.log('  bun run setup-aliases.sh check    - Check current setup');
  console.log('  bun run setup-aliases.sh help     - Show this help');
  
  console.log(color('\n🎯 Quick aliases after installation:', 'yellow', 'bold'));
  console.log('  bunq        - Quick status check');
  console.log('  bungh       - GitHub health check');
  console.log('  bundl <api> - Generate deep links');
  console.log('  bunmon      - Start monitoring');
  console.log('  bunai       - AI insights demo');
  console.log('  bunmorning  - Complete morning check');
  
  console.log(color('\n⚡ Fast variants:', 'yellow', 'bold'));
  console.log('  bunqs       - Ultra-fast status');
  console.log('  bunghs      - Quick GitHub health');
  console.log('  bundls <api> - Quick deep links');
  console.log('  bunais      - AI insights summary');
}

async function checkSetup(): Promise<void> {
  console.log(color('🔍 Checking FactoryWager CLI setup...', 'cyan'));
  
  const detected = detectShell();
  const shellConfig = SHELLS.find(s => s.name === detected);
  
  if (!shellConfig) {
    console.log(color(`❌ Unsupported shell: ${detected}`, 'red'));
    return;
  }
  
  const configPath = expandPath(shellConfig.configFile);
  const configFile = Bun.file(configPath);
  
  if (!await configFile.exists()) {
    console.log(color(`⚠️  Config file not found: ${configPath}`, 'yellow'));
    return;
  }
  
  const content = await configFile.text();
  const hasAliases = content.includes('FactoryWager Bun CLI Aliases');
  
  console.log(color(`\n📁 Shell config: ${color(configPath, 'cyan')}`, 'white'));
  console.log(`  Aliases installed: ${color(hasAliases ? '✅ Yes' : '❌ No', hasAliases ? 'green' : 'red')}`);
  
  if (hasAliases) {
    console.log(color('\n🎉 Ready to use FactoryWager CLI!', 'green', 'bold'));
    console.log('  Run "bunmorning" for your daily system check');
    console.log('  Run "bunusage" to see all available commands');
  } else {
    console.log(color('\n📦 Install with: bun run setup-aliases.sh auto', 'yellow'));
  }
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args[0] === 'help') {
    await showUsage();
    return;
  }
  
  const command = args[0];
  
  switch (command) {
    case 'auto':
      const shell = detectShell();
      if (shell === 'unknown') {
        console.error(color('❌ Could not detect shell. Please specify manually.', 'red'));
        console.log('  Available: zsh, bash, fish');
        process.exit(1);
      }
      await installAliases(shell);
      console.log(color(`\n💡 Restart your terminal or run 'source ${SHELLS.find(s => s.name === shell)?.configFile}'`, 'yellow'));
      break;
      
    case 'zsh':
    case 'bash':
    case 'fish':
      await installAliases(command);
      console.log(color(`\n💡 Restart your terminal or run 'source ${SHELLS.find(s => s.name === command)?.configFile}'`, 'yellow'));
      break;
      
    case 'check':
      await checkSetup();
      break;
      
    default:
      console.error(color(`❌ Unknown command: ${command}`, 'red'));
      await showUsage();
      process.exit(1);
  }
}

if (import.meta.main) {
  main().catch(error => {
    console.error(color('❌ Setup failed:', 'red'), error.message);
    process.exit(1);
  });
}
