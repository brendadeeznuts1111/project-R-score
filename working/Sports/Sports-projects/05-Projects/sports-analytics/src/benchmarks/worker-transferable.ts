/**
 * T3-Lattice Worker Transferable Benchmark
 * Compares standard postMessage vs Transferable (ArrayBuffer)
 */

import { bench, run } from "mitata";
import { Worker } from "node:worker_threads";

const LARGE_SIZE = 1024 * 1024 * 4; // 4MB

let worker: Worker;
let receivedCount = new Int32Array(new SharedArrayBuffer(4));
let sentCount = 0;

function createWorker() {
  const workerCode = `
    const { parentPort, workerData } = require("node:worker_threads");
    const received = workerData;

    parentPort.on("message", (data) => {
      Atomics.add(received, 0, 1);
    });
  `;

  worker = new Worker(workerCode, { eval: true, workerData: receivedCount });
}

createWorker();

console.log("🧬 T3-Lattice Worker Transferable Benchmarks (4MB Payload)");
console.log("=========================================================");

bench("postMessage(Standard Object with 4MB Uint8Array)", () => {
  const data = {
    id: sentCount++,
    payload: new Uint8Array(LARGE_SIZE).fill(0x42)
  };
  worker.postMessage(data);
});

bench("postMessage(Transferable ArrayBuffer)", () => {
  const buffer = new ArrayBuffer(LARGE_SIZE);
  const data = {
    id: sentCount++,
    payload: buffer
  };
  worker.postMessage(data, [buffer]);
});

await run();

// Cleanup
setTimeout(() => {
  console.log(`\nVerification: Sent ${sentCount}, Received ${receivedCount[0]}`);
  worker.terminate();
}, 1000);
