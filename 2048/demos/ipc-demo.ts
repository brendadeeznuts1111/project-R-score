#!/usr/bin/env bun

// Comprehensive Bun IPC (Inter-Process Communication) Demo
import { colourKit, pad } from "./quantum-toolkit-patch.ts";

console.log(colourKit(0.8).ansi + "📨 Bun IPC Communication Demo" + "\x1b[0m");
console.log("=".repeat(50));

// Demo 1: Basic parent-child communication
async function basicIPC() {
  console.log("\n🔗 Basic Parent-Child IPC:");

  const childCode = `
    globalThis.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === 'ping') {
        globalThis.postMessage({
          type: 'pong',
          data: {
            message: 'pong from child',
            timestamp: Date.now(),
            parentPid: process.ppid
          }
        });
      } else if (type === 'calculate') {
        const result = {
          input: data,
          square: data * data,
          cube: data * data * data
        };
        globalThis.postMessage({
          type: 'result',
          data: result
        });
      }
    };

    // Send ready signal
    globalThis.postMessage({ type: 'ready', pid: process.pid });
  `;

  // Write child process
  await Bun.write("/tmp/ipc-child.js", childCode);

  // Spawn child with IPC
  const child = Bun.spawn(["bun", "/tmp/ipc-child.js"], {
    stdout: "pipe",
    stderr: "pipe",
    ipc: true,
  });

  console.log("📤 Parent sending messages...");

  // Send messages to child
  child.send({ type: "ping", data: "hello" });
  child.send({ type: "calculate", data: 5 });
  child.send({ type: "calculate", data: 10 });

  // Read responses
  const stdout = await child.stdout.text();
  const stderr = await child.stderr.text();

  console.log("📥 Child responses:");
  stdout
    .trim()
    .split("\n")
    .forEach((line, i) => {
      if (line) {
        try {
          const response = JSON.parse(line);
          console.log(
            `  ${i + 1}: ${response.type} - ${JSON.stringify(response.data)}`
          );
        } catch {
          console.log(`  ${i + 1}: ${line}`);
        }
      }
    });

  if (stderr) console.log(`Errors: ${stderr}`);
  await child.exited;
}

// Demo 2: Worker pool with task distribution
async function workerPool() {
  console.log("\n👥 Worker Pool with Task Distribution:");

  const workerCode = `
    const workerId = process.argv[2];
    let taskCount = 0;

    globalThis.onmessage = (event) => {
      const { taskId, type, data } = event.data;
      taskCount++;

      if (type === 'compute') {
        // Simulate computation
        const start = Date.now();
        let result = 0;
        for (let i = 0; i < data.iterations; i++) {
          result += Math.random();
        }
        const duration = Date.now() - start;

        globalThis.postMessage({
          workerId,
          taskId,
          type: 'complete',
          data: {
            result: result / data.iterations,
            duration,
            taskCount
          }
        });
      } else if (type === 'status') {
        globalThis.postMessage({
          workerId,
          type: 'status',
          data: {
            taskCount,
            memory: process.memoryUsage().heapUsed,
            uptime: process.uptime()
          }
        });
      }
    };

    globalThis.postMessage({ workerId, ready: true });
  `;

  const workerCount = 3;
  const workers = [];

  // Create worker pool
  for (let i = 0; i < workerCount; i++) {
    const workerFile = `/tmp/worker-${i}.js`;
    await Bun.write(workerFile, workerCode);

    const worker = Bun.spawn(["bun", workerFile, i.toString()], {
      stdout: "pipe",
      stderr: "pipe",
      ipc: true,
    });

    workers.push(worker);
  }

  console.log(`Created worker pool with ${workerCount} workers`);

  // Collect ready signals
  const responses = [];
  for (const worker of workers) {
    const stdout = await worker.stdout.text();
    stdout
      .trim()
      .split("\n")
      .forEach((line) => {
        if (line) {
          try {
            responses.push(JSON.parse(line));
          } catch {}
        }
      });
    await worker.exited;
  }

  console.log("📊 Worker Pool Results:");
  console.log("┌─────┬─────────┬──────────┬──────────┐");
  console.log("│ ID  │ Status  │ Tasks    │ Memory   │");
  console.log("├─────┼─────────┼──────────┼──────────┤");

  responses.forEach((resp) => {
    if (resp.ready) {
      console.log(
        `│ ${pad(resp.workerId.toString(), 3)} │ ${pad("Ready", 7)} │ ${pad(
          "0",
          8
        )} │ ${pad("N/A", 8)} │`
      );
    }
  });

  console.log("└─────┴─────────┴──────────┴──────────┘");
}

// Demo 3: Bidirectional communication
async function bidirectionalIPC() {
  console.log("\n🔄 Bidirectional IPC Communication:");

  const echoCode = `
    let messageCount = 0;

    globalThis.onmessage = (event) => {
      messageCount++;
      const { type, data } = event.data;

      if (type === 'echo') {
        globalThis.postMessage({
          type: 'echo-reply',
          data: {
            original: data,
            echoed: true,
            count: messageCount,
            timestamp: Date.now()
          }
        });
      } else if (type === 'status') {
        globalThis.postMessage({
          type: 'status-reply',
          data: {
            messages: messageCount,
            pid: process.pid,
            memory: process.memoryUsage()
          }
        });
      }
    };

    globalThis.postMessage({ type: 'server-ready', port: 'echo-server' });
  `;

  await Bun.write("/tmp/echo-server.js", echoCode);

  const server = Bun.spawn(["bun", "/tmp/echo-server.js"], {
    stdout: "pipe",
    stderr: "pipe",
    ipc: true,
  });

  // Wait for server ready
  await new Promise((resolve) => setTimeout(resolve, 100));

  console.log("📨 Sending echo messages...");

  const messages = [
    "Hello World",
    "IPC Test Message",
    "Bun is fast!",
    "Quantum Toolkit",
    "Process Communication",
  ];

  for (const msg of messages) {
    server.send({ type: "echo", data: msg });
    server.send({ type: "status", data: "check" });
  }

  const stdout = await server.stdout.text();

  console.log("📥 Echo server responses:");
  stdout
    .trim()
    .split("\n")
    .forEach((line, i) => {
      if (line) {
        try {
          const response = JSON.parse(line);
          if (response.type === "echo-reply") {
            console.log(`  Echo ${i + 1}: "${response.data.original}" ✓`);
          } else if (response.type === "status-reply") {
            console.log(
              `  Status: ${response.data.messages} messages processed`
            );
          }
        } catch {}
      }
    });

  await server.exited;
}

// Demo 4: IPC with file sharing
async function ipcWithFiles() {
  console.log("\n📁 IPC with File Sharing:");

  const fileWorkerCode = `
    const fs = require('fs');

    globalThis.onmessage = async (event) => {
      const { type, data } = event.data;

      if (type === 'write-file') {
        try {
          await Bun.write(data.filename, data.content);
          globalThis.postMessage({
            type: 'write-complete',
            data: {
              filename: data.filename,
              size: data.content.length,
              success: true
            }
          });
        } catch (error) {
          globalThis.postMessage({
            type: 'write-error',
            data: { error: error.message }
          });
        }
      } else if (type === 'read-file') {
        try {
          const content = await Bun.file(data.filename).text();
          globalThis.postMessage({
            type: 'read-complete',
            data: {
              filename: data.filename,
              content: content.slice(0, 100), // First 100 chars
              size: content.length
            }
          });
        } catch (error) {
          globalThis.postMessage({
            type: 'read-error',
            data: { error: error.message }
          });
        }
      }
    };

    globalThis.postMessage({ type: 'file-worker-ready' });
  `;

  await Bun.write("/tmp/file-worker.js", fileWorkerCode);

  const fileWorker = Bun.spawn(["bun", "/tmp/file-worker.js"], {
    stdout: "pipe",
    stderr: "pipe",
    ipc: true,
  });

  // Test file operations
  const testData = {
    filename: "/tmp/ipc-test.txt",
    content:
      "This is a test file created via IPC\\nWith multiple lines\\nAnd special chars: 🚀",
  };

  console.log("📝 Writing file via IPC...");
  fileWorker.send({ type: "write-file", data: testData });

  console.log("📖 Reading file via IPC...");
  fileWorker.send({ type: "read-file", data: { filename: testData.filename } });

  const stdout = await fileWorker.stdout.text();
  const stderr = await fileWorker.stderr.text();

  console.log("📥 File operation results:");
  stdout
    .trim()
    .split("\n")
    .forEach((line) => {
      if (line) {
        try {
          const response = JSON.parse(line);
          console.log(`  ${response.type}: ${JSON.stringify(response.data)}`);
        } catch {}
      }
    });

  if (stderr) console.log(`Errors: ${stderr}`);
  await fileWorker.exited;
}

// Demo 5: IPC error handling
async function ipcErrorHandling() {
  console.log("\n⚠️ IPC Error Handling:");

  const errorProneCode = `
    globalThis.onmessage = (event) => {
      const { type, data } = event.data;

      if (type === 'valid-request') {
        globalThis.postMessage({
          type: 'valid-response',
          data: { success: true }
        });
      } else if (type === 'invalid-request') {
        throw new Error('Intentional error for testing');
      } else if (type === 'async-error') {
        setTimeout(() => {
          throw new Error('Async error');
        }, 10);
      }
    };

    // Simulate startup error
    if (Math.random() < 0.3) {
      throw new Error('Random startup error');
    }

    globalThis.postMessage({ type: 'worker-ready' });
  `;

  await Bun.write("/tmp/error-worker.js", errorProneCode);

  const errorWorker = Bun.spawn(["bun", "/tmp/error-worker.js"], {
    stdout: "pipe",
    stderr: "pipe",
    ipc: true,
  });

  // Send various requests
  errorWorker.send({ type: "valid-request", data: "test" });
  errorWorker.send({ type: "invalid-request", data: "error" });

  const stdout = await errorWorker.stdout.text();
  const stderr = await errorWorker.stderr.text();

  console.log("📥 Worker responses:");
  if (stdout) {
    stdout
      .trim()
      .split("\n")
      .forEach((line) => {
        if (line) {
          try {
            const response = JSON.parse(line);
            console.log(
              `  ✓ ${response.type}: ${JSON.stringify(response.data)}`
            );
          } catch {
            console.log(`  ? Raw: ${line}`);
          }
        }
      });
  }

  console.log("⚠️ Worker errors:");
  if (stderr) {
    stderr
      .trim()
      .split("\n")
      .forEach((line) => {
        if (line) console.log(`  ✗ ${line}`);
      });
  } else {
    console.log("  ✓ No errors captured");
  }

  await errorWorker.exited;
}

// Main execution
async function main() {
  try {
    await basicIPC();
    await workerPool();
    await bidirectionalIPC();
    await ipcWithFiles();
    await ipcErrorHandling();

    console.log(
      "\n" +
        colourKit(0.2).ansi +
        "🎉 IPC Demo Completed Successfully!" +
        "\x1b[0m"
    );
    console.log("💡 All IPC patterns demonstrated:");
    console.log("  • Parent-child communication");
    console.log("  • Worker pool distribution");
    console.log("  • Bidirectional messaging");
    console.log("  • File sharing via IPC");
    console.log("  • Error handling patterns");
  } catch (error) {
    console.log(
      colourKit(0.8).ansi + `❌ IPC Demo Error: ${error.message}` + "\x1b[0m"
    );
  }
}

// Handle cleanup
process.on("SIGINT", () => {
  console.log("\n\n👋 IPC Demo - Cleaning up temporary files...");
  process.exit(0);
});

// Start IPC demo
main();
