// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/bundler/fullstack#production-mode — --production
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/pm/cli/update#latest — --latest
/**
 * Desk package update helpers — wraps `bun outdated` / `bun update`.
 * @see https://bun.com/docs/cli/update
 */

import { joinPath } from '../path-bun.ts';
import { ROOT } from './paths.ts';

export type PackageDepType =
  'dependencies' | 'devDependencies' | 'peerDependencies' | 'optionalDependencies';

export type PackageDependency = {
  name: string;
  current: string;
  range: string;
  /** Semver-compatible update within range (from `bun outdated` Update column). */
  target: string;
  latest: string;
  type: PackageDepType;
  workspace?: string;
  /** True when Update/Latest differ from Current. */
  outdated: boolean;
};

export type PackageSnapshot = {
  ok: true;
  packageJson: {
    name?: string;
    version?: string;
    packageManager?: string;
  };
  lockfileHash: string;
  lockfilePath: string;
  dependencies: PackageDependency[];
  generatedAt: string;
  bun: string;
};

export type UpdateFlags = {
  latest?: boolean;
  force?: boolean;
  frozenLockfile?: boolean;
  noSave?: boolean;
  production?: boolean;
  recursive?: boolean;
  dryRun?: boolean;
};

function lockfilePath(): string {
  const text = joinPath(ROOT, 'bun.lock');
  const binary = joinPath(ROOT, 'bun.lockb');
  if (Bun.file(text).size > 0) return text;
  return binary;
}

export async function hashLockfile(): Promise<{ path: string; hash: string }> {
  const path = lockfilePath();
  const file = Bun.file(path);
  if (!(await file.exists())) {
    return { path, hash: 'missing' };
  }
  const buf = new Uint8Array(await file.arrayBuffer());
  const hash = new Bun.CryptoHasher('sha256').update(buf).digest('hex');
  return { path, hash: `sha256-${hash.slice(0, 16)}` };
}

function classifyDepType(
  pkg: Record<string, unknown>,
  name: string,
  outdatedHint: string
): PackageDepType {
  if (/\(dev\)\s*$/.test(outdatedHint) || name.endsWith(' (dev)')) return 'devDependencies';
  if (/\(peer\)\s*$/.test(outdatedHint)) return 'peerDependencies';
  if (/\(optional\)\s*$/.test(outdatedHint)) return 'optionalDependencies';
  const deps = (pkg.dependencies ?? {}) as Record<string, string>;
  const dev = (pkg.devDependencies ?? {}) as Record<string, string>;
  const peer = (pkg.peerDependencies ?? {}) as Record<string, string>;
  const opt = (pkg.optionalDependencies ?? {}) as Record<string, string>;
  const bare = name.replace(/\s*\((dev|peer|optional)\)\s*$/i, '');
  if (bare in dev) return 'devDependencies';
  if (bare in peer) return 'peerDependencies';
  if (bare in opt) return 'optionalDependencies';
  if (bare in deps) return 'dependencies';
  return 'dependencies';
}

function rangeFor(pkg: Record<string, unknown>, name: string, type: PackageDepType): string {
  const bare = name.replace(/\s*\((dev|peer|optional)\)\s*$/i, '');
  const catalog = (pkg.catalog ?? {}) as Record<string, string>;
  const block = (pkg[type] ?? {}) as Record<string, string>;
  const raw = block[bare];
  if (raw == null) return '—';
  if (raw === 'catalog:' || raw.startsWith('catalog:')) {
    return catalog[bare] ? `catalog:${catalog[bare]}` : raw;
  }
  return raw;
}

/** Parse `bun outdated` ASCII table into dependency rows. */
export function parseOutdatedTable(stdout: string): Array<{
  name: string;
  current: string;
  update: string;
  latest: string;
  workspace: string;
  typeHint: string;
}> {
  const rows: Array<{
    name: string;
    current: string;
    update: string;
    latest: string;
    workspace: string;
    typeHint: string;
  }> = [];
  for (const line of stdout.split('\n')) {
    if (!line.includes('|')) continue;
    if (/^\|[-|]+\|$/.test(line.trim())) continue;
    if (/Package\s+\|\s+Current/i.test(line)) continue;
    const cells = line
      .split('|')
      .map(c => c.trim())
      .filter(Boolean);
    if (cells.length < 4) continue;
    const [nameRaw, current, update, latest, workspace = ''] = cells;
    if (!nameRaw || !current || current === 'Current') continue;
    const typeHint = nameRaw;
    const name = nameRaw.replace(/\s*\((dev|peer|optional)\)\s*$/i, '').trim();
    rows.push({
      name,
      current: current.replace(/\s*\*$/, ''),
      update: update.replace(/\s*\*$/, ''),
      latest: latest.replace(/\s*\*$/, ''),
      workspace: workspace.replace(/^catalog\s*\(/i, '').replace(/\)$/, '') || workspace,
      typeHint,
    });
  }
  return rows;
}

export async function getPackageSnapshot(
  opts: {
    production?: boolean;
    recursive?: boolean;
    latestAsTarget?: boolean;
  } = {}
): Promise<PackageSnapshot> {
  const pkgPath = joinPath(ROOT, 'package.json');
  const pkg = (await Bun.file(pkgPath).json()) as Record<string, unknown>;
  const lock = await hashLockfile();

  const args = ['outdated'];
  if (opts.production) args.push('--production');
  if (opts.recursive) args.push('--recursive');

  const proc = Bun.spawn(['bun', ...args], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  });
  const stdout = await new Response(proc.stdout).text();
  await proc.exited;

  const parsed = parseOutdatedTable(stdout);
  const dependencies: PackageDependency[] = parsed.map(row => {
    const type = classifyDepType(pkg, row.typeHint, row.typeHint);
    const target = opts.latestAsTarget ? row.latest : row.update || row.current;
    return {
      name: row.name,
      current: row.current,
      range: rangeFor(pkg, row.name, type),
      target,
      latest: row.latest,
      type,
      workspace: row.workspace || undefined,
      outdated: row.current !== target || row.current !== row.latest,
    };
  });

  // Also surface root deps that aren't outdated (optional — keep list focused on outdated)
  return {
    ok: true,
    packageJson: {
      name: typeof pkg.name === 'string' ? pkg.name : undefined,
      version: typeof pkg.version === 'string' ? pkg.version : undefined,
      packageManager: typeof pkg.packageManager === 'string' ? pkg.packageManager : undefined,
    },
    lockfileHash: lock.hash,
    lockfilePath: lock.path,
    dependencies,
    generatedAt: new Date().toISOString(),
    bun: Bun.version,
  };
}

export type UpdateEvent =
  | { type: 'start'; command: string[]; dryRun: boolean; selected: string[] }
  | { type: 'stdout'; line: string }
  | { type: 'stderr'; line: string }
  | { type: 'progress'; percent: number }
  | {
      type: 'done';
      ok: boolean;
      exitCode: number;
      lockfileHashBefore: string;
      lockfileHashAfter: string;
      changed: boolean;
      error?: string;
    };

function buildUpdateArgs(selected: string[], flags: UpdateFlags): string[] {
  const args = ['update'];
  if (flags.dryRun !== false) args.push('--dry-run');
  if (flags.latest) args.push('--latest');
  if (flags.force) args.push('--force');
  if (flags.frozenLockfile) args.push('--frozen-lockfile');
  if (flags.noSave) args.push('--no-save');
  if (flags.production) args.push('--production');
  if (flags.recursive) args.push('--recursive');
  for (const name of selected) {
    if (name && !name.startsWith('-')) args.push(name);
  }
  return args;
}

async function* readLines(stream: ReadableStream<Uint8Array> | null): AsyncGenerator<string> {
  if (!stream) return;
  const reader = stream.getReader();
  const dec = new TextDecoder();
  let buf = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += dec.decode(value, { stream: true });
    const parts = buf.split('\n');
    buf = parts.pop() ?? '';
    for (const line of parts) yield line;
  }
  if (buf) yield buf;
}

/** Run bun update; yields progress events (stdout/stderr + done). */
export async function* runPackageUpdate(
  selected: string[],
  flags: UpdateFlags = {}
): AsyncGenerator<UpdateEvent> {
  if (!selected.length) {
    yield {
      type: 'done',
      ok: false,
      exitCode: 1,
      lockfileHashBefore: '',
      lockfileHashAfter: '',
      changed: false,
      error: 'No packages selected',
    };
    return;
  }

  const before = await hashLockfile();
  const dryRun = flags.dryRun !== false;
  const args = buildUpdateArgs(selected, { ...flags, dryRun });
  yield { type: 'start', command: ['bun', ...args], dryRun, selected: [...selected] };

  const proc = Bun.spawn(['bun', ...args], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
    env: { ...Bun.env, NO_COLOR: '1' },
  });

  const timeoutMs = Number(Bun.env.PACKAGE_UPDATE_TIMEOUT_MS ?? 120_000);
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    try {
      proc.kill();
    } catch {
      /* ignore */
    }
  }, timeoutMs);

  let lines = 0;
  const stdoutTask = (async () => {
    const out: string[] = [];
    for await (const line of readLines(proc.stdout as ReadableStream<Uint8Array>)) {
      out.push(line);
    }
    return out;
  })();
  const stderrTask = (async () => {
    const out: string[] = [];
    for await (const line of readLines(proc.stderr as ReadableStream<Uint8Array>)) {
      out.push(line);
    }
    return out;
  })();

  let exitCode = 1;
  try {
    const [stdoutLines, stderrLines, code] = await Promise.all([
      stdoutTask,
      stderrTask,
      proc.exited,
    ]);
    exitCode = code;

    for (const line of stdoutLines) {
      lines += 1;
      yield { type: 'stdout', line };
      yield { type: 'progress', percent: Math.min(90, 10 + lines * 4) };
    }
    for (const line of stderrLines) {
      lines += 1;
      yield { type: 'stderr', line };
      yield { type: 'progress', percent: Math.min(95, 10 + lines * 4) };
    }
  } finally {
    clearTimeout(timer);
  }

  const after = await hashLockfile();
  yield { type: 'progress', percent: 100 };
  yield {
    type: 'done',
    ok: !timedOut && exitCode === 0,
    exitCode: timedOut ? 124 : exitCode,
    lockfileHashBefore: before.hash,
    lockfileHashAfter: after.hash,
    changed: before.hash !== after.hash,
    error: timedOut
      ? `bun update timed out after ${timeoutMs}ms`
      : exitCode === 0
        ? undefined
        : `bun update exited with ${exitCode}`,
  };
}
export function updateEventsToSse(events: AsyncIterable<UpdateEvent>): ReadableStream<Uint8Array> {
  const enc = new TextEncoder();
  return new ReadableStream({
    async start(controller) {
      try {
        for await (const ev of events) {
          controller.enqueue(enc.encode(`data: ${JSON.stringify(ev)}\n\n`));
          if (ev.type === 'done') break;
        }
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        controller.enqueue(
          enc.encode(
            `data: ${JSON.stringify({ type: 'done', ok: false, exitCode: 1, error: message, lockfileHashBefore: '', lockfileHashAfter: '', changed: false })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });
}
