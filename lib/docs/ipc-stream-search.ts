/**
 * IPC-Powered Documentation Search System
 * Demonstrates Bun's advanced IPC and Terminal capabilities for documentation processing
 */

import { ZenStreamSearcher } from './stream-search';

interface IPCMessage {
  type: 'search' | 'result' | 'progress' | 'error' | 'complete' | 'shutdown';
  query?: string;
  results?: any[];
  stats?: any;
  error?: string;
  progress?: number;
  timestamp: number;
}

/**
 * IPC Documentation Worker - Child Process
 * Handles individual search requests and communicates results back to parent
 */
class IPCDocumentationWorker {
  private searcher: ZenStreamSearcher;
  private isRunning: boolean = true;

  constructor() {
    this.searcher = new ZenStreamSearcher();
    this.setupIPCListeners();
    
    // Keep the process alive
    this.keepAlive();
  }

  private keepAlive() {
    // Prevent the process from exiting
    const interval = setInterval(() => {
      if (!this.isRunning) {
        clearInterval(interval);
      }
    }, 1000);
  }

  private setupIPCListeners() {
    // Listen for search requests from parent process
    process.on('message', async (message: IPCMessage) => {
      console.log(`📨 Worker received message: ${message.type}`);
      
      switch (message.type) {
        case 'search':
          await this.handleSearchRequest(message);
          break;
        case 'shutdown':
          this.shutdown();
          break;
        default:
          console.warn(`⚠️ Unknown message type: ${message.type}`);
      }
    });

    // Notify parent that worker is ready
    process.send!({
      type: 'complete',
      timestamp: Date.now(),
      results: [{ message: 'Worker ready for documentation searches' }]
    });
  }

  private async handleSearchRequest(message: IPCMessage) {
    if (!message.query) {
      process.send!({
        type: 'error',
        error: 'No query provided',
        timestamp: Date.now()
      });
      return;
    }

    try {
      console.log(`🔍 Worker starting search for: ${message.query}`);
      
      // Perform streaming search with progress callbacks
      const stats = await this.searcher.streamSearch({
        query: message.query,
        cachePath: '/Users/nolarose/Projects/.cache',
        onMatch: (match) => {
          // Send individual matches as they arrive
          process.send!({
            type: 'result',
            results: [match],
            timestamp: Date.now()
          });
        },
        onProgress: (progressStats) => {
          // Send progress updates
          process.send!({
            type: 'progress',
            progress: progressStats.matchesFound,
            stats: progressStats,
            timestamp: Date.now()
          });
        }
      });

      // Send completion message with final stats
      process.send!({
        type: 'complete',
        stats,
        timestamp: Date.now()
      });

    } catch (error) {
      process.send!({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now()
      });
    }
  }

  private shutdown() {
    console.log('🛑 Worker shutting down...');
    this.isRunning = false;
    process.exit(0);
  }
}

/**
 * IPC Documentation Orchestrator - Parent Process
 * Manages multiple worker processes and coordinates search operations
 */
class IPCDocumentationOrchestrator {
  private workers: Map<string, any> = new Map();
  private searchResults: Map<string, any[]> = new Map();
  private searchStats: Map<string, any> = new Map();

  /**
   * Spawn a new documentation worker
   */
  spawnWorker(workerId: string): boolean {
    try {
      const worker = (Bun as any).spawn(["bun", "--import", "./lib/docs/ipc-stream-search.ts"], {
        ipc: (message: IPCMessage, subprocess) => {
          this.handleWorkerMessage(workerId, message, subprocess);
        },
        serialization: "json", // Use JSON for compatibility
        stdout: "inherit",
        stderr: "inherit"
      });

      this.workers.set(workerId, worker);
      console.log(`🚀 Spawned worker: ${workerId}`);
      
      // Wait a moment for worker to initialize
      setTimeout(() => {
        // Send initial message to verify connection
        if (!worker.killed) {
          worker.send({
            type: 'search',
            query: 'test',
            timestamp: Date.now()
          });
        }
      }, 500);

      return true;
    } catch (error) {
      console.error(`❌ Failed to spawn worker ${workerId}:`, error);
      return false;
    }
  }

  /**
   * Handle messages from worker processes
   */
  private handleWorkerMessage(workerId: string, message: IPCMessage, subprocess: any) {
    console.log(`📬 Message from ${workerId}: ${message.type}`);

    switch (message.type) {
      case 'result':
        if (message.results) {
          const existing = this.searchResults.get(workerId) || [];
          this.searchResults.set(workerId, [...existing, ...message.results]);
          console.log(`✨ ${workerId} found ${message.results.length} matches`);
        }
        break;

      case 'progress':
        if (message.progress !== undefined) {
          console.log(`📈 ${workerId} progress: ${message.progress} matches`);
        }
        break;

      case 'complete':
        if (message.stats) {
          this.searchStats.set(workerId, message.stats);
          console.log(`✅ ${workerId} search complete: ${message.stats.matchesFound} matches`);
        }
        break;

      case 'error':
        console.error(`❌ ${workerId} error: ${message.error}`);
        break;

      default:
        console.log(`📋 ${workerId}: ${JSON.stringify(message)}`);
    }
  }

  /**
   * Execute a search across all workers
   */
  async searchAcrossWorkers(query: string): Promise<void> {
    console.log(`🔍 Initiating search across ${this.workers.size} workers: ${query}`);

    for (const [workerId, worker] of this.workers) {
      // Check if worker is still alive
      if (worker.killed) {
        console.log(`⚠️ Worker ${workerId} is killed, skipping...`);
        continue;
      }

      // Clear previous results
      this.searchResults.set(workerId, []);
      this.searchStats.delete(workerId);

      // Send search request
      try {
        worker.send({
          type: 'search',
          query,
          timestamp: Date.now()
        });
      } catch (error) {
        console.error(`❌ Failed to send message to ${workerId}:`, error);
      }
    }
  }

  /**
   * Get aggregated results from all workers
   */
  getAggregatedResults(): { totalMatches: number; results: any[]; stats: any } {
    let totalMatches = 0;
    const allResults: any[] = [];
    const allStats: any[] = [];

    for (const [workerId, results] of this.searchResults) {
      totalMatches += results.length;
      allResults.push(...results);
    }

    for (const [workerId, stats] of this.searchStats) {
      allStats.push({ workerId, ...stats });
    }

    return {
      totalMatches,
      results: allResults,
      stats: allStats
    };
  }

  /**
   * Shutdown all workers
   */
  async shutdownWorkers(): Promise<void> {
    console.log('🛑 Shutting down all workers...');

    for (const [workerId, worker] of this.workers) {
      try {
        if (!worker.killed) {
          worker.send({
            type: 'shutdown',
            timestamp: Date.now()
          });
          
          // Wait a bit then force kill if needed
          setTimeout(() => {
            if (!worker.killed) {
              worker.kill();
            }
          }, 1000);
        }
      } catch (error) {
        console.error(`❌ Error shutting down ${workerId}:`, error);
      }
    }

    this.workers.clear();
    this.searchResults.clear();
    this.searchStats.clear();
  }
}

/**
 * Terminal-based Interactive Documentation Search
 * Demonstrates PTY capabilities for interactive documentation exploration
 */
class TerminalDocumentationExplorer {
  private terminal: any;
  private process: any;

  constructor() {
    this.setupTerminal();
  }

  private setupTerminal() {
    // Create a reusable terminal for interactive documentation exploration
    this.terminal = new (Bun as any).Terminal({
      cols: 100,
      rows: 30,
      name: "xterm-256color",
      data: (terminal: any, data: Uint8Array) => {
        // Display terminal output
        process.stdout.write(data);
      },
      exit: (terminal: any, exitCode: number) => {
        console.log(`\n📟 Terminal exited with code: ${exitCode}`);
      }
    });
  }

  /**
   * Start interactive documentation search with fzf
   */
  async startInteractiveSearch(): Promise<void> {
    console.log('🎯 Starting interactive documentation search...');

    this.process = Bun.spawn(["fzf", "--ansi", "--multi", "--height", "20"], {
      terminal: this.terminal,
      env: {
        ...process.env,
        FZF_DEFAULT_COMMAND: "rg --color=always --line-number '' /Users/nolarose/Projects/.cache"
      }
    });

    // Send some sample data to fzf
    this.terminal.write("Searching documentation...\n");

    await this.process.exited;
  }

  /**
   * Start interactive bash session for documentation exploration
   */
  async startBashSession(): Promise<void> {
    console.log('🐚 Starting bash session for documentation exploration...');

    this.process = Bun.spawn(["bash"], {
      terminal: this.terminal,
      env: {
        ...process.env,
        PS1: "\\[\\e[32m\\]docs>\\[\\e[0m\\] "
      }
    });

    await this.process.exited;
  }

  /**
   * Close terminal and cleanup
   */
  close(): void {
    if (this.terminal) {
      this.terminal.close();
    }
    if (this.process && !this.process.killed) {
      this.process.kill();
    }
  }
}

/**
 * Demonstration function for IPC and Terminal capabilities
 */
async function demonstrateAdvancedFeatures() {
  console.log('🚀 Advanced Bun.spawn Features Demonstration');
  console.log('=' .repeat(60));

  // 1. IPC-based Multi-Worker Documentation Search
  console.log('\n📡 1. IPC-Based Multi-Worker Search');
  console.log('-' .repeat(40));

  const orchestrator = new IPCDocumentationOrchestrator();

  // Spawn multiple workers
  const worker1Ready = orchestrator.spawnWorker('worker-1');
  const worker2Ready = orchestrator.spawnWorker('worker-2');

  if (worker1Ready && worker2Ready) {
    // Wait for workers to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Execute parallel searches
    await orchestrator.searchAcrossWorkers('bun');
    await orchestrator.searchAcrossWorkers('ReadableStream');

    // Wait for results
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Get aggregated results
    const results = orchestrator.getAggregatedResults();
    console.log(`\n📊 Aggregated Results: ${results.totalMatches} total matches`);

    // Shutdown workers
    await orchestrator.shutdownWorkers();
  }

  // 2. Terminal-based Interactive Documentation Explorer
  console.log('\n📟 2. Terminal-Based Interactive Explorer');
  console.log('-' .repeat(40));

  const explorer = new TerminalDocumentationExplorer();

  try {
    // Start interactive search (will timeout after 10 seconds)
    const searchPromise = explorer.startInteractiveSearch();
    const timeoutPromise = new Promise(resolve => {
      setTimeout(() => {
        console.log('\n⏰ Interactive search timeout');
        resolve(null);
      }, 10000);
    });

    await Promise.race([searchPromise, timeoutPromise]);
  } catch (error) {
    console.log('⚠️ Interactive search not available (fzf not installed)');
  }

  explorer.close();
}

// Run if executed as worker process
if (import.meta.url === `file://${process.argv[1]}`) {
  // Check if we're running as a worker
  if (process.argv.includes('--import')) {
    // Worker process
    new IPCDocumentationWorker();
  } else {
    // Main process
    demonstrateAdvancedFeatures().catch(console.error);
  }
}

export { IPCDocumentationWorker, IPCDocumentationOrchestrator, TerminalDocumentationExplorer };
