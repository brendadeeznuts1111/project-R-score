/**
 * PTY TUI Helpers
 *
 * Terminal UI for interactive project shell (Bun.Terminal, header, spawn).
 * Used when running the dashboard in TUI mode and opening a shell via Enter/i.
 */

import { spawn, Terminal } from "bun";
import { c, getBoxWidth, padRight, truncateToWidth } from "./utils/tui";

function createTerminal(): InstanceType<typeof Terminal> {
  return new Terminal({
    cols: process.stdout.columns || 80,
    rows: (process.stdout.rows || 24) - 6,
    data(term, data) {
      process.stdout.write(data);
    },
  });
}

function drawPTYHeader(projectName: string): void {
  process.stdout.write("\x1b[2J\x1b[H");
  const shellTitle = `${c.bold}SHELL: ${truncateToWidth(projectName, 60)}${c.reset}`;
  const shellHint = `${c.dim}Type 'exit' or Ctrl+D to return to dashboard${c.reset}`;

  console.log(`${c.cyan}╔${"═".repeat(getBoxWidth())}╗${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  ${padRight(shellTitle, getBoxWidth() - 2)}${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}║${c.reset}  ${padRight(shellHint, getBoxWidth() - 2)}${c.cyan}║${c.reset}`);
  console.log(`${c.cyan}╚${"═".repeat(getBoxWidth())}╝${c.reset}\n`);
}

/**
 * Open an interactive shell in a project directory.
 * Uses Bun.Terminal + spawn; awaits until user exits (Ctrl+D / exit).
 */
export async function openProjectShell(projectName: string, projectPath: string): Promise<void> {
  if (!process.stdin.isTTY) {
    console.log(`${c.err}Cannot open shell in non-TTY mode${c.reset}`);
    return;
  }

  await using terminal = createTerminal();

  terminal.resize(
    process.stdout.columns || 80,
    (process.stdout.rows || 24) - 6
  );

  drawPTYHeader(projectName);

  const resizeHandler = () => {
    terminal.resize(
      process.stdout.columns || 80,
      (process.stdout.rows || 24) - 6
    );
  };
  process.stdout.on("resize", resizeHandler);

  const proc = spawn(["bash", "--login"], {
    terminal,
    cwd: projectPath,
    env: { ...process.env, TERM: "xterm-256color" },
  });

  for await (const chunk of process.stdin) {
    if (proc.pid) {
      terminal.write(chunk);
    }
    if (!proc.pid || proc.exitCode !== null) break;
  }

  process.stdout.off("resize", resizeHandler);
}
