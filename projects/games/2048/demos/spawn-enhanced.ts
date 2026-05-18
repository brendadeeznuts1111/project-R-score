#!/usr/bin/env bun

// Enhanced spawn demo with postMessage and Bun.file operations
import { colourKit, pad, sse } from "./quantum-toolkit-patch.ts";

console.info(colourKit(0.8).ansi + "🚀 Enhanced Bun.spawn() Demo" + "\x1b[0m");
console.info("=".repeat(50));

// Demo 1: Advanced stderr capture with parsing
async function advancedStderrDemo() {
  console.info("\n📡 Advanced stderr capture...");

  const commands = [
    { cmd: ["ls", "/nonexistent"], desc: "Nonexistent path" },
    { cmd: ["cat", "/invalid/file"], desc: "Invalid file" },
    { cmd: ["grep", "pattern", "/dev/null"], desc: "Empty grep" },
  ];

  for (const { cmd, desc } of commands) {
    const proc = Bun.spawn(cmd, { stderr: "pipe" });
    const stderr = await proc.stderr.text();
    const exitCode = await proc.exited;

    const color = exitCode === 0 ? colourKit(0.2) : colourKit(0.8);
    console.info(`  ${pad(desc, 20)}: ${color.ansi}Exit ${exitCode}\x1b[0m`);
    if (stderr) console.info(`    Stderr: ${stderr.trim()}`);
  }
}

// Demo 2: Performance comparison with metrics
async function performanceComparison() {
  console.info("\n⚡ Performance comparison...");

  const tests = [
    { name: "true", cmd: ["true"] },
    { name: "echo", cmd: ["echo", "hello"] },
    { name: "date", cmd: ["date"] },
  ];

  console.info("┌──────┬─────────┬──────────┬──────────┐");
  console.info("│ Test │ Count  │ Avg (ms) │ Max (ms) │");
  console.info("├──────┼─────────┼──────────┼──────────┤");

  for (const { name, cmd } of tests) {
    const times = [];
    const iterations = 20;

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      const proc = Bun.spawn(cmd, { stderr: "pipe" });
      await proc.stderr.text();
      await proc.exited;
      times.push(performance.now() - start);
    }

    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const max = Math.max(...times);

    console.info(
      `│ ${pad(name, 4)} │ ${pad(iterations.toString(), 7)} │ ${pad(
        avg.toFixed(2),
        8
      )} │ ${pad(max.toFixed(2), 8)} │`
    );
  }

  console.info("└──────┴─────────┴──────────┴──────────┘");
}

// Demo 3: Simulated postMessage with worker
async function postMessageDemo() {
  console.info("\n📨 postMessage simulation...");

  // Create worker script
  const workerScript = `
    globalThis.onmessage = (event) => {
      const { id, data } = event.data;
      const result = {
        id,
        timestamp: Date.now(),
        calculated: data.numbers ? data.numbers.reduce((a, b) => a + b, 0) : 0
      };
      console.info(JSON.stringify(result));
    };
  `;

  const workerFile = "/tmp/worker.js";
  await Bun.write(workerFile, workerScript);

  // Spawn worker
  const worker = Bun.spawn(["bun", workerFile], {
    stderr: "pipe",
    stdout: "pipe",
  });

  // Send messages (simulated via console.log)
  const messages = [
    { id: 1, data: { numbers: [1, 2, 3, 4, 5] } },
    { id: 2, data: { numbers: [10, 20, 30] } },
  ];

  console.info("📤 Sending messages:");
  messages.forEach((msg) => console.info(`  ${JSON.stringify(msg)}`));

  const stdout = await worker.stdout.text();
  const stderr = await worker.stderr.text();

  if (stdout) {
    console.info("📥 Received responses:");
    stdout
      .trim()
      .split("\n")
      .forEach((line) => {
        if (line) console.info(`  ${line}`);
      });
  }

  if (stderr) console.info(`⚠️ Worker stderr: ${stderr}`);

  await worker.exited;
}

// Demo 4: Bun.file operations with error handling
async function bunFileDemo() {
  console.info("\n📁 Bun.file operations...");

  try {
    // Read multiple files
    const files = ["package.json", "serve.js", "adder.ts"];

    console.info("┌─────────────┬──────────┬──────────┐");
    console.info("│ File        │ Size     │ Lines    │");
    console.info("├─────────────┼──────────┼──────────┤");

    for (const file of files) {
      try {
        const fileObj = Bun.file(file);
        const size = await fileObj.size;
        const content = await fileObj.text();
        const lines = content.split("\n").length;

        console.info(
          `│ ${pad(file, 11)} │ ${pad(size.toString(), 8)} │ ${pad(
            lines.toString(),
            8
          )} │`
        );
      } catch (error) {
        console.info(
          `│ ${pad(file, 11)} │ ${pad("ERROR", 8)} │ ${pad("N/A", 8)} │`
        );
      }
    }

    console.info("└─────────────┴──────────┴──────────┘");

    // Create backup with metadata
    const backup = {
      timestamp: new Date().toISOString(),
      files: files.length,
      created: "spawn-enhanced.ts",
    };

    await Bun.write("backup.json", JSON.stringify(backup, null, 2));
    console.info("✅ Backup created: backup.json");
  } catch (error) {
    console.info(`❌ File error: ${error.message}`);
  }
}

// Demo 5: SSE generation from spawn results
async function sseDemo() {
  console.info("\n📡 SSE generation...");

  const results = [
    { command: "ls", status: "success", duration: 2.1 },
    { command: "date", status: "success", duration: 1.8 },
    { command: "invalid", status: "error", duration: 0.5 },
  ];

  results.forEach((result, i) => {
    const event = sse("spawn-result", result);
    console.info(`Event ${i + 1}:`);
    console.info(event.trim());
  });
}

// Run all enhanced demos
async function runEnhancedDemos() {
  try {
    await advancedStderrDemo();
    await performanceComparison();
    await postMessageDemo();
    await bunFileDemo();
    await sseDemo();

    console.info(
      "\n" +
        colourKit(0.2).ansi +
        "🎉 All enhanced demos completed!" +
        "\x1b[0m"
    );
  } catch (error) {
    console.info(colourKit(0.8).ansi + `❌ Error: ${error.message}` + "\x1b[0m");
  }
}

// Execute
runEnhancedDemos().catch(console.error);
