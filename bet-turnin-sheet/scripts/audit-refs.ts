#!/usr/bin/env bun
import { join } from "node:path";
import { z } from "zod";
import {
  formatZodError,
  parseRefsJson,
  type RefEntry,
  type RefId,
  type RefsJson,
} from "./refs-schema";
import { scanCitations } from "./lib/citation-scanner";
import { validateNavContract } from "./lib/nav-contract";
import { applyFix } from "./lib/refs-fix";
import {
  buildUnusedList,
  writeJsonReport,
  writeMarkdownReport,
  type AuditReport,
} from "./lib/report-writer";
import { checkUrls, isUrlCheckSuccess } from "./lib/url-checker";

const ROOT = join(import.meta.dir, "..");

interface CliFlags {
  schemaOnly: boolean;
  noNetwork: boolean;
  noCache: boolean;
  linksOnly: boolean;
  fix: boolean;
  strict: boolean;
  report: "json" | "md" | "both";
}

function parseArgs(argv: string[]): CliFlags {
  const flags: CliFlags = {
    schemaOnly: false,
    noNetwork: false,
    noCache: false,
    linksOnly: false,
    fix: false,
    strict: false,
    report: "json",
  };
  for (const arg of argv) {
    if (arg === "--schema-only") flags.schemaOnly = true;
    else if (arg === "--no-network") flags.noNetwork = true;
    else if (arg === "--no-cache") flags.noCache = true;
    else if (arg === "--links-only") flags.linksOnly = true;
    else if (arg === "--fix") flags.fix = true;
    else if (arg === "--strict") flags.strict = true;
    else if (arg.startsWith("--report=")) {
      const v = arg.split("=")[1] as CliFlags["report"];
      if (v === "md" || v === "both" || v === "json") flags.report = v;
    }
  }
  return flags;
}

function registryMap(data: RefsJson): Map<RefId, RefEntry> {
  return new Map(data.refs.map((r) => [r.id as RefId, r]));
}

function urlTargets(data: RefsJson): Array<{ id: string; url: string }> {
  const targets: Array<{ id: string; url: string }> = [];
  for (const ref of data.refs) {
    if (ref.kind !== "external") continue;
    if (ref.deprecated && ref.replacedBy) {
      const successor = data.refs.find((r) => r.id === ref.replacedBy);
      if (successor?.url) targets.push({ id: ref.id, url: successor.url });
      continue;
    }
    if (!ref.deprecated) targets.push({ id: ref.id, url: ref.url });
  }
  return targets;
}

async function loadRefs(): Promise<RefsJson> {
  const raw = await Bun.file(join(ROOT, "refs.json")).json();
  return parseRefsJson(raw);
}

function printTable(title: string, rows: string[]) {
  if (rows.length === 0) return;
  console.info(`\n${title}`);
  for (const r of rows) console.info(r);
}

function validateCrossRefMatrix(data: RefsJson, registry: Map<RefId, RefEntry>): string[] {
  const issues: string[] = [];
  const refIds = new Set(data.refs.map((r) => r.id));
  const seenSpecs = new Set<string>();

  for (const entry of data.crossRefMatrix) {
    if (seenSpecs.has(entry.spec)) {
      issues.push(`Duplicate crossRefMatrix spec: ${entry.spec}`);
    }
    seenSpecs.add(entry.spec);
    if (!refIds.has(entry.spec)) {
      issues.push(`crossRefMatrix spec ${entry.spec} not in registry`);
    }
    for (const refId of entry.externalRefs) {
      if (!refIds.has(refId)) {
        issues.push(`crossRefMatrix ${entry.spec} references unknown ref ${refId}`);
        continue;
      }
      const ref = registry.get(refId as RefId);
      if (ref && ref.kind !== "external") {
        issues.push(`crossRefMatrix ${entry.spec}: ${refId} is not an external ref`);
      }
    }
  }
  return issues;
}

async function main() {
  const flags = parseArgs(process.argv.slice(2));
  const timestamp = new Date().toISOString();
  const schemaErrors: string[] = [];
  let data: RefsJson;

  try {
    data = await loadRefs();
  } catch (err) {
    if (err instanceof z.ZodError) {
      console.error("Schema validation failed:\n" + formatZodError(err));
      process.exit(1);
    }
    throw err;
  }

  console.info(`✓ Schema valid (${data.refs.length} refs)`);

  if (flags.schemaOnly) process.exit(0);

  const errors: string[] = [];
  const warnings: string[] = [];
  let urlChecks: Awaited<ReturnType<typeof checkUrls>> = [];

  const registry = registryMap(data);
  for (const issue of validateCrossRefMatrix(data, registry)) {
    errors.push(issue);
  }

  if (!flags.noNetwork) {
    urlChecks = await checkUrls(urlTargets(data), { noCache: flags.noCache });
    for (const c of urlChecks) {
      if (!isUrlCheckSuccess(c.classification)) {
        errors.push(`URL ${c.id}: ${c.classification} — ${c.url}`);
      }
    }
    printTable(
      "URL checks",
      urlChecks.map(
        (c) =>
          `  ${c.cached ? "○" : "●"} ${c.id} ${c.classification}${c.httpStatus ? ` (${c.httpStatus})` : ""}`
      )
    );
  } else {
    console.info("Skipping URL checks (--no-network)");
  }

  if (flags.linksOnly) {
    const report: AuditReport = {
      timestamp,
      flags: { ...flags, report: flags.report },
      meta: { schemaValid: true, totalRefs: data.refs.length },
      summary: {
        passed: urlChecks.filter((c) => isUrlCheckSuccess(c.classification)).length,
        failed: errors.length,
        warnings: 0,
        errors: errors.length,
      },
      schemaErrors,
      urlChecks,
      citations: { cited: 0, unusedRefs: [] },
      deprecatedCited: [],
      drift: [],
      forbiddenUrls: [],
      missingAnchors: [],
      navContract: { passed: true, violations: [], checked: 0 },
      exitCode: errors.length > 0 ? 1 : 0,
    };
    await writeJsonReport(join(ROOT, "ref-audit.json"), report);
    process.exit(report.exitCode);
  }

  const citations = await scanCitations(ROOT, registry);

  if (citations.refsMdUnparsedUrls.length > 0) {
    for (const u of citations.refsMdUnparsedUrls) {
      warnings.push(`REFS.md row for ${u.id} found but URL cell could not be parsed`);
    }
  }

  if (citations.anchorMismatches.length > 0) {
    for (const a of citations.anchorMismatches) {
      warnings.push(
        `${a.id} anchor mismatch: expected ${a.expected}, registry has ${a.actual}`
      );
    }
  }

  if (citations.unknownIds.length > 0) {
    for (const u of citations.unknownIds) {
      errors.push(`Unknown ref ${u.id} cited in ${u.file}`);
    }
  }

  if (citations.deprecatedCited.length > 0) {
    for (const d of citations.deprecatedCited) {
      errors.push(
        `Deprecated ref ${d.id} cited in ${d.file}` +
          (d.replacedBy ? ` — use ${d.replacedBy}` : "")
      );
    }
  }

  if (citations.unusedRefs.length > 0) {
    for (const u of citations.unusedRefs) {
      warnings.push(`Unused ref ${u.id} (${u.topic})`);
    }
  }

  if (citations.refsMdDrift.length > 0) {
    for (const d of citations.refsMdDrift) {
      errors.push(`REFS.md drift ${d.id}: expected ${d.expected}, got ${d.actual}`);
    }
  }

  if (citations.missingAnchors.length > 0) {
    for (const a of citations.missingAnchors) {
      warnings.push(`Missing anchor in REFS.md: ${a}`);
    }
  }

  if (citations.forbiddenUrls.length > 0) {
    for (const f of citations.forbiddenUrls) {
      errors.push(`Forbidden URL in ${f.file}:${f.line} — ${f.url}`);
    }
  }

  const specHtml = await Bun.file(join(ROOT, "spec.html")).text();
  const navContract = validateNavContract(specHtml, registry);
  if (!navContract.passed) {
    for (const v of navContract.violations) {
      errors.push(`Nav: ${v.line ? `L${v.line} ` : ""}${v.message}`);
    }
  }

  const warningCount = warnings.length;
  const errorCount = errors.length;
  let exitCode = errorCount > 0 ? 1 : 0;
  if (flags.strict && warningCount > 0) exitCode = 1;

  const report: AuditReport = {
    timestamp,
    flags: { ...flags, report: flags.report },
    meta: { schemaValid: true, totalRefs: data.refs.length },
    summary: {
      passed: data.refs.length - errorCount,
      failed: errorCount + (flags.strict ? warningCount : 0),
      warnings: warningCount,
      errors: errorCount,
    },
    schemaErrors,
    urlChecks,
    citations: {
      cited: citations.citedIds.size,
      unusedRefs: buildUnusedList(citations.unusedRefs),
    },
    deprecatedCited: citations.deprecatedCited,
    drift: citations.refsMdDrift,
    forbiddenUrls: citations.forbiddenUrls,
    missingAnchors: citations.missingAnchors,
    navContract,
    exitCode,
  };

  await writeJsonReport(join(ROOT, "ref-audit.json"), report);
  if (flags.report === "md" || flags.report === "both") {
    await writeMarkdownReport(join(ROOT, "ref-audit.md"), report);
  }

  printTable("Errors", errors.map((e) => `  ✗ ${e}`));
  printTable("Warnings", warnings.map((w) => `  ⚠ ${w}`));

  if (flags.fix && exitCode === 0) {
    await applyFix(join(ROOT, "refs.json"), data, urlChecks, timestamp);
    console.info("\n✓ Applied --fix to refs.json");
  } else if (flags.fix && exitCode !== 0) {
    console.info("\n✗ --fix skipped (audit has errors)");
  }

  console.info(
    `\nAudit complete: ${errorCount} error(s), ${warningCount} warning(s) → exit ${exitCode}`
  );
  process.exit(exitCode);
}

if (import.meta.main) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
