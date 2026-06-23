/**
 * Parity tests for Bun.markdown — mirrors https://bun.com/docs/runtime/markdown
 */
import { describe, expect, test } from "bun:test";
import {
  MarkdownReporter,
  MARKDOWN_DOCS,
  SUPPLY_CHAIN_GFM,
  buildPackageScanMarkdown,
  buildPolicyCheckMarkdown,
  buildPolicyListMarkdown,
  buildSupplyChainMarkdown,
  enrichBundleReportMarkdown,
  enrichMarkdownSource,
  renderMarkdownDocument,
  renderPlaintext,
  renderSupplyChainHtml,
  renderSupplyChainAnsi,
  renderSupplyChainPlaintext,
} from "../../scripts/scan/transpiler/markdown-reporter.ts";
import {
  formatAnsi,
  formatHtml,
  formatJson,
  formatMarkdown,
  formatPlaintext,
  formatTerminal,
} from "../../scripts/scan/transpiler/reporter.ts";
import type { BundleScanReport } from "../../scripts/scan/transpiler/types.ts";

const sampleReport: BundleScanReport = {
  repo: "/repo",
  profile: "supply-chain-pillars",
  layer: "4.5",
  min_severity: "warn",
  format: "markdown",
  elapsed_ms: 5,
  workers: 2,
  integrity_enabled: false,
  threat_feed_enabled: true,
  advisories_matched: 1,
  targets: [{
    id: "agents",
    path: ".agents",
    skipped: false,
    files_scanned: 3,
    scan_ms: 5,
    files: [],
    findings: [{
      type: "semver",
      file: "lodash",
      line: 0,
      column: 0,
      ruleId: "lodash-prototype-policy",
      severity: "high",
      message: "upgrade lodash",
      layer: "deps",
      violationKind: "semver_rule",
      kinds: ["semver_rule", "threat"],
      remediation: {
        action: "upgrade",
        safeRange: ">=4.17.21",
        suggestedVersion: "4.17.21",
        latestInLockfile: "4.17.21",
        command: "bun add lodash@4.17.21",
      },
    }],
  }],
  summary: { files: 3, findings: 1, by_severity: { error: 1 } },
  remediation: {
    actionable: 1,
    upgrades: 1,
    removals: 0,
    commands: ["bun add lodash@4.17.21"],
  },
};

describe("Bun.markdown.html (official examples)", () => {
  test("heading and strong", () => {
    expect(Bun.markdown.html("# Hello **world**")).toBe("<h1>Hello <strong>world</strong></h1>\n");
    expect(MarkdownReporter.html("# Hello **world**", {})).toBe("<h1>Hello <strong>world</strong></h1>\n");
  });

  test("GFM tables when tables: true", () => {
    const md = "| A | B |\n| --- | --- |\n| x | y |";
    const html = Bun.markdown.html(md, { tables: true });
    expect(html).toContain("<table>");
    expect(html).toContain("<td>x</td>");
  });

  test("heading ids with headings option", () => {
    const html = Bun.markdown.html("## Hello World", { headings: { ids: true } });
    expect(html).toContain('id="hello-world"');
  });
});

describe("Bun.markdown.render (official examples)", () => {
  test("custom heading and strong callbacks", () => {
    const result = Bun.markdown.render("# Hello **world**", {
      heading: (children, { level }) => `<h${level} class="title">${children}</h${level}>`,
      strong: (children) => `<b>${children}</b>`,
      paragraph: (children) => `<p>${children}</p>`,
    });
    expect(result).toContain('<h1 class="title">Hello <b>world</b></h1>');
  });

  test("omit images with null callback", () => {
    const result = Bun.markdown.render("# Title\n\n![logo](img.png)\n\nHello", {
      image: () => null,
      heading: (children) => children,
      paragraph: (children) => children + "\n",
    });
    expect(result).not.toContain("img.png");
    expect(result).toContain("Title");
    expect(result).toContain("Hello");
  });

  test("parser options as third argument", () => {
    const result = Bun.markdown.render(
      "Visit www.example.com",
      {
        link: (children, { href }) => `[${children}](${href})`,
        paragraph: (children) => children,
      },
      { autolinks: true },
    );
    expect(result).toContain("example.com");
  });
});

describe("Bun.markdown.ansi", () => {
  test("renders headings for terminal", () => {
    const out = Bun.markdown.ansi("## Supply Chain\n\n- **high** finding");
    expect(out).toContain("Supply Chain");
    expect(out.length).toBeGreaterThan(0);
  });
});

describe("supply-chain markdown reporter", () => {
  test("MARKDOWN_DOCS points to runtime/markdown", () => {
    expect(MARKDOWN_DOCS).toContain("/runtime/markdown");
  });

  test("buildSupplyChainMarkdown includes GFM table and task list", () => {
    const md = buildSupplyChainMarkdown(sampleReport);
    expect(md).toContain("## Summary by severity");
    expect(md).toContain("| Severity | Count |");
    expect(md).toContain("## Remediation plan");
    expect(md).toContain("- [x] `bun add lodash@4.17.21`");
    expect(md).toContain("| **error** | semver_rule+threat |");
  });

  test("formatHtml uses Bun.markdown.html wrapper", () => {
    const html = formatHtml(sampleReport);
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("<table>");
    expect(html).toContain("lodash");
  });

  test("formatAnsi uses markdown ansi pipeline", () => {
    const ansi = formatAnsi(sampleReport);
    expect(ansi).toContain("Supply-Chain");
  });

  test("renderSupplyChainHtml matches reporter formatHtml", () => {
    expect(renderSupplyChainHtml(sampleReport)).toBe(formatHtml(sampleReport));
  });

  test("renderSupplyChainAnsi colored path", () => {
    const plain = renderSupplyChainAnsi(sampleReport, false);
    const colored = renderSupplyChainAnsi(sampleReport, true);
    expect(plain.length).toBeGreaterThan(0);
    expect(colored.length).toBeGreaterThan(0);
  });

  test("SUPPLY_CHAIN_GFM enables tables and tasklists", () => {
    expect(SUPPLY_CHAIN_GFM.tables).toBe(true);
    expect(SUPPLY_CHAIN_GFM.tasklists).toBe(true);
  });

  test("formatMarkdown delegates to buildSupplyChainMarkdown", () => {
    expect(formatMarkdown(sampleReport)).toBe(buildSupplyChainMarkdown(sampleReport));
  });

  test("renderPlaintext strips markdown formatting", () => {
    const md = "## Title\n\n**bold** and `code`";
    const plain = renderPlaintext(md);
    expect(plain).toContain("Title");
    expect(plain).toContain("bold");
    expect(plain).not.toContain("**");
    expect(plain).not.toContain("`");
  });

  test("renderSupplyChainPlaintext produces log-friendly output", () => {
    const plain = renderSupplyChainPlaintext(sampleReport);
    expect(plain).toContain("Supply-Chain Scan");
    expect(plain).toContain("lodash");
    expect(plain).not.toContain("| **error** |");
  });

  test("formatPlaintext matches renderSupplyChainPlaintext", () => {
    expect(formatPlaintext(sampleReport)).toBe(renderSupplyChainPlaintext(sampleReport));
  });

  test("formatTerminal routes through markdown ansi pipeline", () => {
    const term = formatTerminal(sampleReport);
    expect(term).toContain("Supply-Chain");
    expect(term).toContain("lodash");
  });

  test("enrichBundleReportMarkdown embeds rendered variants", () => {
    const enriched = enrichBundleReportMarkdown(sampleReport);
    expect(enriched.markdown?.markdown_source).toContain("# Supply-Chain Scan");
    expect(enriched.markdown?.rendered.html).toContain("<table>");
    expect(enriched.markdown?.rendered.ansi.length).toBeGreaterThan(0);
    expect(enriched.markdown?.rendered.plaintext).toContain("Remediation plan");
  });

  test("formatJson embeds markdown enrichment by default", () => {
    const json = JSON.parse(formatJson(sampleReport));
    expect(json.markdown.markdown_source).toContain("Supply-Chain");
    const html = json.markdown.rendered.html as string;
    expect(html.startsWith("<") || html.includes("id=")).toBe(true);
    expect(html).toContain("Supply-Chain Scan");
  });

  test("coloredAnsi uses task list meta for checkboxes", () => {
    const md = "- [x] done\n- [ ] todo";
    const out = MarkdownReporter.coloredAnsi(md, { ...SUPPLY_CHAIN_GFM, tasklists: true });
    expect(out).toContain("☑");
    expect(out).toContain("☐");
  });

  test("headings autolink option", () => {
    const html = Bun.markdown.html("## Hello World", {
      headings: { ids: true, autolink: true },
    });
    expect(html).toContain('id="hello-world"');
  });

  test("code blocks with language tag", () => {
    const html = Bun.markdown.html("```ts\nconst x = 1\n```", {});
    expect(html).toContain("<code");
    expect(html).toContain("const x = 1");
  });

  test("buildPackageScanMarkdown table", () => {
    const md = buildPackageScanMarkdown({
      profile: "pillars",
      targetId: "agents",
      threatFeed: true,
      findings: sampleReport.targets[0]!.findings,
      plan: sampleReport.remediation
        ? {
            totalFindings: 1,
            actionable: 1,
            upgrades: 1,
            removals: 0,
            commands: ["bun add lodash@4.17.21"],
            items: [],
          }
        : undefined,
    });
    expect(md).toContain("## Violations");
    expect(md).toContain("| Severity | Kind |");
  });

  test("buildPolicyListMarkdown sections", () => {
    const md = buildPolicyListMarkdown({
      policyVersion: 1,
      allowed: [{ package: "lodash", range: ">=4.17.21" }],
      blocked: [],
      semverRules: [],
    });
    expect(md).toContain("## Allowed floors");
    expect(md).toContain("`lodash`");
  });

  test("buildPolicyCheckMarkdown explain table", () => {
    const md = buildPolicyCheckMarkdown({
      package: "lodash",
      version: "4.17.20",
      compliant: false,
      hits: [{
        kind: "semver_rule",
        ruleId: "lodash-prototype-policy",
        severity: "high",
        message: "upgrade required",
        violated: true,
      }],
      strictestSafeRange: ">=4.17.21",
    }, { explain: true });
    expect(md).toContain("VIOLATION");
    expect(md).toContain("| Status | Kind |");
  });

  test("renderMarkdownDocument html wrapper", () => {
    const html = renderMarkdownDocument("# Test", "html");
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Test");
    expect(html.includes("<h1") || html.includes("id=\"test\"")).toBe(true);
  });

  test("enrichMarkdownSource round-trip", () => {
    const md = "# Hello\n\n| A | B |\n| - | - |\n| 1 | 2 |";
    const enriched = enrichMarkdownSource(md);
    expect(enriched.rendered.plaintext).toContain("Hello");
    expect(enriched.rendered.html).toContain("<table>");
  });
});