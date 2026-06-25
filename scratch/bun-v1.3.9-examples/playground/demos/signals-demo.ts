#!/usr/bin/env bun
/**
 * Demo: OS Signals (SIGINT, SIGTERM, etc.)
 *
 * https://bun.com/docs/guides/process/os-signals
 */

console.info("📡 Bun OS Signals Demo (Deterministic Cleanup)\n");
console.info("=".repeat(74));

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

  console.info(`\n🔄 gracefulShutdown(${signal})`);
  console.info(`   step 1/4: freeze intake`);
  console.info(`   step 2/4: forward SIGTERM to ${managedChildren.size} child(ren)`);
  for (const child of managedChildren) {
    try {
      child.kill("SIGTERM");
    } catch {
      // already exited
    }
  }
  console.info("   step 3/4: wait for child drain");
  const drainStart = Date.now();
  while (managedChildren.size > 0 && Date.now() - drainStart < 800) {
    await sleep(25);
  }
  if (managedChildren.size > 0) {
    console.info(`   drain timeout -> force SIGKILL ${managedChildren.size} child(ren)`);
    for (const child of managedChildren) {
      try {
        child.kill("SIGKILL");
      } catch {
        // already exited
      }
    }
  }
  console.info(`   step 4/4: exit(${exitCode})`);
  process.exit(exitCode);
}

process.on("SIGINT", () => void gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => void gracefulShutdown("SIGTERM"));
process.on("SIGHUP", () => void gracefulShutdown("SIGHUP"));

process.on("beforeExit", (code) => {
  console.info(`[lifecycle] beforeExit code=${code}`);
});
process.on("exit", (code) => {
  console.info(`[lifecycle] exit code=${code}`);
});

console.info("\n1️⃣ Parent/Child choreography");
console.info("-".repeat(74));
console.info(`parent pid: ${process.pid}`);
const child = Bun.spawn({
  cmd: [
    process.execPath,
    "-e",
    `
      process.on("SIGTERM", () => {
        console.info("[child] SIGTERM received");
        setTimeout(() => process.exit(0), 60);
      });
      setInterval(() => console.info("[child] tick"), 120);
    `,
  ],
  stdout: "pipe",
  stderr: "pipe",
});
registerChild(child);

const reader = (async () => {
  for await (const chunk of child.stdout) {
    const line = new TextDecoder().decode(chunk).trim();
    if (line) console.info(line);
  }
})();

console.info("\n2️⃣ Deterministic signal simulation");
console.info("-".repeat(74));
console.info("sending SIGTERM to parent in 400ms...");
setTimeout(() => {
  process.kill(process.pid, "SIGTERM");
}, 400);

await Promise.race([
  child.exited,
  sleep(1500),
]);
await reader;
