#!/usr/bin/env bun

/**
 * FactoryWager CLI - Production Ready Version
 * Fixed dependencies and streamlined for enterprise deployment
 */

import { spawn } from 'child_process';

// Simple CLI wrapper without external dependencies
class FactoryWagerCLI {
  private scriptPath: string;
  
  constructor() {
    this.scriptPath = './cli/factorywager-inspector-enhanced.ts';
  }
  
  async run(args: string[]): Promise<void> {
    const childProcess = spawn('bun', [this.scriptPath, ...args], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    return new Promise((resolve, reject) => {
      childProcess.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`Process exited with code ${code}`));
        }
      });
      
      childProcess.on('error', reject);
    });
  }
}

// Main execution
if (import.meta.main) {
  const cli = new FactoryWagerCLI();
  
  try {
    await cli.run(process.argv.slice(2));
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

export { FactoryWagerCLI };
