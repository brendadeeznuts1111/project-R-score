/**
 * Component #57: CPU-Profiler-Engine
 * Logic Tier: Level 4 (Profiling)
 * Resource Tax: CPU +1%
 * Parity Lock: 8q9r...0s1t
 * Protocol: Chrome DevTools
 *
 * 1ms sampling with Chrome DevTools-compatible .cpuprofile output
 * for hot path analysis and performance optimization.
 *
 * @module infrastructure/cpu-profiler-engine
 */

import { isFeatureEnabled } from '../types/feature-flags';

/**
 * CPU profile options
 */
export interface CPUProfileOptions {
  /** Profile name (default: profile-{timestamp}.cpuprofile) */
  name?: string;
  /** Output directory (default: ./profiles) */
  dir?: string;
  /** Sample interval in microseconds (default: 1000 = 1ms) */
  sampleInterval?: number;
}

/**
 * CPU profile sample entry
 */
interface ProfileSample {
  timestamp: number;
  stack: string[];
  nodeId?: number;
}

/**
 * Chrome DevTools-compatible profile node
 */
interface ProfileNode {
  id: number;
  callFrame: {
    functionName: string;
    scriptId: string;
    url: string;
    lineNumber: number;
    columnNumber: number;
  };
  hitCount: number;
  children?: number[];
}

/**
 * Chrome DevTools-compatible CPU profile format
 */
export interface CPUProfile {
  typeId: string;
  uid: number;
  title: string;
  startTime: number;
  endTime: number;
  nodes: ProfileNode[];
  samples: number[];
  timeDeltas: number[];
  $schema?: string;
}

/**
 * Profiler state
 */
interface ProfilerState {
  name: string;
  dir: string;
  interval: number;
  startTime: number;
  samples: ProfileSample[];
  nodeMap: Map<string, number>;
  nextNodeId: number;
  intervalId?: ReturnType<typeof setInterval>;
}

/**
 * CPU Profiler Engine for performance analysis
 * Produces Chrome DevTools-compatible .cpuprofile files
 */
export class CPUProfilerEngine {
  private static profiler: ProfilerState | null = null;
  private static isActive = false;

  /**
   * Start CPU profiling
   */
  static start(options: CPUProfileOptions = {}): void {
    if (!isFeatureEnabled('MEMORY_AUDIT')) {
      console.warn('[CPU-Profiler] Disabled (MEMORY_AUDIT feature flag not set)');
      return;
    }

    if (this.isActive) {
      console.warn('[CPU-Profiler] Already active');
      return;
    }

    this.isActive = true;
    this.profiler = {
      name: options.name || `profile-${Date.now()}.cpuprofile`,
      dir: options.dir || './profiles',
      interval: options.sampleInterval || 1000, // 1ms default
      startTime: performance.now(),
      samples: [],
      nodeMap: new Map(),
      nextNodeId: 1,
    };

    // Start sampling
    this.initializeSampling();

    console.debug('[CPU-Profiler] Started', {
      component: 57,
      name: this.profiler.name,
      interval: `${this.profiler.interval}μs`,
    });
  }

  /**
   * Stop profiling and save profile
   */
  static stop(): string {
    if (!isFeatureEnabled('MEMORY_AUDIT') || !this.isActive || !this.profiler) {
      return '';
    }

    // Stop sampling
    if (this.profiler.intervalId) {
      clearInterval(this.profiler.intervalId);
    }

    this.isActive = false;
    const profile = this.generateProfile();
    const filePath = this.saveProfile(profile);

    // Log completion
    this.logProfileCompletion(filePath, profile);

    // Cleanup
    this.profiler = null;

    return filePath;
  }

  /**
   * Check if profiler is active
   */
  static isProfilerActive(): boolean {
    return this.isActive;
  }

  /**
   * Get current sample count
   */
  static getSampleCount(): number {
    return this.profiler?.samples.length ?? 0;
  }

  /**
   * Initialize sampling interval
   */
  private static initializeSampling(): void {
    if (!this.profiler) return;

    // Convert microseconds to milliseconds for setInterval
    const intervalMs = Math.max(1, Math.floor(this.profiler.interval / 1000));

    this.profiler.intervalId = setInterval(() => {
      if (!this.isActive || !this.profiler) return;

      // Capture current stack trace
      const stack = new Error().stack;
      if (stack) {
        const frames = this.parseStack(stack);
        this.profiler.samples.push({
          timestamp: performance.now(),
          stack: frames,
        });
      }
    }, intervalMs);
  }

  /**
   * Parse stack trace into frames
   */
  private static parseStack(stack: string): string[] {
    return stack
      .split('\n')
      .slice(2) // Remove "Error" and sampling frame
      .map(line => line.trim())
      .filter(line => line.startsWith('at '))
      .map(line => {
        // Extract function name from "at functionName (file:line:col)"
        const match = line.match(/^at\s+(.+?)(?:\s+\(|$)/);
        return match && match[1] ? match[1] : line.substring(3);
      })
      .filter((frame): frame is string => frame !== undefined)
      .slice(0, 50); // Limit stack depth
  }

  /**
   * Generate Chrome DevTools-compatible profile
   */
  private static generateProfile(): CPUProfile {
    if (!this.profiler) {
      throw new Error('Profiler not initialized');
    }

    const endTime = performance.now();
    const nodes: ProfileNode[] = [];
    const samples: number[] = [];
    const timeDeltas: number[] = [];

    // Build node map and sample references
    let lastTime = this.profiler.startTime;

    for (const sample of this.profiler.samples) {
      // Get or create node for top frame
      const topFrame = sample.stack[0] || '(anonymous)';
      let nodeId = this.profiler.nodeMap.get(topFrame);

      if (!nodeId) {
        nodeId = this.profiler.nextNodeId++;
        this.profiler.nodeMap.set(topFrame, nodeId);

        nodes.push({
          id: nodeId,
          callFrame: {
            functionName: topFrame,
            scriptId: '0',
            url: '',
            lineNumber: 0,
            columnNumber: 0,
          },
          hitCount: 0,
        });
      }

      // Increment hit count
      const node = nodes.find(n => n.id === nodeId);
      if (node) node.hitCount++;

      samples.push(nodeId);
      timeDeltas.push(Math.round((sample.timestamp - lastTime) * 1000)); // Convert to microseconds
      lastTime = sample.timestamp;
    }

    // Add root node if needed
    if (nodes.length === 0) {
      nodes.push({
        id: 1,
        callFrame: {
          functionName: '(root)',
          scriptId: '0',
          url: '',
          lineNumber: 0,
          columnNumber: 0,
        },
        hitCount: 0,
      });
    }

    return {
      typeId: 'CPU',
      uid: 1,
      title: this.profiler.name,
      startTime: Math.round(this.profiler.startTime * 1000),
      endTime: Math.round(endTime * 1000),
      nodes,
      samples,
      timeDeltas,
      $schema: 'chrome-devtools-cpu-profile',
    };
  }

  /**
   * Save profile to disk
   */
  private static saveProfile(profile: CPUProfile): string {
    if (!this.profiler) return '';

    const fs = require('fs');
    const path = require('path');

    const dir = this.profiler.dir;

    // Ensure directory exists
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, this.profiler.name);
    fs.writeFileSync(filePath, JSON.stringify(profile, null, 2));

    return filePath;
  }

  /**
   * Log profile completion
   */
  private static logProfileCompletion(filePath: string, profile: CPUProfile): void {
    if (!isFeatureEnabled('MEMORY_AUDIT')) return;

    const duration = profile.endTime - profile.startTime;
    console.debug('[CPU-Profiler] Complete', {
      component: 57,
      file: filePath,
      duration: `${(duration / 1000000).toFixed(2)}s`,
      samples: profile.samples.length,
      nodes: profile.nodes.length,
    });
  }
}

/**
 * CLI argument parser for --cpu-prof flags
 */
export const cpuProfCLIHelper = {
  flags: ['--cpu-prof', '--cpu-prof-name', '--cpu-prof-dir', '--cpu-prof-interval'] as const,

  parseArgs(args: string[]): { enabled: boolean; config: CPUProfileOptions } {
    if (!isFeatureEnabled('MEMORY_AUDIT')) {
      return { enabled: false, config: {} };
    }

    const enabled = args.includes('--cpu-prof');
    const nameIndex = args.indexOf('--cpu-prof-name');
    const dirIndex = args.indexOf('--cpu-prof-dir');
    const intervalIndex = args.indexOf('--cpu-prof-interval');

    const intervalArg = intervalIndex > -1 ? args[intervalIndex + 1] : undefined;

    return {
      enabled,
      config: {
        name: nameIndex > -1 ? args[nameIndex + 1] : undefined,
        dir: dirIndex > -1 ? args[dirIndex + 1] : undefined,
        sampleInterval: intervalArg ? parseInt(intervalArg, 10) : undefined,
      },
    };
  },
};

/**
 * Zero-cost exports
 */
export const startCPUProfiler = isFeatureEnabled('MEMORY_AUDIT')
  ? CPUProfilerEngine.start.bind(CPUProfilerEngine)
  : () => {};

export const stopCPUProfiler = isFeatureEnabled('MEMORY_AUDIT')
  ? CPUProfilerEngine.stop.bind(CPUProfilerEngine)
  : () => '';

export const isProfilerActive = CPUProfilerEngine.isProfilerActive.bind(CPUProfilerEngine);
export const getSampleCount = CPUProfilerEngine.getSampleCount.bind(CPUProfilerEngine);
