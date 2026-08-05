#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
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
import { dirnamePath, joinPath } from '../lib/path-bun.ts';

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

type RegistryIndex = {
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

const LOCAL_REGISTRY_INDEX = 'public/registry/registry.json';

/** Load index: optional preferVersion, then local snapshot, then live HTTP. */
export async function resolveArtifactRelease(
  fetcher: typeof fetch = fetch,
  preferVersion?: string
): Promise<ArtifactRelease> {
  const indexes: RegistryIndex[] = [];
  try {
    if (await Bun.file(LOCAL_REGISTRY_INDEX).exists()) {
      indexes.push(JSON.parse(await Bun.file(LOCAL_REGISTRY_INDEX).text()) as RegistryIndex);
    }
  } catch {
    /* ignore bad local */
  }
  try {
    const res = await fetcher(REGISTRY_INDEX_URL, { headers: { Accept: 'application/json' } });
    if (res.ok) indexes.push((await res.json()) as RegistryIndex);
  } catch {
    /* offline */
  }
  if (!indexes.length) throw new Error('no registry index (local or live)');

  for (const index of indexes) {
    const pkg = index.packages?.[BOOKMAKERS_ARTIFACT_NAME];
    if (!pkg) continue;
    const version = preferVersion ?? pkg['dist-tags']?.latest;
    if (!version) continue;
    const release = pkg.releases?.[version];
    const storage = release?.storage;
    if (!release || !storage?.r2Key || typeof storage.size !== 'number' || !storage.checksum) {
      continue;
    }
    return {
      version: release.version ?? version,
      r2Key: storage.r2Key,
      size: storage.size,
      checksum: storage.checksum,
    };
  }
  throw new Error(
    `${BOOKMAKERS_ARTIFACT_NAME}@${preferVersion ?? 'latest'} not found in local/live registry index`
  );
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
  const tgzPath = joinPath(dir, 'artifact.tgz');
  await Bun.write(tgzPath, tgz);
  const proc = Bun.spawnSync(['tar', '-xzf', tgzPath, '-C', dir, '--strip-components=1']);
  if (!proc.success) {
    throw new Error(`tar extraction failed: ${proc.stderr.toString().trim()}`);
  }
  rmSync(tgzPath, { force: true });
}

/** Import the extracted package entry and return its BOOKMAKERS registry. */
export async function loadBookmakersModule(dir: string): Promise<Record<string, unknown>> {
  const pkgJson = joinPath(dir, 'package.json');
  let entry = 'index.js';
  try {
    const raw = JSON.parse(await Bun.file(pkgJson).text()) as { main?: string };
    if (typeof raw.main === 'string') entry = raw.main;
  } catch {
    // no package.json — fall back to index.js
  }
  const abs = joinPath(dir, entry);
  if (!(await Bun.file(abs).exists())) throw new Error(`no package entry at ${abs}`);
  return (await import(Bun.pathToFileURL(abs).href)) as Record<string, unknown>;
}

export interface BookmakersBakeResult {
  schemaVersion: 1 | 2;
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

function entryFetcher(b: { fetcher?: string; fetcherType?: string }): string | undefined {
  return b.fetcher ?? b.fetcherType;
}

function entrySports(b: { sports?: string[]; supportedSports?: string[] }): string[] | undefined {
  return b.sports ?? b.supportedSports;
}

function entryWeb(b: { urls?: { web?: string }; domain?: string }): string | undefined {
  return b.urls?.web ?? (b.domain ? `https://${String(b.domain).replace(/^https?:\/\//, '')}` : undefined);
}

/** Build the bake payload (pure, testable). Accepts v0.3 and v0.4 field names. */
export function buildBookmakersBake(
  bookmakers: Record<string, unknown>,
  version: string,
  checksum: string,
  generatedAt = new Date().toISOString()
): BookmakersBakeResult {
  const issues: string[] = [];
  const entries = Object.values(bookmakers) as Array<{
    id?: string;
    slug?: string;
    fetcher?: string;
    fetcherType?: string;
    sports?: string[];
    supportedSports?: string[];
    color?: string;
    urls?: { web?: string };
    domain?: string;
    brandGroup?: string;
  }>;
  const sports = new Set<string>();
  let looksV4 = 0;
  for (const b of entries) {
    const fetcher = entryFetcher(b);
    if (fetcher !== 'rest' && fetcher !== 'webview' && fetcher !== 'seat') {
      issues.push(`entry missing valid fetcher/fetcherType (got ${fetcher})`);
    }
    const sportList = entrySports(b);
    if (!Array.isArray(sportList)) issues.push('entry missing sports/supportedSports');
    else for (const s of sportList) sports.add(s);
    if (!b.color) issues.push('entry missing color');
    if (!entryWeb(b)) issues.push('entry missing urls.web/domain');
    if (b.fetcher || b.sports || b.urls || b.slug) looksV4 += 1;
    if (b.id && b.slug && b.id !== b.slug) {
      issues.push(`entry id !== slug (${b.id} vs ${b.slug})`);
    }
    for (const secret of ['restBaseUrl', 'apiKeyEnv', 'envVars'] as const) {
      if (secret in b) issues.push(`public entry must not include ${secret}`);
    }
  }
  const schemaVersion: 1 | 2 = looksV4 >= Math.max(1, Math.floor(entries.length / 2)) ? 2 : 1;
  return {
    schemaVersion,
    generatedAt,
    artifact: { name: BOOKMAKERS_ARTIFACT_NAME, version, checksum, source: 'artifact-registry' },
    bookmakers,
    audit: { ok: issues.length === 0, issues },
    summary: {
      count: entries.length,
      webview: entries.filter(b => entryFetcher(b) === 'webview').length,
      rest: entries.filter(b => entryFetcher(b) === 'rest').length,
      seat: entries.filter(b => entryFetcher(b) === 'seat').length,
      sports: [...sports].sort(),
    },
  };
}

const LOCAL_PACKAGE_DIR = 'artifacts/deeplink-automation/packages/bookmakers';

async function main(): Promise<void> {
  const check = Bun.argv.includes('--check');
  const asJson = Bun.argv.includes('--json');
  const useLocal = Bun.argv.includes('--local');
  const versionFlag = (() => {
    const i = Bun.argv.indexOf('--version');
    return i >= 0 ? Bun.argv[i + 1] : undefined;
  })();

  let module: Record<string, unknown>;
  let version: string;
  let checksum: string;

  if (useLocal) {
    // Offline: load PUBLIC_BOOKMAKERS from the deeplink package (or its public-catalog.json).
    const catalogPath = joinPath(LOCAL_PACKAGE_DIR, 'public-catalog.json');
    const distEntry = joinPath(LOCAL_PACKAGE_DIR, 'dist/index.js');
    if (await Bun.file(distEntry).exists()) {
      module = (await import(Bun.pathToFileURL(distEntry).href)) as Record<string, unknown>;
    } else if (await Bun.file(catalogPath).exists()) {
      const cat = JSON.parse(await Bun.file(catalogPath).text()) as {
        bookmakers?: Record<string, unknown>;
        artifact?: { version?: string };
      };
      module = {
        PUBLIC_BOOKMAKERS: cat.bookmakers,
        BOOKMAKERS: cat.bookmakers,
      };
    } else {
      throw new Error(
        `--local requires ${LOCAL_PACKAGE_DIR}/dist or public-catalog.json (run bookmakers:prepare-publish)`
      );
    }
    const pkg = JSON.parse(
      await Bun.file(joinPath(LOCAL_PACKAGE_DIR, 'package.json')).text()
    ) as { version?: string };
    version = pkg.version ?? '0.4.0';
    checksum = '0'.repeat(64); // local bake — checksum filled on registry publish
  } else {
    const release = await resolveArtifactRelease(fetch, versionFlag);
    const tgz = await downloadArtifact(release);
    const dir = joinPath(tmpdir(), `fw-bookmakers-bake-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    try {
      await extractTarball(tgz, dir);
      module = await loadBookmakersModule(dir);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
    version = release.version;
    checksum = release.checksum;
  }

  // Prefer v0.4 Pages-safe catalog when the package exports it.
  const candidate =
    module.PUBLIC_BOOKMAKERS ??
    (module.default as Record<string, unknown> | undefined)?.PUBLIC_BOOKMAKERS ??
    module.BOOKMAKERS ??
    (module.default as Record<string, unknown> | undefined)?.BOOKMAKERS ??
    module.default ??
    module;
  const payload = buildBookmakersBake(
    candidate as Record<string, unknown>,
    version,
    checksum
  );
  if (useLocal) {
    payload.artifact.source = 'local-package';
  }
  if (
    module.PUBLIC_BOOKMAKERS ||
    (module.default as Record<string, unknown> | undefined)?.PUBLIC_BOOKMAKERS
  ) {
    payload.schemaVersion = 2;
  }

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

  mkdirSync(dirnamePath(BOOKMAKERS_REGISTRY_PATH), { recursive: true });
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
