/**
 * Blog release token matching — shared by release scrape and codeblock join.
 *
 * @see ../../tools/bun-docs-releases.ts — scrape orchestration
 * @see ./blog-codeblock-join.ts — CodeBlock → catalog examples
 */

export type SectionKind = 'ship' | 'fix' | 'chg' | 'stabilize' | 'skip';

export type TokenIndex = Map<string, string>;

const TOKEN_PATTERNS = [
  /\b(Bun\.[A-Za-z][\w.]*)\b/g,
  /\b(bun:[a-z][\w-]*)\b/g,
  /(--[a-zA-Z][\w-]+)/g,
  /\b(BUN_[A-Z][A-Z0-9_]*)\b/g,
] as const;

const CHG_HEADING_RE = /^(improvements?|changes?|breaking changes?|what'?s changed)\b/i;

const SKIP_HEADING_RE =
  /^(upgraded|updated|performance|memory|faster|reduced|smaller|cross-language|thanks|contributors|installing|release notes)/i;

export function normalizeTokenKey(name: string): string {
  return name
    .trim()
    .replace(/^bun\./i, 'Bun.')
    .replace(/^--/, '--')
    .toLowerCase();
}

export function classifySectionHeading(heading: string): SectionKind {
  const t = heading.toLowerCase().trim();
  if (!t) return 'skip';
  if (/^bug\s*fix|^bugfixes|^fixed\b/.test(t)) return 'fix';
  if (/stabiliz|graduat/.test(t)) return 'stabilize';
  if (CHG_HEADING_RE.test(t)) return 'chg';
  if (/new feature|^added\b/.test(t)) return 'ship';
  if (SKIP_HEADING_RE.test(t)) return 'skip';
  if (/^bun\.|^--|support in|built-in|\bapi\b|client for/i.test(heading)) return 'ship';
  return 'ship';
}

export function extractTokenCandidates(text: string): string[] {
  const found = new Set<string>();
  for (const re of TOKEN_PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) {
      const raw = m[1]!.trim();
      if (raw.length < 3) continue;
      found.add(raw);
    }
  }
  return [...found];
}

export function matchCatalogToken(candidate: string, index: TokenIndex): string | undefined {
  const direct = index.get(normalizeTokenKey(candidate));
  if (direct) return direct;
  const noParens = candidate.replace(/\([^)]*\)/g, '').trim();
  if (noParens !== candidate) {
    const alt = index.get(normalizeTokenKey(noParens));
    if (alt) return alt;
  }
  return undefined;
}

export function matchCatalogTokenWithAliases(
  candidate: string,
  index: TokenIndex,
  aliases: Record<string, string>
): string | undefined {
  const direct = matchCatalogToken(candidate, index);
  if (direct) return direct;
  const mapped = aliases[candidate] ?? aliases[candidate.trim()];
  if (mapped) return matchCatalogToken(mapped, index) ?? mapped;
  return undefined;
}

export function looksTokenLike(candidate: string): boolean {
  return (
    /^Bun\.[A-Za-z]/.test(candidate) ||
    /^--[a-zA-Z]/.test(candidate) ||
    /^bun:[a-z]/.test(candidate) ||
    /^BUN_[A-Z]/.test(candidate)
  );
}
