#!/usr/bin/env bun
// Asset demonstration script

// @ts-ignore - SVG import
import logo from "./logo.svg";

console.log("🎨 Asset Import Demo");
console.log(`Logo path: ${logo}`);
console.log(`Type: ${typeof logo}`);
console.log(`Length: ${logo.length}`);

// This demonstrates how Bun handles assets:
// - Runtime: Returns absolute path to file
// - Build with outdir: Copies file, returns relative path
// - Build with publicPath: Returns URL path
