#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/bundler/index#basic-example — Bun.build
// @see https://bun.com/reference/bun/Transpiler — Bun.Transpiler
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
import { applyUnknownLongOptionGuardFor } from '../lib/docs/ref-id-tool-flags.ts';
/**
 * Produce the Cloudflare Pages static output without mutating readable sources.
 *
 * The optimizer copies public/ to tmp/pages-optimized, minifies portal JS/CSS,
 * minifies inline scripts/styles, and records the aggregate initial-execution
 * JS+CSS graph for every portal page.
 */
import { isModuleEntrypoint } from '../lib/bun-executable.ts';
import { dirnamePath, joinPath, resolvePath } from '../lib/path-bun.ts';

const argv = import.meta.main
  ? applyUnknownLongOptionGuardFor('portal:optimize', Bun.argv.slice(2))
  : Bun.argv.slice(2);
const ROOT = resolvePath(import.meta.dir, '..');
const PUBLIC_ROOT = joinPath(ROOT, 'public');
const DEFAULT_OUTDIR = joinPath(ROOT, 'tmp/pages-optimized');
const DEFAULT_REPORT = joinPath(ROOT, 'tools/performance/portal-performance-report.json');
const DEFAULT_BASELINE = joinPath(ROOT, 'tools/performance/portal-performance-baseline.json');

type PageBundleRow = {
  page: string;
  javascriptBytes: number;
  stylesheetBytes: number;
  inlineBytes: number;
  totalBytes: number;
};

type PortalBundleReport = {
  schemaVersion: 1;
  metric: 'aggregate-initial-js-css-by-route';
  pageCount: number;
  baselineRevision: string;
  baselineBytes: number;
  sourceBytes: number;
  optimizedBytes: number;
  targetReductionPct: number;
  reductionPct: number;
  targetBytes: number;
  pass: boolean;
  source: PageBundleRow[];
  optimized: PageBundleRow[];
};

type PortalPerformanceBaseline = {
  schemaVersion: 1;
  metric: 'aggregate-initial-js-css-by-route';
  revision: string;
  pageCount: number;
  baselineBytes: number;
  minimumReductionPct: number;
};

function isReductionPercentage(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 && value < 100;
}

function flagValue(name: string): string | undefined {
  const prefix = `--${name}=`;
  const inline = Bun.argv.find(arg => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = Bun.argv.indexOf(`--${name}`);
  return index >= 0 ? Bun.argv[index + 1] : undefined;
}

function isRunnableInlineScript(attributes: string): boolean {
  if (/\bsrc\s*=/.test(attributes)) return false;
  const type = attributes.match(/\btype\s*=\s*["']([^"']+)["']/i)?.[1]?.toLowerCase();
  return (
    !type || type === 'module' || type === 'text/javascript' || type === 'application/javascript'
  );
}

export function measureInlineAssetBytes(html: string): number {
  const scriptBytes = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter(match => isRunnableInlineScript(match[1] ?? ''))
    .reduce((total, match) => total + (match[2]?.length ?? 0), 0);
  const styleBytes = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].reduce(
    (total, match) => total + (match[1]?.length ?? 0),
    0
  );
  return scriptBytes + styleBytes;
}

/** Conservative CSS whitespace minifier used only if Bun's CSS bundler rejects a file. */
export function minifyCssFallback(source: string): string {
  let output = '';
  let quote = '';
  let pendingSpace = false;
  for (let index = 0; index < source.length; index += 1) {
    const char = source[index]!;
    const next = source[index + 1];
    if (quote) {
      output += char;
      if (char === '\\' && next) {
        output += next;
        index += 1;
      } else if (char === quote) {
        quote = '';
      }
      continue;
    }
    if ((char === '"' || char === "'") && !quote) {
      if (pendingSpace && output && !/[{:,;>+~\s]$/.test(output)) output += ' ';
      pendingSpace = false;
      quote = char;
      output += char;
      continue;
    }
    if (char === '/' && next === '*') {
      const end = source.indexOf('*/', index + 2);
      index = end === -1 ? source.length : end + 1;
      pendingSpace = true;
      continue;
    }
    if (/\s/.test(char)) {
      pendingSpace = true;
      continue;
    }
    if (/[{}:,;>+~]/.test(char)) {
      output = output.replace(/\s+$/, '');
      output += char;
      pendingSpace = false;
      continue;
    }
    if (pendingSpace && output && !/[{:,;>+~\s]$/.test(output)) output += ' ';
    pendingSpace = false;
    output += char;
  }
  return output.trim();
}

async function replaceAsync(
  source: string,
  pattern: RegExp,
  replacer: (match: RegExpExecArray) => Promise<string>
): Promise<string> {
  let output = '';
  let cursor = 0;
  for (const match of source.matchAll(pattern)) {
    const index = match.index ?? 0;
    output += source.slice(cursor, index);
    output += await replacer(match);
    cursor = index + match[0].length;
  }
  return output + source.slice(cursor);
}

export async function optimizeHtml(
  html: string,
  transpiler = new Bun.Transpiler({
    loader: 'js',
    target: 'browser',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  })
): Promise<string> {
  let scripts = await replaceAsync(html, /<script([^>]*)>([\s\S]*?)<\/script>/gi, async match => {
    const attributes = match[1] ?? '';
    const body = match[2] ?? '';
    if (!isRunnableInlineScript(attributes) || !body.trim()) return match[0];
    try {
      return `<script${attributes}>${await transpiler.transform(body)}</script>`;
    } catch {
      return match[0];
    }
  });
  if (/\bsrc\s*=\s*["']\/portal\/topbar\.js["']/i.test(html)) {
    scripts = scripts.replace(
      /<script\b(?=[^>]*\bsrc\s*=\s*["']\/portal\/(?:data\.js|components\/(?:sidebar|notification|footer)\.js)["'])[^>]*>\s*<\/script>/gi,
      ''
    );
  }
  return replaceAsync(scripts, /<style([^>]*)>([\s\S]*?)<\/style>/gi, async match => {
    const attributes = match[1] ?? '';
    const body = match[2] ?? '';
    return `<style${attributes}>${minifyCssFallback(body)}</style>`;
  });
}

async function copyPublicTree(outdir: string): Promise<void> {
  try {
    for await (const relativePath of new Bun.Glob('**/*').scan({
      cwd: outdir,
      onlyFiles: true,
      dot: true,
    })) {
      await Bun.file(joinPath(outdir, relativePath)).delete();
    }
  } catch {
    // The first build has no output directory; Bun.write creates the path.
  }
  const files = new Bun.Glob('**/*');
  for await (const relativePath of files.scan({ cwd: PUBLIC_ROOT, onlyFiles: true, dot: true })) {
    const destination = joinPath(outdir, relativePath);
    await Bun.write(destination, Bun.file(joinPath(PUBLIC_ROOT, relativePath)));
  }
}

async function minifyJavaScript(outdir: string): Promise<void> {
  const transpiler = new Bun.Transpiler({
    loader: 'js',
    target: 'browser',
    minifyIdentifiers: true,
    minifySyntax: true,
    minifyWhitespace: true,
  });
  for await (const relativePath of new Bun.Glob('portal/**/*.js').scan({ cwd: PUBLIC_ROOT })) {
    const sourcePath = joinPath(PUBLIC_ROOT, relativePath);
    const destination = joinPath(outdir, relativePath);
    await Bun.write(destination, await transpiler.transform(await Bun.file(sourcePath).text()));
  }
}

async function minifyStylesheets(outdir: string): Promise<void> {
  for await (const relativePath of new Bun.Glob('portal/**/*.css').scan({ cwd: PUBLIC_ROOT })) {
    const sourcePath = joinPath(PUBLIC_ROOT, relativePath);
    const result = await Bun.build({
      entrypoints: [sourcePath],
      outdir: joinPath(ROOT, 'tmp/portal-css-minify'),
      write: false,
      minify: true,
      naming: '[name].css',
    });
    const css = result.outputs.find(output => output.path.endsWith('.css'));
    const optimized =
      result.success && css
        ? await css.text()
        : minifyCssFallback(await Bun.file(sourcePath).text());
    await Bun.write(joinPath(outdir, relativePath), optimized);
  }
}

async function minifyHtmlFiles(outdir: string): Promise<void> {
  for await (const relativePath of new Bun.Glob('portal/**/index.html').scan({
    cwd: PUBLIC_ROOT,
  })) {
    const source = await Bun.file(joinPath(PUBLIC_ROOT, relativePath)).text();
    await Bun.write(joinPath(outdir, relativePath), await optimizeHtml(source));
  }
}

function resolveAsset(root: string, htmlPath: string, reference: string): string {
  return reference.startsWith('/')
    ? joinPath(root, reference.slice(1))
    : resolvePath(dirnamePath(htmlPath), reference);
}

async function collectStaticJavaScript(entrypoints: string[], root: string): Promise<Set<string>> {
  const files = new Set<string>();
  const pending = [...entrypoints];
  while (pending.length > 0) {
    const path = pending.pop()!;
    if (files.has(path) || !(await Bun.file(path).exists())) continue;
    files.add(path);
    const source = await Bun.file(path).text();
    for (const match of source.matchAll(
      /(?:import(?!\s*\()|export)\s*(?:[^"']*?\s*from\s*)?["']([^"']+\.js)["']/g
    )) {
      const reference = match[1]!;
      pending.push(
        reference.startsWith('/')
          ? joinPath(root, reference.slice(1))
          : resolvePath(dirnamePath(path), reference)
      );
    }
  }
  return files;
}

async function collectStaticStylesheets(entrypoints: string[]): Promise<Set<string>> {
  const files = new Set<string>();
  const pending = [...entrypoints];
  while (pending.length > 0) {
    const path = pending.pop()!;
    if (files.has(path) || !(await Bun.file(path).exists())) continue;
    files.add(path);
    const source = await Bun.file(path).text();
    for (const match of source.matchAll(/@import\s+["']([^"']+\.css)["']/g)) {
      pending.push(resolvePath(dirnamePath(path), match[1]!));
    }
  }
  return files;
}

async function measurePortal(root: string): Promise<PageBundleRow[]> {
  const rows: PageBundleRow[] = [];
  for await (const relativePath of new Bun.Glob('portal/**/index.html').scan({ cwd: root })) {
    const htmlPath = joinPath(root, relativePath);
    const html = await Bun.file(htmlPath).text();
    const scriptPaths = [...html.matchAll(/<script[^>]*src=["']([^"'?#]+\.js)[^"']*["']/gi)]
      .map(match => match[1]!)
      .filter(reference => !/^https?:\/\//.test(reference))
      .map(reference => resolveAsset(root, htmlPath, reference));
    const stylesheetPaths = [...html.matchAll(/<link[^>]*href=["']([^"'?#]+\.css)["'][^>]*>/gi)]
      .map(match => match[1]!)
      .filter(reference => !/^https?:\/\//.test(reference))
      .map(reference => resolveAsset(root, htmlPath, reference));
    const javascript = await collectStaticJavaScript(scriptPaths, root);
    const stylesheets = await collectStaticStylesheets(stylesheetPaths);
    const javascriptBytes = [...javascript].reduce((total, path) => total + Bun.file(path).size, 0);
    const stylesheetBytes = [...stylesheets].reduce(
      (total, path) => total + Bun.file(path).size,
      0
    );
    const inlineBytes = measureInlineAssetBytes(html);
    rows.push({
      page: `/${relativePath.replace(/index\.html$/, '')}`,
      javascriptBytes,
      stylesheetBytes,
      inlineBytes,
      totalBytes: javascriptBytes + stylesheetBytes + inlineBytes,
    });
  }
  return rows.sort((left, right) => right.totalBytes - left.totalBytes);
}

export async function optimizePortalAssets(
  options: {
    outdir?: string;
    reportPath?: string;
    baselinePath?: string;
  } = {}
): Promise<PortalBundleReport> {
  const outdir = options.outdir ?? DEFAULT_OUTDIR;
  const baselinePath = options.baselinePath ?? DEFAULT_BASELINE;
  const baseline = (await Bun.file(baselinePath).json()) as PortalPerformanceBaseline;
  if (
    baseline.schemaVersion !== 1 ||
    baseline.metric !== 'aggregate-initial-js-css-by-route' ||
    !Number.isSafeInteger(baseline.baselineBytes) ||
    baseline.baselineBytes <= 0 ||
    !isReductionPercentage(baseline.minimumReductionPct)
  ) {
    throw new Error(`Unsupported portal performance baseline: ${baselinePath}`);
  }
  await copyPublicTree(outdir);
  await Promise.all([minifyJavaScript(outdir), minifyStylesheets(outdir), minifyHtmlFiles(outdir)]);

  const [source, optimized] = await Promise.all([
    measurePortal(PUBLIC_ROOT),
    measurePortal(outdir),
  ]);
  if (optimized.length !== source.length) {
    throw new Error(
      `Portal page copy is incomplete: source has ${source.length}, output has ${optimized.length}`
    );
  }
  const sourceBytes = source.reduce((total, row) => total + row.totalBytes, 0);
  const optimizedBytes = optimized.reduce((total, row) => total + row.totalBytes, 0);
  const { baselineBytes, minimumReductionPct } = baseline;
  const reductionPct = Number(
    (((baselineBytes - optimizedBytes) / baselineBytes) * 100).toFixed(2)
  );
  const report: PortalBundleReport = {
    schemaVersion: 1,
    metric: 'aggregate-initial-js-css-by-route',
    pageCount: optimized.length,
    baselineRevision: baseline.revision,
    baselineBytes,
    sourceBytes,
    optimizedBytes,
    targetReductionPct: minimumReductionPct,
    reductionPct,
    targetBytes: Math.floor(baselineBytes * (1 - minimumReductionPct / 100)),
    pass: reductionPct >= minimumReductionPct,
    source,
    optimized,
  };
  if (options.reportPath) {
    await Bun.write(options.reportPath, `${JSON.stringify(report, null, 2)}\n`);
  }
  return report;
}

async function main(): Promise<void> {
  const outdir = resolvePath(ROOT, flagValue('outdir') ?? 'tmp/pages-optimized');
  const reportPath = argv.includes('--no-report')
    ? undefined
    : resolvePath(ROOT, flagValue('report') ?? 'tools/performance/portal-performance-report.json');
  const report = await optimizePortalAssets({ outdir, reportPath });
  console.log(
    `Portal optimize: ${report.pageCount} pages · ${report.baselineBytes} → ${report.optimizedBytes} bytes · ${report.reductionPct}%`
  );
  console.log(`Output: ${outdir}`);
  if (reportPath) console.log(`Report: ${reportPath}`);
  if (!report.pass) {
    console.error(
      `Bundle target missed: ${report.reductionPct}% reduction; require ${report.targetReductionPct}%`
    );
    process.exitCode = 1;
  }
}

if (isModuleEntrypoint(import.meta)) {
  await main();
}

export { DEFAULT_BASELINE, DEFAULT_OUTDIR, DEFAULT_REPORT, measurePortal };
