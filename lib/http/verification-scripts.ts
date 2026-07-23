// @see https://bun.com/docs/runtime#bun-run-to-pipe-code-from-stdin — bun run -
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — script SHA-256
import { sha256Hex } from '../bun-utils-proof.ts';

export type VerificationScriptId = 'defaults' | 'bun-defaults' | 'networking';

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
    pipeArgs: '',
  },
};

export function verificationScriptSpec(id: VerificationScriptId): VerificationScriptSpec {
  const spec = VERIFICATION_SCRIPTS[id];
  if (!spec) throw new Error(`unknown verification script: ${id}`);
  return spec;
}

export async function readVerificationScript(id: VerificationScriptId): Promise<string> {
  const { path } = verificationScriptSpec(id);
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`verification script missing: ${path}`);
  }
  return file.text();
}

export async function verificationScriptSha256(id: VerificationScriptId): Promise<string> {
  return sha256Hex(await readVerificationScript(id));
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
  const scriptUrl = `${base}/api/${id === 'bun-defaults' ? 'bun-defaults' : id}/script`;

  let proofHash: string | null = null;
  let generated: string | null = null;
  const proofFile = Bun.file(spec.proofPath);
  if (await proofFile.exists()) {
    try {
      const proof = (await proofFile.json()) as { proofHash?: string; timestamp?: string; generated?: string };
      proofHash = proof.proofHash ?? null;
      generated = proof.timestamp ?? proof.generated ?? null;
    } catch {
      /* ignore malformed proof */
    }
  }

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
    const scriptSha256 = sha256Hex(body);
    const meta = await buildVerificationScriptMeta(id, opts.baseUrl);
    return new Response(body, {
      headers: {
        'Content-Type': 'text/typescript; charset=utf-8',
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

export function verifyScriptSha256(script: string, expected: string): boolean {
  return sha256Hex(script) === expected.trim().toLowerCase();
}
