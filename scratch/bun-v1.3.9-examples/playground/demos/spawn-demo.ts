#!/usr/bin/env bun
/**
 * Demo: Spawn Child Processes
 * 
 * https://bun.com/docs/guides/process/spawn
 */

console.log("🔧 Bun Spawn Demo\n");
console.log("=".repeat(70));

// 1. Basic spawn
console.log("\n1️⃣ Basic Spawn");
console.log("-".repeat(70));

const proc1 = Bun.spawn(["echo", "Hello from child process!"]);
const output1 = await proc1.stdout.text();
console.log("Output:", output1.trim());
console.log("Exit code:", await proc1.exited);

// 2. Spawn with options
console.log("\n2️⃣ Spawn with Options");
console.log("-".repeat(70));

const proc2 = Bun.spawn({
  cmd: ["pwd"],
  cwd: "/tmp",
  env: { ...process.env, CUSTOM_VAR: "hello" },
});

const output2 = await proc2.stdout.text();
console.log("Working directory: /tmp");
console.log("Output:", output2.trim());

// 3. Read stdout and stderr
console.log("\n3️⃣ Reading stdout and stderr");
console.log("-".repeat(70));

const proc3 = Bun.spawn({
  cmd: ["ls", "-la", "/tmp"],
  stdout: "pipe",
  stderr: "pipe",
});

const [stdout3, stderr3, exitCode3] = await Promise.all([
  proc3.stdout.text(),
  proc3.stderr.text(),
  proc3.exited,
]);

console.log("stdout length:", stdout3.length, "bytes");
console.log("stderr length:", stderr3.length, "bytes");
console.log("Exit code:", exitCode3);

// 4. Stream output
console.log("\n4️⃣ Streaming Output");
console.log("-".repeat(70));

const proc4 = Bun.spawn({
  cmd: ["echo", "line1\nline2\nline3"],
  stdout: "pipe",
});

console.log("Streaming lines:");
for await (const line of proc4.stdout) {
  console.log("  →", new TextDecoder().decode(line).trim());
}

// 5. Write to stdin
console.log("\n5️⃣ Writing to Child stdin");
console.log("-".repeat(70));

const proc5 = Bun.spawn({
  cmd: ["cat"],
  stdin: "pipe",
  stdout: "pipe",
});

const writer = proc5.stdin.getWriter();
await writer.write(new TextEncoder().encode("Hello from parent!"));
await writer.close();

const output5 = await proc5.stdout.text();
console.log("Child received:", output5.trim());

// 6. Exit handling
console.log("\n6️⃣ Exit Handler");
console.log("-".repeat(70));

const proc6 = Bun.spawn({
  cmd: ["sleep", "0.5"],
  onExit(proc, exitCode, signalCode, error) {
    console.log(`Process exited with code: ${exitCode}`);
    console.log(`Signal: ${signalCode || "none"}`);
  },
});

await proc6.exited;

// 7. Kill a process
console.log("\n7️⃣ Killing a Process");
console.log("-".repeat(70));

const proc7 = Bun.spawn(["sleep", "10"]);
console.log("Spawned long-running process (PID will be shown if available)");

// Kill after short delay
setTimeout(() => {
  console.log("Killing process...");
  proc7.kill("SIGTERM");
}, 100);

const exit7 = await proc7.exited;
console.log("Killed process exit code:", exit7);

console.log("\n✅ Spawn demo complete!");
console.log("\n💡 Common patterns:");
console.log("   Bun.spawn(['cmd', 'arg'])           - Simple spawn");
console.log("   Bun.spawn({ cmd, cwd, env })        - With options");
console.log("   proc.stdout.text()                  - Read output");
console.log("   proc.kill('SIGTERM')                - Kill process");
console.log("   await proc.exited                   - Wait for exit");
