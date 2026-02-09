#!/usr/bin/env bun
/**
 * Cross-Platform ESM Bytecode Compilation
 * 
 * Demonstrates cross-platform compilation, platform detection,
 * conditional compilation, and platform-specific optimizations.
 */

import { spawn } from "bun";
import { platform, arch } from "node:os";

console.log("🌍 Cross-Platform ESM Bytecode Compilation\n");
console.log("=".repeat(70));

// ============================================================================
// Platform Detection
// ============================================================================

interface PlatformInfo {
  os: string;
  arch: string;
  target: string;
}

class PlatformDetector {
  static detect(): PlatformInfo {
    const os = platform();
    const arch = arch();
    
    let target: string;
    
    if (os === "linux") {
      target = `linux-${arch === "x64" ? "x64" : "arm64"}`;
    } else if (os === "darwin") {
      target = `darwin-${arch === "x64" ? "x64" : "arm64"}`;
    } else if (os === "win32") {
      target = `windows-${arch === "x64" ? "x64" : "arm64"}`;
    } else {
      target = "unknown";
    }
    
    return {
      os,
      arch,
      target,
    };
  }
  
  static getAllTargets(): string[] {
    return [
      "linux-x64",
      "linux-arm64",
      "darwin-x64",
      "darwin-arm64",
      "windows-x64",
      "windows-arm64",
    ];
  }
}

console.log("\n🖥️  Platform Detection");
console.log("-".repeat(70));

const currentPlatform = PlatformDetector.detect();
console.log(`\nCurrent Platform:`);
console.log(`  OS: ${currentPlatform.os}`);
console.log(`  Arch: ${currentPlatform.arch}`);
console.log(`  Target: ${currentPlatform.target}`);

console.log(`\nAvailable Targets:`);
PlatformDetector.getAllTargets().forEach(target => {
  console.log(`  • ${target}`);
});

// ============================================================================
// Cross-Platform Build
// ============================================================================

class CrossPlatformBuilder {
  /**
   * Build for current platform
   */
  static async buildForCurrent(entry: string, output: string): Promise<string> {
    const platform = PlatformDetector.detect();
    
    const cmd = [
      "bun",
      "build",
      entry,
      "--compile",
      "--format=esm",
      "--target",
      platform.target,
      "--outfile",
      output,
    ];
    
    const proc = spawn({
      cmd,
      stdout: "pipe",
      stderr: "pipe",
    });
    
    await proc.exited;
    
    if (proc.exitCode !== 0) {
      const error = await new Response(proc.stderr).text();
      throw new Error(`Build failed: ${error}`);
    }
    
    return output;
  }
  
  /**
   * Build for all platforms
   */
  static async buildForAll(entry: string, outputDir: string): Promise<string[]> {
    const targets = PlatformDetector.getAllTargets();
    const outputs: string[] = [];
    
    for (const target of targets) {
      const output = `${outputDir}/${target}/index.js`;
      
      const cmd = [
        "bun",
        "build",
        entry,
        "--compile",
        "--format=esm",
        "--target",
        target,
        "--outfile",
        output,
      ];
      
      const proc = spawn({
        cmd,
        stdout: "pipe",
        stderr: "pipe",
      });
      
      await proc.exited;
      
      if (proc.exitCode === 0) {
        outputs.push(output);
      }
    }
    
    return outputs;
  }
  
  /**
   * Build for specific platforms
   */
  static async buildForPlatforms(
    entry: string,
    platforms: string[],
    outputDir: string
  ): Promise<string[]> {
    const outputs: string[] = [];
    
    for (const target of platforms) {
      const output = `${outputDir}/${target}/index.js`;
      
      const cmd = [
        "bun",
        "build",
        entry,
        "--compile",
        "--format=esm",
        "--target",
        target,
        "--outfile",
        output,
      ];
      
      const proc = spawn({
        cmd,
        stdout: "pipe",
        stderr: "pipe",
      });
      
      await proc.exited;
      
      if (proc.exitCode === 0) {
        outputs.push(output);
      }
    }
    
    return outputs;
  }
}

// ============================================================================
// Conditional Compilation
// ============================================================================

console.log("\n🔀 Conditional Compilation");
console.log("-".repeat(70));

console.log(`
Conditional compilation patterns:

// Platform-specific code
if (process.platform === "win32") {
  // Windows-specific code
} else if (process.platform === "darwin") {
  // macOS-specific code
} else {
  // Linux-specific code
}

// Architecture-specific code
if (process.arch === "arm64") {
  // ARM64-specific code
} else {
  // x64-specific code
}
`);

// ============================================================================
// Platform-Specific Optimizations
// ============================================================================

console.log("\n⚡ Platform-Specific Optimizations");
console.log("-".repeat(70));

const platformOptimizations = [
  {
    platform: "linux-x64",
    optimizations: [
      "Use system libraries",
      "Optimize for server workloads",
      "Consider static linking",
    ],
  },
  {
    platform: "darwin-arm64",
    optimizations: [
      "Leverage Apple Silicon",
      "Use native ARM64 libraries",
      "Optimize for battery life",
    ],
  },
  {
    platform: "windows-x64",
    optimizations: [
      "Handle Windows paths",
      "Use Windows APIs",
      "Consider Windows-specific features",
    ],
  },
];

platformOptimizations.forEach(({ platform, optimizations }) => {
  console.log(`\n${platform}:`);
  optimizations.forEach(opt => console.log(`  • ${opt}`));
});

// ============================================================================
// Example Usage
// ============================================================================

console.log("\n📝 Example: Cross-Platform Build");
console.log("-".repeat(70));

console.log(`
// Build for current platform
const output = await CrossPlatformBuilder.buildForCurrent(
  "src/index.ts",
  "dist/index.js"
);

// Build for all platforms
const outputs = await CrossPlatformBuilder.buildForAll(
  "src/index.ts",
  "dist"
);

// Build for specific platforms
const specificOutputs = await CrossPlatformBuilder.buildForPlatforms(
  "src/index.ts",
  ["linux-x64", "darwin-arm64"],
  "dist"
);
`);

console.log("\n✅ Cross-Platform Compilation Complete!");
console.log("\nKey Features:");
console.log("  • Platform detection");
console.log("  • Build for current platform");
console.log("  • Build for all platforms");
console.log("  • Build for specific platforms");
console.log("  • Platform-specific optimizations");
