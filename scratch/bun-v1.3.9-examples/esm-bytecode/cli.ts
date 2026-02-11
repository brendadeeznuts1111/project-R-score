#!/usr/bin/env bun
/**
 * ESM CLI Tool - Demonstrates v1.3.9 ESM Bytecode Compilation
 * 
 * This can be compiled to bytecode with:
 *   bun build --compile --bytecode --format=esm ./cli.ts
 * 
 * Previously, --bytecode only worked with --format=cjs
 * v1.3.9 adds full ESM support for bytecode compilation!
 */

import { parseArgs } from "util";

// ESM-specific features that now work with bytecode:
// - Top-level await
// - ESM imports/exports
// - import.meta.url
// - import.meta.dirname
// - import.meta.filename

interface Config {
  name: string;
  version: string;
}

const config: Config = {
  name: "esm-cli-demo",
  version: "1.0.0",
};

// Simulate async initialization (works in ESM bytecode!)
const initData = await Promise.resolve({
  initialized: true,
  timestamp: Date.now(),
});

function printHelp(): void {
  console.log(`
${config.name} v${config.version}

Usage: cli [options] [command]

Commands:
  greet <name>     Greet someone
  info             Show runtime info
  config           Show configuration

Options:
  -h, --help       Show this help message
  -v, --version    Show version

Examples:
  cli greet World
  cli info
`);
}

function showVersion(): void {
  console.log(`${config.name} v${config.version}`);
  console.log(`Bun: ${Bun.version}`);
  console.log(`Platform: ${process.platform} ${process.arch}`);
}

function showInfo(): void {
  console.log("Runtime Information:");
  console.log("  Module Format: ESM");
  console.log(`  Bun Version: ${Bun.version}`);
  console.log(`  Node Version: ${process.version}`);
  console.log(`  Platform: ${process.platform}`);
  console.log(`  Architecture: ${process.arch}`);
  console.log(`  Initialized: ${initData.initialized}`);
  console.log(`  Init Timestamp: ${initData.timestamp}`);
  console.log(`  import.meta.url: ${import.meta.url}`);
  
  // These work in v1.3.9+ ESM bytecode
  if (import.meta.dirname) {
    console.log(`  import.meta.dirname: ${import.meta.dirname}`);
  }
  if (import.meta.filename) {
    console.log(`  import.meta.filename: ${import.meta.filename}`);
  }
}

function greet(name: string): void {
  const hour = new Date().getHours();
  let greeting = "Hello";
  
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";
  
  console.log(`${greeting}, ${name}! 👋`);
  console.log(`(Running from ESM bytecode)`);
}

function showConfig(): void {
  console.log("Configuration:");
  console.log(JSON.stringify({ ...config, initData }, null, 2));
}

// Parse arguments
const { values, positionals } = parseArgs({
  args: Bun.argv.slice(2),
  options: {
    help: { type: "boolean", short: "h" },
    version: { type: "boolean", short: "v" },
  },
  allowPositionals: true,
});

if (values.help) {
  printHelp();
  process.exit(0);
}

if (values.version) {
  showVersion();
  process.exit(0);
}

const command = positionals[0];

switch (command) {
  case "greet": {
    const name = positionals[1] || "World";
    greet(name);
    break;
  }
  case "info":
    showInfo();
    break;
  case "config":
    showConfig();
    break;
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error("Run with --help for usage information");
    process.exit(1);
}
