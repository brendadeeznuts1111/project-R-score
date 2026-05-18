#!/usr/bin/env bun
// Asset demonstration script

// @ts-ignore - SVG import
import logo from "./logo.svg";

console.info("🎨 Asset Import Demo");
console.info(`Logo path: ${logo}`);
console.info(`Type: ${typeof logo}`);
console.info(`Length: ${logo.length}`);

// This demonstrates how Bun handles assets:
// - Runtime: Returns absolute path to file
// - Build with outdir: Copies file, returns relative path
// - Build with publicPath: Returns URL path
