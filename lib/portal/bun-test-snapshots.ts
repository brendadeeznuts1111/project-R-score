// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/test/snapshots — toMatchSnapshot / --update-snapshots / Bun Snapshot v1
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn contract catalog
/**
 * Bun:test snapshot SSOT — inventory of reviewed git snapshots under tests/__snapshots__/.
 *
 * Not the same as portal data-plane captures in gitignored `snapshots/`
 * (`portal-cli snapshot run`). This module only tracks committed `bun:test` snaps.
 *
 *   bun run check:snapshots
 *   bun run test:snapshots
 *   bun run test:snapshots:update   # file-scoped only — never repo-wide -u
 *   bun tools/bun-test-snapshots.ts --list|--check|--test|--update [--id capability-map]
 *
 * Orphan snap files (no matching test) fail --check. Intentional cleanup:
 *   bun tools/bun-test-snapshots.ts --prune-orphans
 */

export const TEST_SNAPSHOTS_DIR_REL = 'tests/__snapshots__' as const;
export const BUN_SNAPSHOT_HEADER = '// Bun Snapshot v1, https://bun.sh/docs/test/snapshots';

export type TestSnapshotSuiteId =
  | 'capability-map'
  | 'partner-cli'
  | 'vault-health'
  | 'console-depth'
  | 'failure-report'
  | 'identity-board'
  | 'limits-e2e'
  | 'table-format';

export type TestSnapshotSuite = {
  /** Stable catalog id. */
  id: TestSnapshotSuiteId;
  /** Human label. */
  label: string;
  /** Test file path relative to repo root. */
  testRel: string;
  /** Snapshot file path relative to repo root (Bun co-locates under tests/__snapshots__/). */
  snapRel: string;
  /** Why this suite is snapshotted (SSOT purpose). */
  purpose: string;
  /** Optional package script alias that runs/updates this suite. */
  updateScript?: string;
  /** Optional CLI entry that wraps bun test --update-snapshots. */
  cli?: string;
};

/**
 * Canonical catalog of committed bun:test snapshot suites.
 * Keep in sync with tests that call `toMatchSnapshot()` under tests/.
 */
export const TEST_SNAPSHOT_SUITES: readonly TestSnapshotSuite[] = [
  {
    id: 'capability-map',
    label: 'Capability map subset',
    testRel: 'tests/capability-map-subset.test.ts',
    snapRel: 'tests/__snapshots__/capability-map-subset.test.ts.snap',
    purpose:
      'AGENTS grounded capability matrix drift gate (schema v3, summary, minBun/source). Bake first: bake:capabilities.',
    updateScript: 'bake:capabilities:update',
    cli: 'portal-cli capabilities health --update',
  },
  {
    id: 'partner-cli',
    label: 'Partner CLI validators',
    testRel: 'tests/partner-cli-snapshots.test.ts',
    snapRel: 'tests/__snapshots__/partner-cli-snapshots.test.ts.snap',
    purpose:
      'Pinned Bun runtime provenance and typed Bun.spawn stdout/stderr contracts for partner validators.',
    updateScript: 'test:partner-cli:snapshots:update',
  },
  {
    id: 'vault-health',
    label: 'Vault health inventory',
    testRel: 'tests/vault-health.test.ts',
    snapRel: 'tests/__snapshots__/vault-health.test.ts.snap',
    purpose:
      'env→vault inventory + report-shape SSOT (offline; no pass-cli). Live bake separate: vault:health:bake.',
    updateScript: 'vault:health:update',
    cli: 'portal-cli vault health --update',
  },
  {
    id: 'console-depth',
    label: 'Console depth inspect',
    testRel: 'tests/console-depth.test.ts',
    snapRel: 'tests/__snapshots__/console-depth.test.ts.snap',
    purpose: 'Bun.inspect / table formatting contract (scoped update only).',
  },
  {
    id: 'failure-report',
    label: 'Failure report shape',
    testRel: 'tests/failure-report.test.ts',
    snapRel: 'tests/__snapshots__/failure-report.test.ts.snap',
    purpose: 'test-failures parser report shape.',
  },
  {
    id: 'identity-board',
    label: 'Identity board',
    testRel: 'tests/identity-board.test.ts',
    snapRel: 'tests/__snapshots__/identity-board.test.ts.snap',
    purpose: 'identity-board normalized report shape.',
  },
  {
    id: 'limits-e2e',
    label: 'Limits E2E chart SVG',
    testRel: 'tests/limits-e2e.test.ts',
    snapRel: 'tests/__snapshots__/limits-e2e.test.ts.snap',
    purpose: 'limits chart SVG generation contract.',
  },
  {
    id: 'table-format',
    label: 'Table format',
    testRel: 'tests/table-format.test.ts',
    snapRel: 'tests/__snapshots__/table-format.test.ts.snap',
    purpose: 'formatTable compact/border output stability.',
  },
] as const;

export type SnapFileInventory = {
  rel: string;
  exists: boolean;
  headerOk: boolean;
  entryCount: number;
  /** Export keys from Bun Snapshot v1 file. */
  keys: string[];
};

export type TestSnapshotCheckFinding = {
  severity: 'error' | 'warn' | 'info';
  code:
    | 'orphan-snap'
    | 'missing-snap'
    | 'missing-test'
    | 'bad-header'
    | 'uncatalogued-toMatchSnapshot'
    | 'empty-snap'
    | 'entry-count-mismatch'
    | 'ok';
  path: string;
  detail: string;
};

export type TestSnapshotCheckReport = {
  kind: 'test-snapshots-check';
  generatedAt: string;
  suiteCount: number;
  snapDir: string;
  findings: TestSnapshotCheckFinding[];
  ok: boolean;
  inventories: SnapFileInventory[];
};

/** Parse Bun Snapshot v1 export keys. */
export function parseSnapExportKeys(snapText: string): string[] {
  const keys: string[] = [];
  const re = /^exports\[`([^`]+)`\]\s*=/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(snapText)) !== null) {
    if (m[1]) keys.push(m[1]);
  }
  return keys;
}

export function isBunSnapshotHeader(snapText: string): boolean {
  const first = snapText.split(/\r?\n/, 1)[0]?.trim() ?? '';
  return first.startsWith('// Bun Snapshot v1');
}

export async function inventorySnapFile(root: string, rel: string): Promise<SnapFileInventory> {
  const abs = `${root.replace(/\/$/, '')}/${rel}`;
  const f = Bun.file(abs);
  if (!(await f.exists())) {
    return { rel, exists: false, headerOk: false, entryCount: 0, keys: [] };
  }
  const text = await f.text();
  const keys = parseSnapExportKeys(text);
  return {
    rel,
    exists: true,
    headerOk: isBunSnapshotHeader(text),
    entryCount: keys.length,
    keys,
  };
}

/**
 * Discover all *.snap under tests/__snapshots__ (and any nested __snapshots__ under tests/).
 */
export async function listSnapFilesOnDisk(root: string): Promise<string[]> {
  const { Glob } = await import('bun');
  const glob = new Glob('**/__snapshots__/**/*.snap');
  const out: string[] = [];
  for await (const path of glob.scan({ cwd: root, onlyFiles: true })) {
    // normalize to repo-relative posix
    const rel = path.replace(/\\/g, '/');
    if (rel.startsWith('tests/')) out.push(rel);
  }
  return out.sort();
}

/** Tests under tests/ that reference toMatchSnapshot (excludes inline-only). */
export async function listTestsWithFileSnapshots(root: string): Promise<string[]> {
  const { Glob } = await import('bun');
  const glob = new Glob('tests/**/*.test.ts');
  const out: string[] = [];
  for await (const path of glob.scan({ cwd: root, onlyFiles: true })) {
    const rel = path.replace(/\\/g, '/');
    const text = await Bun.file(`${root}/${rel}`).text();
    // Ignore matcher mentions inside string literals / comments (meta tests).
    const code = text
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/\/\/.*$/gm, '')
      .replace(/(['"`])(?:\\.|(?!\1).)*\1/g, '""');
    if (/\.toMatchSnapshot\s*\(/.test(code) || /\.toThrowErrorMatchingSnapshot\s*\(/.test(code)) {
      out.push(rel);
    }
  }
  return out.sort();
}

function suiteBySnapRel(): Map<string, TestSnapshotSuite> {
  return new Map(TEST_SNAPSHOT_SUITES.map(s => [s.snapRel, s]));
}

function suiteByTestRel(): Map<string, TestSnapshotSuite> {
  return new Map(TEST_SNAPSHOT_SUITES.map(s => [s.testRel, s]));
}

/** Count file-level toMatchSnapshot / toThrowErrorMatchingSnapshot calls in a test source. */
export function countMatchSnapshotCalls(testSource: string): number {
  const a = testSource.match(/\.toMatchSnapshot\s*\(/g)?.length ?? 0;
  const b = testSource.match(/\.toThrowErrorMatchingSnapshot\s*\(/g)?.length ?? 0;
  return a + b;
}

/**
 * Integrity check: catalog ↔ disk ↔ tests that call toMatchSnapshot.
 * Does not upload or touch R2 — bun:test snaps are git SSOT only.
 */
export async function checkTestSnapshots(
  root: string,
  generatedAt = new Date().toISOString()
): Promise<TestSnapshotCheckReport> {
  const findings: TestSnapshotCheckFinding[] = [];
  const inventories: SnapFileInventory[] = [];
  const onDisk = await listSnapFilesOnDisk(root);
  const testsWithSnap = await listTestsWithFileSnapshots(root);
  const bySnap = suiteBySnapRel();
  const byTest = suiteByTestRel();

  for (const suite of TEST_SNAPSHOT_SUITES) {
    const testExists = await Bun.file(`${root}/${suite.testRel}`).exists();
    if (!testExists) {
      findings.push({
        severity: 'error',
        code: 'missing-test',
        path: suite.testRel,
        detail: `catalog suite ${suite.id} points at missing test file`,
      });
    }
    const inv = await inventorySnapFile(root, suite.snapRel);
    inventories.push(inv);
    if (!inv.exists) {
      findings.push({
        severity: 'error',
        code: 'missing-snap',
        path: suite.snapRel,
        detail: `catalog suite ${suite.id}: snap missing — run: bun test ${suite.testRel} --update-snapshots`,
      });
      continue;
    }
    if (!inv.headerOk) {
      findings.push({
        severity: 'error',
        code: 'bad-header',
        path: suite.snapRel,
        detail: `expected Bun Snapshot v1 header (${BUN_SNAPSHOT_HEADER})`,
      });
    }
    if (inv.entryCount === 0) {
      findings.push({
        severity: 'error',
        code: 'empty-snap',
        path: suite.snapRel,
        detail: `suite ${suite.id}: snap file has zero exports`,
      });
    } else {
      findings.push({
        severity: 'info',
        code: 'ok',
        path: suite.snapRel,
        detail: `${suite.id}: ${inv.entryCount} entr${inv.entryCount === 1 ? 'y' : 'ies'}`,
      });
    }
    // Entry-count vs toMatchSnapshot calls (dead/orphan keys or missing snaps inside file)
    if (testExists && inv.exists) {
      const src = await Bun.file(`${root}/${suite.testRel}`).text();
      const calls = countMatchSnapshotCalls(src);
      if (calls !== inv.entryCount) {
        findings.push({
          severity: 'error',
          code: 'entry-count-mismatch',
          path: suite.snapRel,
          detail: `suite ${suite.id}: snap entries=${inv.entryCount} but toMatchSnapshot calls=${calls} in ${suite.testRel} — run: bun test ${suite.testRel} --update-snapshots`,
        });
      }
    }
  }

  for (const rel of onDisk) {
    if (!bySnap.has(rel)) {
      findings.push({
        severity: 'error',
        code: 'orphan-snap',
        path: rel,
        detail:
          'snap file not in TEST_SNAPSHOT_SUITES catalog — add to lib/portal/bun-test-snapshots.ts or prune: bun tools/bun-test-snapshots.ts --prune-orphans',
      });
      inventories.push(await inventorySnapFile(root, rel));
    }
  }

  for (const rel of testsWithSnap) {
    if (!byTest.has(rel)) {
      findings.push({
        severity: 'warn',
        code: 'uncatalogued-toMatchSnapshot',
        path: rel,
        detail:
          'test uses toMatchSnapshot but is not in TEST_SNAPSHOT_SUITES — add a catalog entry so check:snapshots stays SSOT',
      });
    }
  }

  const ok = !findings.some(f => f.severity === 'error');
  return {
    kind: 'test-snapshots-check',
    generatedAt,
    suiteCount: TEST_SNAPSHOT_SUITES.length,
    snapDir: TEST_SNAPSHOTS_DIR_REL,
    findings,
    ok,
    inventories,
  };
}

/** Orphan snap paths (disk files not in catalog). */
export async function listOrphanSnapFiles(root: string): Promise<string[]> {
  const onDisk = await listSnapFilesOnDisk(root);
  const catalog = new Set(TEST_SNAPSHOT_SUITES.map(s => s.snapRel));
  return onDisk.filter(r => !catalog.has(r));
}

export function resolveSuite(idOrPath: string): TestSnapshotSuite | undefined {
  const q = idOrPath.trim();
  return (
    TEST_SNAPSHOT_SUITES.find(s => s.id === q) ||
    TEST_SNAPSHOT_SUITES.find(s => s.testRel === q || s.snapRel === q) ||
    TEST_SNAPSHOT_SUITES.find(s => s.testRel.endsWith(q) || s.snapRel.endsWith(q))
  );
}

/** Args for `bun test <files…> [-u]` — always file-scoped. */
export function bunTestArgsForSuites(
  suites: readonly TestSnapshotSuite[],
  update: boolean
): string[] {
  const files = suites.map(s => s.testRel);
  const args = ['test', ...files];
  if (update) args.push('-u');
  return args;
}
