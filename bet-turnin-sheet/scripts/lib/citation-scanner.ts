import { REF_ID_PATTERN, type RefEntry, type RefId } from "../refs-schema";
import { anchorFromRefId } from "./ref-links";

const DOC_FILES = ["spec.html", "README.md", "OUTLINE.md", "REFS.md"] as const;

const REGISTRY_DOMAINS = [
  "bun.com",
  "effect.website",
  "grammy.dev",
  "core.telegram.org",
  "developers.google.com",
];

export interface CitationScanResult {
  citedIds: Set<RefId>;
  unknownIds: Array<{ id: string; file: string }>;
  deprecatedCited: Array<{ id: RefId; replacedBy: string | null; file: string }>;
  unusedRefs: RefEntry[];
  forbiddenUrls: Array<{ url: string; file: string; line: number }>;
  refsMdDrift: Array<{ id: RefId; expected: string; actual: string }>;
  refsMdUnparsedUrls: Array<{ id: RefId }>;
  missingAnchors: string[];
  anchorMismatches: Array<{ id: RefId; expected: string; actual: string }>;
}

function extractRefIds(text: string): string[] {
  const found = new Set<string>();

  for (const m of text.matchAll(/REFS\.md#(ref-[a-z0-9-]+)/gi)) {
    const anchor = m[1]!.toLowerCase();
    const id = anchorToId(anchor);
    if (id) found.add(id);
  }

  for (const m of text.matchAll(/data-ref=["']([^"']+)["']/gi)) {
    if (REF_ID_PATTERN.test(m[1]!)) found.add(m[1]!);
  }

  for (const m of text.matchAll(
    /\b(B0[1-8]|E0[1-5]|T0[1-5]|S0[1-5]|SPEC-0[1-9]|DOC-0[1-4])\b/g
  )) {
    found.add(m[1]!);
  }

  return [...found];
}

function anchorToId(anchor: string): string | null {
  if (anchor.startsWith("ref-spec-")) {
    const n = anchor.replace("ref-spec-", "");
    return `SPEC-${n.padStart(2, "0")}`;
  }
  if (anchor.startsWith("ref-doc-")) {
    const n = anchor.replace("ref-doc-", "");
    return `DOC-${n.padStart(2, "0")}`;
  }
  const m = anchor.match(/^ref-(b\d{2}|e\d{2}|t\d{2}|s\d{2})$/);
  if (m) return m[1]!.toUpperCase();
  return null;
}

function isAllowedUrlContext(file: string, line: string): boolean {
  if (file === "refs.json") return true;
  if (file === "REFS.md") return true;
  if (file === "spec.html") {
    if (line.includes("fonts.googleapis.com") || line.includes("fonts.gstatic.com"))
      return true;
    if (line.includes("venmo.com") || line.includes("paypal.com")) return true;
    if (line.includes("mermaid")) return true;
  }
  return false;
}

function scanForbiddenUrls(
  file: string,
  content: string
): Array<{ url: string; file: string; line: number }> {
  const violations: Array<{ url: string; file: string; line: number }> = [];
  const lines = content.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    for (const m of line.matchAll(/https:\/\/[^\s"'<>)\]]+/g)) {
      const url = m[0]!.replace(/[.,;)]+$/, "");
      if (!REGISTRY_DOMAINS.some((d) => url.includes(d))) continue;
      if (isAllowedUrlContext(file, line)) continue;
      violations.push({ url, file, line: i + 1 });
    }
  }
  return violations;
}

function parseRefsMdUrls(
  content: string,
  registry: Map<RefId, RefEntry>
): {
  drift: CitationScanResult["refsMdDrift"];
  unparsedUrls: CitationScanResult["refsMdUnparsedUrls"];
  missingAnchors: string[];
  anchorMismatches: CitationScanResult["anchorMismatches"];
} {
  const drift: CitationScanResult["refsMdDrift"] = [];
  const unparsedUrls: CitationScanResult["refsMdUnparsedUrls"] = [];
  const missingAnchors: string[] = [];
  const anchorMismatches: CitationScanResult["anchorMismatches"] = [];

  for (const ref of registry.values()) {
    if (ref.kind !== "external") continue;

    const expectedAnchor = anchorFromRefId(ref.id);
    if (ref.anchor !== expectedAnchor) {
      anchorMismatches.push({
        id: ref.id as RefId,
        expected: expectedAnchor,
        actual: ref.anchor,
      });
    }

    if (!content.includes(`id="${ref.anchor}"`) && !content.includes(`id='${ref.anchor}'`)) {
      missingAnchors.push(ref.anchor);
    }

    const escapedId = ref.id.replace(/-/g, "\\-");
    const rowRe = new RegExp(`\\|\\s*\\[${escapedId}\\]\\(#${ref.anchor}\\)\\s*\\|`, "i");
    if (!rowRe.test(content)) continue;

    const urlRe = new RegExp(
      `\\|\\s*\\[${escapedId}\\]\\(#${ref.anchor}\\)[^|]*\\|[^|]*\\|\\s*\\[[^\\]]+\\]\\(([^)]+)\\)`,
      "i"
    );
    const m = content.match(urlRe);
    if (!m) {
      unparsedUrls.push({ id: ref.id as RefId });
      continue;
    }
    const actual = m[1]!.trim();
    if (actual !== ref.url) {
      drift.push({ id: ref.id as RefId, expected: ref.url, actual });
    }
  }

  return { drift, unparsedUrls, missingAnchors, anchorMismatches };
}

export async function scanCitations(
  rootDir: string,
  registry: Map<RefId, RefEntry>
): Promise<CitationScanResult> {
  const citedIds = new Set<RefId>();
  const unknownIds: CitationScanResult["unknownIds"] = [];
  const deprecatedCited: CitationScanResult["deprecatedCited"] = [];
  const forbiddenUrls: CitationScanResult["forbiddenUrls"] = [];
  let refsMdDrift: CitationScanResult["refsMdDrift"] = [];
  let refsMdUnparsedUrls: CitationScanResult["refsMdUnparsedUrls"] = [];
  let missingAnchors: string[] = [];
  let anchorMismatches: CitationScanResult["anchorMismatches"] = [];

  for (const file of DOC_FILES) {
    const path = `${rootDir}/${file}`;
    const f = Bun.file(path);
    if (!(await f.exists())) continue;
    const content = await f.text();
    const ids = extractRefIds(content);
    for (const id of ids) {
      if (REF_ID_PATTERN.test(id)) {
        citedIds.add(id as RefId);
        const ref = registry.get(id as RefId);
        if (ref?.deprecated) {
          deprecatedCited.push({
            id: id as RefId,
            replacedBy: ref.replacedBy,
            file,
          });
        }
      } else {
        unknownIds.push({ id, file });
      }
    }
    forbiddenUrls.push(...scanForbiddenUrls(file, content));
    if (file === "REFS.md") {
      const parsed = parseRefsMdUrls(content, registry);
      refsMdDrift = parsed.drift;
      refsMdUnparsedUrls = parsed.unparsedUrls;
      missingAnchors = parsed.missingAnchors;
      anchorMismatches = parsed.anchorMismatches;
    }
  }

  // Pairings and crossRefMatrix count as citations
  const refsJson = await Bun.file(`${rootDir}/refs.json`).json();
  for (const p of refsJson.pairings ?? []) {
    for (const id of p.refs) citedIds.add(id);
  }
  for (const entry of refsJson.crossRefMatrix ?? []) {
    citedIds.add(entry.spec);
    for (const id of entry.externalRefs) citedIds.add(id);
  }

  const unusedRefs = [...registry.values()].filter((r) => !citedIds.has(r.id as RefId));

  return {
    citedIds,
    unknownIds,
    deprecatedCited,
    unusedRefs,
    forbiddenUrls,
    refsMdDrift,
    refsMdUnparsedUrls,
    missingAnchors,
    anchorMismatches,
  };
}
