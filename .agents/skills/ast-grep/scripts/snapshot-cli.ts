#!/usr/bin/env bun
/**
 * Snapshot compatibility CLI (Layer 5).
 *
 *   bun scripts/snapshot-cli.ts validate snapshot.json
 *   bun scripts/snapshot-cli.ts capture --path . --network-path dist [--out snapshot.json]
 *   bun scripts/snapshot-cli.ts migrate-baseline --domain sports-terminal-os
 */

import { resolve } from "node:path";
import {
  buildSnapshotTemplate,
  migrateSnapshot,
  validateSnapshotFull,
  captureSnapshot,
  diffSnapshotPackages,
  type DoctorSnapshotV2,
} from "./scan/transpiler/snapshot.ts";
import {
  captureNetworkSectionFromReport,
  defaultSnapshotPath,
  migrateLegacyBaselineToSnapshot,
} from "./scan/transpiler/snapshot-network.ts";
import { runBundleScan } from "./scan/transpiler/bundle-scanner.ts";
import { resolveTargetDependencies } from "./scan/transpiler/dependency-resolver.ts";
import { Registry } from "./scan/transpiler/registry.ts";
import { okLine, warnLine, fixLine } from "./scan/transpiler/terminal-color.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = { action: argv[0] ?? "validate" };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      if (!out.file && out.action !== "capture" && out.action !== "migrate-baseline") out.file = a;
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

async function readSnapshot(file: string): Promise<DoctorSnapshotV2> {
  return JSON.parse(await Bun.file(file).text()) as DoctorSnapshotV2;
}

async function resolvePackages(repo: string, targetPath: string): Promise<Record<string, string>> {
  const { dependencies } = await resolveTargetDependencies({
    repo,
    targetPath,
    includeDev: false,
  });
  const packages: Record<string, string> = {};
  for (const d of dependencies) packages[d.name] = d.version;
  return packages;
}

function resolveDomain(opts: Record<string, string | boolean>, scanPath: string): string {
  if (typeof opts.domain === "string") return opts.domain;
  const m = scanPath.match(/projects\/(?:active|experimental)\/([^/]+)/);
  if (m) return m[1];
  return "default";
}

async function captureLiveNetwork(
  repo: string,
  networkPath: string,
  domain: string,
): Promise<ReturnType<typeof captureNetworkSectionFromReport>> {
  const report = await runBundleScan({
    skillRoot: SKILL_ROOT,
    repo,
    profileName: "supply-chain-network-dist",
    scanPath: networkPath,
    format: "json",
  });
  return captureNetworkSectionFromReport(report, domain, networkPath);
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const action = String(opts.action);
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const scannerVersion = typeof opts["scanner-version"] === "string"
    ? opts["scanner-version"]
    : process.env.SUPPLY_CHAIN_SCANNER_VERSION;

  if (action === "init") {
    const template = await buildSnapshotTemplate(SKILL_ROOT);
    const text = `${JSON.stringify(template, null, 2)}\n`;
    if (typeof opts.out === "string") {
      await Bun.write(opts.out, text);
      console.log(`wrote ${opts.out}`);
    } else {
      process.stdout.write(text);
    }
    return;
  }

  if (action === "migrate-baseline") {
    const domain = typeof opts.domain === "string" ? opts.domain : "default";
    const snapshot = await migrateLegacyBaselineToSnapshot({
      skillRoot: SKILL_ROOT,
      domain,
      baselinePath: typeof opts.baseline === "string" ? opts.baseline : undefined,
      scannerVersion: typeof scannerVersion === "string" ? scannerVersion : undefined,
    });
    const outPath = typeof opts.out === "string"
      ? opts.out
      : defaultSnapshotPath(SKILL_ROOT, domain);
    await Bun.write(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
    console.log(`migrated legacy baseline → ${outPath}`);
    return;
  }

  if (action === "capture") {
    const targetPath = typeof opts.path === "string" ? opts.path : ".";
    const packages = await resolvePackages(repo, targetPath);
    const registry = new Registry(SKILL_ROOT);
    const violations = await registry.checkAllViolations(packages, { threatFeed: true });
    let network;
    if (typeof opts["network-path"] === "string") {
      const domain = resolveDomain(opts, opts["network-path"]);
      network = await captureLiveNetwork(repo, opts["network-path"], domain);
    }
    const snapshot = await captureSnapshot({
      skillRoot: SKILL_ROOT,
      packages,
      violationCount: violations.length,
      network,
    });
    const text = `${JSON.stringify(snapshot, null, 2)}\n`;
    const outPath = typeof opts.out === "string" ? opts.out : undefined;
    if (outPath) {
      await Bun.write(outPath, text);
      const netMsg = network
        ? `, network=${network.endpointCount} endpoints / ${network.routeCount} routes`
        : "";
      console.log(`wrote ${outPath} (${Object.keys(packages).length} packages, ${violations.length} violations${netMsg})`);
    } else {
      process.stdout.write(text);
    }
    return;
  }

  const file = typeof opts.file === "string" ? opts.file : undefined;
  if (!file) {
    console.error("Usage: bun scripts/snapshot-cli.ts <validate|init|migrate|capture|diff|migrate-baseline> ...");
    process.exit(1);
  }

  if (action === "diff") {
    const snapshot = await readSnapshot(file);
    const targetPath = typeof opts.path === "string" ? opts.path : ".";
    const current = await resolvePackages(repo, targetPath);
    let currentNetwork;
    if (typeof opts["network-path"] === "string") {
      const domain = resolveDomain(opts, opts["network-path"]);
      currentNetwork = await captureLiveNetwork(repo, opts["network-path"], domain);
    }
    const validation = await validateSnapshotFull({
      skillRoot: SKILL_ROOT,
      snapshot,
      currentPackages: current,
      currentNetwork,
      failOnNetworkDrift: opts["fail-on-drift"] === true,
    });
    const drift = diffSnapshotPackages(snapshot, current);
    const payload = {
      action: "diff",
      ok: validation.ok,
      drift: validation.drift,
      packages: drift,
      changedCount: drift.changed.length + drift.added.length + drift.removed.length,
    };
    if (opts.json === true) {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else {
      console.log(
        validation.drift.policyDrift
          ? warnLine("policy drift: YES")
          : okLine("policy drift: no"),
      );
      if (validation.drift.network) {
        const n = validation.drift.network;
        console.log(
          n.drift
            ? warnLine(`network drift: YES (+${n.routesAdded}/-${n.routesRemoved} routes)`)
            : okLine("network drift: no"),
        );
      }
      console.log(`packages: +${drift.added.length} -${drift.removed.length} ~${drift.changed.length}`);
      for (const c of drift.changed) console.log(`  ${warnLine(`~ ${c.package}: ${c.from} → ${c.to}`)}`);
      for (const a of drift.added) console.log(`  ${okLine(`+ ${a}@${current[a]}`)}`);
      for (const r of drift.removed) console.log(`  ${warnLine(`- ${r}`)}`);
      if (validation.drift.policyDrift) {
        console.log(`  ${fixLine("run: bun supply-chain snapshot migrate <file> --out <file>.v2")}`);
      }
    }
    if (!validation.ok) process.exit(1);
    return;
  }

  if (action === "migrate") {
    const before = await readSnapshot(file);
    const result = await migrateSnapshot({ skillRoot: SKILL_ROOT, snapshot: before });
    const payload = {
      action: "migrate",
      migrated: result.migrated,
      changes: result.changes,
      hint: result.hint,
      after: result.after,
    };
    if (opts.json === true) {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    } else {
      console.log(result.migrated ? "migrated:" : "no changes:");
      for (const c of result.changes) console.log(`  + ${c}`);
      if (result.hint) console.log(`  hint: ${result.hint}`);
    }
    if (typeof opts.out === "string") {
      await Bun.write(opts.out, `${JSON.stringify(result.after, null, 2)}\n`);
      console.log(`wrote ${opts.out}`);
    } else if (result.migrated && opts.json !== true) {
      console.log("\nmigrated snapshot:");
      process.stdout.write(`${JSON.stringify(result.after, null, 2)}\n`);
    }
    return;
  }

  const snapshot = await readSnapshot(file);
  const targetPath = typeof opts.path === "string" ? opts.path : ".";
  const current = await resolvePackages(repo, targetPath);
  let currentNetwork;
  if (typeof opts["network-path"] === "string") {
    const domain = resolveDomain(opts, opts["network-path"]);
    currentNetwork = await captureLiveNetwork(repo, opts["network-path"], domain);
  }
  const result = await validateSnapshotFull({
    skillRoot: SKILL_ROOT,
    snapshot,
    scannerVersion,
    currentPackages: current,
    currentNetwork,
    failOnNetworkDrift: opts["fail-on-drift"] === true,
  });
  const payload = { action: "validate", ...result };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  if (!result.ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});