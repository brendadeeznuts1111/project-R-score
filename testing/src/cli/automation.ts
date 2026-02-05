#!/usr/bin/env bun
/**
 * 🤖 INTERACTIVE SHELL AUTOMATION
 * Demonstrates Recipe 4: Automating interactive shell sessions using Bun.Terminal
 */

export async function automateShell(commands: string[]) {
  console.log("🚀 Starting automated shell session...");

  const proc = Bun.spawn(["bash", "-i"], { // Interactive mode
    terminal: {
      data(term, data) {
        const output = new TextDecoder().decode(data);
        process.stdout.write(output);
        
        // Send next command when prompt appears
        if (output.includes("$ ") || output.includes("# ")) {
          const cmd = commands.shift();
          if (cmd) {
            console.log(`\n\x1b[34m[AUTOMATION] Sending command: ${cmd}\x1b[0m`);
            setTimeout(() => term.write(cmd + "\n"), 100);
          } else {
            // No more commands, but let the user take over or exit
            // For this demo, we'll exit after 1 second if no commands left
             setTimeout(() => {
               if (commands.length === 0) {
                 term.write("exit\n");
               }
             }, 1000);
          }
        }
      },
    },
  });
  
  // Handle Ctrl+C
  process.on("SIGINT", () => {
    console.log("\n\x1b[31m[AUTOMATION] Interrupted\x1b[0m");
    proc.terminal.write("\x03");
  });
  
  await proc.exited;
  console.log("✅ Automation session complete.");
}

if (import.meta.main) {
  const demoCommands = [
    "echo 'Hello from Bun 1.2!'",
    "ls -la",
    "whoami",
    "echo 'Automation finished!'"
  ];
  await automateShell(demoCommands);
}
