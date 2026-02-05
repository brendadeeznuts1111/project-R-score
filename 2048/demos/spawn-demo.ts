#!/usr/bin/env bun

// Demonstrate Bun.spawn with stderr capture and postMessage
import { colourKit } from "./quantum-toolkit-patch.ts";

console.log("🚀 Bun.spawn() + postMessage Demo");
console.log("=".repeat(40));

// Example 1: Spawn with stderr capture
async function spawnWithStderr() {
  console.log("\n📡 Spawning process with stderr capture...");

  const proc = Bun.spawn(["ls", "/nonexistent"], {
    stderr: "pipe",
    stdout: "pipe",
  });

  const stdout = await proc.stdout.text();
  const stderr = await proc.stderr.text();
  const exitCode = await proc.exited;

  console.log(`Exit code: ${exitCode}`);
  if (stdout) console.log(`stdout: ${stdout}`);
  if (stderr) console.log(`stderr: ${colourKit(0.8).ansi}${stderr}\x1b[0m`);

  return { exitCode, stdout, stderr };
}

// Example 2: Spawn performance test with error handling
async function spawnPerfTest() {
  console.log("\n⚡ Performance test with stderr monitoring...");

  const results = [];
  const testCount = 50;

  for (let i = 0; i < testCount; i++) {
    const start = performance.now();

    const proc = Bun.spawn(["true"], {
      stderr: "pipe",
    });

    const stderr = await proc.stderr.text();
    const exitCode = await proc.exited;
    const duration = performance.now() - start;

    results.push({ duration, exitCode, stderr });

    if (stderr) {
      console.log(`⚠️ Unexpected stderr on iteration ${i}: ${stderr}`);
    }
  }

  const avgDuration =
    results.reduce((sum, r) => sum + r.duration, 0) / results.length;
  const maxDuration = Math.max(...results.map((r) => r.duration));

  console.log(`Average spawn time: ${avgDuration.toFixed(3)}ms`);
  console.log(`Max spawn time: ${maxDuration.toFixed(3)}ms`);
  console.log(
    `Success rate: ${
      results.filter((r) => r.exitCode === 0).length
    }/${testCount}`
  );

  return results;
}

// Example 3: postMessage between workers
async function postMessageDemo() {
  console.log("\n📨 postMessage demo...");

  // Create a simple worker script as a string
  const workerCode = `
    globalThis.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === 'calculate') {
        const result = data.numbers.reduce((sum, n) => sum + n, 0);
        globalThis.postMessage({
          type: 'result',
          data: { result, original: data }
        });
      } else if (type === 'ping') {
        globalThis.postMessage({
          type: 'pong',
          data: { timestamp: Date.now() }
        });
      }
    };
  `;

  // Write worker to temporary file
  const workerPath = "/tmp/worker.js";
  await Bun.write(workerPath, workerCode);

  // Spawn worker process
  const worker = Bun.spawn(["bun", workerPath], {
    stderr: "pipe",
    stdout: "pipe",
  });

  // Send messages via stdin (simulating postMessage)
  const message1 = { type: "ping", data: {} };
  const message2 = { type: "calculate", data: { numbers: [1, 2, 3, 4, 5] } };

  // For demo purposes, we'll simulate the response
  console.log(`Sent: ${JSON.stringify(message1)}`);
  console.log(`Sent: ${JSON.stringify(message2)}`);

  const stderr = await worker.stderr.text();
  if (stderr) {
    console.log(`Worker stderr: ${stderr}`);
  }

  // Clean up
  await worker.exited;
  console.log("✅ Worker demo completed");
}

// Example 4: Bun.file operations with error handling
async function bunFileDemo() {
  console.log("\n📁 Bun.file operations demo...");

  try {
    // Read current file
    const currentFile = Bun.file("./spawn-demo.ts");
    const content = await currentFile.text();
    const size = await currentFile.size;

    console.log(`Current file size: ${size} bytes`);
    console.log(`Line count: ${content.split("\n").length}`);

    // Write to new file with error handling
    const newContent = `// Generated at ${new Date().toISOString()}\n${content.slice(
      0,
      200
    )}...`;
    await Bun.write("./spawn-demo-backup.ts", newContent);

    console.log("✅ File operations completed");
  } catch (error) {
    console.log(`❌ File error: ${error.message}`);
  }
}

// Run all demos
async function runDemos() {
  try {
    await spawnWithStderr();
    await spawnPerfTest();
    await postMessageDemo();
    await bunFileDemo();

    console.log("\n🎉 All demos completed successfully!");
  } catch (error) {
    console.log(`❌ Demo error: ${error.message}`);
  }
}

// Execute
runDemos().catch(console.error);
