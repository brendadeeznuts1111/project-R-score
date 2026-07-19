#!/usr/bin/env bun
/**
 * bun-doc-refs.ts — canonical Bun documentation reference tool.
 *
 * Single source of truth for canonical Bun doc URLs used across the repo.
 * Use it to keep @see links accurate and to find files that use Bun APIs
 * without a doc reference.
 *
 * Usage:
 *   bun tools/bun-doc-refs.ts url <ApiName>      # print canonical URL for a Bun API
 *   bun tools/bun-doc-refs.ts list               # print the whole reference map
 *   bun tools/bun-doc-refs.ts check [paths...]   # find Bun API usages lacking a @see link
 *   bun tools/bun-doc-refs.ts validate [paths..] # HTTP-check all bun.com/github doc links
 *
 * Adding a new API reference? Add it to CANONICAL_REFS below — one place only.
 */

// Canonical doc map — the reference thesis for this repo's terminal layer:
//
//   Bun ships native, SIMD-accelerated replacements for the terminal npm
//   stack (string-width, wrap-ansi, strip-ansi, slice-ansi, ansi-styles,
//   cli-table). lib/console-depth.ts is the thin project layer over them.
//   Every reference below is (a) verified reachable, (b) as specific as the
//   official docs allow (anchor > topic page > generated reference), and
//   (c) checked by `bun tools/bun-doc-refs.ts validate`.
//
// Source tiers, in order of preference:
//   1. https://bun.com/docs/runtime/... — curated guides & CLI flags
//   2. https://bun.com/reference/bun/<name> — generated API reference
//   3. https://github.com/oven-sh/bun/tree/main/packages/bun-types — types
//
// Everything in CANONICAL_REFS resolves to Bun docs or Bun's own repo.
// Sole intentional exception elsewhere: tests/console-depth.test.ts cites
// github.com/sindresorhus/string-width — the reference vector suite
// Bun.stringWidth is validated against; Bun has no equivalent canonical
// vectors of its own.
//
// Agent-consumable docs: append `.md` to any bun.com/docs page for raw
// markdown (e.g. .../environment-variables.md). Full index:
//   https://bun.com/docs/llms.txt
export const BUN_TYPES_PINNED =
  'https://github.com/oven-sh/bun/tree/98f664962ffe4c6ba9b38382babc623ef0ba8693/packages/bun-types';
export const BUN_TYPES_MAIN = 'https://github.com/oven-sh/bun/tree/main/packages/bun-types';

export const CANONICAL_REFS: Record<string, string> = {
  // ── Terminal width & ANSI (replaces string-width / strip-ansi / wrap-ansi /
  //    slice-ansi) ────────────────────────────────────────────────────────
  'Bun.stringWidth': 'https://bun.com/docs/runtime/utils#bun-stringwidth',
  'Bun.stripANSI': 'https://bun.com/docs/runtime/utils#bun-stripansi',
  'Bun.wrapAnsi': 'https://bun.com/docs/runtime/utils#bun-wrapansi',
  'Bun.sliceAnsi': 'https://bun.com/reference/bun/sliceAnsi',

  // ── Inspection & formatting (replaces util.inspect options, cli-table) ──
  'Bun.inspect': 'https://bun.com/docs/runtime/utils#bun-inspect',
  'Bun.inspect.table': 'https://bun.com/docs/runtime/utils#bun-inspect',
  'Bun.inspect.custom': 'https://bun.com/docs/runtime/utils#bun-inspect',
  BunInspectOptions: 'https://bun.com/reference/bun/BunInspectOptions',
  console: 'https://bun.com/docs/runtime/console',
  '--console-depth': 'https://bun.com/docs/runtime/console',

  // ── Color & TTY conventions (replaces chalk / ansi-styles) ─────────────
  'Bun.color': 'https://bun.com/docs/runtime/color',
  'process.stdout.isTTY': 'https://bun.com/docs/runtime/nodejs-compat#nodetty',
  'process.stdout.columns': 'https://bun.com/docs/runtime/nodejs-compat#nodetty',
  NO_COLOR: 'https://bun.com/docs/runtime/environment-variables',
  FORCE_COLOR: 'https://bun.com/docs/runtime/environment-variables',

  // ── Environment & configuration ────────────────────────────────────────  'Bun.env': 'https://bun.com/docs/runtime/environment-variables',
  '.env files': 'https://bun.com/docs/runtime/environment-variables#setting-environment-variables',
  'configuring Bun': 'https://bun.com/docs/runtime/environment-variables#configuring-bun',
  BUN_OPTIONS: 'https://bun.com/docs/runtime/environment-variables#configuring-bun',
  BUN_CONFIG_VERBOSE_FETCH: 'https://bun.com/docs/runtime/environment-variables#configuring-bun',
  BUN_CONFIG_MAX_HTTP_REQUESTS:
    'https://bun.com/docs/runtime/environment-variables#configuring-bun',
  DO_NOT_TRACK: 'https://bun.com/docs/runtime/environment-variables#configuring-bun',
  BUN_RUNTIME_TRANSPILER_CACHE_PATH:
    'https://bun.com/docs/runtime/environment-variables#what-does-it-cache',
  'bunfig.toml': 'https://bun.com/docs/runtime/bunfig',

  // ── Testing & snapshots ────────────────────────────────────────────────
  'bun:test': 'https://bun.com/docs/cli/test',
  'bun:test snapshots': 'https://bun.com/docs/test/snapshots',
  'snapshot guide': 'https://bun.com/guides/test/snapshot',

  // ── Bundler / executables ──────────────────────────────────────────────
  'bun build --compile': 'https://bun.com/docs/bundler/executables',
  'compile targets': 'https://bun.com/docs/bundler/executables#supported-targets',

  // ── General utilities ──────────────────────────────────────────────────
  'Bun.which': 'https://bun.com/docs/runtime/utils#bun-which',
  'Bun.nanoseconds': 'https://bun.com/docs/runtime/utils#bun-nanoseconds',
  'Bun.sleep': 'https://bun.com/docs/runtime/utils#bun-sleep',
  'Bun.deepEquals': 'https://bun.com/docs/runtime/utils#bun-deepequals',
  'Bun.escapeHTML': 'https://bun.com/docs/runtime/utils#bun-escapehtml',
  'Bun.peek': 'https://bun.com/docs/runtime/utils#bun-peek',
  'Bun.main': 'https://bun.com/docs/runtime/utils#bun-main',
  'Bun.resolveSync': 'https://bun.com/docs/runtime/utils#bun-resolvesync',
  'Bun.spawn terminal (PTY)': 'https://bun.com/docs/runtime/child-process#terminal-pty-support',

  // ── Meta ───────────────────────────────────────────────────────────────
  'bun-types': BUN_TYPES_PINNED,
  'llms.txt index': 'https://bun.com/docs/llms.txt',
  'markdown docs': 'https://bun.com/docs/runtime/environment-variables.md',
  // Operational endpoints (verified live; bun.com has no subdomains —
  // everything is path-based under the apex + www)
  'rss feed': 'https://bun.com/rss.xml',
  discord: 'https://bun.com/discord',
  issues: 'https://bun.com/issues',
  'install script': 'https://bun.com/install.sh',
  download: 'https://bun.com/download',
  'security policy': 'https://github.com/oven-sh/bun/security/policy',
};

const APIS = Object.keys(CANONICAL_REFS).filter(k => k.startsWith('Bun.'));

function printUrl(api: string): void {
  const url = CANONICAL_REFS[api];
  if (!url) {
    console.error(`❌ no canonical ref for "${api}". Known APIs:`);
    for (const k of Object.keys(CANONICAL_REFS)) console.error(`   ${k}`);
    process.exit(1);
  }
  console.info(`${api} → ${url}`);
}

function listRefs(): void {
  for (const [api, url] of Object.entries(CANONICAL_REFS)) {
    console.info(`${api.padEnd(28)} ${url}`);
  }
}

async function tsFiles(paths: string[]): Promise<string[]> {
  const out: string[] = [];
  for (const p of paths) {
    const info = await Bun.file(p)
      .stat()
      .catch(() => null);
    if (info?.isDirectory()) {
      const glob = new Bun.Glob('**/*.ts');
      for await (const f of glob.scan({ cwd: p, absolute: true })) out.push(f);
    } else if (p.endsWith('.ts')) {
      out.push(p);
    }
  }
  return out;
}

type MissingRef = { file: string; api: string; url: string };

/** Detect Bun.* usages lacking a canonical doc ref (code lines only). */
async function findMissing(paths: string[]): Promise<MissingRef[]> {
  const missing: MissingRef[] = [];
  for (const file of await tsFiles(paths)) {
    const text = await Bun.file(file).text();
    // Only count usage in actual code lines (comments/doc headers are
    // reference material, not usage)
    const code = text
      .split('\n')
      .filter(l => {
        const t = l.trim();
        return !t.startsWith('//') && !t.startsWith('*') && !t.startsWith('/*');
      })
      .join('\n');
    for (const api of APIS) {
      if (!code.includes(api)) continue;
      const url = CANONICAL_REFS[api];
      const [base, anchor] = url.split('#');
      const referenced =
        text.includes(url) ||
        text.includes(base) ||
        (anchor !== undefined && text.includes('#' + anchor));
      if (!referenced) missing.push({ file, api, url });
    }
  }
  return missing;
}

/** Find Bun.* usages whose file has no matching @see / doc link. */
async function check(paths: string[]): Promise<number> {
  const missing = await findMissing(paths);
  for (const m of missing) {
    console.info(`  ${m.file}: uses ${m.api} without a doc ref`);
    console.info(`    add: @see ${m.url}`);
  }
  if (missing.length === 0) console.info('✅ all Bun API usages have canonical doc refs');
  return missing.length;
}

/**
 * Insert `// @see <url> — <api>` header lines into files missing refs.
 * Idempotent (driven by findMissing). Default is dry-run; pass --write.
 */
async function annotate(paths: string[], write: boolean): Promise<number> {
  const missing = await findMissing(paths);
  const byFile = new Map<string, MissingRef[]>();
  for (const m of missing) byFile.set(m.file, [...(byFile.get(m.file) ?? []), m]);
  for (const [file, refs] of byFile) {
    const text = await Bun.file(file).text();
    const lines = text.split('\n');
    // Insertion point: after shebang and leading blank lines
    let at = 0;
    if (lines[0]?.startsWith('#!')) at = 1;
    while (at < lines.length && lines[at].trim() === '') at++;
    const header = refs.map(r => `// @see ${r.url} — ${r.api}`);
    if (write) {
      lines.splice(at, 0, ...header);
      await Bun.write(file, lines.join('\n'));
    }
    console.info(`${write ? '📝' : '🔍'} ${file}`);
    for (const r of refs) console.info(`   ${r.api} → ${r.url}`);
  }
  console.info(
    write
      ? `✅ annotated ${byFile.size} files (${missing.length} refs)`
      : `🔍 dry-run: ${byFile.size} files would be annotated (${missing.length} refs) — pass --write`
  );
  return byFile.size;
}

/** HTTP-validate every bun.com/github/no-color doc link found in the files. */
async function validate(paths: string[]): Promise<number> {
  // Character class stops at markup/quotes and template-literal `${` so
  // doc text like </link>, trailing ', and `...${var}` stems never pollute
  const urlRe =
    /https:\/\/(?:bun\.com|github\.com\/oven-sh|no-color\.org|nodejs\.org)[a-zA-Z0-9\-._~:/?#@!&*+,;=%[\]]*/g;
  const urls = new Set<string>();
  for (const file of await tsFiles(paths)) {
    const text = await Bun.file(file).text();
    // Skip intentional placeholder URLs: lines/blocks marked @planned are
    // cataloged future links, not live references (e.g. domains.ts catalog)
    const lines = text.split('\n');
    let plannedBlock = false;
    for (const line of lines) {
      if (line.includes('@planned')) plannedBlock = true;
      else if (line.trim().startsWith('};') || line.trim().startsWith('];')) plannedBlock = false;
      if (plannedBlock) continue;
      for (const m of line.matchAll(urlRe)) {
        // Skip template-literal stems: `https://.../tree/${var}` is not a real URL
        const after = line.slice(m.index! + m[0].length, m.index! + m[0].length + 2);
        if (after === '${') continue;
        urls.add(m[0].replace(/[).,;*]+$/, ''));
      }
    }
  }
  let bad = 0;
  for (const url of urls) {
    const ok = await fetch(url, { method: 'HEAD', redirect: 'follow' })
      .then(r => r.status < 400)
      .catch(() => false);
    console.info(`${ok ? '✅' : '❌'} ${url}`);
    if (!ok) bad++;
  }
  console.info(bad === 0 ? `\n✅ ${urls.size} links valid` : `\n❌ ${bad} broken links`);
  return bad;
}

/** Lazy-load the generated docs index (tools/bun-docs-index.json). */
async function docsIndex(): Promise<{
  entries: Array<{
    title: string;
    url: string;
    desc: string;
    domain: string;
    anchors: string[];
    officialSection?: string;
  }>;
}> {
  const path = new URL('./bun-docs-index.json', import.meta.url).pathname;
  return Bun.file(path).json();
}

/** Mintlify-style slug, mirrors bun-docs-index-gen.ts. */
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

/**
 * Map any API name or topic to its canonical Bun docs page + anchor using
 * the generated index. Matches: exact anchor, title substring, then desc.
 */
async function suggest(query: string): Promise<void> {
  if (!query) {
    console.error('usage: bun tools/bun-doc-refs.ts suggest <api-or-topic>');
    process.exit(1);
  }
  const { entries } = await docsIndex();
  const q = query.toLowerCase();
  const anchorGuess = slugify(query);

  // 1. exact anchor match on a page
  for (const e of entries) {
    if (e.anchors.includes(anchorGuess)) {
      const url = e.url.replace(/\.md$/, '');
      console.info(`${query} → ${url}#${anchorGuess}`);
      console.info(`  (${e.title} — ${e.desc})`);
      return;
    }
  }
  // 2. title match (substring, ranked by earliest occurrence)
  const titleHits = entries
    .filter(e => e.title.toLowerCase().includes(q))
    .sort((a, b) => a.title.toLowerCase().indexOf(q) - b.title.toLowerCase().indexOf(q))
    .slice(0, 5);
  // 3. last segment of a dotted/camel query (e.g. "Bun.secrets" → "secrets")
  //    matched against page title or URL path
  const lastSeg = (query.includes('.') ? query.split('.').pop()! : query)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .toLowerCase();
  const segHits = entries.filter(
    e =>
      e.title.toLowerCase() === lastSeg ||
      e.url.toLowerCase().includes('/' + lastSeg.replace(/ /g, '-')) ||
      e.title.toLowerCase().split(' ').includes(lastSeg)
  );
  const hits = titleHits.length > 0 ? titleHits : segHits.slice(0, 5);
  if (hits.length > 0) {
    console.info(`closest pages for "${query}":`);
    for (const e of hits) {
      console.info(
        `  ${e.url.replace(/\.md$/, '')} — ${e.title}${e.officialSection ? `  [${e.officialSection}]` : ''}`
      );
      if (e.anchors.length > 0)
        console.info(
          `    anchors: ${e.anchors.slice(0, 6).join(', ')}${e.anchors.length > 6 ? '…' : ''}`
        );
    }
    return;
  }
  console.info(`❌ no docs page found for "${query}" — browse https://bun.com/docs/llms.txt`);
  process.exit(1);
}

/** Verify every CANONICAL_REFS anchor against the generated docs index. */ async function audit(): Promise<number> {
  const { entries } = await docsIndex();
  let bad = 0;
  for (const [api, url] of Object.entries(CANONICAL_REFS)) {
    if (!url.startsWith('https://bun.com/docs') || url.endsWith('llms.txt') || url.endsWith('.md'))
      continue;
    const [base, anchor] = url.split('#');
    if (!anchor) continue;
    const entry = entries.find(e => e.url.replace(/\.md$/, '') === base);
    if (!entry) {
      console.info(`❌ ${api}: page not in index: ${base}`);
      bad++;
      continue;
    }
    if (!entry.anchors.includes(anchor)) {
      console.info(`❌ ${api}: anchor missing from page: #${anchor}`);
      console.info(`   available: ${entry.anchors.slice(0, 8).join(', ')}…`);
      bad++;
    }
  }
  console.info(bad === 0 ? '✅ all anchored refs verified against index' : `❌ ${bad} bad refs`);
  return bad;
}

/**
 * Deep anchor check: every bun.com/docs#anchor link in the given files is
 * verified against the generated docs index (bun-docs-index.json), resolving
 * directory index pages (/docs/test → test/index.md). Catches dead anchors
 * that plain HTTP validation cannot (200 page, missing fragment).
 */
async function deepcheck(paths: string[]): Promise<number> {
  const { entries } = await docsIndex();
  const linkRe = /https:\/\/bun\.com\/docs\/([a-z0-9\-/]+)#([a-z0-9-]+)/g;
  const findEntry = (path: string) =>
    entries.find(e => e.url === `https://bun.com/docs/${path}.md`) ??
    entries.find(e => e.url === `https://bun.com/docs/${path}/index.md`);
  let checked = 0;
  let bad = 0;
  for (const file of await tsFiles(paths)) {
    const text = await Bun.file(file).text();
    for (const m of text.matchAll(linkRe)) {
      checked++;
      const [, path, anchor] = m;
      const entry = findEntry(path);
      if (!entry) {
        console.info(`❌ ${file}: page not indexed: ${path}#${anchor}`);
        bad++;
        continue;
      }
      if (!entry.anchors.includes(anchor)) {
        console.info(`❌ ${file}: dead anchor ${path}#${anchor}`);
        bad++;
      }
    }
  }
  console.info(
    bad === 0
      ? `✅ ${checked} anchored bun.com links verified against index`
      : `❌ ${bad}/${checked} dead anchors`
  );
  return bad;
}

/**
 * Unified integrity report for the whole reference stack:
 * taxonomy coverage → index anchors → canonical map anchors → repo links.
 * Exit 1 if any layer fails — CI-callable proof of the doc stack.
 */
async function integrity(): Promise<number> {
  const idx = await docsIndex();
  const tax = await Bun.file(new URL('./bun-docs-taxonomy.json', import.meta.url).pathname)
    .json()
    .catch(() => null);

  // Layer 1: taxonomy coverage (sidebar pages present in index, alias-aware)
  let taxTotal = 0;
  let taxHit = 0;
  if (tax?.sections) {
    const titles = new Set(idx.entries.map(e => e.title.toLowerCase()));
    const aliases = (tax.aliases ?? {}) as Record<string, string>;
    for (const pages of Object.values(tax.sections as Record<string, string[]>)) {
      for (const p of pages) {
        taxTotal++;
        const key = p.toLowerCase();
        if (titles.has(key) || (aliases[key] !== undefined && titles.has(aliases[key]))) taxHit++;
      }
    }
  }

  // Layer 2: index stats
  const pages = idx.entries.length;
  const anchors = idx.entries.reduce((n, e) => n + e.anchors.length, 0);
  const tagged = idx.entries.filter(e => e.officialSection).length;

  // Layer 3: canonical map anchors vs index
  const mapBad = await audit();

  // Layer 4: repo links vs index
  const linkBad = await deepcheck(['lib', 'tools', 'scripts', 'tests']);

  const row = (label: string, value: string, ok: boolean) =>
    console.info(`  ${ok ? '✅' : '❌'} ${label.padEnd(38)} ${value}`);
  console.info('\n📋 Doc-stack integrity');
  row('taxonomy coverage', `${taxHit}/${taxTotal} sidebar pages in index`, taxHit === taxTotal);
  row('index pages / anchors', `${pages} / ${anchors}`, pages > 0 && anchors > 0);
  row('taxonomy-tagged entries', `${tagged}`, tagged > 0);
  row('canonical map anchors', mapBad === 0 ? 'all valid' : `${mapBad} bad`, mapBad === 0);
  row('repo links', linkBad === 0 ? 'all valid' : `${linkBad} dead`, linkBad === 0);
  const failed = (taxHit === taxTotal ? 0 : 1) + (mapBad > 0 ? 1 : 0) + (linkBad > 0 ? 1 : 0);
  console.info(
    failed === 0 ? '\n🟢 integrity: PASS' : `\n🔴 integrity: ${failed} layer(s) failing`
  );
  return failed;
}

/**
 * Export a hierarchical llms-full.txt: every docs entry prefixed with its
 * official taxonomy path, giving RAG consumers location context.
 */
async function exportHierarchical(): Promise<void> {
  const idx = await docsIndex();
  const lines: string[] = [
    '# Bun Documentation — hierarchical index',
    `# Generated from tools/bun-docs-index.json (${idx.entries.length} pages)`,
    '',
  ];
  const bySection = new Map<string, typeof idx.entries>();
  for (const e of idx.entries) {
    const s = e.officialSection ?? e.domain;
    bySection.set(s, [...(bySection.get(s) ?? []), e]);
  }
  for (const [section, entries] of [...bySection.entries()].sort()) {
    lines.push(`\n## ${section}`);
    for (const e of entries) {
      const url = e.url.replace(/\.md$/, '');
      lines.push(`- [${e.title}](${url})${e.desc ? `: ${e.desc}` : ''}`);
      if (e.anchors.length > 0) {
        lines.push(`  anchors: ${e.anchors.map(a => `#${a}`).join(', ')}`);
      }
    }
  }
  const out = 'tools/bun-docs-llms-full.txt';
  await Bun.write(out, lines.join('\n') + '\n');
  console.info(`✅ ${out} — ${idx.entries.length} pages, ${bySection.size} sections`);
}

/**
 * Start an in-process Bun.cron scheduler for the integrity gate.
 * Form: Bun.cron(schedule, handler) → CronJob
 *   https://bun.sh/docs/runtime/cron#bun-cron-schedule-handler-—-in-process
 * No-overlap (next fire after handler settles):
 *   https://bun.sh/docs/runtime/cron#no-overlap-guarantee
 * In-process schedules are UTC; bare #cron is not a section id.
 * Schedule is UTC, no-overlap guaranteed, job reschedules after errors.
 */
/** Repo root (parent of tools/), used as cwd for the regen subprocess. */
const REPO_ROOT = new URL('..', import.meta.url).pathname;

/**
 * Regenerate the docs index after a PASS. Returns { ok, pages, anchors }
 * parsed from the generator's stdout, or { ok: false } on any failure.
 */
async function regenIndex(): Promise<{
  ok: boolean;
  pages?: number;
  anchors?: number;
  error?: string;
}> {
  try {
    const proc = Bun.spawn(['bun', 'tools/bun-docs-index-gen.ts'], {
      cwd: REPO_ROOT,
      stdout: 'pipe',
      stderr: 'pipe',
    });
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ]);
    if (exitCode !== 0) return { ok: false, error: stderr.trim() || `exit ${exitCode}` };
    // Final line: "✅ <pages> pages, <anchors> anchors (… fetch failures), …"
    const m = stdout.match(/(\d+) pages, (\d+) anchors/);
    return m ? { ok: true, pages: +m[1], anchors: +m[2] } : { ok: false, error: 'unparsed output' };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

async function schedule(pattern: string, once: boolean): Promise<void> {
  const LOG = 'reports/doc-integrity.jsonl';
  const run = async () => {
    const started = new Date().toISOString();
    const failures = await integrity();
    // Ingest-on-success: PASS regenerates the docs index; FAIL skips regen.
    const regen = failures === 0 ? await regenIndex() : ({ skipped: true } as const);
    // JSONL append via read-modify-write (Bun.write has no append mode)
    const prev = (await Bun.file(LOG).exists()) ? await Bun.file(LOG).text() : '';
    await Bun.write(
      LOG,
      prev + JSON.stringify({ ts: started, failures, ok: failures === 0, regen }) + '\n'
    );
    console.info(
      `🕐 [${started}] integrity ${failures === 0 ? 'PASS' : `FAIL (${failures})`}` +
        (failures === 0
          ? regen.ok
            ? ` — regen OK (${regen.pages} pages, ${regen.anchors} anchors)`
            : ` — regen FAILED: ${regen.error}`
          : ' — regen skipped') +
        ` — logged to ${LOG}`
    );
  };

  if (once) {
    await run();
    return;
  }

  const job = Bun.cron(pattern, run);
  console.info(`⏰ integrity scheduler started — pattern "${pattern}" (UTC), log: ${LOG}`);
  console.info('   in-process job: dies with this process, state shared, no overlap');
  process.on('SIGINT', () => {
    job.stop();
    console.info('\n👋 scheduler stopped');
    process.exit(0);
  });
  await run(); // immediate first run so there's feedback now
  await new Promise(() => {}); // keep alive; the cron job drives from here
}

const [, , cmd = 'list', ...rest] = Bun.argv;
const defaultPaths = ['lib', 'tools', 'scripts', 'tests'];
switch (cmd) {
  case 'url':
    printUrl(rest[0] ?? '');
    break;
  case 'list':
    listRefs();
    break;
  case 'suggest':
    await suggest(rest.join(' '));
    break;
  case 'audit':
    process.exit((await audit()) > 0 ? 1 : 0);
    break;
  case 'deepcheck':
    process.exit((await deepcheck(rest.length ? rest : defaultPaths)) > 0 ? 1 : 0);
    break;
  case 'integrity':
    process.exit((await integrity()) > 0 ? 1 : 0);
    break;
  case 'schedule': {
    // bun tools/bun-doc-refs.ts schedule [--pattern "0 6 * * *"] [--once]
    const pIdx = rest.indexOf('--pattern');
    const pattern = pIdx !== -1 ? rest[pIdx + 1] : '0 6 * * *';
    await schedule(pattern, rest.includes('--once'));
    break;
  }
  case 'export':
    await exportHierarchical();
    break;
  case 'annotate': {
    const targets = rest.filter(a => a !== '--write');
    const write = rest.includes('--write');
    const files = await annotate(targets.length ? targets : defaultPaths, write);
    process.exit(!write && files > 0 ? 1 : 0);
    break;
  }
  case 'check':
    process.exit((await check(rest.length ? rest : defaultPaths)) > 0 ? 1 : 0);
    break;
  case 'validate':
    process.exit((await validate(rest.length ? rest : defaultPaths)) > 0 ? 1 : 0);
    break;
  default:
    console.error(
      `unknown command: ${cmd} (url|list|suggest|audit|deepcheck|integrity|export|annotate|check|validate)`
    );
    process.exit(1);
}
