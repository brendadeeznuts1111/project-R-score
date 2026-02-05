#!/usr/bin/env bun
/// <reference types="bun-types" />

import { parseArgs } from "util";

const { positionals } = parseArgs({
  args: Bun.argv,
  allowPositionals: true,
});

const filePath = positionals[2];

if (!filePath) {
  console.error("Usage: bun analyze <file>");
  process.exit(1);
}

const file = Bun.file(filePath);
const bytes = await file.bytes();

console.log(`📊 Analyzing: ${filePath}`);
console.log(`📏 Size: ${file.size} bytes`);
console.log(`🏷️  Type: ${file.type || "Unknown"}`);

const hasher = new Bun.CryptoHasher("sha256");
hasher.update(bytes);
console.log(`🔐 SHA-256: ${hasher.digest("hex")}`);
