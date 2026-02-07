#!/usr/bin/env bun
// tools/senior-fix-old-json.ts — Enhance existing JSON with markdown feature counts

import { scanFeatures } from '../lib/docs/markdown-scanner';

// Read old JSON
const oldJson = JSON.parse(await Bun.file('junior-1770398420427.json').text());

// Extract markdown content
const md = oldJson.markdown?.content || oldJson.content || '';

// Add feature counts
oldJson.markdown = oldJson.markdown || {};
oldJson.markdown.featureCounts = scanFeatures(md).features;  // FULL!

// Write enhanced JSON
await Bun.write('senior-enhanced.json', JSON.stringify(oldJson, null, 2));

console.log('✅ Enhanced JSON written to: senior-enhanced.json');
console.log('Features added:', oldJson.markdown.featureCounts.length);
