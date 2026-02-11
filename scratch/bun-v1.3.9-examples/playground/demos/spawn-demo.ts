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
    console.log(`\n[manager] ${sig} received -> forwarding SIGTERM to ${managedChildren.size} child(ren)`);
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

console.log("🔧 Bun Spawn Demo (Process Lifecycle Hardening)\n");
console.log("=".repeat(74));

console.log("\n1️⃣ Basic Spawn + Reap");
console.log("-".repeat(74));
{
  const result = await spawnManaged(bunEval(`console.log("Hello from child process!")`), 1200);
  console.log("stdout:", result.stdout.trim());
  console.log("exitCode:", result.exitCode);
}

console.log("\n2️⃣ Spawn with Scoped Env + cwd");
console.log("-".repeat(74));
{
  const child = Bun.spawn({
    cmd: bunEval(`console.log(process.cwd()); console.log(process.env.CUSTOM_VAR || "missing")`),
    cwd: "/tmp",
    env: { ...process.env, CUSTOM_VAR: "hello" },
    stdout: "pipe",
    stderr: "pipe",
  });
  registerChild(child);
  const [stdout, exitCode] = await Promise.all([child.stdout.text(), child.exited]);
  const lines = stdout.trim().split("\n");
  console.log("cwd:", lines[0] || "(none)");
  console.log("CUSTOM_VAR:", lines[1] || "(none)");
  console.log("exitCode:", exitCode);
}

console.log("\n3️⃣ Stream Child Output");
console.log("-".repeat(74));
{
  const child = Bun.spawn({
    cmd: bunEval(`
      let i = 0;
      const timer = setInterval(() => {
        i++;
        console.log("tick:" + i);
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
    console.log("stream >", new TextDecoder().decode(chunk).trim());
  }
  console.log("exitCode:", await child.exited);
}

console.log("\n4️⃣ Timeout + Forced Termination");
console.log("-".repeat(74));
{
  const longRunning = await spawnManaged(
    bunEval(`
      setInterval(() => {
        console.log("still-running");
      }, 100);
    `),
    250
  );
  console.log("timedOut:", longRunning.timedOut);
  console.log("exitCode:", longRunning.exitCode);
}

console.log("\n5️⃣ IPC Handshake");
console.log("-".repeat(74));
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
      console.log("ipc <", JSON.stringify(message));
      if (message && (message as any).type === "ready") {
        child.send({ ping: "pong" });
      }
    },
  });
  registerChild(child);
  console.log("exitCode:", await child.exited);
}

console.log("\n✅ Spawn demo complete (no orphan children)");
console.log("Active child count:", managedChildren.size);
