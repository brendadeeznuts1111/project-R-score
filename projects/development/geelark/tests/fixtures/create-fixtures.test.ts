#!/usr/bin/env bun

import { test } from "bun:test";
import path from "path";

test("🔧 Auto-Create Glob Test Files", async () => {
  const fixtures = [
    ".gitignore",
    ".env.test",
    ".dev/test.ts",
    ".vscode/settings.json",
  ];

  // Create if missing
  for (const fixture of fixtures) {
    const fullPath = path.join(process.cwd(), fixture);
    if (!(await Bun.file(fullPath).exists())) {
      await Bun.write(fullPath, `# Dev HQ test fixture\n`);
      console.log(`📝 Created ${fixture}`);
    }
  }
});

