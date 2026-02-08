#!/usr/bin/env bun

/**
 * Network-to-Process Streaming Showcase
 * Demonstrates the revolutionary fetch() → Bun.spawn streaming capability
 */

import { FetchAndRipStreamer, DOCUMENTATION_URLS, NetworkDocumentationSearcher } from '../lib/docs/fetch-and-rip';

/**
 * Demo 1: Basic Network-to-Process Streaming
 */
async function demoBasicStreaming() {
  console.log('🌐 Demo 1: Basic Network-to-Process Streaming');
  console.log('=' .repeat(60));
  
  const streamer = new FetchAndRipStreamer();
  
  // Search for "spawn" in the Bun LLMs documentation
  await streamer.searchRemoteContent(
    DOCUMENTATION_URLS.llms,
    "spawn"
  );
}

/**
 * Demo 2: Multi-Query Streaming
 */
async function demoMultiQuery() {
  console.log('\n🔍 Demo 2: Multi-Query Streaming');
  console.log('=' .repeat(60));
  
  const streamer = new FetchAndRipStreamer();
  
  // Search for multiple terms in one fetch
  await streamer.searchMultipleQueries(
    DOCUMENTATION_URLS.llms,
    ["fetch", "spawn", "ReadableStream", "Response"]
  );
}

/**
 * Demo 3: JSON Processing Pipeline
 */
async function demoJSONProcessing() {
  console.log('\n🧠 Demo 3: JSON Processing Pipeline');
  console.log('=' .repeat(60));
  
  const streamer = new FetchAndRipStreamer();
  
  // Get structured results
  const results = await streamer.searchWithProcessing(
    DOCUMENTATION_URLS.llms,
    "bun"
  );
  
  console.log('\n📊 Structured Results:');
  results.forEach((result, i) => {
    console.log(`${i + 1}. Line ${result.line}: ${result.content}`);
    if (result.submatches.length > 0) {
      console.log(`   📍 Submatches: ${result.submatches.join(', ')}`);
    }
  });
}

/**
 * Demo 4: Zen Network Search Integration
 */
async function demoZenNetworkSearch() {
  console.log('\n🔮 Demo 4: Zen Network Search Integration');
  console.log('=' .repeat(60));
  
  const networkSearcher = new NetworkDocumentationSearcher();
  
  try {
    // Use the Zen streaming approach on remote content
    const stats = await networkSearcher.searchRemoteDocs(
      DOCUMENTATION_URLS.llms,
      "performance"
    );
    
    console.log(`📈 Search Stats:`);
    console.log(`   Matches: ${stats.matchesFound}`);
    console.log(`   Files: ${stats.filesSearched}`);
    console.log(`   Bytes: ${stats.bytesProcessed}`);
    console.log(`   Time: ${stats.elapsedTime.toFixed(2)}ms`);
    
  } catch (error) {
    console.log(`⚠️ Network search failed (expected in some environments): ${error.message}`);
  }
}

/**
 * Demo 5: Performance Comparison
 */
async function demoPerformanceComparison() {
  console.log('\n⚡ Demo 5: Performance Comparison');
  console.log('=' .repeat(60));
  
  const url = DOCUMENTATION_URLS.llms;
  const query = "bun";
  
  // Method 1: Download then search (traditional)
  console.log('📥 Traditional: Download → Search');
  const downloadStart = performance.now();
  const response = await fetch(url);
  const text = await response.text();
  const downloadTime = performance.now() - downloadStart;
  
  // Write to temp file and search
  const tempFile = '/tmp/bun-docs.txt';
  await Bun.write(tempFile, new TextEncoder().encode(text));
  
  const searchStart = performance.now();
  const searchProc = (Bun as any).spawn(['rg', '-c', query, tempFile], { stdout: 'pipe' });
  const searchResult = await searchProc.stdout.text();
  const searchTime = performance.now() - searchStart;
  
  console.log(`   Download: ${downloadTime.toFixed(2)}ms`);
  console.log(`   Search: ${searchTime.toFixed(2)}ms`);
  console.log(`   Total: ${(downloadTime + searchTime).toFixed(2)}ms`);
  console.log(`   Matches: ${searchResult.trim()}`);
  
  // Method 2: Direct streaming (revolutionary)
  console.log('\n🚀 Revolutionary: Direct Stream');
  const streamStart = performance.now();
  const streamProc = (Bun as any).spawn(['rg', '-c', query], {
    stdin: await fetch(url),
    stdout: 'pipe'
  });
  const streamResult = await streamProc.stdout.text();
  const streamTime = performance.now() - streamStart;
  
  console.log(`   Streaming: ${streamTime.toFixed(2)}ms`);
  console.log(`   Matches: ${streamResult.trim()}`);
  console.log(`   Speedup: ${((downloadTime + searchTime) / streamTime).toFixed(2)}x faster`);
  
  // Cleanup
  await (Bun as any).file(tempFile).delete();
}

/**
 * Demo 6: Real-time URL Analysis
 */
async function demoRealtimeAnalysis() {
  console.log('\n📊 Demo 6: Real-time URL Analysis');
  console.log('=' .repeat(60));
  
  const streamer = new FetchAndRipStreamer();
  
  // Analyze different documentation sections
  const analyses = [
    { url: DOCUMENTATION_URLS.llms, query: "API" },
    { url: DOCUMENTATION_URLS.runtime, query: "process" },
    { url: DOCUMENTATION_URLS.bundler, query: "build" }
  ];
  
  for (const analysis of analyses) {
    console.log(`\n🔍 Analyzing: ${analysis.url.split('/').pop()}`);
    console.log(`📋 Query: ${analysis.query}`);
    
    try {
      const results = await streamer.searchWithProcessing(analysis.url, analysis.query);
      console.log(`📈 Found ${results.length} matches`);
      
      // Show first 2 results
      results.slice(0, 2).forEach((result, i) => {
        console.log(`   ${i + 1}. ${result.content.substring(0, 60)}...`);
      });
      
    } catch (error) {
      console.log(`   ⚠️ Analysis failed: ${error.message}`);
    }
  }
}

/**
 * Main demonstration runner
 */
async function runNetworkStreamDemo() {
  console.log('🌐 Network-to-Process Streaming Showcase');
  console.log('🚀 Demonstrating fetch() → Bun.spawn Zero-Copy Streaming');
  console.log('=' .repeat(80));
  
  try {
    await demoBasicStreaming();
    await demoMultiQuery();
    await demoJSONProcessing();
    await demoZenNetworkSearch();
    await demoPerformanceComparison();
    await demoRealtimeAnalysis();
    
    console.log('\n🎉 Network Streaming Demo Complete!');
    console.log('💡 Revolutionary Benefits:');
    console.log('   - Zero-copy: No intermediate files');
    console.log('   - Memory efficient: Stream directly from network');
    console.log('   - Fast: Eliminates download+search overhead');
    console.log('   - Flexible: Any URL, any tool, any format');
    console.log('   - Web Standards: Uses native fetch() and ReadableStream');
    
  } catch (error) {
    console.error('❌ Demo error:', error);
  }
}

// Run the demonstration
if (import.meta.url === `file://${process.argv[1]}`) {
  runNetworkStreamDemo().catch(console.error);
}

export { runNetworkStreamDemo };
