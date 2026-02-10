#!/usr/bin/env bun
/**
 * Demo: Handling CTRL+C (SIGINT)
 *
 * https://bun.com/docs/guides/process/ctrl-c
 */

console.log("⌨️  Bun CTRL+C Demo (Hardened)\n");
console.log("=".repeat(74));

const resources: Array<{ name: string; close: () => Promise<void> | void }> = [];
let shuttingDown = false;
let interruptCount = 0;

function registerResource(name: string, close: () => Promise<void> | void) {
  resources.push({ name, close });
}

async function gracefulShutdown(reason: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n🔄 gracefulShutdown(${reason})`);
  console.log(`   step 1/3: stop intake`);
  console.log(`   step 2/3: close ${resources.length} resource(s) in reverse order`);
  for (const resource of resources.slice().reverse()) {
    console.log(`   - closing ${resource.name}`);
    await resource.close();
  }
  console.log(`   step 3/3: exit(${exitCode})`);
  process.exit(exitCode);
}

process.on("SIGINT", () => {
  interruptCount += 1;
  console.log(`\n⚡ SIGINT received (count=${interruptCount})`);
  if (interruptCount >= 2) {
    void gracefulShutdown("SIGINT");
    return;
  }
  console.log("   send SIGINT again to confirm shutdown");
});

process.on("beforeExit", (code) => {
  console.log(`[lifecycle] beforeExit code=${code}`);
});
process.on("exit", (code) => {
  console.log(`[lifecycle] exit code=${code}`);
});

console.log("\n1️⃣ Registering resources");
console.log("-".repeat(74));
let ticks = 0;
const heartbeat = setInterval(() => {
  ticks += 1;
  console.log(`heartbeat ${ticks}`);
}, 120);
registerResource("heartbeat-interval", () => clearInterval(heartbeat));

const worker = Bun.spawn({
  cmd: [
    process.execPath,
    "-e",
    `
      process.on("SIGTERM", () => process.exit(0));
      setInterval(() => console.log("[child] alive"), 200);
    `,
  ],
  stdout: "pipe",
  stderr: "pipe",
});
registerResource("child-process", () => {
  try {
    worker.kill("SIGTERM");
  } catch {
    // already exited
  }
});
void (async () => {
  for await (const chunk of worker.stdout) {
    const line = new TextDecoder().decode(chunk).trim();
    if (line) console.log(line);
  }
})();

console.log("\n2️⃣ Deterministic SIGINT simulation");
console.log("-".repeat(74));
console.log("sending SIGINT now, then a confirming SIGINT in 300ms...");
process.kill(process.pid, "SIGINT");
setTimeout(() => {
  process.kill(process.pid, "SIGINT");
}, 300);
