#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/glob
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
/**
 * Scope-aware data-plane snapshotter.
 *
 * Captures report metadata, downloads assets, writes manifests + index
 * for a given scope (prediction / portal / gaps / limits).
 *
 *   bun run snapshot:data-plane --scope limits
 *   bun run snapshot:data-plane --scope limits --list
 *   bun run snapshot:data-plane --scope limits --last
 *   bun run snapshot:data-plane --scope limits --grep "score>0.7"
 *   bun run snapshot:data-plane --dry-run
 *   bun run snapshot:data-plane --help
 */
import { Glob, inspect, stringWidth, sleep, which, write, file } from 'bun';

// ── Scope configs ─────────────────────────────────────────────────────────
export const scopeConfigs: Record<
  string,
  {
    reportUrl: string;
    assetPaths: string[];
    manifestExtra: Record<string, string>;
    label: string;
  }
> = {
  prediction: {
    reportUrl: 'http://localhost:3000/registry/prediction/report/',
    assetPaths: [
      'summary.json',
      'assets/histogram.svg',
      'assets/rolling.svg',
      'assets/stability.svg',
    ],
    manifestExtra: { reportType: 'prediction' },
    label: 'Prediction accuracy report',
  },
  portal: {
    reportUrl: 'http://localhost:3000/registry/portal/report/',
    assetPaths: ['summary.json', 'assets/portal-heatmap.png'],
    manifestExtra: { reportType: 'portal' },
    label: 'Portal health report',
  },
  gaps: {
    reportUrl: 'http://localhost:3000/registry/gaps/report/',
    assetPaths: ['summary.json', 'assets/gap-heatmap.svg'],
    manifestExtra: { reportType: 'gaps' },
    label: 'Coverage gap analysis',
  },
  limits: {
    reportUrl: 'http://localhost:3000/api/limits/summary?format=json',
    assetPaths: ['/api/limits/analyze', '/api/limits/predictions'],
    manifestExtra: { reportType: 'limits' },
    label: 'Limit changes snapshot',
  },
};

export type SnapshotManifest = {
  id: string; // brand-ok — opaque snapshot id
  scope: string;
  reportType: string;
  capturedAt: string;
  commit: string;
  branch: string;
  bunVersion: string;
  fileCount: number;
  files: string[];
  metadata: Record<string, string>;
};

const SNAPSHOT_DIR = 'snapshots';
const INDEX_PATH = `${SNAPSHOT_DIR}/index.jsonl`;
const HELP_TEXT = `Scope-aware data-plane snapshotter

  bun run snapshot:data-plane [opts]

  --scope <name>   Which scope to snapshot (prediction|portal|gaps|limits)
  --dry-run        Show what would be captured without writing
  --list           List all snapshots for scope
  --last           Show most recent snapshot manifest
  --grep <filter>  Filter snapshots by pattern (e.g. "score>0.7", "scope=limits")
  --help           This message
`;

// ── Helpers ───────────────────────────────────────────────────────────────
function pad(s: string, w: number): string {
  return s + ' '.repeat(Math.max(0, w - stringWidth(s)));
}

function error(msg: string): never {
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
  const hasGit = await which('git');
  if (!hasGit) return { commit: 'unknown', branch: 'unknown' };
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

// ── Manifest operations ───────────────────────────────────────────────────
function generateId(scope: string): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 6);
  return `${scope}-${ts}-${rand}`;
}

function manifestPath(id: string): string {
  // brand-ok — opaque snapshot id
  return `${SNAPSHOT_DIR}/${id}.json`;
}

async function writeManifest(manifest: SnapshotManifest): Promise<void> {
  // Ensure directory
  await write(SNAPSHOT_DIR, '').catch(() => {}); // create dir
  // Write individual manifest
  await write(manifestPath(manifest.id), JSON.stringify(manifest, null, 2));
  // Append to index
  const indexLine = JSON.stringify(manifest) + '\n';
  const existing = await file(INDEX_PATH)
    .text()
    .catch(() => '');
  await write(INDEX_PATH, existing + indexLine);
}

async function readIndex(): Promise<SnapshotManifest[]> {
  const text = await file(INDEX_PATH)
    .text()
    .catch(() => '');
  if (!text.trim()) return [];
  return text
    .split('\n')
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

// ── Scope-aware capture ───────────────────────────────────────────────────
async function captureScope(scope: string, dryRun: boolean): Promise<SnapshotManifest | null> {
  const config = scopeConfigs[scope];
  if (!config) error(`Unknown scope: ${scope}. Valid: ${Object.keys(scopeConfigs).join(', ')}`);

  const gitInfo = await getGitInfo();
  const id = generateId(scope);
  const timestamp = isoNow();

  const manifest: SnapshotManifest = {
    id,
    scope,
    reportType: config.manifestExtra.reportType,
    capturedAt: timestamp,
    commit: gitInfo.commit,
    branch: gitInfo.branch,
    bunVersion: Bun.version,
    fileCount: 0,
    files: [],
    metadata: {},
  };

  console.log(`\n  📸 Snapshot — ${config.label} (scope=${scope})`);
  console.log(`     ID: ${id}`);
  console.log(`     Git: ${gitInfo.commit.slice(0, 8)} on ${gitInfo.branch}`);
  console.log(`     Bun: ${Bun.version}\n`);

  if (dryRun) {
    console.log(`  🔍 DRY RUN — would capture:`);
    console.log(`     Report: ${config.reportUrl}`);
    for (const asset of config.assetPaths) {
      console.log(`     Asset:  ${asset}`);
    }
    console.log('');
    return null;
  }

  // Capture report data
  const capturedFiles: string[] = [];
  console.log(`  Fetching: ${config.reportUrl}`);
  try {
    const resp = await fetch(config.reportUrl);
    if (resp.ok) {
      const data = await resp.json();
      const reportPath = `${SNAPSHOT_DIR}/${id}/report.json`;
      await write(reportPath, JSON.stringify(data, null, 2));
      capturedFiles.push(reportPath);
      manifest.metadata.status = 'ok';
      manifest.metadata.statusCode = String(resp.status);

      // Extract summary metrics from response
      if (data.total != null) manifest.metadata.totalChanges = String(data.total);
      if (data.raises != null) manifest.metadata.raises = String(data.raises);
      if (data.decreases != null) manifest.metadata.decreases = String(data.decreases);
      if (data.netDelta != null) manifest.metadata.netDelta = String(data.netDelta);
      if (data.avgScore != null) manifest.metadata.avgScore = String(data.avgScore);
      if (data.uniquePartners != null) manifest.metadata.partners = String(data.uniquePartners);
      if (data.uniqueSportsbooks != null) manifest.metadata.books = String(data.uniqueSportsbooks);
      if (data.predictions != null) manifest.metadata.predictions = String(data.predictions);
      if (data.backfilled != null) manifest.metadata.backfilled = String(data.backfilled);

      console.log(`     ✓ ${resp.status} — ${Object.keys(data).length} keys`);
    } else {
      manifest.metadata.status = 'error';
      manifest.metadata.statusCode = String(resp.status);
      warn(`Report returned ${resp.status}`);
    }
  } catch (e) {
    manifest.metadata.status = 'error';
    manifest.metadata.error = e instanceof Error ? e.message : String(e);
    warn(`Fetch failed: ${e instanceof Error ? e.message : e}`);
  }

  // Capture additional assets
  for (const asset of config.assetPaths) {
    const assetUrl = asset.startsWith('http')
      ? asset
      : `${new URL(config.reportUrl).origin}${asset}`;
    try {
      const resp = await fetch(assetUrl);
      if (resp.ok) {
        const ext = asset.split('.').pop() ?? 'json';
        const assetPath = `${SNAPSHOT_DIR}/${id}/asset-${asset.replace(/[^a-zA-Z0-9]/g, '-')}.${ext}`;
        const text = await resp.text();
        await write(assetPath, text);
        capturedFiles.push(assetPath);
        console.log(`     ✓ ${asset}`);
      } else {
        warn(`Asset ${asset}: ${resp.status}`);
      }
    } catch (e) {
      warn(`Asset ${asset}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // Analytics endpoint
  if (scope === 'limits') {
    try {
      const resp = await fetch('http://localhost:3000/api/limits/analyze');
      if (resp.ok) {
        const data = await resp.json();
        const path = `${SNAPSHOT_DIR}/${id}/analyze.json`;
        await write(path, JSON.stringify(data, null, 2));
        capturedFiles.push(path);
        if (data.bySportsbook?.length != null)
          manifest.metadata.booksAnalyzed = String(data.bySportsbook.length);
        if (data.regulatoryCorrelations?.length != null)
          manifest.metadata.regulatoryMatches = String(data.regulatoryCorrelations.length);
        console.log(`     ✓ /api/limits/analyze`);
      }
    } catch {}
  }

  manifest.files = capturedFiles;
  manifest.fileCount = capturedFiles.length;

  // Write manifest
  await writeManifest(manifest);
  console.log(`\n  ✅ Snapshot ${id}: ${capturedFiles.length} files captured\n`);

  return manifest;
}

// ── List / Grep ───────────────────────────────────────────────────────────
async function listSnapshots(scope?: string, grep?: string): Promise<void> {
  const index = await readIndex();
  if (index.length === 0) {
    console.log('  No snapshots found. Run: bun run snapshot:data-plane --scope limits');
    return;
  }

  let filtered = index;
  if (scope) filtered = filtered.filter(m => m.scope === scope);
  if (grep) filtered = filtered.filter(m => JSON.stringify(m).includes(grep));

  if (filtered.length === 0) {
    console.log(`  No snapshots matching scope=${scope ?? '*'}, grep=${grep ?? '*'}`);
    return;
  }

  const rows = filtered.map(m => [
    m.scope,
    m.id.slice(0, 20),
    m.capturedAt.slice(0, 19),
    String(m.fileCount),
    m.metadata?.status ?? '?',
    m.metadata?.raises ? `🚀${m.metadata.raises}` : '',
    m.metadata?.decreases ? `⬇${m.metadata.decreases}` : '',
    m.commit.slice(0, 8),
  ]);

  const headers = ['Scope', 'ID', 'Captured', 'Files', 'Status', 'Raise', 'Dec', 'Commit'];
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

async function showLast(scope?: string): Promise<void> {
  const index = await readIndex();
  let filtered = scope ? index.filter(m => m.scope === scope) : index;
  if (filtered.length === 0) {
    console.log(`  No snapshots for scope=${scope ?? '*'}`);
    return;
  }
  const last = filtered[filtered.length - 1]!;
  console.log(inspect(last, { depth: 4, colors: true }));
}

// ── Auto-detect scope from directory ──────────────────────────────────────
function detectScopeFromCwd(): string | null {
  const cwd = process.cwd();
  for (const [key, config] of Object.entries(scopeConfigs)) {
    if (cwd.includes(key) || cwd.includes(config.reportType)) return key;
  }
  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────
async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.length === 0) {
    console.log(HELP_TEXT);
    console.log(`  Available scopes: ${Object.keys(scopeConfigs).join(', ')}`);
    return;
  }

  const scopeIdx = args.indexOf('--scope');
  const scope = scopeIdx >= 0 ? args[scopeIdx + 1] : (detectScopeFromCwd() ?? 'limits');
  const dryRun = args.includes('--dry-run');
  const listMode = args.includes('--list');
  const lastMode = args.includes('--last');
  const grepIdx = args.indexOf('--grep');
  const grep = grepIdx >= 0 ? args[grepIdx + 1] : undefined;

  if (listMode) {
    await listSnapshots(scope, grep);
    return;
  }

  if (lastMode) {
    await showLast(scope);
    return;
  }

  // Ensure snapshots directory exists
  await write(SNAPSHOT_DIR, '').catch(() => {});

  const manifest = await captureScope(scope, dryRun);
  if (manifest) {
    console.log(`  📝 Manifest: ${manifestPath(manifest.id)}`);
  }
}

if (import.meta.main) main();
