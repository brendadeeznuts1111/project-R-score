#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/pm/cli/pm — bun pm (pack · ls · version · pkg · trust · cache · hash)
/**
 * FactoryWager portal CLI — snapshot, probe, secret, vault health, bun pm.
 *
 *   portal-cli snapshot run [--scope prediction] [--dry-run] [--debug]
 *   portal-cli snapshot list [--scope portal]
 *   portal-cli vault health [--update]
 *   portal-cli pm ls | pack | version | pkg …
 *   portal-cli secret autofill --vault factorywager -- <cmd>
 *
 *   bun tools/portal-cli.ts snapshot run
 *   bun run portal-cli pm ls
 */
import {
  cliError,
  ensureSnapshotDir,
  grepSnapshots,
  listSnapshots,
  parseSnapshotFlags,
  resolveScope,
  runSnapshot,
  showLastSnapshot,
  showScopeConfig,
} from './snapshot-core.ts';
import { isSnapshotScope } from './snapshot-scopes.ts';

const SNAPSHOT_HELP = `Usage: portal-cli snapshot <subcommand> [options]

Subcommands:
  run       Capture a point-in-time snapshot
  list      List snapshots (table)
  grep      Search metadata; prints matching manifest paths
  last      Show most recent manifest JSON
  config    Show scope configurations

Options (all subcommands):
  --scope <name>    prediction | portal | gaps | limits (default: PORTAL_SCOPE or prediction)
  --base <url>      Fetch origin (run only; default SNAPSHOT_BASE_URL or localhost:3000)
  --dry-run         Plan capture without writing (run only)
  --debug           Bun.inspect dump of manifest / list / last

Environment:
  PORTAL_SCOPE          Default scope when --scope omitted
  PORTAL_SNAPSHOT_DIR   Snapshot root (default: snapshots)
  SNAPSHOT_BASE_URL     Fetch origin for run

Examples:
  portal-cli snapshot run --scope prediction
  portal-cli snapshot list --scope portal
  portal-cli snapshot grep "bias>2" --scope prediction
  portal-cli snapshot config
`;

const VAULT_HELP = `Usage: portal-cli vault <subcommand> [options]

Subcommands:
  health              Run vault-health snapshot gate (offline-safe)
  health --update     Intentional drift: refresh tests/__snapshots__/vault-health.test.ts.snap

Gate (CI / Harness Gates):
  bun test tests/vault-health.test.ts
  # same as: portal-cli vault health

Live Proton Pass × map bake (needs agent session — not CI):
  bun run vault:health:bake          # → public/registry/vault-health.json + /portal/vault/

Dashboard vs gate:
  /portal/vault/ is the visual summary of the last bake.
  vault health (this command) is the mechanical heartbeat: report-shape +
  env→vault inventory SSOT in git. Rotate/move a mapped secret? --update, commit.

Examples:
  portal-cli vault health
  portal-cli vault health --update
`;

// Short help for bare `portal-cli pm` — not the full `bun pm` dump.
// Canonical docs: https://bun.com/docs/pm/cli/pm
const PM_HELP = `Usage: portal-cli pm <subcommand> [args…]

Most subcommands passthrough to \`bun pm\` (no invented flags).
Docs: https://bun.com/docs/pm/cli/pm

bun pm subcommands:
  pack              Create a tarball of the package
  ls                List installed packages (workspace-aware)
  version           Bump package version
  pkg               Get/set/delete/fix package.json fields
  trust             Trust lifecycle scripts for packages
  untrusted         List packages with untrusted lifecycle scripts
  cache             Inspect or clear the package cache
  hash              Print the lockfile hash
  whoami            Print the logged-in npm registry user
  bin               Print the path to the bin directory
  migrate           Migrate another package manager's lockfile

FactoryWager extensions (not bun pm — read offline bake):
  graph             Print packages-graph-map.json as a table
                    Source: public/registry/packages-graph-map.json
                    Rebake: bun run audit:packages -- --bake

Examples:
  portal-cli pm ls
  portal-cli pm pack --dry-run
  portal-cli pm pkg get name
  portal-cli pm version --no-git-tag-version
  portal-cli pm graph
`;

const ROOT_HELP = `FactoryWager portal CLI

  portal-cli snapshot <subcommand>   Scope-aware report snapshots
  portal-cli probe [command]         Bun-native monorepo/portal probes
  portal-cli vault health [--update] Vault-map inventory + report-shape gate
  portal-cli secret <subcommand>     Proton Pass CLI (pass-cli) wrapper
  portal-cli pm <args…>              bun pm passthrough + FW graph helper
  portal-cli dashboard [--view=name] [--open]  Print/open portal board (default: tools)
  portal-cli help                    This message

  bun run portal-cli snapshot run --scope prediction
  bun run portal-cli probe lockfile
  bun run portal-cli vault health
  bun run portal-cli secret which
  bun run portal-cli pm ls
  bun run portal-cli pm pack --dry-run
  bun run portal-cli pm graph
  bun run portal-cli dashboard --view=packages --open
  bun run portal:probe

Dashboard boards (chrome overflow + weave SSOT):
  /portal/tools/           CLI hub (this map)
  /portal/vault/           vault health bake · gate: vault health
  /portal/env/             vault-map · secret map
  /portal/packages/        packages graph · pm graph
  /portal/failures/        test failures bake
  /portal/health/          system health
  /portal/ops/             ops-summary rollup
  /registry/prediction/report/  prediction report

Vault health (offline SSOT; live bake separate):
  vault health                 # bun test tests/vault-health.test.ts
  vault health --update        # bun test … --update-snapshots (commit the snap)
  bun run vault:health:bake    # live pass-cli → /portal/vault/ board

pm (canonical: https://bun.com/docs/pm/cli/pm) — zero invention, only bun pm flags:
  pm ls | ls --all | ls --trusted
  pm pack [--destination dir] [--quiet] [--dry-run]
  pm version [patch|minor|major|…]
  pm pkg get|set|delete|fix …
  pm hash | hash-string | hash-print
  pm cache | cache rm
  pm trust <names> | untrusted | default-trusted
  pm whoami | migrate | bin [-g]
  pm graph                     # FW: offline packages-graph-map table

Secret (real pass-cli only — https://protonpass.github.io/pass-cli/):
  secret which | login | info | vaults | items <vault>
  secret get 'pass://vault/item/password'   # → pass-cli item view
  secret run --env-file env.template -- <cmd>
  secret autofill --vault factorywager -- <cmd>
  secret inject -i env.template -o .env -f
  secret map                   # vault-map bundle (no secret values)
  secret share list | share item <vault/title> <email> [--role …]
  secret move <vault/title> --to <vault>  ·  secret [un]trash <vault/title>
  secret invite accept <INVITE_ID>          # not URL secure-link accept
  source scripts/agent-env.sh factorywager  # agent session before secret cmds
`;

function usage(): never {
  console.log(ROOT_HELP);
  process.exit(0);
}

/** Offline packages-graph-map bake — not bun pm. @see public/registry/packages-graph-map.json */
async function printPackagesGraphTable(): Promise<void> {
  const { joinPath } = await import('../lib/path-bun.ts');
  const { logTable } = await import('../lib/console-depth.ts');
  const root = joinPath(import.meta.dir, '..');
  const mapPath = joinPath(root, 'public/registry/packages-graph-map.json');
  const file = Bun.file(mapPath);
  if (!(await file.exists())) {
    cliError(
      `Missing packages graph bake: ${mapPath}\n` +
        `Rebake offline: bun run audit:packages -- --bake`
    );
  }
  const data = (await file.json()) as {
    schemaVersion?: number;
    generatedAt?: string;
    score?: number;
    grade?: string;
    bunVersion?: string;
    packages?: Array<{
      name: string;
      role?: string;
      score?: number;
      grade?: string;
      scanned?: number;
      orphans?: number;
      bytes?: number;
    }>;
    map?: { summary?: Record<string, number | string> };
    totals?: Record<string, number>;
    surfaces?: {
      summary?: Record<string, number>;
      workspaces?: Array<{
        path: string;
        name: string;
        plane: string;
        inPackagesGraph: boolean;
      }>;
      packagesGraphDirs?: string[];
      portal?: {
        pages?: Array<{ href: string; slug: string }>;
        chromeComponents?: Array<{
          id: string; // brand-ok — chrome component key, not domain *Id
          path: string;
          kind: string;
        }>;
        modules?: Array<{
          id: string; // brand-ok — portal module key, not domain *Id
          path: string;
          kind: string;
        }>;
        theme?: { jsonc?: boolean; tokensCss?: boolean; styleCss?: boolean };
      };
      brand?: { tenants?: string[]; assets?: Array<{ path: string; kind: string }> };
      registry?: {
        topLevel?: Array<{ file: string; kind: string | null; schemaVersion: number | null }>;
        storagePackageNames?: string[];
        scopedLatest?: string[];
      };
      planes?: Array<{
        id: string; // brand-ok — monorepo surface plane key, not domain *Id
        label: string;
        count: number;
        note: string;
        bake?: string;
      }>;
    };
  };
  const schema = data.schemaVersion ?? 12;
  const rows = (data.packages ?? []).map(p => ({
    package: p.name,
    role: p.role ?? '—',
    score: p.score ?? '—',
    grade: p.grade ?? '—',
    files: p.scanned ?? '—',
    orphans: p.orphans ?? '—',
    kB: p.bytes != null ? Math.round(p.bytes / 1024) : '—',
  }));
  console.log(
    `packages-graph-map  schema=v${schema}  generated=${data.generatedAt ?? '?'}  bun=${data.bunVersion ?? '?'}  score=${data.score ?? '?'}  grade=${data.grade ?? '?'}`
  );
  if (data.map?.summary) {
    const s = data.map.summary;
    console.log(
      `summary  packages=${s.packageCount}  consumed=${s.consumed}  dormant=${s.dormant}  rootTooling=${s.rootTooling}  openActions=${s.openActions}`
    );
  }

  // Multi-surface plane table (v13+) — why registry/portal show more than packages/*
  const surfaces = data.surfaces;
  if (surfaces?.planes?.length) {
    console.log('\n── monorepo surfaces (not only packages/*) ──');
    logTable(
      surfaces.planes.map(p => ({
        plane: p.id,
        label: p.label,
        count: p.count,
        note: p.note.length > 56 ? p.note.slice(0, 53) + '…' : p.note,
      })),
      ['plane', 'label', 'count', 'note']
    );
  } else if (schema < 13) {
    console.log(
      '\n(no surfaces block — rebake with bun run audit:packages -- --bake for v13 multi-surface inventory)'
    );
  }

  if (surfaces?.workspaces?.length) {
    console.log('\n── workspace members (bun workspaces) ──');
    logTable(
      surfaces.workspaces.map(w => ({
        path: w.path,
        name: w.name,
        plane: w.plane,
        inGraph: w.inPackagesGraph ? 'yes' : 'no',
      })),
      ['path', 'name', 'plane', 'inGraph']
    );
  }

  console.log('\n── packages/* import graph (audit plane) ──');
  if (rows.length === 0) {
    console.log('(no packages in bake)');
  } else {
    logTable(rows, ['package', 'role', 'score', 'grade', 'files', 'orphans', 'kB']);
  }

  if (surfaces?.portal) {
    const pages = surfaces.portal.pages ?? [];
    const chrome = surfaces.portal.chromeComponents ?? [];
    const theme = surfaces.portal.theme;
    console.log('\n── portal chrome / pages / brand ──');
    console.log(
      'pages=' +
        pages.length +
        '  chromeComponents=' +
        chrome.length +
        '  modules=' +
        (surfaces.portal.modules?.length ?? 0) +
        '  theme(jsonc=' +
        (theme?.jsonc ? 'y' : 'n') +
        ',tokens=' +
        (theme?.tokensCss ? 'y' : 'n') +
        ',style=' +
        (theme?.styleCss ? 'y' : 'n') +
        ')'
    );
    if (chrome.length) {
      logTable(
        chrome.map(c => ({ id: c.id, kind: c.kind, path: c.path })),
        ['id', 'kind', 'path']
      );
    }
    if (pages.length) {
      console.log('pages: ' + pages.map(p => p.slug || 'home').join(', '));
    }
    if (surfaces.brand?.tenants?.length) {
      console.log(
        'brand tenants: ' +
          surfaces.brand.tenants.join(', ') +
          '  assets=' +
          (surfaces.brand.assets?.length ?? 0)
      );
    }
  }

  if (surfaces?.registry) {
    const top = surfaces.registry.topLevel ?? [];
    const storage = surfaces.registry.storagePackageNames ?? [];
    const scoped = surfaces.registry.scopedLatest ?? [];
    const reg = surfaces.registry as {
      byFamily?: Array<{ family: string; count: number }>;
      portalRefs?: Array<{ path: string; from: string[]; exists: boolean }>;
      orphanFromPortal?: string[];
    };
    console.log('\n── registry bake plane ──');
    console.log(
      'topLevelJson=' +
        top.length +
        '  storagePackages=' +
        storage.length +
        '  scopedLatest=' +
        scoped.length +
        '  portalRefs=' +
        (reg.portalRefs?.length ?? 0) +
        '  orphanFromPortal=' +
        (reg.orphanFromPortal?.length ?? 0)
    );
    if (reg.byFamily?.length) {
      logTable(
        reg.byFamily.map(r => ({ family: r.family, count: r.count })),
        ['family', 'count']
      );
    } else {
      const byKind = new Map<string, number>();
      for (const a of top) {
        const k = a.kind ?? '(no-kind)';
        byKind.set(k, (byKind.get(k) ?? 0) + 1);
      }
      const kindRows = [...byKind.entries()]
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([kind, n]) => ({ kind, count: n }));
      if (kindRows.length) logTable(kindRows.slice(0, 20), ['kind', 'count']);
    }
    if (reg.portalRefs?.length) {
      const topRefs = [...reg.portalRefs].sort((a, b) => b.from.length - a.from.length).slice(0, 8);
      console.log('top portal->registry refs:');
      for (const r of topRefs) {
        console.log('  · ' + r.path + '  x' + r.from.length + (r.exists ? '' : '  MISSING'));
      }
    }
    if (reg.orphanFromPortal?.length) {
      const show = reg.orphanFromPortal.slice(0, 12);
      console.log(
        'orphan top-level (not referenced from portal): ' +
          show.join(', ') +
          (reg.orphanFromPortal.length > 12 ? ' ... +' + (reg.orphanFromPortal.length - 12) : '')
      );
    }
    if (storage.length) console.log('storage: ' + storage.join(', '));
  }

  const deep = surfaces as
    | {
        libPlane?: {
          dirs?: Array<{ name: string; hasPackageJson: boolean; tsFiles: number }>;
          workspaceShared?: boolean;
        };
        sto?: { nested?: Array<{ path: string; name: string }> };
      }
    | undefined;
  if (deep?.libPlane?.dirs?.length) {
    console.log('\n── lib/ plane (interior modules) ──');
    console.log(
      'dirs=' +
        deep.libPlane.dirs.length +
        '  workspaceShared=' +
        (deep.libPlane.workspaceShared ? 'yes' : 'no')
    );
    const heavy = [...deep.libPlane.dirs].sort((a, b) => b.tsFiles - a.tsFiles).slice(0, 10);
    logTable(
      heavy.map(d => ({
        dir: d.name,
        ts: d.tsFiles,
        pkg: d.hasPackageJson ? 'yes' : 'no',
      })),
      ['dir', 'ts', 'pkg']
    );
  }
  if (deep?.sto?.nested?.length) {
    console.log('\n── sports-terminal-os nested packages ──');
    logTable(
      deep.sto.nested.map(n => ({ path: n.path, name: n.name })),
      ['path', 'name']
    );
  }

  const themeDeep = surfaces?.portal?.theme as
    | {
        darkTokenCount?: number;
        lightTokenCount?: number;
        fontKeys?: string[];
        version?: string;
        colorSchemeDefault?: string;
      }
    | undefined;
  if (themeDeep && (themeDeep.darkTokenCount || themeDeep.fontKeys?.length)) {
    console.log('\n── brand theme tokens ──');
    console.log(
      'version=' +
        (themeDeep.version ?? '?') +
        '  scheme=' +
        (themeDeep.colorSchemeDefault ?? '?') +
        '  dark=' +
        (themeDeep.darkTokenCount ?? 0) +
        '  light=' +
        (themeDeep.lightTokenCount ?? 0) +
        '  fonts=' +
        (themeDeep.fontKeys?.join(',') ?? '-')
    );
  }

  console.log('\nRebake: bun run audit:packages -- --bake');
  console.log('Board:  /portal/packages/  ·  chrome: /registry/portal-chrome.json');
}

async function dispatchSnapshot(sub: string | undefined, rest: string[]): Promise<void> {
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(SNAPSHOT_HELP);
    return;
  }

  const { scope: scopeArg, baseUrl, dryRun, debug, positional } = parseSnapshotFlags(rest);
  const scope = await resolveScope(scopeArg);
  // Only filter by scope when the user explicitly passed --scope; otherwise
  // list/grep/last would silently hide non-default scopes (default: prediction).
  const filterScope = scopeArg ? scope : undefined;

  switch (sub) {
    case 'run': {
      await ensureSnapshotDir();
      await runSnapshot({ scope, baseUrl, dryRun, debug });
      break;
    }
    case 'list': {
      const grepIdx = rest.indexOf('--grep');
      const grep = grepIdx >= 0 ? rest[grepIdx + 1] : undefined;
      await listSnapshots({ scope: filterScope, grep, debug });
      break;
    }
    case 'grep': {
      const queryParts = positional.filter(p => p !== 'grep');
      const query = queryParts.join(' ').trim();
      if (!query) cliError('grep requires a query (e.g. bias>2 or scope=prediction)');
      await grepSnapshots(query, { scope: filterScope, debug });
      break;
    }
    case 'last': {
      await showLastSnapshot({ scope: filterScope, debug });
      break;
    }
    case 'config': {
      if (scopeArg && isSnapshotScope(scopeArg)) {
        showScopeConfig(scopeArg);
      } else {
        showScopeConfig();
      }
      break;
    }
    default:
      cliError(`Unknown snapshot subcommand: ${sub}\n\n${SNAPSHOT_HELP}`);
  }
}

async function dispatchVault(sub: string | undefined, rest: string[]): Promise<void> {
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(VAULT_HELP);
    return;
  }

  if (sub !== 'health') {
    cliError(`Unknown vault subcommand: ${sub}\n\n${VAULT_HELP}`);
  }

  const update = rest.includes('--update') || rest.includes('-u');
  // Mechanical gate: report-shape + vault-map inventory snapshots (no pass-cli).
  // @see https://bun.com/docs/test/snapshots
  const args = ['test', 'tests/vault-health.test.ts'];
  if (update) args.push('--update-snapshots');

  const proc = Bun.spawn(['bun', ...args], {
    cwd: process.cwd(),
    stdout: 'inherit',
    stderr: 'inherit',
    stdin: 'inherit',
  });
  const code = (await proc.exited) ?? 1;
  if (update && code === 0) {
    console.log(
      'vault health: snapshots updated — commit tests/__snapshots__/vault-health.test.ts.snap'
    );
  }
  process.exit(code);
}

async function main(): Promise<void> {
  const argv = Bun.argv.slice(2);
  const cmd = argv[0];

  if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
    usage();
  }

  if (cmd === 'snapshot') {
    await dispatchSnapshot(argv[1], argv.slice(2));
    return;
  }

  if (cmd === 'probe') {
    // Re-dispatch to portal-probe with remaining args (lockfile | --json | all…)
    const proc = Bun.spawn(['bun', 'tools/portal-probe.ts', ...argv.slice(1)], {
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    process.exit((await proc.exited) ?? 1);
  }

  if (cmd === 'vault') {
    await dispatchVault(argv[1], argv.slice(2));
    return;
  }

  if (cmd === 'secret') {
    const { dispatchSecret } = await import('./portal-secret.ts');
    await dispatchSecret(argv[1], argv.slice(2));
    return;
  }

  if (cmd === 'pm') {
    const pmArgs = argv.slice(1);
    // Bare `pm` → short help (exit 0), not full `bun pm` dump.
    if (
      pmArgs.length === 0 ||
      pmArgs[0] === 'help' ||
      pmArgs[0] === '--help' ||
      pmArgs[0] === '-h'
    ) {
      console.log(PM_HELP);
      process.exit(0);
    }
    // FactoryWager extension: offline packages graph bake (not a bun pm subcommand).
    if (pmArgs[0] === 'graph') {
      await printPackagesGraphTable();
      return;
    }
    // Full bun pm surface — https://bun.com/docs/pm/cli/pm
    // Inherit stdio; no invented flags (only what bun pm accepts).
    const proc = Bun.spawn(['bun', 'pm', ...pmArgs], {
      cwd: process.cwd(),
      stdout: 'inherit',
      stderr: 'inherit',
      stdin: 'inherit',
    });
    process.exit((await proc.exited) ?? 1);
  }

  if (cmd === 'dashboard') {
    // Print (and optionally open) a portal board URL — boards are static Pages paths.
    // --view=packages|vault|tools|… maps known boards (no phantom routes).
    const VIEW_PATHS: Record<string, string> = {
      tools: '/portal/tools/',
      packages: '/portal/packages/',
      vault: '/portal/vault/',
      env: '/portal/env/',
      failures: '/portal/failures/',
      health: '/portal/health/',
      ops: '/portal/ops/',
      compliance: '/portal/compliance/',
      limits: '/portal/limits/',
      toc: '/portal/toc/',
      skills: '/portal/skills/',
      catalog: '/portal/catalog/',
      dashboard: '/portal/dashboard/',
      dod: '/portal/dod/',
      monitoring: '/monitoring/',
      prediction: '/registry/prediction/report/',
      capabilities: '/portal/tools/#capabilities',
    };
    const base =
      Bun.env.PORTAL_BASE_URL?.replace(/\/$/, '') ||
      Bun.env.SNAPSHOT_BASE_URL?.replace(/\/$/, '') ||
      'https://score.factory-wager.com';
    if (argv.includes('--help') || argv.includes('-h')) {
      console.log(`Usage: portal-cli dashboard [path|/portal/…] [--view=name] [--open]

Views: ${Object.keys(VIEW_PATHS).sort().join(', ')}

Examples:
  portal-cli dashboard
  portal-cli dashboard --view=packages --open
  portal-cli dashboard /portal/vault/
  PORTAL_BASE_URL=http://127.0.0.1:8787 portal-cli dashboard --view=tools --open
`);
      return;
    }
    const viewFlag = argv.find(a => a.startsWith('--view='));
    const viewIdx = argv.indexOf('--view');
    const view =
      viewFlag?.slice('--view='.length) ||
      (viewIdx >= 0 && argv[viewIdx + 1] && !argv[viewIdx + 1]!.startsWith('-')
        ? argv[viewIdx + 1]
        : undefined);
    if (view && !VIEW_PATHS[view]) {
      cliError(
        `Unknown dashboard view "${view}". Known: ${Object.keys(VIEW_PATHS).sort().join(', ')}`
      );
    }
    let pathArg =
      view && VIEW_PATHS[view]
        ? VIEW_PATHS[view]!
        : argv[1] && !argv[1].startsWith('-')
          ? argv[1]
          : '/portal/tools/';
    const hashIdx = pathArg.indexOf('#');
    const hash = hashIdx >= 0 ? pathArg.slice(hashIdx) : '';
    const pathOnly = hashIdx >= 0 ? pathArg.slice(0, hashIdx) : pathArg;
    const path = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
    const withSlash = path.endsWith('/') || path.includes('.') || hash ? path : `${path}/`;
    const url = `${base}${withSlash}${hash}`;
    const open = argv.includes('--open') || argv.includes('-o');
    console.log(url);
    console.log(
      'Local serve: bun run serve:public:hot  →  http://127.0.0.1:8787' + withSlash + hash
    );
    if (open) {
      const opener =
        process.platform === 'darwin'
          ? 'open'
          : process.platform === 'win32'
            ? 'start'
            : 'xdg-open';
      Bun.spawn([opener, url], { stdout: 'ignore', stderr: 'ignore', stdin: 'ignore' });
    }
    return;
  }

  cliError(`Unknown command: ${cmd}\n\n${ROOT_HELP}`);
}

if (import.meta.main) main();
