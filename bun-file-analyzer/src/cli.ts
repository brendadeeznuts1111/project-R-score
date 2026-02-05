#!/usr/bin/env bun

import { Bun } from "bun";

// CLI commands
if (process.argv.includes("--version")) {
  console.log("Bun Enhanced File Analyzer v1.3.6+");
  console.log(`Target: ${process.env.TARGET || "unknown"}`);
  console.log(`Compiled: ${new Date().toISOString()}`);
  process.exit(0);
}

if (process.argv.includes("--archive")) {
  const fileIndex = process.argv.indexOf("--archive") + 1;
  const pattern = process.argv[fileIndex];
  
  if (pattern) {
    console.log(`Creating archive for: ${pattern}`);
    const archive = new Bun.Archive();
    
    // Add files matching pattern
    for await (const file of Bun.glob(pattern)) {
      const contents = await Bun.file(file).bytes();
      archive.add(file, contents);
    }
    
    const archiveBytes = archive.bytes();
    await Bun.write("archive.tar.gz", archiveBytes);
    console.log(`Archive created: archive.tar.gz (${archiveBytes.length} bytes)`);
  }
  process.exit(0);
}

if (process.argv.includes("--color")) {
  const colorIndex = process.argv.indexOf("--color") + 1;
  const colorSpec = process.argv[colorIndex];
  
  if (colorSpec) {
    console.log(`Color: ${colorSpec}`);
    console.log(`Hex: ${Bun.color(colorSpec, "hex")}`);
    console.log(`RGB: ${Bun.color(colorSpec, "rgb")}`);
    console.log(`ANSI: ${Bun.color(colorSpec, "ansi")}`);
  }
  process.exit(0);
}

// Default: start server
console.log("🚀 Starting Bun Enhanced File Analyzer Server...");
console.log(`📊 Version: ${process.env.npm_package_version || "1.0.0"}`);
console.log(`🎯 Target: ${process.env.TARGET || "browser"}`);
console.log(`🔧 Compiled: ${process.env.IS_COMPILED === "true" ? "Yes" : "No"}`);

// Import and start server
await import("../api/index.ts");
