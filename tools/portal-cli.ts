#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/color#flexible-input — Bun.color (cli-chrome / shouldColor)
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth (doctor pretty)
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/bundler/executables — --force
// @see https://bun.com/docs/runtime/cron#bun-cron-schedule-handler-in-process — Bun.cron
// @see https://bun.com/docs/runtime/environment-variables#manually-specifying-env-files — --env-file
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/index#general-execution-options — Bun runtime CLI flags
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/pm/cli/pm — bun pm (pack · ls · version · pkg · trust · cache · hash · scan)
// @see https://bun.com/docs/pm/security-scanner-api — Security Scanner API
// @see https://bun.com/docs/runtime#general-execution-options — --smol · --console-depth · --bun · --watch
/**
 * FactoryWager portal CLI — snapshot, probe, secret, vault health, bun pm, scanner.
 *
 * Bun execution flags (before the command) are forwarded to child `bun` spawns:
 *   bun tools/portal-cli.ts --smol vault health
 *   bun tools/portal-cli.ts --console-depth=4 probe lockfile
 *
 *   portal-cli snapshot run [--scope prediction] [--dry-run] [--debug]
 *   portal-cli snapshot list [--scope portal]
 *   portal-cli vault health [--update]
 *   portal-cli pm ls | pack | version | pkg … | scan
 *   portal-cli scanner status | scan | configure | install | init
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
  pruneSnapshots,
  parseSnapshotFlags,
  resolveScope,
  runSnapshot,
  showLastSnapshot,
  showScopeConfig,
} from './snapshot-core.ts';
import { isSnapshotScope } from './snapshot-scopes.ts';
import {
  availablePackageGraphScopes,
  colorizeByHealth,
  formatPackageGraphCsv,
  formatPackageGraphJson,
  packageGradeBreakdown,
  packageRoleBreakdown,
  parsePackageGraphFlags,
  selectPackageGraphRows,
  updatePackageGraphBake,
  type PackageGraphFlags,
} from './lib/portal-package-scope.ts';
import {
  BUN_FLAGS_HELP,
  assessRuntimeFlagsCatalog,
  formatRuntimeFlagsTable,
  loadRuntimeFlagsCatalog,
  parseBunExecutionFlags,
  spawnBunWithFlags,
  type RuntimeFlagsJsonReport,
} from './lib/portal-cli-bun-flags.ts';
import { dispatchScanner } from './lib/portal-cli-scanner.ts';
import { jsonOut } from '../lib/console-depth.ts';

/** Bun runtime flags harvested from argv (before portal-cli command). */
let bunExecFlags: string[] = [];

const SNAPSHOT_HELP = `Usage: portal-cli snapshot <subcommand> [options]

Subcommands:
  run       Capture a point-in-time snapshot
  list      List snapshots (table)
  grep      Search metadata; prints matching manifest paths
  last      Show most recent manifest JSON
  config    Show scope configurations
  prune     Keep newest N per scope in local store (gitignored snapshots/)
  cron      Bun.cron tenant tool passthrough (register|remove|preview)

Options (all subcommands):
  --scope <name>    prediction | portal | gaps | limits (default: PORTAL_SCOPE or prediction)
  --base <url>      Fetch origin (run only; default SNAPSHOT_BASE_URL or localhost:3000)
  --dry-run         Plan capture without writing (run / prune)
  --keep <n>        prune only — retain newest N per scope (default 5)
  --debug           Bun.inspect dump of manifest / list / last

Environment:
  PORTAL_SCOPE          Default scope when --scope omitted
  PORTAL_SNAPSHOT_DIR   Snapshot root (default: snapshots) — local only, not R2
  SNAPSHOT_BASE_URL     Fetch origin for run

Note:
  bun:test reviewed snaps live in tests/__snapshots__/ (git SSOT).
  Gate: bun run check:snapshots · update: bun run test:snapshots:update

Examples:
  portal-cli snapshot run --scope prediction
  portal-cli snapshot list --scope portal
  portal-cli snapshot prune --keep=5
  portal-cli snapshot prune --keep=3 --scope prediction --dry-run
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
const CAPABILITIES_HELP = `Usage: portal-cli capabilities <subcommand> [options]

Subcommands:
  health              Bake fingerprint + capability-map snapshot gate (offline)
  health --update     Intentional drift: refresh tests/__snapshots__/capability-map-subset.test.ts.snap
  doctor [--json] [--bun-only]  Machine readiness vs minBun / minPassCli ( --bun-only skips pass-cli )
  docs                Print registry paths + AGENTS SSOT + update recipes

Gate (CI):
  bun test tests/capability-map-subset.test.ts
  bun run bake:capabilities:check
  bun run check:snapshots
  bun run capabilities:doctor

Registry artifacts:
  /registry/capability-map-subset.json   tools hub rows (schema v3)
  /registry/capability-map-full.json     full matrix + examples

Examples:
  portal-cli capabilities health
  portal-cli capabilities health --update
  portal-cli capabilities doctor
  portal-cli capabilities doctor --json
  bun run bake:capabilities && bun run bake:capabilities:update
`;

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
    --scope <scope> Filter packages/* rows only (surface sections stay global)
                    Accepts @factorywager, factorywager, unscoped, or all
    --view <view>   Filter packages/* by role or grade:
                    dormant | consumed | root-tooling | scripted |
                    healthy | needs-improvement | critical | all
    --export <fmt>  table (default) | json | csv  (shorthand: --json)
    --color / --no-color   Force ANSI score tones (default: auto TTY)
    --update         Refresh the complete package audit + graph before reading
                    Writes reports/audit-report.json + packages-graph-map.json
                    Source: public/registry/packages-graph-map.json
                    Rebake: bun run audit:packages -- --bake

Examples:
  portal-cli pm ls
  portal-cli pm pack --dry-run
  portal-cli pm pkg get name
  portal-cli pm version --no-git-tag-version
  portal-cli pm graph
  portal-cli pm graph --scope @factorywager
  portal-cli pm graph --view=dormant
  portal-cli pm graph --view=healthy --export=json
  portal-cli pm graph --scope unscoped --update  # refreshes tracked bake outputs
  portal-cli pm scan                             # security scan (needs [install.security] scanner)
`;

const ROOT_HELP = `FactoryWager portal CLI

  portal-cli snapshot <subcommand>   Scope-aware report snapshots
  portal-cli probe [command]         Bun-native monorepo/portal probes
  portal-cli vault health [--update] Vault-map inventory + report-shape gate
  portal-cli capabilities health [--update] Capability-map subset snapshot gate
  portal-cli secret <subcommand>     Proton Pass CLI (pass-cli) wrapper
  portal-cli pm <args…>              bun pm passthrough + FW graph helper
  portal-cli scanner <subcommand>    Bun Security Scanner (policy · estimate · scan --oneshot)
  portal-cli doctor [--verbose] [--full]  Unified health gate (linker configVersion + bakes + catalog)
  portal-cli flags [--all] [--verbose] [--json]  Curated Bun runtime flags table (SSOT catalog)
  portal-cli badge [--json]          Offline nav-badge preview (from baked registry JSON)
  portal-cli bunfig status|check     Bunfig install config provenance + policy gate
  portal-cli dashboard [--view=name] [--open]  Print/open portal board (default: tools)
  portal-cli help                    This message

  bun run portal-cli snapshot run --scope prediction
  bun run portal-cli probe lockfile
  bun run portal-cli vault health
  bun run portal-cli capabilities health
  bun run portal-cli doctor
  bun run portal-cli flags
  bun run portal-cli secret which
  bun run portal-cli pm ls
  bun run portal-cli pm pack --dry-run
  bun run portal-cli pm graph
  bun run portal-cli scanner status
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

Capabilities (offline SSOT; bun:test snaps under tests/__snapshots__/):
  capabilities health          # bake:check + capability-map-subset tests
  capabilities health --update # intentional snap refresh (commit .snap)
  bun run check:snapshots      # catalog SSOT · orphan snap prune gate
  bun run test:snapshots:update -- --id capability-map

pm (canonical: https://bun.com/docs/pm/cli/pm) — zero invention, only bun pm flags:
  pm ls | ls --all | ls --trusted
  pm pack [--destination dir] [--quiet] [--dry-run]
  pm version [patch|minor|major|…]
  pm pkg get|set|delete|fix …
  pm hash | hash-string | hash-print
  pm cache | cache rm
  pm trust <names> | untrusted | default-trusted
  pm whoami | migrate | bin [-g]
  pm scan                      # lockfile security scan (needs scanner in bunfig)
  pm graph [--scope <scope>] [--update]
                               # FW: offline packages-graph-map table

Scanner (real: https://bun.com/docs/pm/security-scanner-api) — quota-safe defaults:
  scanner policy               # Bun install SSOT + Socket free-quota notes
  scanner estimate             # lockfile package count (no API)
  scanner status [--json]      # bunfig + vault wiring + package presence
  scanner doctor [--strict]    # readiness checklist
  scanner vault                # SOCKET_API_KEY Pass create recipe
  scanner scan [--oneshot] [--force]  # cooldown 24h; oneshot = temp bunfig
  scanner configure <pkg> [--write]   # install-time ON (costs quota each install)
  scanner clear --write        # install-time OFF (recommended day-to-day)
  scanner install <pkg>        # bun add -d (frozenLockfile may block)
  scanner init [dir]           # clone oven-sh/security-scanner-template

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

${BUN_FLAGS_HELP}
`;

function usage(): never {
  console.log(ROOT_HELP);
  process.exit(0);
}

/** Offline packages-graph-map bake — not bun pm. @see public/registry/packages-graph-map.json */
async function printPackagesGraphTable(flags: PackageGraphFlags): Promise<void> {
  const { joinPath } = await import('../lib/path-bun.ts');
  const { logTable, shouldColor } = await import('../lib/console-depth.ts');
  const root = joinPath(import.meta.dir, '..');
  if (flags.update) {
    console.log('Refreshing complete package audit + graph...');
    const code = await updatePackageGraphBake(root);
    if (code !== 0) cliError(`Package graph rebake failed with exit code ${code}.`);
  }
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
  const packages = data.packages ?? [];
  const workspaces = data.surfaces?.workspaces ?? [];
  const selectedPackages = selectPackageGraphRows(packages, workspaces, flags.scope, flags.view);
  const availableScopes = availablePackageGraphScopes(packages, workspaces);
  const useColor =
    flags.color === true
      ? true
      : flags.color === false
        ? false
        : shouldColor() && flags.exportFormat === 'table';

  // Machine-readable export short-circuits human tables
  if (flags.exportFormat === 'json') {
    process.stdout.write(
      formatPackageGraphJson(selectedPackages, {
        schemaVersion: schema,
        generatedAt: data.generatedAt ?? null,
        bunVersion: data.bunVersion ?? null,
        boardScore: data.score ?? null,
        boardGrade: data.grade ?? null,
        scope: flags.scope,
        view: flags.view,
        selected: selectedPackages.length,
        total: packages.length,
      })
    );
    return;
  }
  if (flags.exportFormat === 'csv') {
    process.stdout.write(formatPackageGraphCsv(selectedPackages));
    return;
  }

  const rows = selectedPackages.map(({ npmName, package: p }) => {
    const scoreRaw = p.score;
    const scoreText =
      scoreRaw != null ? colorizeByHealth(String(scoreRaw), scoreRaw, useColor) : '—';
    const gradeText = p.grade != null ? colorizeByHealth(String(p.grade), scoreRaw, useColor) : '—';
    return {
      package: npmName,
      role: p.role ?? '—',
      score: scoreText,
      grade: gradeText,
      files: p.scanned ?? '—',
      orphans: p.orphans ?? '—',
      kB: p.bytes != null ? Math.round(p.bytes / 1024) : '—',
    };
  });
  const boardScoreText =
    data.score != null ? colorizeByHealth(String(data.score), data.score, useColor) : '?';
  console.log(
    `packages-graph-map  schema=v${schema}  generated=${data.generatedAt ?? '?'}  bun=${data.bunVersion ?? '?'}  score=${boardScoreText}  grade=${data.grade ?? '?'}`
  );
  console.log(
    `selection  scope=${flags.scope}  view=${flags.view}  selected=${selectedPackages.length}/${packages.length}  surfaces=global`
  );
  if (data.map?.summary) {
    const s = data.map.summary;
    console.log(
      `summary  packages=${s.packageCount}  consumed=${s.consumed}  dormant=${s.dormant}  rootTooling=${s.rootTooling}  openActions=${s.openActions}`
    );
  }
  // Live role/grade breakdown of the full bake (not just filtered view)
  const roles = packageRoleBreakdown(packages);
  const grades = packageGradeBreakdown(packages);
  console.log(
    `roles  ${
      Object.entries(roles)
        .map(([k, v]) => `${k}=${v}`)
        .join('  ') || '—'
    }`
  );
  console.log(
    `grades ${
      Object.entries(grades)
        .map(([k, v]) => `${k}=${v}`)
        .join('  ') || '—'
    }`
  );

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

  console.log(
    `\n── packages/* import graph (audit plane; scope=${flags.scope}; view=${flags.view}; selected=${selectedPackages.length}/${packages.length}) ──`
  );
  if (rows.length === 0) {
    console.log(
      `(no packages match scope=${flags.scope} view=${flags.view}; available scopes: ${availableScopes.join(', ') || 'none'})`
    );
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

  // Cross-plane (surfaces v3)
  const cross = (
    surfaces as {
      crossPlane?: {
        pageToRegistry?: Array<{
          page: string;
          registryPath: string;
          family: string;
          weight: number;
        }>;
        libImportHubs?: Array<{
          targetPrefix: string;
          weight: number;
          fromPackages: string[];
        }>;
      };
      registry?: {
        orphanTriage?: Array<{
          file: string;
          family: string;
          action: string;
          note: string;
          suggestPortal?: string;
        }>;
      };
    }
  )?.crossPlane;
  if (cross?.pageToRegistry?.length) {
    console.log('\n── page → registry edges (top) ──');
    logTable(
      cross.pageToRegistry.slice(0, 15).map(e => ({
        page: e.page,
        registry: e.registryPath.replace('/registry/', ''),
        family: e.family,
        w: e.weight,
      })),
      ['page', 'registry', 'family', 'w']
    );
    if (cross.pageToRegistry.length > 15) {
      console.log('  ... +' + (cross.pageToRegistry.length - 15) + ' more edges');
    }
  }
  if (cross?.libImportHubs?.length) {
    console.log('\n── packages → lib import hubs ──');
    logTable(
      cross.libImportHubs.map(h => ({
        hub: h.targetPrefix,
        weight: h.weight,
        from: h.fromPackages.join(', '),
      })),
      ['hub', 'weight', 'from']
    );
  }
  const orphanTriage = (
    surfaces as {
      registry?: {
        orphanTriage?: Array<{
          file: string;
          family: string;
          action: string;
          note: string;
          suggestPortal?: string;
        }>;
      };
    }
  )?.registry?.orphanTriage;
  if (orphanTriage?.length) {
    console.log('\n── orphan registry triage ──');
    const wire = orphanTriage.filter(t => t.action === 'wire-portal');
    const doc = orphanTriage.filter(t => t.action === 'document');
    const review = orphanTriage.filter(t => t.action === 'review');
    console.log(
      'wire-portal=' + wire.length + '  document=' + doc.length + '  review=' + review.length
    );
    if (wire.length) {
      logTable(
        wire.map(t => ({
          file: t.file,
          family: t.family,
          portal: t.suggestPortal ?? '—',
        })),
        ['file', 'family', 'portal']
      );
    }
  }

  console.log('\nRebake: bun run audit:packages -- --bake');
  console.log('Board:  /portal/packages/  ·  chrome: /registry/portal-chrome.json');
}

/**
 * `portal-cli badge` — offline preview of the nav badges the portal topbar shows.
 * Reuses the pure pickers from public/portal/nav-badges.js against the baked
 * registry JSONs (no server, no secrets). @see public/portal/nav-badges.js
 */
async function printBadgeTable(flags: string[] = []): Promise<void> {
  const { joinPath } = await import('../lib/path-bun.ts');
  const { jsonOut, logTable } = await import('../lib/console-depth.ts');
  const badges = (await import('../public/portal/nav-badges.js')) as {
    pickFailuresBadge: (d: unknown) => number | null;
    toneFailuresBadge: (n: number | null) => string;
    pickVaultBadge: (d: unknown) => number | null;
    toneVaultBadge: (n: number | null) => string;
    pickPackagesBadge: (d: unknown) => number | null;
    tonePackagesBadge: (n: number | null) => string;
    pickHealthBadge: (d: unknown) => number | null;
    toneHealthBadge: (n: number | null) => string;
  };
  const root = joinPath(import.meta.dir, '..');
  const specs = [
    {
      board: '/portal/failures/',
      source: 'public/registry/failures.json',
      pick: badges.pickFailuresBadge,
      tone: badges.toneFailuresBadge,
    },
    {
      board: '/portal/vault/',
      source: 'public/registry/vault-health.json',
      pick: badges.pickVaultBadge,
      tone: badges.toneVaultBadge,
    },
    {
      board: '/portal/packages/',
      source: 'public/registry/packages-graph-map.json',
      pick: badges.pickPackagesBadge,
      tone: badges.tonePackagesBadge,
    },
    {
      board: '/portal/health/',
      source: 'public/registry/monorepo-health.json',
      pick: badges.pickHealthBadge,
      tone: badges.toneHealthBadge,
    },
  ];
  const rows = await Promise.all(
    specs.map(async s => {
      const file = Bun.file(joinPath(root, s.source));
      const data = (await file.exists()) ? await file.json() : null;
      const value = data ? s.pick(data) : null;
      return {
        board: s.board,
        source: s.source.replace('public/registry/', '/registry/'),
        value: value ?? '—',
        tone: value != null ? s.tone(value) : data ? 'neutral' : 'missing-bake',
      };
    })
  );
  if (flags.includes('--json')) {
    jsonOut(rows);
    return;
  }
  console.log('nav badges (offline — from baked registry JSON):');
  logTable(rows, ['board', 'source', 'value', 'tone']);
  if (rows.some(r => r.tone === 'missing-bake')) {
    console.log('\nmissing bake(s) — run bun run bake:all');
  }
}

/**
 * `portal-cli bunfig status` — offline view of the bunfig-state bake:
 * effective install config with per-key provenance (machine vs project) + gate results.
 * @see scripts/bake-bunfig.ts · docs/UNIFIED.md
 */
async function printBunfigStatus(flags: string[] = []): Promise<void> {
  const { joinPath } = await import('../lib/path-bun.ts');
  const { jsonOut, logTable } = await import('../lib/console-depth.ts');
  const root = joinPath(import.meta.dir, '..');
  const statePath = joinPath(root, 'public/registry/bunfig-state.json');
  const file = Bun.file(statePath);
  if (!(await file.exists())) {
    cliError(`Missing bunfig-state bake: ${statePath}\nBake offline: bun run bunfig:bake`);
  }
  const data = (await file.json()) as {
    generatedAt?: string;
    cacheDir?: string | null;
    keys?: Array<{
      key: string;
      effective: string | number | boolean | Array<string | number | boolean> | null;
      source: string;
      owner: string;
      drift: boolean;
    }>;
    scopes?: Array<{
      scope: string;
      url: string | null;
      plane?: string;
      usedBy?: string[];
      tokenEnv: string | null;
    }>;
    securityScanner?: string | null;
    gates?: {
      doctor?: { ok: boolean; exitCode: number };
      audit?: { ok: boolean; exitCode: number };
    };
    summary?: { healthy: boolean; driftKeys: string[] };
  };
  if (flags.includes('--json')) {
    jsonOut(data);
    return;
  }
  type TomlScalar = string | number | boolean | Array<string | number | boolean> | null | undefined;
  const fmt = (v: TomlScalar): string =>
    v == null ? '—' : Array.isArray(v) ? v.join(', ') : String(v);
  console.log(
    `bunfig-state  generated=${data.generatedAt ?? '?'}  healthy=${data.summary?.healthy ?? '?'}  cache=${data.cacheDir ?? '?'}`
  );
  console.log('\n── install keys (effective = project overlays machine) ──');
  logTable(
    (data.keys ?? []).map(k => ({
      key: k.key,
      effective: fmt(k.effective),
      source: k.source,
      owner: k.owner,
      drift: k.drift ? 'DRIFT' : '',
    })),
    ['key', 'effective', 'source', 'owner', 'drift']
  );
  if (data.scopes?.length) {
    console.log('\n── registry scopes (project) ──');
    logTable(
      data.scopes.map(s => ({
        scope: s.scope,
        url: s.url ?? '—',
        plane: s.plane ?? '—',
        pkgs: (s.usedBy ?? []).length || '—',
        tokenEnv: s.tokenEnv ?? '—',
      })),
      ['scope', 'url', 'plane', 'pkgs', 'tokenEnv']
    );
  }
  console.log(`\nsecurity scanner: ${data.securityScanner ?? '—'}`);
  console.log(
    `gates: doctor=${data.gates?.doctor?.ok ? 'ok' : 'FAIL'}  audit=${data.gates?.audit?.ok ? 'ok' : 'FAIL'}  drift=${data.summary?.driftKeys?.join(',') || 'none'}`
  );
  console.log('\nRebake: bun run bunfig:bake  ·  Gate: portal-cli bunfig check');
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
    case 'prune': {
      const keepIdx = rest.indexOf('--keep');
      let keep = 5;
      if (keepIdx >= 0) {
        const raw = rest[keepIdx + 1];
        // allow --keep=3 form via rest scan
        keep = Number(raw);
      }
      for (const a of rest) {
        if (a.startsWith('--keep=')) {
          keep = Number(a.slice('--keep='.length));
        }
      }
      if (!Number.isFinite(keep) || keep < 0) {
        cliError('--keep must be a non-negative number');
      }
      await pruneSnapshots({
        keep,
        scope: filterScope,
        dryRun,
        debug,
      });
      break;
    }
    case 'cron': {
      // Passthrough to the Bun.cron tenant tool (register|remove|preview).
      if (!rest[0]) {
        cliError('Usage: portal-cli snapshot cron <register|remove|preview> [args…]');
      }
      // Compiled binary (dist/portal) has no real tools/ tree — import.meta.dir
      // is the virtual /$bunfs root there, so fall back to the repo-relative
      // path (documented usage runs from the repo root).
      const absCron = `${import.meta.dir}/portal-snapshot-cron.ts`;
      const cronTool = (await Bun.file(absCron).exists())
        ? absCron
        : 'tools/portal-snapshot-cron.ts';
      const proc = Bun.spawn(['bun', cronTool, ...rest], {
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: 'inherit',
      });
      process.exit((await proc.exited) ?? 1);
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

  // Forward Bun execution flags: bun --smol test …
  // @see https://bun.com/docs/runtime#general-execution-options
  const code = await spawnBunWithFlags(bunExecFlags, args);
  if (update && code === 0) {
    console.log(
      'vault health: snapshots updated — commit tests/__snapshots__/vault-health.test.ts.snap'
    );
  }
  process.exit(code);
}

async function dispatchCapabilities(sub: string | undefined, rest: string[]): Promise<void> {
  if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
    console.log(CAPABILITIES_HELP);
    return;
  }

  if (sub === 'docs') {
    console.log(`Capability map SSOT

  AGENTS.md#grounded-capability-map
  public/registry/capability-map-subset.json   (tools hub · schema v3)
  public/registry/capability-map-full.json     (examples + sourceLabel)
  tests/__snapshots__/capability-map-subset.test.ts.snap

  bun run bake:capabilities
  bun run bake:capabilities:check
  bun run check:snapshots
  bun run portal-cli capabilities health
  bun run portal-cli capabilities doctor
  bun run bake:capabilities:update   # intentional AGENTS drift
`);
    return;
  }

  if (sub === 'doctor') {
    const { joinPath } = await import('../lib/path-bun.ts');
    const { formatCapabilityDoctorHuman, runCapabilityDoctor } = await import(
      '../lib/portal/capability-doctor.ts'
    );
    const root = joinPath(import.meta.dir, '..');
    const bunOnly = rest.includes('--bun-only');
    // @see https://bun.com/docs/runtime/utils#bun-nanoseconds
    const t0 = Bun.nanoseconds();
    const report = await runCapabilityDoctor(root, { bunOnly });
    const elapsedNs = Bun.nanoseconds() - t0;
    if (rest.includes('--json')) {
      jsonOut({ ...report, elapsedNs });
    } else {
      console.log(
        formatCapabilityDoctorHuman(report, {
          columns: process.stdout.columns,
          elapsedNs,
        })
      );
    }
    process.exit(report.ok ? 0 : 1);
  }

  if (sub !== 'health') {
    cliError(`Unknown capabilities subcommand: ${sub}\n\n${CAPABILITIES_HELP}`);
  }

  const update = rest.includes('--update') || rest.includes('-u');
  // Mechanical gate: capability-map subset snapshot + bake fingerprint (no network).
  // @see https://bun.com/docs/test/snapshots
  if (!update) {
    const check = await spawnBunWithFlags(bunExecFlags, [
      'tools/bake-capability-map.ts',
      '--check',
    ]);
    if (check !== 0) process.exit(check);
  }

  const args = ['test', 'tests/capability-map-subset.test.ts'];
  if (update) args.push('--update-snapshots');

  const code = await spawnBunWithFlags(bunExecFlags, args);
  if (update && code === 0) {
    console.log(
      'capabilities health: snapshots updated — commit tests/__snapshots__/capability-map-subset.test.ts.snap'
    );
    console.log(
      '  (if AGENTS.md matrix changed, also commit public/registry/capability-map-*.json)'
    );
  }
  process.exit(code);
}

async function main(): Promise<void> {
  // Harvest Bun runtime flags before portal-cli command (docs/runtime general options).
  const parsed = parseBunExecutionFlags(Bun.argv.slice(2));
  bunExecFlags = parsed.bunFlags;
  const argv = parsed.rest;
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
    // bun [--smol] tools/portal-probe.ts …
    const code = await spawnBunWithFlags(bunExecFlags, ['tools/portal-probe.ts', ...argv.slice(1)]);
    process.exit(code);
  }

  if (cmd === 'vault') {
    await dispatchVault(argv[1], argv.slice(2));
    return;
  }

  if (cmd === 'capabilities' || cmd === 'capability') {
    await dispatchCapabilities(argv[1], argv.slice(2));
    return;
  }

  if (cmd === 'secret') {
    // pass-cli children — do not forward Bun flags to pass-cli
    const { dispatchSecret } = await import('./portal-secret.ts');
    await dispatchSecret(argv[1], argv.slice(2));
    return;
  }

  if (cmd === 'badge') {
    const badgeFlags = argv.slice(1);
    const bad = badgeFlags.filter(f => f !== '--json');
    if (bad.length) cliError(`Unknown badge flag(s): ${bad.join(', ')}\nFlags: --json`);
    await printBadgeTable(badgeFlags);
    return;
  }

  if (cmd === 'bunfig') {
    const sub = argv[1];
    const rest = argv.slice(2);
    if (!sub || sub === 'help' || sub === '--help' || sub === '-h') {
      console.log(`Usage: portal-cli bunfig <subcommand> [options]

Subcommands:
  status [--json]   Effective bunfig install config + gate results (offline bake)
  check             Run audit-bunfig --strict (exit 0 if no workspace duplication)

Rebake: bun run bunfig:bake  ·  Policy: docs/UNIFIED.md
`);
      return;
    }
    if (sub === 'status') {
      const bad = rest.filter(f => f !== '--json');
      if (bad.length) cliError(`Unknown bunfig status flag(s): ${bad.join(', ')}\nFlags: --json`);
      await printBunfigStatus(rest);
      return;
    }
    if (sub === 'check') {
      const proc = Bun.spawn(['bash', 'scripts/audit-bunfig.sh', '--strict'], {
        cwd: process.cwd(),
        stdout: 'inherit',
        stderr: 'inherit',
        stdin: 'inherit',
      });
      process.exit((await proc.exited) ?? 1);
    }
    cliError(`Unknown bunfig subcommand: ${sub}`);
  }

  if (cmd === 'scanner') {
    // Bun Security Scanner control plane (status / configure / scan / init).
    // scan → bun pm scan; configure edits [install.security] in bunfig.toml.
    // @see https://bun.com/docs/pm/security-scanner-api
    const code = await dispatchScanner(argv[1], argv.slice(2), {
      spawnBun: async (args, o) => spawnBunWithFlags(bunExecFlags, args, o),
    });
    process.exit(code);
  }

  if (cmd === 'flags') {
    // Catalog-driven Bun runtime flags table (SSOT: config/runtime-flags.json).
    // @see https://bun.com/docs/runtime/index#general-execution-options
    if (argv.includes('--help') || argv.includes('-h')) {
      console.log(`Usage: portal-cli flags [flags]

Curated Bun runtime flags from config/runtime-flags.json (SSOT for help + harvest).

Flags:
  --all · -a         Include full harvestable set (not only curated help rows)
  --verbose · -v     Extra columns: version · default · deprecated · behavior
  --json             Machine-readable catalog + health report

Examples:
  portal-cli flags
  portal-cli flags --all
  portal-cli flags --verbose
  portal-cli flags --json

Related: portal-cli --help · portal-cli doctor --group catalog
`);
      return;
    }
    const all = argv.includes('--all') || argv.includes('-a');
    const verbose = argv.includes('--verbose') || argv.includes('-v');
    const catalog = await loadRuntimeFlagsCatalog();
    const health = assessRuntimeFlagsCatalog(catalog);
    if (argv.includes('--json')) {
      const report: RuntimeFlagsJsonReport = {
        kind: 'portal-cli-flags',
        schemaVersion: 1,
        curatedOnly: !all,
        verbose,
        generatedAt: new Date().toISOString(),
        flags: all ? catalog : catalog.filter(r => r.curated),
        health,
      };
      jsonOut(report);
    } else {
      console.log(formatRuntimeFlagsTable({ all, verbose, catalog }));
    }
    process.exit(health.ok ? 0 : 1);
  }

  if (cmd === 'doctor') {
    // Unified portal health gate — linker configVersion + offline bakes + catalog.
    // --full also runs install:verify + vault/capabilities test gates.
    // --verbose adds fix command · impact · auto-fixable · env scope table.
    // @see https://bun.com/docs/pm/cli/install#default-strategy
    // @see https://bun.com/docs/pm/isolated-installs
    if (argv.includes('--help') || argv.includes('-h')) {
      console.log(`Usage: portal-cli doctor [flags]

Unified portal health gate (linker · bakes · catalog · bunfig · infra · gates).

Checks:
  Linker:  linker-config-version · machine-isolated-linker
  Bakes:   vault-health · capability-map-subset · bunfig-state (+ age when present)
  Catalog: catalog-json-schema · shortcode · bun-help-parity · help-coverage · deprecated
  Bunfig:  machine-ssot · frozen-lockfile · project-no-machine-keys · merge · excludes · env
  Infra:   access-policy · ledger-access · portal-access · terminal-host · reasonix-dns
  Gates:   (only with --full) install:verify · vault-health tests · capability tests

Access probes:
  Default doctor is offline (policy SSOT only — stable bake fingerprint).
  --group infra  → live HTTPS probes ON (unless --offline)
  --live-access  → force live probes on any group mix
  --offline      → force policy-only (no network)

Flags:
  --verbose · -v     Full fields / remediation (pretty: Bun.stringWidth table)
  --failed-only      Hide passing checks
  --full             Spawn install:verify · vault · capability tests
  --group <name>     linker | bakes | catalog | bunfig | infra | gates
  --env <scope>      all | ci | dev
  --layout plain|pretty   Override auto (TTY→pretty · CI/pipe→plain)
  --json             Machine-readable report
  --no-write         Do not refresh public/registry/doctor-state.json
  --live-access      Live Cloudflare Access probes
  --offline          Policy-only Access (no HTTPS)

Pretty TTY uses Bun.stringWidth + Bun.color (shouldColor). Plain is greppable PASS/FAIL.

Examples:
  portal-cli doctor
  portal-cli doctor --group infra                 # live Access probes
  portal-cli doctor --env ci --group infra --layout pretty
  portal-cli doctor --group bunfig --offline
  portal-cli doctor --verbose --failed-only
  portal-cli doctor --json
  portal-cli doctor --full --verbose

Catalog / bunfig / bake:
  bun run portal:flags:check · audit:bunfig · bake:doctor · bake:doctor:check

Related: vault health · capabilities · scanner · flags · install:verify
`);
      return;
    }
    const {
      runPortalDoctor,
      formatPortalDoctor,
      formatPortalDoctorVerbose,
      parseDoctorGroupsFromArgv,
      parseDoctorEnv,
    } = await import('./lib/portal-cli-doctor.ts');
    const verbose = argv.includes('--verbose') || argv.includes('-v');
    let groups: ReturnType<typeof parseDoctorGroupsFromArgv>;
    let env: ReturnType<typeof parseDoctorEnv>;
    try {
      groups = parseDoctorGroupsFromArgv(argv);
      const envEq = argv.find(a => a.startsWith('--env='));
      const envIdx = argv.indexOf('--env');
      const envRaw = envEq
        ? envEq.slice('--env='.length)
        : envIdx >= 0
          ? argv[envIdx + 1]
          : undefined;
      env = parseDoctorEnv(envRaw);
    } catch (e) {
      cliError(e instanceof Error ? e.message : String(e));
    }
    // Layout: --layout plain|pretty (env: PORTAL_DOCTOR_FORMAT)
    let format: 'plain' | 'pretty' | undefined;
    const layoutEq = argv.find(a => a.startsWith('--layout='));
    const layoutIdx = argv.indexOf('--layout');
    const layoutRaw = layoutEq
      ? layoutEq.slice('--layout='.length)
      : layoutIdx >= 0
        ? argv[layoutIdx + 1]
        : undefined;
    if (layoutRaw === 'plain' || layoutRaw === 'pretty') format = layoutRaw;
    else if (layoutRaw != null) cliError(`Unknown --layout=${layoutRaw}; expect plain | pretty`);

    // Live Access: --group infra (default on) or --live-access; --offline forces policy-only
    const offline = argv.includes('--offline');
    const groupsIncludeInfra = Boolean(groups?.includes('infra'));
    const liveAccess = !offline && (argv.includes('--live-access') || groupsIncludeInfra);
    const report = await runPortalDoctor({
      full: argv.includes('--full'),
      verbose,
      failedOnly: argv.includes('--failed-only'),
      groups,
      env,
      format,
      skipLiveAccess: !liveAccess,
    });
    // Refresh board bake unless --no-write
    // When live Access ran, skip auto-write so bake fingerprint stays offline-stable
    if (!argv.includes('--no-write') && !liveAccess) {
      try {
        const { toDoctorState, DOCTOR_STATE_REL } = await import('./bake-doctor.ts');
        const state = toDoctorState(report);
        await Bun.write(DOCTOR_STATE_REL, `${JSON.stringify(state, null, 2)}\n`);
      } catch {
        // non-fatal
      }
    }
    if (argv.includes('--json')) {
      jsonOut(report);
    } else if (verbose) {
      console.log(formatPortalDoctorVerbose(report, { format }));
    } else {
      console.log(formatPortalDoctor(report, { format }));
    }
    process.exit(report.ok ? 0 : 1);
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
      let flags: PackageGraphFlags;
      try {
        flags = parsePackageGraphFlags(pmArgs.slice(1));
      } catch (error) {
        cliError(`${error instanceof Error ? error.message : String(error)}\n\n${PM_HELP}`);
      }
      if (flags.help) {
        console.log(PM_HELP);
        return;
      }
      await printPackagesGraphTable(flags);
      return;
    }
    // Full bun pm surface — https://bun.com/docs/pm/cli/pm
    // bun [--smol] pm ls …
    const code = await spawnBunWithFlags(bunExecFlags, ['pm', ...pmArgs]);
    process.exit(code);
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
      bunfig: '/portal/bunfig/',
      'install-hygiene': '/portal/install-hygiene/',
      hygiene: '/portal/install-hygiene/',
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
      console.log(`Usage: portal-cli dashboard [path|/portal/…] [--view=name] [--open] [--list]

Views: ${Object.keys(VIEW_PATHS).sort().join(', ')}

Examples:
  portal-cli dashboard
  portal-cli dashboard --list
  portal-cli dashboard --view=packages --open
  portal-cli dashboard /portal/vault/
  PORTAL_BASE_URL=http://127.0.0.1:8787 portal-cli dashboard --view=tools --open
`);
      return;
    }
    if (argv.includes('--list')) {
      const { logTable } = await import('../lib/console-depth.ts');
      logTable(
        Object.entries(VIEW_PATHS)
          .map(([view, path]) => ({ view, path }))
          .sort((a, b) => a.view.localeCompare(b.view)),
        ['view', 'path']
      );
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
