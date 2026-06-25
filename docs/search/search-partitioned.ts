#!/usr/bin/env bun

import { EnhancedZenStreamSearcher } from './lib/docs/enhanced-stream-search';

const searcher = new EnhancedZenStreamSearcher();

console.info('🔍 Searching for "partitioned" in documentation...');
console.info('=' .repeat(60));

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
      console.info(`   📊 Progress: ${stats.matchesFound} matches at ${stats.throughput.toFixed(0)} matches/sec`);
    }
  });

  console.info(`\n✅ Search Complete: ${results.matchesFound} matches in ${results.elapsedTime.toFixed(2)}ms`);
  console.info(`   📁 Files with matches: ${results.filesWithMatches}`);
  console.info(`   🚀 Throughput: ${results.throughput.toFixed(0)} matches/sec`);
  console.info(`   💾 Cache Hit Rate: ${(results.cacheHitRate * 100).toFixed(1)}%`);
  
} catch (error) {
  console.error('❌ Search failed:', error.message);
}
