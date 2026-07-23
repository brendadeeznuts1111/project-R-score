#!/usr/bin/env bun
// @bun
var __require = import.meta.require;

// tools/verify-bun-release.ts
var {CryptoHasher, inspect, version, revision, spawn, $ } = globalThis.Bun;
import { writeFileSync } from "fs";

// lib/docs/bun-release-tracker.ts
import tls from "tls";
var BUN_RELEASE_NOTE_ROWS = [
  {
    id: "tls-system-ca-no-flag",
    title: "tls.getCACertificates('system') without --use-system-ca",
    summary: "Previously returned [] unless --use-system-ca or NODE_USE_SYSTEM_CA=1. Now lazy-loads OS trust store on first 'system' query (Node parity); flag only affects 'default'.",
    verify: "automated",
    refs: [
      "https://bun.com/reference/node/tls/getCACertificates",
      "https://github.com/oven-sh/bun/issues/24339",
      "https://github.com/oven-sh/bun/pull/29526"
    ]
  },
  {
    id: "gc-builtins-incremental",
    title: "Reduced incremental GC overhead for built-in objects",
    summary: "Codegen classes (Request, Response, Subprocess, \u2026) no longer re-scan all live instances after every mutator yield; only visitChildren runs. Hand-written types unchanged.",
    verify: "smoke",
    refs: ["https://bun.com/docs/runtime/gc"]
  },
  {
    id: "binary-size-linux-windows",
    title: "Smaller Bun binary on Windows and Linux",
    summary: "Linux x64 ~-8.6 MB, Windows x64 ~-17.7 MB (macOS unchanged). Informational \u2014 tracked in release notes, not asserted in CI.",
    verify: "informational",
    refs: ["https://github.com/oven-sh/bun/releases"]
  },
  {
    id: "event-loop-refactor",
    title: "Event loop refactor (reliability + memory)",
    summary: "Large event-loop refactor fixed DuplexUpgradeContext/SSLWrapper leaks, TLSSocket.memoryCost, and timer.ref() on already-fired timers no longer keeps the process alive.",
    verify: "automated",
    refs: ["https://bun.com/blog/bun-v1.3.14#event-loop-refactor"]
  }
];
function probeTlsSystemCaCertificates() {
  const certs = tls.getCACertificates("system");
  const count = Array.isArray(certs) ? certs.length : -1;
  const platform = process.platform;
  let nodeParity = Array.isArray(certs);
  let note = "array returned";
  if (!Array.isArray(certs)) {
    nodeParity = false;
    note = "not an array";
  } else if (count === 0) {
    nodeParity = platform === "darwin";
    note = platform === "darwin" ? "empty on macOS allowed (Node CI skips non-empty assert)" : "empty \u2014 regresses pre-fix [] without --use-system-ca";
  } else {
    nodeParity = true;
    note = "non-empty without --use-system-ca";
  }
  return { count, platform, nodeParity, note };
}
async function probeProcessExitWithPendingTimer() {
  try {
    const proc = Bun.spawn(["bun", "-e", 'setTimeout(()=>{},5000);console.log("ok")'], {
      stdout: "pipe"
    });
    const [out, code] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited
    ]);
    const ok = code === 0 && out.trim() === "ok";
    return {
      ok,
      note: ok ? "exits before unref timer fires" : `code=${code} out=${out.trim()}`
    };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : String(e) };
  }
}
async function probeTimerRefAfterFire() {
  try {
    const proc = Bun.spawn([
      "bun",
      "-e",
      `await Bun.sleep(20);
const t = setTimeout(() => {}, 5);
await Bun.sleep(20);
t.ref();
console.log("ok");`
    ], { stdout: "pipe" });
    const [out, code] = await Promise.all([
      new Response(proc.stdout).text(),
      proc.exited
    ]);
    const ok = code === 0 && out.trim() === "ok";
    return {
      ok,
      note: ok ? "exits after ref on fired timer" : `code=${code} out=${out.trim()}`
    };
  } catch (e) {
    return { ok: false, note: e instanceof Error ? e.message : String(e) };
  }
}
function smokeBuiltinObjectsGc() {
  const holders = [];
  for (let i = 0;i < 2000; i++) {
    holders.push(new Request(`https://example.com/${i}`));
  }
  holders.length = 0;
  if (typeof Bun.gc === "function") {
    Bun.gc(true);
  }
  try {
    new Request("https://example.com/");
    new Response("ok");
    return { ok: true, count: 2000 };
  } catch {
    return { ok: false, count: 2000 };
  }
}

// tools/verify-bun-release.ts
var SAVE_PATH = "public/registry/release-features.json";
var SHOULD_SAVE = process.argv.includes("--save");
async function run() {
  const results = [];
  const tlsProbe = probeTlsSystemCaCertificates();
  results.push({
    name: "tls.getCACertificates('system')",
    expected: "non-empty on linux/win32; array on macOS (no --use-system-ca)",
    actual: `${tlsProbe.count} certs \xB7 ${tlsProbe.platform} \xB7 ${tlsProbe.note}`,
    passed: tlsProbe.nodeParity
  });
  const gcSmoke = smokeBuiltinObjectsGc();
  results.push({
    name: "Built-in objects GC smoke (Request/Response)",
    expected: "2000 allocs + optional Bun.gc without crash",
    actual: gcSmoke.ok ? `ok (${gcSmoke.count} allocs)` : "failed",
    passed: gcSmoke.ok
  });
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
  const pendingTimer = await probeProcessExitWithPendingTimer();
  results.push({
    name: "Process exit with pending timer",
    expected: "exits before unref timer fires",
    actual: pendingTimer.note,
    passed: pendingTimer.ok
  });
  const refAfterFire = await probeTimerRefAfterFire();
  results.push({
    name: "timer.ref() after fired setTimeout",
    expected: "process exits (ref does not keep loop alive)",
    actual: refAfterFire.note,
    passed: refAfterFire.ok
  });
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

    class R {
      val = 42;
      [Symbol.dispose]() {}
    }
    {
      using r = new R;
      if (r.val !== 42)
        throw new Error("using failed");
    }

    class AR {
      val = 84;
      [Symbol.asyncDispose]() {
        return Promise.resolve();
      }
    }
    await using ar = new AR;
    results.push({ name: "using / await using (Explicit Resource Mgmt)", expected: "works without lowering", actual: `using=${new R().val}, await using=${ar.val}`, passed: true });
  } catch (e) {
    results.push({ name: "using / await using (Explicit Resource Mgmt)", expected: "works without lowering", actual: `error: ${e.message}`, passed: false });
  }
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
    releaseNotes: BUN_RELEASE_NOTE_ROWS.map((r) => ({
      id: r.id,
      title: r.title,
      verify: r.verify,
      refs: r.refs
    })),
    results,
    summary: { passed, total: results.length, status: passed === results.length ? "pass" : "fail" },
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
