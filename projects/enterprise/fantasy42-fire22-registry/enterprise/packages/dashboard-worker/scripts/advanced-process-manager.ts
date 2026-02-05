#!/usr/bin/env bun

/**
 * 🚀 Advanced Process Manager for Fire22 Build System
 *
 * Sophisticated process management using Bun.spawn with:
 * - Resource monitoring and analytics
 * - Timeout management with graceful termination
 * - IPC communication for real-time progress
 * - Parallel process orchestration
 * - Advanced error handling and recovery
 *
 * @version 3.0.8
 * @author Fire22 Development Team
 * @see docs/BUILD-INDEX.md for usage guide
 */

export interface ProcessOptions {
  command: string[];
  cwd?: string;
  env?: Record<string, string>;
  timeout?: number;
  maxBuffer?: number;
  killSignal?: string | number;
  signal?: AbortSignal;
  stdio?: {
    stdin?: 'pipe' | 'inherit' | 'ignore';
    stdout?: 'pipe' | 'inherit' | 'ignore';
    stderr?: 'pipe' | 'inherit' | 'ignore';
  };
  ipc?: boolean;
  onProgress?: (data: { type: 'stdout' | 'stderr'; content: string }) => void;
  onResourceUpdate?: (usage: ResourceUsage) => void;
}

export interface ProcessResult {
  success: boolean;
  exitCode: number | null;
  signalCode: string | null;
  stdout: string;
  stderr: string;
  duration: number;
  resourceUsage?: ResourceUsage;
  pid: number;
  timedOut?: boolean;
  // Enhanced Bun-native analytics
  analytics?: {
    startTimeNs: number;
    endTimeNs: number;
    uptimeNs: number;
    memoryTrend: number[];
    cpuTrend: number[];
    performanceScore: number;
    efficiency: number;
    peakMemory: number;
    avgCpuUsage: number;
  };
  bunMetrics?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
    rss: number;
  };
}

export interface ResourceUsage {
  cpuTime: {
    user: number;
    system: number;
    total: number;
  };
  memory: {
    maxRSS: number;
    current: number;
  };
  contextSwitches: {
    voluntary: number;
    involuntary: number;
  };
  io: {
    in: number;
    out: number;
  };
  messages: {
    sent: number;
    received: number;
  };
}

export class AdvancedProcessManager {
  private runningProcesses = new Map<number, Bun.Subprocess>();
  private processMetrics = new Map<number, { startTime: number; command: string[] }>();

  /**
   * Execute a single process with enhanced Bun-native monitoring
   */
  async execute(options: ProcessOptions): Promise<ProcessResult> {
    const startTimeNs = Bun.nanoseconds();
    const startMemory = process.memoryUsage();
    let stdout = '';
    let stderr = '';
    let timedOut = false;

    // Enhanced analytics tracking
    const memoryTrend: number[] = [];
    const cpuTrend: number[] = [];
    let peakMemory = startMemory.rss;
    let totalCpuSamples = 0;

    return new Promise((resolve, reject) => {
      // Start resource monitoring interval
      const monitoringInterval = setInterval(() => {
        const currentMemory = process.memoryUsage();
        const cpuUsage = process.cpuUsage();

        memoryTrend.push(currentMemory.rss);
        cpuTrend.push(cpuUsage.user + cpuUsage.system);

        if (currentMemory.rss > peakMemory) {
          peakMemory = currentMemory.rss;
        }
        totalCpuSamples++;

        // Report resource updates if callback provided
        if (options.onResourceUpdate) {
          options.onResourceUpdate({
            cpuTime: { user: cpuUsage.user, system: cpuUsage.system },
            memory: {
              rss: currentMemory.rss,
              heapUsed: currentMemory.heapUsed,
              heapTotal: currentMemory.heapTotal,
              external: currentMemory.external,
            },
            contextSwitches: { voluntary: 0, involuntary: 0 },
            io: { in: 0, out: 0 },
            messages: { sent: 0, received: 0 },
          });
        }
      }, 100); // Sample every 100ms

      const proc = Bun.spawn({
        cmd: options.command,
        cwd: options.cwd || process.cwd(),
        env: options.env ? { ...process.env, ...options.env } : undefined,
        stdin: options.stdio?.stdin || 'ignore',
        stdout: 'pipe',
        stderr: 'pipe',
        timeout: options.timeout,
        killSignal: options.killSignal as any,
        signal: options.signal,
        onExit: (subprocess, exitCode, signalCode, error) => {
          const duration = (Bun.nanoseconds() - startTimeNs) / 1_000_000; // Convert to ms
          this.runningProcesses.delete(subprocess.pid);
          this.processMetrics.delete(subprocess.pid);

          const resourceUsage = this.formatResourceUsage(subprocess.resourceUsage());

          if (options.onResourceUpdate) {
            options.onResourceUpdate(resourceUsage);
          }

          // Check if process timed out
          timedOut = signalCode === 'SIGTERM' && options.timeout && duration >= options.timeout;

          // Stop monitoring
          clearInterval(monitoringInterval);

          // Calculate analytics
          const endTimeNs = Bun.nanoseconds();
          const uptimeNs = endTimeNs - startTimeNs;
          const endMemory = process.memoryUsage();

          const avgMemoryUsage =
            memoryTrend.length > 0
              ? memoryTrend.reduce((sum, mem) => sum + mem, 0) / memoryTrend.length
              : startMemory.rss;
          const avgCpuUsage =
            cpuTrend.length > 0 ? cpuTrend.reduce((sum, cpu) => sum + cpu, 0) / cpuTrend.length : 0;

          const performanceScore = Math.max(
            0,
            100 - (duration / 1000) * 2 - (avgMemoryUsage / 1024 / 1024) * 0.1
          );
          const efficiency = duration > 0 ? (avgCpuUsage / duration) * 100 : 100;

          const analytics = {
            startTimeNs,
            endTimeNs,
            uptimeNs,
            memoryTrend: memoryTrend.slice(-50), // Keep last 50 samples
            cpuTrend: cpuTrend.slice(-50), // Keep last 50 samples
            performanceScore: Math.round(performanceScore),
            efficiency: Math.round(efficiency * 100) / 100,
            peakMemory,
            avgCpuUsage: Math.round(avgCpuUsage),
          };

          const bunMetrics = {
            heapUsed: endMemory.heapUsed,
            heapTotal: endMemory.heapTotal,
            external: endMemory.external,
            arrayBuffers: endMemory.arrayBuffers,
            rss: endMemory.rss,
          };

          resolve({
            success: exitCode === 0 && !error,
            exitCode,
            signalCode,
            stdout,
            stderr,
            duration,
            resourceUsage,
            pid: subprocess.pid,
            timedOut,
            analytics,
            bunMetrics,
          });
        },
      });

      // Track running process
      this.runningProcesses.set(proc.pid, proc);
      this.processMetrics.set(proc.pid, {
        startTime: Date.now(),
        command: options.command,
      });

      // Handle stdout streaming
      if (proc.stdout) {
        proc.stdout.pipeTo(
          new WritableStream({
            write(chunk) {
              const content = new TextDecoder().decode(chunk);
              stdout += content;
              if (options.onProgress) {
                options.onProgress({ type: 'stdout', content });
              }
            },
          })
        );
      }

      // Handle stderr streaming
      if (proc.stderr) {
        proc.stderr.pipeTo(
          new WritableStream({
            write(chunk) {
              const content = new TextDecoder().decode(chunk);
              stderr += content;
              if (options.onProgress) {
                options.onProgress({ type: 'stderr', content });
              }
            },
          })
        );
      }
    });
  }

  /**
   * Execute multiple processes in parallel with resource monitoring
   */
  async executeParallel(
    processes: ProcessOptions[],
    options: {
      maxConcurrency?: number;
      failFast?: boolean;
      progressCallback?: (completed: number, total: number, current?: ProcessResult) => void;
    } = {}
  ): Promise<ProcessResult[]> {
    const { maxConcurrency = 4, failFast = false, progressCallback } = options;
    const results: ProcessResult[] = [];
    const executing = new Set<Promise<ProcessResult>>();
    let index = 0;

    const executeNext = async (): Promise<ProcessResult | null> => {
      if (index >= processes.length) return null;

      const processOptions = processes[index++];
      const result = await this.execute(processOptions);

      if (progressCallback) {
        progressCallback(results.length + 1, processes.length, result);
      }

      if (failFast && !result.success) {
        // Kill remaining processes
        await this.killAll();
        throw new Error(
          `Process failed: ${processOptions.command.join(' ')} (exit code: ${result.exitCode})`
        );
      }

      return result;
    };

    // Start initial batch
    for (let i = 0; i < Math.min(maxConcurrency, processes.length); i++) {
      executing.add(executeNext());
    }

    // Process results as they complete
    while (executing.size > 0) {
      const result = await Promise.race(executing);

      if (result) {
        results.push(result);

        // Start next process if available
        const nextPromise = executeNext();
        if (nextPromise) {
          executing.add(nextPromise);
        }
      }

      // Remove completed promises
      for (const promise of executing) {
        try {
          const promiseResult = await Promise.race([promise, Promise.resolve(null)]);
          if (promiseResult !== null) {
            executing.delete(promise);
            break;
          }
        } catch (error) {
          executing.delete(promise);
          if (failFast) throw error;
        }
      }
    }

    return results;
  }

  /**
   * Execute a command with retry logic and exponential backoff
   */
  async executeWithRetry(
    options: ProcessOptions,
    retryOptions: {
      maxRetries?: number;
      backoffMs?: number;
      backoffMultiplier?: number;
      retryCondition?: (result: ProcessResult) => boolean;
    } = {}
  ): Promise<ProcessResult> {
    const {
      maxRetries = 3,
      backoffMs = 1000,
      backoffMultiplier = 2,
      retryCondition = result => !result.success && result.exitCode !== 0,
    } = retryOptions;

    let lastResult: ProcessResult;
    let currentBackoff = backoffMs;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        lastResult = await this.execute(options);

        if (!retryCondition(lastResult)) {
          return lastResult;
        }

        if (attempt < maxRetries) {
          console.warn(
            `Command failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${currentBackoff}ms:`,
            options.command.join(' ')
          );
          await new Promise(resolve => setTimeout(resolve, currentBackoff));
          currentBackoff *= backoffMultiplier;
        }
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }

        console.warn(
          `Command error (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${currentBackoff}ms:`,
          error
        );
        await new Promise(resolve => setTimeout(resolve, currentBackoff));
        currentBackoff *= backoffMultiplier;
      }
    }

    return lastResult!;
  }

  /**
   * Get real-time status of all running processes
   */
  getRunningProcesses(): Array<{ pid: number; command: string[]; duration: number }> {
    const now = Date.now();
    return Array.from(this.processMetrics.entries()).map(([pid, metrics]) => ({
      pid,
      command: metrics.command,
      duration: now - metrics.startTime,
    }));
  }

  /**
   * Kill all running processes gracefully
   */
  async killAll(signal: string | number = 'SIGTERM'): Promise<void> {
    const killPromises: Promise<void>[] = [];

    for (const [pid, proc] of this.runningProcesses) {
      killPromises.push(
        new Promise(resolve => {
          const timeout = setTimeout(() => {
            // Force kill if graceful termination takes too long
            try {
              proc.kill('SIGKILL');
            } catch (error) {
              // Process might already be dead
            }
            resolve();
          }, 5000);

          proc.exited.then(() => {
            clearTimeout(timeout);
            resolve();
          });

          try {
            proc.kill(signal);
          } catch (error) {
            clearTimeout(timeout);
            resolve();
          }
        })
      );
    }

    await Promise.all(killPromises);
    this.runningProcesses.clear();
    this.processMetrics.clear();
  }

  /**
   * Kill a specific process by PID
   */
  async killProcess(pid: number, signal: string | number = 'SIGTERM'): Promise<boolean> {
    const proc = this.runningProcesses.get(pid);
    if (!proc) return false;

    try {
      proc.kill(signal);
      await proc.exited;
      this.runningProcesses.delete(pid);
      this.processMetrics.delete(pid);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get aggregated resource usage across all completed processes
   */
  private formatResourceUsage(usage: any): ResourceUsage {
    return {
      cpuTime: {
        user: usage?.cpuTime?.user || 0,
        system: usage?.cpuTime?.system || 0,
        total: (usage?.cpuTime?.user || 0) + (usage?.cpuTime?.system || 0),
      },
      memory: {
        maxRSS: usage?.maxRSS || 0,
        current: process.memoryUsage().heapUsed,
      },
      contextSwitches: {
        voluntary: usage?.contextSwitches?.voluntary || 0,
        involuntary: usage?.contextSwitches?.involuntary || 0,
      },
      io: {
        in: usage?.ops?.in || 0,
        out: usage?.ops?.out || 0,
      },
      messages: {
        sent: usage?.messages?.sent || 0,
        received: usage?.messages?.received || 0,
      },
    };
  }

  /**
   * Clean up resources and kill all processes
   */
  async dispose(): Promise<void> {
    await this.killAll();
  }
}

export default AdvancedProcessManager;
