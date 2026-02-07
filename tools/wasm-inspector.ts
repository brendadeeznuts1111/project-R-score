#!/usr/bin/env bun

// tools/wasm-inspector.ts — CLI inspector for .wasm files and WASM API reference
//
// Usage:
//   bun tools/wasm-inspector.ts <command> [options]
//
// Commands:
//   inspect <file>   Show exports, imports, memory, tables (default)
//   reference        Print WASM API reference table
//   urls             List all WASM documentation URLs
//
// Options:
//   --json           JSON output
//   --verbose        Show full signatures
//   --no-color       Disable colors
//   -h, --help       Show help

import { WASM_API, getAllWasmUrls } from '../lib/docs/wasm-reference';
import type { WasmAPIEntry, WasmAPIMember } from '../lib/docs/wasm-reference';

// ─── CLI argument parsing ────────────────────────────────────────────

const args = process.argv.slice(2);
const flags = new Set(args.filter(a => a.startsWith('--') || a === '-h'));
const positional = args.filter(a => !a.startsWith('-'));

const showHelp = flags.has('--help') || flags.has('-h');
const jsonOutput = flags.has('--json');
const verbose = flags.has('--verbose');
const noColor = flags.has('--no-color');

const command = positional[0] || 'help';
const filePath = positional[1];

// ─── Color helpers ───────────────────────────────────────────────────

const c = {
  reset: noColor ? '' : '\x1b[0m',
  bold: noColor ? '' : '\x1b[1m',
  dim: noColor ? '' : '\x1b[2m',
  cyan: noColor ? '' : '\x1b[36m',
  green: noColor ? '' : '\x1b[32m',
  yellow: noColor ? '' : '\x1b[33m',
  blue: noColor ? '' : '\x1b[34m',
  magenta: noColor ? '' : '\x1b[35m',
  white: noColor ? '' : '\x1b[37m',
  gray: noColor ? '' : '\x1b[90m',
};

// ─── Help ────────────────────────────────────────────────────────────

function printHelp(): void {
  console.log(`${c.bold}wasm-inspector${c.reset} — Inspect .wasm files and browse the WebAssembly API reference

${c.bold}Usage:${c.reset}
  bun tools/wasm-inspector.ts ${c.cyan}<command>${c.reset} [options]

${c.bold}Commands:${c.reset}
  ${c.cyan}inspect <file>${c.reset}   Show exports, imports, memory, tables
  ${c.cyan}reference${c.reset}        Print WASM API reference table
  ${c.cyan}urls${c.reset}             List all WASM documentation URLs

${c.bold}Options:${c.reset}
  --json           JSON output
  --verbose        Show full signatures
  --no-color       Disable colors
  -h, --help       Show help`);
}

// ─── inspect command ─────────────────────────────────────────────────

interface InspectResult {
  file: string;
  size: number;
  exports: WebAssembly.ModuleExportDescriptor[];
  imports: WebAssembly.ModuleImportDescriptor[];
  tables: number;
  memories: number;
}

async function inspectWasm(path: string): Promise<InspectResult> {
  const file = Bun.file(path);
  const exists = await file.exists();
  if (!exists) {
    console.error(`Error: file not found: ${path}`);
    process.exit(1);
  }

  const bytes = await file.arrayBuffer();
  const module = await WebAssembly.compile(bytes);

  const exports = WebAssembly.Module.exports(module);
  const imports = WebAssembly.Module.imports(module);

  const tables = exports.filter(e => e.kind === 'table').length;
  const memories = exports.filter(e => e.kind === 'memory').length;

  return { file: path, size: bytes.byteLength, exports, imports, tables, memories };
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function printInspect(result: InspectResult): void {
  if (jsonOutput) {
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  const name = result.file.split('/').pop() || result.file;
  console.log(`\n${c.bold}Module:${c.reset} ${name} (${formatBytes(result.size)})`);

  // Exports
  console.log(`\n${c.bold}Exports (${result.exports.length}):${c.reset}`);
  if (result.exports.length === 0) {
    console.log(`  ${c.dim}(none)${c.reset}`);
  } else {
    for (const exp of result.exports) {
      const kindColor = exp.kind === 'function' ? c.cyan : exp.kind === 'memory' ? c.green : c.yellow;
      const kindLabel = exp.kind === 'function' ? 'func' : exp.kind;
      console.log(`  ${kindColor}${kindLabel.padEnd(8)}${c.reset} ${exp.name}`);
    }
  }

  // Imports
  console.log(`\n${c.bold}Imports (${result.imports.length}):${c.reset}`);
  if (result.imports.length === 0) {
    console.log(`  ${c.dim}(none)${c.reset}`);
  } else {
    for (const imp of result.imports) {
      const kindColor = imp.kind === 'function' ? c.cyan : imp.kind === 'memory' ? c.green : c.yellow;
      const kindLabel = imp.kind === 'function' ? 'func' : imp.kind;
      console.log(`  ${kindColor}${kindLabel.padEnd(8)}${c.reset} ${imp.module}.${imp.name}`);
    }
  }

  // Summary
  console.log(`\n${c.bold}Tables:${c.reset} ${result.tables}`);
  console.log(`${c.bold}Memories:${c.reset} ${result.memories}`);
  console.log('');
}

// ─── reference command ───────────────────────────────────────────────

function printReference(): void {
  if (jsonOutput) {
    console.log(JSON.stringify(WASM_API, null, 2));
    return;
  }

  console.log(`\n${c.bold}WebAssembly API Reference${c.reset}`);
  console.log('═'.repeat(50));

  for (const entry of WASM_API) {
    const kindLabel = entry.kind === 'class' ? 'Class' : 'Function';
    console.log(`\n${c.bold}${kindLabel}: ${c.cyan}${entry.name}${c.reset}`);
    console.log(`  ${c.dim}${entry.description}${c.reset}`);

    if (entry.members && entry.members.length > 0) {
      for (const member of entry.members) {
        if (verbose && member.signature) {
          console.log(`  ${c.green}.${member.name}${c.reset}  ${c.dim}${member.signature}${c.reset}`);
        } else {
          const label = member.kind === 'method' ? `${member.name}()` : member.name;
          console.log(`  ${c.green}.${label}${c.reset}  ${c.dim}${member.description}${c.reset}`);
        }
      }
    }

    console.log(`  ${c.gray}MDN: ${entry.mdnUrl}${c.reset}`);
    console.log(`  ${c.gray}Bun: ${entry.bunUrl}${c.reset}`);
  }

  console.log('');
}

// ─── urls command ────────────────────────────────────────────────────

function printUrls(): void {
  const urls = getAllWasmUrls();

  if (jsonOutput) {
    console.log(JSON.stringify(urls, null, 2));
    return;
  }

  for (const url of urls) {
    console.log(url);
  }
}

// ─── Main ────────────────────────────────────────────────────────────

if (showHelp || command === 'help') {
  printHelp();
  process.exit(0);
}

switch (command) {
  case 'inspect': {
    if (!filePath) {
      console.error('Error: inspect requires a .wasm file path');
      console.error('Usage: bun tools/wasm-inspector.ts inspect <file.wasm>');
      process.exit(2);
    }
    const result = await inspectWasm(filePath);
    printInspect(result);
    break;
  }

  case 'reference':
    printReference();
    break;

  case 'urls':
    printUrls();
    break;

  default:
    // If the first positional arg looks like a .wasm file, treat as inspect
    if (command.endsWith('.wasm')) {
      const result = await inspectWasm(command);
      printInspect(result);
    } else {
      console.error(`Unknown command: ${command}`);
      printHelp();
      process.exit(2);
    }
}
