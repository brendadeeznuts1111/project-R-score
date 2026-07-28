// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
/**
 * Scope-aware snapshot core — imported by snapshot-data-plane.ts and portal-cli.ts.
 */
import { inspect, stringWidth, write, file } from 'bun';
import { runPublicDiscovery } from '../lib/public-discovery.ts';
import { resolvePath } from '../lib/path-bun.ts';
import {
  DEFAULT_SNAPSHOT_BASE,
  isSnapshotScope,
  repoRoot,
  resolveSnapshotUrl,
  scopeConfigs,
  type SnapshotScopeName,
} from './snapshot-scopes.ts';

export type SnapshotManifest = {
  id: string; // brand-ok — opaque snapshot id
  scope: SnapshotScopeName;
  reportType: string;
  capturedAt: string;
  commit: string;
  branch: string;
  bunVersion: string;
  baseUrl: string;
  fileCount: number;
  files: string[];
  metadata: Record<string, string>;
};

export const SNAPSHOT_DIR = 'snapshots';
const INDEX_PATH = `${SNAPSHOT_DIR}/index.jsonl`;
const SCOPE_MARKER = '.snapshot-scope';

export type SnapshotRunOptions = {
  scope: SnapshotScopeName;
  baseUrl?: string;
  dryRun?: boolean;
};

export type SnapshotFilterOptions = {
  scope?: SnapshotScopeName;
  grep?: string;
};

function pad(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - stringWidth(s)));
}

export function cliError(msg: string): never {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function warn(msg: string): void {
  console.error(`  ⚠️  ${msg}`);
}

function isoNow(): string {
  return new Date().toISOString();
}

async function getGitInfo(): Promise<{ commit: string; branch: string }> {
  try {
    const proc = Bun.spawn(['git', 'rev-parse', 'HEAD'], { stdout: 'pipe' });
    const commit = (await new Response(proc.stdout).text()).trim();
    const proc2 = Bun.spawn(['git', 'rev-parse', '--abbrev-ref', 'HEAD'], { stdout: 'pipe' });
    const branch = (await new Response(proc2.stdout).text()).trim();
    return { commit, branch };
  } catch {
    return { commit: 'unknown', branch: 'unknown' };
  }
}

function generateId(scope: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${scope}-${ts}-${rand}`;
}

export function manifestJsonPath(id: string): string {
  // brand-ok — opaque snapshot id
  return `${SNAPSHOT_DIR}/${id}.json`;
}

export function manifestFlatPath(id: string): string {
  // brand-ok — opaque snapshot id
  return `${SNAPSHOT_DIR}/${id}.txt`;
}

export function formatFlatManifest(m: SnapshotManifest): string {
  const parts = [
    `scope=${m.scope}`,
    `id=${m.id}`,
    `capturedAt=${m.capturedAt}`,
    `commit=${m.commit.slice(0, 12)}`,
    `branch=${m.branch}`,
    `files=${m.fileCount}`,
    `status=${m.metadata.status ?? 'unknown'}`,
  ];
  for (const key of [
    'mae',
    'rmse',
    'bias',
    'within5Pct',
    'quality',
    'schemaVersion',
    'totalChanges',
    'raises',
    'errors',
    'warnings',
  ]) {
    if (m.metadata[key] != null) parts.push(`${key}=${m.metadata[key]}`);
  }
  return parts.join(' ') + '\n';
}

async function writeManifest(manifest: SnapshotManifest): Promise<void> {
  await Bun.$`mkdir -p ${SNAPSHOT_DIR}`.quiet();
  await write(manifestJsonPath(manifest.id), JSON.stringify(manifest, null, 2));
  await write(manifestFlatPath(manifest.id), formatFlatManifest(manifest));
  const existing = await file(INDEX_PATH)
    .text()
    .catch(() => '');
  await write(INDEX_PATH, existing + JSON.stringify(manifest) + '\n');
}

export async function readSnapshotIndex(): Promise<SnapshotManifest[]> {
  const text = await file(INDEX_PATH)
    .text()
    .catch(() => '');
  if (!text.trim()) return [];
  return text
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line) as SnapshotManifest);
}

export function matchesGrep(m: SnapshotManifest, pattern: string): boolean {
  const scopeEq = pattern.match(/^scope=(\w+)$/);
  if (scopeEq) return m.scope === scopeEq[1];

  const numCmp = pattern.match(/^(\w+)(>=|<=|>|<)(-?\d+\.?\d*)$/);
  if (numCmp) {
    const [, key, op, valStr] = numCmp;
    const target = Number(valStr);
    const raw = m.metadata[key!];
    if (raw == null) return false;
    const n = Number(raw);
    if (Number.isNaN(n)) return false;
    switch (op) {
      case '>':
        return n > target;
      case '<':
        return n < target;
      case '>=':
        return n >= target;
      case '<=':
        return n <= target;
      default:
        return false;
    }
  }

  const flat = formatFlatManifest(m).trim();
  if (flat.includes(pattern)) return true;
  return JSON.stringify(m).includes(pattern);
}

function extractPredictionMetadata(
  data: Record<string, unknown>,
  meta: Record<string, string>
): void {
  const acc = data.accuracy as Record<string, number> | undefined;
  const diag = data.diagnostics as Record<string, number> | undefined;
  if (data.schemaVersion != null) meta.schemaVersion = String(data.schemaVersion);
  if (data.quality != null) meta.quality = String(data.quality);
  if (acc?.mae != null) meta.mae = String(acc.mae);
  if (acc?.rmse != null) meta.rmse = String(acc.rmse);
  if (acc?.bias != null) meta.bias = String(acc.bias);
  if (acc?.n != null) meta.n = String(acc.n);
  if (diag?.within5Pct != null) meta.within5Pct = String(diag.within5Pct);
  if (diag?.trend != null) meta.trend = String(diag.trend);
}

function extractLimitsMetadata(data: Record<string, unknown>, meta: Record<string, string>): void {
  for (const key of [
    'total',
    'raises',
    'decreases',
    'netDelta',
    'avgScore',
    'uniquePartners',
    'uniqueSportsbooks',
    'predictions',
    'backfilled',
  ]) {
    if (data[key] != null) meta[key === 'total' ? 'totalChanges' : key] = String(data[key]);
  }
}

function extractPortalMetadata(data: Record<string, unknown>, meta: Record<string, string>): void {
  if (data.generatedAt != null) meta.generatedAt = String(data.generatedAt);
  const pred = data.prediction as { coverage?: { mae?: number; n?: number } } | undefined;
  if (pred?.coverage?.mae != null) meta.mae = String(pred.coverage.mae);
  if (pred?.coverage?.n != null) meta.predictionN = String(pred.coverage.n);
}

async function fetchAsset(url: string, destPath: string): Promise<boolean> {
  const resp = await fetch(url);
  if (!resp.ok) {
    warn(`${url}: ${resp.status}`);
    return false;
  }
  await write(destPath, await resp.text());
  return true;
}

async function captureGapsReport(
  id: string // brand-ok — opaque snapshot id
): Promise<{ path: string; data: Record<string, unknown> }> {
  const report = await runPublicDiscovery();
  const path = `${SNAPSHOT_DIR}/${id}/discovery.json`;
  await write(path, JSON.stringify(report, null, 2));
  return {
    path,
    data: {
      errors: report.summary.errors,
      warnings: report.summary.warnings,
      total: report.summary.total,
    },
  };
}

async function copyLocalAssets(
  id: string, // brand-ok — opaque snapshot id
  paths: string[] | undefined,
  captured: string[]
): Promise<void> {
  if (!paths?.length) return;
  const root = repoRoot();
  for (const rel of paths) {
    const src = resolvePath(root, rel);
    const f = Bun.file(src);
    if (!(await f.exists())) {
      warn(`Local asset missing: ${rel}`);
      continue;
    }
    const base = rel.split('/').pop() ?? 'asset';
    const dest = `${SNAPSHOT_DIR}/${id}/local-${base}`;
    await write(dest, f);
    captured.push(dest);
    console.log(`     ✓ local ${rel}`);
  }
}

/** Capture a scope-aware snapshot (#16–#19). */
export async function runSnapshot(opts: SnapshotRunOptions): Promise<SnapshotManifest | null> {
  const scope = opts.scope;
  const baseUrl = opts.baseUrl ?? DEFAULT_SNAPSHOT_BASE;
  const dryRun = opts.dryRun ?? false;
  const config = scopeConfigs[scope];
  const gitInfo = await getGitInfo();
  const id = generateId(scope);
  const timestamp = isoNow();

  const manifest: SnapshotManifest = {
    id,
    scope,
    reportType: config.manifestExtra.reportType ?? scope,
    capturedAt: timestamp,
    commit: gitInfo.commit,
    branch: gitInfo.branch,
    bunVersion: Bun.version,
    baseUrl,
    fileCount: 0,
    files: [],
    metadata: { status: 'pending' },
  };

  console.log(`\n  📸 Snapshot — ${config.label} (scope=${scope})`);
  console.log(`     ID: ${id}`);
  console.log(`     Base: ${baseUrl}`);
  console.log(`     Git: ${gitInfo.commit.slice(0, 8)} on ${gitInfo.branch}\n`);

  if (dryRun) {
    console.log('  🔍 DRY RUN — would capture:');
    if (scope === 'gaps') {
      console.log('     Report: runPublicDiscovery() → discovery.json');
    } else {
      console.log(
        `     Report: ${resolveSnapshotUrl(baseUrl, config.reportPath)} (${config.reportKind})`
      );
    }
    for (const asset of config.assetPaths) {
      console.log(`     Asset:  ${resolveSnapshotUrl(baseUrl, asset)}`);
    }
    for (const local of config.localAssets ?? []) {
      console.log(`     Local:  ${local}`);
    }
    console.log(`     Flat:   ${manifestFlatPath(id)}`);
    console.log('');
    return null;
  }

  const capturedFiles: string[] = [];

  if (scope === 'gaps') {
    try {
      const { path, data } = await captureGapsReport(id);
      capturedFiles.push(path);
      manifest.metadata.status = 'ok';
      manifest.metadata.errors = String(data.errors ?? 0);
      manifest.metadata.warnings = String(data.warnings ?? 0);
      manifest.metadata.total = String(data.total ?? 0);
      console.log(`     ✓ discovery.json (${data.total} findings)`);
    } catch (e) {
      manifest.metadata.status = 'error';
      manifest.metadata.error = e instanceof Error ? e.message : String(e);
      warn(`Gaps discovery failed: ${manifest.metadata.error}`);
    }
  } else {
    const reportUrl = resolveSnapshotUrl(baseUrl, config.reportPath);
    console.log(`  Fetching: ${reportUrl}`);
    try {
      const resp = await fetch(reportUrl);
      manifest.metadata.statusCode = String(resp.status);
      if (resp.ok) {
        const ext = config.reportKind === 'html' ? 'html' : 'json';
        const reportPath = `${SNAPSHOT_DIR}/${id}/report.${ext}`;
        const body = await resp.text();
        await write(reportPath, body);
        capturedFiles.push(reportPath);
        manifest.metadata.status = 'ok';

        if (config.reportKind === 'json') {
          const data = JSON.parse(body) as Record<string, unknown>;
          if (scope === 'limits') extractLimitsMetadata(data, manifest.metadata);
          if (scope === 'portal') extractPortalMetadata(data, manifest.metadata);
        }
        console.log(`     ✓ ${resp.status} report.${ext}`);
      } else {
        manifest.metadata.status = 'error';
        warn(`Report returned ${resp.status}`);
      }
    } catch (e) {
      manifest.metadata.status = 'error';
      manifest.metadata.error = e instanceof Error ? e.message : String(e);
      warn(`Fetch failed: ${manifest.metadata.error}`);
    }
  }

  for (const assetPath of config.assetPaths) {
    const url = resolveSnapshotUrl(baseUrl, assetPath);
    const slug = assetPath.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-|-$/g, '');
    const ext = assetPath.split('.').pop() ?? 'bin';
    const dest = `${SNAPSHOT_DIR}/${id}/asset-${slug}.${ext}`;
    try {
      if (await fetchAsset(url, dest)) {
        capturedFiles.push(dest);
        console.log(`     ✓ ${assetPath}`);
        if (scope === 'prediction' && assetPath.endsWith('summary.json')) {
          const data = JSON.parse(await Bun.file(dest).text()) as Record<string, unknown>;
          extractPredictionMetadata(data, manifest.metadata);
        }
      }
    } catch (e) {
      warn(`Asset ${assetPath}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  await copyLocalAssets(id, config.localAssets, capturedFiles);

  manifest.files = capturedFiles;
  manifest.fileCount = capturedFiles.length;
  if (manifest.metadata.status === 'pending') {
    manifest.metadata.status = capturedFiles.length > 0 ? 'ok' : 'error';
  }

  await writeManifest(manifest);
  console.log(`\n  ✅ Snapshot ${id}: ${capturedFiles.length} files`);
  console.log(`  📝 ${manifestJsonPath(id)}`);
  console.log(`  📝 ${manifestFlatPath(id)}\n`);

  return manifest;
}

export async function listSnapshots(opts: SnapshotFilterOptions = {}): Promise<void> {
  const index = await readSnapshotIndex();
  if (index.length === 0) {
    console.log('  No snapshots. Run: portal-cli snapshot run --scope prediction');
    return;
  }

  let filtered = index;
  if (opts.scope) filtered = filtered.filter(m => m.scope === opts.scope);
  if (opts.grep) filtered = filtered.filter(m => matchesGrep(m, opts.grep!));

  if (filtered.length === 0) {
    console.log(`  No snapshots matching scope=${opts.scope ?? '*'}, grep=${opts.grep ?? '*'}`);
    return;
  }

  const rows = filtered.map(m => [
    m.scope,
    m.id.slice(0, 22),
    m.capturedAt.slice(0, 19),
    String(m.fileCount),
    m.metadata?.status ?? '?',
    m.metadata?.mae ? `mae=${m.metadata.mae}` : '',
    m.metadata?.raises ? `↑${m.metadata.raises}` : '',
    m.commit.slice(0, 8),
  ]);

  const headers = ['Scope', 'ID', 'Captured', 'Files', 'Status', 'Metrics', 'Raise', 'Commit'];
  const widths = headers.map((h, i) =>
    Math.max(h.length, ...rows.map(r => stringWidth(r[i] ?? '')))
  );
  const border = (l: string, j: string, r: string) =>
    l + widths.map(w => '─'.repeat(w + 2)).join(j) + r;
  const line = (cells: string[]) =>
    '│ ' + cells.map((c, i) => pad(c, widths[i]!)).join(' │ ') + ' │';

  console.log(`\n  📋 Snapshots (${filtered.length})`);
  console.log(border('┌', '┬', '┐'));
  console.log(line(headers));
  console.log(border('├', '┼', '┤'));
  for (const r of rows) console.log(line(r));
  console.log(border('└', '┴', '┘'));
  console.log('');
}

/** Print manifest paths for snapshots matching query (script-friendly). */
export async function grepSnapshots(
  query: string,
  opts: SnapshotFilterOptions = {}
): Promise<number> {
  const index = await readSnapshotIndex();
  let filtered = index.filter(m => matchesGrep(m, query));
  if (opts.scope) filtered = filtered.filter(m => m.scope === opts.scope);

  if (filtered.length === 0) {
    console.log('  No matches.');
    return 0;
  }

  for (const m of filtered) {
    console.log(manifestJsonPath(m.id));
    console.log(manifestFlatPath(m.id));
    for (const f of m.files) console.log(f);
  }
  return filtered.length;
}

export async function showLastSnapshot(opts: SnapshotFilterOptions = {}): Promise<void> {
  const index = await readSnapshotIndex();
  const filtered = opts.scope ? index.filter(m => m.scope === opts.scope) : index;
  if (filtered.length === 0) {
    console.log(`  No snapshots for scope=${opts.scope ?? '*'}`);
    return;
  }
  console.log(inspect(filtered[filtered.length - 1], { depth: 4, colors: true }));
}

export function showScopeConfig(scope?: SnapshotScopeName): void {
  const names = scope ? [scope] : (Object.keys(scopeConfigs) as SnapshotScopeName[]);
  for (const name of names) {
    const c = scopeConfigs[name];
    if (!c) continue;
    console.log(`\n  ${name} — ${c.label}`);
    console.log(`    report: ${c.reportPath || '(generated)'}`);
    console.log(`    kind:   ${c.reportKind}`);
    console.log(`    assets: ${c.assetPaths.length ? c.assetPaths.join(', ') : '(none)'}`);
    if (c.localAssets?.length) console.log(`    local:  ${c.localAssets.join(', ')}`);
  }
  console.log('');
}

async function readScopeMarker(startDir: string): Promise<SnapshotScopeName | null> {
  let dir = startDir;
  const root = repoRoot();
  for (let i = 0; i < 8; i++) {
    const marker = resolvePath(dir, SCOPE_MARKER);
    if (await Bun.file(marker).exists()) {
      const name = (await Bun.file(marker).text()).trim().split(/\s+/)[0] ?? '';
      if (isSnapshotScope(name)) return name;
    }
    if (dir === root || dir === '/') break;
    dir = resolvePath(dir, '..');
  }
  return null;
}

function detectScopeFromCwd(): SnapshotScopeName | null {
  const cwd = process.cwd();
  if (cwd.includes('prediction')) return 'prediction';
  if (cwd.includes('/portal')) return 'portal';
  if (cwd.includes('limits')) return 'limits';
  if (cwd.includes('audit') || cwd.includes('discovery')) return 'gaps';
  return null;
}

export async function resolveScope(explicit?: string): Promise<SnapshotScopeName> {
  if (explicit) {
    if (!isSnapshotScope(explicit)) {
      cliError(`Unknown scope: ${explicit}. Valid: ${Object.keys(scopeConfigs).join(', ')}`);
    }
    return explicit;
  }
  const marker = await readScopeMarker(process.cwd());
  if (marker) return marker;
  return detectScopeFromCwd() ?? 'prediction';
}

export type ParsedSnapshotFlags = {
  scope?: string;
  baseUrl: string;
  dryRun: boolean;
  positional: string[];
};

export function parseSnapshotFlags(argv: string[]): ParsedSnapshotFlags {
  const positional: string[] = [];
  let scope: string | undefined;
  let baseUrl = DEFAULT_SNAPSHOT_BASE;
  let dryRun = false;

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    if (a === '--scope') {
      scope = argv[++i];
      continue;
    }
    if (a === '--base') {
      baseUrl = argv[++i] ?? DEFAULT_SNAPSHOT_BASE;
      continue;
    }
    if (a === '--dry-run') {
      dryRun = true;
      continue;
    }
    if (a.startsWith('-')) continue;
    positional.push(a);
  }

  return { scope, baseUrl, dryRun, positional };
}

export async function ensureSnapshotDir(): Promise<void> {
  await Bun.$`mkdir -p ${SNAPSHOT_DIR}`.quiet();
}

export { scopeConfigs, DEFAULT_SNAPSHOT_BASE } from './snapshot-scopes.ts';
