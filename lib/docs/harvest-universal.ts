// @see https://bun.com/docs/runtime/http/fetch — fetch
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/markdown#bun-markdown-html — Bun.markdown.html
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
/**
 * Universal harvest CLI: URL + out dir + crawl depth. Tables/footnotes stay on
 * unless includeTables / includeFootnotes is false. `--ai` is the only way to
 * call the summariser (keys from env, never from argv).
 */
import {
  DEFAULT_HARVEST_MAP_CONFIG,
  extractCodeBlocks,
  filterHarvestForConfig,
  formatHarvestFlagCmdTable,
  mapHarvestToBlogHtml,
  mapHarvestToBlogMarkdown,
  summarizeHarvestMap,
  type ExtractResult,
  type HarvestAiSummary,
  type HarvestMapConfig,
} from './blog-codeblocks.ts';
import {
  isHarvestHttpUrl,
  rewriteHarvestFile,
  rewriteHarvestResponse,
} from './harvest-html-rewriter.ts';

export type HarvestUniversalArgs = {
  ai: boolean;
  help: boolean;
  url: string;
  outDir: string;
  depth: number;
};

export function parseHarvestUniversalArgv(argv: string[]): HarvestUniversalArgs {
  const rest: string[] = [];
  let ai = false;
  let help = false;
  for (const arg of argv) {
    if (arg === '--ai') ai = true;
    else if (arg === '-h' || arg === '--help') help = true;
    else rest.push(arg);
  }
  const url = rest[0]?.trim() ?? '';
  const outDir = rest[1]?.trim() ?? '';
  const depth = rest[2] == null || rest[2] === '' ? 0 : Number.parseInt(rest[2], 10);
  return { ai, help, url, outDir, depth: Number.isFinite(depth) && depth >= 0 ? depth : 0 };
}

export function harvestUniversalUsage(): string {
  return `Usage:
  bun tools/harvest.ts [--ai] <url> <outdir> [depth]

  --ai      Summarise each H2 (Ollama llama2 by default; HARVEST_AI_API_KEY for hosted providers)
  url       http(s) page or a local HTML file
  outdir    Report directory (report.md / report.html / report.json)
  depth     Same-origin link crawl depth. 0 = this page only.

Toggle include* in tools/harvest.ts CONFIG. Template:

${formatHarvestFlagCmdTable()}

Tables, footnotes, and Open Graph / Twitter social tags are extracted unless
includeTables, includeFootnotes, or includeSocial is false. HTMLRewriter reads
og:* / twitter:* / title fallbacks and rewrites img[src], a[href], and share
images to absolute URLs. Bun transform() inputs: Response, string, ArrayBuffer;
Blob and File wrap in Response. Cloudflare Workers only supports Response.
`;
}

function isHttpUrl(value: string): boolean {
  return isHarvestHttpUrl(value);
}

function isSkippableHref(href: string): boolean {
  return (
    href.startsWith('#') ||
    href.startsWith('mailto:') ||
    href.startsWith('javascript:') ||
    /\.(css|js|mjs|png|jpe?g|gif|svg|webp|ico|woff2?|zip|pdf)(\?|$)/i.test(href)
  );
}

export async function readHarvestHtml(source: string): Promise<string> {
  if (!isHttpUrl(source)) {
    const file = Bun.file(source);
    if (!(await file.exists())) throw new Error(`Missing HTML: ${source}`);
    return rewriteHarvestFile(file);
  }
  const response = await fetch(source);
  if (!response.ok) throw new Error(`fetch ${source} HTTP ${response.status}`);
  return rewriteHarvestResponse(response, source);
}

function sameOrigin(fromUrl: string, href: string): string | null {
  if (!isHttpUrl(fromUrl) || isSkippableHref(href)) return null;
  try {
    const resolved = new URL(href, fromUrl);
    const origin = new URL(fromUrl);
    if (resolved.origin !== origin.origin) return null;
    resolved.hash = '';
    return resolved.href;
  } catch {
    return null;
  }
}

export async function harvestPages(
  startUrl: string,
  depth: number
): Promise<Array<{ url: string; extracted: ExtractResult }>> {
  const queue: Array<{ url: string; remaining: number }> = [{ url: startUrl, remaining: depth }];
  const seen = new Set<string>();
  const pages: Array<{ url: string; extracted: ExtractResult }> = [];
  while (queue.length > 0 && pages.length < 20) {
    const next = queue.shift();
    if (!next || seen.has(next.url)) continue;
    seen.add(next.url);
    const html = await readHarvestHtml(next.url);
    const extracted = extractCodeBlocks(html, {
      includeGenericPre: true,
      baseUrl: isHttpUrl(next.url) ? next.url : undefined,
    });
    pages.push({ url: next.url, extracted });
    if (next.remaining <= 0) continue;
    for (const link of extracted.links) {
      const child = isHttpUrl(next.url) ? sameOrigin(next.url, link.href) : null;
      if (child && !seen.has(child)) queue.push({ url: child, remaining: next.remaining - 1 });
    }
  }
  return pages;
}

export async function runHarvestUniversal(
  argv: string[] = Bun.argv.slice(2),
  config: HarvestMapConfig = DEFAULT_HARVEST_MAP_CONFIG
): Promise<number> {
  const args = parseHarvestUniversalArgv(argv);
  if (args.help) {
    console.log(harvestUniversalUsage());
    return 0;
  }
  if (!args.url || !args.outDir) {
    console.error(harvestUniversalUsage());
    return 1;
  }

  const pages = await harvestPages(args.url, args.depth);
  const primary = pages[0];
  if (!primary) {
    console.error('No pages harvested');
    return 1;
  }

  const resolved: HarvestMapConfig = {
    ...config,
    enableAI: args.ai,
    includeTables: config.includeTables !== false,
    includeFootnotes: config.includeFootnotes !== false,
    includeSocial: config.includeSocial !== false,
  };
  const extracted = filterHarvestForConfig(primary.extracted, resolved);

  let summaries: Record<string, HarvestAiSummary> = {};
  if (args.ai) {
    summaries = await summarizeHarvestMap(extracted, { ...resolved, enableAI: true });
  }

  const blogMap = {
    sourceUrl: isHttpUrl(args.url) ? args.url : primary.url,
    summaries,
    config: resolved,
  };
  const markdown = mapHarvestToBlogMarkdown(extracted, blogMap);
  const html = mapHarvestToBlogHtml(extracted, blogMap);

  const outMd = `${args.outDir.replace(/\/$/, '')}/report.md`;
  const outHtml = `${args.outDir.replace(/\/$/, '')}/report.html`;
  const outJson = `${args.outDir.replace(/\/$/, '')}/report.json`;
  await Bun.write(outMd, markdown);
  await Bun.write(outHtml, html);
  if (resolved.includeRawJson) {
    const json = `${JSON.stringify(
      {
        url: args.url,
        depth: args.depth,
        ai: args.ai,
        config: resolved,
        pages: pages.map(page => ({
          url: page.url,
          stats: {
            blocks: page.extracted.codeBlockCount,
            tables: page.extracted.tables.length,
            footnotes: page.extracted.footnotes.length,
            social: Object.keys(page.extracted.social).length,
          },
        })),
        extracted,
        summaries,
      },
      null,
      2
    )}\n`;
    await Bun.write(outJson, json);
    console.log(`wrote ${outJson}`);
  }
  console.log(`wrote ${outMd}`);
  console.log(`wrote ${outHtml}`);
  console.log(
    `tables ${extracted.tables.length} · footnotes ${extracted.footnotes.length} · blocks ${extracted.codeBlockCount} · pages ${pages.length}`
  );
  return 0;
}
