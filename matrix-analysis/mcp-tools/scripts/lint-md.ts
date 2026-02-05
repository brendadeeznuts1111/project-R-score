#!/usr/bin/env bun

/**
 * Bun-native markdown linter with Col-89 width checks
 * Runs markdownlint + line width validation without Node.js dependencies
 */

import { spawn } from "bun";
import { readdir, stat as fsStat } from "fs/promises";
import { join, relative } from "path";

interface LintResult {
  file: string;
  line: number;
  column: number;
  rule: string;
  message: string;
}

interface WidthResult {
  file: string;
  line: number;
  column: number;
  length: number;
}

const CONFIG_FILE = ".markdownlint.json";
const MAX_WIDTH = 89;

async function runMarkdownlint(files: string[]): Promise<LintResult[]> {
  const results: LintResult[] = [];

  for (const file of files) {
    const proc = spawn(["npx", "markdownlint", "--config", CONFIG_FILE, "--json", file], {
      stdout: "pipe",
      stderr: "pipe"
    });

    const output = await new Response(proc.stdout).text();

    if (output) {
      try {
        const parsed = JSON.parse(output);
        for (const item of parsed) {
          results.push({
            file: item.fileName,
            line: item.lineNumber,
            column: 0,
            rule: item.ruleNames[0],
            message: item.ruleDescription
          });
        }
      } catch {
        // Skip invalid JSON
      }
    }

    await proc.exited;
  }

  return results;
}

async function checkLineWidth(files: string[]): Promise<WidthResult[]> {
  const results: WidthResult[] = [];

  for (const file of files) {
    const content = await Bun.file(file).text();
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (line.length > MAX_WIDTH) {
        results.push({
          file,
          line: i + 1,
          column: MAX_WIDTH + 1,
          length: line.length
        });
      }
    }
  }

  return results;
}

async function getMarkdownFiles(pattern: string[]): Promise<string[]> {
  const files: string[] = [];

  for (const p of pattern) {
    if (p.includes('*')) {
      // Simple glob handling for *.md patterns
      const dir = p.split('/')[0] || '.';
      const entries = await readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isFile() && entry.name.endsWith('.md')) {
          files.push(join(dir, entry.name));
        }
      }
    } else {
      const fileStat = await fsStat(p);
      if (fileStat.isFile() && p.endsWith('.md')) {
        files.push(p);
      }
    }
  }

  return files;
}

function formatResults(errors: LintResult[], widthErrors: WidthResult[], json: boolean = false): void {
  if (json) {
    console.log(JSON.stringify({
      markdownlint: errors,
      width: widthErrors
    }));
    return;
  }

  if (errors.length === 0 && widthErrors.length === 0) {
    console.log("✅ All checks passed");
    return;
  }

  if (errors.length > 0) {
    console.log("🔍 Markdownlint issues:");
    for (const error of errors) {
      console.log(`  ${error.file}:${error.line}:${error.column} - ${error.rule}: ${error.message}`);
    }
  }

  if (widthErrors.length > 0) {
    console.log(`📏 Line width issues (> ${MAX_WIDTH} chars):`);
    for (const error of widthErrors) {
      console.log(`  ${error.file}:${error.line}:${error.column} - ${error.length} characters`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const json = args.includes('--json');
  const files = args.filter(arg => !arg.startsWith('--'));

  if (files.length === 0) {
    console.log("Usage: bun run lint-md.ts [--json] <files...>");
    process.exit(1);
  }

  const markdownFiles = await getMarkdownFiles(files);
  const [errors, widthErrors] = await Promise.all([
    runMarkdownlint(markdownFiles),
    checkLineWidth(markdownFiles)
  ]);

  formatResults(errors, widthErrors, json);

  if (errors.length > 0 || widthErrors.length > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error("Error:", err);
  process.exit(1);
});
