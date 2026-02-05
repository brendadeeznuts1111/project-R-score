#!/usr/bin/env bun
/**
 * CSS Extraction and Consolidation Script
 * Extracts inline styles from HTML files and consolidates them
 */

import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

interface ExtractedStyles {
  file: string;
  styles: string[];
  styleBlocks: string[];
}

async function findHTMLFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
      files.push(...(await findHTMLFiles(fullPath)));
    } else if (entry.isFile() && entry.name.endsWith('.html')) {
      files.push(fullPath);
    }
  }

  return files;
}

async function extractStylesFromHTML(filePath: string): Promise<ExtractedStyles> {
  const content = await readFile(filePath, 'utf-8');
  const styles: string[] = [];
  const styleBlocks: string[] = [];

  // Extract inline style attributes
  const inlineStyleRegex = /style="([^"]*)"/g;
  let match;
  while ((match = inlineStyleRegex.exec(content)) !== null) {
    styles.push(match[1]);
  }

  // Extract <style> blocks
  const styleBlockRegex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  while ((match = styleBlockRegex.exec(content)) !== null) {
    styleBlocks.push(match[1]);
  }

  return {
    file: filePath,
    styles,
    styleBlocks,
  };
}

async function consolidateStyles() {
  console.log('🎨 Starting CSS extraction and consolidation...');

  // Find all HTML files in src directory
  const srcFiles = await findHTMLFiles('src');
  console.log(`📁 Found ${srcFiles.length} HTML files in src/`);

  // Extract styles from each file
  const extractedStyles: ExtractedStyles[] = [];
  for (const file of srcFiles) {
    const styles = await extractStylesFromHTML(file);
    if (styles.styles.length > 0 || styles.styleBlocks.length > 0) {
      extractedStyles.push(styles);
      const relPath = relative(process.cwd(), file);
      console.log(
        `  ✓ ${relPath}: ${styles.styles.length} inline, ${styles.styleBlocks.length} blocks`
      );
    }
  }

  // Build consolidated CSS
  let consolidatedCSS = `/**
 * Consolidated CSS from Fire22 Dashboard
 * Generated: ${new Date().toISOString()}
 * Source: Extracted from ${extractedStyles.length} HTML files
 */

/* !==!==!==!==!===
   Import Core Styles
   !==!==!==!==!=== */
@import "../../src/styles/index.css";

/* !==!==!==!==!===
   Extracted Style Blocks
   !==!==!==!==!=== */
`;

  // Add style blocks
  for (const extracted of extractedStyles) {
    if (extracted.styleBlocks.length > 0) {
      const relPath = relative(process.cwd(), extracted.file);
      consolidatedCSS += `\n/* --- From: ${relPath} --- */\n`;
      consolidatedCSS += extracted.styleBlocks.join('\n\n');
      consolidatedCSS += '\n';
    }
  }

  // Convert inline styles to classes
  consolidatedCSS += `\n/* !==!==!==!==!===
   Converted Inline Styles
   !==!==!==!==!=== */\n`;

  const inlineStyleMap = new Map<string, Set<string>>();

  for (const extracted of extractedStyles) {
    for (const style of extracted.styles) {
      const fileName = relative(process.cwd(), extracted.file)
        .replace(/[\/\\]/g, '-')
        .replace('.html', '');
      if (!inlineStyleMap.has(fileName)) {
        inlineStyleMap.set(fileName, new Set());
      }
      inlineStyleMap.get(fileName)!.add(style);
    }
  }

  // Generate classes from inline styles
  for (const [fileName, styles] of inlineStyleMap) {
    if (styles.size > 0) {
      consolidatedCSS += `\n/* Inline styles from ${fileName} */\n`;
      let classIndex = 0;
      for (const style of styles) {
        classIndex++;
        consolidatedCSS += `.${fileName}-inline-${classIndex} {\n  ${style.replace(/;/g, ';\n  ').trim()}\n}\n`;
      }
    }
  }

  // Write consolidated CSS
  await writeFile('public/css/styles.css', consolidatedCSS);
  console.log(`\n✅ Consolidated CSS written to public/css/styles.css`);

  // Generate summary
  const totalInlineStyles = Array.from(inlineStyleMap.values()).reduce(
    (sum, set) => sum + set.size,
    0
  );
  const totalStyleBlocks = extractedStyles.reduce((sum, e) => sum + e.styleBlocks.length, 0);

  console.log(`\n📊 Summary:`);
  console.log(`  - Files processed: ${srcFiles.length}`);
  console.log(`  - Files with styles: ${extractedStyles.length}`);
  console.log(`  - Style blocks extracted: ${totalStyleBlocks}`);
  console.log(`  - Inline styles converted: ${totalInlineStyles}`);

  // Generate migration guide
  const migrationGuide = `# CSS Migration Guide

## Files to Update

Replace inline styles and style blocks in these HTML files with:
\`\`\`html
<link rel="stylesheet" href="/css/styles.css">
\`\`\`

### Files with extracted styles:
${extractedStyles.map(e => `- ${relative(process.cwd(), e.file)}`).join('\n')}

## Next Steps

1. Review the generated styles.css
2. Remove duplicate styles
3. Update HTML files to use the consolidated CSS
4. Test dark mode toggle across all pages
`;

  await writeFile('public/css/MIGRATION_GUIDE.md', migrationGuide);
  console.log(`\n📝 Migration guide written to public/css/MIGRATION_GUIDE.md`);
}

// Run the consolidation
consolidateStyles().catch(console.error);
