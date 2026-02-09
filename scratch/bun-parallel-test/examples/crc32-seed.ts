// crc32-seed.ts — CRC32 with optional seed parameter
// Feature #19 — PR #26754 — Enhanced in Bun 1.3.9
//
// Bun.hash.crc32 now accepts an optional seed.
//
// Run: bun run examples/crc32-seed.ts

const base = Bun.hash.crc32("hello world");
const seeded = Bun.hash.crc32("hello world", 12345);

console.log(`CRC32("hello world")        = ${base}`);
console.log(`CRC32("hello world", 12345) = ${seeded}`);

let ok = true;

if (typeof base !== "number" || base === 0) {
  console.log("[FAIL] base CRC32 returned invalid value");
  ok = false;
}

if (typeof seeded !== "number" || seeded === 0) {
  console.log("[FAIL] seeded CRC32 returned invalid value");
  ok = false;
}

if (base === seeded) {
  console.log("[FAIL] seed should produce a different hash");
  ok = false;
}

// Deterministic — same input + seed = same output
const seeded2 = Bun.hash.crc32("hello world", 12345);
if (seeded !== seeded2) {
  console.log("[FAIL] seeded CRC32 not deterministic");
  ok = false;
}

// Incremental CRC32 — from upstream fixture (commit e5cd034)
// https://github.com/oven-sh/bun/issues/26043
let crc = 0;
crc = Bun.hash.crc32(new Uint8Array([1, 2, 3]), crc);
crc = Bun.hash.crc32(new Uint8Array([4, 5, 6]), crc);
console.log(`CRC32 incremental [1,2,3]+[4,5,6] = ${crc}`);

// Incremental should equal whole-buffer
const whole = Bun.hash.crc32(new Uint8Array([1, 2, 3, 4, 5, 6]));
console.log(`CRC32 whole [1,2,3,4,5,6]         = ${whole}`);

if (crc !== whole) {
  console.log("[FAIL] incremental CRC32 does not match whole-buffer CRC32");
  ok = false;
}

if (typeof crc !== "number" || crc === 0) {
  console.log("[FAIL] incremental CRC32 returned invalid value");
  ok = false;
}

console.log(ok ? "\n[PASS] All CRC32 checks passed" : "\n[FAIL] Some checks failed");
if (!ok) process.exit(1);
