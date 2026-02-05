/**
 * T3-Lattice Worker String Fast-Path Benchmark
 * Measures postMessage efficiency for pure strings
 * Inspired by Bun/Node.js string fast path optimizations
 */

import { bench, run } from "mitata";
import { Worker } from "node:worker_threads";

// Test strings of different sizes
const strings = {
  small: "Hello world",
  medium: Buffer.alloc("Hello World!!!".length * 1024, "Hello World!!!").toString(),
  large: Buffer.alloc("Hello World!!!".length * 1024 * 256, "Hello World!!!").toString(),
};

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
  
  worker.on("error", (err) => console.error("Worker Error:", err));
}

createWorker();

function fmt(int: number) {
  if (int < 1000) {
    return `${int} chars`;
  }

  if (int < 100000) {
    return `${(int / 1024) | 0} KB`;
  }

  return `${(int / 1024 / 1024) | 0} MB`;
}

console.log("🧬 T3-Lattice Worker String Fast-Path Benchmarks");
console.log("===============================================");

bench(`postMessage(${fmt(strings.small.length)} string)`, () => {
  sentCount++;
  worker.postMessage(strings.small);
});

bench(`postMessage(${fmt(strings.medium.length)} string)`, () => {
  sentCount++;
  worker.postMessage(strings.medium);
});

bench(`postMessage(${fmt(strings.large.length)} string)`, () => {
  sentCount++;
  worker.postMessage(strings.large);
});

await run();

// Cleanup
setTimeout(() => {
  console.log(`\nVerification: Sent ${sentCount}, Received ${receivedCount[0]}`);
  worker.terminate();
}, 1000);
