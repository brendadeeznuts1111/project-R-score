#!/usr/bin/env bun
/**
 * Bun v1.3.9 ESM Bytecode CLI Example
 * 
 * Build with:
 *   bun build --compile --bytecode --format=esm ./cli.ts --outfile ./dist/my-cli
 * 
 * Features demonstrated:
 * - Top-level await (works in ESM bytecode!)
 * - import.meta.dirname/filename
 * - ESM imports/exports
 * - Dynamic imports
 */

import { parseArgs } from "util";
import { readFileSync } from "fs";
import { join } from "path";

// TOP-LEVEL AWAIT - works in ESM bytecode!
const startTime = Date.now();
const config = await loadConfig();
const initDuration = Date.now() - startTime;

interface Config {
  name: string;
  version: string;
  features: string[];
}

async function loadConfig(): Promise<Config> {
  // Simulated async config loading
  await new Promise(r => setTimeout(r, 10));
  
  return {
    name: "my-cli",
    version: "1.0.0",
    features: ["ESM", "Bytecode", "Top-level await"],
  };
}

function printBanner(): void {
  console.info(`
╔══════════════════════════════════════════╗
║  ${config.name} v${config.version}                    ║
║  Built with Bun v${Bun.version}              ║
╚══════════════════════════════════════════╝
`);
}

function printHelp(): void {
  console.info(`
Usage: my-cli [options] <command>

Commands:
  greet <name>     Greet someone
  info             Show runtime info
  config           Show configuration
  fetch <url>      Fetch URL (demo)

Options:
  -h, --help       Show this help
  -v, --version    Show version

Examples:
  my-cli greet World
  my-cli info
  my-cli fetch https://api.github.com/users/github
`);
}

function showInfo(): void {
  console.info("Runtime Information:");
  console.info("  Module Format: ESM");
  console.info(`  Bun Version: ${Bun.version}`);
  console.info(`  Platform: ${process.platform} ${process.arch}`);
  console.info(`  Init Time: ${initDuration}ms`);
  console.info(`  import.meta.url: ${import.meta.url}`);
  console.info(`  import.meta.dirname: ${import.meta.dirname ?? "(not available)"}`);
  console.info(`  import.meta.filename: ${import.meta.filename ?? "(not available)"}`);
}

function showConfig(): void {
  console.info("Configuration:");
  console.info(JSON.stringify(config, null, 2));
}

async function greet(name: string): Promise<void> {
  const hour = new Date().getHours();
  let greeting = "Hello";
  
  if (hour < 12) greeting = "Good morning";
  else if (hour < 18) greeting = "Good afternoon";
  else greeting = "Good evening";
  
  console.info(`${greeting}, ${name}! 👋`);
  console.info(`(Running from ESM bytecode executable)`);
}

async function fetchUrl(url: string): Promise<void> {
  console.info(`Fetching ${url}...`);
  
  try {
    const response = await fetch(url);
    console.info(`Status: ${response.status} ${response.statusText}`);
    
    const data = await response.json();
    console.info("Response:");
    console.info(JSON.stringify(data, null, 2).substring(0, 500));
    
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
  }
}

async function dynamicDemo(): Promise<void> {
  // Dynamic import demo
  console.info("Testing dynamic import...");
  
  const { format } = await import("util");
  console.info(`Dynamic import successful! format() is ${typeof format}`);
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
  printBanner();
  printHelp();
  process.exit(0);
}

if (values.version) {
  console.info(`${config.name} v${config.version}`);
  process.exit(0);
}

const command = positionals[0];

printBanner();

switch (command) {
  case "greet": {
    const name = positionals[1] || "World";
    await greet(name);
    break;
  }
  case "info":
    showInfo();
    break;
  case "config":
    showConfig();
    break;
  case "fetch": {
    const url = positionals[1] || "https://api.github.com/users/github";
    await fetchUrl(url);
    break;
  }
  case "dynamic":
    await dynamicDemo();
    break;
  case undefined:
    printHelp();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.error("Run with --help for usage information");
    process.exit(1);
}
