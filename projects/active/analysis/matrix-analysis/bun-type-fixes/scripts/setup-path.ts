#!/usr/bin/env bun
/**
 * Setup dedicated PATH for bun-type-fixes
 * This script configures the environment for the project
 */

import { writeFileSync, appendFileSync, existsSync } from "fs";
import { join } from "path";

const projectRoot = process.cwd();
const binDir = join(projectRoot, "bin");
const envFile = join(projectRoot, ".env.local");

console.info("Setting up dedicated PATH for bun-type-fixes...\n");

// Create .env.local with dedicated PATH
const envContent = `# Dedicated PATH for bun-type-fixes
BUN_TYPE_FIXES_ROOT=${projectRoot}
BUN_TYPE_FIXES_BIN=${binDir}
PATH=${binDir}:$PATH

# Project-specific environment
NODE_ENV=development
BUN_TYPE_FIXES_DEBUG=false
`;

writeFileSync(envFile, envContent);
console.info(`✓ Created .env.local with dedicated PATH`);
console.info(`  BUN_TYPE_FIXES_BIN=${binDir}`);

// Create shell integration script
const shellScript = `#!/bin/bash
# bun-type-fixes shell integration
# Source this file to add the dedicated PATH to your shell

export BUN_TYPE_FIXES_ROOT="${projectRoot}"
export BUN_TYPE_FIXES_BIN="${binDir}"
export PATH="${binDir}:$PATH"

echo "✓ bun-type-fixes PATH activated"
echo "  BUN_TYPE_FIXES_ROOT=$BUN_TYPE_FIXES_ROOT"
echo "  BUN_TYPE_FIXES_BIN=$BUN_TYPE_FIXES_BIN"
`;

writeFileSync(join(projectRoot, "activate.sh"), shellScript);
console.info(`\n✓ Created activate.sh script`);
console.info(`  Run: source activate.sh`);

// Create fish shell integration
const fishScript = `# bun-type-fixes fish shell integration
# Source this file to add the dedicated PATH to your fish shell

set -gx BUN_TYPE_FIXES_ROOT "${projectRoot}"
set -gx BUN_TYPE_FIXES_BIN "${binDir}"
set -gx PATH "${binDir}" $PATH

echo "✓ bun-type-fixes PATH activated"
echo "  BUN_TYPE_FIXES_ROOT=$BUN_TYPE_FIXES_ROOT"
echo "  BUN_TYPE_FIXES_BIN=$BUN_TYPE_FIXES_BIN"
`;

writeFileSync(join(projectRoot, "activate.fish"), fishScript);
console.info(`✓ Created activate.fish script`);

// Update .bashrc if it exists
const bashrc = join(process.env.HOME || "", ".bashrc");
if (existsSync(bashrc)) {
  const bashrcAddition = `\n# bun-type-fixes dedicated PATH\nexport BUN_TYPE_FIXES_ROOT="${projectRoot}"\nexport BUN_TYPE_FIXES_BIN="${binDir}"\nexport PATH="${binDir}:$PATH\n`;

  try {
    appendFileSync(bashrc, bashrcAddition);
    console.info(`✓ Updated ~/.bashrc with dedicated PATH`);
  } catch (error) {
    console.info(`⚠ Could not update ~/.bashrc (permission denied)`);
  }
}

// Create a wrapper script for global installation
const globalWrapper = `#!/usr/bin/env bun
/**
 * Global wrapper for bun-type-fixes
 * Ensures dedicated PATH is always used
 */

const projectRoot = "${projectRoot}";
const binDir = "${binDir}";

// Set dedicated PATH
process.env.BUN_TYPE_FIXES_ROOT = projectRoot;
process.env.BUN_TYPE_FIXES_BIN = binDir;
process.env.PATH = binDir + ":" + process.env.PATH;

// Run the actual CLI
await import("${projectRoot}/cli.ts");
`;

writeFileSync(join(binDir, "bun-type-fixes-wrapper"), globalWrapper);
console.info(`✓ Created global wrapper script`);

// Make scripts executable
await Bun.$`chmod +x ${join(projectRoot, "activate.sh")}`;
await Bun.$`chmod +x ${join(projectRoot, "activate.fish")}`;
await Bun.$`chmod +x ${join(binDir, "bun-type-fixes-wrapper")}`;

console.info("\n" + "=".repeat(50));
console.info("SETUP COMPLETE!");
console.info("=".repeat(50));
console.info("\nTo activate the dedicated PATH:");
console.info(`  1. Run: source ${projectRoot}/activate.sh`);
console.info(`  2. Or add to your ~/.bashrc manually`);
console.info("\nAfter activation, you can run:");
console.info("  - bun-type-fixes verify --all");
console.info("  - bun-type-fixes verify --sqlite");
console.info("  - bun-type-fixes verify --filesink");
console.info("\nEnvironment variables:");
console.info(`  BUN_TYPE_FIXES_ROOT=${projectRoot}`);
console.info(`  BUN_TYPE_FIXES_BIN=${binDir}`);
console.info("=".repeat(50));
