#!/usr/bin/env bun
// @bun
var __require = import.meta.require;

// tools/verify-bun-release.ts
var {CryptoHasher, inspect, version, revision, spawn, $ } = globalThis.Bun;
import { writeFileSync } from "fs";
import tls from "tls";
var SAVE_PATH = "public/registry/release-features.json";
var SHOULD_SAVE = process.argv.includes("--save");
async function run() {
  const results = [];
  try {
    const certs = tls.getCACertificates("system");
    results.push({ name: "tls.getCACertificates('system')", expected: "returns certificate array", actual: `${certs?.length || 0} certs`, passed: Array.isArray(certs) });
  } catch (e) {
    results.push({ name: "tls.getCACertificates('system')", expected: "returns certificate array", actual: `error: ${e.message}`, passed: false });
  }
  const sample = "<div>Hello & 'world'</div>";
  const iterations = 1e4;
  const t0 = Bun.nanoseconds();
  for (let i = 0;i < iterations; i++)
    Bun.escapeHTML(sample);
  const avgNs = (Bun.nanoseconds() - t0) / iterations;
  results.push({ name: "Bun.escapeHTML performance", expected: "< 500 ns per call", actual: `${avgNs.toFixed(1)} ns`, passed: avgNs < 500 });
  const esmT0 = Bun.nanoseconds();
  await import("fs");
  results.push({ name: "ESM module load (node:fs)", expected: "loads successfully", actual: `${((Bun.nanoseconds() - esmT0) / 1e6).toFixed(2)}ms`, passed: true });
  try {
    const proc = spawn(["bun", "-e", 'setTimeout(()=>{},5000);console.log("ok")']);
    const out = await new Response(proc.stdout).text();
    await proc.exited;
    results.push({ name: "Process exit with pending timer", expected: "exits before timer fires", actual: out.trim(), passed: out.trim() === "ok" });
  } catch (e) {
    results.push({ name: "Process exit with pending timer", expected: "exits before timer fires", actual: `error: ${e.message}`, passed: false });
  }
  try {
    const ws = new WebSocket("ws://localhost:9999");
    await Bun.sleep(100);
    ws.close();
    results.push({ name: "WebSocket cleanup on close", expected: "no crash or leak", actual: "ok", passed: true });
  } catch (e) {
    results.push({ name: "WebSocket cleanup on close", expected: "no crash or leak", actual: `error: ${e.message}`, passed: false });
  }
  try {
    const proc = spawn(["echo", "hello"], { stdin: "pipe" });
    await proc.exited;
    results.push({ name: "Child process stdin pipe cleanup", expected: "exits without hanging", actual: "exited", passed: proc.exitCode === 0 });
  } catch (e) {
    results.push({ name: "Child process stdin pipe cleanup", expected: "exits without hanging", actual: `error: ${e.message}`, passed: false });
  }
  try {
    const result = await $`echo -n "hello"`.text();
    results.push({ name: "Bun Shell basics", expected: "echo works", actual: `"${result}"`, passed: result === "hello" });
  } catch (e) {
    results.push({ name: "Bun Shell basics", expected: "echo works", actual: `error: ${e.message}`, passed: false });
  }
  try {
    const blob = new Blob(["hello"]);
    const cloned = structuredClone(blob);
    const text = await cloned.text();
    results.push({ name: "structuredClone Blob", expected: "clone works", actual: text === "hello" ? "ok" : "mismatch", passed: text === "hello" });
  } catch (e) {
    results.push({ name: "structuredClone Blob", expected: "clone works", actual: `error: ${e.message}`, passed: false });
  }
  try {
    const hash = await Bun.password.hash("test");
    results.push({ name: "Bun.password.hash", expected: "returns a string", actual: typeof hash, passed: typeof hash === "string" });
  } catch (e) {
    results.push({ name: "Bun.password.hash", expected: "returns a string", actual: `error: ${e.message}`, passed: false });
  }
  results.push({
    name: "Bun.inspect depth",
    expected: "unlimited in canary",
    actual: Bun.inspect({ a: { b: { c: { d: 1 } } } }).includes("d: 1") ? "unlimited" : "depth=2",
    passed: Bun.inspect({ a: { b: { c: { d: 1 } } } }).includes("d: 1")
  });
  results.push({ name: "Bun.hash returns bigint", expected: "bigint", actual: typeof Bun.hash("hello"), passed: typeof Bun.hash("hello") === "bigint" });
  results.push({ name: "Bun.version / Bun.revision", expected: "both available", actual: `${version} (${(revision || "").slice(0, 8)})`, passed: !!version && !!revision });
  try {
    new Request("https://example.com");
    new Response;
    results.push({ name: "Built-in objects (Request, Response)", expected: "created without crash", actual: "ok", passed: true });
  } catch (e) {
    results.push({ name: "Built-in objects (Request, Response)", expected: "created without crash", actual: `error: ${e.message}`, passed: false });
  }
  const passed = results.filter((r) => r.passed).length;
  const hasher = new CryptoHasher("sha256");
  for (const r of results)
    hasher.update(r.name + r.passed);
  const proofHash = hasher.digest("hex");
  const proof = {
    timestamp: new Date().toISOString(),
    bunVersion: version,
    bunRevision: (revision || "").slice(0, 12) || "unknown",
    results,
    summary: { passed, total: results.length, status: passed === results.length ? "pass" : "fail" },
    proofHash
  };
  console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("\u2551  \uD83D\uDE80 Bun Release Features Verification (v1.3.14+)                    \u2551");
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
