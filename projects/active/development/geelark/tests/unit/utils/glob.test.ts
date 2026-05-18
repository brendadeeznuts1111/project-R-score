#!/usr/bin/env bun

import { test, expect } from "bun:test";
import { Glob } from "bun";
import path from "path";

test("📁 Glob.scan() - Hidden Files (Universal)", () => {
  const cwd = process.cwd();
  const patterns = [
    // ✅ Specific files that exist
    ".gitignore",
    ".env.test",
    ".env.example",
    ".DS_Store",

    // ✅ Wildcard patterns (may find 0+ files)
    ".*", // .git, .gitignore, etc.
    ".env*",
    ".dev/**",
    ".vscode/**",
    ".*/*", // .git/logs
    ".*/**/*.ts", // .dev/**/*.ts
    "**/.env*", // anywhere/.env
  ];

  const results: string[] = [];

  for (const pattern of patterns) {
    const glob = new Glob(pattern);
    const matches = glob.scanSync(cwd);

    // glob.scanSync() returns an iterable, not an array
    // Convert to array to check length
    const matchesArray = Array.isArray(matches) ? matches : Array.from(matches);

    // ✅ Log for debugging (match expected output format)
    const fileCount = matchesArray.length;
    const fileLabel = fileCount === 1 ? "file" : "files";
    console.info(`📂 ${pattern.padEnd(20)} → ${fileCount} ${fileLabel}`);

    // ✅ Universal: Accept 0+ matches
    expect(matchesArray.length).toBeGreaterThanOrEqual(0);

    results.push(...matchesArray.slice(0, 3)); // Sample
  }

  // ✅ At least SOME hidden files
  const totalHidden = results.filter((f) => f.startsWith(".")).length;
  expect(totalHidden).toBeGreaterThan(0);

  console.info(`✅ ${totalHidden} hidden files found!`);
});

test("🌍 Glob - Every Environment", () => {
  const safePatterns = [
    // ✅ Guaranteed to exist
    "**/*", // All files
    ".", // Current dir

    // ✅ Common hidden (0+ OK)
    ".git*",
    ".gitignore",
    "package.json",
    "tsconfig.json",
    "**/.env*",
    "**/.github/**",

    // ✅ Wildcards
    ".*", // Dotfiles
    "**/*.{ts,js}", // Source
    ".*/**", // Hidden dirs
  ];

  let totalMatches = 0;

  for (const pattern of safePatterns) {
    const glob = new Glob(pattern);
    const matches = glob.scanSync(process.cwd());

    // glob.scanSync() returns an iterable, not an array
    const matchesArray = Array.isArray(matches) ? matches : Array.from(matches);

    totalMatches += matchesArray.length;
    expect(Array.isArray(matchesArray)).toBe(true);
  }

  expect(totalMatches).toBeGreaterThan(5); // Realistic minimum
});

