import type { BundleScanReport, ScanResult, Severity, ViolationKind } from "./types.ts";
import type { RemediationPlanItem, RemediationReport } from "./remediation-plan.ts";
import { ColorMatcher, COLOR_DOCS } from "./color-matcher.ts";
import { normalizeSeverity } from "./rule-engine.ts";

export { COLOR_DOCS };

const RESET = "\x1b[0m";

const SEVERITY_PALETTE: Record<string, string> = {
  critical: "#dc2626",
  error: "#ef4444",
  high: "#f97316",
  warn: "#eab308",
  medium: "#eab308",
  info: "#06b6d4",
  low: "#94a3b8",
};

const KIND_PALETTE: Record<ViolationKind, string> = {
  blocked: "#a855f7",
  threat: "#f43f5e",
  semver_rule: "#3b82f6",
  allowed: "#22c55e",
};

const ACTION_PALETTE = {
  upgrade: "#22c55e",
  remove: "#f97316",
  ok: "#22c55e",
  warn: "#eab308",
  muted: "#94a3b8",
  accent: "#a78bfa",
};

export function supportsColor(): boolean {
  return Boolean(ColorMatcher.toAnsi("red", "ansi-16m"));
}

export function colorAnsi(
  input: string,
  outputFormat: "ansi" | "ansi-16m" | "ansi-256" | "ansi-16" = "ansi",
): string {
  return ColorMatcher.toAnsi(input, outputFormat);
}

export function colorize(text: string, cssColor: string, depth: "ansi" | "ansi-16m" = "ansi"): string {
  const ansi = ColorMatcher.toAnsi(cssColor, depth);
  if (!ansi) return text;
  return `${ansi}${text}${RESET}`;
}

export function severityColor(severity: Severity | string): string {
  const key = normalizeSeverity(severity as Severity);
  return SEVERITY_PALETTE[key] ?? SEVERITY_PALETTE[severity.toLowerCase()] ?? "#e2e8f0";
}

export function severityHex(severity: Severity | string): string {
  return ColorMatcher.toHex(severityColor(severity)) ?? "#94a3b8";
}

export function kindColor(kind: ViolationKind | string): string {
  return KIND_PALETTE[kind as ViolationKind] ?? ACTION_PALETTE.accent;
}

export function severityTag(severity: Severity | string): string {
  return colorize(`[${severity}]`, severityColor(severity));
}

export function kindTag(kinds: string[]): string {
  if (!kinds.length) return "";
  const primary = kinds[0] ?? "";
  return colorize(` [${kinds.join("+")}]`, kindColor(primary));
}

export function fixLine(command: string): string {
  return colorize(`→ ${command}`, ACTION_PALETTE.upgrade);
}

export function removeLine(command: string): string {
  return colorize(`→ ${command}`, ACTION_PALETTE.remove);
}

export function warnLine(text: string): string {
  return colorize(text, ACTION_PALETTE.warn);
}

export function okLine(text: string): string {
  return colorize(text, ACTION_PALETTE.ok);
}

export function mutedLine(text: string): string {
  return colorize(text, ACTION_PALETTE.muted);
}

export function formatFindingLine(f: ScanResult): string {
  const kinds = f.kinds?.length
    ? f.kinds
    : f.violationKind
      ? [f.violationKind]
      : [];
  const cve = f.cve ? mutedLine(` (${f.cve})`) : "";
  const loc = f.layer === "deps" ? f.file : `${f.file}:${f.line}:${f.column}`;
  let line = `${warnLine("⚠")}  ${severityTag(f.severity)}${kindTag(kinds)} ${loc} — ${f.ruleId}${cve}`;
  line += `\n    ${f.message}`;
  if (f.remediation?.command) {
    const cmd = f.remediation.action === "remove"
      ? removeLine(f.remediation.command)
      : fixLine(f.remediation.command);
    line += `\n    ${cmd}`;
    if (f.remediation.reason) line += `\n    ${mutedLine(f.remediation.reason)}`;
  }
  return line;
}

export function formatRemediationItem(item: RemediationPlanItem): string {
  const action = item.action === "remove" ? "REMOVE" : "UPGRADE";
  const actionColor = item.action === "remove" ? ACTION_PALETTE.remove : ACTION_PALETTE.upgrade;
  const head = colorize(`[${action}]`, actionColor);
  return `${head} ${item.package}@${item.currentVersion} — ${item.command}\n    ${mutedLine(item.reason)}`;
}

export function formatRemediationPlan(plan: RemediationReport): string {
  if (!plan.items.length) return okLine("No actionable remediations.");
  const lines = [
    colorize(`Remediation plan (${plan.actionable})`, ACTION_PALETTE.accent),
    mutedLine(`${plan.upgrades} upgrade · ${plan.removals} remove`),
  ];
  for (const item of plan.items.slice(0, 20)) {
    lines.push(formatRemediationItem(item));
  }
  if (plan.items.length > 20) lines.push(mutedLine(`... ${plan.items.length - 20} more`));
  return lines.join("\n");
}

export function formatTerminalReport(report: BundleScanReport): string {
  const lines: string[] = [
    colorize(`Supply-Chain Scan (Layer ${report.layer})`, "#38bdf8"),
    mutedLine(`${report.repo} · profile=${report.profile} · ${report.elapsed_ms}ms`),
    mutedLine(
      `${report.summary.findings} finding(s) in ${report.summary.files} file(s)`
      + (report.threat_feed_enabled ? ` · ${report.advisories_matched} CVE match(es)` : ""),
    ),
  ];

  if (report.remediation?.commands.length) {
    lines.push("");
    lines.push(colorize("Remediation commands", ACTION_PALETTE.upgrade));
    for (const cmd of report.remediation.commands.slice(0, 15)) {
      lines.push(`  ${cmd.startsWith("bun remove") ? removeLine(cmd) : fixLine(cmd)}`);
    }
  }

  for (const t of report.targets) {
    lines.push("");
    if (t.skipped) {
      lines.push(mutedLine(`## ${t.id} — SKIP (${t.path})`));
      continue;
    }
    lines.push(colorize(`## ${t.id} (${t.path})`, "#38bdf8"));
    if (!t.findings.length) {
      lines.push(okLine("  clean"));
      continue;
    }
    for (const f of t.findings.slice(0, 50)) {
      lines.push(formatFindingLine(f));
    }
    if (t.findings.length > 50) lines.push(mutedLine(`  ... ${t.findings.length - 50} more`));
  }
  return `${lines.join("\n")}\n`;
}

export function severityBadgeStyle(severity: Severity | string): string {
  const bg = severityHex(severity);
  const rgba = ColorMatcher.toRgba(bg) ?? ColorMatcher.toRgba(severityColor(severity));
  const fg = rgba && (rgba.r * 0.299 + rgba.g * 0.587 + rgba.b * 0.114) > 160 ? "#111827" : "#ffffff";
  return `background:${bg};color:${fg};padding:.15rem .45rem;border-radius:.25rem;font-size:.8em;font-weight:600`;
}

export function enrichFindingColors(f: ScanResult): ScanResult & { colors?: { severity: string; kinds?: string[] } } {
  const kinds = f.kinds ?? (f.violationKind ? [f.violationKind] : undefined);
  return {
    ...f,
    colors: {
      severity: severityHex(f.severity),
      kinds: kinds?.map((k) => ColorMatcher.toHex(kindColor(k)) ?? kindColor(k)),
    },
  };
}