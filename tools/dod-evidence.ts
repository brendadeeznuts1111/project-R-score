#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * DOD image evidence CLI — pack / verify / similar.
 *
 *   bun tools/dod-evidence.ts pack <image> [--kind=slip] [--out=evidence.json] [--preview] [--register]
 *   bun tools/dod-evidence.ts verify <image> <evidence.json>
 *   bun tools/dod-evidence.ts similar <averageHash> [--registry=…] [--threshold=5]
 *
 * @see https://bun.com/docs/runtime/image#input — Bun.Image
 * @see ../lib/dod/evidence.ts
 */
import { joinPath } from '../lib/path-bun.ts';
import {
  appendDodRegistry,
  buildDodEvidencePackage,
  dodEvidenceToJson,
  DOD_KINDS,
  findSimilarInRegistry,
  parseDodEvidencePackage,
  storePreviewWebp,
  verifyDodEvidence,
  type DodKind,
} from '../lib/dod/evidence.ts';
import { unbrand } from '../lib/types/branded.ts';

const ROOT = joinPath(import.meta.dir, '..');
const DEFAULT_REGISTRY = joinPath(ROOT, 'public/registry/dod-registry.json');

function printHelp(): never {
  console.log(`dod-evidence — Daily Operations Document image pack/verify

Commands:
  pack <image> [--kind=slip] [--out=path.json] [--agent=id] [--preview] [--register]
  verify <image> <evidence.json>
  similar <averageHash> [--registry=path] [--threshold=5]

Kinds: ${DOD_KINDS.join(' | ')}
Env: DOD_PROOF_SECRET — optional HMAC on pack/verify
`);
  process.exit(0);
}

function flag(args: string[], name: string): string | undefined {
  const hit = args.find(a => a.startsWith(`${name}=`));
  return hit?.slice(name.length + 1);
}

function has(args: string[], name: string): boolean {
  return args.includes(name);
}

async function cmdPack(args: string[]): Promise<void> {
  const imagePath = args.find(a => !a.startsWith('-'));
  if (!imagePath) {
    console.error('usage: pack <image> [--kind=…] [--out=…]');
    process.exit(1);
  }
  const kind = (flag(args, '--kind') ?? 'other') as DodKind;
  if (!DOD_KINDS.includes(kind)) {
    console.error(`bad --kind (want ${DOD_KINDS.join('|')})`);
    process.exit(1);
  }
  const out = flag(args, '--out') ?? `${imagePath}.dod.json`;
  const agentId = flag(args, '--agent');
  const bytes = await Bun.file(imagePath).bytes();
  const pkg = await buildDodEvidencePackage({ bytes, kind, agentId });
  await Bun.write(out, `${JSON.stringify(dodEvidenceToJson(pkg), null, 2)}\n`);
  console.log(`wrote ${out}`);
  console.log(
    `  id=${unbrand(pkg.id)}  aHash=${pkg.averageHash}  digest=${pkg.meta.digest.slice(0, 16)}…`
  );

  if (has(args, '--preview')) {
    const previewPath = out.replace(/\.json$/i, '') + '.webp';
    const webp = await storePreviewWebp(bytes);
    await Bun.write(previewPath, webp);
    console.log(`  preview ${previewPath} (${webp.byteLength}B)`);
  }

  if (has(args, '--register')) {
    const registry = flag(args, '--registry') ?? DEFAULT_REGISTRY;
    await appendDodRegistry(
      {
        id: unbrand(pkg.id),
        kind: pkg.kind,
        agentId: pkg.agentId,
        averageHash: pkg.averageHash,
        digest: pkg.meta.digest,
        algorithm: pkg.meta.algorithm,
        submittedAt: pkg.submittedAt,
        registeredAt: new Date().toISOString(),
      },
      registry
    );
    console.log(`  registered → ${registry}`);
  }
}

async function cmdVerify(args: string[]): Promise<void> {
  const paths = args.filter(a => !a.startsWith('-'));
  const imagePath = paths[0];
  const jsonPath = paths[1];
  if (!imagePath || !jsonPath) {
    console.error('usage: verify <image> <evidence.json>');
    process.exit(1);
  }
  const bytes = await Bun.file(imagePath).bytes();
  const pkg = parseDodEvidencePackage(await Bun.file(jsonPath).json());
  const result = await verifyDodEvidence(pkg, bytes);
  for (const c of result.checks) {
    console.log(`${c.ok ? 'OK' : 'FAIL'}  ${c.id}  ${c.message}`);
  }
  console.log(result.ok ? 'VERIFY PASS' : 'VERIFY FAIL');
  process.exit(result.ok ? 0 : 1);
}

async function cmdSimilar(args: string[]): Promise<void> {
  const hash = args.find(a => !a.startsWith('-') && /^[0-9a-f]{16}$/i.test(a));
  if (!hash) {
    console.error('usage: similar <16-hex-averageHash> [--threshold=5]');
    process.exit(1);
  }
  const registry = flag(args, '--registry') ?? DEFAULT_REGISTRY;
  const threshold = Number(flag(args, '--threshold') ?? '5');
  const hits = await findSimilarInRegistry(hash.toLowerCase(), registry, threshold);
  if (!hits.length) {
    console.log('no similar entries');
    return;
  }
  for (const h of hits) {
    console.log(`${h.id}  ${h.kind}  aHash=${h.averageHash}  agent=${h.agentId ?? '—'}`);
  }
}

if (import.meta.main) {
  const argv = Bun.argv.slice(2);
  if (!argv.length || has(argv, '-h') || has(argv, '--help')) printHelp();
  const cmd = argv[0]!;
  const rest = argv.slice(1);
  if (cmd === 'pack') await cmdPack(rest);
  else if (cmd === 'verify') await cmdVerify(rest);
  else if (cmd === 'similar') await cmdSimilar(rest);
  else {
    console.error(`unknown command: ${cmd}`);
    printHelp();
  }
}
