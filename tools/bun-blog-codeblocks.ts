#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/rss.xml — Bun blog RSS
// @see https://bun.com/docs/guides/process/argv#parse-command-line-arguments — util.parseArgs
/**
 * Extract `<div class="CodeBlock">` regions from a Bun blog HTML post.
 *
 * Default run: banner + index table (no bodies). Bodies via --all / --section / --grep.
 *
 *   bun tools/bun-blog-codeblocks.ts [/path/to/bun-vX.Y.Z.html]
 *   bun tools/bun-blog-codeblocks.ts --url https://bun.com/blog/bun-v1.3.6
 *   bun tools/bun-blog-codeblocks.ts -s 14
 *   bun tools/bun-blog-codeblocks.ts -g 'requestPayer|files'
 *   bun tools/bun-blog-codeblocks.ts --join
 *   bun tools/bun-blog-codeblocks.ts --derived-table
 *   bun tools/bun-blog-codeblocks.ts --rss
 */
import { parseArgs } from 'util';
import { buildDerivedApiRows, matchBlocksToTokens } from '../lib/docs/blog-codeblock-join.ts';
import {
  decodeHtmlEntities,
  extractCodeBlocks,
  stripShikiPre,
  type CodeBlock,
  type ExtractResult,
} from '../lib/docs/blog-codeblocks.ts';
import { bunBlog, BunBlogPattern, guideKeyFromUrl } from '../lib/docs/bun-site-url.ts';
import { resolvePath } from '../lib/path-bun';
import { BUN_RSS_URL } from '../lib/shared/tools/bun-urls';
import {
  buildReleaseMap,
  buildTokenIndex,
  cleanBunVersion,
  extractTokenCandidates,
  fetchPostHtml,
  fetchRssXml,
  loadReleaseIndex,
  loadScrapeAliases,
  matchCatalogTokenWithAliases,
  parseReleaseEntries,
  type ReleaseEntry,
} from './bun-docs-releases';

export type { CodeBlock, ExtractResult } from '../lib/docs/blog-codeblocks.ts';
export {
  decodeHtmlEntities,
  extractCodeBlocks,
  stripShikiPre,
} from '../lib/docs/blog-codeblocks.ts';

export type CodeBlockWithTokens = CodeBlock & {
  matchedTokens: string[];
};

const DEFAULT_VERSION = '1.3.6';
const REPO_ROOT = resolvePath(import.meta.dir, '..');

export function previewLine(code: string, maxWidth = 60): string {
  const line =
    code
      .split('\n')
      .map(l => l.trim())
      .find(l => l.length > 0 && !l.startsWith('//') && !l.startsWith('#') && l !== '*/') ??
    code
      .split('\n')
      .map(l => l.trim())
      .find(l => l.length > 0) ??
    '';
  if (Bun.stringWidth(line) <= maxWidth) return line;
  let out = '';
  for (const ch of line) {
    if (Bun.stringWidth(out + ch + '…') > maxWidth) break;
    out += ch;
  }
  return `${out}…`;
}

/** `bun-v1.3.6` / `1.3.6` / blog URL → `1.3.6`. */
export function parseBlogVersion(input: string): string | null {
  const fromUrl = /\/blog\/bun-v(\d+\.\d+\.\d+)/i.exec(input);
  if (fromUrl) return cleanBunVersion(fromUrl[1]!);
  const fromFile = /bun-v(\d+\.\d+\.\d+)/i.exec(input);
  if (fromFile) return cleanBunVersion(fromFile[1]!);
  if (/^\d+\.\d+\.\d+$/.test(input.trim())) return cleanBunVersion(input.trim());
  return null;
}

export function blogUrlForVersion(version: string): string {
  return bunBlog(`bun-v${cleanBunVersion(version)}`);
}

export function assertBlogPostUrl(url: string): void {
  if (!BunBlogPattern.test(url)) {
    throw new Error(`Not a Bun blog post URL (BunBlogPattern): ${url}`);
  }
}

export async function enrichBlocksWithTokens(
  blocks: CodeBlock[],
  opts: { version: string; postUrl: string }
): Promise<CodeBlockWithTokens[]> {
  const [tokenIndex, scrapeAliases] = await Promise.all([buildTokenIndex(), loadScrapeAliases()]);
  const joined = matchBlocksToTokens(blocks, {
    version: opts.version,
    postUrl: opts.postUrl,
    tokenIndex,
    scrapeAliases,
  });
  const byBlock = new Map<number, string[]>();
  for (const entry of joined) {
    for (const ex of entry.examples) {
      const list = byBlock.get(ex.blockIndex) ?? [];
      if (!list.includes(entry.name)) list.push(entry.name);
      byBlock.set(ex.blockIndex, list);
    }
  }
  return blocks.map(b => ({
    ...b,
    matchedTokens: byBlock.get(b.index) ?? matchTokensInline(b, tokenIndex, scrapeAliases),
  }));
}

function matchTokensInline(
  block: CodeBlock,
  tokenIndex: Map<string, string>,
  scrapeAliases: Record<string, string>
): string[] {
  const out = new Set<string>();
  for (const c of extractTokenCandidates(`${block.section}\n${block.code}`)) {
    const name = matchCatalogTokenWithAliases(c, tokenIndex, scrapeAliases);
    if (name) out.add(name);
  }
  return [...out];
}

export function filterBlocks(
  blocks: CodeBlock[],
  opts: { all?: boolean; section?: number; grep?: string }
): CodeBlock[] {
  if (opts.section != null && !Number.isNaN(opts.section)) {
    return blocks.filter(b => b.index === opts.section);
  }
  if (opts.grep) {
    let re: RegExp;
    try {
      re = new RegExp(opts.grep, 'i');
    } catch {
      re = new RegExp(opts.grep.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    }
    return blocks.filter(
      b => re.test(b.section) || re.test(previewLine(b.code)) || re.test(b.code)
    );
  }
  if (opts.all) return blocks;
  return [];
}

export function formatBanner(fields: {
  source: string;
  htmlPath: string;
  version: string;
  blog?: ReleaseEntry | null;
  rssNote?: string | null;
  codeBlockCount: number;
  codeBlockTabCount: number;
  wrote: string[];
}): string {
  const rev = Bun.revision.slice(0, 7);
  const lines = [
    'Bun blog CodeBlock extract',
    `source  ${fields.source}`,
    `html    ${fields.htmlPath}`,
    `post    bun-v${fields.version}`,
    `runtime Bun v${Bun.version} (${rev})`,
    `rss     ${BUN_RSS_URL}`,
  ];
  if (fields.blog) {
    lines.push(`blog    ${fields.blog.title}`);
    lines.push(`        ${fields.blog.url} · ${fields.blog.pubDate}`);
  }
  if (fields.rssNote) lines.push(`note    ${fields.rssNote}`);
  lines.push(
    `blocks  CodeBlock ${fields.codeBlockCount} · CodeBlockTab ${fields.codeBlockTabCount} (skipped)`
  );
  lines.push(`wrote   ${fields.wrote.join(' · ')}`);
  return lines.join('\n');
}

async function lookupReleaseEntry(
  version: string,
  opts: { rss?: boolean }
): Promise<{ entry: ReleaseEntry | null; rssNote: string | null }> {
  const clean = cleanBunVersion(version);
  try {
    const { map } = await loadReleaseIndex({ refresh: false });
    const hit = map.get(clean) ?? null;
    if (hit) return { entry: hit, rssNote: null };
  } catch {
    /* fall through */
  }

  if (!opts.rss) {
    return { entry: null, rssNote: 'no local release-index hit (pass --rss to fetch)' };
  }

  try {
    const fetched = await fetchRssXml({ force: false });
    const entries = parseReleaseEntries(fetched.xml);
    const map = buildReleaseMap(entries);
    const hit = map.get(clean) ?? null;
    if (hit) {
      return {
        entry: hit,
        rssNote: fetched.fromCache ? 'from RSS cache' : 'from live RSS',
      };
    }
    return { entry: null, rssNote: 'RSS fetched; version not in feed' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { entry: null, rssNote: `RSS fetch failed (soft): ${msg}` };
  }
}

async function ensureHtml(opts: {
  htmlPath: string;
  sourceUrl: string;
  forceFetch?: boolean;
}): Promise<string> {
  const file = Bun.file(opts.htmlPath);
  if (!opts.forceFetch && (await file.exists())) return file.text();

  try {
    assertBlogPostUrl(opts.sourceUrl);
    const html = await fetchPostHtml(opts.sourceUrl, opts.forceFetch);
    if (!html) throw new Error('empty HTML from cache/fetch');
    if (!(await file.exists())) {
      await Bun.write(opts.htmlPath, html);
    }
    return html;
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err);
    console.error(`Missing HTML: ${opts.htmlPath}`);
    console.error(`Fetch failed (${detail}). Download with:`);
    console.error(`  curl -fsSL '${opts.sourceUrl}' -o '${opts.htmlPath}'`);
    process.exit(1);
  }
}

function printHelp(): void {
  console.log(`Usage: bun tools/bun-blog-codeblocks.ts [html] [flags]

Extract div.CodeBlock samples from a Bun blog HTML post.

  [html]              Path to saved post (default: /tmp/bun-v${DEFAULT_VERSION}.html)
  --url <url>         Blog URL (infers version; BunBlogPattern validated)
  --out-dir <dir>     Artifact directory (default: .tmp)
  -a, --all           Print all block bodies
  -s, --section <n>   Print one block by index
  -g, --grep <str>    Print bodies matching section/preview/code (regex)
  --join              Add matchedTokens[] per block in JSON inventory
  --derived-table     Write *-DerivedApi.json sidecar (non-SSOT API rows)
  -r, --rss           Opt-in live RSS enrich when release-index misses
  -h, --help          Show help

Default stdout: banner + Bun.inspect.table index (no bodies).
Always writes .json + .md under --out-dir.
`);
}

export async function runCli(argv: string[] = Bun.argv.slice(2)): Promise<number> {
  const { values, positionals } = parseArgs({
    args: argv,
    options: {
      all: { type: 'boolean', short: 'a', default: false },
      section: { type: 'string', short: 's' },
      grep: { type: 'string', short: 'g' },
      rss: { type: 'boolean', short: 'r', default: false },
      url: { type: 'string' },
      'out-dir': { type: 'string', default: '.tmp' },
      join: { type: 'boolean', default: false },
      'derived-table': { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    printHelp();
    return 0;
  }

  const urlOpt = values.url?.trim();
  const positional = positionals[0]?.trim();
  const version =
    (urlOpt && parseBlogVersion(urlOpt)) ||
    (positional && parseBlogVersion(positional)) ||
    DEFAULT_VERSION;
  const source = urlOpt || blogUrlForVersion(version);
  if (urlOpt) {
    try {
      assertBlogPostUrl(source);
    } catch (err) {
      console.error(err instanceof Error ? err.message : String(err));
      return 1;
    }
  }
  const htmlPath =
    positional && !positional.startsWith('http')
      ? resolvePath(positional)
      : `/tmp/bun-v${version}.html`;
  const outDir = resolvePath(REPO_ROOT, values['out-dir'] || '.tmp');

  const html = await ensureHtml({ htmlPath, sourceUrl: source });
  const extracted = extractCodeBlocks(html);

  if (extracted.codeBlockCount === 0) {
    console.error('No div.CodeBlock regions found. HTML shape may have changed; check selector.');
    return 1;
  }

  const stem = `bun-v${version}-CodeBlock`;
  const jsonPath = resolvePath(outDir, `${stem}.json`);
  const mdPath = resolvePath(outDir, `${stem}.md`);
  const derivedPath = resolvePath(outDir, `${stem}-DerivedApi.json`);
  const guideKey = guideKeyFromUrl(source, { keepHash: true });

  const blocksForJson = values.join
    ? await enrichBlocksWithTokens(extracted.blocks, { version, postUrl: source })
    : extracted.blocks;

  const inventory = {
    source,
    guideKey,
    selector: 'div.CodeBlock',
    version,
    runtime: { version: Bun.version, revision: Bun.revision },
    rss: BUN_RSS_URL,
    count: extracted.codeBlockCount,
    codeBlockTabCount: extracted.codeBlockTabCount,
    bySection: extracted.bySection,
    blocks: blocksForJson,
  };
  const wrote: string[] = [jsonPath, mdPath];
  await Bun.write(jsonPath, `${JSON.stringify(inventory, null, 2)}\n`);

  if (values['derived-table']) {
    const [tokenIndex, scrapeAliases] = await Promise.all([buildTokenIndex(), loadScrapeAliases()]);
    const derived = buildDerivedApiRows(extracted.blocks, {
      version,
      tokenIndex,
      scrapeAliases,
    });
    await Bun.write(
      derivedPath,
      `${JSON.stringify({ version, source, rows: derived }, null, 2)}\n`
    );
    wrote.push(derivedPath);
  }

  let md = `# Bun v${version} — HTML \`.CodeBlock\` extractions\n\n`;
  md += `Source: ${source}\n\nCount: **${extracted.codeBlockCount}**\n\n`;
  for (const b of extracted.blocks) {
    md += `### ${b.index}. ${b.section}\n\n\`\`\`\n${b.code}\n\`\`\`\n\n`;
  }
  await Bun.write(mdPath, md);

  const { entry: blog, rssNote } = await lookupReleaseEntry(version, { rss: values.rss });

  console.log(
    formatBanner({
      source,
      htmlPath,
      version,
      blog,
      rssNote,
      codeBlockCount: extracted.codeBlockCount,
      codeBlockTabCount: extracted.codeBlockTabCount,
      wrote,
    })
  );
  console.log('');

  const rows = extracted.blocks.map(b => ({
    '#': b.index,
    section: b.section,
    lines: b.code.split('\n').length,
    preview: previewLine(b.code),
  }));
  console.log(Bun.inspect.table(rows, ['#', 'section', 'lines', 'preview'], { colors: true }));

  const sectionNum =
    values.section != null && values.section !== ''
      ? Number.parseInt(values.section, 10)
      : undefined;
  const bodies = filterBlocks(extracted.blocks, {
    all: values.all,
    section: sectionNum,
    grep: values.grep,
  });

  for (const b of bodies) {
    const lineCount = b.code.split('\n').length;
    console.log('');
    console.log(`── #${b.index}  ${b.section}  (${lineCount} lines) ──`);
    console.log(b.code);
  }

  if ((values.section != null || values.grep) && bodies.length === 0) {
    console.error('\nNo blocks matched --section / --grep.');
    return 1;
  }

  return 0;
}

if (import.meta.main) {
  const code = await runCli();
  process.exit(code);
}
