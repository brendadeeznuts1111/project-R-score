// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/ffi#dlopen-usage-bunffi — bun:ffi
// @see https://bun.com/docs/runtime/workers#creating-a-worker — Worker
// @see https://bun.com/docs/runtime/html-rewriter — HTMLRewriter
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-resolvesync — Bun.resolveSync
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
/**
 * Proof hash for Bun API / ops one-liner demos — three-source audit trail.
 *
 * Combines demo signature, canonical doc URL, runtime output, and Bun version
 * into a stable SHA-256 for manifest diffing across upgrades.
 */

export type ProofInput = {
  /** Demo id + apis joined, or API token for per-symbol proofs. */
  signature: string;
  docsUrl?: string | null;
  runtimeOutput?: string;
  bunVersion?: string;
};

export function proofHash(input: ProofInput): string {
  const h = new Bun.CryptoHasher('sha256');
  h.update(input.signature);
  if (input.docsUrl) h.update(input.docsUrl);
  if (input.runtimeOutput) h.update(input.runtimeOutput);
  h.update(input.bunVersion ?? Bun.version);
  return h.digest('hex');
}

export function proofPreview(hash: string, len = 8): string {
  return hash.slice(0, len);
}

/** Resolve bun-types package root (all .d.ts concatenated by callers). */
export function resolveBunTypesDir(): string {
  const pkg = Bun.resolveSync('bun-types/package.json', process.cwd());
  return pkg.replace(/\/package\.json$/, '');
}

export async function readBunTypesText(): Promise<string> {
  const dir = resolveBunTypesDir();
  const glob = new Bun.Glob('**/*.d.ts');
  let text = '';
  for await (const f of glob.scan(dir)) {
    text += await Bun.file(`${dir}/${f}`).text();
  }
  return text;
}

/** Resolve a dotted API name against the live runtime. */
export async function probeRuntimeApi(api: string): Promise<string> {
  if (api === 'HTMLRewriter') return typeof HTMLRewriter;
  if (api === 'Worker') return typeof Worker;
  if (api === 'import.meta') return 'object';
  if (api.startsWith('bun:sqlite')) return typeof (await import('bun:sqlite')).Database;
  if (api.startsWith('bun:ffi')) return typeof (await import('bun:ffi')).dlopen;
  let cur: unknown = globalThis;
  const parts = api.split('.');
  for (const part of parts) {
    if (part === 'Bun') {
      cur = Bun;
      continue;
    }
    cur = (cur as Record<string, unknown> | undefined)?.[part];
  }
  return typeof cur;
}

/** Terminal symbol from a CANONICAL token (Bun.CryptoHasher → CryptoHasher). */
export function typesSymbol(api: string): string {
  return api.split(/[.:]/).pop() ?? api;
}

export function typesContains(dts: string, api: string): boolean {
  return dts.includes(typesSymbol(api));
}
