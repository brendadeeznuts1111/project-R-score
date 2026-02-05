/**
 * T3-Lattice Worker Fast-Path Benchmark
 * Measures postMessage efficiency for Lattice data structures
 * Inspired by Bun/Node.js object fast path optimizations
 */

import { bench, run } from "mitata";
import { Worker } from "node:worker_threads";
import { LatticeWebSocketPayload } from "../types/lattice.types";

// Prepare optimized data structures
const extraMetadata = {
  region: "us-east-1",
  version: "3.3.0",
  priority: 1,
  reliable: true,
  compressed: false,
  encrypted: false,
  checksum: 0xABCDEF,
  flags: 0b10101010,
};

const payloads = {
  small: {
    uuid: "550e8400-e29b-41d4-a716-446655440000",
    fdByte: 0x42,
    colorNumber: 7,
    glyph: new Uint8Array(16).fill(0x21),
    timestamp: Date.now(),
    ...extraMetadata
  },
  medium: {
    uuid: "550e8400-e29b-41d4-a716-446655440001",
    fdByte: 0x43,
    colorNumber: 8,
    glyph: new Uint8Array(1024).fill(0x22),
    timestamp: Date.now(),
    ...extraMetadata
  },
  large: {
    uuid: "550e8400-e29b-41d4-a716-446655440002",
    fdByte: 0x44,
    colorNumber: 9,
    glyph: new Uint8Array(1024 * 256).fill(0x23),
    timestamp: Date.now(),
    ...extraMetadata
  }
};

let worker: Worker;
let receivedCount = new Int32Array(new SharedArrayBuffer(4));
let sentCount = 0;

function createWorker() {
  const workerCode = `
    const { parentPort, workerData } = require("node:worker_threads");
    const received = workerData;

    parentPort.on("message", (data) => {
      if (data && data.uuid && typeof data.fdByte === 'number') {
        Atomics.add(received, 0, 1);
      }
    });
  `;

  worker = new Worker(workerCode, { eval: true, workerData: receivedCount });
  
  worker.on("error", (err) => console.error("Worker Error:", err));
}

createWorker();

function fmt(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

console.log("🧬 T3-Lattice Worker Fast-Path Benchmarks");
console.log("==========================================");

bench(`postMessage(LatticePayload: ${fmt(payloads.small.glyph.length)} glyph)`, () => {
  sentCount++;
  worker.postMessage(payloads.small);
});

bench(`postMessage(LatticePayload: ${fmt(payloads.medium.glyph.length)} glyph)`, () => {
  sentCount++;
  worker.postMessage(payloads.medium);
});

bench(`postMessage(LatticePayload: ${fmt(payloads.large.glyph.length)} glyph)`, () => {
  sentCount++;
  worker.postMessage(payloads.large);
});

await run();

// Cleanup
setTimeout(() => {
  console.log(`\nVerification: Sent ${sentCount}, Received ${receivedCount[0]}`);
  worker.terminate();
}, 1000);
