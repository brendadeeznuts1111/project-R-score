#!/usr/bin/env bun

// Simple Bun.spawn demo with stderr capture
console.info("🚀 Bun.spawn() stderr Demo");

// Demo 1: Capture stderr from failing command
async function demoStderr() {
  console.info("\n📡 Testing stderr capture...");

  const proc = Bun.spawn(["ls", "/nonexistent"], {
    stderr: "pipe",
  });

  const stderr = await proc.stderr.text();
  const exitCode = await proc.exited;

  console.info(`Exit code: ${exitCode}`);
  console.info(`Stderr: ${stderr}`);
}

// Demo 2: Performance test with error handling
async function demoPerf() {
  console.info("\n⚡ Performance test...");

  const start = performance.now();

  const proc = Bun.spawn(["true"], {
    stderr: "pipe",
  });

  await proc.stderr.text();
  await proc.exited;

  const duration = performance.now() - start;
  console.info(`Spawn time: ${duration.toFixed(3)}ms`);
}

// Run demos
await demoStderr();
await demoPerf();

console.info("\n✅ Demo complete!");
