#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table guide
// @see https://bun.com/reference/bun/inspect/table — Bun.inspect.table reference
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth guide
// @see https://bun.com/reference/bun/stringWidth — Bun.stringWidth reference
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file guide
// @see https://bun.com/reference/bun/file — Bun.file reference
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write guide
// @see https://bun.com/reference/bun/write — Bun.write reference
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob.match guide
// @see https://bun.com/reference/bun/Glob/match — Bun.Glob.match reference
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/reference/bun/markdown/html — Bun.markdown.html reference
// @see https://bun.com/docs/runtime/markdown#options — Bun.markdown.Options
// @see https://bun.com/reference/bun/markdown/Options — Bun.markdown.Options reference
// @see https://bun.com/docs/runtime/markdown#ansi-terminal-output — Bun.markdown.ansi
// @see https://bun.com/reference/bun/markdown/ansi — Bun.markdown.ansi reference
// @see https://bun.com/reference/bun/markdown/AnsiTheme — Bun.markdown.AnsiTheme reference
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-revision — Bun.revision
// @see https://bun.com/rss.xml — Bun blog RSS
// @see https://bun.com/docs/guides/process/argv — util.parseArgs (page restructured, section anchors removed)
/**
 * Extract `<div class="CodeBlock">` regions from a Bun blog HTML post.
 *
 * Default run: banner + index table (no bodies). Bodies via --all / --section / --grep.
 *
 *   bun tools/bun-blog-codeblocks.ts [/path/to/bun-vX.Y.Z.html]
 *   bun tools/bun-blog-codeblocks.ts --url https://bun.com/blog/bun-v1.3.6
 *   bun tools/bun-blog-codeblocks.ts -s 14
 *   bun tools/bun-blog-codeblocks.ts -g 'requestPayer|files'
 *   bun tools/bun-blog-codeblocks.ts --mode join
 *   bun tools/bun-blog-codeblocks.ts --mode all
 *   bun tools/bun-blog-codeblocks.ts --markdown-format all --markdown-preset secure
 *   bun tools/bun-blog-codeblocks.ts --offline /path/to/saved.html
 *   bun tools/bun-blog-codeblocks.ts --rss
 */
import { parseArgs } from 'util';
import { logTable } from '../lib/console-depth.ts';
import {
  classifySectionHeading,
  type SectionKind,
  type TokenIndex,
} from '../lib/docs/blog-release-tokens.ts';
import {
  decodeHtmlEntities,
  extractCodeBlocks,
  extractCodeBlocksFromFile,
  stripShikiPre,
  type CodeBlock,
  type CodeBlockClassSummary,
  type ExtractResult,
} from '../lib/docs/blog-codeblocks.ts';
import { bunBlog, BunBlogPattern, guideKeyFromUrl } from '../lib/docs/bun-site-url.ts';
import {
  BUN_GUIDES_INDEX,
  BUN_MARKDOWN_CROSS_REFERENCES,
  MARKDOWN_PRESET_NAMES,
  markdownHtml,
  mergeMarkdownOptions,
  parseMarkdownOptionOverrides,
  resolveMarkdownPreset,
  type MarkdownPresetName,
} from '../lib/markdown/options.ts';
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
  extractCodeBlocksFromFile,
  stripShikiPre,
} from '../lib/docs/blog-codeblocks.ts';

export type CodeBlockWithTokens = CodeBlock & {
  matchedTokens: string[];
};

export type BlogExampleHit = {
  lang: string;
  body: string;
  version: string;
  url: string;
  guideKey: string;
  section: string;
  blockIndex: number;
  kind: SectionKind;
};

export type BlogExamplesEntry = {
  name: string;
  examples: BlogExampleHit[];
};

export type DerivedApiRow = {
  label: string;
  catalogToken: string | null;
  since: string;
  blockIndex: number;
  lineRange: [number, number];
  preview: string;
  source: 'blog-codeblock';
};

export const CODE_BLOCK_MODES = ['index', 'join', 'derived', 'all'] as const;
export type CodeBlockMode = (typeof CODE_BLOCK_MODES)[number];

export type CodeBlockModePlan = {
  mode: CodeBlockMode;
  join: boolean;
  derived: boolean;
};

export const MARKDOWN_OUTPUT_FORMATS = ['markdown', 'html', 'ansi', 'all'] as const;
export type MarkdownOutputFormat = (typeof MARKDOWN_OUTPUT_FORMATS)[number];

export type MarkdownOutputPlan = {
  format: MarkdownOutputFormat;
  html: boolean;
  ansi: boolean;
  preset: MarkdownPresetName;
  parserOverrides: Bun.markdown.Options;
  parserOptions: Bun.markdown.Options;
  ansiTheme: Bun.markdown.AnsiTheme;
};

const DEFAULT_VERSION = '1.3.6';
const REPO_ROOT = resolvePath(import.meta.dir, '..');

export const CODE_BLOCK_TABLE_PROPERTIES = [
  '#',
  'status',
  'class',
  'section',
  'lines',
  'preview',
] as const;

export const CODE_BLOCK_CLASS_TABLE_PROPERTIES = ['class', 'status', 'count'] as const;
export const MARKDOWN_REFERENCE_TABLE_PROPERTIES = [
  'surface',
  'role',
  'guide',
  'reference',
  'released',
  'releaseRef',
  'latestUpdate',
  'updateRef',
] as const;

export function resolveCodeBlockMode(options: {
  mode?: string;
  join?: boolean;
  derivedTable?: boolean;
}): CodeBlockModePlan {
  const explicit = options.mode?.trim();
  if (explicit && !CODE_BLOCK_MODES.some(mode => mode === explicit)) {
    throw new Error(
      `Invalid --mode ${JSON.stringify(explicit)}; expected ${CODE_BLOCK_MODES.join('|')}`
    );
  }
  const compatibilityJoin = options.join === true;
  const compatibilityDerived = options.derivedTable === true;
  if (explicit && (compatibilityJoin || compatibilityDerived)) {
    throw new Error('Do not combine --mode with compatibility flags --join/--derived-table');
  }
  const mode = (explicit ??
    (compatibilityJoin && compatibilityDerived
      ? 'all'
      : compatibilityJoin
        ? 'join'
        : compatibilityDerived
          ? 'derived'
          : 'index')) as CodeBlockMode;
  return {
    mode,
    join: mode === 'join' || mode === 'all',
    derived: mode === 'derived' || mode === 'all',
  };
}

export function resolveMarkdownOutputPlan(options: {
  format?: string;
  preset?: string;
  parserOptions?: string;
  columns?: string;
  hyperlinks?: boolean;
  noColors?: boolean;
  light?: boolean;
  dark?: boolean;
  kittyGraphics?: boolean;
}): MarkdownOutputPlan {
  const requestedFormat = options.format?.trim() || 'markdown';
  if (!MARKDOWN_OUTPUT_FORMATS.some(format => format === requestedFormat)) {
    throw new Error(
      `Invalid --markdown-format ${JSON.stringify(requestedFormat)}; expected ${MARKDOWN_OUTPUT_FORMATS.join('|')}`
    );
  }
  const format = requestedFormat as MarkdownOutputFormat;
  const html = format === 'html' || format === 'all';
  const ansi = format === 'ansi' || format === 'all';

  if ((options.preset != null || options.parserOptions != null) && !html) {
    throw new Error('--markdown-preset/--markdown-options require --markdown-format=html|all');
  }
  if (
    (options.columns != null ||
      options.hyperlinks === true ||
      options.noColors === true ||
      options.light === true ||
      options.dark === true ||
      options.kittyGraphics === true) &&
    !ansi
  ) {
    throw new Error('ANSI theme flags require --markdown-format=ansi|all');
  }
  if (options.light === true && options.dark === true) {
    throw new Error('Do not combine --markdown-light with --markdown-dark');
  }
  if (options.noColors === true && (options.light === true || options.dark === true)) {
    throw new Error('--markdown-light/--markdown-dark have no effect with --markdown-no-colors');
  }

  const resolvedPreset = resolveMarkdownPreset(options.preset?.trim() || 'readme');
  const parserOverrides = parseMarkdownOptionOverrides(options.parserOptions);
  const ansiTheme: Bun.markdown.AnsiTheme = {};
  if (options.columns != null) {
    const columns = Number(options.columns);
    if (!Number.isSafeInteger(columns) || columns < 0) {
      throw new Error('--markdown-columns must be a non-negative safe integer');
    }
    ansiTheme.columns = columns;
  }
  if (options.hyperlinks === true) ansiTheme.hyperlinks = true;
  if (options.noColors === true) ansiTheme.colors = false;
  if (options.light === true) ansiTheme.light = true;
  if (options.dark === true) ansiTheme.light = false;
  if (options.kittyGraphics === true) ansiTheme.kittyGraphics = true;

  return {
    format,
    html,
    ansi,
    preset: resolvedPreset.name,
    parserOverrides,
    parserOptions: mergeMarkdownOptions(resolvedPreset.options, parserOverrides),
    ansiTheme,
  };
}

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

function inferBlockLang(): string {
  return 'ts';
}

export function matchBlocksToTokens(
  blocks: CodeBlock[],
  opts: {
    version: string;
    postUrl: string;
    tokenIndex: TokenIndex;
    scrapeAliases: Record<string, string>;
  }
): BlogExamplesEntry[] {
  const byName = new Map<string, BlogExamplesEntry>();
  const seen = new Set<string>();
  const guideKey = guideKeyFromUrl(opts.postUrl, { keepHash: true });

  for (const block of blocks) {
    const kind = classifySectionHeading(block.section);
    if (kind === 'skip') continue;
    const matched = new Set<string>();
    for (const candidate of extractTokenCandidates(`${block.section}\n${block.code}`)) {
      const name =
        matchCatalogTokenWithAliases(candidate, opts.tokenIndex, opts.scrapeAliases) ?? null;
      if (!name || matched.has(name)) continue;
      matched.add(name);
      const dedupeKey = `${name}\0${block.index}`;
      if (seen.has(dedupeKey)) continue;
      seen.add(dedupeKey);
      const entry = byName.get(name) ?? { name, examples: [] };
      entry.examples.push({
        lang: inferBlockLang(),
        body: block.code,
        version: opts.version,
        url: opts.postUrl,
        guideKey: guideKey || bunBlog(`bun-v${opts.version}`),
        section: block.section,
        blockIndex: block.index,
        kind,
      });
      byName.set(name, entry);
    }
  }
  return [...byName.values()].sort((left, right) => left.name.localeCompare(right.name));
}

export function buildDerivedApiRows(
  blocks: CodeBlock[],
  opts: {
    version: string;
    tokenIndex: TokenIndex;
    scrapeAliases: Record<string, string>;
  }
): DerivedApiRow[] {
  const rows: DerivedApiRow[] = [];
  for (const block of blocks) {
    const lines = block.code.split('\n');
    let chunkStart = 0;
    let chunkLines: string[] = [];
    const flush = (endLine: number) => {
      if (chunkLines.length === 0) return;
      const body = chunkLines.join('\n').trim();
      if (!body) return;
      let catalogToken: string | null = null;
      for (const candidate of extractTokenCandidates(`${block.section}\n${body}`)) {
        const name = matchCatalogTokenWithAliases(candidate, opts.tokenIndex, opts.scrapeAliases);
        if (name) {
          catalogToken = name;
          break;
        }
      }
      const preview =
        chunkLines.map(line => line.trim()).find(line => line && !line.startsWith('//')) ?? body;
      rows.push({
        label: preview.slice(0, 80),
        catalogToken,
        since: opts.version,
        blockIndex: block.index,
        lineRange: [chunkStart + 1, endLine],
        preview: preview.slice(0, 60),
        source: 'blog-codeblock',
      });
    };

    for (let index = 0; index < lines.length; index++) {
      const line = lines[index]!;
      const boundary =
        line.trim() === '' ||
        (line.trim().startsWith('//') && chunkLines.length > 0 && index > chunkStart);
      if (boundary && chunkLines.length > 0) {
        flush(index);
        chunkLines = [];
        chunkStart = index + 1;
      }
      if (line.trim()) chunkLines.push(line);
    }
    if (chunkLines.length > 0) flush(lines.length);
  }
  return rows;
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
  file: Bun.BunFile;
  sourceUrl: string;
  forceFetch?: boolean;
  offline?: boolean;
}): Promise<Bun.BunFile> {
  const file = opts.file;
  if (!opts.forceFetch && (await file.exists())) return file;

  if (opts.offline) {
    throw new Error('offline mode does not fetch missing HTML');
  }

  assertBlogPostUrl(opts.sourceUrl);
  const html = await fetchPostHtml(opts.sourceUrl, opts.forceFetch);
  if (!html) throw new Error('empty HTML from cache/fetch');
  if (!(await file.exists())) {
    await Bun.write(file, html);
  }
  return file;
}

function reportMissingHtml(file: Bun.BunFile, sourceUrl: string, error: Error): void {
  console.error(`Missing HTML: ${file.name ?? '(unnamed BunFile)'}`);
  console.error(`Fetch unavailable (${error.message}). Download with:`);
  console.error(`  curl -fsSL '${sourceUrl}' -o '${file.name ?? 'bun-blog.html'}'`);
}

export function codeBlockClassRows(classStatuses: readonly CodeBlockClassSummary[]) {
  return classStatuses.map(summary => ({
    class: summary.className,
    status: summary.statusLabel,
    count: summary.count,
  }));
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
  --mode <mode>       index | join | derived | all (default index)
  --join              Compatibility alias for --mode=join
  --derived-table     Compatibility alias for --mode=derived
  --markdown-format   markdown | html | ansi | all (default markdown)
  --markdown-preset   ${MARKDOWN_PRESET_NAMES.join(' | ')} (HTML parser options)
  --markdown-options  Exact comma-separated Bun parser overrides (name=value)
  --markdown-columns  Terminal width; 0 disables ANSI wrapping
  --markdown-hyperlinks  Enable OSC 8 links in ANSI projection
  --markdown-no-colors   Disable colors in ANSI projection
  --markdown-light    Select the ANSI palette for a light terminal background
  --markdown-dark     Select the ANSI palette for a dark terminal background
  --markdown-kitty-graphics  Render local images with Kitty graphics when supported
  --references        Print exact Bun guide/API cross-references and exit
  --offline           Never fetch; require the saved HTML input
  -r, --rss           Opt-in live RSS enrich when release-index misses
  -h, --help          Show help

Default stdout: banner + Bun.inspect.table index (no bodies).
Always writes .json + .md under --out-dir; HTML/ANSI are opt-in projections.
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
      mode: { type: 'string' },
      join: { type: 'boolean', default: false },
      'derived-table': { type: 'boolean', default: false },
      'markdown-format': { type: 'string' },
      'markdown-preset': { type: 'string' },
      'markdown-options': { type: 'string' },
      'markdown-columns': { type: 'string' },
      'markdown-hyperlinks': { type: 'boolean', default: false },
      'markdown-no-colors': { type: 'boolean', default: false },
      'markdown-light': { type: 'boolean', default: false },
      'markdown-dark': { type: 'boolean', default: false },
      'markdown-kitty-graphics': { type: 'boolean', default: false },
      references: { type: 'boolean', default: false },
      offline: { type: 'boolean', default: false },
      help: { type: 'boolean', short: 'h', default: false },
    },
    allowPositionals: true,
    strict: true,
  });

  if (values.help) {
    printHelp();
    return 0;
  }

  if (values.references) {
    console.log(`Bun guides  ${BUN_GUIDES_INDEX}`);
    logTable([...BUN_MARKDOWN_CROSS_REFERENCES], [...MARKDOWN_REFERENCE_TABLE_PROPERTIES]);
    return 0;
  }

  let modePlan: CodeBlockModePlan;
  let markdownPlan: MarkdownOutputPlan;
  try {
    modePlan = resolveCodeBlockMode({
      mode: values.mode,
      join: values.join,
      derivedTable: values['derived-table'],
    });
    markdownPlan = resolveMarkdownOutputPlan({
      format: values['markdown-format'],
      preset: values['markdown-preset'],
      parserOptions: values['markdown-options'],
      columns: values['markdown-columns'],
      hyperlinks: values['markdown-hyperlinks'],
      noColors: values['markdown-no-colors'],
      light: values['markdown-light'],
      dark: values['markdown-dark'],
      kittyGraphics: values['markdown-kitty-graphics'],
    });
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
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

  const htmlFile = Bun.file(htmlPath);
  let ensuredHtmlFile: Bun.BunFile;
  try {
    ensuredHtmlFile = await ensureHtml({
      file: htmlFile,
      sourceUrl: source,
      offline: values.offline,
    });
  } catch (error) {
    reportMissingHtml(htmlFile, source, error instanceof Error ? error : new Error(String(error)));
    return 1;
  }
  const extracted = await extractCodeBlocksFromFile(ensuredHtmlFile);

  if (extracted.codeBlockCount === 0) {
    console.error('No div.CodeBlock regions found. HTML shape may have changed; check selector.');
    return 1;
  }

  const stem = `bun-v${version}-CodeBlock`;
  const jsonPath = resolvePath(outDir, `${stem}.json`);
  const mdPath = resolvePath(outDir, `${stem}.md`);
  const renderedHtmlPath = resolvePath(outDir, `${stem}.html`);
  const renderedAnsiPath = resolvePath(outDir, `${stem}.ansi.txt`);
  const derivedPath = resolvePath(outDir, `${stem}-DerivedApi.json`);
  const guideKey = guideKeyFromUrl(source, { keepHash: true });

  const blocksForJson = modePlan.join
    ? await enrichBlocksWithTokens(extracted.blocks, { version, postUrl: source })
    : extracted.blocks;

  const inventory = {
    source,
    guideKey,
    selector: 'div.CodeBlock',
    mode: modePlan.mode,
    version,
    runtime: { version: Bun.version, revision: Bun.revision },
    rss: BUN_RSS_URL,
    count: extracted.codeBlockCount,
    codeBlockTabCount: extracted.codeBlockTabCount,
    classPattern: extracted.classPattern,
    classStatuses: extracted.classStatuses,
    markdown: {
      format: markdownPlan.format,
      preset: markdownPlan.html ? markdownPlan.preset : null,
      parserOverrides: markdownPlan.html ? markdownPlan.parserOverrides : null,
      parserOptions: markdownPlan.html ? markdownPlan.parserOptions : null,
      ansiTheme: markdownPlan.ansi ? markdownPlan.ansiTheme : null,
    },
    bySection: extracted.bySection,
    blocks: blocksForJson,
  };
  const wrote: string[] = [jsonPath, mdPath];
  await Bun.write(jsonPath, `${JSON.stringify(inventory, null, 2)}\n`);

  if (modePlan.derived) {
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
  md += `Class pattern: \`${extracted.classPattern}\` via \`Bun.Glob.match()\`\n\n`;
  md += '| Class | Status | Count |\n| --- | --- | ---: |\n';
  for (const row of codeBlockClassRows(extracted.classStatuses)) {
    md += `| \`${row.class}\` | ${row.status} | ${row.count} |\n`;
  }
  md += '\n';
  for (const b of extracted.blocks) {
    md += `### ${b.index}. ${b.section}\n\nStatus: **${b.statusLabel}** · Class: \`${b.classNames.join(' ')}\`\n\n\`\`\`\n${b.code}\n\`\`\`\n\n`;
  }
  await Bun.write(mdPath, md);
  if (markdownPlan.html) {
    await Bun.write(renderedHtmlPath, markdownHtml(md, markdownPlan.parserOptions));
    wrote.push(renderedHtmlPath);
  }
  if (markdownPlan.ansi) {
    await Bun.write(renderedAnsiPath, Bun.markdown.ansi(md, markdownPlan.ansiTheme));
    wrote.push(renderedAnsiPath);
  }

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
    status: b.statusLabel,
    class: b.classNames.join(' '),
    section: b.section,
    lines: b.code.split('\n').length,
    preview: previewLine(b.code),
  }));
  logTable(rows, [...CODE_BLOCK_TABLE_PROPERTIES], { colors: true });
  console.log('');
  console.log('CodeBlock class status · Bun.Glob("CodeBlock*")');
  logTable(codeBlockClassRows(extracted.classStatuses), [...CODE_BLOCK_CLASS_TABLE_PROPERTIES], {
    colors: true,
  });

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
