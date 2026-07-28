// @see https://github.com/brendadeeznuts1111/project-R-score/blob/main/packages/registry-client/README.md — RegistryClient
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/**
 * Live probes for @factorywager/registry-client resolve/download/publish alignment.
 *
 * @see docs/registry-client.md
 * @see docs/guides/REGISTRY_PRODUCTION_READINESS.md
 */
import { factoryWagerRegistryUrlFromEnv } from '../../config/r2-env.ts';
import { RegistryClient, uint8TotalBytes } from '@factorywager/registry-client';
import registryClientPkg from '@factorywager/registry-client/package.json';
import { resolveCanonicalForProbe } from '../../tools/canonical-helpers.ts';
import { SCOPED_REGISTRY_LANES } from './install-env-probes.ts';
import type { VerificationLinks, VerificationResult } from './types.ts';

export const REGISTRY_CLIENT_PROOF_REPORT_PATH = '/registry/registry-client-proof.json';
export const REGISTRY_CLIENT_VERIFY_SOURCE = 'tools/verify-registry-client.ts';

export const REGISTRY_CLIENT_PROBE_PACKAGE = '@factorywager/registry-client';
export const REGISTRY_CLIENT_PROBE_VERSION = '1.0.0';
export const REGISTRY_CLIENT_SDK_VERSION = registryClientPkg.version;

export type RegistryClientProbeKind =
  | 'registry-client.resolve'
  | 'registry-client.download'
  | 'registry-client.publish';

export type RegistryClientProbeRow = VerificationResult & {
  probe: RegistryClientProbeKind;
  canonicalKey: string;
  lane?: string;
};

const RESOLVE_DOCS =
  'https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/registry-client.md#resolve';
const DOWNLOAD_DOCS =
  'https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/registry-client.md#download';
const PUBLISH_DOCS =
  'https://github.com/brendadeeznuts1111/project-R-score/blob/main/docs/registry-client.md#publish';

function probeFallback(probe: RegistryClientProbeKind): string {
  return probe === 'registry-client.resolve'
    ? RESOLVE_DOCS
    : probe === 'registry-client.download'
      ? DOWNLOAD_DOCS
      : PUBLISH_DOCS;
}

function normalizeBaseUrl(url: string): string {
  const trimmed = url.trim().replace(/\/$/, '');
  return trimmed || '';
}

function scopedPackumentPath(pkg: string): string {
  if (pkg.startsWith('@')) {
    const slash = pkg.indexOf('/');
    if (slash > 0) {
      return `/${pkg.slice(0, slash)}%2f${pkg.slice(slash + 1)}`;
    }
  }
  return `/${pkg}`;
}

function resultRow(
  probe: RegistryClientProbeKind,
  expected: string,
  actual: string,
  passed: boolean,
  opts?: { canonicalKey?: string; canonical?: string; lane?: string }
): RegistryClientProbeRow {
  const canonicalKey = opts?.canonicalKey ?? probe;
  const docs = resolveCanonicalForProbe(canonicalKey, {
    reportPath: REGISTRY_CLIENT_PROOF_REPORT_PATH,
    sourcePath: REGISTRY_CLIENT_VERIFY_SOURCE,
    fallback: opts?.canonical ?? probeFallback(probe),
  });
  return {
    probe,
    ...docs,
    name: probe,
    expected,
    actual,
    passed,
    lane: opts?.lane,
    canonical: opts?.canonical ?? docs.canonical,
  };
}

async function npmTarballUrl(
  baseUrl: string,
  pkg: string,
  version: string
): Promise<string | null> {
  try {
    const res = await fetch(`${baseUrl}${scopedPackumentPath(pkg)}`, {
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('json')) return null;
    const body = (await res.json()) as {
      versions?: Record<string, { dist?: { tarball?: string } }>;
    };
    return body.versions?.[version]?.dist?.tarball ?? null;
  } catch {
    return null;
  }
}

function normalizeTarballUrl(baseUrl: string, tarball: string): string {
  if (/^https?:\/\//i.test(tarball)) return tarball;
  const base = baseUrl.replace(/\/$/, '');
  return `${base}${tarball.startsWith('/') ? tarball : `/${tarball}`}`;
}

function tarballPathsMatch(a: string, b: string): boolean {
  try {
    const pa = new URL(a).pathname;
    const pb = new URL(b).pathname;
    return decodeURIComponent(pa) === decodeURIComponent(pb);
  } catch {
    return decodeURIComponent(a) === decodeURIComponent(b);
  }
}

/** resolve() assetUrl matches npm packument dist.tarball on the same origin. */
export async function probeRegistryClientResolveParity(): Promise<RegistryClientProbeRow> {
  const attempts: string[] = [];

  for (const lane of SCOPED_REGISTRY_LANES) {
    const baseUrl = normalizeBaseUrl(lane.resolveUrl());
    if (!baseUrl) continue;

    const tarball = await npmTarballUrl(
      baseUrl,
      REGISTRY_CLIENT_PROBE_PACKAGE,
      REGISTRY_CLIENT_PROBE_VERSION
    );
    if (!tarball) {
      attempts.push(`${lane.id}: no npm packument`);
      continue;
    }

    try {
      const client = new RegistryClient({ baseUrl });
      const resolved = await client.resolve(
        REGISTRY_CLIENT_PROBE_PACKAGE,
        REGISTRY_CLIENT_PROBE_VERSION
      );
      if (!resolved) {
        attempts.push(`${lane.id}: resolve returned undefined`);
        continue;
      }
      const ok =
        resolved &&
        tarball &&
        tarballPathsMatch(resolved.assetUrl, normalizeTarballUrl(baseUrl, tarball));
      if (ok) {
        return resultRow(
          'registry-client.resolve',
          'resolve().assetUrl equals npm packument dist.tarball',
          `${lane.id} parity (${baseUrl})`,
          true,
          {
            canonicalKey: 'registry-client resolve',
            canonical: RESOLVE_DOCS,
            lane: lane.id,
          }
        );
      }
      attempts.push(`${lane.id}: url mismatch sdk=${resolved.assetUrl} npm=${tarball}`);
    } catch (e) {
      attempts.push(`${lane.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return resultRow(
    'registry-client.resolve',
    'resolve().assetUrl equals npm packument dist.tarball',
    attempts.length > 0 ? attempts.join('; ') : 'no registry lanes configured',
    false,
    { canonicalKey: 'registry-client resolve', canonical: RESOLVE_DOCS }
  );
}

/** download() verifies byte length and SHA-256 against registry index metadata. */
export async function probeRegistryClientDownload(): Promise<RegistryClientProbeRow> {
  const attempts: string[] = [];

  for (const lane of SCOPED_REGISTRY_LANES) {
    const baseUrl = normalizeBaseUrl(lane.resolveUrl());
    if (!baseUrl) continue;

    try {
      const client = new RegistryClient({ baseUrl });
      const resolved = await client.resolve(
        REGISTRY_CLIENT_PROBE_PACKAGE,
        REGISTRY_CLIENT_PROBE_VERSION
      );
      if (!resolved) {
        attempts.push(`${lane.id}: resolve undefined`);
        continue;
      }
      const data = await client.download(
        REGISTRY_CLIENT_PROBE_PACKAGE,
        REGISTRY_CLIENT_PROBE_VERSION
      );
      if (!data) {
        attempts.push(`${lane.id}: download returned undefined`);
        continue;
      }
      const receivedBytes = uint8TotalBytes(data);
      const ok = receivedBytes === resolved.release.storage.size && receivedBytes > 0;
      if (ok) {
        return resultRow(
          'registry-client.download',
          'download() bytes match index size + SHA-256 verified',
          `${lane.id} ${receivedBytes} bytes checksum=${resolved.release.storage.checksum.slice(0, 12)}…`,
          true,
          {
            canonicalKey: 'registry-client download',
            canonical: DOWNLOAD_DOCS,
            lane: lane.id,
          }
        );
      }
      attempts.push(`${lane.id}: size=${receivedBytes} expected=${resolved.release.storage.size}`);
    } catch (e) {
      attempts.push(`${lane.id}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return resultRow(
    'registry-client.download',
    'download() bytes match index size + SHA-256 verified',
    attempts.length > 0 ? attempts.join('; ') : 'no registry lanes configured',
    false,
    { canonicalKey: 'registry-client download', canonical: DOWNLOAD_DOCS }
  );
}

/** publish() rejects unauthenticated clients before any network I/O. */
export async function probeRegistryClientPublishRequiresApiKey(): Promise<RegistryClientProbeRow> {
  const client = new RegistryClient({ baseUrl: 'https://registry.example' });
  try {
    await client.publish(
      REGISTRY_CLIENT_PROBE_PACKAGE,
      REGISTRY_CLIENT_PROBE_VERSION,
      new Uint8Array([0x1f, 0x8b])
    );
    return resultRow(
      'registry-client.publish',
      'publish() throws when apiKey is absent',
      'publish succeeded without apiKey',
      false,
      { canonicalKey: 'registry-client publish', canonical: PUBLISH_DOCS }
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const ok = msg.includes('API key');
    return resultRow(
      'registry-client.publish',
      'publish() throws when apiKey is absent',
      ok ? 'Registry publish requires an API key' : msg,
      ok,
      { canonicalKey: 'registry-client publish', canonical: PUBLISH_DOCS }
    );
  }
}

export async function runRegistryClientVerification(): Promise<{
  ok: boolean;
  results: RegistryClientProbeRow[];
}> {
  const results = await Promise.all([
    probeRegistryClientResolveParity(),
    probeRegistryClientDownload(),
    probeRegistryClientPublishRequiresApiKey(),
  ]);
  return { ok: results.every(r => r.passed), results };
}

export type { VerificationLinks };
