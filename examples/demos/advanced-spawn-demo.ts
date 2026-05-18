#!/usr/bin/env bun

/**
 * Advanced Bun.spawn Features Demo
 * Demonstrates IPC, Terminal (PTY), and multi-process documentation search capabilities
 */

import { IPCDocumentationOrchestrator, TerminalDocumentationExplorer } from '../lib/docs/ipc-stream-search';

/**
 * Demo 1: Multi-Worker Parallel Documentation Search
 */
async function demoMultiWorkerSearch() {
  console.info('🚀 Demo 1: Multi-Worker Parallel Documentation Search');
  console.info('=' .repeat(60));

  const orchestrator = new IPCDocumentationOrchestrator();

  try {
    // Spawn multiple workers
    console.info('📡 Spawning worker processes...');
    const worker1 = orchestrator.spawnWorker('search-worker-1');
    const worker2 = orchestrator.spawnWorker('search-worker-2');
    const worker3 = orchestrator.spawnWorker('search-worker-3');

    if (!worker1 || !worker2 || !worker3) {
      console.info('❌ Failed to spawn workers');
      return;
    }

    // Wait for workers to initialize
    console.info('⏳ Waiting for workers to initialize...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Execute parallel searches with different queries
    const queries = ['bun', 'stream', 'performance', 'readable', 'async'];
    
    for (const query of queries) {
      console.info(`\n🔍 Executing parallel search: "${query}"`);
      await orchestrator.searchAcrossWorkers(query);
      
      // Wait for results
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const results = orchestrator.getAggregatedResults();
      console.info(`📊 Results for "${query}": ${results.totalMatches} total matches`);
      
      // Show breakdown by worker
      for (const stat of results.stats) {
        console.info(`   ${stat.workerId}: ${stat.matchesFound} matches, ${stat.elapsedTime.toFixed(2)}ms`);
      }
    }

  } catch (error) {
    console.error('❌ Multi-worker search error:', error);
  } finally {
    // Cleanup
    await orchestrator.shutdownWorkers();
    console.info('✅ All workers shutdown complete');
  }
}

/**
 * Demo 2: Terminal-based Interactive Documentation Explorer
 */
async function demoTerminalExplorer() {
  console.info('\n📟 Demo 2: Terminal-based Interactive Documentation Explorer');
  console.info('=' .repeat(60));

  const explorer = new TerminalDocumentationExplorer();

  try {
    console.info('🎯 Starting interactive bash session for documentation exploration...');
    console.info('💡 Try running: rg --color=always "bun" /Users/nolarose/Projects/.cache');
    console.info('⏰ Session will timeout after 15 seconds');

    // Start bash session with timeout
    const bashPromise = explorer.startBashSession();
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => {
        console.info('\n⏰ Bash session timeout - terminating...');
        resolve(null);
      }, 15000);
    });

    await Promise.race([bashPromise, timeoutPromise]);

  } catch (error) {
    console.error('❌ Terminal explorer error:', error);
  } finally {
    explorer.close();
    console.info('✅ Terminal explorer closed');
  }
}

/**
 * Demo 3: IPC Communication Patterns
 */
async function demoIPCPatterns() {
  console.info('\n📡 Demo 3: Advanced IPC Communication Patterns');
  console.info('=' .repeat(60));

  // Create a custom worker for demonstration
  const worker = Bun.spawn(["bun", "--import", "./lib/docs/ipc-stream-search.ts"], {
    ipc: (message, subprocess) => {
      console.info(`📨 Parent received: ${message.type}`, message.results?.length || 0, 'items');
      
      // Demonstrate bidirectional communication
      if (message.type === 'complete') {
        subprocess.send({
          type: 'search',
          query: 'acknowledgment',
          timestamp: Date.now()
        });
      }
    },
    serialization: "json"
  });

  // Send various message types
  console.info('📤 Sending test messages...');
  
  worker.send({
    type: 'search',
    query: 'ipc-test',
    timestamp: Date.now()
  });

  // Wait for communication
  await new Promise(resolve => setTimeout(resolve, 3000));

  // Cleanup
  worker.kill();
  console.info('✅ IPC demo complete');
}

/**
 * Demo 4: Performance Comparison
 */
async function demoPerformanceComparison() {
  console.info('\n⚡ Demo 4: Performance Comparison - Single vs Multi-Process');
  console.info('=' .repeat(60));

  const { ZenStreamSearcher } = await import('../lib/docs/stream-search');
  
  // Single process search
  console.info('🔍 Single process search...');
  const singleStart = performance.now();
  
  const searcher = new ZenStreamSearcher();
  const singleResults = await searcher.streamSearch({
    query: 'bun',
    cachePath: '/Users/nolarose/Projects/.cache',
    onMatch: (match) => {
      // Silent processing for performance test
    }
  });
  
  const singleTime = performance.now() - singleStart;
  console.info(`✅ Single process: ${singleResults.matchesFound} matches in ${singleTime.toFixed(2)}ms`);

  // Multi-process search (simplified)
  console.info('🔍 Multi-process search...');
  const multiStart = performance.now();
  
  const orchestrator = new IPCDocumentationOrchestrator();
  const worker = orchestrator.spawnWorker('perf-worker');
  
  if (worker) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await orchestrator.searchAcrossWorkers('bun');
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const multiResults = orchestrator.getAggregatedResults();
    const multiTime = performance.now() - multiStart;
    
    console.info(`✅ Multi-process: ${multiResults.totalMatches} matches in ${multiTime.toFixed(2)}ms`);
    console.info(`📊 Performance ratio: ${(multiTime / singleTime).toFixed(2)}x`);
    
    await orchestrator.shutdownWorkers();
  }
}

/**
 * Main demonstration runner
 */
async function runDemos() {
  console.info('🎪 Advanced Bun.spawn Features Showcase');
  console.info('🔥 Demonstrating IPC, Terminal (PTY), and Multi-Process Capabilities');
  console.info('=' .repeat(80));

  try {
    await demoMultiWorkerSearch();
    await demoTerminalExplorer();
    await demoIPCPatterns();
    await demoPerformanceComparison();
    
    console.info('\n🎉 All demos completed successfully!');
    console.info('💡 Key Takeaways:');
    console.info('   - IPC enables powerful multi-process coordination');
    console.info('   - Terminal (PTY) support enables interactive CLI tools');
    console.info('   - AsyncDisposable pattern ensures clean resource management');
    console.info('   - Web Standard APIs integration provides streaming efficiency');
    
  } catch (error) {
    console.error('❌ Demo error:', error);
  }
}

// Run demonstrations
if (import.meta.url === `file://${process.argv[1]}`) {
  runDemos().catch(console.error);
}

export { runDemos };
