// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Canonical fetch protocol-support doc anchors (runtime networking).
 *
 * @see https://bun.com/docs/runtime/networking/fetch#protocol-support
 * @see https://bun.com/docs/runtime/networking/fetch#s3-urls-s3
 * @see https://bun.com/docs/runtime/networking/fetch#file-urls-file
 */
// eslint-disable-next-line no-restricted-imports -- probe scratch mkdtemp (defer: probe batch)
import { mkdtemp, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { bunSpawnArgs } from '../bun-executable.ts';
import { pathToFileURL } from '../bun-path-url.ts';
import { joinPath } from '../path-bun.ts';
import {
  hasR2Credentials,
  type NormalizedR2Credentials,
  r2CredentialsFromEnv,
} from '../security/r2-credentials.ts';

const FETCH_DOC = 'https://bun.com/docs/runtime/networking/fetch';

export const FETCH_PROTOCOL_DOCS = {
  protocolSupport: `${FETCH_DOC}#protocol-support`,
  s3: `${FETCH_DOC}#s3-urls-s3`,
  file: `${FETCH_DOC}#file-urls-file`,
  data: `${FETCH_DOC}#data-urls-data`,
  blob: `${FETCH_DOC}#blob-urls-blob`,
} as const;

export type FetchProtocolDocKey = keyof typeof FETCH_PROTOCOL_DOCS;

/** Doc coverage matrix — which probe exercises each fetch protocol anchor. */
export const FETCH_PROTOCOL_COVERAGE = [
  {
    protocol: 'data:',
    canonical: FETCH_PROTOCOL_DOCS.data,
    probe: 'fetch protocol (data:)',
    offline: true,
  },
  {
    protocol: 'blob:',
    canonical: FETCH_PROTOCOL_DOCS.blob,
    probe: 'fetch protocol (blob:)',
    offline: true,
  },
  {
    protocol: 'file://',
    canonical: FETCH_PROTOCOL_DOCS.file,
    probe: 'fetch protocol (file://)',
    offline: true,
  },
  {
    protocol: 's3:// (explicit)',
    canonical: FETCH_PROTOCOL_DOCS.s3,
    probe: 'fetch s3:// (explicit s3: creds)',
    offline: false,
  },
  {
    protocol: 's3:// (env)',
    canonical: FETCH_PROTOCOL_DOCS.s3,
    probe: 'fetch s3:// (env credentials)',
    offline: false,
  },
  {
    protocol: 's3:// (Bun.file)',
    canonical: FETCH_PROTOCOL_DOCS.s3,
    probe: 'fetch s3:// (Bun.file)',
    offline: false,
  },
] as const;

export type FetchProtocolProbeRow = {
  name: string;
  ok: boolean;
  skipped?: boolean;
  note: string;
  canonical: string;
};

/** Explicit `s3:` init for `fetch("s3://…")` — mirrors Bun docs. */
export type FetchS3Init = {
  accessKeyId: string; // brand-ok — R2 credential field (see lib/security/r2-credentials)
  secretAccessKey: string;
  region?: string;
  endpoint?: string;
};

export type FetchS3Request = {
  url: string;
  init?: RequestInit & { s3?: FetchS3Init };
};

/**
 * Build an s3:// fetch target. Omit `creds` to rely on environment credentials
 * (AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_REGION).
 */
export function buildFetchS3Request(
  bucket: string,
  key: string,
  creds?: FetchS3Init
): FetchS3Request {
  const path = key.replace(/^\//, '');
  const url = `s3://${bucket}/${path}`;
  if (!creds) {
    return { url };
  }
  const s3: FetchS3Init = {
    accessKeyId: creds.accessKeyId,
    secretAccessKey: creds.secretAccessKey,
    ...(creds.region ? { region: creds.region } : {}),
    ...(creds.endpoint ? { endpoint: creds.endpoint } : {}),
  };
  return { url, init: { s3 } };
}

/** Map normalized R2 env to AWS-style vars for env-only s3:// / Bun.file probes. */
export function awsEnvFromR2Credentials(creds: NormalizedR2Credentials): Record<string, string> {
  const env: Record<string, string> = {
    AWS_ACCESS_KEY_ID: String(creds.accessKeyId),
    AWS_SECRET_ACCESS_KEY: creds.secretAccessKey,
    AWS_REGION: 'auto',
  };
  if (creds.endpoint) {
    env['S3_ENDPOINT'] = creds.endpoint;
    env['AWS_ENDPOINT_URL'] = creds.endpoint;
  }
  return env;
}

export function fetchS3InitFromR2(creds: NormalizedR2Credentials): FetchS3Init {
  return {
    accessKeyId: String(creds.accessKeyId),
    secretAccessKey: creds.secretAccessKey,
    region: 'auto',
    ...(creds.endpoint ? { endpoint: creds.endpoint } : {}),
  };
}

async function spawnEval(
  script: string,
  env: Record<string, string | undefined> = {},
  timeoutMs = 15_000
): Promise<{ ok: boolean; note: string; json?: Record<string, unknown> }> {
  const proc = Bun.spawn(bunSpawnArgs(['-e', script]), {
    stdout: 'pipe',
    stderr: 'pipe',
    stdin: 'ignore',
    env: { ...(Bun.env as Record<string, string | undefined>), ...env },
  });
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    proc.kill();
  }, timeoutMs);
  const [out, err, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  clearTimeout(timer);
  if (timedOut) {
    return { ok: false, note: `timed out after ${timeoutMs}ms` };
  }
  if (code !== 0) {
    return { ok: false, note: `exit ${code}: ${(err || out).trim().slice(0, 200)}` };
  }
  try {
    const json = JSON.parse(out.trim()) as Record<string, unknown>;
    return { ok: true, note: out.trim(), json };
  } catch {
    return { ok: false, note: `invalid JSON: ${out.trim().slice(0, 200)}` };
  }
}

function s3Url(bucket: string, key: string): string {
  return `s3://${bucket}/${key.replace(/^\//, '')}`;
}

function formatS3Metrics(json: Record<string, unknown>): string {
  const status = json['status'];
  const ct = json['ct'] ?? json['contentType'] ?? '—';
  const bytes = json['bytes'] ?? json['size'] ?? 0;
  const exists = json['exists'];
  if (exists != null) {
    return `exists=${String(exists)} size=${String(bytes)}B`;
  }
  return `HTTP ${String(status)} ct=${String(ct)} bytes=${String(bytes)}B`;
}

async function probeFetchData(): Promise<FetchProtocolProbeRow> {
  const name = 'fetch protocol (data:)';
  try {
    const res = await fetch('data:text/plain;base64,SGVsbG8=');
    const text = await res.text();
    const ok = res.ok && text === 'Hello';
    return {
      name,
      ok,
      note: ok ? `data: round-trip (${res.status})` : `expected Hello, got ${JSON.stringify(text)}`,
      canonical: FETCH_PROTOCOL_DOCS.data,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      note: e instanceof Error ? e.message : String(e),
      canonical: FETCH_PROTOCOL_DOCS.data,
    };
  }
}

async function probeFetchBlob(): Promise<FetchProtocolProbeRow> {
  const name = 'fetch protocol (blob:)';
  const blob = new Blob(['blob-ok'], { type: 'text/plain' });
  const blobUrl = URL.createObjectURL(blob);
  try {
    const res = await fetch(blobUrl);
    const text = await res.text();
    const ok = res.ok && text === 'blob-ok';
    return {
      name,
      ok,
      note: ok
        ? `blob: round-trip (${res.status})`
        : `expected blob-ok, got ${JSON.stringify(text)}`,
      canonical: FETCH_PROTOCOL_DOCS.blob,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      note: e instanceof Error ? e.message : String(e),
      canonical: FETCH_PROTOCOL_DOCS.blob,
    };
  } finally {
    URL.revokeObjectURL(blobUrl);
  }
}

async function probeFetchFile(): Promise<FetchProtocolProbeRow> {
  const name = 'fetch protocol (file://)';
  const dir = await mkdtemp(joinPath(tmpdir(), 'fw-fetch-file-'));
  const path = joinPath(dir, 'probe.txt');
  try {
    await Bun.write(path, 'file-protocol-ok');
    const href = pathToFileURL(path).href;
    const fetchRes = await fetch(href);
    const fetchText = await fetchRes.text();
    const fileText = await Bun.file(path).text();
    const ok = fetchText === 'file-protocol-ok' && fileText === 'file-protocol-ok';
    return {
      name,
      ok,
      note: ok
        ? `fetch(file://) + Bun.file(path) round-trip (${fetchRes.status})`
        : `mismatch fetch=${JSON.stringify(fetchText)} Bun.file=${JSON.stringify(fileText)}`,
      canonical: FETCH_PROTOCOL_DOCS.file,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      note: e instanceof Error ? e.message : String(e),
      canonical: FETCH_PROTOCOL_DOCS.file,
    };
  } finally {
    await unlink(path).catch(() => {});
  }
}

async function probeFetchS3Explicit(
  creds: NormalizedR2Credentials,
  key: string
): Promise<FetchProtocolProbeRow> {
  const name = 'fetch s3:// (explicit s3: creds)';
  const bucket = creds.bucketName!;
  const { url, init } = buildFetchS3Request(bucket, key, fetchS3InitFromR2(creds));
  try {
    const res = await fetch(url, init);
    const ct = res.headers.get('content-type') ?? '—';
    const etag = (res.headers.get('etag') ?? '—').slice(0, 24);
    let bytes = 0;
    if (res.ok) {
      bytes = (await res.arrayBuffer()).byteLength;
    }
    const protocolOk = typeof res.status === 'number' && res.status > 0;
    return {
      name,
      ok: protocolOk,
      note: `explicit s3: → HTTP ${res.status} ct=${ct} etag=${etag} bytes=${bytes}B`,
      canonical: FETCH_PROTOCOL_DOCS.s3,
    };
  } catch (e) {
    return {
      name,
      ok: false,
      note: e instanceof Error ? e.message : String(e),
      canonical: FETCH_PROTOCOL_DOCS.s3,
    };
  }
}

async function probeFetchS3Env(
  creds: NormalizedR2Credentials,
  key: string
): Promise<FetchProtocolProbeRow> {
  const name = 'fetch s3:// (env credentials)';
  const bucket = creds.bucketName!;
  const url = s3Url(bucket, key);
  const script = `
const res = await fetch(${JSON.stringify(url)});
const ct = res.headers.get('content-type') ?? '';
const bytes = res.ok ? (await res.arrayBuffer()).byteLength : 0;
console.log(JSON.stringify({ status: res.status, ct, bytes }));
`.trim();
  const spawned = await spawnEval(script, awsEnvFromR2Credentials(creds));
  if (!spawned.ok || !spawned.json) {
    return { name, ok: false, note: spawned.note, canonical: FETCH_PROTOCOL_DOCS.s3 };
  }
  return {
    name,
    ok: true,
    note: `env AWS_* → ${formatS3Metrics(spawned.json)}`,
    canonical: FETCH_PROTOCOL_DOCS.s3,
  };
}

async function probeFetchS3BunFile(
  creds: NormalizedR2Credentials,
  key: string
): Promise<FetchProtocolProbeRow> {
  const name = 'fetch s3:// (Bun.file)';
  const url = s3Url(creds.bucketName!, key);
  const script = `
const f = Bun.file(${JSON.stringify(url)});
const exists = await f.exists();
const size = exists ? f.size : 0;
console.log(JSON.stringify({ exists, bytes: size }));
`.trim();
  const spawned = await spawnEval(script, awsEnvFromR2Credentials(creds));
  if (!spawned.ok || !spawned.json) {
    return { name, ok: false, note: spawned.note, canonical: FETCH_PROTOCOL_DOCS.s3 };
  }
  return {
    name,
    ok: true,
    note: `Bun.file env creds → ${formatS3Metrics(spawned.json)}`,
    canonical: FETCH_PROTOCOL_DOCS.s3,
  };
}

function skipS3Row(name: string, note: string): FetchProtocolProbeRow {
  return { name, ok: true, skipped: true, note, canonical: FETCH_PROTOCOL_DOCS.s3 };
}

/**
 * Full fetch protocol matrix: offline data/blob/file + optional live s3:// (explicit, env, Bun.file).
 */
export async function runFetchProtocolProbes(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<{ ok: boolean; rows: FetchProtocolProbeRow[] }> {
  const rows: FetchProtocolProbeRow[] = [
    await probeFetchData(),
    await probeFetchBlob(),
    await probeFetchFile(),
  ];

  const creds = r2CredentialsFromEnv({}, env);
  const skipNote =
    'skipped — set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID (+ bucket) for live s3:// probes';

  if (!hasR2Credentials(creds) || !creds.bucketName) {
    rows.push(skipS3Row('fetch s3:// (explicit s3: creds)', skipNote));
    rows.push(skipS3Row('fetch s3:// (env credentials)', skipNote));
    rows.push(skipS3Row('fetch s3:// (Bun.file)', skipNote));
  } else {
    const key = env['R2_PROBE_KEY']?.trim() || 'monitoring.json';
    rows.push(await probeFetchS3Explicit(creds, key));
    rows.push(await probeFetchS3Env(creds, key));
    rows.push(await probeFetchS3BunFile(creds, key));
  }

  return { ok: rows.every(r => r.ok), rows };
}

/** Smoke: offline fetch protocols (data:, blob:) per protocol-support docs. */
export async function smokeFetchProtocolSupport(): Promise<{ ok: boolean; note: string }> {
  const { rows } = await runFetchProtocolProbes({});
  const offline = rows.filter(r => !r.name.includes('s3://'));
  const ok = offline.every(r => r.ok);
  const note = offline.map(r => `${r.name}: ${r.note}`).join('; ');
  return { ok, note };
}

export type FetchS3ProbeResult = {
  ok: boolean;
  note: string;
  skipped?: boolean;
};

/** Back-compat: explicit s3:// probe only (skips when R2 env absent). */
export async function probeFetchS3Optional(
  env: Record<string, string | undefined> = Bun.env as Record<string, string | undefined>
): Promise<FetchS3ProbeResult> {
  const creds = r2CredentialsFromEnv({}, env);
  if (!hasR2Credentials(creds) || !creds.bucketName) {
    return {
      ok: true,
      skipped: true,
      note: 'skipped — set R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID (+ bucket) for live s3:// probe',
    };
  }
  const key = env['R2_PROBE_KEY']?.trim() || 'monitoring.json';
  const row = await probeFetchS3Explicit(creds, key);
  return { ok: row.ok, note: row.note };
}
