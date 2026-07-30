// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/bundler/bytecode#with-standalone-executables — --format
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
/**
 * Harness report engine — collect, aggregate, and render grouped lint/guard findings.
 */
import { getBunDxEntry, mapRuleToCatalog, type FixTier } from '../../bun-dx-catalog.ts';
import { checkBunFirstCompliance } from '@factorywager/guards';
import { HARNESS_IGNORES, HARNESS_PATHS, STRICT_INVENTORY } from './rollout.ts';

export type HarnessIssue = {
  source: 'eslint' | 'guard';
  file: string;
  line: number;
  column?: number;
  severity: 'error' | 'warn';
  ruleId: string;
  catalogId?: string;
  fixTier?: FixTier;
  message: string;
  oneLiner?: string;
  docs?: string;
};

export type FileOffender = {
  file: string;
  count: number;
  errors: number;
  warnings: number;
  topCatalogId?: string;
  topCatalogCount: number;
  catalogCounts: Record<string, number>;
};

export type CatalogGroup = {
  catalogId: string;
  summary: string;
  fixTier?: FixTier;
  count: number;
  errors: number;
  warnings: number;
  docs?: string;
  oneLiner?: string;
  samples: Array<{ file: string; line: number; severity: 'error' | 'warn' }>;
};

export type DirectoryGroup = {
  directory: string;
  count: number;
  fileCount: number;
};

export type HarnessReport = {
  generatedAt: string;
  summary: {
    errors: number;
    warnings: number;
    filesWithIssues: number;
    totalHarnessFiles: number;
    strictInventoryCount: number;
  };
  worstOffenders: FileOffender[];
  byDirectory: DirectoryGroup[];
  byCatalog: CatalogGroup[];
  standardCatches: CatalogGroup[];
  promotionCandidates: string[];
  strictInventory: string[];
  issues: HarnessIssue[];
};

/** Same globs as rollout — keep report argv aligned with HARNESS_PATHS. */
export const HARNESS_ESLINT_GLOBS = HARNESS_PATHS;

/** Same ignores as rollout (tests, benches, d.ts, projects/). */
export const HARNESS_ESLINT_IGNORES = HARNESS_IGNORES;

type EslintJsonResult = {
  filePath: string;
  messages: Array<{
    ruleId: string | null;
    severity: number;
    message: string;
    line: number;
    column: number;
  }>;
};

function matchesIgnore(path: string, ignore: string): boolean {
  if (ignore.endsWith('/**')) {
    return path.startsWith(ignore.slice(0, -3));
  }
  if (ignore.startsWith('**/')) {
    const suffix = ignore.slice(3);
    return path.endsWith(suffix) || path.includes(`/${suffix}`);
  }
  return path === ignore;
}

export async function findHarnessFiles(repoRoot: string): Promise<string[]> {
  const files: string[] = [];
  for (const pattern of HARNESS_PATHS) {
    const glob = new Bun.Glob(pattern);
    for await (const path of glob.scan({ cwd: repoRoot, onlyFiles: true })) {
      if (HARNESS_IGNORES.some(ignore => matchesIgnore(path, ignore))) continue;
      files.push(path);
    }
  }
  return [...new Set(files)].sort();
}

function toRepoRelative(filePath: string, repoRoot: string): string {
  const norm = filePath.replace(/\\/g, '/');
  const root = repoRoot.replace(/\\/g, '/').replace(/\/$/, '');
  if (norm.startsWith(`${root}/`)) return norm.slice(root.length + 1);
  if (!norm.startsWith('/')) return norm.replace(/^\.\//, '');

  const rootParts = root.split('/');
  const fileParts = norm.split('/');
  let i = 0;
  while (i < rootParts.length && i < fileParts.length && rootParts[i] === fileParts[i]) i++;
  return fileParts.slice(i).join('/').replace(/^\.\//, '');
}

const GUARD_SKIP_FILE_RE =
  /(?:^lib\/validation\/bun-first-|^docs\/BUN_MIGRATION|^config\/bun-dx-catalog\.ts$)/;

function enrichIssue(partial: Omit<HarnessIssue, 'oneLiner' | 'docs' | 'fixTier'>): HarnessIssue {
  const catalogId = partial.catalogId ?? mapRuleToCatalog(partial.ruleId, partial.message);
  const entry = catalogId ? getBunDxEntry(catalogId) : undefined;
  return {
    ...partial,
    catalogId,
    fixTier: entry?.fixTier,
    oneLiner: entry?.good,
    docs: entry?.docs,
  };
}

function issueKey(issue: HarnessIssue): string {
  return `${issue.file}:${issue.line}:${issue.catalogId ?? issue.ruleId}:${issue.source}`;
}

export async function collectEslintIssues(
  repoRoot: string,
  configPath = 'eslint.harness.config.ts'
): Promise<HarnessIssue[]> {
  const args = [
    'eslint',
    '--config',
    configPath,
    '--format',
    'json',
    ...HARNESS_ESLINT_GLOBS,
    ...HARNESS_ESLINT_IGNORES.flatMap(p => ['--ignore-pattern', p]),
  ];

  const proc = Bun.spawn(['bun', ...args], {
    cwd: repoRoot,
    stdout: 'pipe',
    stderr: 'pipe',
  });

  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);

  if (code !== 0 && !stdout.trim()) {
    throw new Error(`ESLint failed: ${stderr || `exit ${code}`}`);
  }

  let results: EslintJsonResult[] = [];
  try {
    results = JSON.parse(stdout) as EslintJsonResult[];
  } catch {
    throw new Error(`Failed to parse ESLint JSON: ${stdout.slice(0, 200)}`);
  }

  const issues: HarnessIssue[] = [];
  for (const result of results) {
    const file = toRepoRelative(result.filePath, repoRoot);
    for (const msg of result.messages) {
      if (!msg.ruleId) continue;
      issues.push(
        enrichIssue({
          source: 'eslint',
          file,
          line: msg.line,
          column: msg.column,
          severity: msg.severity === 2 ? 'error' : 'warn',
          ruleId: msg.ruleId,
          message: msg.message.split('\n')[0] ?? msg.message,
        })
      );
    }
  }

  return issues;
}

export async function collectGuardIssues(
  repoRoot: string,
  files: string[],
  existing: HarnessIssue[]
): Promise<HarnessIssue[]> {
  const seen = new Set(existing.map(issueKey));
  const guardIssues: HarnessIssue[] = [];

  for (const file of files) {
    if (GUARD_SKIP_FILE_RE.test(file)) continue;
    const abs = `${repoRoot}/${file}`;
    const exists = await Bun.file(abs).exists();
    if (!exists) continue;

    const content = await Bun.file(abs).text();
    const result = checkBunFirstCompliance(content, file);

    for (const v of result.violations) {
      const partial: Omit<HarnessIssue, 'oneLiner' | 'docs' | 'fixTier'> = {
        source: 'guard',
        file,
        line: v.line,
        severity: v.severity,
        ruleId: `guard/${v.catalogId ?? 'unknown'}`,
        catalogId: v.catalogId,
        message: v.message,
      };
      const issue = enrichIssue(partial);
      const key = issueKey(issue);
      if (seen.has(key)) continue;
      seen.add(key);
      guardIssues.push(issue);
    }
  }

  return guardIssues;
}

export function groupByFile(issues: HarnessIssue[]): FileOffender[] {
  const map = new Map<string, FileOffender>();

  for (const issue of issues) {
    let row = map.get(issue.file);
    if (!row) {
      row = {
        file: issue.file,
        count: 0,
        errors: 0,
        warnings: 0,
        topCatalogCount: 0,
        catalogCounts: {},
      };
      map.set(issue.file, row);
    }
    row.count++;
    if (issue.severity === 'error') row.errors++;
    else row.warnings++;

    const cid = issue.catalogId ?? issue.ruleId;
    row.catalogCounts[cid] = (row.catalogCounts[cid] ?? 0) + 1;
  }

  for (const row of map.values()) {
    let topId = '';
    let topCount = 0;
    for (const [id, count] of Object.entries(row.catalogCounts)) {
      if (count > topCount) {
        topId = id;
        topCount = count;
      }
    }
    row.topCatalogId = topId || undefined;
    row.topCatalogCount = topCount;
  }

  return [...map.values()].sort((a, b) => b.count - a.count || a.file.localeCompare(b.file));
}

export function groupByDirectory(issues: HarnessIssue[], depth = 2): DirectoryGroup[] {
  const map = new Map<string, { count: number; files: Set<string> }>();

  for (const issue of issues) {
    const parts = issue.file.split('/');
    const dir = parts.slice(0, Math.min(depth, parts.length - 1)).join('/') || '.';
    let row = map.get(dir);
    if (!row) {
      row = { count: 0, files: new Set() };
      map.set(dir, row);
    }
    row.count++;
    row.files.add(issue.file);
  }

  return [...map.entries()]
    .map(([directory, row]) => ({
      directory,
      count: row.count,
      fileCount: row.files.size,
    }))
    .sort((a, b) => b.count - a.count || a.directory.localeCompare(b.directory));
}

export function groupByCatalog(issues: HarnessIssue[], maxSamples = 3): CatalogGroup[] {
  const map = new Map<string, CatalogGroup>();

  for (const issue of issues) {
    const catalogId = issue.catalogId ?? 'unknown';
    let row = map.get(catalogId);
    if (!row) {
      const entry = catalogId !== 'unknown' ? getBunDxEntry(catalogId) : undefined;
      row = {
        catalogId,
        summary: entry?.summary ?? issue.ruleId,
        fixTier: entry?.fixTier ?? issue.fixTier,
        count: 0,
        errors: 0,
        warnings: 0,
        docs: entry?.docs ?? issue.docs,
        oneLiner: entry?.good ?? issue.oneLiner,
        samples: [],
      };
      map.set(catalogId, row);
    }
    row.count++;
    if (issue.severity === 'error') row.errors++;
    else row.warnings++;
    if (row.samples.length < maxSamples) {
      row.samples.push({ file: issue.file, line: issue.line, severity: issue.severity });
    }
  }

  return [...map.values()].sort(
    (a, b) => b.count - a.count || a.catalogId.localeCompare(b.catalogId)
  );
}

export function groupByFixTier(issues: HarnessIssue[], tier: FixTier): CatalogGroup[] {
  return groupByCatalog(issues.filter(i => i.fixTier === tier));
}

export function promotionCandidates(
  allFiles: string[],
  issues: HarnessIssue[],
  strictSet: ReadonlySet<string>
): string[] {
  const dirty = new Set(issues.map(i => i.file));
  return allFiles.filter(f => !strictSet.has(f) && !dirty.has(f)).sort();
}

export async function buildHarnessReport(repoRoot: string): Promise<HarnessReport> {
  const allFiles = await findHarnessFiles(repoRoot);
  const strictSet = new Set<string>(STRICT_INVENTORY);

  const eslintIssues = await collectEslintIssues(repoRoot);
  const guardIssues = await collectGuardIssues(repoRoot, allFiles, eslintIssues);
  const issues = [...eslintIssues, ...guardIssues].map(issue => ({
    ...issue,
    file: toRepoRelative(issue.file, repoRoot),
  }));

  const errors = issues.filter(i => i.severity === 'error').length;
  const warnings = issues.filter(i => i.severity === 'warn').length;
  const filesWithIssues = new Set(issues.map(i => i.file)).size;

  const byCatalog = groupByCatalog(issues);
  const standardCatches = groupByFixTier(issues, 'easy');

  return {
    generatedAt: new Date().toISOString(),
    summary: {
      errors,
      warnings,
      filesWithIssues,
      totalHarnessFiles: allFiles.length,
      strictInventoryCount: STRICT_INVENTORY.length,
    },
    worstOffenders: groupByFile(issues),
    byDirectory: groupByDirectory(issues),
    byCatalog,
    standardCatches,
    promotionCandidates: promotionCandidates(allFiles, issues, strictSet),
    strictInventory: [...STRICT_INVENTORY],
    issues,
  };
}

export function renderTerminalReport(report: HarnessReport, topN = 20): string {
  const lines: string[] = [];
  const { summary } = report;

  lines.push(
    `Harness Report — ${summary.warnings} warnings, ${summary.errors} errors, ${summary.filesWithIssues} files with issues`
  );
  lines.push(
    `Harness files: ${summary.totalHarnessFiles} | Strict inventory: ${summary.strictInventoryCount}`
  );
  lines.push('');

  lines.push('Worst offenders');
  const offenders = report.worstOffenders.slice(0, topN);
  if (offenders.length === 0) {
    lines.push('  (none)');
  } else {
    for (const o of offenders) {
      const top = o.topCatalogId ? `${o.topCatalogId}×${o.topCatalogCount}` : o.topCatalogCount;
      const breakdown = Object.entries(o.catalogCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([id, n]) => `${id}×${n}`)
        .join(', ');
      lines.push(`  ${String(o.count).padStart(4)}  ${o.file}  (${breakdown || top})`);
    }
  }
  lines.push('');

  lines.push('By directory');
  for (const d of report.byDirectory.slice(0, 10)) {
    lines.push(`  ${String(d.count).padStart(4)}  ${d.directory}/  (${d.fileCount} files)`);
  }
  lines.push('');

  lines.push('Standard catches (easy)');
  if (report.standardCatches.length === 0) {
    lines.push('  (none)');
  } else {
    for (const c of report.standardCatches) {
      lines.push(`  ${String(c.count).padStart(4)}  ${c.catalogId}  ${c.summary}`);
      if (c.oneLiner) lines.push(`         → ${c.oneLiner}`);
      lines.push(`         bun run dx:catalog ${c.catalogId}`);
    }
  }
  lines.push('');

  lines.push('By catalog (top 10)');
  for (const c of report.byCatalog.slice(0, 10)) {
    const tier = c.fixTier ? ` (${c.fixTier})` : '';
    lines.push(`  ${String(c.count).padStart(4)}  ${c.catalogId}${tier}  ${c.docs ?? ''}`);
    for (const s of c.samples.slice(0, 2)) {
      lines.push(`         ${s.file}:${s.line}`);
    }
  }
  lines.push('');

  lines.push(`Promotion candidates: ${report.promotionCandidates.length}`);
  for (const f of report.promotionCandidates.slice(0, 15)) {
    lines.push(`  → ${f}`);
  }
  if (report.promotionCandidates.length > 15) {
    lines.push(`  ... +${report.promotionCandidates.length - 15} more`);
  }
  lines.push('');
  lines.push('Next actions');
  if (report.standardCatches[0]) {
    const top = report.standardCatches[0]!;
    lines.push(`  bun run dx:catalog ${top.catalogId}`);
    lines.push(`  rg '${top.summary}' lib/ scripts/ --type ts | head`);
  }
  lines.push('  bun run harness:promote');
  lines.push('  bun run harness:report --json-out reports/harness/latest.json');

  return lines.join('\n');
}

export function renderMarkdownReport(report: HarnessReport, topN = 20): string {
  const lines: string[] = [];
  const { summary } = report;

  lines.push('# Harness Report');
  lines.push('');
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push('');
  lines.push('## Summary');
  lines.push('');
  lines.push(`| Metric | Value |`);
  lines.push(`|--------|-------|`);
  lines.push(`| Warnings | ${summary.warnings} |`);
  lines.push(`| Errors | ${summary.errors} |`);
  lines.push(`| Files with issues | ${summary.filesWithIssues} |`);
  lines.push(`| Total harness files | ${summary.totalHarnessFiles} |`);
  lines.push(`| Strict inventory | ${summary.strictInventoryCount} |`);
  lines.push('');

  lines.push('## Worst offenders');
  lines.push('');
  for (const o of report.worstOffenders.slice(0, topN)) {
    const breakdown = Object.entries(o.catalogCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id, n]) => `${id}×${n}`)
      .join(', ');
    lines.push(`- **${o.count}** \`${o.file}\` — ${breakdown}`);
  }
  lines.push('');

  lines.push('## Standard catches (easy)');
  lines.push('');
  for (const c of report.standardCatches) {
    lines.push(`- **${c.count}** \`${c.catalogId}\` — ${c.summary}`);
    if (c.oneLiner) lines.push(`  - Fix: \`${c.oneLiner}\``);
    if (c.docs) lines.push(`  - Docs: ${c.docs}`);
  }
  lines.push('');

  lines.push('## By catalog (top 10)');
  lines.push('');
  for (const c of report.byCatalog.slice(0, 10)) {
    lines.push(`- **${c.count}** \`${c.catalogId}\`${c.fixTier ? ` (${c.fixTier})` : ''}`);
    for (const s of c.samples) {
      lines.push(`  - \`${s.file}:${s.line}\``);
    }
  }
  lines.push('');

  lines.push('## Promotion candidates');
  lines.push('');
  for (const f of report.promotionCandidates.slice(0, 30)) {
    lines.push(`- \`${f}\``);
  }

  return lines.join('\n');
}

export function serializeReport(report: HarnessReport): string {
  const { issues, ...rest } = report;
  return JSON.stringify(
    {
      ...rest,
      issueCount: issues.length,
      issues: issues.slice(0, 500),
      issuesTruncated: issues.length > 500,
    },
    null,
    2
  );
}
