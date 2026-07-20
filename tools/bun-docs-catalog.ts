// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/file-io — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/webview — Bun.WebView
/**
 * bun-docs-catalog.ts — structured Bun doc catalog entries.
 *
 * Each entry:
 *   name, type (api | cli-flag | config | concept),
 *   description?, stability (stable | experimental | deprecated),
 *   canonicalPage, anchor?, allPages
 *
 * Coverage phases: Runtime · Bundler · Test Runner · Guides (later expansion).
 * Dedup by normalized name; canonical page prefers /reference/ then domain docs
 * over /guides/.
 *
 * Build:  bun tools/bun-docs-catalog.ts build
 * List:   bun tools/bun-docs-catalog.ts list [--section runtime] [--type api] [--json]
 * Lookup: bun tools/bun-docs-catalog.ts get Bun.WebView
 *
 * Consumed by tools/bun-doc-refs.ts (`catalog` / enriched `suggest`).
 */
import { resolve } from 'node:path';
import { CURATED_ENTRIES } from './bun-docs-curated.ts';
// Avoid static import of bun-doc-refs (circular: refs → catalog → refs).

const INDEX_PATH = resolve(import.meta.dir, 'bun-docs-index.json');
const OUT_PATH = resolve(import.meta.dir, 'bun-docs-catalog.json');

export type DocRefType = 'api' | 'cli-flag' | 'config' | 'concept';
export type DocStability = 'stable' | 'experimental' | 'deprecated';
export type DocSection = 'runtime' | 'bundler' | 'test' | 'guides' | 'pm' | 'reference' | 'other';

export type DocCatalogEntry = {
  name: string;
  type: DocRefType;
  description?: string;
  stability: DocStability;
  /** Page URL without .md and without fragment */
  canonicalPage: string;
  /** Fragment id without # */
  anchor?: string;
  /** All known pages (no fragments), deduped, canonical first */
  allPages: string[];
  /** Primary product area */
  section: DocSection;
  aliases?: string[];
};

type IndexEntry = {
  section: string;
  title: string;
  url: string;
  desc: string;
  domain: string;
  anchors: string[];
  officialSection?: string;
};

type IndexFile = {
  generated: string;
  bunVersion?: string;
  entries: IndexEntry[];
};

// ── Normalization & page scoring ──────────────────────────────────────────

export function normalizeName(name: string): string {
  return name
    .trim()
    .replace(/^bun\./i, 'Bun.')
    .replace(/^--/, '--')
    .toLowerCase();
}

/** Strip #fragment then trailing .md → bare page URL */
export function pageBase(url: string): string {
  return url.split('#')[0]!.replace(/\.md$/i, '');
}

export function pageAnchor(url: string): string | undefined {
  const i = url.indexOf('#');
  return i >= 0 ? url.slice(i + 1) : undefined;
}

/**
 * Prefer API reference pages over narrative guides.
 * Higher score = better canonical candidate.
 */
export function scoreCanonicalPage(url: string, nameHint?: string): number {
  const u = url.toLowerCase();
  let s = 0;
  if (u.includes('/reference/')) s += 100;
  if (u.includes('/docs/runtime/')) s += 50;
  if (u.includes('/docs/bundler')) s += 50;
  if (u.includes('/docs/test') || u.includes('/docs/cli/test')) s += 50;
  if (u.includes('/docs/pm/')) s += 40;
  if (u.includes('/docs/guides/')) s -= 30;
  if (u.includes('/docs/project/')) s -= 10;
  if (nameHint) {
    const seg = nameHint
      .replace(/^Bun\./, '')
      .replace(/^bun:/, '')
      .replace(/^--/, '')
      .toLowerCase();
    if (seg && (u.includes(`/${seg}`) || u.includes(seg.replace(/\./g, '/')))) s += 15;
  }
  // Prefer shorter, more specific paths slightly
  s -= Math.min(20, (u.split('/').length - 4) * 2);
  return s;
}

export function pickCanonicalPage(pages: string[], nameHint?: string): string {
  if (pages.length === 0) throw new Error('pickCanonicalPage: empty pages');
  const uniq = [...new Set(pages.map(pageBase))];
  uniq.sort((a, b) => scoreCanonicalPage(b, nameHint) - scoreCanonicalPage(a, nameHint));
  return uniq[0]!;
}

export function sectionFromUrl(url: string): DocSection {
  const u = url.toLowerCase();
  if (u.includes('/reference/')) return 'reference';
  if (u.includes('/docs/runtime') || u.includes('/docs/cli/run')) return 'runtime';
  if (u.includes('/docs/bundler')) return 'bundler';
  if (u.includes('/docs/test') || u.includes('/docs/cli/test')) return 'test';
  if (u.includes('/docs/guides/')) return 'guides';
  if (u.includes('/docs/pm/') || u.includes('/docs/install') || u.includes('/docs/cli/install'))
    return 'pm';
  return 'other';
}

export function inferType(name: string, url: string): DocRefType {
  if (name.startsWith('--') || name.startsWith('BUN_') || /flag/i.test(name)) return 'cli-flag';
  if (
    name.includes('bunfig') ||
    name === 'globalStore' ||
    name === 'linker' ||
    /config|bunfig|toml/i.test(name)
  )
    return 'config';
  if (
    name.startsWith('Bun.') ||
    name.startsWith('bun:') ||
    /^[A-Z][A-Za-z0-9]+$/.test(name) ||
    url.includes('/reference/')
  )
    return 'api';
  return 'concept';
}

function inferStability(
  name: string,
  desc: string,
  curated?: { stability?: string }
): DocStability {
  if (curated?.stability === 'experimental' || curated?.stability === 'deprecated') {
    return curated.stability;
  }
  const blob = `${name} ${desc}`.toLowerCase();
  if (/\bdeprecated\b/.test(blob)) return 'deprecated';
  if (/\bexperimental\b|\bunstable\b/.test(blob)) return 'experimental';
  // Known experimental surfaces (runtime-checked family)
  if (/^Bun\.WebView$/i.test(name) || /^http3$/i.test(name) || /^Bun\.secrets$/i.test(name))
    return 'experimental';
  return 'stable';
}

// ── Build ─────────────────────────────────────────────────────────────────

const COVERED_SECTIONS: DocSection[] = ['runtime', 'bundler', 'test', 'guides'];

function mergeEntry(
  map: Map<string, DocCatalogEntry>,
  partial: {
    name: string;
    type?: DocRefType;
    description?: string;
    stability?: DocStability;
    page: string;
    anchor?: string;
    section?: DocSection;
    aliasOf?: string;
  }
): void {
  const key = normalizeName(partial.aliasOf ?? partial.name);
  const page = pageBase(partial.page);
  const existing = map.get(key);
  if (!existing) {
    const allPages = [page];
    const canonicalPage = pickCanonicalPage(allPages, partial.name);
    map.set(key, {
      name: partial.aliasOf ? partial.name : partial.name,
      type: partial.type ?? inferType(partial.name, page),
      description: partial.description,
      stability: partial.stability ?? 'stable',
      canonicalPage,
      anchor: partial.anchor,
      allPages,
      section: partial.section ?? sectionFromUrl(page),
      aliases: partial.aliasOf ? [partial.name] : undefined,
    });
    // Prefer display name with Bun. prefix when available
    const e = map.get(key)!;
    if (partial.name.startsWith('Bun.') || partial.name.startsWith('bun:')) {
      e.name = partial.name.startsWith('bun:') ? partial.name : partial.name;
    }
    return;
  }

  // merge pages
  if (!existing.allPages.includes(page)) existing.allPages.push(page);
  existing.canonicalPage = pickCanonicalPage(existing.allPages, existing.name);
  // prefer more specific anchor from CANONICAL map
  if (partial.anchor && !existing.anchor) existing.anchor = partial.anchor;
  if (partial.anchor && existing.canonicalPage === page) existing.anchor = partial.anchor;
  // enrich description
  if (
    partial.description &&
    (!existing.description || partial.description.length > existing.description.length)
  ) {
    existing.description = partial.description;
  }
  // stability: experimental/deprecated win over stable once set non-stable
  if (partial.stability && partial.stability !== 'stable') {
    existing.stability = partial.stability;
  }
  // type: prefer api over concept
  if (partial.type === 'api' && existing.type === 'concept') existing.type = 'api';
  if (partial.type === 'cli-flag' || partial.type === 'config') existing.type = partial.type;
  // aliases
  if (partial.name !== existing.name) {
    const al = new Set(existing.aliases ?? []);
    al.add(partial.name);
    // keep Bun.* as primary name when possible
    if (partial.name.startsWith('Bun.') && !existing.name.startsWith('Bun.')) {
      al.add(existing.name);
      existing.name = partial.name;
    }
    existing.aliases = [...al].filter(a => a !== existing.name);
    if (existing.aliases.length === 0) delete existing.aliases;
  }
  existing.section = partial.section ?? existing.section;
}

export async function loadIndex(): Promise<IndexFile> {
  return (await Bun.file(INDEX_PATH).json()) as IndexFile;
}

export async function buildCatalog(): Promise<DocCatalogEntry[]> {
  const index = await loadIndex();
  const map = new Map<string, DocCatalogEntry>();

  // 1) Index pages for covered sections → concept rows (page-level)
  for (const e of index.entries) {
    const page = pageBase(e.url.replace(/\.md$/, ''));
    const section = sectionFromUrl(page);
    if (!COVERED_SECTIONS.includes(section) && section !== 'reference' && section !== 'pm') {
      // still include reference + pm for completeness; skip pure "Docs" noise later
    }
    // Phase coverage: runtime, bundler, test primarily; guides included as concept
    if (!['runtime', 'bundler', 'test', 'guides', 'reference', 'pm'].includes(section)) continue;

    mergeEntry(map, {
      name: e.title,
      type: section === 'reference' ? 'api' : 'concept',
      description: e.desc || undefined,
      page,
      section: section === 'reference' ? 'reference' : section,
      stability: inferStability(e.title, e.desc),
    });
  }

  // 2) Institutional CANONICAL_REFS → api / cli-flag / config
  const { CANONICAL_REFS } = await import('./bun-doc-refs.ts');
  for (const [name, url] of Object.entries(CANONICAL_REFS)) {
    if (!url.startsWith('https://bun.com/') && !url.startsWith('https://github.com/oven-sh/bun')) {
      continue;
    }
    // skip meta labels
    if (
      [
        'llms.txt index',
        'rss feed',
        'discord',
        'issues',
        'install script',
        'download',
        'security policy',
      ].includes(name)
    ) {
      continue;
    }
    const page = pageBase(url);
    const anchor = pageAnchor(url);
    mergeEntry(map, {
      name,
      type: inferType(name, page),
      page,
      anchor,
      section: sectionFromUrl(page),
      stability: inferStability(name, ''),
    });
  }

  // 3) Curated hot-path enrichment (description + stability + related pages)
  for (const c of CURATED_ENTRIES) {
    const page = `https://bun.com/docs/${c.path}`;
    mergeEntry(map, {
      name: c.term,
      type: inferType(c.term, page),
      description: c.description,
      stability: inferStability(c.term, c.description, c),
      page,
      section: sectionFromUrl(page),
    });
    if (c.related) {
      for (const rel of c.related) {
        mergeEntry(map, {
          name: c.term,
          page: `https://bun.com/docs/${rel}`,
        });
      }
    }
  }

  // Final sort: section then name
  const sectionOrder: DocSection[] = [
    'runtime',
    'bundler',
    'test',
    'guides',
    'pm',
    'reference',
    'other',
  ];
  const entries = [...map.values()].sort((a, b) => {
    const si = sectionOrder.indexOf(a.section) - sectionOrder.indexOf(b.section);
    if (si !== 0) return si;
    return a.name.localeCompare(b.name);
  });

  // Re-pick canonical + put canonical first in allPages
  for (const e of entries) {
    e.canonicalPage = pickCanonicalPage(e.allPages, e.name);
    e.allPages = [e.canonicalPage, ...e.allPages.filter(p => p !== e.canonicalPage)];
  }

  return entries;
}

export async function writeCatalog(entries: DocCatalogEntry[]): Promise<void> {
  const payload = {
    generated: new Date().toISOString(),
    bunVersion: Bun.version,
    source: {
      index: 'tools/bun-docs-index.json',
      canonicalRefs: 'tools/bun-doc-refs.ts#CANONICAL_REFS',
      curated: 'tools/bun-docs-curated.ts',
    },
    schema: {
      name: 'string',
      type: 'api | cli-flag | config | concept',
      description: 'string?',
      stability: 'stable | experimental | deprecated',
      canonicalPage: 'string',
      anchor: 'string?',
      allPages: 'string[]',
      section: 'runtime | bundler | test | guides | pm | reference | other',
      aliases: 'string[]?',
    },
    coveredSections: COVERED_SECTIONS,
    count: entries.length,
    byType: countBy(entries, e => e.type),
    bySection: countBy(entries, e => e.section),
    byStability: countBy(entries, e => e.stability),
    entries,
  };
  await Bun.write(OUT_PATH, `${JSON.stringify(payload, null, 2)}\n`);
}

function countBy<T>(items: T[], key: (t: T) => string): Record<string, number> {
  const o: Record<string, number> = {};
  for (const i of items) {
    const k = key(i);
    o[k] = (o[k] ?? 0) + 1;
  }
  return o;
}

export async function loadCatalog(): Promise<DocCatalogEntry[]> {
  if (!(await Bun.file(OUT_PATH).exists())) {
    return buildCatalog();
  }
  const j = (await Bun.file(OUT_PATH).json()) as { entries?: DocCatalogEntry[] };
  return Array.isArray(j.entries) ? j.entries : buildCatalog();
}

export async function getCatalogEntry(name: string): Promise<DocCatalogEntry | null> {
  const entries = await loadCatalog();
  const n = normalizeName(name);
  return (
    entries.find(e => normalizeName(e.name) === n) ??
    entries.find(e => e.aliases?.some(a => normalizeName(a) === n)) ??
    null
  );
}

// ── CLI ───────────────────────────────────────────────────────────────────

function printEntry(e: DocCatalogEntry): void {
  const url = e.anchor ? `${e.canonicalPage}#${e.anchor}` : e.canonicalPage;
  console.info(`${e.name}`);
  console.info(`  type: ${e.type}  stability: ${e.stability}  section: ${e.section}`);
  if (e.description) console.info(`  ${e.description}`);
  console.info(`  canonical: ${url}`);
  if (e.allPages.length > 1) {
    console.info(`  allPages (${e.allPages.length}):`);
    for (const p of e.allPages) {
      const mark = p === e.canonicalPage ? '★' : ' ';
      console.info(`   ${mark} ${p}`);
    }
  }
  if (e.aliases?.length) console.info(`  aliases: ${e.aliases.join(', ')}`);
}

async function main(): Promise<void> {
  const [, , cmd = 'build', ...rest] = Bun.argv;
  if (cmd === 'build') {
    const entries = await buildCatalog();
    await writeCatalog(entries);
    console.info(
      `✅ catalog ${entries.length} entries → tools/bun-docs-catalog.json` +
        `  (api=${entries.filter(e => e.type === 'api').length}` +
        ` concept=${entries.filter(e => e.type === 'concept').length}` +
        ` flag=${entries.filter(e => e.type === 'cli-flag').length}` +
        ` config=${entries.filter(e => e.type === 'config').length})`
    );
    return;
  }
  if (cmd === 'list') {
    let entries = await loadCatalog();
    const section = rest.find(a => a.startsWith('--section='))?.slice(10) as DocSection | undefined;
    const type = rest.find(a => a.startsWith('--type='))?.slice(7) as DocRefType | undefined;
    const json = rest.includes('--json');
    if (section) entries = entries.filter(e => e.section === section);
    if (type) entries = entries.filter(e => e.type === type);
    if (json) {
      process.stdout.write(`${JSON.stringify(entries, null, 2)}\n`);
      return;
    }
    for (const e of entries) {
      const url = e.anchor ? `${e.canonicalPage}#${e.anchor}` : e.canonicalPage;
      console.info(
        `${e.name.padEnd(32)} ${e.type.padEnd(10)} ${e.stability.padEnd(12)} ${e.section.padEnd(10)} ${url}`
      );
    }
    console.info(`\n${entries.length} entries`);
    return;
  }
  if (cmd === 'get') {
    const name = rest.join(' ');
    const e = await getCatalogEntry(name);
    if (!e) {
      console.error(`❌ not in catalog: ${name} (run: bun tools/bun-docs-catalog.ts build)`);
      process.exit(1);
    }
    printEntry(e);
    return;
  }
  console.error('usage: bun tools/bun-docs-catalog.ts build|list|get [name]');
  console.error(
    '  list --section=runtime|bundler|test|guides --type=api|concept|cli-flag|config --json'
  );
  process.exit(1);
}

if (import.meta.main) {
  await main();
}
