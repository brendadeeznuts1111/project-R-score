#!/usr/bin/env bun
/**
 * 🚀 FACTORYWAGER TABULAR v4.3 CLI - Chromatic Power Moves
 * CLI interface for HSL chromatic tabular rendering
 */

import { renderFactoryTabular, hsl, statusColor } from './fm-table-v43.ts';

// Parse CLI arguments
const args = process.argv.slice(2);
const flags = {
  input: '',
  ansi: false,
  help: false
};

// Simple argument parser
for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  if (arg === '--input' || arg === '-i') {
    flags.input = args[++i];
  } else if (arg === '--ansi' || arg === '-a') {
    flags.ansi = true;
  } else if (arg === '--help' || arg === '-h') {
    flags.help = true;
  }
}

// Help output
if (flags.help) {
  console.log(`
🎨 FACTORYWAGER TABULAR v4.3 CLI - Chromatic Power Moves

USAGE:
  bun run fm-table-v43-cli.ts --input <file> [--ansi]
  bun run fm-table-v43-cli.ts -i <file> [-a]

OPTIONS:
  --input, -i <file>    Input file to render (markdown, json, etc.)
  --ansi, -a           Force ANSI color output
  --help, -h           Show this help message

EXAMPLES:
  # Render with HSL chromatics
  bun run fm-table-v43-cli.ts --input content/post.md --ansi

  # HSL color test
  bun -e '
    const c = Bun.color("hsl(145, 80%, 45%)");
    console.log(c.ansi16m + "Active Status" + "\\x1b[0m");
    console.log("Hex:", c.hex());
    console.log("RGB:", c.rgba());
  '

  # Unicode width verification
  bun -e '
    const str = "中文测试";
    console.log("Length:", str.length);
    console.log("Unicode width:", Bun.stringWidth(str));
  '
`);
  process.exit(0);
}

// Sample data if no input provided
if (!flags.input) {
  console.log('🎨 FACTORYWAGER TABULAR v4.3 - DEMO MODE (No input file provided)');
  console.log('Use --input <file> to render actual data\n');

  const demoData = [
    {
      key: "title",
      value: "FactoryWager API Guide",
      version: "v4.3",
      bun: "1.3.8",
      author: "nolarose",
      status: "active",
      date_iso: "2026-02-01T08:14:00"
    },
    {
      key: "chromatics",
      value: { hsl: true, unicode: true, defaults: true },
      version: "v4.3",
      bun: "1.3.8",
      author: "system",
      status: "active",
      date_iso: "2026-02-01T08:20:00"
    },
    {
      key: "unicode_test",
      value: "中文测试🚀",
      version: "v4.3",
      bun: "any",
      author: "user",
      status: "draft",
      date_iso: null
    }
  ];

  await renderFactoryTabular(demoData);
  process.exit(0);
}

// Try to read and parse input file
try {
  const file = Bun.file(flags.input);
  const exists = await file.exists();

  if (!exists) {
    console.error(`❌ File not found: ${flags.input}`);
    process.exit(1);
  }

  const content = await file.text();
  let data = [];

  // Simple parsing based on file extension
  if (flags.input.endsWith('.json')) {
    data = JSON.parse(content);
  } else if (flags.input.endsWith('.md')) {
    // Simple frontmatter extraction for markdown
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
    if (frontmatterMatch) {
      const frontmatter = frontmatterMatch[1];
      const lines = frontmatter.split('\n');
      const obj: any = {};

      lines.forEach(line => {
        const colon = line.indexOf(':');
        if (colon > 0) {
          const key = line.slice(0, colon).trim();
          let value = line.slice(colon + 1).trim();

          // Remove quotes if present
          if ((value.startsWith('"') && value.endsWith('"')) ||
              (value.startsWith("'") && value.endsWith("'"))) {
            value = value.slice(1, -1);
          }

          // Try to parse as JSON for complex values
          try {
            obj[key] = JSON.parse(value);
          } catch {
            obj[key] = value;
          }
        }
      });

      // Convert to tabular format
      Object.entries(obj).forEach(([k, v]) => {
        data.push({
          key: k,
          value: v,
          status: 'active'
        });
      });
    }
  } else {
    console.error(`❌ Unsupported file type: ${flags.input}`);
    console.log('Supported formats: .json, .md');
    process.exit(1);
  }

  if (data.length === 0) {
    console.log('⚠️  No data found in file');
    process.exit(0);
  }

  await renderFactoryTabular(data);

} catch (error: any) {
  console.error(`❌ Error processing file: ${error?.message || String(error)}`);
  process.exit(1);
}
