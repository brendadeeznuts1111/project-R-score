#!/usr/bin/env bun
// @bun

// tools/verify-package-info.ts
var {CryptoHasher, inspect } = globalThis.Bun;
import { writeFileSync } from "fs";
var SAVE_PATH = "public/registry/package-info.json";
var SHOULD_SAVE = process.argv.includes("--save");
var LOCAL = Bun.env.REGISTRY_URL || "http://localhost:3000";
async function checkPackage(name, registry) {
  const url = registry === "npm" ? "https://registry.npmjs.org" : LOCAL;
  try {
    const proc = Bun.spawnSync(["bun", "info", name, `--registry=${url}`, "--json"]);
    if (proc.exitCode !== 0)
      throw new Error(proc.stderr.toString().trim().split(`
`).pop() || "");
    const data = JSON.parse(proc.stdout.toString());
    const version = data["dist-tags"]?.latest || data.version || "?";
    let readmeStatus = "\u2014";
    if (registry === "custom") {
      const rProc = Bun.spawnSync(["bun", "info", name, "readme", `--registry=${url}`]);
      const readme = rProc.stdout.toString().trim();
      if (readme && readme.length > 20)
        readmeStatus = "\u2705 " + readme.slice(0, 40).replace(/\n/g, " ") + "\u2026";
      else
        readmeStatus = readme ? "\u26A0\uFE0F short" : "\u274C empty";
    }
    return { name, registry, version, readme: readmeStatus, ok: true };
  } catch (e) {
    return { name, registry, version: "\u2014", readme: "\u2014", ok: false };
  }
}
async function run() {
  const packages = [
    { name: "react", registry: "npm" },
    { name: "@factorywager/registry-client", registry: "custom" },
    { name: "@factorywager/bun-test", registry: "custom" },
    { name: "@factory/health-check", registry: "custom" },
    { name: "event-store", registry: "custom" }
  ];
  console.log("\u2554\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2557");
  console.log("\u2551  \uD83D\uDCE6 Package Info Verification                                        \u2551");
  console.log(`\u2551  Bun: ${Bun.version.padEnd(58)}\u2551`);
  console.log(`\u255A\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u2550\u255D
`);
  const results = await Promise.all(packages.map((p) => checkPackage(p.name, p.registry)));
  const passed = results.filter((r) => r.ok).length;
  const table = inspect(results.map((r) => [r.name, r.registry, r.version, r.readme, r.ok ? "\u2705" : "\u274C"]), { colors: true, table: true });
  console.log(table);
  console.log(`
  \uD83D\uDCCA ${passed}/${results.length} packages resolved`);
  const hasher = new CryptoHasher("sha256");
  for (const r of results)
    hasher.update(r.name + r.version + r.ok);
  const proofHash = hasher.digest("hex");
  console.log(`  \uD83D\uDD12 Proof hash: ${proofHash.slice(0, 16)}\u2026`);
  const proof = {
    schemaVersion: 1,
    bunVersion: Bun.version,
    timestamp: new Date().toISOString(),
    total: results.length,
    passed,
    proofHash,
    results
  };
  if (SHOULD_SAVE) {
    writeFileSync(SAVE_PATH, JSON.stringify(proof, null, 2));
    console.log(`
\uD83D\uDCBE Proof saved to ${SAVE_PATH}`);
  }
  if (!proof.allOk && passed < results.length)
    process.exit(1);
  return proof;
}
if (import.meta.main)
  await run();
export {
  run
};
