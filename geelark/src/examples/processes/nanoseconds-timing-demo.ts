#!/usr/bin/env bun

/**
 * Nanoseconds Timing Demo - Precise Process Uptime Measurement
 *
 * Demonstrates Bun.nanoseconds() for high-precision timing measurements.
 * As per documentation: "Use Bun.nanoseconds() to get the total number of
 * nanoseconds the bun process has been alive."
 *
 * Useful for:
 * - Performance profiling
 * - Benchmarking operations
 * - Measuring IPC communication latency
 * - Process health monitoring
 */

console.log("⏱️  Bun.nanoseconds() Timing Demo");
console.log("Measuring precise process uptime and operation timing\n");

// Get initial process uptime
const processStart = Bun.nanoseconds();
console.log(`🔰 Process started at: ${processStart} nanoseconds`);
console.log(`🔰 Process started at: ${(processStart / 1_000_000_000).toFixed(2)} seconds\n`);

// Demonstrate timing IPC operations
console.log("📡 Timing IPC message round-trip:");

const ipcChild = Bun.spawn([process.execPath, "-e", `
  process.on("message", (msg) => {
    // Simulate processing time
    const receiveTime = Bun.nanoseconds();
    // Small delay to simulate work
    setTimeout(() => {
      const responseTime = Bun.nanoseconds();
      process.send({
        received: msg,
        receiveTime: receiveTime,
        responseTime: responseTime,
        processingDelay: responseTime - receiveTime
      });
      process.exit(0);
    }, Math.random() * 10); // Random processing time
  });
`], {
  ipc(message, childProc) {
    // Handle any additional IPC messages if needed
  }
});

const messageSendTime = Bun.nanoseconds();
ipcChild.send({
  message: "timing test",
  sendTime: messageSendTime
});

ipcChild.on("message", (response) => {
  const receiveTime = Bun.nanoseconds();
  const totalRoundTrip = receiveTime - messageSendTime;
  const networkTime = totalRoundTrip - (response.responseTime - response.receiveTime);

  console.log(`📤 Message sent:     ${messageSendTime} ns`);
  console.log(`📥 Message received: ${response.receiveTime} ns`);
  console.log(`📤 Response sent:    ${response.responseTime} ns`);
  console.log(`📥 Response received: ${receiveTime} ns`);
  console.log(`⚡ IPC round-trip:    ${totalRoundTrip} ns (${(totalRoundTrip / 1_000_000).toFixed(2)} ms)`);
  console.log(`🔧 Child processing:  ${(response.processingDelay / 1_000_000).toFixed(2)} ms`);
  console.log(`🌐 Network overhead:  ${(networkTime / 1_000_000).toFixed(2)} ms`);
});

// Demonstrate measuring function execution time
console.log("\n⚡ Timing synchronous operations:");

function benchmarkOperation(name: string, operation: () => void, iterations: number = 1000) {
  const startTime = Bun.nanoseconds();

  for (let i = 0; i < iterations; i++) {
    operation();
  }

  const endTime = Bun.nanoseconds();
  const totalTime = endTime - startTime;
  const avgTime = totalTime / iterations;

  console.log(`${name}:`);
  console.log(`  Total: ${totalTime} ns (${(totalTime / 1_000_000).toFixed(2)} ms)`);
  console.log(`  Average: ${avgTime.toFixed(2)} ns (${(avgTime / 1_000_000).toFixed(4)} ms)`);
  console.log(`  Per second: ${(1_000_000_000 / avgTime).toLocaleString()} ops/sec`);
  console.log("");
}

benchmarkOperation("🚀 Empty function call", () => {});
benchmarkOperation("🔢 Math.random()", () => Math.random());
benchmarkOperation("📅 Date.now()", () => Date.now());
benchmarkOperation("⏱️  Bun.nanoseconds()", () => Bun.nanoseconds());

// Demonstrate uptime monitoring
console.log("🏥 Process health monitoring:");
setInterval(() => {
  const uptime = Bun.nanoseconds();
  const uptimeSeconds = uptime / 1_000_000_000;
  const uptimeMinutes = uptimeSeconds / 60;

  console.log(`💓 Process uptime: ${uptime.toLocaleString()} ns (${uptimeSeconds.toFixed(1)}s, ${uptimeMinutes.toFixed(2)}min)`);
}, 2000);

// Wait for IPC child to finish
setTimeout(async () => {
  await ipcChild.exited;

  const finalUptime = Bun.nanoseconds();
  const totalUptime = finalUptime - processStart;
  const totalSeconds = totalUptime / 1_000_000_000;

  console.log(`\n🏁 Demo complete!`);
  console.log(`📊 Total demonstration time: ${(totalSeconds).toFixed(2)} seconds`);
  console.log(`⏱️  Precise nanoseconds: ${totalUptime.toLocaleString()}`);
  console.log(`📈 Process has been running for ${totalSeconds.toFixed(2)} seconds total`);

  process.exit(0);
}, 3000);
