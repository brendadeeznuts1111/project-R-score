#!/usr/bin/env bun

/**
 * Bun v1.3.1 `bun pm pack` CLI Binary Inclusion Demo
 * 
 * Demonstrates the improvement where `bun pm pack` now always includes
 * files and directories declared via "bin" and "directories.bin" even 
 * when they are not listed in "files", matching npm pack behavior.
 */

import { spawn } from 'child_process';

// 📦 PACKAGE CONFIGS FOR DEMONSTRATION
const demoConfigs = {
  // Package with bin but no files array - NEW v1.3.1: bin is included!
  cliOnly: {
    name: "demo-cli-only",
    version: "1.0.0",
    description: "CLI tool with bin but no files array",
    bin: {
      "mycli": "./bin/cli.js"
    },
    // Note: no "files" array - in v1.3.0 this would miss the binary!
    dependencies: {
      "commander": "^11.0.0"
    }
  },

  // Package with both bin and files - WORKS IN BOTH VERSIONS
  cliWithFiles: {
    name: "demo-cli-with-files",
    version: "1.0.0", 
    description: "CLI tool with bin and files array",
    bin: {
      "mycli": "./bin/cli.js"
    },
    files: [
      "bin/",
      "lib/",
      "README.md"
    ],
    dependencies: {
      "commander": "^11.0.0"
    }
  },

  // Package with directories.bin - NEW v1.3.1: directories.bin is included!
  withDirectoriesBin: {
    name: "demo-directories-bin",
    version: "1.0.0",
    description: "Package with directories.bin",
    directories: {
      bin: "./bin"
    },
    // Note: no "files" array - directories.bin now included automatically!
    dependencies: {
      "chalk": "^5.0.0"
    }
  },

  // Package with both bin and directories.bin - DEDUPLICATION TEST
  bothBinTypes: {
    name: "demo-both-bin-types",
    version: "1.0.0",
    description: "Package with both bin and directories.bin",
    bin: {
      "tool1": "./bin/tool1.js"
    },
    directories: {
      bin: "./bin"
    },
    files: [
      "lib/"
    ],
    // Test deduplication - bin appears in both places
    dependencies: {
      "commander": "^11.0.0",
      "chalk": "^5.0.0"
    }
  }
};

// 🎯 DEMO FUNCTIONS
export class BunPackV131Demo {
  private tempDir: string;

  constructor() {
    this.tempDir = './temp-pack-demo';
  }

  /**
   * Create temporary package structures for testing
   */
  async createDemoPackages(): Promise<void> {
    console.log('🏗️  Creating demo package structures...');
    
    // Clean up and create temp directory
    await this.cleanup();
    await Bun.write(`${this.tempDir}/.gitkeep`, new TextEncoder().encode(''));

    for (const [configName, config] of Object.entries(demoConfigs)) {
      const packageDir = `${this.tempDir}/${configName}`;
      await Bun.write(`${packageDir}/package.json`, new TextEncoder().encode(JSON.stringify(config, null, 2)));
      
      // Create bin directory and CLI file
      await Bun.write(`${packageDir}/bin/cli.js`, new TextEncoder().encode(this.generateCliScript(configName)));
      
      // Create additional files for comprehensive test
      await Bun.write(`${packageDir}/lib/index.js`, new TextEncoder().encode(this.generateLibScript(configName)));
      await Bun.write(`${packageDir}/README.md`, new TextEncoder().encode(this.generateReadme(configName)));
      
      console.log(`  ✅ Created ${configName} package`);
    }
  }

  /**
   * Test bun pm pack on each demo package
   */
  async testPackBehavior(): Promise<void> {
    console.log('\n📦 Testing bun pm pack behavior...');
    
    for (const configName of Object.keys(demoConfigs)) {
      console.log(`\n🔍 Testing ${configName}:`);
      
      const packageDir = `${this.tempDir}/${configName}`;
      const result = await this.runPackCommand(packageDir);
      
      this.analyzePackResult(configName, result);
    }
  }

  /**
   * Demonstrate the key v1.3.1 improvements
   */
  demonstrateImprovements(): void {
    console.log('\n🎯 Bun v1.3.1 `bun pm pack` Key Improvements:');
    console.log('=' .repeat(60));
    
    console.log('\n1️⃣  ALWAYS INCLUDE "bin" FILES');
    console.log('   📁 Files in "bin" field are now always included');
    console.log('   ✅ Even when not listed in "files" array');
    console.log('   🎯 Matches npm pack behavior exactly');
    
    console.log('\n2️⃣  ALWAYS INCLUDE "directories.bin"');
    console.log('   📁 Directories in "directories.bin" are always included');
    console.log('   ✅ Even when not listed in "files" array');
    console.log('   🎯 Prevents missing CLI binaries in published tarballs');
    
    console.log('\n3️⃣  SMART DEDUPLICATION');
    console.log('   🔄 Deduplicates paths appearing in both "bin"/"directories.bin" and "files"');
    console.log('   ✅ Prevents duplicate files in tarball');
    console.log('   🎯 Optimizes package size');
    
    console.log('\n4️⃣  BACKWARD COMPATIBILITY');
    console.log('   🔄 Existing packages continue to work unchanged');
    console.log('   ✅ Only adds missing files, never removes existing behavior');
    console.log('   🎯 Safe upgrade for all existing packages');
  }

  /**
   * Show real-world impact examples
   */
  showRealWorldImpact(): void {
    console.log('\n🌍 Real-World Impact:');
    console.log('=' .repeat(40));
    
    console.log('\n🔧 BEFORE v1.3.1 (The Problem):');
    console.log('   ❌ CLI binaries missing from npm packages');
    console.log('   ❌ "npm install my-tool" → command not found');
    console.log('   ❌ Developers must remember to add bin/ to files array');
    console.log('   ❌ Inconsistent behavior between bun and npm');
    
    console.log('\n✅ AFTER v1.3.1 (The Solution):');
    console.log('   ✅ CLI binaries always included automatically');
    console.log('   ✅ "npm install my-tool" → works immediately');
    console.log('   ✅ No need to manually add bin/ to files array');
    console.log('   ✅ Perfect parity with npm pack behavior');
    
    console.log('\n📊 Affected Package Types:');
    console.log('   🛠️  CLI tools and utilities');
    console.log('   📦 Build tools and bundlers');
    console.log('   🔧 Development frameworks');
    console.log('   📚 Documentation generators');
    console.log('   🎯 Any package with executable binaries');
  }

  /**
   * Generate best practices recommendations
   */
  showBestPractices(): void {
    console.log('\n📚 Best Practices for Package Authors:');
    console.log('=' .repeat(45));
    
    console.log('\n✅ DO (Recommended):');
    console.log('   • Define "bin" for CLI tools');
    console.log('   • Use "directories.bin" for multiple binaries');
    console.log('   • Keep "files" array for source files only');
    console.log('   • Test with "bun pm pack --dry-run"');
    
    console.log('\n⚠️  AVOID (No Longer Needed):');
    console.log('   • Manually adding "bin/" to "files" array');
    console.log('   • Worrying about missing CLI binaries');
    console.log('   • Different configs for bun vs npm');
    
    console.log('\n🎯 Package.json Example:');
    console.log('   {');
    console.log('     "name": "my-cli-tool",');
    console.log('     "bin": {');
    console.log('       "mycli": "./bin/cli.js"');
    console.log('     },');
    console.log('     "files": [');
    console.log('       "lib/"  // Only source, no bin/ needed!');
    console.log('     ]');
    console.log('   }');
  }

  /**
   * Cleanup temporary files
   */
  async cleanup(): Promise<void> {
    try {
      await new Promise<void>((resolve, reject) => {
        const proc = spawn('rm', ['-rf', this.tempDir]);
        proc.on('exit', (code) => code === 0 ? resolve() : reject(new Error(`Cleanup failed with code ${code}`)));
        proc.on('error', reject);
      });
    } catch {
      // Ignore cleanup errors
    }
  }

  // 🔧 HELPER METHODS
  private async runPackCommand(packageDir: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const proc = spawn('bun', ['pm', 'pack', '--dry-run'], {
        cwd: packageDir,
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout?.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      proc.on('exit', (code) => {
        if (code === 0) {
          resolve(stdout);
        } else {
          reject(new Error(`Pack command failed with code ${code}: ${stderr}`));
        }
      });

      proc.on('error', (error) => {
        reject(error);
      });
    });
  }

  private analyzePackResult(configName: string, result: string): void {
    console.log(`   📊 Pack Result:`);
    
    // Check if CLI binary is included
    const hasCliBinary = result.includes('bin/cli.js') || result.includes('bin/');
    
    // Check package size and file count
    const sizeMatch = result.match(/Unpacked size: (.+)/);
    const filesMatch = result.match(/Total files: (\d+)/);
    
    console.log(`     ✅ CLI Binary Included: ${hasCliBinary ? 'YES' : 'NO'}`);
    if (sizeMatch) console.log(`     📏 Unpacked Size: ${sizeMatch[1]}`);
    if (filesMatch) console.log(`     📁 Total Files: ${filesMatch[1]}`);
    
    // v1.3.1 improvement validation
    if (configName === 'cliOnly' || configName === 'withDirectoriesBin') {
      if (hasCliBinary) {
        console.log(`     🎉 v1.3.1 Improvement: CLI auto-included!`);
      } else {
        console.log(`     ⚠️  Issue: CLI binary missing (should not happen in v1.3.1)`);
      }
    }
  }

  private generateCliScript(packageName: string): string {
    return `#!/usr/bin/env node
/**
 * CLI Script for ${packageName}
 * Generated for Bun v1.3.1 pack demo
 */

console.log('🚀 Hello from ${packageName} CLI!');
console.log('This binary was automatically included by bun pm pack v1.3.1');

process.exit(0);
`;
  }

  private generateLibScript(packageName: string): string {
    return `/**
 * Library for ${packageName}
 */

export function greet(name: string) {
  return \`Hello, \${name} from \${packageName}!\`;
}

export const VERSION = '1.0.0';
`;
  }

  private generateReadme(packageName: string): string {
    return `# ${packageName}

Demo package for Bun v1.3.1 \`bun pm pack\` improvements.

## Installation

\`\`\`bash
npm install ${packageName}
\`\`\`

## Usage

\`\`\`bash
${packageName === 'cliOnly' || packageName === 'cliWithFiles' ? 'mycli' : 'node bin/cli.js'}
\`\`\`

## v1.3.1 Improvements

This package demonstrates that CLI binaries are now automatically
included in the published tarball, even when not listed in the
"files" array.
`;
  }
}

// 🚀 MAIN DEMO EXECUTION
export async function runBunPackV131Demo() {
  console.log('🚀 Bun v1.3.1 `bun pm pack` CLI Binary Inclusion Demo');
  console.log('=' .repeat(65));
  
  const demo = new BunPackV131Demo();
  
  try {
    // Create demo packages
    await demo.createDemoPackages();
    
    // Test pack behavior
    await demo.testPackBehavior();
    
    // Show improvements
    demo.demonstrateImprovements();
    
    // Show real-world impact
    demo.showRealWorldImpact();
    
    // Show best practices
    demo.showBestPractices();
    
    console.log('\n✅ Demo completed successfully!');
    console.log('🎯 Key Takeaway: Bun v1.3.1 ensures CLI binaries are never missing!');
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    await demo.cleanup();
  }
}

// 🚀 RUN DEMO IF EXECUTED DIRECTLY
if (import.meta.main) {
  runBunPackV131Demo();
}

export default {
  BunPackV131Demo,
  runBunPackV131Demo
};
