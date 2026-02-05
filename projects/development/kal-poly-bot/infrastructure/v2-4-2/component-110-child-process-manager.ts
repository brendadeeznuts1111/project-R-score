#!/usr/bin/env bun
/**
 * Component #110: Child-Process-Manager
 * Primary API: Bun.spawn()
 * Secondary API: Bun.spawnSync()
 * Performance SLA: 20ms spawn time
 * Parity Lock: 7q8r...9s0t
 * Status: HARDENED
 */

import { feature } from "bun:bundle";

interface SpawnOptions {
  cmd: string[];
  cwd?: string;
  env?: Record<string, string>;
  stdin?: string;
  timeout?: number;
}

export class ChildProcessManager {
  private static instance: ChildProcessManager;
  private activeProcesses: Map<number, any> = new Map();

  private constructor() {}

  static getInstance(): ChildProcessManager {
    if (!this.instance) {
      this.instance = new ChildProcessManager();
    }
    return this.instance;
  }

  async spawn(options: SpawnOptions): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
  }> {
    if (!feature("CHILD_PROCESS_MANAGER")) {
      const result = Bun.spawnSync(options.cmd, {
        cwd: options.cwd,
        env: { ...Bun.env, ...(options.env || {}) },
        stdin: options.stdin,
      });
      return {
        stdout: result.stdout.toString(),
        stderr: result.stderr.toString(),
        exitCode: result.exitCode || 0,
      };
    }

    const startTime = performance.now();
    
    const proc = Bun.spawn(options.cmd, {
      cwd: options.cwd,
      env: { ...Bun.env, ...(options.env || {}) },
      stdin: options.stdin,
    });

    const pid = proc.pid;
    this.activeProcesses.set(pid, proc);

    const [stdout, stderr] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
    ]);

    const exitCode = await proc.exited;
    const duration = performance.now() - startTime;

    this.activeProcesses.delete(pid);

    // SLA check: 20ms spawn time
    if (duration > 20) {
      console.warn(`⚠️  Process spawn SLA breach: ${duration.toFixed(2)}ms > 20ms`);
    }

    return { stdout, stderr, exitCode };
  }

  killAll(): void {
    for (const [, proc] of this.activeProcesses) {
      try {
        proc.kill();
      } catch {}
    }
    this.activeProcesses.clear();
  }

  getActiveCount(): number {
    return this.activeProcesses.size;
  }
}

export const childProcessManager = feature("CHILD_PROCESS_MANAGER")
  ? ChildProcessManager.getInstance()
  : {
      spawn: async (options: SpawnOptions) => {
        const result = Bun.spawnSync(options.cmd, {
          cwd: options.cwd,
          env: { ...Bun.env, ...(options.env || {}) },
          stdin: options.stdin,
        });
        return {
          stdout: result.stdout.toString(),
          stderr: result.stderr.toString(),
          exitCode: result.exitCode || 0,
        };
      },
      killAll: () => {},
      getActiveCount: () => 0,
    };

export default childProcessManager;
