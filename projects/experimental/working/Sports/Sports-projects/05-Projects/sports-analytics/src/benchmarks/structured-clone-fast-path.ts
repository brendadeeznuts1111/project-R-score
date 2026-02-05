/**
 * T3-Lattice structuredClone Fast-Path Benchmark
 * Verifies Bun's optimization for pure strings vs objects
 */

import { bench, run } from "mitata";

const strings = {
  small: "Hello world",
  medium: "Hello World!!!".repeat(1024),
  large: "Hello World!!!".repeat(1024 * 256),
};

console.log("🧬 T3-Lattice structuredClone Fast-Path Benchmarks");
console.log("==================================================");

// Pure strings (Fast Path)
bench("structuredClone(small string)", () => {
  structuredClone(strings.small);
});

bench("structuredClone(medium string)", () => {
  structuredClone(strings.medium);
});

bench("structuredClone(large string)", () => {
  structuredClone(strings.large);
});

// Objects containing strings (Traditional Path)
bench("structuredClone({ str: small })", () => {
  structuredClone({ str: strings.small });
});

bench("structuredClone({ str: medium })", () => {
  structuredClone({ str: strings.medium });
});

bench("structuredClone({ str: large })", () => {
  structuredClone({ str: strings.large });
});

await run();
