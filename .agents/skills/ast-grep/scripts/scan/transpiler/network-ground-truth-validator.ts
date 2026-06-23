import { readFile, stat } from "node:fs/promises";
import { resolve } from "node:path";
import { loadBundleProfile } from "./profile-loader.ts";
import type { NetworkAuditResult } from "./network-audit-result.ts";
import {
  getGroundTruthReference,
  NETWORK_GROUND_TRUTH_REFERENCES,
  NETWORK_STANDARDS,
  type GroundTruthReference,
} from "./network-pointers.ts";
import type { SnapshotNetworkSection } from "./snapshot.ts";

export type PinnedFieldCheck = {
  field: string;
  expected: string | number | boolean;
  actual?: string | number | boolean;
  match: boolean;
};

export type GroundTruthCheck = {
  id: string;
  ok: boolean;
  kind: GroundTruthReference["kind"];
  path: string;
  exists: boolean;
  issues: string[];
  pinned?: PinnedFieldCheck[];
};

export type GroundTruthValidationReport = {
  ok: boolean;
  at: number;
  checks: GroundTruthCheck[];
  standards: typeof NETWORK_STANDARDS;
};

function resolveGroundTruthPath(
  skillRoot: string,
  repo: string,
  refPath: string,
): string {
  if (
    refPath.startsWith("projects/")
    || refPath.startsWith("kimi-plugin/")
  ) {
    return resolve(repo, refPath);
  }
  return resolve(skillRoot, refPath);
}

function comparePinned(
  pinned: Record<string, string | number | boolean>,
  actuals: Record<string, string | number | boolean | undefined>,
): PinnedFieldCheck[] {
  return Object.entries(pinned)
    .filter(([field]) => field !== "ruleIds" && field !== "shapeId" && field !== "profile")
    .map(([field, expected]) => {
      const actual = actuals[field];
      const match = actual === expected;
      return { field, expected, actual, match };
    });
}

function checkFromPinned(
  ref: GroundTruthReference,
  actuals: Record<string, string | number | boolean | undefined>,
  issues: string[],
): PinnedFieldCheck[] | undefined {
  if (!ref.pinned) return undefined;
  const pinned = comparePinned(ref.pinned, actuals);
  for (const p of pinned) {
    if (!p.match) {
      issues.push(`pinned ${p.field}: expected ${p.expected}, got ${p.actual ?? "(missing)"}`);
    }
  }
  return pinned;
}

async function fileExists(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isFile();
  } catch {
    return false;
  }
}

async function validateSnapshotBaseline(
  skillRoot: string,
  ref: GroundTruthReference,
): Promise<GroundTruthCheck> {
  const abs = resolveGroundTruthPath(skillRoot, skillRoot, ref.path);
  const issues: string[] = [];
  const exists = await fileExists(abs);
  if (!exists) {
    return { id: ref.id, ok: false, kind: ref.kind, path: ref.path, exists, issues: ["file missing"] };
  }
  try {
    const doc = JSON.parse(await readFile(abs, "utf8")) as {
      snapshotVersion?: string;
      network?: SnapshotNetworkSection;
    };
    const net = doc.network;
    if (!net) issues.push("snapshot missing network section");
    const actuals: Record<string, string | number | boolean | undefined> = {
      snapshotVersion: doc.snapshotVersion,
      endpointCount: net?.endpointCount,
      routeCount: net?.routeCount,
      healthRouteCount: net?.healthRouteCount,
      networkUnique: net?.networkUnique,
      networkRaw: net?.networkRaw,
      scanPath: net?.scanPath,
    };
    const pinned = checkFromPinned(ref, actuals, issues);
    if (doc.snapshotVersion && doc.snapshotVersion !== NETWORK_STANDARDS.schemas.doctorSnapshot.version) {
      issues.push(`snapshotVersion ${doc.snapshotVersion} !== standard ${NETWORK_STANDARDS.schemas.doctorSnapshot.version}`);
    }
    return {
      id: ref.id,
      ok: issues.length === 0,
      kind: ref.kind,
      path: ref.path,
      exists,
      issues,
      pinned,
    };
  } catch (e) {
    issues.push(e instanceof Error ? e.message : String(e));
    return { id: ref.id, ok: false, kind: ref.kind, path: ref.path, exists, issues };
  }
}

async function validateOpenApi(
  skillRoot: string,
  repo: string,
  ref: GroundTruthReference,
): Promise<GroundTruthCheck> {
  const abs = resolveGroundTruthPath(skillRoot, repo, ref.path);
  const issues: string[] = [];
  const exists = await fileExists(abs);
  if (!exists) {
    return { id: ref.id, ok: false, kind: ref.kind, path: ref.path, exists, issues: ["file missing"] };
  }
  try {
    const doc = JSON.parse(await readFile(abs, "utf8")) as { paths?: Record<string, unknown> };
    let routes = 0;
    for (const methods of Object.values(doc.paths ?? {})) {
      for (const method of Object.keys(methods as Record<string, unknown>)) {
        if (["get", "post", "put", "patch", "delete", "head", "options"].includes(method)) routes++;
      }
    }
    const pinned = checkFromPinned(ref, { routeFingerprints: routes }, issues);
    return { id: ref.id, ok: issues.length === 0, kind: ref.kind, path: ref.path, exists, issues, pinned };
  } catch (e) {
    issues.push(e instanceof Error ? e.message : String(e));
    return { id: ref.id, ok: false, kind: ref.kind, path: ref.path, exists, issues };
  }
}

async function validatePolicyRules(
  skillRoot: string,
  ref: GroundTruthReference,
): Promise<GroundTruthCheck> {
  const abs = resolveGroundTruthPath(skillRoot, skillRoot, ref.path);
  const issues: string[] = [];
  const exists = await fileExists(abs);
  if (!exists) {
    return { id: ref.id, ok: false, kind: ref.kind, path: ref.path, exists, issues: ["file missing"] };
  }
  const raw = await readFile(abs, "utf8");
  for (const ruleId of NETWORK_STANDARDS.policy.networkRuleIds) {
    if (!raw.includes(`id = "${ruleId}"`) && !raw.includes(`id="${ruleId}"`)) {
      issues.push(`missing network rule id=${ruleId}`);
    }
  }
  return { id: ref.id, ok: issues.length === 0, kind: ref.kind, path: ref.path, exists, issues };
}

async function validateDistProfile(
  skillRoot: string,
  ref: GroundTruthReference,
): Promise<GroundTruthCheck> {
  const abs = resolveGroundTruthPath(skillRoot, skillRoot, ref.path);
  const issues: string[] = [];
  const exists = await fileExists(abs);
  if (!exists) {
    return { id: ref.id, ok: false, kind: ref.kind, path: ref.path, exists, issues: ["file missing"] };
  }
  try {
    const profile = await loadBundleProfile(skillRoot, "supply-chain-network-dist");
    const actuals: Record<string, string | number | boolean | undefined> = {
      profile: "supply-chain-network-dist",
      network_audit: profile.network_audit,
      network_dedupe: profile.network_dedupe,
      endpoint_meta: profile.endpoint_meta,
      max_file_kb: profile.max_file_kb,
    };
    const pinned = checkFromPinned(ref, actuals, issues);
    return { id: ref.id, ok: issues.length === 0, kind: ref.kind, path: ref.path, exists, issues, pinned };
  } catch (e) {
    issues.push(e instanceof Error ? e.message : String(e));
    return { id: ref.id, ok: false, kind: ref.kind, path: ref.path, exists, issues };
  }
}

async function validateFileReference(
  skillRoot: string,
  repo: string,
  ref: GroundTruthReference,
): Promise<GroundTruthCheck> {
  const abs = resolveGroundTruthPath(skillRoot, repo, ref.path);
  const exists = await fileExists(abs);
  return {
    id: ref.id,
    ok: exists,
    kind: ref.kind,
    path: ref.path,
    exists,
    issues: exists ? [] : ["file missing"],
  };
}

async function validateReference(
  skillRoot: string,
  repo: string,
  ref: GroundTruthReference,
): Promise<GroundTruthCheck> {
  switch (ref.id) {
    case "sports-terminal-snapshot":
      return validateSnapshotBaseline(skillRoot, ref);
    case "sports-terminal-openapi":
      return validateOpenApi(skillRoot, repo, ref);
    case "security-policy-network":
      return validatePolicyRules(skillRoot, ref);
    case "network-dist-profile":
      return validateDistProfile(skillRoot, ref);
    default:
      return validateFileReference(skillRoot, repo, ref);
  }
}

const LIVE_PINNED_FIELDS = new Set([
  "endpointCount",
  "routeCount",
  "healthRouteCount",
  "networkUnique",
  "networkRaw",
]);

export function compareAuditToGroundTruth(
  audit: NetworkAuditResult,
  groundTruthId: string,
): GroundTruthCheck | undefined {
  const ref = getGroundTruthReference(groundTruthId);
  if (!ref?.pinned) return undefined;
  const issues: string[] = [];
  const actuals: Record<string, string | number | boolean | undefined> = {
    endpointCount: audit.endpoints,
    routeCount: audit.routes,
    networkUnique: audit.networkUnique,
    networkRaw: audit.networkRaw,
    healthRouteCount: audit.tick.report?.endpoints?.health_count,
  };
  const livePinned = Object.fromEntries(
    Object.entries(ref.pinned).filter(([k]) => LIVE_PINNED_FIELDS.has(k)),
  );
  const pinned = checkFromPinned({ ...ref, pinned: livePinned }, actuals, issues);
  return {
    id: `${groundTruthId}-live`,
    ok: issues.length === 0,
    kind: ref.kind,
    path: ref.path,
    exists: true,
    issues,
    pinned,
  };
}

export async function validateNetworkGroundTruth(options: {
  skillRoot: string;
  repo: string;
  ids?: string[];
  liveAudit?: NetworkAuditResult;
  liveGroundTruthId?: string;
}): Promise<GroundTruthValidationReport> {
  const refs = options.ids?.length
    ? NETWORK_GROUND_TRUTH_REFERENCES.filter((r) => options.ids!.includes(r.id))
    : NETWORK_GROUND_TRUTH_REFERENCES;

  const checks: GroundTruthCheck[] = [];
  for (const ref of refs) {
    checks.push(await validateReference(options.skillRoot, options.repo, ref));
  }

  if (options.liveAudit && options.liveGroundTruthId) {
    const live = compareAuditToGroundTruth(options.liveAudit, options.liveGroundTruthId);
    if (live) checks.push(live);
  }

  return {
    ok: checks.every((c) => c.ok),
    at: Date.now(),
    checks,
    standards: NETWORK_STANDARDS,
  };
}

export function formatGroundTruthValidationTable(report: GroundTruthValidationReport): string {
  const lines = [
    `ground-truth validation: ${report.ok ? "PASS" : "FAIL"} (${report.checks.length} checks)`,
  ];
  for (const c of report.checks) {
    lines.push(`  ${c.ok ? "ok" : "FAIL"} ${c.id} [${c.kind}] ${c.path}`);
    for (const issue of c.issues) lines.push(`    - ${issue}`);
    if (c.pinned?.some((p) => !p.match)) {
      for (const p of c.pinned.filter((x) => !x.match)) {
        lines.push(`    Δ ${p.field}: want ${p.expected} got ${p.actual ?? "?"}`);
      }
    }
  }
  return `${lines.join("\n")}\n`;
}

export function formatGroundTruthValidationJson(report: GroundTruthValidationReport): string {
  return `${JSON.stringify({
    schemaVersion: 1,
    tool: "supply-chain-network",
    mode: "ground-truth-validation",
    at: new Date(report.at).toISOString(),
    ok: report.ok,
    checks: report.checks,
    standards: report.standards,
  }, null, 2)}\n`;
}

export function groundTruthIdForDomain(domain: string): string | undefined {
  if (domain === "sports-terminal-os") return "sports-terminal-snapshot";
  return undefined;
}