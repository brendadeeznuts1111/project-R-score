#!/usr/bin/env bun

import { EnhancedZenStreamSearcher } from './lib/docs/enhanced-stream-search';

const searcher = new EnhancedZenStreamSearcher();

console.log('🔍 Searching for "partitioned" in documentation...');
console.log('=' .repeat(60));

try {
  const results = await searcher.streamSearch({
    query: 'partitioned',
    cachePath: '/Users/nolarose/Projects/.cache',
    enableCache: true,
    filePatterns: ['*.md', '*.ts', '*.js', '*.json'],
    excludePatterns: ['node_modules/*', '*.min.js', 'dist/*'],
    caseSensitive: false,
    maxResults: 20,
    onProgress: (stats) => {
      console.log(`   📊 Progress: ${stats.matchesFound} matches at ${stats.throughput.toFixed(0)} matches/sec`);
    }
  });

  console.log(`\n✅ Search Complete: ${results.matchesFound} matches in ${results.elapsedTime.toFixed(2)}ms`);
  console.log(`   📁 Files with matches: ${results.filesWithMatches}`);
  console.log(`   🚀 Throughput: ${results.throughput.toFixed(0)} matches/sec`);
  console.log(`   💾 Cache Hit Rate: ${(results.cacheHitRate * 100).toFixed(1)}%`);
  
} catch (error) {
  console.error('❌ Search failed:', error.message);
}
