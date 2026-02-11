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
  countWords
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
  console.log(`
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
  console.log('\n📊 Document Statistics');
  console.log('-'.repeat(50));
  console.log(`File: ${filePath}`);
  console.log(`Characters: ${content.length.toLocaleString()}`);
  console.log(`Words: ${countWords(content).toLocaleString()}`);
  
  const readingTime = estimateReadingTime(content);
  console.log(`Reading time: ${readingTime.minutes} minute(s)`);
  console.log();
}

// Extract plain text if requested
if (extractPlainText) {
  console.log('\n📝 Plain Text Extract');
  console.log('-'.repeat(50));
  console.log(extractText(content));
  process.exit(0);
}

// Render based on mode
if (useTerminal) {
  console.log('\n🖥️  Terminal Render');
  console.log('-'.repeat(50));
  
  const renderTerminal = MarkdownPresets.render('COLOR', MARKDOWN_FEATURES.TERMINAL);
  const output = renderTerminal(content);
  
  // Note: Terminal renderers use ANSI codes
  // For this demo, we'll just show the HTML output with a note
  console.log('Note: Terminal renderers use ANSI color codes for CLI display');
  console.log('Output preview:');
  console.log(output.substring(0, 500));
  
} else {
  console.log('\n🌐 HTML Render');
  console.log('-'.repeat(50));
  
  const renderHtml = MarkdownPresets.html('GFM', 'MODERATE');
  const html = renderHtml(content);
  
  console.log('Generated HTML:');
  console.log(html.substring(0, 1000));
  
  if (html.length > 1000) {
    console.log(`\n... (${(html.length - 1000).toLocaleString()} more characters)`);
  }
}

console.log('\n✅ Done!');
