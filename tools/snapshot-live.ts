#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/networking/fetch#sending-an-http-request — fetch
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/blog/bun-v1.3.14#bun-image — Bun.Image (v1.3.14)
// @see https://bun.com/blog/bun-v1.3.14#terminal-methods — Bun.Image terminal methods
// @see https://bun.com/docs/runtime/utils#bun-inspect-table — Bun.inspect.table (via logTable)
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Live enhancement probe — score.factory-wager.com vs origin/main.
 *
 * Bun-native only: fetch · Bun.spawn(git) · Bun.CryptoHasher · Bun.Image
 * (Bun.file().image() shorthand · metadata · resize/webp/write) · Bun.write · logTable.
 *
 *   bun run snapshot:live
 *   bun --env-file ~/.reasonix/.env run snapshot:live
 *   bun run snapshot:live -- --thumb --strict-image
 */
import { Glob } from 'bun';
import { jsonOut, logTable } from '../lib/console-depth.ts';
import { isCloudflareAccessEnforced } from '../lib/verification/cloudflare-access-live.ts';
import {
  ensureSnapshotDir,
  getSnapshotDir,
  runSnapshot,
  type SnapshotManifest,
} from './snapshot-core.ts';
import { writeChartArtifacts } from './limit-chart.ts';

export type VerdictStatus = 'LIVE' | 'STALE' | 'ACCESS_FAIL' | 'ACCESS_SKIP' | 'SKIP';

export type VerdictRow = {
  Enhancement: string;
  Plane: string;
  Status: VerdictStatus;
  Evidence: string;
};

export type PortalProbe = {
  url: string;
  gitPath: string | null;
  markers: readonly string[];
};

export const DEFAULT_LIVE_BASE = 'https://score.factory-wager.com';
export const GIT_REF = 'origin/main';

export const PORTAL_PROBES: readonly PortalProbe[] = Object.freeze([
  {
    url: '/portal/components/glossary-ux.js',
    gitPath: 'public/portal/components/glossary-ux.js',
    markers: ['sectionDomIdFromSurface', 'scrollGlossarySectionFromUrl', 'scrollSections'] as const,
  },
  {
    url: '/portal/account/',
    gitPath: 'public/portal/account/index.html',
    markers: ['scrollSections: true', 'account-glossary-crumbs'] as const,
  },
  {
    url: '/portal/limits/limit-profiles.js',
    gitPath: 'public/portal/limits/limit-profiles.js',
    markers: ['scrollGlossarySectionFromUrl', 'scrollSections: true'] as const,
  },
  {
    url: '/portal/partners/',
    gitPath: 'public/portal/partners/index.html',
    markers: ['scrollSections: true', 'id="section:onboard"'] as const,
  },
  {
    url: '/portal/partner-history/',
    gitPath: 'public/portal/partner-history/index.html',
    markers: ['scrollGlossarySectionFromUrl'] as const,
  },
]);

/** Sync SHA-256 hex (Bun.CryptoHasher — preferred over crypto.subtle for probe bodies). */
export function sha256Hex(text: string): string {
  return new Bun.CryptoHasher('sha256').update(text).digest('hex');
}

export type ImageMetaResult =
  | {
      ok: true;
      path: string;
      width: number;
      height: number;
      format: string;
      thumbPath?: string;
    }
  | { ok: false; path: string; error: string; code: string };

/** Stable Bun.Image error codes we branch on (see docs/IMAGES.md · v1.3.14). */
const IMAGE_ERROR_CODES = new Set([
  'ERR_IMAGE_FORMAT_UNSUPPORTED',
  'ERR_IMAGE_UNKNOWN_FORMAT',
  'ERR_IMAGE_TOO_MANY_PIXELS',
  'ERR_IMAGE',
]);

const PNG_1x1_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmLIQAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * Read image metadata via Bun.file().image() (shorthand for `new Bun.Image(file)`).
 * `metadata()` runs on the main thread and is the fast path (~70× vs sharp per Bun 1.3.14).
 */
export async function getImageMetadata(
  path: string,
  options: { thumb?: boolean; thumbMax?: number } = {}
): Promise<ImageMetaResult> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return { ok: false, path, error: 'File not found', code: 'ENOENT' };
  }
  try {
    const img = file.image();
    const meta = await img.metadata();
    let thumbPath: string | undefined;
    if (options.thumb) {
      const max = options.thumbMax ?? 200;
      thumbPath = path.replace(/\.[^.]+$/i, '') + `-thumb-${max}.webp`;
      // Terminal methods run off the main thread; chain resize → webp → write.
      await file.image().resize(max).webp({ quality: 80 }).write(thumbPath);
    }
    return {
      ok: true,
      path,
      width: meta.width,
      height: meta.height,
      format: String(meta.format),
      thumbPath,
    };
  } catch (e) {
    const err = e as Error & { code?: string };
    const code = err.code && IMAGE_ERROR_CODES.has(err.code) ? err.code : (err.code ?? 'ERR_IMAGE');
    return {
      ok: false,
      path,
      error: err.message || 'image metadata failed',
      code,
    };
  }
}

/** Newest matching path under dir (lexicographic last = usually newest id). */
export async function newestGlobMatch(dir: string, pattern: string): Promise<string | undefined> {
  const glob = new Glob(pattern);
  let last: string | undefined;
  for await (const rel of glob.scan(dir)) {
    last = `${dir}/${rel}`;
  }
  return last;
}

/** Prefer real chart PNGs over unit fixtures / thumbs (largest non-fixture wins). */
export async function pickProbePng(dir: string): Promise<string | undefined> {
  const glob = new Glob('**/*.png');
  let best: { path: string; size: number } | undefined;
  for await (const rel of glob.scan(dir)) {
    if (/unit-|thumb|\.keep/i.test(rel)) continue;
    const path = `${dir}/${rel}`;
    const size = Bun.file(path).size;
    if (!best || size >= best.size) best = { path, size };
  }
  return best?.path;
}

export function markersPresent(body: string, markers: readonly string[]): boolean {
  return markers.every(m => body.includes(m));
}

export function mapPortalUrlToGitPath(url: string): string | null {
  const hit = PORTAL_PROBES.find(p => p.url === url);
  return hit?.gitPath ?? null;
}

export function accessHeadersFromEnv(
  env: NodeJS.ProcessEnv | typeof Bun.env = Bun.env
): Headers | null {
  const id = env.CF_ACCESS_CLIENT_ID?.trim();
  const secret = env.CF_ACCESS_CLIENT_SECRET?.trim();
  if (!id || !secret) return null;
  return new Headers({
    'CF-Access-Client-Id': id,
    'CF-Access-Client-Secret': secret,
  });
}

/** Read a blob from git without shell. */
export async function gitShowText(refPath: string): Promise<string> {
  const proc = Bun.spawn(['git', 'show', refPath], {
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  if (code !== 0) {
    throw new Error(
      `git show ${refPath} failed (${code}): ${stderr.trim() || stdout.slice(0, 200)}`
    );
  }
  return stdout;
}

type GlossarySurface = {
  path?: string;
  concept?: string;
  sections?: Array<{ hash?: string; domId?: string; conceptId?: string }>;
};

type DomainGlossary = {
  schemaVersion?: number;
  surfaces?: GlossarySurface[];
};

export function assertGlossaryEnhancements(live: DomainGlossary): {
  ok: boolean;
  evidence: string;
} {
  const surfaces = Array.isArray(live.surfaces) ? live.surfaces : [];
  const account = surfaces.find(s => s.path === '/portal/account/');
  const partners = surfaces.find(s => s.path === '/portal/partners/');
  const limits = surfaces.find(s => s.path === '/portal/limits/');
  const history = surfaces.find(s => s.path === '/portal/partner-history/');
  const identity = account?.sections?.find(s => s.hash === 'identity');
  const onboard = partners?.sections?.find(s => s.hash === 'onboard');
  const bareLimit = limits?.sections?.find(s => s.hash === 'account-control');
  const bareHist = history?.sections?.find(s => s.hash === 'opening-baseline');

  const checks = [
    live.schemaVersion === 3,
    surfaces.length >= 1,
    identity?.domId === 'ad-section-identity',
    onboard?.domId === 'section:onboard',
    bareLimit?.domId === 'account-control',
    bareHist?.domId === 'opening-baseline',
  ];
  const ok = checks.every(Boolean);
  return {
    ok,
    evidence: [
      `schema=${live.schemaVersion}`,
      `surfaces=${surfaces.length}`,
      `identity.domId=${identity?.domId ?? 'missing'}`,
      `onboard.domId=${onboard?.domId ?? 'missing'}`,
      `limits.account-control=${bareLimit?.domId ?? 'missing'}`,
      `history.opening-baseline=${bareHist?.domId ?? 'missing'}`,
    ].join(' · '),
  };
}

async function fetchText(
  url: string,
  headers?: Headers
): Promise<{ status: number; body: string; accessEnforced: boolean; ok: boolean }> {
  const res = await fetch(url, {
    headers,
    redirect: 'manual',
  });
  const accessEnforced = isCloudflareAccessEnforced(res.status, res.headers);
  // Follow one redirect only when Access headers are present (service token auth).
  if (headers && (res.status === 302 || res.status === 301) && !accessEnforced) {
    const loc = res.headers.get('location');
    if (loc) {
      const abs = new URL(loc, url).href;
      return fetchText(abs, headers);
    }
  }
  const body = res.status === 302 || res.status === 301 ? '' : await res.text();
  return {
    status: res.status,
    body,
    accessEnforced,
    ok: res.ok,
  };
}

async function probeRegistry(
  base: string,
  rows: VerdictRow[]
): Promise<{ glossaryLive: DomainGlossary | null }> {
  const glossaryUrl = `${base.replace(/\/$/, '')}/registry/domain-glossary.json`;
  try {
    const res = await fetch(glossaryUrl, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      rows.push({
        Enhancement: 'glossary v3 (registry)',
        Plane: 'public',
        Status: 'STALE',
        Evidence: `HTTP ${res.status}`,
      });
      return { glossaryLive: null };
    }
    const live = (await res.json()) as DomainGlossary;
    const mainText = await gitShowText(`${GIT_REF}:public/registry/domain-glossary.json`);
    const main = JSON.parse(mainText) as DomainGlossary;
    const liveHash = sha256Hex(JSON.stringify(live));
    const mainHash = sha256Hex(mainText);
    const asserted = assertGlossaryEnhancements(live);
    const versionAlign = live.schemaVersion === main.schemaVersion;
    const status: VerdictStatus = asserted.ok && versionAlign ? 'LIVE' : 'STALE';
    rows.push({
      Enhancement: 'glossary v3 (registry)',
      Plane: 'public',
      Status: status,
      Evidence: `${asserted.evidence} · shaLive=${liveHash.slice(0, 12)} · shaMain=${mainHash.slice(0, 12)} · equal=${liveHash === mainHash}`,
    });

    for (const path of ['/registry/portal-weave.json', '/registry/ops-summary.json'] as const) {
      const url = `${base.replace(/\/$/, '')}${path}`;
      const r = await fetch(url, { headers: { Accept: 'application/json' } });
      if (!r.ok) {
        rows.push({
          Enhancement: path,
          Plane: 'public',
          Status: 'STALE',
          Evidence: `HTTP ${r.status}`,
        });
        continue;
      }
      const text = await r.text();
      try {
        JSON.parse(text);
      } catch {
        rows.push({
          Enhancement: path,
          Plane: 'public',
          Status: 'STALE',
          Evidence: 'invalid JSON',
        });
        continue;
      }
      const gitPath = `public${path}`;
      let equal = 'n/a';
      try {
        const mainBlob = await gitShowText(`${GIT_REF}:${gitPath}`);
        equal = String(sha256Hex(text) === sha256Hex(mainBlob));
      } catch {
        equal = 'no-git-blob';
      }
      rows.push({
        Enhancement: path,
        Plane: 'public',
        Status: 'LIVE',
        Evidence: `HTTP 200 · bytes=${text.length} · shaEqMain=${equal}`,
      });
    }

    return { glossaryLive: live };
  } catch (e) {
    rows.push({
      Enhancement: 'glossary v3 (registry)',
      Plane: 'public',
      Status: 'STALE',
      Evidence: e instanceof Error ? e.message : String(e),
    });
    return { glossaryLive: null };
  }
}

async function probePortal(base: string, rows: VerdictRow[]): Promise<void> {
  const headers = accessHeadersFromEnv();
  if (!headers) {
    for (const p of PORTAL_PROBES) {
      rows.push({
        Enhancement: p.url,
        Plane: 'portal',
        Status: 'ACCESS_SKIP',
        Evidence: 'missing CF_ACCESS_CLIENT_ID / CF_ACCESS_CLIENT_SECRET',
      });
    }
    return;
  }

  const origin = base.replace(/\/$/, '');
  for (const p of PORTAL_PROBES) {
    try {
      const hit = await fetchText(`${origin}${p.url}`, headers);
      if (hit.accessEnforced || hit.status === 302) {
        rows.push({
          Enhancement: p.url,
          Plane: 'portal',
          Status: 'ACCESS_FAIL',
          Evidence: `Access still enforced (HTTP ${hit.status}) — service token rejected or wrong app`,
        });
        continue;
      }
      if (!hit.ok) {
        rows.push({
          Enhancement: p.url,
          Plane: 'portal',
          Status: 'STALE',
          Evidence: `HTTP ${hit.status}`,
        });
        continue;
      }
      const has = markersPresent(hit.body, p.markers);
      const liveHash = sha256Hex(hit.body);
      let shaEq = 'n/a';
      if (p.gitPath) {
        try {
          const mainBlob = await gitShowText(`${GIT_REF}:${p.gitPath}`);
          shaEq = String(liveHash === sha256Hex(mainBlob));
        } catch {
          shaEq = 'no-git-blob';
        }
      }
      const missing = p.markers.filter(m => !hit.body.includes(m));
      rows.push({
        Enhancement: p.url,
        Plane: 'portal',
        Status: has ? 'LIVE' : 'STALE',
        Evidence: has
          ? `markers ok · sha=${liveHash.slice(0, 12)} · shaEqMain=${shaEq}`
          : `missing: ${missing.join(', ')} · sha=${liveHash.slice(0, 12)}`,
      });
    } catch (e) {
      rows.push({
        Enhancement: p.url,
        Plane: 'portal',
        Status: 'ACCESS_FAIL',
        Evidence: e instanceof Error ? e.message : String(e),
      });
    }
  }
}

async function captureSnapshots(
  base: string,
  rows: VerdictRow[],
  options: { quiet?: boolean } = {}
): Promise<SnapshotManifest[]> {
  const manifests: SnapshotManifest[] = [];
  await ensureSnapshotDir();
  // Snapshot-core logs to stdout; in --json mode divert its chatter so the
  // machine document stays a single JSON value on stdout.
  const restoreOut = options.quiet
    ? (() => {
        const orig = {
          log: console.log,
          info: console.info,
          warn: console.warn,
          error: console.error,
        };
        console.log = () => {};
        console.info = () => {};
        console.warn = () => {};
        console.error = () => {};
        return () => {
          console.log = orig.log;
          console.info = orig.info;
          console.warn = orig.warn;
          console.error = orig.error;
        };
      })()
    : null;
  try {
    for (const scope of ['portal', 'limits'] as const) {
      try {
        const m = await runSnapshot({ scope, baseUrl: base });
        if (m) {
          manifests.push(m);
          rows.push({
            Enhancement: `snapshot:${scope}`,
            Plane: 'CLI',
            Status: m.metadata.status === 'ok' ? 'LIVE' : 'STALE',
            Evidence: `id=${m.id} · status=${m.metadata.status} · files=${m.fileCount}`,
          });
        } else {
          rows.push({
            Enhancement: `snapshot:${scope}`,
            Plane: 'CLI',
            Status: 'SKIP',
            Evidence: 'dry-run or null manifest',
          });
        }
      } catch (e) {
        rows.push({
          Enhancement: `snapshot:${scope}`,
          Plane: 'CLI',
          Status: 'STALE',
          Evidence: e instanceof Error ? e.message : String(e),
        });
      }
    }
  } finally {
    restoreOut?.();
  }
  return manifests;
}

async function ensureProbePng(snapDir: string): Promise<string | undefined> {
  const existing = await pickProbePng(snapDir);
  if (existing) return existing;

  const svgPath = await newestGlobMatch(snapDir, '**/chart.svg');
  const anySvg = svgPath ?? (await newestGlobMatch(snapDir, '**/*.svg'));
  if (anySvg) {
    try {
      // SVG may throw ERR_IMAGE_FORMAT_UNSUPPORTED — fall through to synthetic chart.
      const out = anySvg.replace(/\.svg$/i, '.png');
      await Bun.file(anySvg).image().png().write(out);
      if (await Bun.file(out).exists()) return out;
    } catch (e) {
      const code = (e as Error & { code?: string }).code;
      if (code !== 'ERR_IMAGE_FORMAT_UNSUPPORTED') {
        /* keep trying synthetic */
      }
    }
  }

  try {
    const chartBase = `${snapDir}/live-probe-chart`;
    const { pngPath: written } = await writeChartArtifacts(
      {
        raises: 1,
        decreases: 0,
        netDelta: 0,
        avgScore: null,
        books: 1,
        partners: 1,
      },
      chartBase
    );
    if (written) return written;
  } catch {
    /* ignore */
  }

  // Last resort: known-good 1×1 PNG so metadata() is always exercised.
  const fallback = `${snapDir}/live-probe-1x1.png`;
  await Bun.write(fallback, PNG_1x1_BYTES);
  return fallback;
}

async function probeImageMeta(
  rows: VerdictRow[],
  options: { strictImage: boolean; thumb: boolean }
): Promise<ImageMetaResult | null> {
  const snapDir = getSnapshotDir();
  let pngPath = await ensureProbePng(snapDir);

  if (!pngPath || !(await Bun.file(pngPath).exists())) {
    rows.push({
      Enhancement: 'PNG metadata (Bun.Image)',
      Plane: 'artifact',
      Status: options.strictImage ? 'STALE' : 'SKIP',
      Evidence: 'no PNG under artifacts/snapshots',
    });
    return null;
  }

  let meta = await getImageMetadata(pngPath, { thumb: options.thumb, thumbMax: 200 });
  // Rasterized SVG / bogus "PNG" bytes → retry with known-good 1×1.
  if (
    !meta.ok &&
    (meta.code === 'ERR_IMAGE_UNKNOWN_FORMAT' || meta.code === 'ERR_IMAGE_FORMAT_UNSUPPORTED')
  ) {
    const fallback = `${snapDir}/live-probe-1x1.png`;
    await Bun.write(fallback, PNG_1x1_BYTES);
    pngPath = fallback;
    meta = await getImageMetadata(pngPath, { thumb: options.thumb, thumbMax: 200 });
  }

  if (meta.ok) {
    rows.push({
      Enhancement: 'PNG metadata (Bun.Image)',
      Plane: 'artifact',
      Status: 'LIVE',
      Evidence: [
        `${meta.path}`,
        `format=${meta.format}`,
        `${meta.width}x${meta.height}`,
        meta.thumbPath ? `thumb=${meta.thumbPath}` : null,
      ]
        .filter(Boolean)
        .join(' · '),
    });
  } else {
    rows.push({
      Enhancement: 'PNG metadata (Bun.Image)',
      Plane: 'artifact',
      Status: options.strictImage ? 'STALE' : 'SKIP',
      Evidence: `${meta.code}: ${meta.error}`,
    });
  }
  return meta;
}

function parseArgs(argv: string[]): {
  strictImage: boolean;
  json: boolean;
  thumb: boolean;
  base?: string;
} {
  let strictImage = false;
  let json = false;
  let thumb = false;
  let base: string | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--strict-image') strictImage = true;
    else if (a === '--json') json = true;
    else if (a === '--thumb') thumb = true;
    else if (a === '--base' && argv[i + 1]) base = argv[++i];
    else if (a.startsWith('--base=')) base = a.slice('--base='.length);
  }
  return { strictImage, json, thumb, base };
}

export async function runLiveSnapshot(
  options: {
    base?: string;
    strictImage?: boolean;
    json?: boolean;
    thumb?: boolean;
  } = {}
): Promise<{ rows: VerdictRow[]; failed: boolean; manifestPath: string }> {
  const base =
    options.base?.trim() ||
    Bun.env.PAGES_VERIFY_BASE?.trim() ||
    Bun.env.SNAPSHOT_BASE_URL?.trim() ||
    DEFAULT_LIVE_BASE;
  const rows: VerdictRow[] = [];

  if (!options.json) {
    console.log(`\n  Live enhancement snapshot → ${base}\n`);
  }

  await probeRegistry(base, rows);
  await probePortal(base, rows);
  const manifests = await captureSnapshots(base, rows, { quiet: options.json === true });
  const imageMeta = await probeImageMeta(rows, {
    strictImage: options.strictImage === true,
    thumb: options.thumb === true,
  });

  await ensureSnapshotDir();
  const manifestPath = `${getSnapshotDir()}/live-probe-manifest.json`;

  const failed = rows.some(r => r.Status === 'STALE' || r.Status === 'ACCESS_FAIL');
  // ACCESS_SKIP fails the run (portal proof incomplete) per plan
  const accessSkip = rows.some(r => r.Status === 'ACCESS_SKIP');
  const exitFail = failed || accessSkip;

  const payload = {
    capturedAt: new Date().toISOString(),
    base,
    bunVersion: Bun.version,
    bunRevision: Bun.revision,
    failed: exitFail,
    rows,
    snapshotIds: manifests.map(m => m.id),
    imageMeta,
    manifestPath,
  };
  await Bun.write(manifestPath, JSON.stringify(payload, null, 2));

  if (options.json) {
    jsonOut(payload);
  } else {
    logTable(rows, ['Enhancement', 'Plane', 'Status', 'Evidence']);
    console.log(
      exitFail
        ? `\n  Result: FAIL (${rows.filter(r => r.Status === 'STALE' || r.Status === 'ACCESS_FAIL' || r.Status === 'ACCESS_SKIP').length} blocking)\n`
        : `\n  Result: OK — enhancements live\n`
    );
    console.log(`  Manifest: ${manifestPath}\n`);
  }

  return { rows, failed: exitFail, manifestPath };
}

async function main(): Promise<void> {
  const { strictImage, json, thumb, base } = parseArgs(Bun.argv.slice(2));
  const { failed } = await runLiveSnapshot({ strictImage, json, thumb, base });
  process.exit(failed ? 1 : 0);
}

if (import.meta.main) {
  main().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
