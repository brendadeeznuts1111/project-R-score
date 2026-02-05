#!/usr/bin/env bun
/**
 * src/cli/skill-debug.ts
 * Skill Debugging & Development CLI
 *
 * Usage:
 *   skill-debug <command> <skill-id> [options]
 *
 * Commands:
 *   debug    - Interactive debug shell
 *   repl     - REPL for testing
 *   profile  - Performance profiling
 *   watch    - Watch mode for development
 *   record   - Record debug session
 *   replay   - Replay recorded session
 *   devtools - Chrome DevTools debugging
 *   attach   - Attach to running process
 *   test     - Run PTY tests
 */

import { parseArgs } from "util";
import { SkillDebugger } from "./debug-cli";
import { EnhancedOutput } from "./enhanced-output";
import { DebugRecorder } from "../debugger/debug-recorder";
import { VisualDebugger } from "../debugger/visual-debugger";
import { ProductionDebugger } from "../debugger/production-debugger";
import { PTYTestRunner } from "../testing/pty-test-runner";

const HELP = `
Skill Debugging & Development Tools

Usage: skill-debug <command> <skill-id> [options]

Commands:
  debug <skill-id>     Interactive debug shell with TTY support
  repl <skill-id>      REPL for testing skill commands
  profile <skill-id>   Performance profiling
  watch <skill-id>     Watch mode for development
  record <skill-id>    Record debug session for replay
  replay <session-id>  Replay a recorded session
  devtools <skill-id>  Chrome DevTools visual debugging
  attach <skill-id>    Attach to running skill process
  test <skill-id>      Run PTY tests for skill

Debug Options:
  --build              Build skill before debugging
  --env KEY=VALUE      Set environment variable
  --cwd <path>         Set working directory
  --features <list>    Comma-separated feature flags
  --run                Run the skill (non-interactive)
  --exec <cmd>         Execute a command (non-interactive)
  --record             Record the debug session

REPL Options:
  --watch              Watch for file changes
  --features <list>    Enable feature flags

Profile Options:
  --duration <secs>    Profile duration (default: 30)
  --cpu                Enable CPU profiling
  --memory             Enable memory profiling
  --output <file>      Output file for profile data

Watch Options:
  --run                Run skill on changes
  --build              Build skill on changes
  --test               Run tests on changes

Replay Options:
  --speed <multiplier> Playback speed (default: 1.0)
  --skip-pauses        Skip long pauses during replay

DevTools Options:
  --port <number>      Debug port (default: 9229)
  --no-open            Don't auto-open Chrome
  --watch              Watch mode for hot reload
  --breakpoints        Show recommended breakpoints

Attach Options:
  --pid <process-id>   Process ID to attach to
  --timeout <secs>     Session timeout (default: 1800)
  --read-only          Read-only mode (no interaction)
  --approved-by <user> Pre-approved by user

Test Options:
  --file <path>        Test file path (JSON)
  --timeout <ms>       Default test timeout

Examples:
  skill-debug debug weather
  skill-debug debug weather --build --record
  skill-debug replay debug-weather-user-123456 --speed 2
  skill-debug devtools weather --port 9230 --breakpoints
  skill-debug attach weather --pid 12345 --timeout 600
  skill-debug test weather --file ./tests/weather.json

Environment Variables:
  NODE_ENV=development  Set environment to development
  SKILL_DEBUG=true      Enable debug mode in skill
  ALLOW_PROD_DEBUG=true Allow production debugging
`;

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    process.exit(0);
  }

  const command = args[0];
  const restArgs = args.slice(1);

  const debugger_ = new SkillDebugger();

  try {
    switch (command) {
      case "debug":
        await runDebug(debugger_, restArgs);
        break;

      case "repl":
        await runREPL(debugger_, restArgs);
        break;

      case "profile":
        await runProfile(debugger_, restArgs);
        break;

      case "watch":
        await runWatch(debugger_, restArgs);
        break;

      case "record":
        await runRecord(restArgs);
        break;

      case "replay":
        await runReplay(restArgs);
        break;

      case "devtools":
        await runDevTools(restArgs);
        break;

      case "attach":
        await runAttach(restArgs);
        break;

      case "test":
        await runTest(restArgs);
        break;

      default:
        EnhancedOutput.error(`Unknown command: ${command}`);
        console.log(HELP);
        process.exit(1);
    }
  } catch (error: any) {
    EnhancedOutput.error(error.message);
    process.exit(1);
  }
}

async function runDebug(debugger_: SkillDebugger, args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      build: { type: "boolean", default: false },
      env: { type: "string", multiple: true },
      cwd: { type: "string" },
      features: { type: "string" },
      run: { type: "boolean", short: "r" },
      exec: { type: "string", short: "e" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  // Check for non-interactive mode
  if (values.run || values.exec) {
    await debugger_.runCommand(skillId, {
      run: values.run,
      exec: values.exec,
      build: values.build,
      args: positionals.slice(1),
    });
    return;
  }

  // Parse environment variables
  const env: Record<string, string> = {};
  if (values.env) {
    for (const e of values.env) {
      const [key, ...valueParts] = e.split("=");
      env[key] = valueParts.join("=");
    }
  }

  await debugger_.debugSkill(skillId, {
    buildIfMissing: values.build,
    env,
    cwd: values.cwd,
    features: values.features?.split(","),
  });
}

async function runREPL(debugger_: SkillDebugger, args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      watch: { type: "boolean", default: false },
      features: { type: "string" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  await debugger_.skillREPL(skillId, {
    watch: values.watch,
    features: values.features?.split(","),
  });
}

async function runProfile(debugger_: SkillDebugger, args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      duration: { type: "string", short: "d" },
      cpu: { type: "boolean", default: false },
      memory: { type: "boolean", default: false },
      output: { type: "string", short: "o" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  await debugger_.profileSkill(skillId, {
    duration: values.duration ? parseInt(values.duration, 10) : 30,
    cpu: values.cpu,
    memory: values.memory,
    output: values.output,
    args: positionals.slice(1),
  });
}

async function runWatch(debugger_: SkillDebugger, args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      run: { type: "boolean", short: "r", default: false },
      build: { type: "boolean", short: "b", default: false },
      test: { type: "boolean", short: "t", default: false },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  await debugger_.watchSkill(skillId, {
    run: values.run,
    build: values.build,
    test: values.test,
  });
}

// =============================================================================
// New Commands: record, replay, devtools, attach, test
// =============================================================================

async function runRecord(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      "save-to-r2": { type: "boolean", default: false },
      output: { type: "string", short: "o" },
      run: { type: "boolean", short: "r", default: false },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  const skillArgs = positionals.slice(1);

  EnhancedOutput.printHeader(`Recording: ${skillId}`);

  const recorder = new DebugRecorder({
    saveToR2: values["save-to-r2"],
    localPath: values.output || "./recordings",
  });

  recorder.startRecording(skillId, process.env.USER || "default");

  // Handle cleanup on exit
  const cleanup = () => {
    if (recorder.isActive()) {
      const session = recorder.stopRecording();
      console.log(`\nSession saved: ${session.sessionId}`);
    }
  };

  process.on("SIGINT", cleanup);
  process.on("SIGTERM", cleanup);

  // Check if we have a TTY for interactive mode
  if (!process.stdin.isTTY || values.run) {
    // Non-interactive mode: run the skill and capture output
    const skillDir = `./skills/${skillId}`;
    const skillJsonExists = await Bun.file(`${skillDir}/skill.json`).exists();

    if (!skillJsonExists) {
      cleanup();
      throw new Error(`Skill not found: ${skillId}`);
    }

    const skillConfig = await Bun.file(`${skillDir}/skill.json`).json();
    console.log(`Running: ${skillConfig.name || skillId} ${skillArgs.join(" ")}`);
    console.log("");

    try {
      const runArgs = skillArgs.length > 0 ? skillArgs : ["--help"];
      const proc = Bun.spawn(["bun", "run", "src/index.ts", ...runArgs], {
        cwd: skillDir,
        env: {
          ...process.env,
          SKILL_ID: skillId,
          NODE_ENV: "development",
        },
        stdout: "pipe",
        stderr: "pipe",
      });

      // Capture stdout
      const stdoutReader = proc.stdout.getReader();
      const stderrReader = proc.stderr.getReader();

      const readStream = async (reader: ReadableStreamDefaultReader<Uint8Array>, isError = false) => {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            recorder.recordOutput(value);
            if (isError) {
              process.stderr.write(value);
            } else {
              process.stdout.write(value);
            }
          }
        }
      };

      await Promise.all([
        readStream(stdoutReader, false),
        readStream(stderrReader, true),
        proc.exited,
      ]);

      const exitCode = await proc.exited;
      recorder.addMarker("exit", { code: exitCode });
    } finally {
      cleanup();
    }
  } else {
    // Interactive mode with TTY
    const debugger_ = new SkillDebugger();

    try {
      await debugger_.debugSkill(skillId, {});
    } finally {
      cleanup();
    }
  }
}

async function runReplay(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      speed: { type: "string", short: "s" },
      "skip-pauses": { type: "boolean", default: false },
      "from-r2": { type: "boolean", default: false },
    },
    allowPositionals: true,
  });

  const sessionId = positionals[0];
  if (!sessionId) {
    throw new Error("Session ID is required");
  }

  EnhancedOutput.printHeader(`Replaying: ${sessionId}`);

  const session = await DebugRecorder.loadSession(sessionId, values["from-r2"]);

  await DebugRecorder.replay(session, {
    speed: values.speed ? parseFloat(values.speed) : 1.0,
    skipPauses: values["skip-pauses"],
  });
}

async function runDevTools(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      port: { type: "string", short: "p" },
      "no-open": { type: "boolean", default: false },
      watch: { type: "boolean", short: "w", default: false },
      breakpoints: { type: "boolean", short: "b", default: false },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`DevTools: ${skillId}`);

  await VisualDebugger.launchDevTools(skillId, {
    port: values.port ? parseInt(values.port, 10) : 9229,
    autoOpen: !values["no-open"],
    watch: values.watch,
    autoBreak: values.breakpoints,
  });
}

async function runAttach(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      pid: { type: "string" },
      timeout: { type: "string", short: "t" },
      "read-only": { type: "boolean", default: false },
      "approved-by": { type: "string" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`Attach: ${skillId}`);

  const timeout = values.timeout ? parseInt(values.timeout, 10) * 1000 : 30 * 60 * 1000;

  if (values.pid) {
    // Direct attach with PID
    const session = await ProductionDebugger.attach(skillId, values.pid, {
      allowProduction: process.env.ALLOW_PROD_DEBUG === "true",
      readOnly: values["read-only"],
      timeout,
    });

    // Wait for session to end
    await new Promise<void>((resolve) => {
      process.on("SIGINT", () => {
        session.detach();
        resolve();
      });
    });
  } else {
    // Use approval workflow
    await ProductionDebugger.safeDebugSession(skillId, {
      userId: process.env.USER || "unknown",
      approvedBy: values["approved-by"],
      timeout,
      readOnly: values["read-only"],
    });
  }
}

async function runTest(args: string[]) {
  const { values, positionals } = parseArgs({
    args,
    options: {
      file: { type: "string", short: "f" },
      timeout: { type: "string", short: "t" },
    },
    allowPositionals: true,
  });

  const skillId = positionals[0];
  if (!skillId) {
    throw new Error("Skill ID is required");
  }

  EnhancedOutput.printHeader(`Testing: ${skillId}`);

  if (values.file) {
    // Run tests from file
    const results = await PTYTestRunner.runTestFile(values.file);

    let allPassed = true;
    for (const result of results) {
      if (result.summary.failed > 0) {
        allPassed = false;
      }
    }

    if (!allPassed) {
      process.exit(1);
    }
  } else {
    // Run basic sanity tests
    const result = await PTYTestRunner.testInteractiveSkill(skillId, [
      {
        name: "Skill loads without error",
        input: "--help",
        expect: /.+/,
        timeout: values.timeout ? parseInt(values.timeout, 10) : 5000,
      },
    ]);

    PTYTestRunner.assertPassed(result);
  }

  EnhancedOutput.success("All tests passed!");
}

// =============================================================================
// Check Bun.Terminal support
// =============================================================================

function checkTerminalSupport(): boolean {
  if (process.platform === "win32") {
    console.log(
      "\x1b[33m!\x1b[0m Note: Bun.Terminal is POSIX-only. Some features may be limited on Windows."
    );
    return false;
  }

  return true;
}

// Run
checkTerminalSupport();
main().catch((error) => {
  EnhancedOutput.error(`Fatal error: ${error.message}`);
  process.exit(1);
});
