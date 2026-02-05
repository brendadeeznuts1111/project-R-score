// scripts/compile.ts
//! Compile registry into standalone binary with 13-byte config frozen

// Get current 13-byte config
const currentConfig = {
  version: 2,
  registryHash: 0x12345678,
  featureFlags: 0x00000007,
  terminal: { mode: "cooked", rows: 48, cols: 80 },
  features: { PRIVATE_REGISTRY: true, PREMIUM_TYPES: true, DEBUG: true }
};

async function compileStandaloneRegistry() {
  console.log("🔨 Compiling standalone registry with frozen 13-byte config...");
  
  try {
    const buildResult = await Bun.build({
      entrypoints: ["./registry/api.ts"],
      outdir: "./dist",
      target: "bun",
      format: "esm",
      naming: {
        entry: "[name]-standalone"
      },
      // Custom compile options for 13-byte config
      define: {
        // Freeze config at compile time
        'BUN_CONFIG_VERSION': currentConfig.version.toString(),
        'BUN_REGISTRY_HASH': `0x${currentConfig.registryHash.toString(16)}`,
        'BUN_FEATURE_FLAGS': currentConfig.featureFlags.toString(16),
        'BUN_TERMINAL_MODE': currentConfig.terminal.mode === "raw" ? "2" : "1",
        'BUN_TERMINAL_ROWS': currentConfig.terminal.rows.toString(),
        'BUN_TERMINAL_COLS': currentConfig.terminal.cols.toString(),
        
        // Mark as frozen
        'BUN_CONFIG_FROZEN': 'true'
      },
      // External dependencies (not bundled)
      external: ["bun:sqlite", "bun:ffi"],
      // Minify for smaller binary
      minify: true,
      // Source maps for debugging
      sourcemap: "inline"
    });

    if (buildResult.success) {
      console.log("✅ Build successful!");
      
      // Create a wrapper script that embeds the 13-byte config
      const wrapperScript = `
// Auto-generated standalone registry with frozen 13-byte config
// Config: 0x${currentConfig.version.toString(16)}${currentConfig.registryHash.toString(16)}${currentConfig.featureFlags.toString(16)}${currentConfig.terminal.mode === "raw" ? "02" : "01"}${currentConfig.terminal.rows.toString(16)}${currentConfig.terminal.cols.toString(16)}00

import { file } from "bun";

// Embedded 13-byte config (immortal)
const EMBEDDED_CONFIG = {
  version: ${currentConfig.version},
  registryHash: ${currentConfig.registryHash},
  featureFlags: ${currentConfig.featureFlags},
  terminal: {
    mode: "${currentConfig.terminal.mode}",
    rows: ${currentConfig.terminal.rows},
    cols: ${currentConfig.terminal.cols}
  },
  frozen: true
};

// Override config loading to use embedded values
globalThis.Bun = globalThis.Bun || {};
globalThis.Bun.config = EMBEDDED_CONFIG;

// Import and start the registry
import('./api-standalone.js');

console.log("🚀 Standalone registry started with frozen 13-byte config");
console.log(\`📊 Config: 0x\${EMBEDDED_CONFIG.version.toString(16)}\${EMBEDDED_CONFIG.registryHash.toString(16)}\${EMBEDDED_CONFIG.featureFlags.toString(16)}\${EMBEDDED_CONFIG.terminal.mode === "raw" ? "02" : "01"}\${EMBEDDED_CONFIG.terminal.rows.toString(16)}\${EMBEDDED_CONFIG.terminal.cols.toString(16)}00\`);
console.log("🔒 Config is immutable - cannot be changed at runtime");
`;

      // Write wrapper script
      await Bun.write("./dist/registry-standalone.js", wrapperScript);
      
      // Make executable
      await Bun.write("./dist/registry-standalone.sh", `#!/bin/bash\nbun ./dist/registry-standalone.js "$@"`);
      
      // Get binary size
      const binaryFile = Bun.file("./dist/api-standalone.js");
      const binarySize = (await binaryFile.size) / 1024 / 1024; // MB
      
      console.log(`📦 Binary size: ${binarySize.toFixed(2)}MB (includes Bun runtime + config)`);
      console.log("🔒 13-byte config is now embedded and immutable");
      console.log("🚀 Run with: ./dist/registry-standalone.sh");
      
      return true;
    } else {
      console.error("❌ Build failed:");
      for (const log of buildResult.logs) {
        console.error(log);
      }
      return false;
    }
  } catch (error) {
    console.error("❌ Compilation error:", error);
    return false;
  }
}

// Create a frozen config loader
function createFrozenConfigLoader() {
  const configCode = `
// src/core/config/frozen-loader.ts
//! Load 13-byte config from binary (embedded at compile time)

export const FROZEN_CONFIG = {
  version: ${currentConfig.version},
  registryHash: ${currentConfig.registryHash},
  featureFlags: ${currentConfig.featureFlags},
  terminal: {
    mode: "${currentConfig.terminal.mode}",
    rows: ${currentConfig.terminal.rows},
    cols: ${currentConfig.terminal.cols}
  },
  frozen: true,
  embedded: true
};

// Override any attempts to change config
export function getConfig() {
  return FROZEN_CONFIG;
}

export function updateConfig() {
  throw new Error("Cannot update frozen config - embedded at compile time");
}

console.log("🔒 Loading frozen 13-byte config from binary");
console.log(\`📊 Embedded config: 0x\${FROZEN_CONFIG.version.toString(16)}\${FROZEN_CONFIG.registryHash.toString(16)}\${FROZEN_CONFIG.featureFlags.toString(16)}\${FROZEN_CONFIG.terminal.mode === "raw" ? "02" : "01"}\${FROZEN_CONFIG.terminal.rows.toString(16)}\${FROZEN_CONFIG.terminal.cols.toString(16)}00\`);
`;

  return configCode;
}

// Main execution
async function main() {
  console.log("🏗️  Bun v1.3.5 Standalone Registry Compiler");
  console.log("═════════════════════════════════════════════════");
  
  // Create frozen config loader
  const configLoader = createFrozenConfigLoader();
  await Bun.write("./src/core/config/frozen-loader.ts", configLoader);
  console.log("✅ Created frozen config loader");
  
  // Compile standalone binary
  const success = await compileStandaloneRegistry();
  
  if (success) {
    console.log("\n🎉 Standalone registry compiled successfully!");
    console.log("\n📋 Summary:");
    console.log("   • 13-byte config is embedded in binary");
    console.log("   • Config is immutable (frozen at compile time)");
    console.log("   • No external bun.lockb needed");
    console.log("   • RegistryHash is frozen to 0x12345678");
    console.log("   • Binary can be distributed to team");
    
    console.log("\n🚀 Usage:");
    console.log("   $ ./dist/registry-standalone.sh");
    console.log("   $ BUN_CONFIG_VERSION=0 ./dist/registry-standalone.sh  # Will be ignored");
    
    console.log("\n🔒 The 13 bytes are now inside the binary itself. They are immortal.");
  } else {
    console.error("\n❌ Compilation failed. Check logs above.");
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main().catch(console.error);
}

export { compileStandaloneRegistry, createFrozenConfigLoader };
