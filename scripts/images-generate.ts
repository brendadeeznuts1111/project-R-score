#!/usr/bin/env bun
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/image
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/glob#quickstart
// @see https://bun.com/docs/runtime/utils#bun-main
// @see https://bun.com/reference/bun/argv
/**
 * Bun.Image CLI — avatar / hero / match / convert / placeholder templates.
 *
 *   bun run images:generate --template=avatar --source=./warehouse/avatars --size=128x128 --out=./public/avatars
 *   bun run images:generate --template=hero --source=./photo.jpg --out=./artifacts/hero.webp
 *   bun run images:generate --template=convert --source=./in --out=./out --format=webp
 *
 * Zero npm deps. Tennis HQ / portal asset pipeline.
 * @see docs/IMAGES.md
 */
import { joinPath, basenamePath, extnamePath, dirnamePath } from '../lib/path-bun.ts';
import { jsonOut } from '../lib/console-depth.ts';

type Template = 'avatar' | 'hero' | 'match' | 'convert' | 'placeholder';
type OutFormat = 'webp' | 'jpeg' | 'png' | 'avif';

type CliOpts = {
  template: Template;
  source: string;
  out: string;
  size: string;
  format: OutFormat;
  quality: number;
  fit: 'fill' | 'inside';
  maxPixels: number;
  json: boolean;
  dryRun: boolean;
};

const IMAGE_EXTS = new Set([
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',
  '.heic',
  '.avif',
]);

const DEFAULTS: CliOpts = {
  template: 'avatar',
  source: './warehouse/avatars',
  out: './public/avatars',
  size: '128x128',
  format: 'webp',
  quality: 80,
  fit: 'fill',
  maxPixels: 4096 * 4096,
  json: false,
  dryRun: false,
};

/** Optional defaults from config/images.toml when present. */
async function loadTomlDefaults(): Promise<Partial<CliOpts>> {
  try {
    const path = joinPath(import.meta.dir, '../config/images.toml');
    if (!(await Bun.file(path).exists())) return {};
    const raw = (await import(path, { with: { type: 'toml' } })) as {
      default?: {
        images?: {
          avatar_size?: string;
          hero_quality?: number;
          avatar_format?: string;
          cache_dir?: string;
          source_dir?: string;
          max_pixels?: number;
        };
      };
      images?: {
        avatar_size?: string;
        hero_quality?: number;
        avatar_format?: string;
        cache_dir?: string;
        source_dir?: string;
        max_pixels?: number;
      };
    };
    const img = raw.default?.images ?? raw.images;
    if (!img) return {};
    return {
      size: img.avatar_size,
      quality: img.hero_quality,
      format: (img.avatar_format as OutFormat) || undefined,
      out: img.cache_dir,
      source: img.source_dir,
      maxPixels: img.max_pixels,
    };
  } catch {
    return {};
  }
}

function parseArgs(argv: string[]): CliOpts {
  const opts = { ...DEFAULTS };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const next = () => argv[++i] ?? '';
    if (a === '--template' || a.startsWith('--template=')) {
      const v = a.includes('=') ? a.split('=')[1]! : next();
      opts.template = v as Template;
    } else if (a === '--source' || a.startsWith('--source=')) {
      opts.source = a.includes('=') ? a.split('=')[1]! : next();
    } else if (a === '--out' || a.startsWith('--out=')) {
      opts.out = a.includes('=') ? a.split('=')[1]! : next();
    } else if (a === '--size' || a.startsWith('--size=')) {
      opts.size = a.includes('=') ? a.split('=')[1]! : next();
    } else if (a === '--format' || a.startsWith('--format=')) {
      opts.format = (a.includes('=') ? a.split('=')[1]! : next()) as OutFormat;
    } else if (a === '--quality' || a.startsWith('--quality=')) {
      opts.quality = Number(a.includes('=') ? a.split('=')[1]! : next());
    } else if (a === '--fit' || a.startsWith('--fit=')) {
      const f = a.includes('=') ? a.split('=')[1]! : next();
      // Bun.Image only supports fill | inside (no cover) — map cover→fill
      opts.fit = f === 'inside' ? 'inside' : 'fill';
    } else if (a === '--max-pixels' || a.startsWith('--max-pixels=')) {
      opts.maxPixels = Number(a.includes('=') ? a.split('=')[1]! : next());
    } else if (a === '--json') opts.json = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--help' || a === '-h') {
      printHelp();
      process.exit(0);
    }
  }
  return opts;
}

function printHelp(): void {
  console.log(`Bun.Image generator — Tennis HQ / portal

Usage:
  bun run images:generate --template=<avatar|hero|match|convert|placeholder> [options]

Templates:
  avatar       Thumbnails (default 128x128 WebP) from dir or file
  hero         1200×630 social card WebP
  match        400×400 match preview
  convert      Bulk re-encode to --format
  placeholder  ThumbHash/LQIP data URLs (writes .txt next to --out)

Options:
  --source <path>     Input file or directory
  --out <path>        Output file or directory
  --size <WxH>        e.g. 128x128 (avatar/match)
  --format <fmt>      webp | jpeg | png | avif (default webp)
  --quality <1-100>   Encode quality (default 80; hero 85)
  --fit <fill|inside> Resize fit (cover is accepted as fill)
  --max-pixels <n>    Decompression bomb guard
  --json              Machine summary via jsonOut
  --dry-run           Plan only

Examples:
  bun run images:generate --template=avatar --source=./warehouse/avatars --size=128x128 --out=./public/avatars
  bun run images:generate --template=hero --source=./photo.jpg --out=./artifacts/hero.webp --quality=85
`);
}

function parseSize(size: string): { w: number; h: number } {
  const m = /^(\d+)x(\d+)$/i.exec(size.trim());
  if (!m) throw new Error(`Invalid --size "${size}" (expected WxH e.g. 128x128)`);
  return { w: Number(m[1]), h: Number(m[2]) };
}

async function listImages(source: string): Promise<string[]> {
  const f = Bun.file(source);
  // directory vs file: try glob if no single file
  if (await f.exists()) {
    // could be file
    const st = await f.stat().catch(() => null);
    if (st && st.isFile?.()) return [source];
  }
  // treat as directory
  const glob = new Bun.Glob('**/*.{png,jpg,jpeg,webp,gif,bmp,tif,tiff,heic,avif}');
  const files: string[] = [];
  try {
    for await (const rel of glob.scan({ cwd: source, onlyFiles: true, absolute: false })) {
      files.push(joinPath(source, rel));
    }
  } catch {
    // single missing file
    if (await f.exists()) return [source];
    throw new Error(`Source not found: ${source}`);
  }
  return files.sort();
}

/** Bun.write creates intermediate directories — no node:fs mkdir. */
async function ensureDir(path: string): Promise<void> {
  const keep = joinPath(path, '.gitkeep');
  if (!(await Bun.file(keep).exists()) && !(await Bun.file(path).exists())) {
    await Bun.write(keep, '');
  }
}

function outPathFor(sourceFile: string, out: string, format: OutFormat, isDirOut: boolean): string {
  if (!isDirOut) return out;
  const base = basenamePath(sourceFile, extnamePath(sourceFile));
  return joinPath(out, `${base}.${format === 'jpeg' ? 'jpg' : format}`);
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const g = new Bun.Glob('*');
    // if path is a file that exists, not dir
    const f = Bun.file(path);
    if (await f.exists()) {
      // Bun.file exists for files; for dirs, exists may be false on some systems
      // probe: scan one entry
      try {
        const it = g.scan({ cwd: path });
        await it.next();
        return true;
      } catch {
        return false;
      }
    }
    // create as dir later
    return !IMAGE_EXTS.has(extnamePath(path).toLowerCase());
  } catch {
    return !IMAGE_EXTS.has(extnamePath(path).toLowerCase());
  }
}

type EncodePipe = ReturnType<Bun.Image['resize']> | Bun.Image;

function applyFormat(pipe: EncodePipe, format: OutFormat, quality: number): EncodePipe {
  switch (format) {
    case 'jpeg':
      return pipe.jpeg({ quality });
    case 'png':
      return pipe.png();
    case 'avif':
      return pipe.avif({ quality });
    case 'webp':
    default:
      return pipe.webp({ quality });
  }
}

async function processOne(
  src: string,
  dest: string,
  opts: {
    w: number;
    h: number;
    fit: 'fill' | 'inside';
    format: OutFormat;
    quality: number;
    maxPixels: number;
    dryRun: boolean;
    template: Template;
  }
): Promise<{ src: string; dest: string; bytes: number; ok: boolean; error?: string }> {
  try {
    if (!(await Bun.file(src).exists())) {
      return { src, dest, bytes: 0, ok: false, error: 'missing source' };
    }
    if (opts.dryRun) {
      return { src, dest, bytes: 0, ok: true };
    }
    // Bun.write / Image.write create parent directories
    let pipe: EncodePipe = Bun.file(src).image({ maxPixels: opts.maxPixels });
    if (opts.template === 'placeholder') {
      const lqip = await pipe.placeholder();
      const textPath = dest.endsWith('.txt') ? dest : `${dest}.txt`;
      await Bun.write(textPath, String(lqip));
      return { src, dest: textPath, bytes: String(lqip).length, ok: true };
    }
    if (opts.w > 0 && opts.h > 0) {
      pipe = pipe.resize(opts.w, opts.h, { fit: opts.fit });
    }
    pipe = applyFormat(pipe, opts.format, opts.quality);
    const written = await pipe.write(dest);
    return { src, dest, bytes: Number(written) || (await Bun.file(dest).size), ok: true };
  } catch (e) {
    const err = e as Error & { code?: string };
    if (err.code === 'ERR_IMAGE_FORMAT_UNSUPPORTED' && opts.format !== 'png') {
      // fall back to png
      try {
        const fallback = dest.replace(/\.[^.]+$/, '.png');
        let pipe: EncodePipe = Bun.file(src).image({ maxPixels: opts.maxPixels });
        if (opts.w > 0 && opts.h > 0) pipe = pipe.resize(opts.w, opts.h, { fit: opts.fit });
        await pipe.png().write(fallback);
        return {
          src,
          dest: fallback,
          bytes: await Bun.file(fallback).size,
          ok: true,
          error: 'fell back to png',
        };
      } catch (e2) {
        return { src, dest, bytes: 0, ok: false, error: String((e2 as Error).message || e2) };
      }
    }
    return { src, dest, bytes: 0, ok: false, error: String(err.message || err) };
  }
}

function templateDims(template: Template, size: string): { w: number; h: number } {
  if (template === 'hero') return { w: 1200, h: 630 };
  if (template === 'match') return { w: 400, h: 400 };
  if (template === 'convert' || template === 'placeholder') {
    if (!size || size === '0x0') return { w: 0, h: 0 };
  }
  return parseSize(size || (template === 'avatar' ? '128x128' : '128x128'));
}

async function runTemplate(opts: CliOpts) {
  const dims = templateDims(opts.template, opts.size);
  let quality = opts.quality;
  if (opts.template === 'hero' && quality === DEFAULTS.quality) quality = 85;

  const sources = await listImages(opts.source);
  if (!sources.length) {
    throw new Error(`No images under ${opts.source}`);
  }

  const outIsDir = await isDirectory(opts.out);
  if (outIsDir || sources.length > 1) {
    await ensureDir(opts.out);
  }

  const results = [];
  for (const src of sources) {
    const dest = outPathFor(
      src,
      opts.out,
      opts.format,
      outIsDir || sources.length > 1 || !IMAGE_EXTS.has(extnamePath(opts.out).toLowerCase())
    );
    const r = await processOne(src, dest, {
      w: dims.w,
      h: dims.h,
      fit: opts.template === 'hero' ? 'inside' : opts.fit,
      format: opts.format,
      quality,
      maxPixels: opts.maxPixels,
      dryRun: opts.dryRun,
      template: opts.template,
    });
    results.push(r);
    if (r.ok) {
      console.log(
        `✓ ${r.src} → ${r.dest}${r.bytes ? ` (${r.bytes} B)` : ''}${r.error ? ` [${r.error}]` : ''}`
      );
    } else {
      console.warn(`⚠ skip ${r.src}: ${r.error}`);
    }
  }

  const summary = {
    template: opts.template,
    source: opts.source,
    out: opts.out,
    processed: results.filter(r => r.ok).length,
    failed: results.filter(r => !r.ok).length,
    total: results.length,
    dryRun: opts.dryRun,
    results,
  };

  if (opts.json) jsonOut(summary);
  else {
    console.log(
      `images:generate done · template=${opts.template} ok=${summary.processed}/${summary.total} failed=${summary.failed}`
    );
  }
  return summary;
}

async function main(): Promise<void> {
  const fileDefaults = await loadTomlDefaults();
  const cli = parseArgs(Bun.argv.slice(2));
  // precedence: DEFAULTS < toml < CLI
  const opts: CliOpts = {
    ...DEFAULTS,
    ...Object.fromEntries(Object.entries(fileDefaults).filter(([, v]) => v !== undefined)),
    ...cli,
  } as CliOpts;
  if (Bun.argv.slice(2).length === 0) {
    printHelp();
    process.exit(0);
  }
  const allowed: Template[] = ['avatar', 'hero', 'match', 'convert', 'placeholder'];
  if (!allowed.includes(opts.template)) {
    throw new Error(`Unknown template "${opts.template}" (want ${allowed.join('|')})`);
  }
  const summary = await runTemplate(opts);
  if (summary.failed > 0 && summary.processed === 0) process.exit(1);
}

if (import.meta.main) {
  await main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}

export { parseArgs, parseSize, processOne, templateDims, listImages };
