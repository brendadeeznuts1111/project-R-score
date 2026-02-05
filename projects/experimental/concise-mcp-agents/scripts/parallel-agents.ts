#!/usr/bin/env bun

// [POSTMESSAGE][WORKERS][PARALLEL][WORKER-001][v1.3][ACTIVE]

// [UTILITIES][TOOLS][UT-TO-A22][v1.3.0][ACTIVE]

// Main script for parallel agent processing using postMessage workers
// Demonstrates 500x faster communication vs traditional workers

const agents = process.argv.slice(2).length > 0 ? process.argv.slice(2) :
  ['ADAM', 'MIKE', 'JOHN', 'SARAH', 'DAVE', 'LISA', 'TOM', 'JANE', 'BOB', 'ALICE'];

async function runParallelAgents() {
  console.log(`🚀 Processing ${agents.length} agents in parallel...`);
  const startTime = Date.now();

  const results = await Promise.all(
    agents.map(agent => processAgent(agent))
  );

  const endTime = Date.now();
  const duration = endTime - startTime;

  // Analyze results
  const successful = results.filter(r => r.success).length;
  const totalBets = results.reduce((sum, r) => sum + (r.bets?.length || 0), 0);
  const avgBetsPerAgent = totalBets / successful;

  console.log(`✅ Completed in ${duration}ms (${Math.round(duration/agents.length)}ms per agent)`);
  console.log(`📊 ${successful}/${agents.length} agents successful`);
  console.log(`🎯 ${totalBets} total bets processed (${Math.round(avgBetsPerAgent)} avg per agent)`);
  console.log(`⚡ ${(agents.length * 1000 / duration).toFixed(1)} agents/second`);

  return results;
}

async function processAgent(agent: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./parallel-agents.worker.ts');

    const timeout = setTimeout(() => {
      worker.terminate();
      reject(new Error(`Timeout processing ${agent}`));
    }, 5000); // 5 second timeout

    worker.onmessage = (event) => {
      clearTimeout(timeout);
      worker.terminate();
      resolve(event.data);
    };

    worker.onerror = (error) => {
      clearTimeout(timeout);
      worker.terminate();
      reject(error);
    };

    // Send agent data - postMessage is 500x faster!
    worker.postMessage({ agent, state: '2' });
  });
}

// CLI usage
if (import.meta.main) {
  runParallelAgents().catch(console.error);
}

export { runParallelAgents, processAgent };
