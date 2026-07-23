// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/bundler/executables#code-signing-on-macos — --verify
// @see https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin — bun run -
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — script SHA-256
import { sha256HexAsync } from './sha256.ts';
import { CANONICAL_REMOTES } from '../docs/repo-docs.ts';

export type VerificationScriptId =
  | 'defaults'
  | 'bun-defaults'
  | 'networking'
  | 'release'
  | 'doc-index';

const GITHUB_RAW_BRANCH = 'main';

export type VerificationScriptSpec = {
  id: VerificationScriptId;
  path: string;
  proofPath: string;
  /** Example args after `bun run -` when piped. */
  pipeArgs: string;
};

export const VERIFICATION_SCRIPTS: Record<VerificationScriptId, VerificationScriptSpec> = {
  defaults: {
    id: 'defaults',
    path: 'tools/verify-defaults.ts',
    proofPath: 'public/registry/defaults-proof.json',
    pipeArgs: '',
  },
  'bun-defaults': {
    id: 'bun-defaults',
    path: 'tools/verify-bun-defaults.ts',
    proofPath: 'public/registry/bun-defaults-proof.json',
    pipeArgs: '',
  },
  networking: {
    id: 'networking',
    path: 'tools/verify-networking.bundle.js',
    proofPath: 'public/registry/networking-proof.json',
    pipeArgs: '--local-only',
  },
  release: {
    id: 'release',
    path: 'tools/verify-bun-release.ts',
    proofPath: 'public/registry/release-features.json',
    pipeArgs: '',
  },
  'doc-index': {
    id: 'doc-index',
    path: 'tools/build-doc-index.ts',
    proofPath: 'public/registry/doc-index.json',
    pipeArgs: '--save',
  },
};

export function verificationScriptGitHubRawUrl(path: string, branch = GITHUB_RAW_BRANCH): string {
  const { owner, name } = CANONICAL_REMOTES.origin;
  return `https://raw.githubusercontent.com/${owner}/${name}/${branch}/${path}`;
}

function scriptContentType(path: string): string {
  return path.endsWith('.js') ? 'text/javascript; charset=utf-8' : 'text/typescript; charset=utf-8';
}

async function readRegistryProof(proofPath: string): Promise<{
  proofHash: string | null;
  generated: string | null;
}> {
  let raw: string | null = null;
  if (typeof Bun !== 'undefined') {
    const proofFile = Bun.file(proofPath);
    if (await proofFile.exists()) {
      raw = await proofFile.text();
    }
  }
  if (raw === null) {
    try {
      const res = await fetch(verificationScriptGitHubRawUrl(proofPath));
      if (res.ok) raw = await res.text();
    } catch {
      /* ignore fetch errors */
    }
  }
  if (raw === null) return { proofHash: null, generated: null };
  try {
    const proof = JSON.parse(raw) as { proofHash?: string; timestamp?: string; generated?: string };
    return {
      proofHash: proof.proofHash ?? null,
      generated: proof.timestamp ?? proof.generated ?? null,
    };
  } catch {
    return { proofHash: null, generated: null };
  }
}

export function verificationScriptSpec(id: VerificationScriptId): VerificationScriptSpec {
  const spec = VERIFICATION_SCRIPTS[id];
  if (!spec) throw new Error(`unknown verification script: ${id}`);
  return spec;
}

export async function readVerificationScript(id: VerificationScriptId): Promise<string> {
  const { path } = verificationScriptSpec(id);
  if (typeof Bun !== 'undefined') {
    const file = Bun.file(path);
    if (await file.exists()) {
      return file.text();
    }
  }
  const res = await fetch(verificationScriptGitHubRawUrl(path));
  if (!res.ok) {
    throw new Error(`verification script missing: ${path} (${res.status})`);
  }
  return res.text();
}

export async function verificationScriptSha256(id: VerificationScriptId): Promise<string> {
  return sha256HexAsync(await readVerificationScript(id));
}

export type VerificationScriptMeta = {
  id: VerificationScriptId;
  path: string;
  scriptSha256: string;
  proofPath: string;
  proofHash: string | null;
  generated: string | null;
  pipe: string;
  pipeVerified: string;
  scriptUrl: string;
  metaUrl: string;
};

export async function buildVerificationScriptMeta(
  id: VerificationScriptId,
  baseUrl = 'http://127.0.0.1:3000'
): Promise<VerificationScriptMeta> {
  const spec = verificationScriptSpec(id);
  const scriptSha256 = await verificationScriptSha256(id);
  const base = baseUrl.replace(/\/$/, '');
  const scriptUrl = `${base}/api/${id}/script`;
  const { proofHash, generated } = await readRegistryProof(spec.proofPath);

  const pipe = `curl -sf ${scriptUrl} | bun run -${spec.pipeArgs ? ` ${spec.pipeArgs}` : ''}`;
  const pipeVerified =
    `curl -sf ${scriptUrl} | bun tools/run-verified.ts --verify-hash=${scriptSha256}` +
    (spec.pipeArgs ? ` -- ${spec.pipeArgs}` : '');

  return {
    id,
    path: spec.path,
    scriptSha256,
    proofPath: spec.proofPath,
    proofHash,
    generated,
    pipe,
    pipeVerified,
    scriptUrl,
    metaUrl: `${scriptUrl}.meta`,
  };
}

export async function serveVerificationScript(
  id: VerificationScriptId,
  opts: { baseUrl?: string } = {}
): Promise<Response> {
  try {
    const body = await readVerificationScript(id);
    const scriptSha256 = await sha256HexAsync(body);
    const meta = await buildVerificationScriptMeta(id, opts.baseUrl);
    return new Response(body, {
      headers: {
        'Content-Type': scriptContentType(verificationScriptSpec(id).path),
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
        'X-Script-SHA256': scriptSha256,
        Link: `<${meta.metaUrl}>; rel="describedby"`,
      },
    });
  } catch (err) {
    return Response.json(
      {
        error: err instanceof Error ? err.message : String(err),
        hint: `Run locally: bun ${verificationScriptSpec(id).path}`,
      },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function serveVerificationScriptMeta(
  id: VerificationScriptId,
  baseUrl: string
): Promise<Response> {
  try {
    const meta = await buildVerificationScriptMeta(id, baseUrl);
    return Response.json(meta, {
      headers: {
        'Cache-Control': 'no-store',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 404, headers: { 'Access-Control-Allow-Origin': '*' } }
    );
  }
}

export async function verifyScriptSha256(script: string, expected: string): Promise<boolean> {
  return (await sha256HexAsync(script)) === expected.trim().toLowerCase();
}
