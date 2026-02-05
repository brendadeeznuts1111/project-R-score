/**
 * EnhancedSkillExecutor - Optimized skill execution with metrics tracking.
 * Leverages Bun's faster spawnSync (30x improvement on Linux ARM64).
 */

import type { MetricsCollector } from "./collector.js";

// Shared decoder for streaming - reused across all executions
const streamDecoder = new TextDecoder("utf-8", { fatal: false });

export type SkillExecutionResult = {
  output: string;
  stderr: string;
  exitCode: number;
  duration: number;
  success: boolean;
};

export type SkillExecutionOptions = {
  timeout?: number;
  env?: Record<string, string>;
  cwd?: string;
  stdio?: "inherit" | "pipe" | "ignore";
};

export class EnhancedSkillExecutor {
  constructor(private metrics: MetricsCollector) {}

  /**
   * Execute skill with optimized spawnSync (Linux ARM64 improvements).
   */
  async executeSkill(
    skillId: string,
    command: string,
    args: string[] = [],
    options: SkillExecutionOptions = {},
  ): Promise<SkillExecutionResult> {
    const startTime = performance.now();

    try {
      const proc = Bun.spawnSync([command, ...args], {
        cwd: options.cwd ?? `./skills/${skillId}`,
        env: { ...process.env, ...options.env },
        timeout: options.timeout ?? 30000,
      });

      const duration = performance.now() - startTime;
      // Use fatal: false to replace invalid UTF-8 with replacement char instead of throwing
      const decoder = new TextDecoder("utf-8", { fatal: false });
      const output = proc.stdout ? decoder.decode(proc.stdout) : "";
      const stderr = proc.stderr ? decoder.decode(proc.stderr) : "";
      const success = proc.exitCode === 0;

      // Record execution metrics
      await this.metrics.recordExecution(
        skillId,
        command,
        args,
        Math.round(duration),
        success,
        success ? undefined : stderr,
      );

      return {
        output,
        stderr,
        exitCode: proc.exitCode ?? 0,
        duration: Math.round(duration),
        success,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.metrics.recordExecution(
        skillId,
        command,
        args,
        Math.round(duration),
        false,
        errorMessage,
      );

      return {
        output: "",
        stderr: errorMessage,
        exitCode: 1,
        duration: Math.round(duration),
        success: false,
      };
    }
  }

  /**
   * Execute skill asynchronously with streaming output.
   */
  async executeSkillAsync(
    skillId: string,
    command: string,
    args: string[] = [],
    options: SkillExecutionOptions & {
      onStdout?: (chunk: string) => void;
      onStderr?: (chunk: string) => void;
    } = {},
  ): Promise<SkillExecutionResult> {
    const startTime = performance.now();

    try {
      const proc = Bun.spawn([command, ...args], {
        cwd: options.cwd ?? `./skills/${skillId}`,
        env: { ...process.env, ...options.env },
        stdout: "pipe",
        stderr: "pipe",
      });

      const outputChunks: string[] = [];
      const stderrChunks: string[] = [];

      // Stream stdout - use array.push + join to avoid O(n²) string concatenation
      if (proc.stdout) {
        const reader = proc.stdout.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = streamDecoder.decode(value, { stream: true });
          outputChunks.push(chunk);
          options.onStdout?.(chunk);
        }
      }

      // Stream stderr - use array.push + join to avoid O(n²) string concatenation
      if (proc.stderr) {
        const reader = proc.stderr.getReader();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = streamDecoder.decode(value, { stream: true });
          stderrChunks.push(chunk);
          options.onStderr?.(chunk);
        }
      }

      const output = outputChunks.join("");
      const stderr = stderrChunks.join("");

      const exitCode = await proc.exited;
      const duration = performance.now() - startTime;
      const success = exitCode === 0;

      await this.metrics.recordExecution(
        skillId,
        command,
        args,
        Math.round(duration),
        success,
        success ? undefined : stderr,
      );

      return {
        output,
        stderr,
        exitCode,
        duration: Math.round(duration),
        success,
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);

      await this.metrics.recordExecution(
        skillId,
        command,
        args,
        Math.round(duration),
        false,
        errorMessage,
      );

      return {
        output: "",
        stderr: errorMessage,
        exitCode: 1,
        duration: Math.round(duration),
        success: false,
      };
    }
  }

  /**
   * Bulk execute multiple skills with parallel processing.
   */
  async executeSkillsBatch(
    executions: Array<{
      skillId: string;
      command: string;
      args?: string[];
      options?: SkillExecutionOptions;
    }>,
  ): Promise<Array<{ skillId: string; result: SkillExecutionResult }>> {
    const promises = executions.map(async (exec) => {
      const result = await this.executeSkill(
        exec.skillId,
        exec.command,
        exec.args ?? [],
        exec.options ?? {},
      );
      return { skillId: exec.skillId, result };
    });

    return Promise.all(promises);
  }

  /**
   * Execute with timeout and retry logic.
   */
  async executeWithRetry(
    skillId: string,
    command: string,
    args: string[] = [],
    options: SkillExecutionOptions & { maxRetries?: number; retryDelayMs?: number } = {},
  ): Promise<SkillExecutionResult> {
    const maxRetries = options.maxRetries ?? 3;
    const retryDelayMs = options.retryDelayMs ?? 1000;

    let lastResult: SkillExecutionResult | null = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      lastResult = await this.executeSkill(skillId, command, args, options);

      if (lastResult.success) {
        return lastResult;
      }

      if (attempt < maxRetries - 1) {
        await Bun.sleep(retryDelayMs);
      }
    }

    return lastResult!;
  }
}
