/**
 * 🧪 PTY VERIFICATION SCRIPT (Bun v1.3.5)
 * Spawns a shell and runs commands to verify interactive terminal support
 */

import { PtyRunner } from "../utils/pty-runner";

console.info("🔍 Verifying Bun.Terminal PTY Support");
console.info("======================================");

// Simulation: Run 'ls -G' (colored) and 'echo'
const commands = ["ls -G", "echo 'PTY TEST SUCCESSFUL'", "exit"];

const proc = Bun.spawn(["/bin/zsh"], {
  terminal: {
    cols: 100,
    rows: 30,
    data(terminal, data) {
      const output = data.toString();
      process.stdout.write(output);

      // Simple auto-responder for prompts
      if (output.includes("%")) {
        const cmd = commands.shift();
        if (cmd) {
          terminal.write(cmd + "\n");
        }
      }
    },
  },
});

await proc.exited;
console.info("\n✅ PTY session finished.");
