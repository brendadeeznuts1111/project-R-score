#!/usr/bin/env bun
// IDE-Safe Markdown Generator - Creates LSP-friendly versions of massive tables

import { readFileSync, writeFileSync } from 'fs';

/**
 * Generates IDE-safe versions of markdown files to prevent LSP timeouts
 */
async function generateIDESafe(inputFile: string, outputFile: string = ''): Promise<void> {
  if (!outputFile) {
    outputFile = inputFile.replace(/\\.md$/, '-ide-safe.md');
  }
  
  console.log(`🛡️ Generating IDE-safe version: ${inputFile} → ${outputFile}`);
  
  const md = await Bun.file(inputFile).text();
  let safeMd = md;
  
  // 1. Limit table column widths to prevent LSP overload
  safeMd = safeMd.replace(/\|([^|]{50,})\|/g, (match, content) => {
    const truncated = content.length > 30 ? content.substring(0, 27) + '...' : content;
    return `|${truncated}|`;
  });
  
  // 2. Split massive tables into smaller chunks
  const tableRegex = /(\|[^\n]+\|\n)+/g;
  const tables = safeMd.match(tableRegex) || [];
  
  tables.forEach((table, index) => {
    const rows = table.split('\n').filter(line => line.trim());
    if (rows.length > 20) {
      // Split large tables into chunks of 15 rows
      const chunks = [];
      for (let i = 0; i < rows.length; i += 15) {
        chunks.push(rows.slice(i, i + 15).join('\n'));
      }
      
      const chunkedTable = chunks.join('\n\n*Table continues...*\n\n');
      safeMd = safeMd.replace(table, chunkedTable);
    }
  });
  
  // 3. Limit code block sizes for syntax highlighting
  safeMd = safeMd.replace(/```[\s\S]*?```/g, (match) => {
    const lines = match.split('\n');
    if (lines.length > 50) {
      const truncated = lines.slice(0, 47).join('\n') + '\n... (truncated for IDE) ...\n```';
      return truncated;
    }
    return match;
  });
  
  // 4. Add IDE-safe warning header
  const header = `<!-- IDE-SAFE VERSION - Generated to prevent LSP timeout -->\n<!-- Original: ${inputFile} -->\n\n`;
  safeMd = header + safeMd;
  
  await Bun.write(outputFile, safeMd);
  console.log(`✅ IDE-safe version created: ${outputFile}`);
  console.log(`📊 Original: ${md.length} chars → Safe: ${safeMd.length} chars`);
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('❌ Usage: ide-safe <input-file> [output-file]');
    console.log('Example: ide-safe huge-50col.md');
    console.log('Example: ide-safe massive-tables.md safe-version.md');
    process.exit(1);
  }
  
  const inputFile = args[0];
  const outputFile = args[1] || '';
  
  try {
    await generateIDESafe(inputFile, outputFile);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
