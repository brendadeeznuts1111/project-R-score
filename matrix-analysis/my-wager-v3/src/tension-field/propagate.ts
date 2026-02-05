#!/usr/bin/env bun
// src/graph-propagation/propagate.ts
// [TENSION][RULES][FULL][TEN-PROP-001][v1.0][ACTIVE]
// Bun-native GNN with runtime control, transpilation, global context, secrets
// [TENSION-VOLUME-001] [TENSION-LINK-002] [TENSION-PROFILE-003]
// [GOV-SECURITY-001] [GOV-COMPLIANCE-002]

import { spawnSync, gc, nanoseconds, main, argv, env, secrets } from 'bun';
import { cpus } from 'os';
import { errorHandler, TensionErrorCode, BunErrorUtils } from './error-handler';
import { EXIT_CODES } from "../../../.claude/lib/exit-codes.ts";

// ────────────────────────────────────────────────
// Type Definitions
// ────────────────────────────────────────────────
export interface TensionNodeState {
  id: string;
  tension: number;
  velocity: number;
  lastUpdate: number;
  metadata?: Record<string, unknown>;
}

export interface TensionEdge {
  source: string;
  target: string;
  weight: number;
  type?: string;
}

export interface PropagationConfig {
  decayRate: number;
  inertiaFactor: number;
  maxIterations: number;
  convergenceThreshold: number;
  batchPropagationSize: number;
  enableParallelSpawn: boolean;
  signReports: boolean;
}

export interface PropagationStepResult {
  converged: boolean;
  delta: number;
  iterations: number;
  durationNs: number;
  affectedNodeIds: string[];
  anomalyScore: number;
  metadata?: Record<string, unknown>;
}

// ────────────────────────────────────────────────
// Secrets Vault (sensitive keys)
// ────────────────────────────────────────────────
let SIGN_KEY = env.PROPAGATION_SIGN_KEY ?? 'tension-god-2026';
let MAX_ITERATIONS = Number(env.MAX_ITERATIONS) || 100;

// Load secrets asynchronously
(async () => {
  try {
    const secretSignKey = await secrets.get({ service: "tension-propagator", name: "PROPAGATION_SIGN_KEY" });
    const secretMaxIterations = await secrets.get({ service: "tension-propagator", name: "MAX_ITERATIONS" });

    if (secretSignKey) SIGN_KEY = secretSignKey;
    if (secretMaxIterations) MAX_ITERATIONS = Number(secretMaxIterations);

    // Check if secret exists by attempting to get it
    const hasSecret = !!(await secrets.get({ service: "tension-propagator", name: "PROPAGATION_SIGN_KEY" }));
    console.log(`🟢 Secrets loaded (SIGN_KEY ${hasSecret ? 'vaulted' : 'fallback'})`);
  } catch (e) {
    console.log(`🟡 Secrets fallback mode`);
  }
})();

// ────────────────────────────────────────────────
// Global Context & CLI Detection
// ────────────────────────────────────────────────
const IS_CLI_MODE = main === import.meta.path;
const CLI_ARGS = argv.slice(2).reduce((acc, arg) => {
  const [key, val] = arg.split('=');
  acc[key.replace('--', '')] = val ?? true;
  return acc;
}, {} as Record<string, string | true>);

// ────────────────────────────────────────────────
// Domain Constants (overridable via CLI/env)
// ────────────────────────────────────────────────
const TENSION_NODE_EDGE_WEIGHTS = new Float32Array([
  1.0, 0.7, 0.4, 0.35, 0.3, 0.25, 0.6, 0.5,
]);

const DEFAULT_PROPAGATION_CONFIG: PropagationConfig = {
  decayRate: Number(CLI_ARGS.decay ?? env.DECAY_RATE ?? '0.85'),
  inertiaFactor: Number(CLI_ARGS.inertia ?? env.INERTIA_FACTOR ?? '0.3'),
  maxIterations: MAX_ITERATIONS,
  convergenceThreshold: Number(CLI_ARGS.threshold ?? env.CONVERGENCE_THRESHOLD ?? '0.001'),
  batchPropagationSize: Number(CLI_ARGS.batch ?? env.BATCH_SIZE ?? '100'),
  enableParallelSpawn: CLI_ARGS.spawn !== 'false' && (env.ENABLE_SPAWN !== 'false'),
  signReports: CLI_ARGS.sign !== 'false' && (env.SIGN_REPORTS !== 'false'),
};

// ────────────────────────────────────────────────
// Core Propagator Class
// ────────────────────────────────────────────────
export class TensionGraphPropagator {
  private nodesById = new Map<string, TensionNodeState>();
  private edgesByTarget = new Map<string, TensionEdge[]>();
  private legacyEdgeList: TensionEdge[] = [];
  private config: PropagationConfig;
  private stats = {
    totalPropagations: 0,
    totalIterations: 0,
    averageConvergenceTime: 0,
    memoryUsage: 0,
  };

  constructor(partialConfig: Partial<PropagationConfig> = {}) {
    // Merge CLI args, env, secrets, partial
    this.config = {
      ...DEFAULT_PROPAGATION_CONFIG,
      ...partialConfig,
    };

    // Signal handlers for runtime control
    process.on('SIGINT', () => {
      console.log("\n🛑 SIGINT → dumping stats & resetting");
      console.dir(this.getGraphOverviewStats(), { depth: null });
      this.resetGraphState();
      process.exit(EXIT_CODES.SUCCESS);
    });

    process.on('SIGTERM', () => {
      console.log("\n🛑 SIGTERM → graceful shutdown");
      process.exit(EXIT_CODES.SUCCESS);
    });

    if (IS_CLI_MODE) {
      console.log(`[CLI] Propagator ready with args:`, CLI_ARGS);
      console.log(`[CLI] Config:`, this.config);
    }
  }

  // ────────────────────────────────────────────────
  // Graph Management
  // ────────────────────────────────────────────────
  addNode(node: TensionNodeState): void {
    this.nodesById.set(node.id, {
      ...node,
      lastUpdate: Date.now(),
    });
  }

  addEdge(edge: TensionEdge): void {
    this.legacyEdgeList.push(edge);

    if (!this.edgesByTarget.has(edge.target)) {
      this.edgesByTarget.set(edge.target, []);
    }
    this.edgesByTarget.get(edge.target)!.push(edge);
  }

  resetGraphState(): void {
    this.nodesById.clear();
    this.edgesByTarget.clear();
    this.legacyEdgeList = [];
    gc(true);
    console.log("🧹 Graph state reset, GC triggered");
  }

  // ────────────────────────────────────────────────
  // Core Propagation Logic
  // ────────────────────────────────────────────────
  async propagateFullGraph(
    sourceNodeIds: string | string[]
  ): Promise<PropagationStepResult> {
    return BunErrorUtils.createTimedError(
      TensionErrorCode.PROPAGATION_FAILED,
      async () => {
        const sources = Array.isArray(sourceNodeIds) ? sourceNodeIds : [sourceNodeIds];
        const startNs = nanoseconds();

        // Validate source nodes exist
        const missingNodes = sources.filter(id => !this.nodesById.has(id));
        if (missingNodes.length > 0) {
          throw errorHandler.createError(
            TensionErrorCode.NODE_NOT_FOUND,
            `Source nodes not found: ${missingNodes.join(', ')}`,
            'high',
            { missingNodes }
          );
        }

        // Initialize tensions map
        let nextTensions = new Map<string, number>();
        let currentTensions = new Map<string, number>();

        // Set initial tensions for source nodes
        sources.forEach(id => {
          const node = this.nodesById.get(id);
          if (node) {
            currentTensions.set(id, node.tension);
            nextTensions.set(id, node.tension);
          }
        });

        let converged = false;
        let iterations = 0;
        let maxDelta = 0;

        // Main propagation loop
        for (iterations = 0; iterations < this.config.maxIterations; iterations++) {
          const tempTensions = new Map(nextTensions);
          maxDelta = 0;

          // Process each node
          for (const [nodeId, currentTension] of currentTensions) {
            const node = this.nodesById.get(nodeId);
            if (!node) continue;

            let incomingTension = 0;
            const edges = this.edgesByTarget.get(nodeId) || [];

            // Calculate incoming tension from neighbors
            for (const edge of edges) {
              const sourceTension = currentTensions.get(edge.source);
              if (sourceTension !== undefined) {
                incomingTension += sourceTension * edge.weight * TENSION_NODE_EDGE_WEIGHTS[edge.type ? 0 : 0];
              }
            }

            // Apply propagation physics
            const inertia = node.velocity * this.config.inertiaFactor;
            const newVelocity = inertia + (incomingTension - currentTension) * (1 - this.config.decayRate);
        const newTension = currentTension + newVelocity;

            // Update node state
            node.velocity = newVelocity;
            node.tension = newTension;
            node.lastUpdate = Date.now();

            nextTensions.set(nodeId, newTension);
            maxDelta = Math.max(maxDelta, Math.abs(newTension - currentTension));
          }

          // Check convergence
          if (maxDelta < this.config.convergenceThreshold) {
            converged = true;
            break;
          }

          currentTensions = new Map(nextTensions);

          // Spawn parallel child processes for large batches if cores allow
          if (this.config.enableParallelSpawn &&
              this.config.batchPropagationSize > 100 &&
              cpus().length > 2 &&
              iterations % 10 === 0) {

            const childResult = spawnSync({
              cmd: ['bun', 'src/tension-field/propagate-child.ts', '--batch', JSON.stringify(Object.fromEntries(nextTensions)), '--config', JSON.stringify(this.config)],
              stdio: ['pipe', 'pipe', 'pipe'],
            });

            if (childResult.success && childResult.stdout) {
              try {
                const childData = JSON.parse(childResult.stdout.toString());
                nextTensions = new Map(Object.entries(childData));
                console.log(`🔄 Spawned batch processed at iteration ${iterations}`);
              } catch (e) {
                await errorHandler.handleError(errorHandler.createError(
                  TensionErrorCode.CORRUPTED_DATA,
                  'Failed to parse child process output',
                  'medium',
                  { error: e, iteration: iterations }
                ));
              }
            } else {
              await errorHandler.handleError(errorHandler.createError(
                TensionErrorCode.PROPAGATION_FAILED,
                'Child process spawn failed',
                'high',
                { stderr: childResult.stderr?.toString(), iteration: iterations }
              ));
            }
          }

          // GC after heavy ops
          if (iterations % 50 === 0) {
            gc(true);
          }
        }

        const durationNs = nanoseconds() - startNs;

        // Check for timeout
        if (durationNs > 5_000_000_000) { // 5 seconds
          throw errorHandler.createError(
            TensionErrorCode.TIMEOUT_EXCEEDED,
            `Propagation timeout after ${iterations} iterations`,
            'high',
            { duration: durationNs, iterations }
          );
        }

        // Calculate anomaly score
        const anomalyScore = this.calculateAnomalyScore(nextTensions);

        // Update stats
        this.stats.totalPropagations++;
        this.stats.totalIterations += iterations;
        this.stats.averageConvergenceTime =
          (this.stats.averageConvergenceTime * (this.stats.totalPropagations - 1) + durationNs / 1e6)
          / this.stats.totalPropagations;

        const result: PropagationStepResult = {
          converged,
          delta: maxDelta,
          iterations,
          durationNs,
          affectedNodeIds: Array.from(nextTensions.keys()),
          anomalyScore,
          metadata: {
            config: this.config,
            timestamp: new Date().toISOString(),
            ...(this.config.signReports && { signature: this.signMetadata(nextTensions) }),
          },
        };

        return result;
      },
      {
        operation: 'propagateFullGraph',
        sourceNodeIds,
        nodeCount: this.nodesById.size,
        edgeCount: this.edgesByTarget.size
      }
    );
  }

  // ────────────────────────────────────────────────
  // Utility Methods
  // ────────────────────────────────────────────────
  private calculateAnomalyScore(tensions: Map<string, number>): number {
    const values = Array.from(tensions.values());
    if (values.length === 0) return 0;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    // Anomaly score based on deviation from mean
    return stdDev / (mean || 1);
  }

  private signMetadata(data: Map<string, number>): string {
    const dataStr = JSON.stringify(Object.fromEntries(data));
    // Simple signature - in production use proper crypto
    return Buffer.from(`${dataStr}-${SIGN_KEY}-${Date.now()}`).toString('base64').slice(0, 16);
  }

  getGraphOverviewStats() {
    return {
      nodeCount: this.nodesById.size,
      edgeCount: this.legacyEdgeList.length,
      stats: this.stats,
      config: this.config,
      memoryUsage: process.memoryUsage(),
    };
  }

  // JSX anomaly report (Bun transpiles native) - returning string for compatibility
  renderAnomalyReportJSX(result: PropagationStepResult): string {
    return `
<div class="anomaly-report">
  <h2>Anomaly Detected: ${result.converged ? 'Converged' : 'Partial'}</h2>
  <p>Delta: ${result.delta.toFixed(4)}</p>
  <p>Duration: ${(result.durationNs / 1e6).toFixed(2)} ms</p>
  <p>Anomaly Score: ${result.anomalyScore.toFixed(4)}</p>
  <p>Iterations: ${result.iterations}</p>
  <ul>${result.affectedNodeIds.map(id => `<li>${id}</li>`).join('')}</ul>
</div>`;
  }
}

// ────────────────────────────────────────────────
// Exports & Global
// ────────────────────────────────────────────────
export const globalTensionGraph = new TensionGraphPropagator();

// CLI interface
if (IS_CLI_MODE) {
  (async () => {
    // Get command from positional args (not flags)
    const positionalArgs = argv.slice(2).filter(arg => !arg.startsWith('--'));
    const command = positionalArgs[0] || 'demo';

    if (command === 'help' || CLI_ARGS.help) {
      console.log(`
Tension Graph Propagator CLI

Commands:
  demo                    Run propagation demo
  help                    Show this help

CLI Args:
  --decay=0.85           Set decay rate
  --inertia=0.3          Set inertia factor
  --threshold=0.001      Set convergence threshold
  --batch=100            Set batch size
  --spawn=true/false     Enable/disable parallel spawn
  --sign=true/false      Enable/disable report signing
  --jsx                  Render JSX report

Environment Variables:
  DECAY_RATE             Default decay rate
  INERTIA_FACTOR         Default inertia factor
  CONVERGENCE_THRESHOLD  Default convergence threshold
  BATCH_SIZE             Default batch size
  ENABLE_SPAWN           Enable parallel spawn
  SIGN_REPORTS           Sign reports

Secrets (via Bun.secrets):
  PROPAGATION_SIGN_KEY   Key for signing reports
  MAX_ITERATIONS         Max propagation iterations
      `);
      process.exit(EXIT_CODES.SUCCESS);
    }

    if (command === 'demo') {
      // Demo with mock data
      const propagator = new TensionGraphPropagator();

      // Add mock nodes
      for (let i = 0; i < 50; i++) {
        propagator.addNode({
          id: `node-${i}`,
          tension: Math.random() * 100,
          velocity: 0,
          lastUpdate: Date.now(),
        });
      }

      // Add mock edges
      for (let i = 0; i < 100; i++) {
        propagator.addEdge({
          source: `node-${Math.floor(Math.random() * 50)}`,
          target: `node-${Math.floor(Math.random() * 50)}`,
          weight: Math.random() * 0.8 + 0.2,
        });
      }

      console.log("🚀 Running propagation demo...");
      const result = await propagator.propagateFullGraph(['node-0', 'node-1']);
      console.log("Result:", result);

      if (CLI_ARGS.jsx) {
        console.log(propagator.renderAnomalyReportJSX(result));
      }
    } else if (command === 'help') {
      console.log(`
Tension Graph Propagator CLI

Commands:
  demo                    Run propagation demo
  help                    Show this help

CLI Args:
  --decay=0.85           Set decay rate
  --inertia=0.3          Set inertia factor
  --threshold=0.001      Set convergence threshold
  --batch=100            Set batch size
  --spawn=true/false     Enable/disable parallel spawn
  --sign=true/false      Enable/disable report signing
  --jsx                  Render JSX report

Environment Variables:
  DECAY_RATE             Default decay rate
  INERTIA_FACTOR         Default inertia factor
  CONVERGENCE_THRESHOLD  Default convergence threshold
  BATCH_SIZE             Default batch size
  ENABLE_SPAWN           Enable parallel spawn
  SIGN_REPORTS           Sign reports

Secrets (via Bun.secrets):
  PROPAGATION_SIGN_KEY   Key for signing reports
  MAX_ITERATIONS         Max propagation iterations
      `);
    }
  })();
}
