#!/usr/bin/env bun
/**
 * CLI Tool Example
 *
 * A complete CLI tool for rendering markdown files
 * Usage: bun examples/cli-tool.ts [file] [options]
 */

import {
  MarkdownPresets,
  MARKDOWN_FEATURES,
  TERMINAL_RENDERERS,
  extractText,
  estimateReadingTime,
  countWords,
} from '../src/index';
import { existsSync, readFileSync } from 'fs';

// Parse command line arguments
const args = process.argv.slice(2);
const filePath = args.find(arg => !arg.startsWith('--'));
const showHelp = args.includes('--help') || args.includes('-h');
const useTerminal = args.includes('--terminal') || args.includes('-t');
const showStats = args.includes('--stats') || args.includes('-s');
const extractPlainText = args.includes('--text') || args.includes('-x');

// Help message
if (showHelp || !filePath) {
  console.info(`
Usage: bun cli-tool.ts <file> [options]

Options:
  -h, --help       Show this help message
  -t, --terminal   Render for terminal output (with colors)
  -s, --stats      Show document statistics
  -x, --text       Extract plain text only

Examples:
  bun cli-tool.ts document.md
  bun cli-tool.ts document.md --terminal
  bun cli-tool.ts document.md --stats
  bun cli-tool.ts document.md --text
`);
  process.exit(showHelp ? 0 : 1);
}

// Check if file exists
if (!existsSync(filePath)) {
  console.error(`Error: File not found: ${filePath}`);
  process.exit(1);
}

// Read the file
const content = readFileSync(filePath, 'utf-8');

// Show statistics if requested
if (showStats) {
  console.info('\n📊 Document Statistics');
  console.info('-'.repeat(50));
  console.info(`File: ${filePath}`);
  console.info(`Characters: ${content.length.toLocaleString()}`);
  console.info(`Words: ${countWords(content).toLocaleString()}`);

  const readingTime = estimateReadingTime(content);
  console.info(`Reading time: ${readingTime.minutes} minute(s)`);
  console.info();
}

// Extract plain text if requested
if (extractPlainText) {
  console.info('\n📝 Plain Text Extract');
  console.info('-'.repeat(50));
  console.info(extractText(content));
  process.exit(0);
}

// Render based on mode
if (useTerminal) {
  console.info('\n🖥️  Terminal Render');
  console.info('-'.repeat(50));

  const renderTerminal = MarkdownPresets.render('COLOR', MARKDOWN_FEATURES.TERMINAL);
  const output = renderTerminal(content);

  // Note: Terminal renderers use ANSI codes
  // For this demo, we'll just show the HTML output with a note
  console.info('Note: Terminal renderers use ANSI color codes for CLI display');
  console.info('Output preview:');
  console.info(output.substring(0, 500));
} else {
  console.info('\n🌐 HTML Render');
  console.info('-'.repeat(50));

  const renderHtml = MarkdownPresets.html('GFM', 'MODERATE');
  const html = renderHtml(content);

  console.info('Generated HTML:');
  console.info(html.substring(0, 1000));

  if (html.length > 1000) {
    console.info(`\n... (${(html.length - 1000).toLocaleString()} more characters)`);
  }
}

console.info('\n✅ Done!');
