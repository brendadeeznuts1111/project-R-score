#!/usr/bin/env bun
/**
 * Demo: OS Signals (SIGINT, SIGTERM, etc.)
 *
 * https://bun.com/docs/guides/process/os-signals
 */

console.log("📡 Bun OS Signals Demo (Deterministic Cleanup)\n");
console.log("=".repeat(74));

const managedChildren = new Set<ReturnType<typeof Bun.spawn>>();
let shuttingDown = false;

function registerChild(child: ReturnType<typeof Bun.spawn>) {
  managedChildren.add(child);
  child.exited.finally(() => managedChildren.delete(child));
}

function sleep(ms: number) {
  return Bun.sleep(ms);
}

async function gracefulShutdown(signal: string, exitCode = 0) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n🔄 gracefulShutdown(${signal})`);
  console.log(`   step 1/4: freeze intake`);
  console.log(`   step 2/4: forward SIGTERM to ${managedChildren.size} child(ren)`);
  for (const child of managedChildren) {
    try {
      child.kill("SIGTERM");
    } catch {
      // already exited
    }
  }
  console.log("   step 3/4: wait for child drain");
  const drainStart = Date.now();
  while (managedChildren.size > 0 && Date.now() - drainStart < 800) {
    await sleep(25);
  }
  if (managedChildren.size > 0) {
    console.log(`   drain timeout -> force SIGKILL ${managedChildren.size} child(ren)`);
    for (const child of managedChildren) {
      try {
        child.kill("SIGKILL");
      } catch {
        // already exited
      }
    }
  }
  console.log(`   step 4/4: exit(${exitCode})`);
  process.exit(exitCode);
}

process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGHUP", () => void gracefulShutdown("SIGHUP"));

process.on("beforeExit", (code) => {
  console.log(`[lifecycle] beforeExit code=${code}`);
});
process.on("exit", (code) => {
  console.log(`[lifecycle] exit code=${code}`);
});

console.log("\n1️⃣ Parent/Child choreography");
console.log("-".repeat(74));
console.log(`parent pid: ${process.pid}`);
const child = Bun.spawn({
  cmd: [
    process.execPath,
    "-e",
    `
      process.on("SIGTERM", () => {
        console.log("[child] SIGTERM received");
        setTimeout(() => process.exit(0), 60);
      });
      setInterval(() => console.log("[child] tick"), 120);
    `,
  ],
  stdout: "pipe",
  stderr: "pipe",
});
registerChild(child);

const reader = (async () => {
  for await (const chunk of child.stdout) {
    const line = new TextDecoder().decode(chunk).trim();
    if (line) console.log(line);
  }
})();

console.log("\n2️⃣ Deterministic signal simulation");
console.log("-".repeat(74));
console.log("sending SIGTERM to parent in 400ms...");
setTimeout(() => {
  process.kill(process.pid, "SIGTERM");
}, 400);

await Promise.race([
  child.exited,
  sleep(1500),
]);
await reader;
