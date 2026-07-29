#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/reference/bun/semver/satisfies — Bun.semver.satisfies
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/semver#bun-semver-satisfies-version-string-range-string-boolean — Bun.semver
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/pm/cli/install#dry-run — bun install --dry-run
/**
 * Bun-native monorepo / portal probes — lockfile, workspaces, scope, semver, snapshots.
 *
 *   bun tools/portal-probe.ts                 # all probes
 *   bun tools/portal-probe.ts lockfile
 *   bun tools/portal-probe.ts workspaces
 *   bun tools/portal-probe.ts deps
 *   bun tools/portal-probe.ts exports
 *   bun tools/portal-probe.ts scope
 *   bun tools/portal-probe.ts runtime
 *   bun tools/portal-probe.ts env
 *   bun tools/portal-probe.ts semver
 *   bun tools/portal-probe.ts patches
 *   bun tools/portal-probe.ts snapshot        # minimal scope snapshot
 *   bun tools/portal-probe.ts snapshots       # list manifests
 *   bun tools/portal-probe.ts --json          # machine-readable (all or one)
 *   bun run portal:probe
 */
import { joinPath } from '../lib/path-bun.ts';
import { jsonOut, logTable } from '../lib/console-depth.ts';

const ROOT = process.cwd();
const argv = Bun.argv.slice(2);
const asJson = argv.includes('--json');
const help = argv.includes('--help') || argv.includes('-h');
const cmd = argv.find(a => !a.startsWith('-')) || 'all';

type ProbeResult = {
  name: string;
  ok: boolean;
  detail?: unknown;
  message?: string;
};

function ansi(ok: boolean, text: string): string {
  if (!process.stdout.isTTY || Bun.env.NO_COLOR) return text;
  // Bun.color("lime","ansi-16") works; "green"/"ansi" can return empty on some builds
  const color = ok
    ? (Bun.color('lime', 'ansi-16') as string) || '\x1b[32m'
    : (Bun.color('red', 'ansi-16') as string) || '\x1b[31m';
  const reset = '\x1b[0m';
  return `${color}${text}${reset}`;
}

function say(ok: boolean, msg: string): void {
  if (asJson) return;
  console.log(`${ok ? ansi(true, '✅') : ansi(false, '❌')} ${msg}`);
}

async function loadRootPkg(): Promise<Record<string, unknown>> {
  return (await Bun.file(joinPath(ROOT, 'package.json')).json()) as Record<string, unknown>;
}

/** Resolve workspace package.json paths from root package.json workspaces field. */
export async function listWorkspacePackageJsons(): Promise<string[]> {
  const pkg = await loadRootPkg();
  const ws = pkg.workspaces;
  const patterns: string[] = [];
  if (Array.isArray(ws)) {
    patterns.push(...ws.map(String));
  } else if (
    ws &&
    typeof ws === 'object' &&
    Array.isArray((ws as { packages?: string[] }).packages)
  ) {
    patterns.push(...(ws as { packages: string[] }).packages);
  }
  const out = new Set<string>();
  for (const pat of patterns) {
    // packages/* → packages/*/package.json; exact dir → dir/package.json
    const globPat = pat.endsWith('/*')
      ? `${pat.slice(0, -2)}/*/package.json`
      : pat.endsWith('*')
        ? `${pat.replace(/\*$/, '')}*/package.json`
        : `${pat.replace(/\/$/, '')}/package.json`;
    const g = new Bun.Glob(globPat);
    for await (const f of g.scan({ cwd: ROOT, onlyFiles: true })) {
      if (f.includes('node_modules/')) continue;
      out.add(f);
    }
  }
  return [...out].sort();
}

async function probeLockfile(): Promise<ProbeResult> {
  const proc = Bun.spawn(['bun', 'install', '--frozen-lockfile', '--dry-run'], {
    cwd: ROOT,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const ok = code === 0;
  say(ok, ok ? 'Lockfile is consistent (frozen dry-run)' : 'Lockfile / install dry-run failed');
  return {
    name: 'lockfile',
    ok,
    message: ok ? 'frozen-lockfile dry-run ok' : (stderr || stdout).trim().slice(0, 500),
  };
}

async function probeWorkspaces(): Promise<ProbeResult> {
  const paths = await listWorkspacePackageJsons();
  const rows: Array<{ path: string; name: string; version: string; snapshotScope: string }> = [];
  for (const p of paths) {
    try {
      const j = (await Bun.file(joinPath(ROOT, p)).json()) as {
        name?: string;
        version?: string;
        snapshotScope?: string;
      };
      rows.push({
        path: p.replace(/\/package\.json$/, ''),
        name: j.name || '—',
        version: j.version || '—',
        snapshotScope: j.snapshotScope || 'missing',
      });
    } catch {
      rows.push({ path: p, name: '?', version: '?', snapshotScope: 'error' });
    }
  }
  if (!asJson) {
    say(true, `${rows.length} workspace package.json files`);
    logTable(rows, ['path', 'name', 'version', 'snapshotScope'], { colors: true });
  }
  return { name: 'workspaces', ok: rows.length > 0, detail: rows };
}

async function probeDeps(): Promise<ProbeResult> {
  const paths = await listWorkspacePackageJsons();
  const root = await loadRootPkg();
  const all = new Set<string>();
  const add = (deps?: Record<string, string>) => {
    if (deps) for (const d of Object.keys(deps)) all.add(d);
  };
  add(root.dependencies as Record<string, string> | undefined);
  add(root.devDependencies as Record<string, string> | undefined);
  for (const p of paths) {
    try {
      const j = (await Bun.file(joinPath(ROOT, p)).json()) as {
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      add(j.dependencies);
      add(j.devDependencies);
    } catch {
      /* skip */
    }
  }
  const list = [...all].sort();
  if (!asJson) {
    say(true, `${list.length} unique dependency names across root + workspaces`);
    console.log(
      list.slice(0, 40).join('\n') + (list.length > 40 ? `\n… +${list.length - 40} more` : '')
    );
  }
  return { name: 'deps', ok: true, detail: { count: list.length, names: list } };
}

async function probeExports(): Promise<ProbeResult> {
  const paths = await listWorkspacePackageJsons();
  const withExports: string[] = [];
  for (const p of paths) {
    try {
      const j = (await Bun.file(joinPath(ROOT, p)).json()) as { exports?: unknown; name?: string };
      if (j.exports != null) withExports.push(j.name || p);
    } catch {
      /* skip */
    }
  }
  if (!asJson) {
    say(true, `${withExports.length} packages define "exports"`);
    for (const n of withExports) console.log(`  · ${n}`);
  }
  return { name: 'exports', ok: true, detail: withExports };
}

async function probeScope(): Promise<ProbeResult> {
  let fileScope = '';
  try {
    fileScope = (await Bun.file(joinPath(ROOT, '.snapshot-scope')).text()).trim();
  } catch {
    /* optional */
  }
  const scope =
    (Bun.env.PORTAL_SCOPE || '').trim() ||
    fileScope ||
    ROOT.split('/').filter(Boolean).pop() ||
    'default';
  const source = Bun.env.PORTAL_SCOPE ? 'PORTAL_SCOPE' : fileScope ? '.snapshot-scope' : 'cwd';
  if (!asJson) say(true, `SCOPE: ${scope} (from ${source})`);
  return { name: 'scope', ok: true, detail: { scope, source } };
}

function probeRuntime(): ProbeResult {
  const detail = {
    version: Bun.version,
    revision: Bun.revision,
    platform: process.platform,
    arch: process.arch,
    cwd: ROOT,
    enginesBun: undefined as string | undefined,
  };
  // engines from package.json filled async callers
  if (!asJson) {
    say(true, `Bun ${detail.version} · ${detail.platform}/${detail.arch}`);
    console.log(Bun.inspect(detail, { colors: process.stdout.isTTY === true, sorted: true }));
  }
  return { name: 'runtime', ok: true, detail };
}

function probeEnv(): ProbeResult {
  const picked = Object.fromEntries(
    Object.entries(Bun.env).filter(
      ([k]) =>
        k.startsWith('BUN_') ||
        k.startsWith('NPM_') ||
        k.startsWith('PORTAL_') ||
        k === 'NO_COLOR' ||
        k === 'FORCE_COLOR'
    )
  );
  if (!asJson) {
    say(true, `${Object.keys(picked).length} Bun/NPM/PORTAL env keys`);
    console.log(Bun.inspect(picked, { colors: process.stdout.isTTY === true, sorted: true }));
  }
  return { name: 'env', ok: true, detail: picked };
}

async function probeSemver(): Promise<ProbeResult> {
  const paths = await listWorkspacePackageJsons();
  const root = await loadRootPkg();
  const issues: string[] = [];
  const checkMap = async (where: string, deps?: Record<string, string>): Promise<void> => {
    if (!deps) return;
    for (const [dep, range] of Object.entries(deps)) {
      if (range.startsWith('workspace:') || range.startsWith('catalog:')) continue;
      if (range.startsWith('file:') || range.startsWith('link:')) continue;
      // Skip non-semver ranges for fetch-free local check
      let installed: string | undefined;
      try {
        const ip = (await Bun.file(joinPath(ROOT, 'node_modules', dep, 'package.json')).json()) as {
          version?: string;
        };
        installed = ip.version;
      } catch {
        // scoped packages
        try {
          const ip = (await Bun.file(
            joinPath(ROOT, 'node_modules', ...dep.split('/'), 'package.json')
          ).json()) as { version?: string };
          installed = ip.version;
        } catch {
          continue; // not hoisted / optional
        }
      }
      if (!installed) continue;
      try {
        if (!Bun.semver.satisfies(installed, range)) {
          issues.push(`${where}: ${dep}@${installed} does not satisfy ${range}`);
        }
      } catch {
        /* invalid range */
      }
    }
  };
  await checkMap('root', root.dependencies as Record<string, string> | undefined);
  await checkMap('root-dev', root.devDependencies as Record<string, string> | undefined);
  for (const p of paths) {
    try {
      const j = (await Bun.file(joinPath(ROOT, p)).json()) as {
        name?: string;
        dependencies?: Record<string, string>;
      };
      await checkMap(j.name || p, j.dependencies);
    } catch {
      /* skip */
    }
  }
  const ok = issues.length === 0;
  if (!asJson) {
    say(
      ok,
      ok
        ? 'Installed deps satisfy declared ranges (sampled node_modules)'
        : `${issues.length} semver issue(s)`
    );
    for (const i of issues.slice(0, 20)) console.log(`  · ${i}`);
  }
  return { name: 'semver', ok, detail: { issues } };
}

async function probePatches(): Promise<ProbeResult> {
  const pkg = await loadRootPkg();
  const patches = pkg.patchedDependencies ?? null;
  if (!asJson) {
    say(true, patches ? 'patchedDependencies present' : 'No patchedDependencies');
    if (patches) console.log(Bun.inspect(patches, { colors: true, depth: 2 }));
  }
  return { name: 'patches', ok: true, detail: patches };
}

async function probeSnapshotWrite(): Promise<ProbeResult> {
  let fileScope = '';
  try {
    fileScope = (await Bun.file(joinPath(ROOT, '.snapshot-scope')).text()).trim();
  } catch {
    /* */
  }
  const scope = (Bun.env.PORTAL_SCOPE || fileScope || 'default').trim() || 'default';
  const ts = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const dir = joinPath(ROOT, 'snapshots', ts);
  await Bun.write(joinPath(dir, '.keep'), '');
  const manifest = {
    scope,
    timestamp: new Date().toISOString(),
    bunVersion: Bun.version,
    platform: process.platform,
    kind: 'portal-probe-snapshot',
  };
  await Bun.write(joinPath(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
  if (!asJson) say(true, `Snapshot ${ts} for scope=${scope} → snapshots/${ts}/`);
  return { name: 'snapshot', ok: true, detail: { dir: `snapshots/${ts}`, ...manifest } };
}

async function probeSnapshotsList(): Promise<ProbeResult> {
  const g = new Bun.Glob('snapshots/*/manifest.json');
  const rows: Array<{ path: string; scope: string; timestamp: string; kind?: string }> = [];
  for await (const p of g.scan({ cwd: ROOT, onlyFiles: true })) {
    try {
      const j = (await Bun.file(joinPath(ROOT, p)).json()) as {
        scope?: string;
        timestamp?: string;
        kind?: string;
      };
      rows.push({
        path: p.split('/')[1] || p,
        scope: j.scope || '—',
        timestamp: j.timestamp || '—',
        kind: j.kind,
      });
    } catch {
      rows.push({ path: p, scope: '?', timestamp: '?' });
    }
  }
  rows.sort((a, b) => b.path.localeCompare(a.path));
  if (!asJson) {
    say(true, `${rows.length} snapshot(s)`);
    if (rows.length) {
      logTable(rows, ['path', 'scope', 'timestamp'], { colors: true });
    }
  }
  return { name: 'snapshots', ok: true, detail: rows };
}

function printHelp(): void {
  console.log(`Usage: bun tools/portal-probe.ts [command] [--json]

Commands:
  all          Run all probes (default)
  lockfile     bun install --frozen-lockfile --dry-run
  workspaces   workspace package versions + snapshotScope
  deps         unique dependency names across workspaces
  exports      packages with package.json "exports"
  scope        PORTAL_SCOPE | .snapshot-scope | cwd
  runtime      Bun.version · platform · arch
  env          BUN_* / NPM_* / PORTAL_* env
  semver       local node_modules vs declared ranges
  patches      patchedDependencies
  snapshot     write minimal snapshots/<ts>/manifest.json
  snapshots    list snapshot manifests (Bun.Glob + inspect.table)

  --json       machine-readable array/object
  --help       this message

Examples:
  bun run portal:probe
  bun tools/portal-probe.ts lockfile
  bun tools/portal-probe.ts --json | head
`);
}

async function runOne(name: string): Promise<ProbeResult> {
  switch (name) {
    case 'lockfile':
      return probeLockfile();
    case 'workspaces':
      return probeWorkspaces();
    case 'deps':
      return probeDeps();
    case 'exports':
      return probeExports();
    case 'scope':
      return probeScope();
    case 'runtime': {
      const r = probeRuntime();
      const pkg = await loadRootPkg();
      const engines = pkg.engines as { bun?: string } | undefined;
      (r.detail as { enginesBun?: string }).enginesBun = engines?.bun;
      if (engines?.bun && !asJson) {
        const ok = Bun.semver.satisfies(Bun.version, engines.bun);
        say(ok, `engines.bun ${engines.bun} · runtime ${Bun.version}`);
        r.ok = ok;
      }
      return r;
    }
    case 'env':
      return probeEnv();
    case 'semver':
      return probeSemver();
    case 'patches':
      return probePatches();
    case 'snapshot':
      return probeSnapshotWrite();
    case 'snapshots':
      return probeSnapshotsList();
    default:
      return { name, ok: false, message: `unknown command: ${name}` };
  }
}

const ALL = [
  'runtime',
  'scope',
  'lockfile',
  'workspaces',
  'exports',
  'deps',
  'patches',
  'semver',
  'env',
  'snapshots',
] as const;

/** CLI entry — not run when imported by tests. */
async function main(): Promise<void> {
  if (help) {
    printHelp();
    process.exit(0);
  }

  const results: ProbeResult[] = [];
  if (cmd === 'all') {
    for (const c of ALL) {
      if (!asJson) console.log(`\n── ${c} ──`);
      results.push(await runOne(c));
    }
  } else {
    results.push(await runOne(cmd));
  }

  // In "all" mode, lockfile drift is a warning (common on dirty trees); other probes hard-fail.
  // Isolated `portal-probe lockfile` still exits 1 on inconsistency.
  function isHardFailure(r: ProbeResult): boolean {
    if (r.ok) return false;
    if (cmd === 'all' && r.name === 'lockfile') return false;
    return true;
  }

  if (asJson) {
    jsonOut(cmd === 'all' ? results : results[0]);
  } else if (cmd === 'all') {
    const hard = results.filter(isHardFailure);
    const soft = results.filter(r => !r.ok && !isHardFailure(r));
    console.log('');
    if (soft.length) {
      say(
        true,
        `portal-probe: ${results.filter(r => r.ok).length}/${results.length} ok · ${soft.length} soft warn (lockfile)`
      );
    } else {
      say(hard.length === 0, `portal-probe: ${results.length - hard.length}/${results.length} ok`);
    }
  }

  process.exit(results.some(isHardFailure) ? 1 : 0);
}

if (import.meta.main) {
  await main();
}
