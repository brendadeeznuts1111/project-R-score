#!/usr/bin/env bun
/**
 * Demo: Spawn Child Processes (Hardened Lifecycle)
 *
 * https://bun.com/docs/guides/process/spawn
 */

type ManagedResult = {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  timedOut: boolean;
};

const managedChildren = new Set<ReturnType<typeof Bun.spawn>>();

function registerChild(child: ReturnType<typeof Bun.spawn>) {
  managedChildren.add(child);
  child.exited.finally(() => {
    managedChildren.delete(child);
  });
}

function killAllChildren(signal: "SIGTERM" | "SIGKILL") {
  for (const child of managedChildren) {
    try {
      child.kill(signal);
    } catch {
      // Child may already be gone.
    }
  }
}

for (const sig of ["SIGINT", "SIGTERM"] as const) {
  process.on(sig, () => {
    console.info(`\n[manager] ${sig} received -> forwarding SIGTERM to ${managedChildren.size} child(ren)`);
    killAllChildren("SIGTERM");
  });
}

async function spawnManaged(cmd: string[], timeoutMs = 1000): Promise<ManagedResult> {
  const child = Bun.spawn({
    cmd,
    stdout: "pipe",
    stderr: "pipe",
  });
  registerChild(child);

  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      child.kill("SIGTERM");
    } catch {
      // already exited
    }
    setTimeout(() => {
      try {
        child.kill("SIGKILL");
      } catch {
        // already exited
      }
    }, 200);
  }, timeoutMs);

  const [stdout, stderr, exitCode] = await Promise.all([
    child.stdout.text(),
    child.stderr.text(),
    child.exited,
  ]);
  clearTimeout(timer);
  return { stdout, stderr, exitCode, timedOut };
}

function bunEval(code: string): string[] {
  return [process.execPath, "-e", code];
}

console.info("🔧 Bun Spawn Demo (Process Lifecycle Hardening)\n");
console.info("=".repeat(74));

console.info("\n1️⃣ Basic Spawn + Reap");
console.info("-".repeat(74));
{
  const result = await spawnManaged(bunEval(`console.info("Hello from child process!")`), 1200);
  console.info("stdout:", result.stdout.trim());
  console.info("exitCode:", result.exitCode);
}

console.info("\n2️⃣ Spawn with Scoped Env + cwd");
console.info("-".repeat(74));
{
  const child = Bun.spawn({
    cmd: bunEval(`console.info(process.cwd()); console.info(process.env.CUSTOM_VAR || "missing")`),
    cwd: "/tmp",
    env: { ...process.env, CUSTOM_VAR: "hello" },
    stdout: "pipe",
    stderr: "pipe",
  });
  registerChild(child);
  const [stdout, exitCode] = await Promise.all([child.stdout.text(), child.exited]);
  const lines = stdout.trim().split("\n");
  console.info("cwd:", lines[0] || "(none)");
  console.info("CUSTOM_VAR:", lines[1] || "(none)");
  console.info("exitCode:", exitCode);
}

console.info("\n3️⃣ Stream Child Output");
console.info("-".repeat(74));
{
  const child = Bun.spawn({
    cmd: bunEval(`
      let i = 0;
      const timer = setInterval(() => {
        i++;
        console.info("tick:" + i);
        if (i >= 3) {
          clearInterval(timer);
          process.exit(0);
        }
      }, 50);
    `),
    stdout: "pipe",
    stderr: "pipe",
  });
  registerChild(child);
  for await (const chunk of child.stdout) {
    console.info("stream >", new TextDecoder().decode(chunk).trim());
  }
  console.info("exitCode:", await child.exited);
}

console.info("\n4️⃣ Timeout + Forced Termination");
console.info("-".repeat(74));
{
  const longRunning = await spawnManaged(
    bunEval(`
      setInterval(() => {
        console.info("still-running");
      }, 100);
    `),
    250
  );
  console.info("timedOut:", longRunning.timedOut);
  console.info("exitCode:", longRunning.exitCode);
}

console.info("\n5️⃣ IPC Handshake");
console.info("-".repeat(74));
{
  let child: ReturnType<typeof Bun.spawn>;
  child = Bun.spawn({
    cmd: bunEval(`
      process.send?.({ type: "ready", pid: process.pid });
      process.on("message", (msg) => {
        process.send?.({ type: "echo", payload: msg, pid: process.pid });
        process.exit(0);
      });
    `),
    ipc(message) {
      console.info("ipc <", JSON.stringify(message));
      if (message && (message as any).type === "ready") {
        child.send({ ping: "pong" });
      }
    },
  });
  registerChild(child);
  console.info("exitCode:", await child.exited);
}

console.info("\n✅ Spawn demo complete (no orphan children)");
console.info("Active child count:", managedChildren.size);
