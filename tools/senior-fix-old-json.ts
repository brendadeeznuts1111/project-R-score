#!/usr/bin/env bun

/**
 * Senior Fix Old JSON
 * 
 * Enhances existing JSON with full markdown feature counts
 * 
 * Usage:
 *   bun run tools/senior-fix-old-json.ts
 *   bun run tools/senior-fix-old-json.ts path/to/input.json path/to/output.json
 */

import { scanFeatures } from '../lib/docs/markdown-scanner';

interface FeatureCount {
  name: string;
  count: number;
  enabled: boolean;
}

interface MarkdownFeatures {
  tables: number;
  strikethrough: number;
  tasklists: number;
  autolinks: number;
  headings: number;
  codeBlocks: number;
  totalFeatures: number;
  features: FeatureCount[];
}

/**
 * Scan markdown content for feature usage
 */
function scanMarkdownFeatures(content: string): MarkdownFeatures {
  const features: FeatureCount[] = [
    { name: 'tables', count: (content.match(/\|.*\|/g) || []).length, enabled: true },
    { name: 'strikethrough', count: (content.match(/~~.+~~/g) || []).length, enabled: true },
    { name: 'tasklists', count: (content.match(/- \[[x ]\]/g) || []).length, enabled: true },
    { name: 'autolinks', count: (content.match(/https?:\/\/[^\s]+/g) || []).length, enabled: true },
    { name: 'headings', count: (content.match(/^#{1,6}\s+/gm) || []).length, enabled: true },
    { name: 'codeBlocks', count: (content.match(/```[\s\S]*?```/g) || []).length, enabled: true },
    { name: 'bold', count: (content.match(/\*\*.+?\*\*/g) || []).length, enabled: true },
    { name: 'italic', count: (content.match(/\*[^*]+\*/g) || []).length, enabled: true },
    { name: 'links', count: (content.match(/\[.+?\]\(.+?\)/g) || []).length, enabled: true },
    { name: 'images', count: (content.match(/!\[.*?\]\(.+?\)/g) || []).length, enabled: true },
    { name: 'blockquotes', count: (content.match(/^>.+/gm) || []).length, enabled: true },
    { name: 'lists', count: (content.match(/^[-*+]\s+/gm) || []).length, enabled: true },
  ];

  return {
    tables: features.find(f => f.name === 'tables')?.count || 0,
    strikethrough: features.find(f => f.name === 'strikethrough')?.count || 0,
    tasklists: features.find(f => f.name === 'tasklists')?.count || 0,
    autolinks: features.find(f => f.name === 'autolinks')?.count || 0,
    headings: features.find(f => f.name === 'headings')?.count || 0,
    codeBlocks: features.find(f => f.name === 'codeBlocks')?.count || 0,
    totalFeatures: features.reduce((sum, f) => sum + f.count, 0),
    features: features.filter(f => f.count > 0),
  };
}

/**
 * Main function to enhance JSON with markdown features
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const inputFile = args[0] || 'junior-1770398420427.json';
  const outputFile = args[1] || 'senior-enhanced.json';

  console.log(`🔄 Processing: ${inputFile} → ${outputFile}`);

  try {
    // Read old JSON
    const file = Bun.file(inputFile);
    if (!(await file.exists())) {
      console.error(`❌ File not found: ${inputFile}`);
      process.exit(1);
    }

    const oldJson = await file.json();
    console.log('✅ Loaded old JSON');

    // Find markdown content to scan
    let markdownContent = '';
    
    if (oldJson.markdown?.content) {
      markdownContent = oldJson.markdown.content;
    } else if (oldJson.content) {
      markdownContent = oldJson.content;
    } else if (oldJson.body) {
      markdownContent = oldJson.body;
    } else if (oldJson.description) {
      markdownContent = oldJson.description;
    }

    if (!markdownContent) {
      console.warn('⚠️  No markdown content found in JSON, using sample');
      markdownContent = '# Sample\n\n**Bold** and *italic* text.';
    }

    // Scan features
    const featureCounts = scanMarkdownFeatures(markdownContent);
    console.log(`✅ Scanned ${featureCounts.totalFeatures} total features`);

    // Enhance JSON
    const enhancedJson = {
      ...oldJson,
      markdown: {
        ...oldJson.markdown,
        featureCounts,
        scannedAt: new Date().toISOString(),
        scannerVersion: '1.0.0',
      },
      _enhanced: {
        originalFile: inputFile,
        enhancedAt: new Date().toISOString(),
        tool: 'senior-fix-old-json',
      },
    };

    // Write enhanced JSON
    await Bun.write(outputFile, JSON.stringify(enhancedJson, null, 2));
    console.log(`✅ Enhanced JSON written to: ${outputFile}`);

    // Summary
    console.log('\n📊 Feature Summary:');
    console.log(`  Total features: ${featureCounts.totalFeatures}`);
    console.log(`  Tables: ${featureCounts.tables}`);
    console.log(`  Strikethrough: ${featureCounts.strikethrough}`);
    console.log(`  Task lists: ${featureCounts.tasklists}`);
    console.log(`  Autolinks: ${featureCounts.autolinks}`);
    console.log(`  Headings: ${featureCounts.headings}`);
    console.log(`  Code blocks: ${featureCounts.codeBlocks}`);
    console.log(`\n  Detailed features: ${featureCounts.features.length} types found`);

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { scanMarkdownFeatures };
export type { MarkdownFeatures, FeatureCount };
