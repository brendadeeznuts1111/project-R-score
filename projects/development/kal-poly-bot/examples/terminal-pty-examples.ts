#!/usr/bin/env bun
/**
 * Bun Terminal API (PTY) Examples
 *
 * Demonstrates various PTY use cases including:
 * - Basic shell interaction
 * - Interactive programs (vim, htop, nano)
 * - Reusable terminal instances
 * - Programmatic terminal control
 */

import { spawn } from "bun";
import type {
  SpawnProcessWithTerminal,
  TerminalSpawnOptions,
} from "../src/types/bun-terminal";

// Extend Bun types temporarily
declare global {
  function spawn(
    args: string[],
    options: TerminalSpawnOptions
  ): SpawnProcessWithTerminal;
}

/**
 * Example 1: Basic PTY Shell with Command Sequence
 */
async function basicShellExample() {
  console.info("🔧 Example 1: Basic PTY Shell with Command Sequence");

  const commands = [
    "echo 'Welcome to Bun PTY!'",
    "pwd",
    "ls -la",
    "whoami",
    "date",
    "exit",
  ];

  const proc = spawn(["bash"], {
    terminal: {
      cols: 80,
      rows: 24,
      data(terminal: TerminalInstance, data: Uint8Array) {
        const output = new TextDecoder().decode(data);
        console.info("[OUTPUT]", output.trim());

        // Detect prompt and send next command
        if (output.includes("$ ") || output.includes("# ")) {
          const cmd = commands.shift();
          if (cmd) {
            console.info("[INPUT]", cmd);
            terminal.write(cmd + "\n");
          }
        }
      },
    },
  });

  await proc.exited;
  proc.terminal?.close();
  console.info("✅ Basic shell example completed\n");
}

/**
 * Example 2: Interactive Program (vim)
 */
async function interactiveVimExample() {
  console.info("🔧 Example 2: Interactive Program (vim)");

  // Create a temporary file for vim to edit
  const tempFile = "/tmp/bun-pty-demo.txt";
  await Bun.write(
    tempFile,
    "Welcome to Bun PTY!\nEdit this file with vim.\nPress :q to exit."
  );

  const proc = spawn(["vim", tempFile], {
    terminal: {
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 24,
      data(terminal: TerminalInstance, data: Uint8Array) {
        const output = new TextDecoder().decode(data);

        // Only print non-control characters to avoid noise
        if (output.length > 0 && output.charCodeAt(0) >= 32) {
          console.info("[VIM]", output.trim());
        }
      },
    },
  });

  // Simulate user interaction
  setTimeout(() => {
    console.info("[INPUT] Moving cursor down");
    proc.terminal?.write("\x1b[B"); // Down arrow
  }, 1000);

  setTimeout(() => {
    console.info("[INPUT] Inserting text");
    proc.terminal?.write("iThis was added programmatically!\x1b"); // Insert mode, add text, escape
  }, 1500);

  setTimeout(() => {
    console.info("[INPUT] Saving and quitting");
    proc.terminal?.write(":wq\n"); // Save and quit
  }, 2000);

  await proc.exited;
  proc.terminal?.close();

  // Show the edited file
  const editedContent = await Bun.file(tempFile).text();
  console.info("Edited file content:");
  console.info(editedContent);
  console.info("✅ Interactive vim example completed\n");
}

/**
 * Example 3: System Monitor (htop)
 */
async function htopExample() {
  console.info("🔧 Example 3: System Monitor (htop)");

  const proc = spawn(["htop"], {
    terminal: {
      cols: 80,
      rows: 30,
      data(terminal: TerminalInstance, data: Uint8Array) {
        const output = new TextDecoder().decode(data);

        // Filter out most control sequences for cleaner output
        // eslint-disable-next-line no-control-regex
        const cleanOutput = output.replace(/[\x1b\x00-\x1F]/g, "");
        if (cleanOutput.trim()) {
          console.info("[HTOP]", cleanOutput.trim());
        }
      },
    },
  });

  // Let htop run for 5 seconds, then quit
  setTimeout(() => {
    console.info("[INPUT] Quitting htop");
    proc.terminal?.write("q"); // Quit htop
  }, 5000);

  await proc.exited;
  proc.terminal?.close();
  console.info("✅ htop example completed\n");
}

/**
 * Example 4: Reusable Terminal Instance
 */
async function reusableTerminalExample() {
  console.info("🔧 Example 4: Reusable Terminal Instance");

  // Create a reusable terminal
  await using terminal = new Bun.Terminal({
    cols: 80,
    rows: 24,
    data(_term: TerminalInstance, _data: Uint8Array) {
      const output = new TextDecoder().decode(_data);
      console.info("[REUSABLE]", output.trim());
    },
  });

  // Spawn multiple commands on the same terminal
  console.info("[CMD] Running echo command");
  const proc1 = spawn(["echo", "First command on reusable terminal"], {
    terminal,
  });
  await proc1.exited;

  console.info("[CMD] Running pwd command");
  const proc2 = spawn(["pwd"], { terminal });
  await proc2.exited;

  console.info("[CMD] Running date command");
  const proc3 = spawn(["date"], { terminal });
  await proc3.exited;

  // Terminal auto-closes here due to await using
  console.info("✅ Reusable terminal example completed\n");
}

/**
 * Example 5: Terminal Resize Demo
 */
async function terminalResizeExample() {
  console.info("🔧 Example 5: Terminal Resize Demo");

  const proc = spawn(["bash"], {
    terminal: {
      cols: 40,
      rows: 10,
      data(terminal: TerminalInstance, data: Uint8Array) {
        const output = new TextDecoder().decode(data);
        console.info("[RESIZE]", output.trim());

        if (output.includes("$ ")) {
          terminal.write("echo 'Current terminal size:'\\n");
        }
      },
    },
  });

  // Resize after 2 seconds
  setTimeout(() => {
    console.info("[ACTION] Resizing terminal to 80x24");
    proc.terminal?.resize(80, 24);
    proc.terminal?.write("echo 'Terminal resized!'\\n");
  }, 2000);

  setTimeout(() => {
    proc.terminal?.write("exit\n");
  }, 4000);

  await proc.exited;
  proc.terminal?.close();
  console.info("✅ Terminal resize example completed\n");
}

/**
 * Example 6: Interactive Text Editor (nano)
 */
async function nanoExample() {
  console.info("🔧 Example 6: Interactive Text Editor (nano)");

  const tempFile = "/tmp/bun-nano-demo.txt";
  await Bun.write(tempFile, "Original content\n");

  const proc = spawn(["nano", tempFile], {
    terminal: {
      cols: 80,
      rows: 24,
      data(terminal: TerminalInstance, data: Uint8Array) {
        const output = new TextDecoder().decode(data);

        // Filter nano's interface noise
        if (output.length > 0 && output.charCodeAt(0) >= 32) {
          console.info("[NANO]", output.trim());
        }
      },
    },
  });

  // Simulate nano interaction
  setTimeout(() => {
    console.info("[INPUT] Adding text");
    proc.terminal?.write("This text was added programmatically via Bun PTY!");
  }, 1000);

  setTimeout(() => {
    console.info("[INPUT] Saving and exiting");
    proc.terminal?.write("\x17"); // Ctrl+X (exit)
    setTimeout(() => {
      proc.terminal?.write("y"); // Confirm save
      setTimeout(() => {
        proc.terminal?.write("\n"); // Confirm filename
      }, 500);
    }, 500);
  }, 2000);

  await proc.exited;
  proc.terminal?.close();

  // Show the edited file
  const editedContent = await Bun.file(tempFile).text();
  console.info("Final file content:");
  console.info(editedContent);
  console.info("✅ Nano example completed\n");
}

/**
 * Example 7: Process Monitoring
 */
async function processMonitoringExample() {
  console.info("🔧 Example 7: Process Monitoring");

  const proc = spawn(["bash"], {
    terminal: {
      cols: 80,
      rows: 24,
      data(terminal: TerminalInstance, data: Uint8Array) {
        const output = new TextDecoder().decode(data);
        console.info("[MONITOR]", output.trim());

        if (output.includes("$ ")) {
          // Run various monitoring commands
          const commands = [
            "echo '=== System Information ==='",
            "uname -a",
            "echo '=== Memory Usage ==='",
            "free -h",
            "echo '=== Disk Usage ==='",
            "df -h",
            "echo '=== Process List ==='",
            "ps aux | head -10",
            "exit",
          ];

          commands.forEach((cmd, index) => {
            setTimeout(() => {
              console.info("[CMD]", cmd);
              terminal.write(cmd + "\n");
            }, index * 1000);
          });
        }
      },
    },
  });

  await proc.exited;
  proc.terminal?.close();
  console.info("✅ Process monitoring example completed\n");
}

/**
 * Run all examples
 */
async function runAllExamples() {
  console.info("🚀 Starting Bun Terminal API (PTY) Examples\n");

  try {
    await basicShellExample();
    await interactiveVimExample();
    await htopExample();
    await reusableTerminalExample();
    await terminalResizeExample();
    await nanoExample();
    await processMonitoringExample();

    console.info("🎉 All examples completed successfully!");
  } catch (error) {
    console.error("❌ Error running examples:", error);
  }
}

// Run examples if this file is executed directly
if (import.meta.main) {
  runAllExamples();
}

export {
  basicShellExample,
  htopExample,
  interactiveVimExample,
  nanoExample,
  processMonitoringExample,
  reusableTerminalExample,
  terminalResizeExample,
};
