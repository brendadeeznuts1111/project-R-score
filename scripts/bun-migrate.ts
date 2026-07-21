#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/child-process#blocking-api-bun-spawnsync — Bun.spawnSync
// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/hashing#bun-cryptohasher — Bun.CryptoHasher
// @see https://bun.com/docs/runtime/hashing#bun-password — Bun.password
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/test/index#run-tests — bun:test
// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/utils#bun-which — Bun.which
// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
// @see https://bun.com/docs/runtime/child-process#spawn-a-process-bun-spawn — Bun.spawn
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Node.js → Bun-native usage inventory (token-joined to docs catalog).
 *
 * @see https://bun.com/docs/runtime/file-io
 * @see scripts/BUN_NATIVE.md
 * @see tools/bun-docs-catalog.json
 */
const joinPath = (...parts: string[]) => parts.filter(Boolean).join('/').replace(/\/+/g, '/');
const REPO_ROOT = joinPath(import.meta.dir, '..');
const DEFAULT_ROOTS = ['lib', 'tools', 'scripts', 'packages'];
const DEFAULT_OUT = joinPath(REPO_ROOT, 'reports/bun-usage-inventory.json');
const CATALOG_PATH = joinPath(REPO_ROOT, 'tools/bun-docs-catalog.json');

export type MigrateSection = 'runtime' | 'crypto' | 'fs' | 'shell' | 'test' | 'bundler' | 'http';

export type UsageHit = {
  file: string;
  line: number;
  snippet: string;
  nodePattern: string;
  bunToken: string;
  migrateSection: MigrateSection;
  catalogSection?: string;
  locusStatus?: string;
  docsUrl?: string;
  /** True when file is in VALIDATE_WHITELIST (catalog / intentional Node). */
  whitelisted?: boolean;
};

export type UsageInventoryReport = {
  generatedAt: string;
  bunVersion: string;
  roots: string[];
  summary: {
    totalHits: number;
    productHits: number;
    whitelistedHits: number;
    byMigrateSection: Record<string, number>;
    byMigrateSectionProduct: Record<string, number>;
    byBunToken: Record<string, number>;
    byRoot: Record<string, number>;
    filesWithHits: number;
    productFilesWithHits: number;
  };
  hits: UsageHit[];
};

type PatternRule = {
  nodePattern: string;
  bunToken: string;
  migrateSection: MigrateSection;
  re: RegExp;
};

/** High-signal Node → Bun token map (v1 regex scan). */
export const PATTERN_MAP: PatternRule[] = [
  {
    nodePattern: 'import:node:fs',
    bunToken: 'Bun.file',
    migrateSection: 'fs',
    re: /from\s+['"]node:fs(?:\/promises)?['"]|from\s+['"]fs(?:\/promises)?['"]|require\s*\(\s*['"]node:fs['"]\s*\)|require\s*\(\s*['"]fs['"]\s*\)/,
  },
  {
    nodePattern: 'fs.readFileSync',
    bunToken: 'Bun.file',
    migrateSection: 'fs',
    re: /\breadFileSync\s*\(/,
  },
  {
    nodePattern: 'fs.writeFileSync',
    bunToken: 'Bun.write',
    migrateSection: 'fs',
    re: /\bwriteFileSync\s*\(/,
  },
  {
    nodePattern: 'fs.existsSync',
    bunToken: 'Bun.file',
    migrateSection: 'fs',
    re: /\bexistsSync\s*\(/,
  },
  {
    nodePattern: 'fs.readFile',
    bunToken: 'Bun.file',
    migrateSection: 'fs',
    re: /(?<![.\w])readFile\s*\(/,
  },
  {
    nodePattern: 'fs.writeFile',
    bunToken: 'Bun.write',
    migrateSection: 'fs',
    re: /(?<![.\w])writeFile\s*\(/,
  },
  {
    nodePattern: 'fs.promises',
    bunToken: 'Bun.file',
    migrateSection: 'fs',
    re: /from\s+['"]fs\/promises['"]|from\s+['"]node:fs\/promises['"]/,
  },
  {
    nodePattern: 'cast.Bun.spawn',
    bunToken: 'Bun.spawn',
    migrateSection: 'shell',
    re: /\(Bun as Record<string, unknown>\)\.spawn(?:Sync)?/,
  },
  {
    nodePattern: 'import:child_process',
    bunToken: 'Bun.spawn',
    migrateSection: 'shell',
    re: /from\s+['"](?:node:)?child_process['"]|require\s*\(\s*['"](?:node:)?child_process['"]\s*\)/,
  },
  {
    nodePattern: 'child_process.execSync',
    bunToken: 'Bun.$',
    migrateSection: 'shell',
    re: /(?<![.\w])execSync\s*\(/,
  },
  {
    nodePattern: 'child_process.exec',
    bunToken: 'Bun.$',
    migrateSection: 'shell',
    re: /(?<![.\w])exec\s*\(/,
  },
  {
    nodePattern: 'child_process.spawnSync',
    bunToken: 'Bun.spawnSync',
    migrateSection: 'shell',
    re: /(?<![.\w])spawnSync\s*\(/,
  },
  {
    nodePattern: 'child_process.spawn',
    bunToken: 'Bun.spawn',
    migrateSection: 'shell',
    re: /(?<![.\w])spawn\s*\(/,
  },
  {
    nodePattern: 'child_process.fork',
    bunToken: 'Bun.spawn',
    migrateSection: 'shell',
    re: /(?<![.\w])fork\s*\(/,
  },
  {
    nodePattern: 'child_process.execFile',
    bunToken: 'Bun.spawn',
    migrateSection: 'shell',
    re: /(?<![.\w])execFile\s*\(/,
  },
  {
    nodePattern: 'crypto.createHash',
    bunToken: 'Bun.CryptoHasher',
    migrateSection: 'crypto',
    re: /\bcreateHash\s*\(/,
  },
  {
    nodePattern: 'crypto.createHmac',
    bunToken: 'Bun.CryptoHasher',
    migrateSection: 'crypto',
    re: /\bcreateHmac\s*\(/,
  },
  {
    nodePattern: 'crypto.randomUUID',
    bunToken: 'Bun.randomUUIDv7',
    migrateSection: 'crypto',
    re: /\brandomUUID\s*\(/,
  },
  {
    nodePattern: 'crypto.randomBytes',
    bunToken: 'crypto.getRandomValues',
    migrateSection: 'crypto',
    re: /\bcrypto\.randomBytes\s*\(/,
  },
  {
    nodePattern: 'import:node:crypto',
    bunToken: 'Bun.CryptoHasher',
    migrateSection: 'crypto',
    re: /from\s+['"]node:crypto['"]|from\s+['"]crypto['"]|require\s*\(\s*['"]node:crypto['"]\s*\)/,
  },
  {
    nodePattern: 'bcrypt.hash',
    bunToken: 'Bun.password',
    migrateSection: 'crypto',
    re: /\bbcrypt\.(?:hash|compare|hashSync|compareSync)\s*\(/,
  },
  {
    nodePattern: 'process.env',
    bunToken: 'Bun.env',
    migrateSection: 'runtime',
    re: /\bprocess\.env\b/,
  },
  {
    nodePattern: 'util.inspect',
    bunToken: 'Bun.inspect',
    migrateSection: 'runtime',
    re: /\butil\.inspect\s*\(/,
  },
  {
    nodePattern: 'import:which',
    bunToken: 'Bun.which',
    migrateSection: 'runtime',
    re: /from\s+['"]which['"]|require\s*\(\s*['"]which['"]\s*\)/,
  },
  {
    nodePattern: 'process.hrtime',
    bunToken: 'Bun.nanoseconds',
    migrateSection: 'runtime',
    re: /\bprocess\.hrtime(?:\.bigint)?\s*\(/,
  },
  {
    nodePattern: 'import:vitest',
    bunToken: 'bun:test',
    migrateSection: 'test',
    re: /from\s+['"]vitest['"]|from\s+['"]@vitest\/[^'"]+['"]/,
  },
];

const SKIP_PATH_PARTS = [
  '/node_modules/',
  '/dist/',
  '/build/',
  '/.git/',
  '/artifacts/',
  'bun-migrate.ts',
  'bun-native-discover.ts',
  'migrate-crypto.ts',
  'migrate-fs.ts',
  'migrate-shell.ts',
  'migrate-runtime.ts',
];

/** Whitelist for validate:integrity (tools / pattern catalogs). */
export const VALIDATE_WHITELIST = new Set([
  'scripts/bun-migrate.ts',
  'scripts/lib/migrate-crypto.ts',
  'scripts/lib/migrate-fs.ts',
  'scripts/lib/migrate-shell.ts',
  'scripts/lib/migrate-runtime.ts',
  'scripts/validate-integrity.ts',
  'tools/bun-docs-changelog.ts',
  'lib/console-depth.ts',
  'scripts/bun-native-discover.ts',
  'scripts/bun-quick-wins-table.ts',
  'scripts/dx-mcp.ts',
  'scripts/lib/fs-bun.ts',
  'packages/guards/src/bun-first-guard.ts',
  'lib/docs/constants/utils.ts',
  'packages/docs-tools/src/builders/url-builder.ts',
  'lib/performance/memory-pool.ts',
  'scripts/pack-all.ts',
  'scripts/brand-cpu-profile.ts',
  'scripts/search-benchmark-dashboard.ts',
  'lib/docs/ripgrep-spawn.ts',
  'lib/docs/smart-symbol-index.ts',
  'tools/overseer-cli.ts',
]);

function normalizeTokenName(name: string): string {
  return name
    .trim()
    .replace(/^bun\./i, 'Bun.')
    .replace(/^--/, '--')
    .toLowerCase();
}

function isCodeLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  if (t.startsWith('//')) return false;
  if (t.startsWith('*') || t.startsWith('/*') || t.startsWith('*/')) return false;
  return true;
}

function shouldSkipFile(rel: string, includeTests: boolean): boolean {
  if (
    !includeTests &&
    (rel.endsWith('.test.ts') || rel.endsWith('.spec.ts') || rel.endsWith('.bench.ts'))
  ) {
    return true;
  }
  return SKIP_PATH_PARTS.some(p => rel.includes(p));
}

async function collectTsFiles(roots: string[], includeTests: boolean): Promise<string[]> {
  const out: string[] = [];
  const glob = new Bun.Glob('**/*.{ts,tsx,mts,cts}');
  for (const root of roots) {
    const abs = joinPath(REPO_ROOT, root);
    const info = await Bun.file(abs)
      .stat()
      .catch(() => null);
    if (!info?.isDirectory()) continue;
    for await (const f of glob.scan({ cwd: abs, absolute: true })) {
      const rel = f.slice(REPO_ROOT.length + 1);
      if (shouldSkipFile(rel, includeTests)) continue;
      out.push(f);
    }
  }
  return out.sort();
}

type CatalogRow = {
  name: string;
  section: string;
  docsUrl?: string;
  locusStatus?: string;
  aliases?: string[];
};

async function loadCatalogIndex(): Promise<Map<string, CatalogRow>> {
  const index = new Map<string, CatalogRow>();
  try {
    const raw = (await Bun.file(CATALOG_PATH).json()) as { entries?: CatalogRow[] };
    for (const e of raw.entries ?? []) {
      index.set(normalizeTokenName(e.name), e);
      for (const a of e.aliases ?? []) {
        index.set(normalizeTokenName(a), e);
      }
    }
  } catch {
    /* catalog optional */
  }
  return index;
}

function joinCatalog(
  hit: Omit<UsageHit, 'catalogSection' | 'locusStatus' | 'docsUrl'>,
  catalog: Map<string, CatalogRow>,
  canonicalRefs: Record<string, string>
): UsageHit {
  const row = catalog.get(normalizeTokenName(hit.bunToken));
  const refUrl = canonicalRefs[hit.bunToken];
  return {
    ...hit,
    catalogSection: row?.section,
    locusStatus: row?.locusStatus,
    docsUrl: row?.docsUrl ?? refUrl,
  };
}

export async function scanUsageInventory(opts: {
  roots?: string[];
  includeTests?: boolean;
}): Promise<Omit<UsageInventoryReport, 'generatedAt' | 'bunVersion'>> {
  const roots = opts.roots ?? DEFAULT_ROOTS;
  const catalog = await loadCatalogIndex();
  const { CANONICAL_REFS } = await import('../tools/bun-doc-refs.ts');
  const files = await collectTsFiles(roots, opts.includeTests ?? false);
  const hits: UsageHit[] = [];

  for (const file of files) {
    const rel = file.slice(REPO_ROOT.length + 1);
    const text = await Bun.file(file).text();
    const bunSpawnOnly =
      /\bfrom\s+['"]bun['"]|\bimport\s*\(\s*['"]bun['"]\s*\)/.test(text) &&
      !/from\s+['"](?:node:)?child_process['"]/.test(text);
    const lines = text.split('\n');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (!isCodeLine(line)) continue;
      if (
        /^\s*(?:static\s+|public\s+|private\s+)?(?:async\s+)?(?:readFile|writeFile)\s*\(/.test(line)
      ) {
        continue;
      }
      for (const rule of PATTERN_MAP) {
        if (!rule.re.test(line)) continue;
        if (line.includes(rule.bunToken)) continue;
        if (rule.migrateSection === 'shell') {
          if (
            line.includes('Bun.spawn') ||
            line.includes('Bun.spawnSync') ||
            line.includes('Bun.$')
          ) {
            continue;
          }
          if (
            /\.exec\s*\(/.test(line) &&
            !/execSync/.test(line) &&
            rule.nodePattern.includes('exec')
          ) {
            continue;
          }
          if (/\bdb\.exec\s*\(/.test(line)) continue;
          if (bunSpawnOnly && /\bspawn\s*\(/.test(line) && rule.nodePattern.includes('spawn')) {
            continue;
          }
        }
        const base = {
          file: rel,
          line: i + 1,
          snippet: line.trim().slice(0, 120),
          nodePattern: rule.nodePattern,
          bunToken: rule.bunToken,
          migrateSection: rule.migrateSection,
          whitelisted: VALIDATE_WHITELIST.has(rel),
        };
        hits.push(joinCatalog(base, catalog, CANONICAL_REFS));
      }
    }
  }

  const byMigrateSection: Record<string, number> = {};
  const byMigrateSectionProduct: Record<string, number> = {};
  const byBunToken: Record<string, number> = {};
  const byRoot: Record<string, number> = {};
  const fileSet = new Set<string>();
  const productFileSet = new Set<string>();
  let productHits = 0;
  let whitelistedHits = 0;
  for (const h of hits) {
    byMigrateSection[h.migrateSection] = (byMigrateSection[h.migrateSection] ?? 0) + 1;
    byBunToken[h.bunToken] = (byBunToken[h.bunToken] ?? 0) + 1;
    const root = h.file.split('/')[0] ?? 'unknown';
    byRoot[root] = (byRoot[root] ?? 0) + 1;
    fileSet.add(h.file);
    if (h.whitelisted) {
      whitelistedHits++;
    } else {
      productHits++;
      byMigrateSectionProduct[h.migrateSection] =
        (byMigrateSectionProduct[h.migrateSection] ?? 0) + 1;
      productFileSet.add(h.file);
    }
  }

  return {
    roots,
    summary: {
      totalHits: hits.length,
      productHits,
      whitelistedHits,
      byMigrateSection,
      byMigrateSectionProduct,
      byBunToken,
      byRoot,
      filesWithHits: fileSet.size,
      productFilesWithHits: productFileSet.size,
    },
    hits,
  };
}

function printTable(report: UsageInventoryReport): void {
  console.info(`Bun usage inventory · Bun ${report.bunVersion} · ${report.generatedAt}`);
  console.info(`roots: ${report.roots.join(', ')}`);
  console.info(
    `hits: ${report.summary.totalHits} (product ${report.summary.productHits} · whitelist ${report.summary.whitelistedHits}) · files: ${report.summary.filesWithHits}`
  );
  console.info('\nBy migrateSection (product debt):');
  const sections = ['crypto', 'fs', 'shell', 'runtime', 'test'] as const;
  for (const k of sections) {
    const product = report.summary.byMigrateSectionProduct[k] ?? 0;
    const total = report.summary.byMigrateSection[k] ?? 0;
    console.info(`  ${k.padEnd(10)} product=${product}  total=${total}`);
  }
  console.info('\nBy root (all hits):');
  for (const [k, v] of Object.entries(report.summary.byRoot).sort((a, b) => b[1] - a[1])) {
    console.info(`  ${k.padEnd(10)} ${v}`);
  }
  const productSample = report.hits.filter(h => !h.whitelisted).slice(0, 20);
  if (productSample.length > 0) {
    console.info('\nProduct debt hits (first 20):');
    for (const h of productSample) {
      console.info(
        `  ${h.file}:${h.line}  ${h.nodePattern} → ${h.bunToken}  [${h.migrateSection}]`
      );
    }
  } else {
    console.info('\n✅ No product debt hits (remaining are whitelist/catalog only).');
  }
}

function printStatus(report: UsageInventoryReport): void {
  const phases: Array<{ phase: number; section: MigrateSection; label: string }> = [
    { phase: 6, section: 'crypto', label: 'crypto' },
    { phase: 7, section: 'fs', label: 'fs' },
    { phase: 8, section: 'shell', label: 'shell' },
    { phase: 9, section: 'runtime', label: 'runtime' },
  ];
  console.info(`Migration status · Bun ${report.bunVersion} · ${report.generatedAt}`);
  console.info(
    `product debt: ${report.summary.productHits} · whitelist noise: ${report.summary.whitelistedHits}`
  );
  console.info('');
  console.info(
    `${'phase'.padEnd(8)}${'section'.padEnd(10)}${'product'.padStart(8)}${'total'.padStart(8)}  status`
  );
  for (const p of phases) {
    const product = report.summary.byMigrateSectionProduct[p.section] ?? 0;
    const total = report.summary.byMigrateSection[p.section] ?? 0;
    const status = product === 0 ? '✅ clear' : '❌ debt';
    console.info(
      `${String(p.phase).padEnd(8)}${p.label.padEnd(10)}${String(product).padStart(8)}${String(total).padStart(8)}  ${status}`
    );
  }
  console.info('');
  if (report.summary.productHits === 0) {
    console.info('Phases 6–9 product debt clear. Gate: bun run validate:integrity:all');
  } else {
    console.info(
      'Apply remaining: bun run bun-migrate apply --phase N --section SECTION --dry-run'
    );
  }
}

function flagValue(args: string[], name: string): string | undefined {
  const eq = args.find(a => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const idx = args.indexOf(name);
  if (idx !== -1) return args[idx + 1];
  return undefined;
}

async function cmdInventory(args: string[]): Promise<number> {
  const format = flagValue(args, '--format') ?? 'json';
  const outPath = flagValue(args, '--out') ?? DEFAULT_OUT;
  const outEq = args.some(a => a === '--out' || a.startsWith('--out='));
  const rootsRaw = flagValue(args, '--roots');
  const roots = rootsRaw
    ? rootsRaw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : DEFAULT_ROOTS;
  const includeTests = args.includes('--include-tests');

  const partial = await scanUsageInventory({ roots, includeTests });
  const report: UsageInventoryReport = {
    generatedAt: new Date().toISOString(),
    bunVersion: Bun.version,
    ...partial,
  };

  if (format === 'table') {
    printTable(report);
    return 0;
  }
  if (format === 'status') {
    printStatus(report);
    return 0;
  }

  const json = `${JSON.stringify(report, null, 2)}\n`;
  if (outEq) {
    await Bun.write(outPath, json);
    console.info(
      `✅ ${report.summary.totalHits} hits (product ${report.summary.productHits} · whitelist ${report.summary.whitelistedHits}) → ${outPath}`
    );
  } else {
    process.stdout.write(json);
  }
  return 0;
}

async function cmdStatus(args: string[]): Promise<number> {
  const rootsEq = args.find(a => a.startsWith('--roots='));
  const roots = rootsEq
    ? rootsEq
        .slice('--roots='.length)
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : DEFAULT_ROOTS;
  const partial = await scanUsageInventory({ roots });
  printStatus({
    generatedAt: new Date().toISOString(),
    bunVersion: Bun.version,
    ...partial,
  });
  return partial.summary.productHits === 0 ? 0 : 1;
}

async function cmdApply(args: string[]): Promise<number> {
  const phase = Number(flagValue(args, '--phase') ?? NaN);
  const sectionArg = flagValue(args, '--section') as MigrateSection | undefined;
  const write = args.includes('--write');
  const dryRun = !write;
  const rootsRaw = flagValue(args, '--roots');
  const roots = rootsRaw
    ? rootsRaw
        .split(',')
        .map(s => s.trim())
        .filter(Boolean)
    : DEFAULT_ROOTS;
  const workspace = flagValue(args, '--workspace');

  const { PHASE_SECTION } = await import('./lib/migrate-phases.ts');
  const expectedSection = PHASE_SECTION[phase];
  const section = sectionArg ?? expectedSection;

  if (!Number.isFinite(phase) || !expectedSection) {
    console.error(
      `Unknown or missing --phase (supported: 6=crypto, 7=fs, 8=shell, 9=runtime).\n` +
        `  bun scripts/bun-migrate.ts apply --phase 7 --section fs [--dry-run|--write] [--workspace=NAME]`
    );
    return 2;
  }

  if (sectionArg && sectionArg !== expectedSection) {
    console.error(
      `Phase ${phase} expects --section=${expectedSection}, got --section=${sectionArg}`
    );
    return 2;
  }

  if (section !== 'crypto' && section !== 'fs' && section !== 'shell' && section !== 'runtime') {
    console.error(
      `apply --section=${section} is not implemented yet (phase ${phase}).\n` +
        `Implemented: phase 6/crypto, phase 7/fs, phase 8/shell, phase 9/runtime.`
    );
    return 2;
  }

  const partial = await scanUsageInventory({ roots });
  let sectionHits = partial.hits.filter(h => h.migrateSection === section && !h.whitelisted);

  if (workspace) {
    const slug = workspace.includes('/')
      ? workspace.split('/').pop()!
      : workspace.replace(/^@/, '');
    sectionHits = sectionHits.filter(
      h =>
        h.file.includes(`packages/${slug}/`) || h.file.includes(workspace) || h.file.includes(slug)
    );
    console.info(`workspace filter: ${workspace} → ${sectionHits.length} product hit(s)`);
  }

  const whitelistOnly = partial.hits.filter(
    h => h.migrateSection === section && h.whitelisted
  ).length;

  if (sectionHits.length === 0) {
    console.info(
      `✅ No ${section} product debt` +
        (whitelistOnly ? ` (${whitelistOnly} whitelist/catalog hit(s) ignored)` : '') +
        ' — nothing to apply.'
    );
    return 0;
  }

  const applyers = {
    crypto: () =>
      import('./lib/migrate-crypto.ts').then(m =>
        m.applyCryptoSection({ hits: sectionHits, write: !dryRun })
      ),
    fs: () =>
      import('./lib/migrate-fs.ts').then(m =>
        m.applyFsSection({ hits: sectionHits, write: !dryRun })
      ),
    shell: () =>
      import('./lib/migrate-shell.ts').then(m =>
        m.applyShellSection({ hits: sectionHits, write: !dryRun })
      ),
    runtime: () =>
      import('./lib/migrate-runtime.ts').then(m =>
        m.applyRuntimeSection({ hits: sectionHits, write: !dryRun })
      ),
  } as const;

  const results = await applyers[section as keyof typeof applyers]();

  let changed = 0;
  let skipped = 0;
  for (const r of results) {
    if (r.skipped) {
      skipped++;
      console.info(`⏭  ${r.file}  (${r.skipped})`);
      continue;
    }
    changed++;
    const mode = dryRun ? 'would apply' : 'applied';
    console.info(`📝 ${r.file}  [${mode}]  ${r.changes.join(', ')}`);
    if (dryRun) {
      for (const line of diffPreview(r.before, r.after)) {
        console.info(`   ${line}`);
      }
    }
  }

  console.info(
    `\n${dryRun ? 'Dry-run' : 'Write'}: ${changed} file(s) with changes, ${skipped} skipped, ${sectionHits.length} inventory hit(s)`
  );

  if (dryRun) {
    console.info('\nRe-run with --write to apply.');
  } else {
    console.info(`\nRun: bun run validate:integrity --section=${section}`);
  }

  return 0;
}

function diffPreview(before: string, after: string): string[] {
  const bLines = before.split('\n');
  const aLines = after.split('\n');
  const out: string[] = [];
  const max = Math.max(bLines.length, aLines.length);
  let shown = 0;
  for (let i = 0; i < max && shown < 8; i++) {
    const b = bLines[i] ?? '';
    const a = aLines[i] ?? '';
    if (b !== a) {
      if (b) out.push(`- ${b.trim().slice(0, 100)}`);
      if (a) out.push(`+ ${a.trim().slice(0, 100)}`);
      shown++;
    }
  }
  return out;
}

async function main(): Promise<void> {
  const [, , cmd = 'inventory', ...rest] = Bun.argv;
  switch (cmd) {
    case 'inventory':
      process.exit(await cmdInventory(rest));
      break;
    case 'status':
      process.exit(await cmdStatus(rest));
      break;
    case 'apply':
      process.exit(await cmdApply(rest));
      break;
    default:
      console.error(
        `usage: bun scripts/bun-migrate.ts inventory|status|apply\n` +
          `  inventory [--format=json|table|status] [--roots=...] [--out=reports/bun-usage-inventory.json]\n` +
          `  status [--roots=...]   # product debt table (exit 1 if productHits > 0)\n` +
          `  apply --phase N --section SECTION [--dry-run|--write] [--workspace=NAME]\n` +
          `            (phase 6/crypto · 7/fs · 8/shell · 9/runtime)\n` +
          `  bun run migrate:inventory · bun run migrate:status · bun run validate:integrity:all`
      );
      process.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
