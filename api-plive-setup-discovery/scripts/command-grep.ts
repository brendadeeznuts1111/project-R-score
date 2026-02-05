#!/usr/bin/env bun
// scripts/command-grep.ts - Command auditing via ripgrep
// Usage: bun command:grep CONFIG
//       bun command:grep TELEMETRY
//       bun command:grep (no args = all commands)

import { $ } from 'bun';

const commandType = process.argv[2] || '';

if (commandType) {
  console.log(`🔍 Searching for '${commandType}' commands...\n`);
  await $`rg --type ts '${commandType}' --colors match:fg:yellow --line-number`.nothrow();
} else {
  console.log(`🔍 Searching for all command dispatchers...\n`);
  await $`rg --type ts 'dispatchCommand|sendCommand' --colors path:fg:cyan --line-number`.nothrow();
}

console.log('\n✅ Command audit complete!');

