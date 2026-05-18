#!/usr/bin/env bun

/**
 * senior-fix-old-json.ts – Add to Your 1770398420427.json!
 * 
 * This script enhances an existing junior profile JSON file with the full GFM feature scan.
 * It reads the old JSON, replaces the feature counts with comprehensive scanning,
 * and writes an enhanced version for senior analysis.
 */

import { scanFeatures } from './junior-runner';

async function enhanceSeniorProfile() {
  try {
    // Read the original junior profile
    const oldJson = JSON.parse(await Bun.file('junior-1770398420427.json').text());
    
    // Try to get original markdown content - for now use the multi-table test
    // In a real scenario, this might be stored in the JSON or reconstructed
    const md = await Bun.file('../test-multi-table.md').text();
    
    console.info(`📄 Processing markdown: ${md.length} chars`);
    
    // Replace with FULL GFM feature scan
    const scanResult = scanFeatures(md);
    oldJson.markdown.featureCounts = scanResult.features;  // FULL!
    
    // Add metadata about the enhancement
    oldJson.enhanced = {
      timestamp: new Date().toISOString(),
      scanner: "FULL_GFM_v2.0",
      scanTime: scanResult.scanTime,
      originalFeatures: Object.keys(oldJson.markdown.featureCounts).length,
      features: ["headings", "tables", "codeBlocks", "links", "images", "taskLists", "strikethrough", "blockquotes", "lists", "math", "wikiLinks", "gfmScore"]
    };
    
    // Write the enhanced senior profile
    await Bun.write('senior-enhanced.json', JSON.stringify(oldJson, null, 2));
    
    console.info('✅ Senior profile enhanced with FULL GFM features!');
    console.info('📁 Output: senior-enhanced.json');
    console.info(`🔍 Features scanned: ${Object.keys(oldJson.markdown.featureCounts).length}`);
    console.info(`⚡ Scan time: ${scanResult.scanTime.toFixed(2)}μs`);
    
    // Display the enhanced feature counts
    console.info('\n📊 Enhanced Feature Analysis:');
    const features = oldJson.markdown.featureCounts;
    Object.entries(features).forEach(([key, value]) => {
      if (typeof value === 'object') {
        console.info(`  ${key}:`);
        Object.entries(value as any).forEach(([subKey, subValue]) => {
          console.info(`    ${subKey}: ${subValue}`);
        });
      } else {
        console.info(`  ${key}: ${value}`);
      }
    });
    
  } catch (error) {
    console.error('❌ Error enhancing senior profile:', error);
    process.exit(1);
  }
}

// Run the enhancement
if (import.meta.main) {
  enhanceSeniorProfile();
}

export { enhanceSeniorProfile };
