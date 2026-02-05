#!/usr/bin/env bun

import { Glob } from "bun";
import { test, expect } from "bun:test";

test("📁 Glob.scan() - Hidden Files", () => {
  const patterns = [
    ".*/*", // .gitignore ✅
    ".*/**/*.ts", // .dev/** ✅
    "**/.env*", // .env.local ✅
  ];

  for (const pattern of patterns) {
    const glob = new Glob(pattern);
    const results = glob.scanSync(process.cwd());
    
    // FIX: glob.scanSync() returns an iterable, not an array
    // Convert to array before accessing .length
    const resultsArray = Array.isArray(results) ? results : Array.from(results);
    expect(resultsArray.length).toBeGreaterThan(0);
  }
});
