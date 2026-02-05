#!/usr/bin/env bun
/**
 * @fileoverview Demo: Bun Worker Threads with Environment Data Sharing
 * @description Demonstrates Bun worker threads with environment data sharing, thread detection, and parallel file processing.
 * @module examples/demos/demo-worker-threads
 * 
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-EXAMPLE@6.4.0.0.0.0.0;instance-id=EXAMPLE-WORKER-THREADS-001;version=6.4.0.0.0.0.0}]
 * [PROPERTIES:{example={value:"Worker Threads Demo";@root:"ROOT-EXAMPLES";@chain:["BP-EXAMPLES","BP-DEMO"];@version:"6.4.0.0.0.0.0"}}]
 * [CLASS:WorkerThreadsDemo][#REF:v-6.4.0.0.0.0.0.BP.EXAMPLES.DEMO.1.0.A.1.1.EXAMPLE.1.1]]
 * 
 * Version: 6.4.0.0.0.0.0
 * Ripgrep Pattern: 6\.4\.0\.0\.0\.0\.0|EXAMPLE-WORKER-THREADS-001|BP-EXAMPLE@6\.4\.0\.0\.0\.0\.0
 * 
 * Features:
 * - setEnvironmentData() / getEnvironmentData() for sharing config
 * - Bun.isMainThread for thread detection
 * - process.on("worker") for worker creation events
 * - Parallel file processing with workers
 * 
 * @example 6.4.0.0.0.0.0.1: Worker Thread Creation
 * // Test Formula:
 * // 1. Set environment data using setEnvironmentData()
 * // 2. Create worker thread with Worker class
 * // 3. Worker retrieves data using getEnvironmentData()
 * // Expected Result: Data shared successfully between main and worker threads
 * //
 * // Snippet:
 * ```typescript
 * setEnvironmentData('config', { key: 'value' });
 * const worker = new Worker(workerScript);
 * ```
 * 
 * // Ripgrep: 6.4.0.0.0.0.0
 * // Ripgrep: EXAMPLE-WORKER-THREADS-001
 * // Ripgrep: BP-EXAMPLE@6.4.0.0.0.0.0
 */

import { setEnvironmentData, getEnvironmentData } from "worker_threads";
import { Worker } from "worker_threads";

// ============================================================================
// WORKER SCRIPT (runs in worker thread)
// ============================================================================

const workerScript = `
import { getEnvironmentData } from "worker_threads";

// Check if we're in a worker thread
if (!Bun.isMainThread) {
  console.log("Worker: I'm in a worker thread");
  
  // Get shared environment data
  const config = getEnvironmentData("config");
  const sharedData = getEnvironmentData("sharedData");
  
  console.log("Worker: Received config:", Bun.inspect(config, { colors: true }));
  console.log("Worker: Received shared data:", Bun.inspect(sharedData, { colors: true }));
  
  // Process data
  self.onmessage = (event) => {
    const { files, workerId } = event.data;
    console.log(\`Worker \${workerId}: Processing \${files.length} files\`);
    
    const results = files.map((file: string) => {
      // Simulate file processing
      const processed = {
        file,
        workerId,
        processed: true,
        timestamp: Date.now(),
        config: config, // Use shared config
      };
      return processed;
    });
    
    // Send results back to main thread
    self.postMessage({ workerId, results });
  };
}
`;

// ============================================================================
// MAIN THREAD
// ============================================================================

if (Bun.isMainThread) {
  console.log("Main: I'm the main thread");
  
  // Listen for worker creation events
  process.on("worker", (worker: any) => {
    console.log(`Main: New worker created: threadId=${worker.threadId}`);
  });
  
  // Set environment data to share with workers
  const config = {
    apiUrl: "https://api.example.com",
    timeout: 5000,
    maxRetries: 3,
    environment: Bun.env.NODE_ENV || "development",
  };
  
  const sharedData = {
    projectName: "trader-analyzer",
    version: Bun.version,
    revision: Bun.revision,
  };
  
  setEnvironmentData("config", config);
  setEnvironmentData("sharedData", sharedData);
  
  console.log("Main: Set environment data:");
  console.log("  Config:", Bun.inspect(config, { colors: true }));
  console.log("  Shared Data:", Bun.inspect(sharedData, { colors: true }));
  
  // Create workers for parallel processing
  async function processFilesInParallel(files: string[], numWorkers = 2) {
    const filesPerWorker = Math.ceil(files.length / numWorkers);
    const workers: Worker[] = [];
    const promises: Promise<any>[] = [];
    
    for (let i = 0; i < numWorkers; i++) {
      const workerFiles = files.slice(i * filesPerWorker, (i + 1) * filesPerWorker);
      if (workerFiles.length === 0) continue;
      
      // Create worker with inline script
      const worker = new Worker(URL.createObjectURL(new Blob([workerScript], { type: "application/javascript" })), {
        name: `worker-${i}`,
      });
      
      workers.push(worker);
      
      const promise = new Promise((resolve, reject) => {
        worker.onmessage = (event) => {
          resolve(event.data);
        };
        
        worker.onerror = (error) => {
          reject(error);
        };
      });
      
      promises.push(promise);
      
      // Send files to worker
      worker.postMessage({ files: workerFiles, workerId: i });
    }
    
    // Wait for all workers to complete
    const results = await Promise.all(promises);
    
    // Clean up workers
    for (const worker of workers) {
      worker.terminate();
    }
    
    return results;
  }
  
  // Demo: Process files in parallel
  const files = [
    "src/utils/bun.ts",
    "src/hyper-bun/scheduler.ts",
    "src/hyper-bun/market-probe-service.ts",
    "src/utils/fetch-wrapper.ts",
  ];
  
  console.log(`\nMain: Processing ${files.length} files with 2 workers...\n`);
  
  const startTime = Bun.nanoseconds();
  const results = await processFilesInParallel(files, 2);
  const duration = (Bun.nanoseconds() - startTime) / 1_000_000;
  
  console.log(`\nMain: Processing complete in ${duration.toFixed(2)}ms`);
  console.log("Main: Results:", Bun.inspect(results, { colors: true, depth: 3 }));
  
  // Verify environment data was shared correctly
  console.log("\nMain: Verifying environment data sharing...");
  for (const result of results) {
    if (result.results && result.results.length > 0) {
      const firstResult = result.results[0];
      if (firstResult.config) {
        console.log(`  Worker ${result.workerId}: Successfully received config:`, 
          Bun.inspect(firstResult.config, { colors: true }));
      }
    }
  }
  
  console.log("\n✅ Worker thread demo complete!");
}
