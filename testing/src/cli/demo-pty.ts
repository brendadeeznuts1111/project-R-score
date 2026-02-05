#!/usr/bin/env bun
/**
 * 🎨 Advanced PTY Demo
 * Visualizes the power of Bun.Terminal
 */

await using terminal = new Bun.Terminal({
  cols: 80,
  rows: 24,
  data(term, data) {
    process.stdout.write(new TextDecoder().decode(data));
  }
});

// Progress bar in PTY
terminal.write(`\x1b[2J\x1b[H`);  // Clear screen
terminal.write(`\x1b[32m🚀 Dev HQ Loading...\x1b[0m\n`);

for (let i = 0; i <= 100; i += 10) {
  const bar = "█".repeat(i / 5) + "░".repeat(20 - i / 5);
  terminal.write(`\r\x1b[32m[\x1b[0m${bar}\x1b[32m]\x1b[0m ${i}%`);
  await Bun.sleep(100);
}

terminal.write("\n\x1b[32m✅ Complete!\x1b[0m\n");
terminal.write("\x1b[90mPress any key to exit...\x1b[0m");

process.stdin.setRawMode(true);
for await (const chunk of process.stdin) {
  process.exit(0);
}
