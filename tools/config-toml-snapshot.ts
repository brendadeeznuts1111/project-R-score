#!/usr/bin/env bun
/**
 * Read config JSON → hash bytes once → write TOML snapshot.
 *
 * Enhanced vs one-liner:
 * - single-pass bytes (hash + JSON.parse)
 * - algorithm pin (sha256 default; sha3-256 for audit SSOT)
 * - meta: bun / algorithm / hash / source / bytes
 * - embed: auto|table|json (nested → data_json string for round-trip)
 * - types-lag TOML.stringify via lib/toml-stringify.ts
 *
 * Usage:
 *   bun tools/config-toml-snapshot.ts <config.json> [out.toml]
 *     [--algo=sha256|sha3-256] [--embed=auto|table|json] [--stdout]
 *
 * @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
 * @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
 * @see https://bun.com/docs/runtime/hashing#bun-cryptohasher
 * @see https://bun.com/docs/runtime/toml#bun-toml-stringify
 * @see https://bun.com/docs/runtime/utils#bun-version
 */
import { tomlStringify } from '../lib/toml-stringify.ts';

export type SnapshotAlgorithm = 'sha256' | 'sha3-256';
export type SnapshotEmbed = 'auto' | 'table' | 'json';

export type ConfigTomlSnapshotMeta = {
  bun: string;
  algorithm: SnapshotAlgorithm;
  hash: string;
  source: string;
  bytes: number;
};

export type ConfigTomlSnapshot = ConfigTomlSnapshotMeta & {
  /** Shallow object as TOML table. */
  data?: Record<string, string | number | boolean>;
  /** Full JSON when nested / arrays need fidelity. */
  data_json?: string;
};

export type WriteConfigTomlSnapshotOpts = {
  source: string;
  out?: string;
  algorithm?: SnapshotAlgorithm;
  embed?: SnapshotEmbed;
  /** When true (or out omitted with --stdout), return body without write. */
  stdout?: boolean;
};

const ALGOS = new Set<SnapshotAlgorithm>(['sha256', 'sha3-256']);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** True when every value is a TOML-safe scalar (no nest / array). */
function isShallowScalarRecord(v: unknown): v is Record<string, string | number | boolean> {
  if (!isPlainObject(v)) return false;
  for (const val of Object.values(v)) {
    const t = typeof val;
    if (t !== 'string' && t !== 'number' && t !== 'boolean') return false;
    if (t === 'number' && !Number.isFinite(val as number)) return false;
  }
  return true;
}

function resolveEmbed<TData>(
  data: TData,
  embed: SnapshotEmbed
): Pick<ConfigTomlSnapshot, 'data' | 'data_json'> {
  if (embed === 'json') {
    return { data_json: JSON.stringify(data) };
  }
  if (embed === 'table') {
    if (!isShallowScalarRecord(data)) {
      throw new Error('embed=table requires a shallow JSON object of string|number|boolean values');
    }
    return { data };
  }
  // auto
  if (isShallowScalarRecord(data)) return { data };
  return { data_json: JSON.stringify(data) };
}

/** Hash + parse config bytes once; build snapshot record (no I/O write). */
export async function buildConfigTomlSnapshot(
  source: string,
  opts: { algorithm?: SnapshotAlgorithm; embed?: SnapshotEmbed } = {}
): Promise<ConfigTomlSnapshot> {
  const algorithm = opts.algorithm ?? 'sha256';
  if (!ALGOS.has(algorithm)) {
    throw new Error(`unsupported algorithm: ${algorithm}`);
  }
  const embed = opts.embed ?? 'auto';

  const file = Bun.file(source);
  if (!(await file.exists())) {
    throw new Error(`config not found: ${source}`);
  }

  const bytes = await file.bytes();
  const hash = new Bun.CryptoHasher(algorithm).update(bytes).digest('hex');

  let data: unknown;
  try {
    data = JSON.parse(new TextDecoder().decode(bytes));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`invalid JSON in ${source}: ${msg}`);
  }

  return {
    bun: Bun.version,
    algorithm,
    hash,
    source,
    bytes: bytes.byteLength,
    ...resolveEmbed(data, embed),
  };
}

/** Build snapshot and write TOML (or return body for stdout). */
export async function writeConfigTomlSnapshot(
  opts: WriteConfigTomlSnapshotOpts
): Promise<{ snapshot: ConfigTomlSnapshot; body: string; out?: string }> {
  const snapshot = await buildConfigTomlSnapshot(opts.source, {
    algorithm: opts.algorithm,
    embed: opts.embed,
  });
  const body = tomlStringify(snapshot);
  if (opts.out) {
    await Bun.write(opts.out, body);
  }
  return { snapshot, body, out: opts.out };
}

function printHelp(): never {
  console.log(`config-toml-snapshot — JSON config → hashed TOML snapshot

Usage:
  bun tools/config-toml-snapshot.ts <config.json> [out.toml] [flags]

Flags:
  --algo=sha256|sha3-256   Digest algorithm (default sha256; audit: sha3-256)
  --embed=auto|table|json  How to store data (default auto)
  --stdout                 Print TOML to stdout (still writes if out given)
  --json                   Print snapshot record as JSON instead of TOML
  -h, --help               This help

One-liner equivalent (enhanced):
  bun tools/config-toml-snapshot.ts config.json snapshot.toml
`);
  process.exit(0);
}

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter(a => a.startsWith('-')));
  const pos = argv.filter(a => !a.startsWith('-'));
  const algoFlag = [...flags].find(f => f.startsWith('--algo='));
  const embedFlag = [...flags].find(f => f.startsWith('--embed='));
  const algorithm = (algoFlag?.slice('--algo='.length) ?? 'sha256') as SnapshotAlgorithm;
  const embed = (embedFlag?.slice('--embed='.length) ?? 'auto') as SnapshotEmbed;
  return {
    help: flags.has('-h') || flags.has('--help'),
    stdout: flags.has('--stdout'),
    asJson: flags.has('--json'),
    algorithm,
    embed,
    source: pos[0],
    out: pos[1],
  };
}

if (import.meta.main) {
  const args = parseArgs(Bun.argv.slice(2));
  if (args.help || !args.source) printHelp();

  if (!ALGOS.has(args.algorithm)) {
    console.error(`bad --algo: ${args.algorithm}`);
    process.exit(1);
  }
  if (!(['auto', 'table', 'json'] as const).includes(args.embed)) {
    console.error(`bad --embed: ${args.embed}`);
    process.exit(1);
  }

  const out = args.out ?? (args.stdout || args.asJson ? undefined : 'snapshot.toml');
  const {
    snapshot,
    body,
    out: written,
  } = await writeConfigTomlSnapshot({
    source: args.source!,
    out,
    algorithm: args.algorithm,
    embed: args.embed,
    stdout: args.stdout || args.asJson,
  });

  if (args.asJson) {
    console.log(JSON.stringify(snapshot, null, 2));
  } else if (args.stdout || !written) {
    process.stdout.write(body.endsWith('\n') ? body : `${body}\n`);
  } else {
    console.error(
      `wrote ${written}  BUN ${snapshot.bun}  ${snapshot.algorithm} ${snapshot.hash.slice(0, 12)}…  ${snapshot.bytes}B`
    );
  }
}
