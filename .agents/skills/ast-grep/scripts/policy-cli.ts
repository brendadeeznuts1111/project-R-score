#!/usr/bin/env bun
/**
 * Policy-driven constraints CLI (Layer 5).
 *
 *   bun scripts/policy-cli.ts
 *   bun scripts/policy-cli.ts check lodash 4.17.20
 *   bun scripts/policy-cli.ts check left-pad 0.0.1 --explain --format markdown
 */

import { resolve } from "node:path";
import { loadPolicyFromSkill } from "./scan/transpiler/policy-loader.ts";
import { loadScannerVersion } from "./scan/transpiler/snapshot.ts";
import { Registry } from "./scan/transpiler/registry.ts";
import { explainEvaluation } from "./scan/transpiler/policy-engine.ts";
import { severityTag, okLine, warnLine, fixLine, removeLine, mutedLine } from "./scan/transpiler/terminal-color.ts";
import {
  buildPolicyCheckMarkdown,
  buildPolicyListMarkdown,
  renderMarkdownDocument,
  type ReportRenderFormat,
} from "./scan/transpiler/markdown-reporter.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = { action: "list" };
  if (argv[0] === "check") {
    out.action = "check";
    out.package = argv[1] ?? "";
    out.version = argv[2] ?? "";
    for (let i = 3; i < argv.length; i++) {
      const a = argv[i];
      if (a === "--json") out.json = true;
      else if (a === "--explain") out.explain = true;
      else if (a === "--no-threat-feed") out["no-threat-feed"] = true;
      else if (a.startsWith("--format=")) out.format = a.slice("--format=".length);
      else if (a === "--format" && argv[i + 1]) out.format = argv[++i];
    }
    return out;
  }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    if (a.startsWith("--format=")) out.format = a.slice("--format=".length);
    if (a === "--format" && argv[i + 1]) out.format = argv[++i];
  }
  return out;
}

function resolveFormat(opts: Record<string, string | boolean>): ReportRenderFormat {
  if (typeof opts.format === "string") return opts.format as ReportRenderFormat;
  return opts.json === true ? "json" : "json";
}

async function listPolicy(opts: Record<string, string | boolean>): Promise<void> {
  const policy = await loadPolicyFromSkill(SKILL_ROOT);
  const scannerVersion = await loadScannerVersion(SKILL_ROOT);

  const payload = {
    layer: "5",
    command: "policy",
    policyVersion: policy.version ?? 1,
    scannerVersion,
    snapshot: policy.snapshot ?? {},
    allowed: Object.entries(policy.semver_packages).map(([pkg, range]) => ({
      package: pkg,
      range,
      constraint: "allow",
      description: `${pkg} must satisfy ${range}`,
    })),
    blocked: Object.entries(policy.semver_blocked).map(([pkg, range]) => ({
      package: pkg,
      range,
      constraint: "block",
      description: `${pkg} must NOT satisfy ${range}`,
    })),
    semverRules: policy.semver_rules.map((r) => ({
      id: r.id,
      package: r.package,
      range: r.range,
      safeRange: r.safeRange,
      severity: r.severity,
      description: r.description,
    })),
    counts: {
      allowed: Object.keys(policy.semver_packages).length,
      blocked: Object.keys(policy.semver_blocked).length,
      semverRules: policy.semver_rules.length,
    },
  };

  const format = resolveFormat(opts);
  if (format !== "json") {
    const md = buildPolicyListMarkdown(payload);
    process.stdout.write(renderMarkdownDocument(md, format));
    return;
  }

  if (opts.json === true) {
    const md = buildPolicyListMarkdown(payload);
    process.stdout.write(`${JSON.stringify({ ...payload, markdown_source: md }, null, 2)}\n`);
    return;
  }

  console.log(`policy v${payload.policyVersion}  scanner=${scannerVersion}`);
  if (policy.snapshot) {
    console.log(
      `snapshot: version=${policy.snapshot.snapshotVersionRange ?? "?"}`
      + `  scanner=${policy.snapshot.compatibleScannerVersions ?? "?"}`,
    );
    if (policy.snapshot.requiredSections?.length) {
      console.log(`  requiredSections: ${policy.snapshot.requiredSections.join(", ")}`);
    }
  }
  console.log(`\n[allowed] ${payload.counts.allowed} package floor(s)`);
  for (const row of payload.allowed) {
    console.log(`  ${row.package}  ${row.range}`);
  }
  console.log(`\n[blocked] ${payload.counts.blocked} package block(s)`);
  for (const row of payload.blocked) {
    console.log(`  ${row.package}  ${row.range}`);
  }
  console.log(`\n[semver_rule] ${payload.counts.semverRules} rule(s)`);
  for (const row of payload.semverRules) {
    const safe = row.safeRange ? `  safe=${row.safeRange}` : "";
    console.log(`  [${row.severity}] ${row.id}: ${row.package} ${row.range}${safe}`);
  }
  console.log("\nrun: bun scripts/policy-cli.ts check lodash 4.17.20 --explain --format markdown");
}

async function checkPackage(opts: Record<string, string | boolean>): Promise<number> {
  const pkg = String(opts.package ?? "");
  const version = String(opts.version ?? "");
  if (!pkg || !version) {
    console.error("Usage: bun scripts/policy-cli.ts check <package> <version> [--explain] [--format markdown] [--json]");
    return 1;
  }

  const registry = new Registry(SKILL_ROOT);
  const evaluation = await registry.evaluatePackage(pkg, version, {
    threatFeed: opts["no-threat-feed"] !== true,
  });

  const payload = {
    layer: "5",
    command: "policy check",
    evaluation,
    compliant: evaluation.compliant,
  };

  const format = resolveFormat(opts);
  if (format !== "json") {
    const md = buildPolicyCheckMarkdown(evaluation, { explain: opts.explain === true });
    process.stdout.write(renderMarkdownDocument(md, format));
    return evaluation.compliant ? 0 : 1;
  }

  if (opts.json === true) {
    const md = buildPolicyCheckMarkdown(evaluation, { explain: true });
    process.stdout.write(`${JSON.stringify({ ...payload, markdown_source: md }, null, 2)}\n`);
    return evaluation.compliant ? 0 : 1;
  }

  if (opts.explain === true) {
    const head = evaluation.compliant
      ? okLine(`${pkg}@${version} — COMPLIANT`)
      : warnLine(`${pkg}@${version} — VIOLATION`);
    console.log(head);
    for (const hit of evaluation.hits) {
      const mark = hit.violated ? warnLine("✗") : okLine("✓");
      const kind = severityTag(hit.kind);
      console.log(`  ${mark} ${kind} ${hit.ruleId}: ${hit.message}`);
    }
    if (evaluation.strictestSafeRange) {
      console.log(`  ${fixLine(`strictest safe range: ${evaluation.strictestSafeRange}`)}`);
    }
  } else {
    const status = evaluation.compliant
      ? okLine("COMPLIANT")
      : warnLine("VIOLATION");
    console.log(
      `${pkg}@${version} — ${status}`
      + (evaluation.strictestSafeRange ? mutedLine(`  safe=${evaluation.strictestSafeRange}`) : ""),
    );
    for (const hit of evaluation.hits.filter((h) => h.violated)) {
      const cmd = hit.kind === "blocked" ? removeLine(`bun remove ${pkg}`) : fixLine(hit.safeRange ?? "");
      console.log(`  ${severityTag(hit.kind)} ${hit.ruleId}: ${hit.message}`);
      if (hit.safeRange && hit.kind !== "blocked") console.log(`    ${fixLine(`satisfy ${hit.safeRange}`)}`);
      if (hit.kind === "blocked") console.log(`    ${cmd}`);
    }
  }
  return evaluation.compliant ? 0 : 1;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.action === "check") {
    process.exit(await checkPackage(opts));
    return;
  }
  await listPolicy(opts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});