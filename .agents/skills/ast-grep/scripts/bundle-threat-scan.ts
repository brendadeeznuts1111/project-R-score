#!/usr/bin/env bun
/**
 * Bundle threat scan via Bun.Transpiler — static import/export analysis and
 * transpiled-output pattern matching. No code execution.
 *
 *   bun scripts/bundle-threat-scan.ts --repo /path --zone agents --profile ci
 *
 * Emits JSON: { repo, profile, elapsed_ms, targets: TargetResult[] }
 */

import { readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const SKILL_ROOT = resolve(import.meta.dir, "..");

type Loader = "js" | "jsx" | "ts" | "tsx";
type Severity = "info" | "warn" | "error";
type ImportKind =
  | "import-statement"
  | "require-call"
  | "require-resolve"
  | "dynamic-import"
  | "import-rule"
  | "url-token"
  | "internal"
  | "entry-point-build"
  | "entry-point-run";

type RepoTarget = {
  id?: string;
  path?: string;
  zone?: string;
  name?: string;
  tags?: string[];
};

type ImportRule = {
  id: string;
  kind?: ImportKind;
  path_pattern?: string;
  severity: Severity;
  message: string;
};

type PatternRule = {
  id: string;
  pattern: string;
  severity: Severity;
  message: string;
};

type ThreatRules = {
  import_rules: ImportRule[];
  source_rules: PatternRule[];
  output_rules: PatternRule[];
};

type Profile = {
  description?: string;
  min_severity: Severity;
  transform_output: boolean;
  use_scan_imports: boolean;
  max_file_kb: number;
};

type Finding = {
  rule: string;
  severity: Severity;
  message: string;
  layer: "import" | "source" | "output";
  detail?: string;
};

type FileResult = {
  file: string;
  skipped?: boolean;
  skip_reason?: string;
  findings: Finding[];
  imports_scanned?: number;
  scan_ms?: number;
};

type TargetResult = {
  id: string;
  path: string;
  skipped: boolean;
  files_scanned: number;
  findings: Finding[];
  files: FileResult[];
  scan_ms: number;
};

const SEVERITY_RANK: Record<Severity, number> = { info: 0, warn: 1, error: 2 };

const SKIP_DIRS = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  "coverage",
  ".next",
  ".turbo",
  "__snapshots__",
  "vendor",
  ".bun",
]);

const CODE_EXTS = new Set([".ts", ".tsx", ".js", ".jsx", ".mts", ".cts", ".mjs", ".cjs"]);

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
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

function filterTargets(targets: RepoTarget[], only: string, zone: string): RepoTarget[] {
  let rows = targets;
  if (zone) {
    const z = zone.toLowerCase();
    rows = rows.filter((t) => (t.zone ?? "").toLowerCase() === z);
  }
  if (only) {
    const q = only.toLowerCase();
    rows = rows.filter((t) => {
      const id = (t.id ?? "").toLowerCase();
      const name = (t.name ?? "").toLowerCase();
      const path = (t.path ?? "").toLowerCase();
      const zoneId = (t.zone ?? "").toLowerCase();
      const tags = (t.tags ?? []).join(" ").toLowerCase();
      return q === id || q === zoneId || id.includes(q) || name.includes(q)
        || path.includes(q) || tags.includes(q);
    });
  }
  return rows;
}

function loaderForFile(file: string): Loader | null {
  const ext = file.slice(file.lastIndexOf("."));
  switch (ext) {
    case ".tsx": return "tsx";
    case ".ts":
    case ".mts":
    case ".cts": return "ts";
    case ".jsx": return "jsx";
    case ".js":
    case ".mjs":
    case ".cjs": return "js";
    default: return null;
  }
}

function meetsSeverity(sev: Severity, min: Severity): boolean {
  return SEVERITY_RANK[sev] >= SEVERITY_RANK[min];
}

function checkImportRules(
  imports: Array<{ path: string; kind: ImportKind }>,
  rules: ImportRule[],
  min: Severity,
): Finding[] {
  const out: Finding[] = [];
  for (const imp of imports) {
    for (const rule of rules) {
      if (rule.kind && rule.kind !== imp.kind) continue;
      if (rule.path_pattern && !new RegExp(rule.path_pattern).test(imp.path)) continue;
      if (!meetsSeverity(rule.severity, min)) continue;
      out.push({
        rule: rule.id,
        severity: rule.severity,
        message: rule.message,
        layer: "import",
        detail: `${imp.kind}: ${imp.path}`,
      });
    }
  }
  return out;
}

function checkPatternRules(
  text: string,
  rules: PatternRule[],
  min: Severity,
  layer: "source" | "output",
): Finding[] {
  const out: Finding[] = [];
  for (const rule of rules) {
    if (!meetsSeverity(rule.severity, min)) continue;
    const re = new RegExp(rule.pattern, "gm");
    if (re.test(text)) {
      out.push({
        rule: rule.id,
        severity: rule.severity,
        message: rule.message,
        layer,
      });
    }
  }
  return out;
}

async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
}

async function collectFiles(root: string, rel: string): Promise<string[]> {
  const base = resolve(root, rel);
  if (!(await pathExists(base))) return [];

  const info = await stat(base);
  if (!info.isDirectory()) {
    const loader = loaderForFile(base);
    return loader ? [base] : [];
  }

  const files: string[] = [];
  const glob = new Bun.Glob("**/*.{ts,tsx,js,jsx,mts,cts,mjs,cjs}");
  for await (const relPath of glob.scan({ cwd: base, onlyFiles: true })) {
    const parts = relPath.split("/");
    if (parts.some((p) => SKIP_DIRS.has(p))) continue;
    const full = join(base, relPath);
    if (loaderForFile(full)) files.push(full);
  }
  return files;
}

async function scanFile(
  fullPath: string,
  repo: string,
  rules: ThreatRules,
  profile: Profile,
): Promise<FileResult> {
  const rel = relative(repo, fullPath);
  const loader = loaderForFile(fullPath);
  if (!loader) {
    return { file: rel, skipped: true, skip_reason: "unsupported extension", findings: [] };
  }

  const stat = await Bun.file(fullPath).stat();
  const maxBytes = profile.max_file_kb * 1024;
  if (stat.size > maxBytes) {
    return {
      file: rel,
      skipped: true,
      skip_reason: `file > ${profile.max_file_kb}KB`,
      findings: [],
    };
  }

  const started = performance.now();
  let source: string;
  try {
    source = await Bun.file(fullPath).text();
  } catch (e) {
    return {
      file: rel,
      skipped: true,
      skip_reason: `read failed: ${e}`,
      findings: [],
    };
  }

  const transpiler = new Bun.Transpiler({ loader, target: "bun" });
  const findings: Finding[] = [];
  let imports: Array<{ path: string; kind: ImportKind }> = [];

  try {
    if (profile.use_scan_imports) {
      imports = transpiler.scanImports(source) as Array<{ path: string; kind: ImportKind }>;
    } else {
      const scan = transpiler.scan(source);
      imports = scan.imports as Array<{ path: string; kind: ImportKind }>;
    }
    findings.push(...checkImportRules(imports, rules.import_rules, profile.min_severity));
    findings.push(...checkPatternRules(source, rules.source_rules, profile.min_severity, "source"));

    if (profile.transform_output) {
      try {
        const out = transpiler.transformSync(source);
        findings.push(...checkPatternRules(out, rules.output_rules, profile.min_severity, "output"));
      } catch (e) {
        findings.push({
          rule: "transform-error",
          severity: "info",
          message: "transformSync failed — source-only scan",
          layer: "source",
          detail: String(e),
        });
      }
    }
  } catch (e) {
    return {
      file: rel,
      skipped: true,
      skip_reason: `transpiler scan failed: ${e}`,
      findings: [],
    };
  }

  return {
    file: rel,
    findings,
    imports_scanned: imports.length,
    scan_ms: Math.round(performance.now() - started),
  };
}

async function scanTarget(
  repo: string,
  target: RepoTarget,
  rules: ThreatRules,
  profile: Profile,
): Promise<TargetResult> {
  const rel = target.path ?? ".";
  const id = target.id ?? rel;
  const started = performance.now();
  const full = resolve(repo, rel);

  if (!(await pathExists(full))) {
    return {
      id,
      path: rel,
      skipped: true,
      files_scanned: 0,
      findings: [],
      files: [],
      scan_ms: 0,
    };
  }

  const paths = await collectFiles(repo, rel);
  const files: FileResult[] = [];
  const allFindings: Finding[] = [];

  for (const filePath of paths) {
    const result = await scanFile(filePath, repo, rules, profile);
    files.push(result);
    if (!result.skipped && result.findings.length) {
      allFindings.push(...result.findings);
    }
  }

  return {
    id,
    path: rel,
    skipped: false,
    files_scanned: files.filter((f) => !f.skipped).length,
    findings: allFindings,
    files,
    scan_ms: Math.round(performance.now() - started),
  };
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const repo = resolve(String(opts.repo ?? process.cwd()));
  const only = typeof opts.only === "string" ? opts.only : "";
  const zone = typeof opts.zone === "string" ? opts.zone : "";
  const profileName = typeof opts.profile === "string" ? opts.profile : "default";
  const dryRun = opts["dry-run"] === true;

  const rulesPath = join(SKILL_ROOT, "bundle-threat-rules.json");
  const profilesPath = join(SKILL_ROOT, "bundle-threat-profiles.json");
  const mapPath = join(SKILL_ROOT, "repo-map.json");

  const [rulesRaw, profilesRaw, mapRaw] = await Promise.all([
    readFile(rulesPath, "utf8"),
    readFile(profilesPath, "utf8"),
    readFile(mapPath, "utf8"),
  ]);

  const rules = JSON.parse(rulesRaw) as ThreatRules;
  const profilesDoc = JSON.parse(profilesRaw) as { profiles: Record<string, Profile> };
  const profile = profilesDoc.profiles[profileName];
  if (!profile) {
    console.error(`bundle-threat: unknown profile '${profileName}'`);
    process.exit(1);
  }

  const map = JSON.parse(mapRaw) as { targets: RepoTarget[] };
  const targets = filterTargets(map.targets ?? [], only, zone);

  if (dryRun) {
    const payload = {
      repo,
      profile: profileName,
      dry_run: true,
      targets: targets.map((t) => ({ id: t.id, path: t.path, zone: t.zone })),
    };
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }

  const started = performance.now();
  const results: TargetResult[] = [];
  for (const target of targets) {
    results.push(await scanTarget(repo, target, rules, profile));
  }

  const payload = {
    repo,
    profile: profileName,
    description: profile.description,
    min_severity: profile.min_severity,
    elapsed_ms: Math.round(performance.now() - started),
    targets: results,
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});