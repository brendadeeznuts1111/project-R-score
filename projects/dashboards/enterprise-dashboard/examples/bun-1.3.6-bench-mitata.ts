/**
 * Bun 1.3.6 Performance Benchmarks using Mitata
 * Tests SIMD optimizations: Response.json, Buffer.indexOf, spawn, CRC32
 */

import { bench, group, run } from "../scripts/bench/utils";

// Test data
const jsonData = {
  items: Array.from({ length: 100 }, (_, i) => ({ id: i, name: `item-${i}`, active: i % 2 === 0 })),
};

const largeBuffer = Buffer.from("x".repeat(100_000) + "needle" + "y".repeat(100_000));
const notFoundBuffer = Buffer.from("x".repeat(200_000));
const crcData = Buffer.alloc(1_000_000, 0x42);

group("Response.json (SIMD FastStringifier)", () => {
  bench("Response.json()", () => {
    Response.json(jsonData);
  });

  bench("JSON.stringify + Response", () => {
    new Response(JSON.stringify(jsonData), { 
      headers: { "Content-Type": "application/json" } 
    });
  });
});

group("Buffer.indexOf/includes (SIMD search - up to 2x faster)", () => {
  bench("Buffer.indexOf (found)", () => {
    largeBuffer.indexOf("needle");
  });

  bench("Buffer.indexOf (not found)", () => {
    notFoundBuffer.indexOf("needle");
  });

  bench("Buffer.includes (found)", () => {
    largeBuffer.includes("needle");
  });

  bench("Buffer.includes (not found)", () => {
    notFoundBuffer.includes("needle");
  });
});

group("Bun.spawnSync (fd limit optimization - Linux ARM64 fix)", () => {
  bench("Bun.spawnSync(['true'])", () => {
    Bun.spawnSync(["true"]);
  });
});

group("Bun.hash.crc32 (hardware accelerated - 20x faster)", () => {
  bench("Bun.hash.crc32 (1MB)", () => {
    Bun.hash.crc32(crcData);
  });
});

await run();
