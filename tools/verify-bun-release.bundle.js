#!/usr/bin/env bun
// @bun
var __require = import.meta.require;

// tools/verify-bun-release.ts
var {CryptoHasher, inspect, version, revision } = globalThis.Bun;
import { writeFileSync } from "fs";
import tls from "tls";
var SAVE_PATH = "public/registry/release-features.json";
var SHOULD_SAVE = process.argv.includes("--save");
async function run() {
  const results = [];
  try {
    const systemCerts = tls.getCACertificates("system");
    const certCount = systemCerts?.length || 0;
    results.push({ name: "tls.getCACertificates('system')", expected: "returns certificate array", actual: `${certCount} certs`, passed: Array.isArray(systemCerts) });
  } catch (e) {
    results.push({ name: "tls.getCACertificates('system')", expected: "returns certificate array", actual: `error: ${e.message}`, passed: false });
  }
  const sample = "<div>Hello & 'world'</div>";
  const iterations = 1e4;
  const t0 = Bun.nanoseconds();
  for (let i = 0;i < iterations; i++)
    Bun.escapeHTML(sample);
  const avgNs = (Bun.nanoseconds() - t0) / 1e6 / iterations * 1e6;
  results.push({ name: "Bun.escapeHTML performance", expected: "< 500 ns per call", actual: `${avgNs.toFixed(1)} ns`, passed: avgNs < 500 });
  const esmT0 = Bun.nanoseconds();
  await import("fs");
  const esmMs = (Bun.nanoseconds() - esmT0) / 1e6;
  results.push({ name: "ESM module load (node:fs)", expected: "loads successfully", actual: `${esmMs.toFixed(2)}ms`, passed: true });
  try {
    new Request("https://example.com");
    new Response;
    results.push({ name: "Built-in objects (Request, Response)", expected: "created without crash", actual: "ok", passed: true });
  } catch (e) {
    results.push({ name: "Built-in objects (Request, Response)", expected: "created without crash", actual: `error: ${e.message}`, passed: false });
  }
  const hasher = new CryptoHasher("sha256");
  for (const r of results)
    hasher.update(r.name + r.passed);
  const proofHash = hasher.digest("hex");
  const proof = {
    timestamp: new Date().toISOString(),
    bunVersion: version,
    bunRevision: revision?.slice(0, 12) || "unknown",
    results,
    summary: { passed: results.filter((r) => r.passed).length, total: results.length, status: results.every((r) => r.passed) ? "pass" : "fail" },
    proofHash
  };
  console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("\u2551  \uD83D\uDE80 Bun Release Features Verification                               \u2551");
  console.log(`\u2551  ${(version + " / " + (revision?.slice(0, 8) || "unknown")).padEnd(58)}\u2551`);
  console.log(`\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
  const table = inspect(results.map((r) => [r.name, r.expected, r.actual, r.passed ? "\u2705" : "\u274C"]), { colors: true, table: true });
  console.log(table);
  console.log(`
  \uD83D\uDCCA ${proof.summary.passed}/${proof.summary.total} passed`);
  console.log(`  \uD83D\uDD12 Proof hash: ${proofHash.slice(0, 16)}\u2026`);
  if (SHOULD_SAVE) {
    writeFileSync(SAVE_PATH, JSON.stringify(proof, null, 2));
    console.log(`
\uD83D\uDCBE Proof saved to ${SAVE_PATH}`);
  }
  if (proof.summary.passed < proof.summary.total)
    process.exit(1);
  return proof;
}
if (import.meta.main)
  await run();
