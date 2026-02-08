/**
 * Ultra-Zen Documentation Streaming Demo
 * Demonstrates high-performance streaming search with Bun.spawn Web Standard APIs
 */

import { ZenStreamSearcher, EnhancedDocsFetcher } from '../lib/docs/stream-search';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function demonstrateZeroCopyStreaming() {
  console.log('🚀 Zero-Copy Streaming with ReadableStream');
  console.log('=' .repeat(50));

  const searcher = new ZenStreamSearcher();
  const cachePath = join(__dirname, '..', '.cache'); // Use parent cache directory
  
  try {
    const stats = await searcher.streamSearch({
      query: 'bun',
      cachePath,
      onMatch: (match) => {
        console.log(`✨ ${match.data.path.text}:${match.data.line_number} - ${match.data.lines.text.trim()}`);
      },
      onProgress: (stats) => {
        console.log(`📈 Progress: ${stats.matchesFound} matches, ${(stats.bytesProcessed / 1024).toFixed(1)}KB`);
      }
    });

    console.log(`\n✅ Streaming complete: ${stats.matchesFound} matches in ${stats.elapsedTime.toFixed(2)}ms`);
    console.log(`💾 Memory efficiency: Only ${stats.bytesProcessed} bytes processed (no full text held in memory)`);
    
  } catch (error) {
    console.error('❌ Streaming demo failed:', error);
  }
}

async function demonstratePTYSearch() {
  console.log('\n🖥️  Advanced PTY Support (Interactive Terminal)');
  console.log('=' .repeat(50));

  const searcher = new ZenStreamSearcher();
  const cachePath = join(__dirname, '..', '.cache');
  
  try {
    console.log('Running PTY search with ANSI colors preserved...');
    await searcher.ptySearch('bun', cachePath);
    console.log('\n✅ PTY search complete');
    
  } catch (error) {
    console.error('❌ PTY demo failed:', error);
  }
}

async function demonstrateResourceMonitoring() {
  console.log('\n📊 Resource Usage Monitoring');
  console.log('=' .repeat(50));

  const searcher = new ZenStreamSearcher();
  const cachePath = join(__dirname, '..', '.cache');
  
  try {
    const { stats, resources } = await searcher.monitoredSearch('bun', cachePath);
    
    console.log('\n🔍 Detailed Resource Analysis:');
    console.log(`   📈 Peak Memory: ${(resources.maxRSS / 1024 / 1024).toFixed(2)} MB`);
    console.log(`   ⏱️  CPU User Time: ${resources.cpuTime.user}ms`);
    console.log(`   ⏱️  CPU System Time: ${resources.cpuTime.system}ms`);
    console.log(`   ⏱️  CPU Total Time: ${resources.cpuTime.total}ms`);
    console.log(`   📊 Block I/O Operations: ${resources.blockInputs} inputs, ${resources.blockOutputs} outputs`);
    
  } catch (error) {
    console.error('❌ Resource monitoring demo failed:', error);
  }
}

async function demonstrateAdaptiveSearch() {
  console.log('\n🔄 Adaptive Search with Safe Termination');
  console.log('=' .repeat(50));

  const searcher = new ZenStreamSearcher();
  const cachePath = join(__dirname, '..', '.cache');
  
  try {
    console.log('Starting first search...');
    const search1 = searcher.adaptiveSearch('bun', cachePath);
    
    // Simulate user typing a new query after 500ms
    setTimeout(() => {
      console.log('\n⚡ User typed new query - cancelling previous search...');
    }, 500);
    
    // Start a new search (will automatically cancel the first one)
    await new Promise(resolve => setTimeout(resolve, 600));
    const stats = await searcher.adaptiveSearch('ReadableStream', cachePath);
    
    console.log(`\n✅ Adaptive search complete: ${stats.matchesFound} matches`);
    console.log('🛑 Previous search was safely terminated to save CPU');
    
  } catch (error) {
    console.error('❌ Adaptive search demo failed:', error);
  }
}

async function demonstrateResponseSearch() {
  console.log('\n🌐 Search Through Response Object (No Temp Files)');
  console.log('=' .repeat(50));

  const searcher = new ZenStreamSearcher();
  
  try {
    // Create a mock Response object (in real usage, this would be from fetch())
    const mockContent = `
Bun.spawn is a powerful API for process management.
ReadableStream integration allows zero-copy streaming.
Response objects can be used directly as stdin.
Web Standard APIs make this ultra-efficient.
    `;
    
    const response = new Response(mockContent);
    
    const stats = await searcher.searchResponse(response, 'stream');
    
    console.log(`✅ Response search complete: ${stats.matchesFound} matches`);
    console.log('💾 No temporary files created - Response streamed directly to ripgrep');
    
  } catch (error) {
    console.error('❌ Response search demo failed:', error);
  }
}

async function demonstrateEnhancedDocsFetcher() {
  console.log('\n📚 Enhanced Docs Fetcher Integration');
  console.log('=' .repeat(50));

  const fetcher = new EnhancedDocsFetcher();
  const cachePath = join(__dirname, '..', '.cache');
  
  try {
    await fetcher.fetchAndSearch('AbortSignal', 'https://bun.sh/docs', cachePath);
    
  } catch (error) {
    console.error('❌ Enhanced fetcher demo failed:', error);
  } finally {
    await fetcher.dispose();
  }
}

async function runAllDemos() {
  console.log('🧘 Ultra-Zen Documentation Streaming System');
  console.log('High-performance search using Bun.spawn Web Standard APIs');
  console.log('=' .repeat(60));

  await demonstrateZeroCopyStreaming();
  await demonstratePTYSearch();
  await demonstrateResourceMonitoring();
  await demonstrateAdaptiveSearch();
  await demonstrateResponseSearch();
  await demonstrateEnhancedDocsFetcher();

  console.log('\n🎉 All demos completed!');
  console.log('\n💡 Key Benefits Demonstrated:');
  console.log('   • Zero-copy streaming with ReadableStream');
  console.log('   • Advanced PTY support for interactive terminals');
  console.log('   • Comprehensive resource usage monitoring');
  console.log('   • Safe termination with AbortSignal');
  console.log('   • Direct Response object processing');
  console.log('   • AsyncDisposable pattern for automatic cleanup');
  console.log('   • Type-safe Web Standard APIs integration');
}

// Run demos if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runAllDemos().catch(console.error);
}

export { runAllDemos };
