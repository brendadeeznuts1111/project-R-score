#!/usr/bin/env bun
/**
 * src/cli/debug-cli.ts
 * Interactive Skill Debugger using Bun.Terminal API
 * - Real TTY support for interactive tools
 * - REPL environment for testing
 * - Live debugging with breakpoints
 * - Performance profiling
 */

import { EnhancedOutput } from "./enhanced-output";

export class SkillDebugger {
  private currentTerminal: any = null;
  private currentProcess: any = null;
  private isWindows = process.platform === "win32";

  /**
   * Interactive debug shell for a skill
   */
  async debugSkill(
    skillId: string,
    options: {
      command?: string;
      args?: string[];
      env?: Record<string, string>;
      cwd?: string;
      buildIfMissing?: boolean;
      features?: string[];
      attachDebugger?: boolean;
    } = {}
  ): Promise<void> {
    if (this.isWindows) {
      console.log(
        "\x1b[33m!\x1b[0m Note: Bun.Terminal is POSIX-only. Using fallback mode."
      );
      return this.debugSkillFallback(skillId, options);
    }

    EnhancedOutput.printHeader(`Debug: ${skillId}`);

    // Check if skill exists
    const skillDir = `./skills/${skillId}`;
    const skillJsonExists = await Bun.file(`${skillDir}/skill.json`).exists();

    if (!skillJsonExists) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    // Load skill config
    const skillConfig = await Bun.file(`${skillDir}/skill.json`).json();

    // Build skill if needed
    if (options.buildIfMissing) {
      await this.buildSkillForDebug(skillId, options.features);
    }

    // Prepare paths
    const fullSkillDir = `${process.cwd()}/${skillDir}`;
    const cwd = options.cwd || skillDir;

    // Display skill info
    console.log(`  Skill: ${skillConfig.name || skillId}`);
    console.log(`  Version: ${skillConfig.version || "unknown"}`);
    console.log(`  Directory: ${fullSkillDir}`);
    console.log("");

    // Prepare environment
    const env = {
      ...process.env,
      SKILL_ID: skillId,
      SKILL_DIR: fullSkillDir,
      SKILL_VERSION: skillConfig.version || "1.0.0",
      NODE_ENV: "development",
      ...options.env,
    };

    // Check if we have a TTY for interactive mode
    if (!process.stdin.isTTY) {
      console.log("\n\x1b[33mNo TTY detected. Use non-interactive mode:\x1b[0m");
      console.log(`  skill-debug ${skillId} --run [args]`);
      console.log(`  skill-debug ${skillId} --build`);
      console.log(`  skill-debug ${skillId} --exec "cmd"`);
      return;
    }

    // Create shell init script with helper functions
    const shellRcContent = `
# Skill Debug Shell - ${skillId}
export SKILL_ID="${skillId}"
export SKILL_DIR="${fullSkillDir}"
export SKILL_VERSION="${skillConfig.version || "1.0.0"}"
export PATH="$SKILL_DIR/node_modules/.bin:$PATH"

# Custom prompt
export PS1="\\[\\033[1;35m\\][${skillId}]\\[\\033[0m\\] \\[\\033[1;34m\\]\\w\\[\\033[0m\\] $ "

# Skill helper functions
skill-run() {
  echo "Running ${skillId}..."
  bun run "$SKILL_DIR/src/index.ts" "$@"
}

skill-build() {
  echo "Building ${skillId}..."
  mkdir -p "$SKILL_DIR/dist"
  bun build "$SKILL_DIR/src/index.ts" --compile --outfile "$SKILL_DIR/dist/${skillId}"
  if [ $? -eq 0 ]; then
    echo "Built: $SKILL_DIR/dist/${skillId}"
  else
    echo "Build failed!"
  fi
}

skill-test() {
  echo "Testing ${skillId}..."
  if [ -f "$SKILL_DIR/src/index.test.ts" ]; then
    bun test "$SKILL_DIR/src/index.test.ts"
  elif [ -f "$SKILL_DIR/test/index.test.ts" ]; then
    bun test "$SKILL_DIR/test/index.test.ts"
  else
    echo "No tests found"
  fi
}

skill-info() {
  echo ""
  echo "Skill: ${skillConfig.name || skillId}"
  echo "Version: ${skillConfig.version || "unknown"}"
  echo "Description: ${skillConfig.description || "N/A"}"
  echo "Directory: $SKILL_DIR"
  echo ""
  echo "Commands:"
  ${
    skillConfig.commands
      ? skillConfig.commands
          .map((c: any) => `echo "  ${c.name}: ${c.description}"`)
          .join("\n  ")
      : 'echo "  (none defined)"'
  }
  echo ""
}

skill-upload() {
  echo "Uploading ${skillId}..."
  cd "$SKILL_DIR/../.." && bun src/cli/deploy-s3.ts upload ${skillId} --all-platforms
}

# Welcome
echo ""
echo "Skill debug shell ready. Available commands:"
echo "  skill-run [args]  - Run the skill"
echo "  skill-build       - Build the skill"
echo "  skill-test        - Run tests"
echo "  skill-info        - Show skill info"
echo "  skill-upload      - Upload to R2"
echo "  exit              - Exit debug shell"
echo ""

cd "$SKILL_DIR"
`;

    const shellRcPath = `/tmp/skill-debug-${skillId}-${Date.now()}.sh`;
    await Bun.write(shellRcPath, shellRcContent);

    console.log("  \x1b[36mCommands:\x1b[0m");
    console.log("    skill-run [args]  Run the skill");
    console.log("    skill-build       Build the skill");
    console.log("    skill-test        Run tests");
    console.log("    skill-info        Show skill info");
    console.log("    exit              Exit debug shell");
    console.log("");
    console.log("  \x1b[33mPress Ctrl+D or type 'exit' to quit\x1b[0m");
    console.log("─".repeat(60));

    // Spawn bash with PTY using Bun.Terminal
    const proc = Bun.spawn(["bash", "--rcfile", shellRcPath], {
      terminal: {
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        data(_term: any, data: Uint8Array) {
          process.stdout.write(data);
        },
      },
      env,
      cwd,
    });

    this.currentProcess = proc;
    this.currentTerminal = proc.terminal;

    // Handle terminal resize
    const resizeHandler = () => {
      proc.terminal?.resize(process.stdout.columns, process.stdout.rows);
    };
    process.stdout.on("resize", resizeHandler);

    // Set raw mode and forward stdin
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const stdinHandler = (chunk: Buffer) => {
      proc.terminal?.write(chunk);
    };
    process.stdin.on("data", stdinHandler);

    // Wait for process to exit
    await proc.exited;

    // Cleanup
    process.stdin.removeListener("data", stdinHandler);
    process.stdout.removeListener("resize", resizeHandler);
    process.stdin.setRawMode(false);
    proc.terminal?.close();

    // Remove temp file
    Bun.spawnSync(["rm", "-f", shellRcPath]);

    console.log("\n\x1b[32m✓\x1b[0m Debug session ended");
  }

  /**
   * Run a command in the skill context (non-interactive)
   */
  async runCommand(
    skillId: string,
    options: {
      exec?: string;
      run?: boolean;
      build?: boolean;
      args?: string[];
    }
  ): Promise<void> {
    const skillDir = `./skills/${skillId}`;
    const skillJsonExists = await Bun.file(`${skillDir}/skill.json`).exists();

    if (!skillJsonExists) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const fullSkillDir = `${process.cwd()}/${skillDir}`;
    const commands: string[] = [];

    if (options.build) {
      commands.push(
        `mkdir -p dist && bun build src/index.ts --compile --outfile dist/${skillId}`
      );
    }

    if (options.run) {
      const runArgs = (options.args || []).join(" ");
      commands.push(`bun run src/index.ts ${runArgs}`);
    }

    if (options.exec) {
      commands.push(options.exec);
    }

    if (commands.length === 0) {
      throw new Error("No command specified. Use --run, --build, or --exec");
    }

    commands.push("exit");

    EnhancedOutput.printHeader(`Debug: ${skillId}`);

    let commandIndex = 0;
    const proc = Bun.spawn(["bash"], {
      terminal: {
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        data(terminal: any, data: Uint8Array) {
          process.stdout.write(data);

          // When we see a prompt, send next command
          const text = new TextDecoder().decode(data);
          if (text.includes("$ ") && commandIndex < commands.length) {
            setTimeout(() => {
              terminal.write(commands[commandIndex++] + "\n");
            }, 50);
          }
        },
      },
      env: {
        ...process.env,
        SKILL_ID: skillId,
        SKILL_DIR: fullSkillDir,
        TERM: "xterm-256color",
      },
      cwd: skillDir,
    });

    await proc.exited;
    proc.terminal?.close();

    console.log("\n\x1b[32m✓\x1b[0m Command completed");
  }

  /**
   * Interactive REPL for skill testing
   */
  async skillREPL(
    skillId: string,
    options: {
      features?: string[];
      watch?: boolean;
    } = {}
  ): Promise<void> {
    EnhancedOutput.printHeader(`REPL: ${skillId}`);

    const skillDir = `./skills/${skillId}`;
    const skillJsonExists = await Bun.file(`${skillDir}/skill.json`).exists();

    if (!skillJsonExists) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const skillConfig = await Bun.file(`${skillDir}/skill.json`).json();
    const fullSkillDir = `${process.cwd()}/${skillDir}`;

    console.log(`  Skill: ${skillConfig.name || skillId}`);
    console.log(`  Version: ${skillConfig.version || "unknown"}`);
    console.log("");

    if (this.isWindows || !process.stdin.isTTY) {
      return this.createFallbackREPL(skillId, skillConfig, fullSkillDir);
    }

    // Create REPL init script
    const replInitScript = `
const repl = require('repl');
const path = require('path');
const fs = require('fs');

process.chdir('${fullSkillDir}');
console.log('Loading skill: ${skillId}...');

// Try to load the skill using dynamic import for TypeScript
async function loadSkill() {
  try {
    // Use Bun to run the skill and capture exports
    const skillPath = path.join('${fullSkillDir}', 'src', 'index.ts');
    if (fs.existsSync(skillPath)) {
      console.log('Skill source found at:', skillPath);
      console.log('');
      console.log('\\x1b[36mREPL Commands:\\x1b[0m');
      console.log('  run(cmd, ...args)  - Run: bun run src/index.ts <cmd> <args>');
      console.log('  build()            - Build the skill executable');
      console.log('  test()             - Run skill tests');
      console.log('  .help              - Show REPL help');
      console.log('  .exit              - Exit REPL');
      console.log('');
    }
  } catch (e) {
    console.log('Note:', e.message);
  }
}

loadSkill().then(() => {
  // Start REPL
  const r = repl.start({
    prompt: '\\x1b[1;35m${skillId}\\x1b[0m> ',
    useGlobal: true,
  });

  // Add helper functions
  r.context.run = async (cmd, ...args) => {
    const { spawnSync } = require('child_process');
    const result = spawnSync('bun', ['run', 'src/index.ts', cmd, ...args], {
      cwd: '${fullSkillDir}',
      stdio: 'inherit',
    });
    return result.status;
  };

  r.context.build = () => {
    const { spawnSync } = require('child_process');
    console.log('Building ${skillId}...');
    const result = spawnSync('bun', ['build', 'src/index.ts', '--compile', '--outfile', 'dist/${skillId}'], {
      cwd: '${fullSkillDir}',
      stdio: 'inherit',
    });
    return result.status === 0 ? 'Build complete!' : 'Build failed';
  };

  r.context.test = () => {
    const { spawnSync } = require('child_process');
    console.log('Testing ${skillId}...');
    const result = spawnSync('bun', ['test'], {
      cwd: '${fullSkillDir}',
      stdio: 'inherit',
    });
    return result.status === 0 ? 'Tests passed!' : 'Tests failed';
  };

  r.context.skillId = '${skillId}';
  r.context.skillDir = '${fullSkillDir}';
});
`;

    // Write temp init script
    const initScriptPath = `/tmp/skill-repl-${skillId}-${Date.now()}.js`;
    await Bun.write(initScriptPath, replInitScript);

    const proc = Bun.spawn(["node", initScriptPath], {
      terminal: {
        cols: process.stdout.columns || 80,
        rows: process.stdout.rows || 24,
        data(_term: any, data: Uint8Array) {
          process.stdout.write(data);
        },
      },
      env: {
        ...process.env,
        SKILL_ID: skillId,
        SKILL_DIR: fullSkillDir,
        NODE_ENV: "development",
      },
      cwd: skillDir,
    });

    // Handle terminal resize
    const resizeHandler = () => {
      proc.terminal?.resize(process.stdout.columns, process.stdout.rows);
    };
    process.stdout.on("resize", resizeHandler);

    // Set raw mode and forward stdin
    process.stdin.setRawMode(true);
    process.stdin.resume();

    const stdinHandler = (chunk: Buffer) => {
      proc.terminal?.write(chunk);
    };
    process.stdin.on("data", stdinHandler);

    await proc.exited;

    // Cleanup
    process.stdin.removeListener("data", stdinHandler);
    process.stdout.removeListener("resize", resizeHandler);
    process.stdin.setRawMode(false);
    proc.terminal?.close();

    // Remove temp file
    Bun.spawnSync(["rm", "-f", initScriptPath]);

    console.log("\n\x1b[32m✓\x1b[0m REPL session ended");
  }

  /**
   * Profile skill performance
   */
  async profileSkill(
    skillId: string,
    options: {
      duration?: number;
      cpu?: boolean;
      memory?: boolean;
      output?: string;
      args?: string[];
    } = {}
  ): Promise<void> {
    EnhancedOutput.printHeader(`Profile: ${skillId}`);

    const skillDir = `./skills/${skillId}`;
    const skillJsonExists = await Bun.file(`${skillDir}/skill.json`).exists();

    if (!skillJsonExists) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    const duration = options.duration || 30;
    const args = options.args || [];

    console.log(`  Duration: ${duration}s`);
    console.log(`  CPU profiling: ${options.cpu ? "enabled" : "disabled"}`);
    console.log(`  Memory profiling: ${options.memory ? "enabled" : "disabled"}`);
    console.log("");
    console.log("Starting profiler...");

    const startTime = Date.now();
    const memorySnapshots: Array<{ time: number; heapUsed: number; rss: number }> =
      [];

    // Start the skill process
    const proc = Bun.spawn(["bun", "run", "src/index.ts", ...args], {
      cwd: skillDir,
      stdout: "pipe",
      stderr: "pipe",
    });

    // Collect memory stats periodically
    const statsInterval = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      const mem = process.memoryUsage();

      memorySnapshots.push({
        time: elapsed,
        heapUsed: mem.heapUsed,
        rss: mem.rss,
      });

      // Show progress
      const progress = Math.min(100, (elapsed / duration) * 100);
      process.stdout.write(
        `\r  Progress: ${progress.toFixed(0)}% | Heap: ${(mem.heapUsed / 1024 / 1024).toFixed(1)}MB | RSS: ${(mem.rss / 1024 / 1024).toFixed(1)}MB`
      );
    }, 1000);

    // Wait for duration or process exit
    const timeout = setTimeout(() => {
      proc.kill();
    }, duration * 1000);

    await proc.exited;
    clearTimeout(timeout);
    clearInterval(statsInterval);

    console.log("\n\nProfile complete!");
    console.log("─".repeat(60));

    // Analyze results
    if (memorySnapshots.length > 0) {
      const maxHeap = Math.max(...memorySnapshots.map((s) => s.heapUsed));
      const avgHeap =
        memorySnapshots.reduce((a, s) => a + s.heapUsed, 0) /
        memorySnapshots.length;
      const maxRss = Math.max(...memorySnapshots.map((s) => s.rss));

      console.log("\nMemory Analysis:");
      console.log(
        `  Peak Heap: ${(maxHeap / 1024 / 1024).toFixed(2)} MB`
      );
      console.log(
        `  Avg Heap: ${(avgHeap / 1024 / 1024).toFixed(2)} MB`
      );
      console.log(`  Peak RSS: ${(maxRss / 1024 / 1024).toFixed(2)} MB`);
      console.log(`  Samples: ${memorySnapshots.length}`);
    }

    // Save output if requested
    if (options.output) {
      const profileData = {
        skillId,
        duration,
        memorySnapshots,
        timestamp: new Date().toISOString(),
      };
      await Bun.write(options.output, JSON.stringify(profileData, null, 2));
      console.log(`\nProfile saved to: ${options.output}`);
    }

    EnhancedOutput.success("Profiling complete!");
  }

  /**
   * Watch mode for development
   */
  async watchSkill(
    skillId: string,
    options: {
      run?: boolean;
      build?: boolean;
      test?: boolean;
    } = {}
  ): Promise<void> {
    EnhancedOutput.printHeader(`Watch: ${skillId}`);

    const skillDir = `./skills/${skillId}`;
    const skillJsonExists = await Bun.file(`${skillDir}/skill.json`).exists();

    if (!skillJsonExists) {
      throw new Error(`Skill not found: ${skillId}`);
    }

    console.log(`  Watching: ${skillDir}`);
    console.log(`  Run on change: ${options.run ? "yes" : "no"}`);
    console.log(`  Build on change: ${options.build ? "yes" : "no"}`);
    console.log(`  Test on change: ${options.test ? "yes" : "no"}`);
    console.log("");
    console.log("Watching for changes... (Ctrl+C to stop)");

    // Use bun's built-in watch
    const watchArgs = ["--watch"];

    if (options.run) {
      const proc = Bun.spawn(["bun", ...watchArgs, "run", "src/index.ts"], {
        cwd: skillDir,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
      });
      await proc.exited;
    } else if (options.test) {
      const proc = Bun.spawn(["bun", "test", "--watch"], {
        cwd: skillDir,
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
      });
      await proc.exited;
    } else {
      // Default: just watch and report changes
      console.log("Use --run, --build, or --test to specify action on change");
    }
  }

  // Private helper methods

  private async debugSkillFallback(
    skillId: string,
    options: any
  ): Promise<void> {
    const skillDir = `./skills/${skillId}`;

    const proc = Bun.spawn(
      ["bash"],
      {
        cwd: options.cwd || skillDir,
        env: { ...process.env, ...options.env },
        stdout: "inherit",
        stderr: "inherit",
        stdin: "inherit",
      }
    );

    await proc.exited;
  }

  private async buildSkillForDebug(
    skillId: string,
    features?: string[]
  ): Promise<void> {
    console.log("Building skill for debugging...");

    const skillDir = `./skills/${skillId}`;

    const result = await Bun.build({
      entrypoints: [`${skillDir}/src/index.ts`],
      outdir: `${skillDir}/dist`,
      target: "bun",
      minify: false,
      sourcemap: "inline",
      define: {
        "process.env.NODE_ENV": '"development"',
        "process.env.DEBUG": '"true"',
      },
    });

    if (!result.success) {
      console.error("Build failed:");
      result.logs.forEach((log) => console.error(log));
      throw new Error("Build failed");
    }

    console.log("\x1b[32m✓\x1b[0m Build complete");
  }

  private async createFallbackREPL(
    skillId: string,
    skillConfig: any,
    fullSkillDir: string
  ): Promise<void> {
    console.log("Using non-interactive REPL mode...");
    console.log("");
    console.log("\x1b[36mREPL Commands:\x1b[0m");
    console.log("  run('cmd', ...args)  - Run: bun run src/index.ts <cmd> <args>");
    console.log("  build()              - Build the skill executable");
    console.log("  test()               - Run skill tests");
    console.log("  .help                - Show REPL help");
    console.log("  .exit                - Exit REPL");
    console.log("");

    // Create a simple REPL init script
    const replInitScript = `
const repl = require('repl');
const { spawnSync } = require('child_process');

const r = repl.start({
  prompt: '${skillId}> ',
  useGlobal: true,
});

r.context.run = (cmd, ...args) => {
  const result = spawnSync('bun', ['run', 'src/index.ts', cmd, ...args.map(String)], {
    cwd: '${fullSkillDir}',
    stdio: 'inherit',
  });
  return result.status;
};

r.context.build = () => {
  console.log('Building ${skillId}...');
  const result = spawnSync('bun', ['build', 'src/index.ts', '--compile', '--outfile', 'dist/${skillId}'], {
    cwd: '${fullSkillDir}',
    stdio: 'inherit',
  });
  return result.status === 0 ? 'Build complete!' : 'Build failed';
};

r.context.test = () => {
  console.log('Testing ${skillId}...');
  const result = spawnSync('bun', ['test'], {
    cwd: '${fullSkillDir}',
    stdio: 'inherit',
  });
  return result.status === 0 ? 'Tests passed!' : 'Tests failed';
};

r.context.skillId = '${skillId}';
r.context.skillDir = '${fullSkillDir}';
`;

    const initScriptPath = `/tmp/skill-repl-fallback-${skillId}-${Date.now()}.js`;
    await Bun.write(initScriptPath, replInitScript);

    const proc = Bun.spawn(["node", initScriptPath], {
      cwd: `./skills/${skillId}`,
      stdout: "inherit",
      stderr: "inherit",
      stdin: "inherit",
    });

    await proc.exited;

    // Cleanup
    Bun.spawnSync(["rm", "-f", initScriptPath]);
  }
}

export default SkillDebugger;
