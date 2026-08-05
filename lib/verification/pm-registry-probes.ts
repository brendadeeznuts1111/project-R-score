// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/api/spawn — Bun.spawnSync
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/pm/cli/pm — bun pm pkg / pack / ls
/**
 * Package-manager weave probes for the publish-plane:
 * local `bun pm` state ↔ private npm registry (`registry.factory-wager.com`)
 * parity for the one publishable workspace package.
 *
 * Network probes are fail-soft: an unreachable registry or a missing
 * `FACTORY_WAGER_TOKEN` yields `{ skipped: true }` rows, never hard failures.
 * The tool layer (`verify-pages-edge --pm --strict-pm`) promotes skips.
 *
 * @see docs/harness/tenants/monorepo-workspaces.md
 */
import {
  PUBLISH_PM_PROOF_CONCEPT_ID,
  publishPlaneColorForConcept,
  publishPlaneModeConceptId,
  type PublishPlaneColorBlock,
} from './publish-plane-color.ts';

export const PM_PACKAGE_NAME = '@factorywager/registry-client';
export const PM_PACKAGE_DIR = 'packages/registry-client';
export const PM_REGISTRY_ENV = 'PM_VERIFY_REGISTRY';
export const PM_REGISTRY_TOKEN_ENV = 'FACTORY_WAGER_TOKEN';
export const PM_PROOF_REL = 'public/registry/pm-proof.json' as const;
export const PM_PROOF_REPORT_PATH = '/registry/pm-proof.json' as const;
export const PM_PROOF_SCHEMA = 'factorywager.pm-proof.v1' as const;
/** Stable machine id (slug) — not the human title. */
export const PM_PROOF_ARTIFACT_ID = 'pm-proof' as const;
/** Human title — never used as a key. */
export const PM_PROOF_ARTIFACT_NAME = 'PM publish-plane proof' as const;
export const PM_PROOF_PLANE = 'publish' as const;
export const PM_PROOF_PURPOSE = 'audit' as const;
export const PM_PROOF_CLI = 'bun run verify:pm:save' as const;
export const PM_PROOF_BOARD_PATH = '/portal/packages/' as const;
export const PM_PROOF_WEAVE_PATH = '/registry/portal-weave.json' as const;

const REPO_ROOT = new URL('../../', import.meta.url).pathname;
const DEFAULT_REGISTRY = 'https://registry.factory-wager.com/api/npm';

export interface PmSpawnResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export type PmSpawn = (cmd: string[], cwd: string) => PmSpawnResult;

export interface PmProbeRow {
  name: string;
  ok: boolean;
  skipped: boolean;
  detail: string;
}

const defaultSpawn: PmSpawn = (cmd, cwd) => {
  const proc = Bun.spawnSync({ cmd, cwd, stdout: 'pipe', stderr: 'pipe' });
  return {
    exitCode: proc.exitCode,
    stdout: proc.stdout.toString(),
    stderr: proc.stderr.toString(),
  };
};

function row(name: string, ok: boolean, detail: string, skipped = false): PmProbeRow {
  return { name, ok, skipped, detail };
}

/** Last non-empty stdout line, JSON-parsed when quoted (bun pm pkg get prints JSON values). */
export function parsePmPkgValue(stdout: string): string {
  const lines = stdout
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('['));
  const last = lines.at(-1) ?? '';
  try {
    const parsed: unknown = JSON.parse(last);
    return typeof parsed === 'string' ? parsed : String(parsed);
  } catch {
    return last;
  }
}

/** File paths from `bun pm pack --dry-run` output (`packed <size> <path>` lines). */
export function parsePackDryRunFiles(stdout: string): string[] {
  const files: string[] = [];
  for (const line of stdout.split('\n')) {
    const m = line.trim().match(/^packed\s+\S+\s+(.+)$/);
    if (m?.[1]) files.push(m[1].trim());
  }
  return files;
}

/** Publish-relevant manifest subset compared local ↔ registry. */
export function cleanManifest(manifest: Record<string, unknown>): Record<string, unknown> {
  const keys = [
    'name',
    'version',
    'type',
    'main',
    'module',
    'types',
    'exports',
    'files',
    'sideEffects',
  ];
  const out: Record<string, unknown> = {};
  for (const k of keys) {
    if (k in manifest) out[k] = manifest[k];
  }
  return out;
}

export function manifestsEqual(
  local: Record<string, unknown>,
  published: Record<string, unknown>
): boolean {
  return Bun.deepEquals(cleanManifest(local), cleanManifest(published), true);
}

/** Registry base URL: env override → root package.json publishConfig → default. */
export async function resolveRegistryUrl(
  env: Record<string, string | undefined> = Bun.env,
  readRootPkg: () => Promise<Record<string, unknown>> = readRootPackageJson
): Promise<string> {
  const fromEnv = env[PM_REGISTRY_ENV]?.trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  try {
    const pkg = await readRootPkg();
    const publishConfig = pkg.publishConfig as { registry?: string } | undefined;
    if (publishConfig?.registry) return publishConfig.registry.replace(/\/$/, '');
  } catch {
    // fall through to default
  }
  return DEFAULT_REGISTRY.replace(/\/$/, '');
}

async function readRootPackageJson(): Promise<Record<string, unknown>> {
  return (await Bun.file(`${REPO_ROOT}package.json`).json()) as Record<string, unknown>;
}

export function scopedPackumentUrl(registry: string, pkg: string): string {
  if (pkg.startsWith('@')) {
    const slash = pkg.indexOf('/');
    if (slash > 0) return `${registry}/${pkg.slice(0, slash)}%2f${pkg.slice(slash + 1)}`;
  }
  return `${registry}/${pkg}`;
}

export interface NpmPackumentVersion {
  version?: string;
  dist?: { tarball?: string; integrity?: string; shasum?: string };
  [key: string]: unknown;
}

export interface NpmPackument {
  name?: string;
  'dist-tags'?: { latest?: string };
  versions?: Record<string, NpmPackumentVersion>;
}

/** 1 — `bun pm pkg get` name/version parity for the publishable package. */
export function pmPkgParity(spawn: PmSpawn = defaultSpawn): PmProbeRow {
  const cwd = `${REPO_ROOT}${PM_PACKAGE_DIR}`;
  const name = spawn(['bun', 'pm', 'pkg', 'get', 'name'], cwd);
  const version = spawn(['bun', 'pm', 'pkg', 'get', 'version'], cwd);
  if (name.exitCode !== 0 || version.exitCode !== 0) {
    return row(
      'pm pkg parity',
      false,
      `bun pm pkg failed (rc=${name.exitCode}/${version.exitCode})`
    );
  }
  const gotName = parsePmPkgValue(name.stdout);
  const gotVersion = parsePmPkgValue(version.stdout);
  if (gotName !== PM_PACKAGE_NAME) return row('pm pkg parity', false, `name=${gotName}`);
  if (!/^\d+\.\d+\.\d+/.test(gotVersion)) {
    return row('pm pkg parity', false, `version=${gotVersion} not semver`);
  }
  return row('pm pkg parity', true, `${gotName}@${gotVersion}`);
}

/** 2 — npm registry packument reachable (fail-soft; Pages SPA HTML fallback = skip). */
export async function npmRegistryMetadata(
  fetchImpl: typeof fetch = fetch,
  registry?: string
): Promise<{ row: PmProbeRow; packument?: NpmPackument }> {
  const base = registry ?? (await resolveRegistryUrl());
  const url = scopedPackumentUrl(base, PM_PACKAGE_NAME);
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) {
      return { row: row('npm registry metadata', true, `skipped — ${url} → ${res.status}`, true) };
    }
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('json')) {
      return {
        row: row(
          'npm registry metadata',
          true,
          `skipped — no npm packument (${ct.split(';')[0]} fallback)`,
          true
        ),
      };
    }
    const packument = (await res.json()) as NpmPackument;
    const latest = packument['dist-tags']?.latest ?? 'unknown';
    const count = Object.keys(packument.versions ?? {}).length;
    return {
      row: row('npm registry metadata', true, `latest=${latest} · ${count} version(s)`),
      packument,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { row: row('npm registry metadata', true, `skipped — ${msg.slice(0, 60)}`, true) };
  }
}

/**
 * Origin for host-level registry APIs (not the npm packument base).
 * `DEFAULT_REGISTRY` / `PM_VERIFY_REGISTRY` are npm roots
 * (`https://registry.factory-wager.com/api/npm`); health lives at
 * `/api/registry/health` on the same host — never under `/api/npm/…`.
 */
export function registryHostOrigin(registryUrl: string): string {
  try {
    const u = new URL(registryUrl);
    return u.origin;
  } catch {
    return (
      registryUrl.replace(/\/api\/npm\/?$/i, '').replace(/\/+$/, '') ||
      'https://registry.factory-wager.com'
    );
  }
}

/** 2b — artifact registry API live on the registry host (`/api/registry/health`). */
export async function artifactRegistryApi(
  fetchImpl: typeof fetch = fetch,
  registry?: string
): Promise<PmProbeRow> {
  const base = registry ?? (await resolveRegistryUrl());
  const url = `${registryHostOrigin(base)}/api/registry/health`;
  try {
    const res = await fetchImpl(url, { signal: AbortSignal.timeout(8_000) });
    if (!res.ok) return row('artifact registry api', false, `${url} → ${res.status}`);
    const ct = res.headers.get('content-type') ?? '';
    if (!ct.includes('json')) {
      return row('artifact registry api', false, `${url} → ${ct.split(';')[0]} (expected JSON)`);
    }
    await res.json();
    return row('artifact registry api', true, `${url} ok`);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return row('artifact registry api', true, `skipped — ${msg.slice(0, 60)}`, true);
  }
}

/** 3 — local manifest ↔ published manifest parity for the shared version. */
export async function manifestParity(
  packument: NpmPackument | undefined,
  readLocal: () => Promise<Record<string, unknown>> = readLocalPackageManifest
): Promise<PmProbeRow> {
  if (!packument?.versions) {
    return row('manifest parity', true, 'skipped — no packument', true);
  }
  const local = await readLocal();
  const localVersion = typeof local.version === 'string' ? local.version : '';
  const published = packument.versions[localVersion];
  if (!published) {
    return row(
      'manifest parity',
      true,
      `skipped — local ${localVersion} not published (${Object.keys(packument.versions).join(', ') || 'none'})`,
      true
    );
  }
  if (manifestsEqual(local, published as Record<string, unknown>)) {
    return row('manifest parity', true, `v${localVersion} manifest matches registry`);
  }
  return row('manifest parity', false, `v${localVersion} manifest drift vs registry`);
}

async function readLocalPackageManifest(): Promise<Record<string, unknown>> {
  return (await Bun.file(`${REPO_ROOT}${PM_PACKAGE_DIR}/package.json`).json()) as Record<
    string,
    unknown
  >;
}

/**
 * 3b — README metadata reached the registry (Bun ≥1.3.14 `bun publish`
 * sends readme/readmeFilename; empty fields mean a pre-fix publish).
 */
export async function readmeMetadata(
  packument: NpmPackument | undefined,
  readLocal: () => Promise<Record<string, unknown>> = readLocalPackageManifest
): Promise<PmProbeRow> {
  if (!packument?.versions) {
    return row('readme metadata', true, 'skipped — no packument', true);
  }
  const local = await readLocal();
  const localVersion = typeof local.version === 'string' ? local.version : '';
  const version = packument.versions[localVersion] ? localVersion : packument['dist-tags']?.latest;
  const entry = version ? packument.versions[version] : undefined;
  if (!version || !entry) {
    return row('readme metadata', true, 'skipped — no published version to inspect', true);
  }
  const readme = typeof entry.readme === 'string' ? entry.readme : '';
  const filename = typeof entry.readmeFilename === 'string' ? entry.readmeFilename : '';
  if (readme.length > 0 && /^readme(\.|$)/i.test(filename)) {
    return row('readme metadata', true, `v${version} readme=${readme.length} chars (${filename})`);
  }
  return row(
    'readme metadata',
    false,
    `v${version} readme metadata empty — publish with Bun ≥1.3.14 to populate`
  );
}

/** 4 — `bun pm pack --dry-run` file set + dependency protocols. */
export async function packDryRun(
  spawn: PmSpawn = defaultSpawn,
  readLocal: () => Promise<Record<string, unknown>> = readLocalPackageManifest,
  distExists: () => Promise<boolean> = defaultDistExists
): Promise<PmProbeRow> {
  if (!(await distExists())) {
    return row(
      'pack dry-run',
      true,
      'skipped — dist not built (bun run build in registry-client)',
      true
    );
  }
  const cwd = `${REPO_ROOT}${PM_PACKAGE_DIR}`;
  const res = spawn(['bun', 'pm', 'pack', '--dry-run', '--ignore-scripts'], cwd);
  if (res.exitCode !== 0) {
    return row('pack dry-run', false, `bun pm pack rc=${res.exitCode}`);
  }
  const files = parsePackDryRunFiles(res.stdout);
  const required = ['package.json', 'README.md', 'dist/index.js', 'dist/index.d.ts'];
  const missing = required.filter(f => !files.includes(f));
  if (missing.length > 0) {
    return row('pack dry-run', false, `missing: ${missing.join(', ')}`);
  }
  const local = await readLocal();
  const deps = (local.dependencies ?? {}) as Record<string, string>;
  const bad = Object.entries(deps).filter(([, v]) => /^(workspace|catalog):/.test(v));
  if (bad.length > 0) {
    return row('pack dry-run', false, `unstripped protocols: ${bad.map(([k]) => k).join(', ')}`);
  }
  return row('pack dry-run', true, `${files.length} files · required set present`);
}

async function defaultDistExists(): Promise<boolean> {
  return Bun.file(`${REPO_ROOT}${PM_PACKAGE_DIR}/dist/index.js`).exists();
}

/** 5 — `bun pm ls --all` resolves clean at the workspace root. */
export function pmLsSanity(spawn: PmSpawn = defaultSpawn): PmProbeRow {
  const res = spawn(['bun', 'pm', 'ls', '--all'], REPO_ROOT);
  if (res.exitCode !== 0) {
    return row('pm ls sanity', false, `bun pm ls --all rc=${res.exitCode}`);
  }
  return row('pm ls sanity', true, 'dependency tree resolves');
}

/** 6 — scoped-registry token presence (never fails unauthenticated runs). */
export function scopeTokenPresence(env: Record<string, string | undefined> = Bun.env): PmProbeRow {
  const token = env[PM_REGISTRY_TOKEN_ENV]?.trim();
  if (token) return row('scope token presence', true, `${PM_REGISTRY_TOKEN_ENV} set`);
  return row(
    'scope token presence',
    true,
    `${PM_REGISTRY_TOKEN_ENV} absent (read-only probes only)`,
    true
  );
}

export async function runPmProbes(opts?: {
  spawn?: PmSpawn;
  fetchImpl?: typeof fetch;
  registry?: string;
}): Promise<PmProbeRow[]> {
  const rows: PmProbeRow[] = [];
  rows.push(pmPkgParity(opts?.spawn));
  const { row: metaRow, packument } = await npmRegistryMetadata(opts?.fetchImpl, opts?.registry);
  rows.push(metaRow);
  rows.push(await artifactRegistryApi(opts?.fetchImpl, opts?.registry));
  rows.push(await manifestParity(packument));
  rows.push(await readmeMetadata(packument));
  rows.push(await packDryRun(opts?.spawn));
  rows.push(pmLsSanity(opts?.spawn));
  rows.push(scopeTokenPresence());
  return rows;
}

export type PmProofReport = {
  schema: typeof PM_PROOF_SCHEMA;
  /** Stable slug — keys weave / registry / CLI. */
  artifactId: typeof PM_PROOF_ARTIFACT_ID;
  /** Human title — display only. */
  artifactName: typeof PM_PROOF_ARTIFACT_NAME;
  /** Partner-ops color kernel concept id (`publish.*`). */
  conceptId: typeof PUBLISH_PM_PROOF_CONCEPT_ID;
  /** Resolved palette wire (colorKey · token · hex · css). */
  color: PublishPlaneColorBlock;
  /** Mode chip concept + wire (`publish.mode.soft` / `.strict`). */
  modeColor: PublishPlaneColorBlock;
  plane: typeof PM_PROOF_PLANE;
  purpose: typeof PM_PROOF_PURPOSE;
  cli: typeof PM_PROOF_CLI;
  type: 'PmPublishPlaneProof';
  version: '1.0.0';
  mode: 'soft' | 'strict';
  timestamp: string;
  bunVersion: string;
  bunRevision: string;
  reportPath: typeof PM_PROOF_REPORT_PATH;
  links: {
    json: typeof PM_PROOF_REPORT_PATH;
    board: typeof PM_PROOF_BOARD_PATH;
    weave: typeof PM_PROOF_WEAVE_PATH;
  };
  package: typeof PM_PACKAGE_NAME;
  probes: PmProbeRow[];
  summary: {
    passed: number;
    skipped: number;
    failed: number;
    total: number;
    status: 'pass' | 'fail';
  };
};

/** Build portal-visible soft-pass (or strict) proof from probe rows. */
export function buildPmProofReport(
  probes: PmProbeRow[],
  opts?: { strict?: boolean; bunVersion?: string; bunRevision?: string }
): PmProofReport {
  const strict = opts?.strict === true;
  const mode = strict ? ('strict' as const) : ('soft' as const);
  const failed = probes.filter(p => !p.ok || (strict && p.skipped));
  const skipped = probes.filter(p => p.skipped).length;
  const passed = probes.filter(p => p.ok && !(strict && p.skipped)).length;
  const color = publishPlaneColorForConcept(PUBLISH_PM_PROOF_CONCEPT_ID);
  const modeColor = publishPlaneColorForConcept(publishPlaneModeConceptId(mode));
  return {
    schema: PM_PROOF_SCHEMA,
    artifactId: PM_PROOF_ARTIFACT_ID,
    artifactName: PM_PROOF_ARTIFACT_NAME,
    conceptId: PUBLISH_PM_PROOF_CONCEPT_ID,
    color,
    modeColor,
    plane: PM_PROOF_PLANE,
    purpose: PM_PROOF_PURPOSE,
    cli: PM_PROOF_CLI,
    type: 'PmPublishPlaneProof',
    version: '1.0.0',
    mode,
    timestamp: new Date().toISOString(),
    bunVersion: opts?.bunVersion ?? Bun.version,
    bunRevision: opts?.bunRevision ?? ((Bun.revision || '').slice(0, 12) || 'unknown'),
    reportPath: PM_PROOF_REPORT_PATH,
    links: {
      json: PM_PROOF_REPORT_PATH,
      board: PM_PROOF_BOARD_PATH,
      weave: PM_PROOF_WEAVE_PATH,
    },
    package: PM_PACKAGE_NAME,
    probes,
    summary: {
      passed,
      skipped,
      failed: failed.length,
      total: probes.length,
      status: failed.length === 0 ? 'pass' : 'fail',
    },
  };
}
