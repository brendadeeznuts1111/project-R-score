import type { BundleScanReport, ScanResult } from "./types.ts";
import { dedupeNetworkFindings } from "./network-matcher.ts";
import type { PackageEvaluation } from "./policy-engine.ts";
import type { RemediationReport } from "./remediation-plan.ts";
import { normalizeSeverity } from "./rule-engine.ts";
import { colorize, severityColor } from "./terminal-color.ts";

export type ReportRenderFormat = "json" | "html" | "markdown" | "ansi" | "plaintext";

export type MarkdownEnrichment = {
  markdown_source: string;
  rendered: {
    html: string;
    ansi: string;
    ansi_colored: string;
    plaintext: string;
  };
};

/** @see https://bun.com/docs/runtime/markdown */
export const MARKDOWN_DOCS = "https://bun.com/docs/runtime/markdown";

export type MarkdownParserOptions = {
  tables?: boolean;
  strikethrough?: boolean;
  tasklists?: boolean;
  tagFilter?: boolean;
  autolinks?: boolean | { url?: boolean; www?: boolean; email?: boolean };
  headings?: boolean | { ids?: boolean; autolink?: boolean };
  hardSoftBreaks?: boolean;
  wikiLinks?: boolean;
  underline?: boolean;
  latexMath?: boolean;
  collapseWhitespace?: boolean;
  permissiveAtxHeaders?: boolean;
  noIndentedCodeBlocks?: boolean;
  noHtmlBlocks?: boolean;
  noHtmlSpans?: boolean;
};

/** GFM defaults aligned with Bun.markdown docs (explicit opt-in per option table). */
export const SUPPLY_CHAIN_GFM: MarkdownParserOptions = {
  tables: true,
  strikethrough: true,
  tasklists: true,
  tagFilter: true,
  autolinks: true,
  headings: { ids: true },
};

export class MarkdownReporter {
  static html(markdown: string, options: MarkdownParserOptions = SUPPLY_CHAIN_GFM): string {
    return Bun.markdown.html(markdown, options);
  }

  static ansi(markdown: string, options: MarkdownParserOptions = SUPPLY_CHAIN_GFM): string {
    return Bun.markdown.ansi(markdown, options);
  }

  static render(
    markdown: string,
    callbacks: Parameters<typeof Bun.markdown.render>[1],
    options: MarkdownParserOptions = SUPPLY_CHAIN_GFM,
  ): string {
    return Bun.markdown.render(markdown, callbacks, options);
  }

  static coloredAnsi(markdown: string, options: MarkdownParserOptions = SUPPLY_CHAIN_GFM): string {
    return MarkdownReporter.render(markdown, {
      heading: (children, meta) => {
        const level = meta?.level ?? 1;
        const palette = level <= 1 ? "#38bdf8" : level === 2 ? "#a78bfa" : "#94a3b8";
        return colorize(`${children}\n`, palette);
      },
      paragraph: (children) => `${children}\n`,
      strong: (children) => colorize(children, severityColor("high")),
      emphasis: (children) => colorize(children, "#06b6d4"),
      codespan: (children) => colorize(children, "#a78bfa"),
      link: (children) => colorize(children, "#38bdf8"),
      list: (children) => children,
      listItem: (children, meta) => {
        const bullet = meta?.checked === true ? "☑" : meta?.checked === false ? "☐" : "•";
        return `  ${bullet} ${children.trimEnd()}\n`;
      },
      table: (children) => children,
      thead: (children) => children,
      tbody: (children) => children,
      tr: (children) => children,
      th: (children) => colorize(children, "#e2e8f0"),
      td: (children) => children,
      blockquote: (children) => colorize(`> ${children}`, "#94a3b8"),
      hr: () => colorize("─".repeat(40), "#334155") + "\n",
      strikethrough: (children) => colorize(children, "#64748b"),
      text: (children) => children,
    }, options);
  }

  /** Strip formatting — CI/log-friendly plain text per Bun.markdown.render docs. */
  static plaintext(markdown: string, options: MarkdownParserOptions = SUPPLY_CHAIN_GFM): string {
    return MarkdownReporter.render(markdown, {
      heading: (children) => `${children}\n`,
      paragraph: (children) => `${children}\n`,
      strong: (children) => children,
      emphasis: (children) => children,
      codespan: (children) => children,
      code: (children) => `${children}\n`,
      link: (children) => children,
      list: (children) => children,
      listItem: (children, meta) => {
        const mark = meta?.checked === true ? "[x]" : meta?.checked === false ? "[ ]" : "-";
        return `${mark} ${children.trimEnd()}\n`;
      },
      table: (children) => children,
      thead: (children) => children,
      tbody: (children) => children,
      tr: (children) => children,
      th: (children) => `${children}\t`,
      td: (children) => `${children}\t`,
      blockquote: (children) => `${children}\n`,
      hr: () => "\n",
      strikethrough: (children) => children,
      text: (children) => children,
      image: () => "",
    }, options);
  }
}

export function renderPlaintext(markdown: string): string {
  return MarkdownReporter.plaintext(markdown);
}

export function enrichMarkdownSource(markdown: string): MarkdownEnrichment {
  return {
    markdown_source: markdown,
    rendered: {
      html: MarkdownReporter.html(markdown),
      ansi: MarkdownReporter.ansi(markdown),
      ansi_colored: MarkdownReporter.coloredAnsi(markdown),
      plaintext: MarkdownReporter.plaintext(markdown),
    },
  };
}

export function enrichBundleReportMarkdown(report: BundleScanReport): BundleScanReport & { markdown?: MarkdownEnrichment } {
  const md = buildSupplyChainMarkdown(report);
  return { ...report, markdown: enrichMarkdownSource(md) };
}

export function buildSupplyChainMarkdown(report: BundleScanReport): string {
  const lines: string[] = [
    `# Supply-Chain Scan (Layer ${report.layer})`,
    "",
    `- **repo:** ${report.repo}`,
    `- **profile:** ${report.profile}`,
    `- **elapsed:** ${report.elapsed_ms}ms`,
    `- **workers:** ${report.workers}`,
    `- **findings:** ${report.summary.findings} across ${report.summary.files} files`,
  ];

  const sevRows = Object.entries(report.summary.by_severity)
    .sort(([a], [b]) => a.localeCompare(b));
  if (sevRows.length) {
    lines.push("", "## Summary by severity", "", "| Severity | Count |", "| --- | ---: |");
    for (const [sev, count] of sevRows) {
      lines.push(`| ${sev} | ${count} |`);
    }
  }

  if (report.platform) {
    lines.push(
      `- **platform host:** ${report.platform.host.cpu}/${report.platform.host.os}`
      + ` (${report.platform.host.rawArch})`,
      `- **platform target:** ${report.platform.target.cpu}/${report.platform.target.os}`
      + (report.platform.crossTarget ? " _(cross-target)_" : " _(native)_"),
    );
    if (report.platform.installProfile) {
      lines.push(`- **install profile:** ${report.platform.installProfile}`);
    }
    if (report.platform.installArgs.length) {
      lines.push(`- **install args:** \`${report.platform.installArgs.join(" ")}\``);
    }
  }

  if (report.network?.enabled) {
    lines.push(
      `- **network audit:** ${report.network.total} raw / ${report.network.unique_total} unique hit(s)`,
    );
    const surfaces = Object.entries(report.network.by_surface).sort(([, a], [, b]) => b - a);
    if (surfaces.length) {
      lines.push("", "## Network surfaces", "", "| Surface | Count |", "| --- | ---: |");
      for (const [surface, count] of surfaces) {
        lines.push(`| \`${surface}\` | ${count} |`);
      }
    }
    const hotspots = report.network.hotspots ?? report.network.by_file?.slice(0, 15) ?? [];
    if (report.endpoints) {
      lines.push(
        `- **api catalog:** ${report.endpoints.total} endpoints`
        + ` (${report.endpoints.health_count} health)`
        + (report.endpoints.title ? ` — ${report.endpoints.title}` : ""),
      );
    }
    if (report.health?.probed) {
      lines.push(`- **live health:** ${report.health.overall} @ ${report.health.base_url}`);
    }

    if (hotspots.length) {
      lines.push("", "## Network hotspots", "", "| Chunk | Hits | Surfaces | Top rules |", "| --- | ---: | --- | --- |");
      for (const row of hotspots) {
        const surf = Object.entries(row.surfaces)
          .map(([k, v]) => `${k}:${v}`)
          .join(", ");
        const rules = row.uniqueRules.slice(0, 3).map((r) => `\`${r}\``).join(", ")
          + (row.uniqueRules.length > 3 ? ` +${row.uniqueRules.length - 3}` : "");
        lines.push(`| \`${row.basename}\` | ${row.hits} | ${surf} | ${rules} |`);
      }
    }

    if (report.health?.probed) {
      lines.push("", "## Live health probes", "", "| Path | HTTP | Latency | Status |", "| --- | ---: | ---: | --- |");
      for (const p of report.health.probes) {
        const path = p.url.replace(report.health.base_url, "") || p.url;
        const status = p.error ?? (p.ok ? "ok" : "fail");
        lines.push(`| \`${path}\` | ${p.status || "—"} | ${p.latency_ms}ms | ${status} |`);
      }
    }

    if (report.endpoints?.health_routes.length) {
      lines.push("", "## API health endpoints", "", "| Method | Path | Summary |", "| --- | --- | --- |");
      for (const r of report.endpoints.health_routes) {
        lines.push(`| ${r.method} | \`${r.path}\` | ${r.summary ?? ""} |`);
      }
    }

    const tagRows = Object.entries(report.endpoints?.by_tag ?? {})
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8);
    if (tagRows.length) {
      lines.push("", "## API endpoints by tag", "", "| Tag | Count |", "| --- | ---: |");
      for (const [tag, count] of tagRows) lines.push(`| ${tag} | ${count} |`);
    }
  }

  if (report.threat_feed_enabled) {
    lines.push(`- **threat-feed:** ${report.advisories_matched} CVE advisory match(es)`);
  }

  if (report.remediation?.actionable) {
    lines.push(
      `- **remediation:** ${report.remediation.actionable} actionable`
      + ` (${report.remediation.upgrades} upgrade, ${report.remediation.removals} remove)`,
      "",
      "## Remediation plan",
      "",
    );
    for (const cmd of report.remediation.commands.slice(0, 20)) {
      const done = cmd.startsWith("bun remove") ? " " : "x";
      lines.push(`- [${done}] \`${cmd}\``);
    }
    if (report.remediation.commands.length > 20) {
      lines.push(`- _... ${report.remediation.commands.length - 20} more_`);
    }
  }

  lines.push("");
  for (const t of report.targets) {
    if (t.skipped) {
      lines.push(`## ${t.id} — SKIP (${t.path})`, "");
      continue;
    }
    lines.push(`## ${t.id} (${t.path})`, "");
    if (!t.findings.length) {
      lines.push("_clean_", "");
      continue;
    }
    const tableFindings = report.network?.enabled
      ? dedupeNetworkFindings(t.findings)
      : t.findings;
    if (report.network?.enabled && tableFindings.length < t.findings.length) {
      lines.push(`_${t.findings.length} raw → ${tableFindings.length} unique in table_`, "");
    }
    lines.push("| Severity | Kind | Rule | Location | Message |", "| --- | --- | --- | --- | --- |");
    for (const f of tableFindings.slice(0, 100)) {
      const kind = f.kinds?.length
        ? f.kinds.join("+")
        : f.violationKind ?? "";
      const loc = f.layer === "deps" ? f.file : `${f.file}:${f.line}`;
      const msg = f.remediation?.command
        ? `${f.message} → \`${f.remediation.command}\``
        : f.message;
      lines.push(
        `| **${normalizeSeverity(f.severity)}** | ${kind} | \`${f.ruleId}\` | ${loc} | ${msg.replace(/\|/g, "\\|")} |`,
      );
    }
    if (tableFindings.length > 100) {
      lines.push(`| _more_ | | | | ${tableFindings.length - 100} additional findings |`);
    }
    lines.push("");
  }
  return `${lines.join("\n")}\n`;
}

export function renderSupplyChainHtml(report: BundleScanReport): string {
  const md = buildSupplyChainMarkdown(report);
  const body = MarkdownReporter.html(md, SUPPLY_CHAIN_GFM);
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Supply-Chain Scan</title>`
    + `<style>body{font-family:system-ui;margin:2rem;max-width:1100px}`
    + `table{border-collapse:collapse;width:100%;margin:1rem 0}`
    + `th,td{border:1px solid #ccc;padding:.45rem .6rem;text-align:left}`
    + `th{background:#f4f4f4}code{font-size:.85em;background:#f8fafc;padding:.1rem .25rem;border-radius:3px}</style>`
    + `</head><body>${body}</body></html>\n`;
}

export function renderSupplyChainAnsi(report: BundleScanReport, colored = true): string {
  const md = buildSupplyChainMarkdown(report);
  return colored ? MarkdownReporter.coloredAnsi(md) : MarkdownReporter.ansi(md);
}

export function renderSupplyChainPlaintext(report: BundleScanReport): string {
  return MarkdownReporter.plaintext(buildSupplyChainMarkdown(report));
}

export function renderMarkdownDocument(
  markdown: string,
  format: ReportRenderFormat,
  options: { colored?: boolean } = {},
): string {
  switch (format) {
    case "html":
      return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Supply-Chain Report</title>`
        + `<style>body{font-family:system-ui;margin:2rem;max-width:1100px}`
        + `table{border-collapse:collapse;width:100%}th,td{border:1px solid #ccc;padding:.45rem .6rem}</style>`
        + `</head><body>${MarkdownReporter.html(markdown)}</body></html>\n`;
    case "markdown":
      return markdown.endsWith("\n") ? markdown : `${markdown}\n`;
    case "ansi":
      return options.colored !== false
        ? MarkdownReporter.coloredAnsi(markdown)
        : MarkdownReporter.ansi(markdown);
    case "plaintext":
      return MarkdownReporter.plaintext(markdown);
    default:
      return `${JSON.stringify({ markdown_source: markdown, ...enrichMarkdownSource(markdown) }, null, 2)}\n`;
  }
}

function findingTableRows(findings: ScanResult[], limit = 100): string[] {
  const lines = ["| Severity | Kind | Rule | Location | Message |", "| --- | --- | --- | --- | --- |"];
  for (const f of findings.slice(0, limit)) {
    const kind = f.kinds?.length ? f.kinds.join("+") : f.violationKind ?? "";
    const loc = f.layer === "deps" ? f.file : `${f.file}:${f.line}`;
    const msg = f.remediation?.command
      ? `${f.message} → \`${f.remediation.command}\``
      : f.message;
    lines.push(
      `| **${normalizeSeverity(f.severity)}** | ${kind} | \`${f.ruleId}\` | ${loc} | ${msg.replace(/\|/g, "\\|")} |`,
    );
  }
  if (findings.length > limit) {
    lines.push(`| _more_ | | | | ${findings.length - limit} additional findings |`);
  }
  return lines;
}

export function buildPackageScanMarkdown(payload: {
  layer?: string;
  profile?: string;
  targetId?: string;
  threatFeed?: boolean;
  clean?: boolean;
  findings: ScanResult[];
  plan?: RemediationReport;
  fixesApplied?: string[];
}): string {
  const lines: string[] = [
    `# Package Policy Scan (Layer ${payload.layer ?? "5"})`,
    "",
    `- **profile:** ${payload.profile ?? "default"}`,
    `- **target:** ${payload.targetId ?? "?"}`,
    `- **threat-feed:** ${payload.threatFeed ? "on" : "off"}`,
    `- **findings:** ${payload.findings.length}`,
    `- **status:** ${payload.clean || payload.findings.length === 0 ? "clean" : "violations"}`,
  ];

  if (payload.plan?.items.length) {
    lines.push(
      "",
      "## Remediation plan",
      "",
      `_${payload.plan.actionable} actionable (${payload.plan.upgrades} upgrade · ${payload.plan.removals} remove)_`,
      "",
    );
    for (const item of payload.plan.items.slice(0, 20)) {
      const done = item.action === "remove" ? " " : "x";
      lines.push(`- [${done}] \`${item.command}\` — ${item.package}@${item.currentVersion}`);
    }
  }

  if (payload.findings.length) {
    lines.push("", "## Violations", "", ...findingTableRows(payload.findings));
  } else {
    lines.push("", "_All packages satisfy policies._");
  }

  if (payload.fixesApplied?.length) {
    lines.push("", "## Fixes applied", "");
    for (const cmd of payload.fixesApplied) lines.push(`- \`${cmd}\``);
  }

  return `${lines.join("\n")}\n`;
}

export function buildPolicyListMarkdown(payload: {
  policyVersion?: number;
  scannerVersion?: string;
  allowed: Array<{ package: string; range: string }>;
  blocked: Array<{ package: string; range: string }>;
  semverRules: Array<{ id: string; package: string; range: string; safeRange?: string; severity: string }>;
}): string {
  const lines: string[] = [
    "# Policy Constraints (Layer 5)",
    "",
    `- **policy version:** ${payload.policyVersion ?? "?"}`,
    `- **scanner:** ${payload.scannerVersion ?? "?"}`,
    "",
    "## Allowed floors",
    "",
    "| Package | Range |",
    "| --- | --- |",
  ];
  for (const row of payload.allowed) lines.push(`| \`${row.package}\` | ${row.range} |`);
  lines.push("", "## Blocked ranges", "", "| Package | Range |", "| --- | --- |");
  for (const row of payload.blocked) lines.push(`| \`${row.package}\` | ${row.range} |`);
  lines.push("", "## Semver rules", "", "| Severity | Rule | Package | Range | Safe |", "| --- | --- | --- | --- | --- |");
  for (const row of payload.semverRules) {
    lines.push(`| **${row.severity}** | \`${row.id}\` | ${row.package} | ${row.range} | ${row.safeRange ?? ""} |`);
  }
  return `${lines.join("\n")}\n`;
}

export function buildPolicyCheckMarkdown(
  evaluation: PackageEvaluation,
  options: { explain?: boolean } = {},
): string {
  const status = evaluation.compliant ? "COMPLIANT" : "VIOLATION";
  const lines: string[] = [
    `# Policy Check — ${evaluation.package}@${evaluation.version}`,
    "",
    `**${status}**`,
  ];
  if (evaluation.strictestSafeRange) {
    lines.push("", `- **strictest safe range:** \`${evaluation.strictestSafeRange}\``);
  }
  const hits = options.explain
    ? evaluation.hits
    : evaluation.hits.filter((h) => h.violated);
  if (hits.length) {
    lines.push("", "## Constraint hits", "", "| Status | Kind | Rule | Message |", "| --- | --- | --- | --- |");
    for (const hit of hits) {
      const mark = hit.violated ? "✗" : "✓";
      lines.push(`| ${mark} | **${hit.kind}** | \`${hit.ruleId}\` | ${hit.message.replace(/\|/g, "\\|")} |`);
    }
  }
  return `${lines.join("\n")}\n`;
}