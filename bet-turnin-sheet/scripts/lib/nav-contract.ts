import { expectedNavAttrs } from "./ref-links";
import type { RefEntry, RefId } from "../refs-schema";

export interface NavViolation {
  message: string;
  line?: number;
  dataRef?: string;
}

export interface NavContractResult {
  passed: boolean;
  violations: NavViolation[];
  checked: number;
}

const REGISTRY_DOMAIN_RE =
  /href=["']https:\/\/(?:bun\.com|effect\.website|grammy\.dev|core\.telegram\.org|developers\.google\.com)/;

function extractNavAnchors(html: string): Array<{ href: string; dataRef: string | null; line: number; classes: string }> {
  const lines = html.split("\n");
  const anchors: Array<{ href: string; dataRef: string | null; line: number; classes: string }> = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (!line.includes("ref-nav")) continue;
    if (line.trimStart().startsWith("<!--")) continue;

    const hrefM = line.match(/href=["']([^"']+)["']/);
    if (!hrefM) continue;

    const dataRefM = line.match(/data-ref=["']([^"']+)["']/);
    const classM = line.match(/class=["']([^"']+)["']/);
    const classes = classM?.[1] ?? "";

    anchors.push({
      href: hrefM[1]!,
      dataRef: dataRefM?.[1] ?? null,
      line: i + 1,
      classes,
    });
  }

  return anchors;
}

export function validateNavContract(
  html: string,
  registry: Map<RefId, RefEntry>
): NavContractResult {
  const violations: NavViolation[] = [];
  const anchors = extractNavAnchors(html);

  for (const a of anchors) {
    if (REGISTRY_DOMAIN_RE.test(html.split("\n")[a.line - 1] ?? "")) {
      violations.push({
        message: "External doc URL in registry nav block",
        line: a.line,
      });
    }

    if (!a.dataRef) {
      violations.push({
        message: "Missing data-ref on registry nav link",
        line: a.line,
      });
      continue;
    }

    const ref = registry.get(a.dataRef as RefId);
    if (!ref) {
      violations.push({
        message: `Unknown data-ref: ${a.dataRef}`,
        line: a.line,
        dataRef: a.dataRef,
      });
      continue;
    }

    const expected = expectedNavAttrs(ref);
    if (a.href !== expected.href) {
      violations.push({
        message: `href mismatch for ${a.dataRef}: got ${a.href}, expected ${expected.href}`,
        line: a.line,
        dataRef: a.dataRef,
      });
    }

    if (!a.classes.includes("ref-nav")) {
      violations.push({
        message: `Missing ref-nav class on ${a.dataRef}`,
        line: a.line,
        dataRef: a.dataRef,
      });
    }
  }

  // Flag any remaining external doc URLs on sidebar-link without ref-nav
  const lines = html.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.includes("sidebar-link") && line.includes("ref-nav") && REGISTRY_DOMAIN_RE.test(line)) {
      violations.push({
        message: "ref-nav sidebar link uses external URL instead of REFS.md#ref-*",
        line: i + 1,
      });
    }
  }

  return {
    passed: violations.length === 0,
    violations,
    checked: anchors.length,
  };
}
