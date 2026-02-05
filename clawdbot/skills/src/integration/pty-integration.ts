/**
 * src/integration/pty-integration.ts
 * PTY Skill Integration
 * - Enhance skill execution with PTY capabilities
 * - Development environment with live reload
 * - Test execution with PTY output
 */

import { SkillPTYManager } from "../pty/skill-pty-manager";

// =============================================================================
// Types
// =============================================================================

export interface DevEnvironment {
  skillId: string;
  terminal: any;
  watcher: any;
  restart: () => Promise<void>;
  stop: () => void;
}

export interface TestResults {
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  output: string;
}

export interface ExecuteOptions {
  interactive?: boolean;
  pty?: boolean;
  env?: Record<string, string>;
  onOutput?: (data: string) => void;
  onError?: (error: string) => void;
  timeout?: number;
}

// =============================================================================
// PTYSkillIntegration Class
// =============================================================================

export class PTYSkillIntegration {
  private ptyManager = new SkillPTYManager();

  /**
   * Enhance skill execution with PTY capabilities
   */
  async executeSkillWithPTY(
    skillId: string,
    command: string,
    args: any[] = [],
    options: ExecuteOptions = {}
  ): Promise<any> {
    // Check if PTY is available and requested
    const usePTY = options.pty && process.platform !== "win32";

    if (usePTY) {
      return this.executeWithPTY(skillId, command, args, options);
    } else {
      return this.executeWithoutPTY(skillId, command, args, options);
    }
  }

  private async executeWithPTY(
    skillId: string,
    command: string,
    args: any[],
    options: ExecuteOptions
  ): Promise<any> {
    const output: string[] = [];
    let resolvePromise: (value: any) => void;
    let rejectPromise: (error: any) => void;

    const promise = new Promise<any>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });

    const skillDir = `./skills/${skillId}`;

    const terminal = await this.ptyManager.createSkillTerminal(skillId, {
      command: "bun",
      args: ["run", "src/index.ts", command, ...args.map(String)],
      onData: (data) => {
        const text = new TextDecoder().decode(data);
        output.push(text);

        if (options.onOutput) {
          options.onOutput(text);
        }

        // Try to parse JSON result
        const lines = text.split("\n");
        for (const line of lines) {
          try {
            const result = JSON.parse(line.trim());
            if (result.success !== undefined) {
              if (result.success) {
                resolvePromise!(result.data);
              } else {
                rejectPromise!(new Error(result.error));
              }
            }
          } catch {
            // Not JSON, continue
          }
        }
      },
      onExit: (code) => {
        if (code !== 0) {
          rejectPromise!(new Error(`Process exited with code ${code}`));
        } else {
          // Return raw output if no JSON result
          resolvePromise!(output.join(""));
        }
      },
    });

    // Timeout
    const timeout = options.timeout || 30000;
    const timeoutId = setTimeout(() => {
      terminal.kill();
      rejectPromise!(new Error("Execution timeout"));
    }, timeout);

    try {
      const result = await promise;
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  private async executeWithoutPTY(
    skillId: string,
    command: string,
    args: any[],
    options: ExecuteOptions
  ): Promise<any> {
    const skillDir = `./skills/${skillId}`;

    const proc = Bun.spawn(
      ["bun", "run", "src/index.ts", command, ...args.map(String)],
      {
        cwd: skillDir,
        stdout: "pipe",
        stderr: "pipe",
        env: {
          ...process.env,
          ...options.env,
        },
      }
    );

    const output: string[] = [];

    // Read stdout
    const stdoutReader = proc.stdout.getReader();
    const readStdout = async () => {
      while (true) {
        const { done, value } = await stdoutReader.read();
        if (done) break;
        if (value) {
          const text = new TextDecoder().decode(value);
          output.push(text);
          if (options.onOutput) {
            options.onOutput(text);
          }
        }
      }
    };

    // Read stderr
    const stderrReader = proc.stderr.getReader();
    const readStderr = async () => {
      while (true) {
        const { done, value } = await stderrReader.read();
        if (done) break;
        if (value) {
          const text = new TextDecoder().decode(value);
          if (options.onError) {
            options.onError(text);
          }
        }
      }
    };

    await Promise.all([readStdout(), readStderr(), proc.exited]);

    const exitCode = await proc.exited;
    if (exitCode !== 0) {
      throw new Error(`Process exited with code ${exitCode}`);
    }

    return output.join("");
  }

  /**
   * Create a skill development environment with live reload
   */
  async createDevEnvironment(
    skillId: string,
    options: {
      hotReload?: boolean;
      breakpoints?: string[];
      port?: number;
    } = {}
  ): Promise<DevEnvironment> {
    console.log(`Creating development environment for ${skillId}`);

    // Create debug terminal
    const debugTerminal = await this.ptyManager.createDebugTerminal(skillId, {
      inspector: true,
      port: options.port || 9229,
      watch: options.hotReload,
      breakpoints: options.breakpoints,
    });

    // Create file watcher for hot reload
    let fileWatcher: any = null;
    if (options.hotReload) {
      const skillDir = `./skills/${skillId}`;

      // Use Bun's file watcher
      const { watch } = await import("fs");
      fileWatcher = watch(
        skillDir,
        { recursive: true },
        (event, filename) => {
          if (filename && (filename.endsWith(".ts") || filename.endsWith(".js"))) {
            console.log(`File changed: ${filename}`);
            debugTerminal.write("\x03"); // Send Ctrl+C
            setTimeout(() => {
              debugTerminal.write("bun run src/index.ts\n");
            }, 500);
          }
        }
      );
    }

    return {
      skillId,
      terminal: debugTerminal,
      watcher: fileWatcher,

      restart: async () => {
        debugTerminal.write("\x03"); // Send Ctrl+C
        await Bun.sleep(500);
        debugTerminal.write("bun run src/index.ts\n");
      },

      stop: () => {
        debugTerminal.kill();
        if (fileWatcher) {
          fileWatcher.close();
        }
      },
    };
  }

  /**
   * Run skill tests with PTY for better output
   */
  async runTestsWithPTY(
    skillId: string,
    options: {
      watch?: boolean;
      coverage?: boolean;
      filter?: string;
    } = {}
  ): Promise<TestResults> {
    const startTime = Date.now();
    const output: string[] = [];

    const testTerminal = await this.ptyManager.createSkillTerminal(skillId, {
      command: "bun",
      args: [
        "test",
        ...(options.watch ? ["--watch"] : []),
        ...(options.coverage ? ["--coverage"] : []),
        ...(options.filter ? ["--test-name-pattern", options.filter] : []),
      ],
      env: {
        NODE_ENV: "test",
        FORCE_COLOR: "1",
      },
      onData: (data) => {
        const text = new TextDecoder().decode(data);
        output.push(text);
        process.stdout.write(data);
      },
    });

    // Wait for tests to complete
    await testTerminal.process.exited;

    const duration = Date.now() - startTime;
    const fullOutput = output.join("");

    // Parse test results from output
    const results: TestResults = {
      passed: 0,
      failed: 0,
      skipped: 0,
      duration,
      output: fullOutput,
    };

    // Try to parse pass/fail counts
    const passMatch = fullOutput.match(/(\d+)\s*pass/i);
    const failMatch = fullOutput.match(/(\d+)\s*fail/i);
    const skipMatch = fullOutput.match(/(\d+)\s*skip/i);

    if (passMatch) results.passed = parseInt(passMatch[1], 10);
    if (failMatch) results.failed = parseInt(failMatch[1], 10);
    if (skipMatch) results.skipped = parseInt(skipMatch[1], 10);

    return results;
  }

  /**
   * Run a skill with live output streaming
   */
  async streamSkillExecution(
    skillId: string,
    args: string[] = [],
    onChunk: (chunk: string) => void
  ): Promise<number> {
    const terminal = await this.ptyManager.createSkillTerminal(skillId, {
      command: "bun",
      args: ["run", "src/index.ts", ...args],
      onData: (data) => {
        const text = new TextDecoder().decode(data);
        onChunk(text);
      },
    });

    const exitCode = await terminal.process.exited;
    return exitCode;
  }

  /**
   * Create an interactive REPL for a skill
   */
  async createSkillREPL(
    skillId: string,
    options: {
      preload?: string[];
      env?: Record<string, string>;
    } = {}
  ): Promise<any> {
    console.log(`Starting REPL for ${skillId}`);

    const terminal = await this.ptyManager.createSkillTerminal(skillId, {
      command: "bun",
      args: ["repl"],
      env: {
        ...options.env,
        SKILL_REPL: "true",
      },
      onData: (data) => {
        process.stdout.write(data);
      },
      persistHistory: true,
    });

    // Preload modules
    if (options.preload) {
      for (const module of options.preload) {
        terminal.write(`const ${module} = require('./${module}');\n`);
      }
    }

    // Set up input
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(true);
      process.stdin.resume();

      process.stdin.on("data", (data) => {
        terminal.write(data);
      });
    }

    return terminal;
  }
}

// =============================================================================
// Export singleton
// =============================================================================

export const ptyIntegration = new PTYSkillIntegration();
export default PTYSkillIntegration;
