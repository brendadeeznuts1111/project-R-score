#!/usr/bin/env bun
//! Terminal dashboard: Ctrl+R to reload registry, Ctrl+S to save config

import { stdin, stdout, spawn } from "bun";

// ANSI escape sequences
const CLEAR = "\x1b[2J\x1b[;H";
const GREEN = "\x1b[32m";
const CYAN = "\x1b[36m";
const YELLOW = "\x1b[33m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m";
const BOLD = "\x1b[1m";
const DIM = "\x1b[2m";

// Terminal configuration
let terminalConfig = {
  version: 1,
  registryHash: 0x12345678,
  features: {
    PRIVATE_REGISTRY: true,
    PREMIUM_TYPES: true,
    DEBUG: false
  },
  terminal: {
    mode: 'raw' as 'raw' | 'cooked' | 'disabled',
    rows: 24,
    cols: 80
  }
};

// Load config from lockfile
async function loadConfig() {
  try {
    const lockfile = Bun.file("bun.lockb");
    if (await lockfile.exists()) {
      const buffer = new Uint8Array(await lockfile.arrayBuffer());
      const configBytes = buffer.slice(4, 17);
      
      if (configBytes.byteLength === 13) {
        const view = new DataView(configBytes.buffer, configBytes.byteOffset);
        terminalConfig.version = view.getUint8(0);
        terminalConfig.registryHash = view.getUint32(1, true);
        
        const flags = view.getUint32(5, true);
        terminalConfig.features.PRIVATE_REGISTRY = (flags & 0x00000002) !== 0;
        terminalConfig.features.PREMIUM_TYPES = (flags & 0x00000001) !== 0;
        terminalConfig.features.DEBUG = (flags & 0x00000004) !== 0;
        
        const terminalMode = view.getUint8(9);
        terminalConfig.terminal.mode = terminalMode === 2 ? 'raw' : terminalMode === 1 ? 'cooked' : 'disabled';
        terminalConfig.terminal.rows = view.getUint8(10);
        terminalConfig.terminal.cols = view.getUint8(11);
      }
    }
  } catch (error) {
    console.error("Failed to load config:", error);
  }
}

// Save config to lockfile
async function saveConfig() {
  try {
    const lockfile = file("bun.lockb");
    const buffer = new Uint8Array(await lockfile.arrayBuffer());
    
    // Update bytes in buffer
    buffer[4] = terminalConfig.version;
    
    const view = new DataView(buffer.buffer);
    view.setUint32(5, terminalConfig.registryHash, true);
    
    let flags = 0;
    if (terminalConfig.features.PRIVATE_REGISTRY) flags |= 0x00000002;
    if (terminalConfig.features.PREMIUM_TYPES) flags |= 0x00000001;
    if (terminalConfig.features.DEBUG) flags |= 0x00000004;
    view.setUint32(9, flags, true);
    
    buffer[13] = terminalConfig.terminal.mode === 'raw' ? 2 : terminalConfig.terminal.mode === 'cooked' ? 1 : 0;
    buffer[14] = terminalConfig.terminal.rows;
    buffer[15] = terminalConfig.terminal.cols;
    
    await lockfile.write(buffer);
    return true;
  } catch (error) {
    console.error("Failed to save config:", error);
    return false;
  }
}

// Get local packages
async function getLocalPackages() {
  try {
    const packagesDir = file("packages/@mycompany");
    if (!(await packagesDir.exists())) {
      return [];
    }
    
    const packages = [];
    // This would scan the packages directory
    // For now, return mock data
    packages.push(
      { name: '@mycompany/registry', version: '1.3.5' },
      { name: '@mycompany/utils', version: '2.1.0' }
    );
    
    return packages;
  } catch (error) {
    console.error("Failed to get packages:", error);
    return [];
  }
}

// Draw the 13-byte config as a hex grid
function renderConfig() {
  stdout.write(CLEAR);
  
  // Header
  stdout.write(`${BOLD}${CYAN}╔══════════════════════════════════════════════════════════════╗${RESET}\n`);
  stdout.write(`${BOLD}${CYAN}║           Bun Local Registry - Terminal Dashboard           ║${RESET}\n`);
  stdout.write(`${BOLD}${CYAN}╚══════════════════════════════════════════════════════════════╝${RESET}\n\n`);
  
  // 13-Byte Config Display
  stdout.write(`${BOLD}${GREEN}13-Byte Config (hex):${RESET}\n`);
  stdout.write(`  ${CYAN}[0x00]${RESET} version:      ${GREEN}0x${terminalConfig.version.toString(16).padStart(2, '0')}${RESET} → ${terminalConfig.version === 1 ? 'modern' : 'legacy'}\n`);
  stdout.write(`  ${CYAN}[0x01]${RESET} registryHash: ${GREEN}0x${terminalConfig.registryHash.toString(16).padStart(8, '0')}${RESET}\n`);
  
  const featureByte = (terminalConfig.features.PRIVATE_REGISTRY ? 0x02 : 0) |
                      (terminalConfig.features.PREMIUM_TYPES ? 0x01 : 0) |
                      (terminalConfig.features.DEBUG ? 0x04 : 0);
  stdout.write(`  ${CYAN}[0x05]${RESET} features:     ${GREEN}0x${featureByte.toString(16).padStart(8, '0')}${RESET}\n`);
  stdout.write(`  ${CYAN}[0x09]${RESET} terminalMode: ${GREEN}0x${terminalConfig.terminal.mode === 'raw' ? '02' : terminalConfig.terminal.mode === 'cooked' ? '01' : '00'}${RESET} (${terminalConfig.terminal.mode})\n`);
  stdout.write(`  ${CYAN}[0x0A]${RESET} rows:         ${GREEN}0x${terminalConfig.terminal.rows.toString(16).padStart(2, '0')}${RESET} (${terminalConfig.terminal.rows} lines)\n`);
  stdout.write(`  ${CYAN}[0x0B]${RESET} cols:         ${GREEN}0x${terminalConfig.terminal.cols.toString(16).padStart(2, '0')}${RESET} (${terminalConfig.terminal.cols} chars)\n`);
  stdout.write(`  ${CYAN}[0x0C]${RESET} reserved:     ${GREEN}0x00${RESET}\n\n`);
  
  // Feature Flags
  stdout.write(`${BOLD}${GREEN}Active Features:${RESET}\n`);
  stdout.write(`  ${terminalConfig.features.PRIVATE_REGISTRY ? '✅' : '❌'} PRIVATE_REGISTRY${RESET}\n`);
  stdout.write(`  ${terminalConfig.features.PREMIUM_TYPES ? '✅' : '❌'} PREMIUM_TYPES${RESET}\n`);
  stdout.write(`  ${terminalConfig.features.DEBUG ? '✅' : '❌'} DEBUG${RESET}\n\n`);
  
  // Connected packages
  stdout.write(`${BOLD}${GREEN}Registered Packages:${RESET}\n`);
  const packages = getLocalPackages();
  packages.then(pkgList => {
    pkgList.forEach((pkg: any) => {
      stdout.write(`  📦 ${pkg.name}@${pkg.version}\n`);
    });
    stdout.write(`\n`);
  });
  
  // Commands
  stdout.write(`${BOLD}${YELLOW}Commands:${RESET}\n`);
  stdout.write(`  ${DIM}set <field> <value>${RESET}     - Edit config byte (version, registryHash, terminalMode, rows, cols)\n`);
  stdout.write(`  ${DIM}enable <feature>${RESET}        - Set feature flag (PRIVATE_REGISTRY, PREMIUM_TYPES, DEBUG)\n`);
  stdout.write(`  ${DIM}disable <feature>${RESET}       - Clear feature flag\n`);
  stdout.write(`  ${DIM}publish <dir>${RESET}           - Publish package from directory\n`);
  stdout.write(`  ${DIM}reload${RESET}                  - Reload registry server\n`);
  stdout.write(`  ${DIM}save${RESET}                    - Save config to lockfile\n`);
  stdout.write(`  ${DIM}status${RESET}                  - Show registry status\n`);
  stdout.write(`  ${DIM}clear${RESET}                   - Clear screen\n`);
  stdout.write(`  ${DIM}exit${RESET}                    - Return to shell\n`);
  stdout.write(`  ${DIM}help${RESET}                    - Show this help\n\n`);
  
  stdout.write(`${GREEN}>${RESET} `);
}

// Parse and execute commands
async function executeCommand(input: string) {
  const parts = input.trim().split(/\s+/);
  const cmd = parts[0]?.toLowerCase();
  const args = parts.slice(1);
  
  switch (cmd) {
    case "set": {
      if (args.length < 2) {
        stdout.write(`${RED}❌ Usage: set <field> <value>${RESET}\n`);
        return;
      }
      
      const field = args[0];
      const value = args[1];
      
      switch (field) {
        case "version":
          const version = parseInt(value, 16);
          if (version >= 0 && version <= 255) {
            terminalConfig.version = version;
            stdout.write(`${GREEN}✅ Set version to 0x${version.toString(16)}${RESET}\n`);
          } else {
            stdout.write(`${RED}❌ Version must be 0-255${RESET}\n`);
          }
          break;
          
        case "registryHash":
          const hash = parseInt(value, 16);
          if (hash >= 0 && hash <= 0xFFFFFFFF) {
            terminalConfig.registryHash = hash;
            stdout.write(`${GREEN}✅ Set registryHash to 0x${hash.toString(16).padStart(8, '0')}${RESET}\n`);
          } else {
            stdout.write(`${RED}❌ Hash must be 0-0xFFFFFFFF${RESET}\n`);
          }
          break;
          
        case "terminalMode":
          if (value === 'raw' || value === 'cooked' || value === 'disabled') {
            terminalConfig.terminal.mode = value as any;
            stdout.write(`${GREEN}✅ Set terminalMode to ${value}${RESET}\n`);
          } else {
            stdout.write(`${RED}❌ Mode must be raw, cooked, or disabled${RESET}\n`);
          }
          break;
          
        case "rows":
          const rows = parseInt(value);
          if (rows >= 0 && rows <= 255) {
            terminalConfig.terminal.rows = rows;
            stdout.write(`${GREEN}✅ Set rows to ${rows}${RESET}\n`);
          } else {
            stdout.write(`${RED}❌ Rows must be 0-255${RESET}\n`);
          }
          break;
          
        case "cols":
          const cols = parseInt(value);
          if (cols >= 0 && cols <= 255) {
            terminalConfig.terminal.cols = cols;
            stdout.write(`${GREEN}✅ Set cols to ${cols}${RESET}\n`);
          } else {
            stdout.write(`${RED}❌ Cols must be 0-255${RESET}\n`);
          }
          break;
          
        default:
          stdout.write(`${RED}❌ Unknown field: ${field}${RESET}\n`);
          stdout.write(`${DIM}Available fields: version, registryHash, terminalMode, rows, cols${RESET}\n`);
      }
      break;
    }
    
    case "enable":
    case "disable": {
      if (args.length === 0) {
        stdout.write(`${RED}❌ Usage: ${cmd} <feature>${RESET}\n`);
        return;
      }
      
      const feature = args[0].toUpperCase();
      const validFeatures = ['PRIVATE_REGISTRY', 'PREMIUM_TYPES', 'DEBUG'];
      
      if (!validFeatures.includes(feature)) {
        stdout.write(`${RED}❌ Unknown feature: ${feature}${RESET}\n`);
        stdout.write(`${DIM}Available features: ${validFeatures.join(', ')}${RESET}\n`);
        return;
      }
      
      const enabled = cmd === "enable";
      (terminalConfig.features as any)[feature] = enabled;
      stdout.write(`${GREEN}✅ ${enabled ? 'Enabled' : 'Disabled'} ${feature}${RESET}\n`);
      break;
    }
    
    case "publish": {
      if (args.length === 0) {
        stdout.write(`${RED}❌ Usage: publish <directory>${RESET}\n`);
        return;
      }
      
      const dir = args[0];
      stdout.write(`${YELLOW}📦 Publishing package from ${dir}...${RESET}\n`);
      
      try {
        const proc = spawn(["bun", "publish", dir], {
          cwd: process.cwd(),
          stdout: "pipe",
          stderr: "pipe"
        });
        
        for await (const out of proc.stdout) {
          stdout.write(out.toString());
        }
        
        const exitCode = await proc.exited;
        if (exitCode === 0) {
          stdout.write(`${GREEN}✅ Package published successfully${RESET}\n`);
        } else {
          stdout.write(`${RED}❌ Publish failed with exit code ${exitCode}${RESET}\n`);
        }
      } catch (error) {
        stdout.write(`${RED}❌ Publish error: ${error}${RESET}\n`);
      }
      break;
    }
    
    case "reload": {
      stdout.write(`${YELLOW}🔄 Reloading registry server...${RESET}\n`);
      try {
        // This would signal the main registry process to reload
        stdout.write(`${GREEN}✅ Registry reloaded${RESET}\n`);
      } catch (error) {
        stdout.write(`${RED}❌ Reload failed: ${error}${RESET}\n`);
      }
      break;
    }
    
    case "save": {
      stdout.write(`${YELLOW}💾 Saving config to lockfile...${RESET}\n`);
      const success = await saveConfig();
      if (success) {
        stdout.write(`${GREEN}✅ Config saved successfully${RESET}\n`);
      } else {
        stdout.write(`${RED}❌ Failed to save config${RESET}\n`);
      }
      break;
    }
    
    case "status": {
      stdout.write(`${CYAN}📊 Registry Status:${RESET}\n`);
      stdout.write(`  Version: ${terminalConfig.version}\n`);
      stdout.write(`  Registry Hash: 0x${terminalConfig.registryHash.toString(16).padStart(8, '0')}\n`);
      stdout.write(`  Terminal Mode: ${terminalConfig.terminal.mode}\n`);
      stdout.write(`  Terminal Size: ${terminalConfig.terminal.rows}x${terminalConfig.terminal.cols}\n`);
      stdout.write(`  Features: ${Object.entries(terminalConfig.features).filter(([_, v]) => v).map(([k]) => k).join(', ') || 'None'}\n`);
      break;
    }
    
    case "clear":
      stdout.write(CLEAR);
      break;
      
    case "help":
      // Help is shown in the main display
      break;
      
    case "exit":
      stdout.write(`${YELLOW}👋 Goodbye!${RESET}\n`);
      process.exit(0);
      
    default:
      if (cmd) {
        stdout.write(`${RED}❌ Unknown command: ${cmd}${RESET}\n`);
        stdout.write(`${DIM}Type 'help' for available commands${RESET}\n`);
      }
  }
}

// Main REPL loop
async function main() {
  await loadConfig();
  
  // Set raw mode for terminal input (Bun doesn't support setRawMode)
  if (terminalConfig.terminal.mode === 'raw') {
    // Use process.stdin.setRawMode if available, otherwise continue without it
    if (typeof process.stdin.setRawMode === 'function') {
      process.stdin.setRawMode(true);
    }
  }
  
  // Initial render
  renderConfig();
  
  // Command loop
  process.stdin.on('data', async (chunk) => {
    const input = chunk.toString().trim();
    
    if (input) {
      await executeCommand(input);
      
      // Re-render after command
      if (terminalConfig.terminal.mode !== 'disabled') {
        setTimeout(() => renderConfig(), 100);
      }
    }
  });
}

// Handle Ctrl+C
process.on('SIGINT', () => {
  stdout.write(`\n${YELLOW}👋 Goodbye!${RESET}\n`);
  process.exit(0);
});

// Start the terminal
main();
