import type { ImportKind, PolicyRule, ScanLayer, ScanProfile, ScanResult } from "./types.ts";
import { meetsSeverity, normalizeSeverity, resolvePattern } from "./rule-engine.ts";
import { checkIntegrity, sha256File } from "./integrity.ts";
import type { IntegrityManifest } from "./integrity.ts";

export type Loader = "js" | "jsx" | "ts" | "tsx";

export function loaderForFile(file: string): Loader | null {
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

function lineColumn(text: string, index: number): { line: number; column: number } {
  const before = text.slice(0, index);
  const lines = before.split("\n");
  return { line: lines.length, column: (lines.at(-1)?.length ?? 0) + 1 };
}

function snippetAt(text: string, index: number): string {
  const start = Math.max(0, index - 40);
  const end = Math.min(text.length, index + 80);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function matchRegexRules(
  text: string,
  rules: PolicyRule[],
  layer: ScanLayer,
  relFile: string,
  min: ScanProfile["min_severity"],
): ScanResult[] {
  const out: ScanResult[] = [];
  for (const rule of rules) {
    if (!meetsSeverity(rule.severity, min)) continue;
    const pat = resolvePattern(rule);
    if (!pat) continue;
    const re = new RegExp(pat, "gmu");
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) {
      const { line, column } = lineColumn(text, m.index);
      out.push({
        type: "transpiler",
        file: relFile,
        line,
        column,
        ruleId: rule.id,
        severity: normalizeSeverity(rule.severity),
        message: rule.message ?? rule.description,
        layer,
        snippet: snippetAt(text, m.index),
      });
      if (!re.global) break;
    }
  }
  return out;
}

function matchImportRules(
  imports: Array<{ path: string; kind: ImportKind }>,
  rules: PolicyRule[],
  relFile: string,
  min: ScanProfile["min_severity"],
): ScanResult[] {
  const out: ScanResult[] = [];
  for (const imp of imports) {
    for (const rule of rules) {
      if (rule.kind && rule.kind !== imp.kind) continue;
      if (rule.path_pattern && !new RegExp(rule.path_pattern).test(imp.path)) continue;
      if (!meetsSeverity(rule.severity, min)) continue;
      out.push({
        type: "transpiler",
        file: relFile,
        line: 1,
        column: 1,
        ruleId: rule.id,
        severity: normalizeSeverity(rule.severity),
        message: rule.message ?? rule.description,
        layer: "import",
        detail: `${imp.kind}: ${imp.path}`,
      });
    }
  }
  return out;
}

export async function analyzeFile(options: {
  fullPath: string;
  repo: string;
  rules: { import_rules: PolicyRule[]; source_rules: PolicyRule[]; output_rules: PolicyRule[] };
  profile: ScanProfile;
  manifest: IntegrityManifest | null;
}): Promise<{
  file: string;
  skipped?: boolean;
  skip_reason?: string;
  findings: ScanResult[];
  imports_scanned?: number;
  scan_ms?: number;
  sha256?: string;
}> {
  const { fullPath, repo, rules, profile, manifest } = options;
  const rel = fullPath.startsWith(repo)
    ? fullPath.slice(repo.length + 1)
    : fullPath;
  const loader = loaderForFile(fullPath);
  if (!loader) {
    return { file: rel, skipped: true, skip_reason: "unsupported extension", findings: [] };
  }

  const stat = await Bun.file(fullPath).stat();
  const maxBytes = profile.max_file_kb * 1024;
  if (stat.size > maxBytes) {
    return { file: rel, skipped: true, skip_reason: `file > ${profile.max_file_kb}KB`, findings: [] };
  }

  const started = performance.now();
  let source: string;
  try {
    source = await Bun.file(fullPath).text();
  } catch (e) {
    return { file: rel, skipped: true, skip_reason: `read failed: ${e}`, findings: [] };
  }

  const sha256 = await sha256File(fullPath);
  const integrity = checkIntegrity(rel, sha256, manifest);
  const findings: ScanResult[] = [];

  if (integrity.mismatch) {
    findings.push({
      type: "transpiler",
      file: rel,
      line: 1,
      column: 1,
      ruleId: "integrity-mismatch",
      severity: "error",
      message: "File hash mismatch — possible tampering",
      layer: "integrity",
      hashBefore: integrity.expected,
      hashAfter: sha256,
      integrityMismatch: true,
    });
  }

  const transpiler = new Bun.Transpiler({ loader, target: "bun" });
  let imports: Array<{ path: string; kind: ImportKind }> = [];

  try {
    if (profile.use_scan_imports) {
      imports = transpiler.scanImports(source) as Array<{ path: string; kind: ImportKind }>;
    } else {
      const scan = transpiler.scan(source);
      imports = scan.imports as Array<{ path: string; kind: ImportKind }>;
    }
    findings.push(...matchImportRules(imports, rules.import_rules, rel, profile.min_severity));
    findings.push(...matchRegexRules(source, rules.source_rules, "source", rel, profile.min_severity));

    if (profile.transform_output) {
      try {
        const out = transpiler.transformSync(source);
        findings.push(...matchRegexRules(out, rules.output_rules, "output", rel, profile.min_severity));
      } catch (e) {
        findings.push({
          type: "transpiler",
          file: rel,
          line: 1,
          column: 1,
          ruleId: "transform-error",
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
    sha256,
  };
}