#!/usr/bin/env bun
/**
 * bun-docs-index-gen.ts — generate tools/bun-docs-index.json.
 *
 * Fetches bun.com/docs/llms.txt (the agent-consumable docs index), parses all
 * page entries, then fetches each page's .md variant to extract heading
 * anchors. The output maps every Bun docs page to its title, description,
 * domain, URL, and available #anchors — the data backing canonical reference
 * improvements in bun-doc-refs.ts.
 *
 * Run: bun tools/bun-docs-index-gen.ts
 * Refs: https://bun.com/docs/llms.txt
 *       https://bun.com/docs/guides/html-rewriter/extract-links#convert-relative-urls-to-absolute
 */

const LLMS_URL = 'https://bun.com/docs/llms.txt';
const OUT = new URL('./bun-docs-index.json', import.meta.url).pathname;
const TAXONOMY = new URL('./bun-docs-taxonomy.json', import.meta.url).pathname;
const CONCURRENCY = 8;

type Entry = {
  section: string;
  title: string;
  url: string;
  desc: string;
  domain: string;
  anchors: string[];
};

/** Mintlify/GitHub-style heading slug, verified against bun.com anchors:
 *  `Bun.stringWidth()` → bun-stringwidth (dots→hyphens, trailing paren stripped)
 *  `Bun.inspect.table(tabularData, ...)` → bun-inspect-table-tabulardata-properties-options
 *  [`node:tty`](url) → nodetty (link text only, colons dropped) */
function slugify(heading: string): string {
  return heading
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .toLowerCase()
    .replace(/\(/g, '-')
    .replace(/[)`'":]/g, '')
    .replace(/\./g, '-')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

function extractAnchors(markdown: string): string[] {
  const anchors: string[] = [];
  let inCode = false;
  for (const line of markdown.split('\n')) {
    if (line.trim().startsWith('```')) inCode = !inCode;
    if (inCode) continue;
    const m = line.match(/^#{2,4} (.+)$/);
    if (m) {
      const slug = slugify(m[1]);
      if (slug && !anchors.includes(slug)) anchors.push(slug);
    }
  }
  return anchors;
}

async function main(): Promise<void> {
  const text = await (await fetch(LLMS_URL)).text();
  const entries: Entry[] = [];
  let section = 'root';
  for (const line of text.split('\n')) {
    const h = line.match(/^## (.+)/);
    if (h) {
      section = h[1];
      continue;
    }
    const m = line.match(/^- \[(.+?)\]\((https:\/\/[^)]+)\)(?:: (.+))?$/);
    if (!m) continue;
    const url = m[2];
    const path = new URL(url).pathname.replace(/^\/docs\//, '').replace(/\.md$/, '');
    entries.push({
      section,
      title: m[1],
      url,
      desc: m[3] ?? '',
      domain: path.split('/').slice(0, 2).join('/'),
      anchors: [],
    });
  }
  console.info(`parsed ${entries.length} index entries`);

  // Fetch each page's .md and extract anchors (bounded concurrency)
  let done = 0;
  let failed = 0;
  const queue = [...entries];
  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      for (let e = queue.shift(); e; e = queue.shift()) {
        if (e.url.endsWith('.md')) {
          try {
            const res = await fetch(e.url);
            if (res.ok) e.anchors = extractAnchors(await res.text());
            else failed++;
          } catch {
            failed++;
          }
        }
        if (++done % 50 === 0) console.info(`  ${done}/${entries.length} pages…`);
      }
    })
  );

  const totalAnchors = entries.reduce((n, e) => n + e.anchors.length, 0);

  // Enrich with the official sidebar taxonomy (bun-docs-taxonomy.json)
  const tax = await Bun.file(TAXONOMY)
    .json()
    .catch(() => null);
  let tagged = 0;
  if (tax?.sections) {
    const titleToSection = new Map<string, string>();
    for (const [section, pages] of Object.entries(tax.sections as Record<string, string[]>)) {
      for (const p of pages) titleToSection.set(p.toLowerCase(), section);
    }
    for (const e of entries) {
      const s = titleToSection.get(e.title.toLowerCase());
      if (s) {
        (e as Entry & { officialSection?: string }).officialSection = s;
        tagged++;
      }
    }
  }

  await Bun.write(
    OUT,
    JSON.stringify(
      {
        generated: new Date().toISOString(),
        source: LLMS_URL,
        taxonomy: tax ? 'tools/bun-docs-taxonomy.json' : null,
        taxonomyTagged: tagged,
        pages: entries.length,
        anchors: totalAnchors,
        entries,
      },
      null,
      2
    ) + '\n'
  );
  console.info(
    `✅ ${entries.length} pages, ${totalAnchors} anchors (${failed} fetch failures), ${tagged} taxonomy-tagged → ${OUT}`
  );
}

await main();
