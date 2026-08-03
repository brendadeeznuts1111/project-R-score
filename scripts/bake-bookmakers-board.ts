#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob (tar output scan)
// @see https://bun.com/docs/runtime/utils#bun-gunzipsync — Bun.gunzipSync
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-pathtofileurl — Bun.pathToFileURL
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * bake-bookmakers-board.ts — bake the @factorywager/bookmakers artifact into the
 * portal read plane.
 *
 * Resolves the published artifact from the artifact registry (index → dist-tag →
 * download with size + SHA-256 verification), imports its canonical BOOKMAKERS
 * registry, and writes:
 *   public/registry/bookmakers.json        (artifact mirror + audit + summary)
 *   public/portal/bookmakers/index.html    (board, static — checked in once)
 *
 *   bun run bookmakers:bake                 # write the JSON mirror
 *   bun run bookmakers:bake --check         # fail when the mirror is stale
 *   bun run bookmakers:bake --json          # machine-readable summary
 */
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env

// eslint-disable-next-line no-restricted-imports -- temp-dir tar extraction; Bun has no rmSync/mkdirSync for arbitrary paths
import { mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

export const BOOKMAKERS_REGISTRY_PATH = 'public/registry/bookmakers.json';
export const BOOKMAKERS_BOARD_PATH = 'public/portal/bookmakers/index.html';
export const BOOKMAKERS_ARTIFACT_NAME = '@factorywager/bookmakers';
export const REGISTRY_INDEX_URL = 'https://registry.factory-wager.com/api/registry/registry.json';
export const ARTIFACT_BASE_URL = 'https://registry.factory-wager.com/api/registry/';

interface ArtifactRelease {
  version: string;
  r2Key: string;
  size: number;
  checksum: string;
}

/** Resolve latest + storage metadata for the bookmakers artifact from the index. */
export async function resolveArtifactRelease(
  fetcher: typeof fetch = fetch
): Promise<ArtifactRelease> {
  const res = await fetcher(REGISTRY_INDEX_URL, { headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`registry index failed (${res.status})`);
  const index = (await res.json()) as {
    packages?: Record<
      string,
      {
        'dist-tags'?: Record<string, string>;
        releases?: Record<
          string,
          { version?: string; storage?: { r2Key?: string; size?: number; checksum?: string } }
        >;
      }
    >;
  };
  const pkg = index.packages?.[BOOKMAKERS_ARTIFACT_NAME];
  const version = pkg?.['dist-tags']?.latest;
  const release = version ? pkg?.releases?.[version] : undefined;
  const storage = release?.storage;
  if (!release || !storage?.r2Key || typeof storage.size !== 'number' || !storage.checksum) {
    throw new Error(`${BOOKMAKERS_ARTIFACT_NAME} not found in the registry index`);
  }
  return {
    version: release.version ?? version!,
    r2Key: storage.r2Key,
    size: storage.size,
    checksum: storage.checksum,
  };
}

/** Download a tarball, verifying size + SHA-256 against the index record. */
export async function downloadArtifact(
  release: ArtifactRelease,
  fetcher: typeof fetch = fetch
): Promise<Uint8Array> {
  const url = `${ARTIFACT_BASE_URL}${release.r2Key.split('/').map(encodeURIComponent).join('/')}`;
  const res = await fetcher(url, { headers: { Accept: 'application/octet-stream' } });
  if (!res.ok) throw new Error(`artifact download failed (${res.status}) for ${url}`);
  const data = new Uint8Array(await res.arrayBuffer());
  if (data.length !== release.size) {
    throw new Error(`size mismatch: expected ${release.size}, got ${data.length}`);
  }
  const hasher = new Bun.CryptoHasher('sha256');
  hasher.update(data);
  if (hasher.digest('hex') !== release.checksum) {
    throw new Error(`checksum mismatch for ${release.r2Key}`);
  }
  return data;
}

/** Extract a tgz into dir (npm-style package/ prefix stripped by tar -C). */
export async function extractTarball(tgz: Uint8Array, dir: string): Promise<void> {
  const tgzPath = join(dir, 'artifact.tgz');
  await Bun.write(tgzPath, tgz);
  const proc = Bun.spawnSync(['tar', '-xzf', tgzPath, '-C', dir, '--strip-components=1']);
  if (!proc.success) {
    throw new Error(`tar extraction failed: ${proc.stderr.toString().trim()}`);
  }
  rmSync(tgzPath, { force: true });
}

/** Import the extracted package entry and return its BOOKMAKERS registry. */
export async function loadBookmakersModule(dir: string): Promise<Record<string, unknown>> {
  const pkgJson = join(dir, 'package.json');
  let entry = 'index.js';
  try {
    const raw = JSON.parse(await Bun.file(pkgJson).text()) as { main?: string };
    if (typeof raw.main === 'string') entry = raw.main;
  } catch {
    // no package.json — fall back to index.js
  }
  const abs = join(dir, entry);
  if (!(await Bun.file(abs).exists())) throw new Error(`no package entry at ${abs}`);
  return (await import(Bun.pathToFileURL(abs).href)) as Record<string, unknown>;
}

export interface BookmakersBakeResult {
  schemaVersion: 1;
  generatedAt: string;
  artifact: { name: string; version: string; checksum: string; source: string };
  bookmakers: Record<string, unknown>;
  audit: { ok: boolean; issues: string[] };
  summary: {
    count: number;
    webview: number;
    rest: number;
    seat: number;
    sports: string[];
  };
}

/** Build the bake payload (pure, testable). */
export function buildBookmakersBake(
  bookmakers: Record<string, unknown>,
  version: string,
  checksum: string,
  generatedAt = new Date().toISOString()
): BookmakersBakeResult {
  const issues: string[] = [];
  const entries = Object.values(bookmakers) as Array<{
    fetcherType?: string;
    supportedSports?: string[];
    color?: string;
  }>;
  const sports = new Set<string>();
  for (const b of entries) {
    if (b.fetcherType !== 'rest' && b.fetcherType !== 'webview' && b.fetcherType !== 'seat') {
      issues.push(`entry missing valid fetcherType (got ${b.fetcherType})`);
    }
    if (!Array.isArray(b.supportedSports)) issues.push('entry missing supportedSports');
    else for (const s of b.supportedSports) sports.add(s);
    if (!b.color) issues.push('entry missing color');
  }
  return {
    schemaVersion: 1,
    generatedAt,
    artifact: { name: BOOKMAKERS_ARTIFACT_NAME, version, checksum, source: 'artifact-registry' },
    bookmakers,
    audit: { ok: issues.length === 0, issues },
    summary: {
      count: entries.length,
      webview: entries.filter(b => b.fetcherType === 'webview').length,
      rest: entries.filter(b => b.fetcherType === 'rest').length,
      seat: entries.filter(b => b.fetcherType === 'seat').length,
      sports: [...sports].sort(),
    },
  };
}

async function main(): Promise<void> {
  const check = Bun.argv.includes('--check');
  const asJson = Bun.argv.includes('--json');

  const release = await resolveArtifactRelease();
  const tgz = await downloadArtifact(release);
  const dir = join(tmpdir(), `fw-bookmakers-bake-${Date.now()}`);
  mkdirSync(dir, { recursive: true });
  let module: Record<string, unknown>;
  try {
    await extractTarball(tgz, dir);
    module = await loadBookmakersModule(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
  const candidate =
    module.BOOKMAKERS ??
    (module.default as Record<string, unknown> | undefined)?.BOOKMAKERS ??
    module.default ??
    module;
  const payload = buildBookmakersBake(
    candidate as Record<string, unknown>,
    release.version,
    release.checksum
  );

  const body = `${JSON.stringify(payload, null, 2)}\n`;
  if (check) {
    // Compare structurally, ignoring the volatile generatedAt timestamp.
    let current: Record<string, unknown> | null = null;
    try {
      current = JSON.parse(await Bun.file(BOOKMAKERS_REGISTRY_PATH).text()) as Record<
        string,
        unknown
      >;
    } catch {
      // missing/unparseable → stale
    }
    const fresh = JSON.parse(body) as Record<string, unknown>;
    const { generatedAt: _f, ...freshRest } = fresh;
    const { generatedAt: _c, ...currentRest } = current ?? {};
    if (JSON.stringify(freshRest) === JSON.stringify(currentRest)) {
      console.log(`bookmakers:bake --check: up to date (${payload.artifact.version})`);
      return;
    }
    console.error(
      `bookmakers:bake --check: STALE — run \`bun run bookmakers:bake\` ` +
        `(live ${payload.artifact.version})`
    );
    process.exit(1);
  }

  mkdirSync(dirname(BOOKMAKERS_REGISTRY_PATH), { recursive: true });
  await Bun.write(BOOKMAKERS_REGISTRY_PATH, body);
  console.log(
    `✓ Baked ${BOOKMAKERS_REGISTRY_PATH} (${payload.artifact.version}, ${payload.summary.count} bookmakers)`
  );
  if (asJson) console.log(JSON.stringify(payload.summary));
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
