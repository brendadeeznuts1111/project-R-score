// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/runtime/transpiler — Bun.Transpiler.scanImports
/**
 * Package-level dependency mapping from a file-level import adjacency.
 * Used by tools/packages-metafile-audit.ts (claim packages-graph-map-v13).
 *
 * Bake top-level (schema v13 additive): `board`, `openActions`, `glance` via
 * {@link PACKAGES_GRAPH_BOARD}, {@link filterOpenCouplingActions},
 * {@link buildPackagesGraphGlance}.
 */

import type { PackageVaultMap } from './packages-vault-map.ts';
import type { EnvInventoryCompact } from '../../scripts/lib/env-inventory-compact.ts';

export type PackageCouplingRole =
  /** Imported from lib/tools/scripts/tests (and/or has cross-pkg dependents). */
  | 'consumed'
  /** Listed in root workspace deps but no outside consumers found. */
  | 'root-tooling'
  /** Referenced only from root package.json scripts (no import graph edge). */
  | 'scripted'
  /** Not in root workspace deps and no outside consumers — dormant island. */
  | 'dormant'
  /** Has cross-pkg dependents inside packages/ only. */
  | 'internal-hub';

export type OutsideImportKind = 'workspace' | 'relative';

export type CouplingAction =
  | 'wire-root-dep'
  | 'migrate-relative-imports'
  | 'archive-candidate'
  | 'ok';

export type PackageEdge = {
  from: string;
  to: string;
  /** Number of file-level import edges contributing to this package edge. */
  weight: number;
  samples: string[]; // brand-ok — "fromFile → toFile" sample paths
};

export type ExternalEdge = {
  fromPackage: string;
  /** Top-level plane: lib | config | bare | other */
  plane: 'lib' | 'config' | 'bare' | 'other';
  targetPrefix: string;
  weight: number;
  samples: string[];
};

export type PackageGraphMap = {
  packages: string[];
  /** Cross-package edges (packages/A → packages/B). */
  packageEdges: PackageEdge[];
  /** packages/* → lib/|config/|… */
  externalEdges: ExternalEdge[];
  /** Intra-package file edge counts. */
  internalEdgeCount: number;
  /** package → sorted dependents (who imports me). */
  dependents: Record<string, string[]>;
  /** package → sorted dependencies (who I import). */
  dependencies: Record<string, string[]>;
  /** Kahn topological layers (isolated packages appear in layer 0). */
  layers: string[][];
  /** Packages involved in a cross-package cycle (if any). */
  packageCycles: string[][];
  /** Intra-package file topo depth for packages with internal edges. */
  intra?: Record<
    string,
    { fileCount: number; depth: number; layers: string[][]; entryFiles: string[] }
  >;
  /** Repo files outside packages/ that import @factorywager/<pkg> or packages/<pkg>. */
  outsideConsumers?: Array<{
    package: string;
    count: number;
    consumers: string[];
    workspaceImports: number;
    relativeImports: number;
  }>;
  /** Root package.json scripts that mention packages/<name> or @factorywager/<name>. */
  scriptRefs?: Array<{
    package: string;
    scripts: string[]; // brand-ok — npm script names
  }>;
  /** Declared workspace deps vs actual cross-pkg graph (+ root workspace consumers). */
  declared?: Array<{
    package: string;
    npmName: string;
    declaredWorkspace: string[];
    actualCrossPkg: string[];
    /** Actual imports not listed in this package's package.json. */
    missingInPackageJson: string[];
    /** Declared workspace deps with no metafile edge (may still be runtime/dynamic). */
    unusedDeclared: string[];
    /** Root package.json lists this workspace package. */
    inRootWorkspaceDeps: boolean;
  }>;
  /** Reverse fan-in on external planes (lib/docs, bare:bun, …). */
  externalHubs?: Array<{
    targetPrefix: string;
    plane: ExternalEdge['plane'];
    weight: number;
    fromPackages: string[];
  }>;
  /** Coupling roles derived from outsideConsumers + declared + dependents. */
  coupling?: Array<{
    package: string;
    role: PackageCouplingRole;
    outsideCount: number;
    dependentCount: number;
    inRootWorkspaceDeps: boolean;
    workspaceImports: number;
    relativeImports: number;
    scriptCount: number;
  }>;
  /** Operator actions derived from coupling (wire / migrate / archive). */
  actions?: Array<{
    package: string;
    action: CouplingAction;
    reason: string;
  }>;
  /** Deep probe of archive-candidate / dormant packages. */
  archiveProbes?: Array<{
    package: string;
    kind: 'placeholder' | 'library' | 'empty';
    srcFiles: number;
    bytes: number;
    hasTests: boolean;
    indexIsEmptyExport: boolean;
    recommendation: 'archive' | 'keep-review' | 'promote';
    note: string;
  }>;
  /** Per-package coupling health (0–100). */
  packageScores?: Array<{
    package: string;
    score: number;
    grade: 'healthy' | 'needs-improvement' | 'critical';
    reasons: string[]; // brand-ok — human score rationales
  }>;
  /** Rollup for boards / portal. */
  summary?: {
    packageCount: number;
    consumed: number;
    rootTooling: number;
    scripted: number;
    dormant: number;
    openActions: number;
    archivePlaceholders: number;
    avgPackageScore: number;
    topHub: string | null;
    /** Present when --vault deep map ran. */
    vaultOpenActions?: number;
    vaultPackagesWithEnv?: number;
    quarantineCount?: number;
    envPackageTouchedKeys?: number;
    envMultiPlaneKeys?: number;
    envRootRuntimeMissing?: number;
    envRootRuntimeNeedsInject?: number;
    envRootCoveredByDefault?: number;
  };
  /** Packages ↔ env.template / Proton Pass (optional --vault). */
  vault?: PackageVaultMap;
  /** Compact harness env inventory including packages plane (optional --env). */
  env?: EnvInventoryCompact;
  /**
   * Archive-recommended packages blocked by repo wiring (tsconfig / boundaries / skills).
   * Present after deep map when archive probes recommend archive.
   */
  quarantine?: Array<{
    package: string;
    reason: string;
    blockedBy: string[]; // brand-ok — path labels blocking hard delete
  }>;
};

function pkgOf(path: string): string | null {
  const m = path.replace(/\\/g, '/').match(/^packages\/([^/]+)\//);
  return m?.[1] ?? null;
}

/**
 * Normalize a Bun.build metafile import path to a repo-relative path.
 * Metafile sometimes leaves unresolved relatives (`./x`, `../../../lib/...`) or bare modules (`bun`).
 */
export function resolveMetaImportPath(
  fromRel: string,
  importPath: string,
  root: string
): { kind: 'file'; path: string } | { kind: 'bare'; name: string } | null {
  const raw = importPath.replace(/\\/g, '/').trim();
  if (!raw) return null;

  // Absolute filesystem path
  if (raw.startsWith('/') || /^[A-Za-z]:\//.test(raw)) {
    const n = raw.startsWith(root + '/') ? raw.slice(root.length + 1) : raw;
    return { kind: 'file', path: n.replace(/^\.\//, '') };
  }

  // Relative to importer
  if (raw.startsWith('.')) {
    const fromDir = fromRel.includes('/') ? fromRel.replace(/\/[^/]+$/, '') : '';
    const parts = [...fromDir.split('/').filter(Boolean), ...raw.split('/')];
    const stack: string[] = [];
    for (const p of parts) {
      if (p === '.' || p === '') continue;
      if (p === '..') {
        stack.pop();
        continue;
      }
      stack.push(p);
    }
    let resolved = stack.join('/');
    // Add .ts if extensionless and looks like source
    if (resolved && !/\.[a-z]+$/i.test(resolved)) {
      // leave extensionless — pkgOf/externalPlane still work for lib/docs/...
    }
    return { kind: 'file', path: resolved };
  }

  // Bare specifier (bun, url, react, …)
  return { kind: 'bare', name: raw.split('/')[0]! };
}

function externalPlane(path: string): { plane: ExternalEdge['plane']; prefix: string } {
  const p = path.replace(/\\/g, '/');
  if (p.startsWith('lib/')) {
    const seg = p.split('/')[1] ?? 'lib';
    return { plane: 'lib', prefix: `lib/${seg}` };
  }
  if (p.startsWith('config/')) return { plane: 'config', prefix: 'config' };
  const top = p.split('/')[0] ?? 'other';
  // Ignore junk single-segment relatives that escaped resolution
  if (top === '..' || top === '.') return { plane: 'other', prefix: 'unresolved' };
  return { plane: 'other', prefix: top };
}

function bumpSample(samples: string[], sample: string, maxSamples: number): void {
  if (samples.length < maxSamples) samples.push(sample);
}

function bumpPackageEdge(
  map: Map<string, PackageEdge>,
  from: string,
  to: string,
  sample: string,
  maxSamples: number
): void {
  const key = `${from}\0${to}`;
  const cur = map.get(key) ?? { from, to, weight: 0, samples: [] };
  cur.weight++;
  bumpSample(cur.samples, sample, maxSamples);
  map.set(key, cur);
}

function bumpExternalEdge(
  map: Map<string, ExternalEdge>,
  fromPackage: string,
  plane: ExternalEdge['plane'],
  targetPrefix: string,
  sample: string,
  maxSamples: number
): void {
  const key = `${fromPackage}\0${targetPrefix}`;
  const cur = map.get(key) ?? {
    fromPackage,
    plane,
    targetPrefix,
    weight: 0,
    samples: [],
  };
  cur.weight++;
  bumpSample(cur.samples, sample, maxSamples);
  map.set(key, cur);
}

type EdgeAcc = {
  pkgEdges: Map<string, PackageEdge>;
  extEdges: Map<string, ExternalEdge>;
  internalEdgeCount: number;
  pkgSet: Set<string>;
  maxSamples: number;
  root: string;
};

/** Resolve + classify one file import into package/external accumulators. */
function recordImportEdge(acc: EdgeAcc, from: string, toRaw: string): void {
  const fromPkg = pkgOf(from);
  if (fromPkg) acc.pkgSet.add(fromPkg);

  let to = toRaw;
  let bare: string | null = null;
  if (!to.startsWith('packages/') && !to.startsWith('lib/') && !to.startsWith('config/')) {
    const resolved = resolveMetaImportPath(from, toRaw, acc.root);
    if (!resolved) return;
    if (resolved.kind === 'bare') bare = resolved.name;
    else to = resolved.path;
  }

  if (bare) {
    if (!fromPkg) return;
    bumpExternalEdge(
      acc.extEdges,
      fromPkg,
      'bare',
      `bare:${bare}`,
      `${from} → ${toRaw}`,
      acc.maxSamples
    );
    return;
  }

  if (!to || to === '..' || to.startsWith('../')) return;

  const toPkg = pkgOf(to);
  if (toPkg) acc.pkgSet.add(toPkg);

  if (fromPkg && toPkg) {
    if (fromPkg === toPkg) {
      acc.internalEdgeCount++;
      return;
    }
    bumpPackageEdge(acc.pkgEdges, fromPkg, toPkg, `${from} → ${to}`, acc.maxSamples);
    return;
  }

  if (!fromPkg || toPkg) return;
  const { plane, prefix } = externalPlane(to);
  if (prefix === 'unresolved') return;
  // Skip single-segment junk (unresolved relatives misclassified as other)
  if (plane === 'other' && !prefix.includes('/')) return;
  bumpExternalEdge(acc.extEdges, fromPkg, plane, prefix, `${from} → ${to}`, acc.maxSamples);
}

function indexPackageDeps(
  packages: string[],
  packageEdges: PackageEdge[]
): { dependents: Record<string, string[]>; dependencies: Record<string, string[]> } {
  const dependents: Record<string, string[]> = {};
  const dependencies: Record<string, string[]> = {};
  for (const p of packages) {
    dependents[p] = [];
    dependencies[p] = [];
  }
  for (const e of packageEdges) {
    dependencies[e.from] = [...new Set([...(dependencies[e.from] ?? []), e.to])].sort();
    dependents[e.to] = [...new Set([...(dependents[e.to] ?? []), e.from])].sort();
  }
  return { dependents, dependencies };
}

/** Build package↔package + external maps from file adjacency (relative paths). */
export function buildPackageGraphMap(
  adjacency: Map<string, string[]>,
  opts?: { maxSamples?: number; root?: string }
): PackageGraphMap {
  const acc: EdgeAcc = {
    pkgEdges: new Map(),
    extEdges: new Map(),
    internalEdgeCount: 0,
    pkgSet: new Set(),
    maxSamples: opts?.maxSamples ?? 3,
    root: (opts?.root ?? '').replace(/\\/g, '/'),
  };

  for (const [from, tos] of adjacency) {
    for (const toRaw of tos) recordImportEdge(acc, from, toRaw);
  }
  for (const from of adjacency.keys()) {
    const p = pkgOf(from);
    if (p) acc.pkgSet.add(p);
  }

  const packages = [...acc.pkgSet].sort();
  const packageEdges = [...acc.pkgEdges.values()].sort(
    (a, b) => b.weight - a.weight || a.from.localeCompare(b.from) || a.to.localeCompare(b.to)
  );
  const externalEdges = [...acc.extEdges.values()].sort(
    (a, b) =>
      b.weight - a.weight ||
      a.fromPackage.localeCompare(b.fromPackage) ||
      a.targetPrefix.localeCompare(b.targetPrefix)
  );
  const { dependents, dependencies } = indexPackageDeps(packages, packageEdges);

  return {
    packages,
    packageEdges,
    externalEdges,
    internalEdgeCount: acc.internalEdgeCount,
    dependents,
    dependencies,
    layers: topologicalLayers(packages, packageEdges),
    packageCycles: findPackageCycles(packages, packageEdges),
  };
}

function topologicalLayers(packages: string[], edges: PackageEdge[]): string[][] {
  const indeg = new Map(packages.map(p => [p, 0]));
  const outs = new Map<string, string[]>(packages.map(p => [p, []]));
  for (const e of edges) {
    indeg.set(e.to, (indeg.get(e.to) ?? 0) + 1);
    outs.get(e.from)?.push(e.to);
  }
  const layers: string[][] = [];
  let frontier = packages.filter(p => (indeg.get(p) ?? 0) === 0).sort();
  const placed = new Set<string>();
  while (frontier.length) {
    layers.push(frontier);
    for (const p of frontier) placed.add(p);
    const next: string[] = [];
    for (const p of frontier) {
      for (const t of outs.get(p) ?? []) {
        const d = (indeg.get(t) ?? 0) - 1;
        indeg.set(t, d);
        if (d === 0 && !placed.has(t)) next.push(t);
      }
    }
    frontier = [...new Set(next)].sort();
  }
  // Cyclic leftovers
  const rest = packages.filter(p => !placed.has(p)).sort();
  if (rest.length) layers.push(rest);
  return layers;
}

function findPackageCycles(packages: string[], edges: PackageEdge[]): string[][] {
  const adj = new Map<string, string[]>(packages.map(p => [p, []]));
  for (const e of edges) adj.get(e.from)?.push(e.to);
  const cycles: string[][] = [];
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const stack: string[] = [];

  function dfs(n: string): void {
    if (cycles.length >= 10) return;
    if (visited.has(n)) return;
    if (visiting.has(n)) {
      const i = stack.indexOf(n);
      if (i >= 0) cycles.push([...stack.slice(i), n]);
      return;
    }
    visiting.add(n);
    stack.push(n);
    for (const m of adj.get(n) ?? []) dfs(m);
    stack.pop();
    visiting.delete(n);
    visited.add(n);
  }
  for (const p of packages) dfs(p);
  return cycles;
}

/** Mermaid flowchart (LR) for package + external planes. */
export function formatPackageMapMermaid(map: PackageGraphMap): string {
  const lines = ['flowchart LR', '  subgraph packages'];
  for (const p of map.packages) {
    lines.push(`    ${mermaidId(p)}["${p}"]`);
  }
  lines.push('  end');
  const extNodes = new Set(map.externalEdges.map(e => e.targetPrefix));
  if (extNodes.size) {
    lines.push('  subgraph external');
    for (const e of [...extNodes].sort()) {
      lines.push(`    ${mermaidId(e)}["${e}"]`);
    }
    lines.push('  end');
  }
  for (const e of map.packageEdges) {
    lines.push(`  ${mermaidId(e.from)} -->|${e.weight}| ${mermaidId(e.to)}`);
  }
  for (const e of map.externalEdges) {
    lines.push(`  ${mermaidId(e.fromPackage)} -.->|${e.weight}| ${mermaidId(e.targetPrefix)}`);
  }
  return lines.join('\n') + '\n';
}

/** Graphviz DOT for the same map. */
export function formatPackageMapDot(map: PackageGraphMap): string {
  const lines = [
    'digraph packages {',
    '  rankdir=LR;',
    '  node [shape=box, fontname="Helvetica"];',
  ];
  for (const p of map.packages) {
    lines.push(`  "${p}";`);
  }
  for (const e of map.packageEdges) {
    lines.push(`  "${e.from}" -> "${e.to}" [label="${e.weight}"];`);
  }
  for (const e of map.externalEdges) {
    lines.push(`  "${e.fromPackage}" -> "${e.targetPrefix}" [style=dashed, label="${e.weight}"];`);
  }
  lines.push('}');
  return lines.join('\n') + '\n';
}

function mermaidId(s: string): string {
  return s.replace(/[^a-zA-Z0-9_]/g, '_');
}

/** Intra-package file layers (topo) for one package folder. */
export function buildIntraPackageLayers(
  adjacency: Map<string, string[]>,
  packageName: string
): { fileCount: number; depth: number; layers: string[][]; entryFiles: string[] } {
  const prefix = `packages/${packageName}/`;
  const files = [...adjacency.keys()].filter(f => f.startsWith(prefix)).sort();
  const fileSet = new Set(files);
  const edges: PackageEdge[] = [];
  // Reuse PackageEdge shape with file paths as from/to
  for (const from of files) {
    for (const to of adjacency.get(from) ?? []) {
      if (!fileSet.has(to) && !to.startsWith(prefix)) continue;
      // Normalize extensionless locals into prefix match
      const toNorm = fileSet.has(to)
        ? to
        : files.find(f => f === to || f.startsWith(to + '.') || f.replace(/\.[^.]+$/, '') === to);
      if (!toNorm || !fileSet.has(toNorm)) continue;
      if (from === toNorm) continue;
      edges.push({ from, to: toNorm, weight: 1, samples: [] });
    }
  }
  const layers = topologicalLayers(files, edges);
  const entryFiles = files.filter(
    f => /\/(index|cli|main|bin)\.[a-z]+$/i.test(f) || layers[0]?.includes(f)
  );
  return {
    fileCount: files.length,
    depth: layers.length,
    layers: layers.map(L => L.map(f => f.slice(prefix.length))),
    entryFiles: entryFiles.map(f => f.slice(prefix.length)),
  };
}

/** Enrich map with intra-package depth for packages that have internal edges. */
export function enrichIntraPackageMap(
  map: PackageGraphMap,
  adjacency: Map<string, string[]>,
  opts?: { minFiles?: number }
): PackageGraphMap {
  const minFiles = opts?.minFiles ?? 2;
  const intra: NonNullable<PackageGraphMap['intra']> = {};
  for (const p of map.packages) {
    const info = buildIntraPackageLayers(adjacency, p);
    if (info.fileCount < minFiles) continue;
    intra[p] = info;
  }
  return { ...map, intra };
}

function classifyOutsideSpec(
  spec: string,
  nameSet: Set<string>,
  npmToShort: Map<string, string>
): { pkg: string; kind: OutsideImportKind } | null {
  if (npmToShort.has(spec)) return { pkg: npmToShort.get(spec)!, kind: 'workspace' };
  const m = spec.match(/^@factorywager\/([^/]+)/);
  if (m && nameSet.has(m[1]!)) return { pkg: m[1]!, kind: 'workspace' };
  const m2 = spec.match(/(?:^|\/)packages\/([^/]+)/);
  if (m2 && nameSet.has(m2[1]!)) return { pkg: m2[1]!, kind: 'relative' };
  return null;
}

/**
 * Scan repo planes (lib/tools/scripts/tests) for imports of workspace packages.
 * Uses Bun.Transpiler.scanImports — cheap string graph, not a full build.
 */
export async function scanOutsidePackageConsumers(
  root: string,
  packageNames: string[],
  opts?: { globs?: string[]; maxConsumers?: number }
): Promise<NonNullable<PackageGraphMap['outsideConsumers']>> {
  const { scanSourceImports } = await import('./monorepo-health.ts');
  const globs = opts?.globs ?? [
    'lib/**/*.{ts,tsx}',
    'tools/**/*.{ts,tsx}',
    'scripts/**/*.{ts,tsx}',
    'tests/**/*.{ts,tsx}',
    'config/**/*.{ts,tsx}',
  ];
  const maxConsumers = opts?.maxConsumers ?? 12;
  const nameSet = new Set(packageNames);
  const npmToShort = new Map(packageNames.map(p => [`@factorywager/${p}`, p]));
  const files = new Map<string, Set<string>>();
  const workspaceHits = new Map<string, number>();
  const relativeHits = new Map<string, number>();

  for (const pat of globs) {
    const g = new Bun.Glob(pat);
    for await (const f of g.scan({ cwd: root, absolute: false, onlyFiles: true })) {
      if (f.startsWith('packages/')) continue;
      let text: string;
      try {
        text = await Bun.file(`${root}/${f}`).text();
      } catch {
        continue;
      }
      const loader = f.endsWith('.tsx') ? 'tsx' : 'ts';
      let imports: Array<{ path: string }>;
      try {
        imports = scanSourceImports(text, loader);
      } catch {
        continue;
      }
      const seenInFile = new Set<string>();
      for (const im of imports) {
        const hit = classifyOutsideSpec(im.path, nameSet, npmToShort);
        if (!hit) continue;
        if (!seenInFile.has(hit.pkg)) {
          seenInFile.add(hit.pkg);
          const set = files.get(hit.pkg) ?? new Set();
          set.add(f);
          files.set(hit.pkg, set);
        }
        if (hit.kind === 'workspace') {
          workspaceHits.set(hit.pkg, (workspaceHits.get(hit.pkg) ?? 0) + 1);
        } else {
          relativeHits.set(hit.pkg, (relativeHits.get(hit.pkg) ?? 0) + 1);
        }
      }
    }
  }

  return packageNames
    .map(packageName => {
      const consumers = [...(files.get(packageName) ?? [])].sort();
      return {
        package: packageName,
        count: consumers.length,
        consumers: consumers.slice(0, maxConsumers),
        workspaceImports: workspaceHits.get(packageName) ?? 0,
        relativeImports: relativeHits.get(packageName) ?? 0,
      };
    })
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count || a.package.localeCompare(b.package));
}

/** Root package.json scripts that reference packages/<name> or @factorywager/<name>. */
export async function scanRootScriptRefs(
  root: string,
  packageNames: string[]
): Promise<NonNullable<PackageGraphMap['scriptRefs']>> {
  let scripts: Record<string, string> = {};
  try {
    const pkg = (await Bun.file(`${root}/package.json`).json()) as {
      scripts?: Record<string, string>;
    };
    scripts = pkg.scripts ?? {};
  } catch {
    return [];
  }
  const out: NonNullable<PackageGraphMap['scriptRefs']> = [];
  for (const p of packageNames) {
    const hits: string[] = [];
    const needlePkg = `packages/${p}`;
    const needleNpm = `@factorywager/${p}`;
    for (const [name, cmd] of Object.entries(scripts)) {
      if (cmd.includes(needlePkg) || cmd.includes(needleNpm)) hits.push(name);
    }
    if (hits.length) out.push({ package: p, scripts: hits.sort() });
  }
  return out.sort(
    (a, b) => b.scripts.length - a.scripts.length || a.package.localeCompare(b.package)
  );
}

/** Compare package.json workspace deps to actual cross-pkg metafile edges. */
export async function compareDeclaredWorkspaceDeps(
  root: string,
  map: PackageGraphMap
): Promise<NonNullable<PackageGraphMap['declared']>> {
  let rootDeps = new Set<string>();
  try {
    const rootPkg = (await Bun.file(`${root}/package.json`).json()) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    for (const [k, v] of Object.entries({
      ...rootPkg.dependencies,
      ...rootPkg.devDependencies,
    })) {
      if (k.startsWith('@factorywager/') && String(v).includes('workspace:')) {
        rootDeps.add(k.slice('@factorywager/'.length));
      }
    }
  } catch {
    rootDeps = new Set();
  }

  const out: NonNullable<PackageGraphMap['declared']> = [];
  for (const p of map.packages) {
    const pkgPath = `${root}/packages/${p}/package.json`;
    let npmName = `@factorywager/${p}`;
    const declaredWorkspace: string[] = [];
    try {
      const pkg = (await Bun.file(pkgPath).json()) as {
        name?: string;
        dependencies?: Record<string, string>;
        devDependencies?: Record<string, string>;
      };
      if (pkg.name) npmName = pkg.name;
      for (const [k, v] of Object.entries({
        ...pkg.dependencies,
        ...pkg.devDependencies,
      })) {
        if (k.startsWith('@factorywager/') && String(v).includes('workspace:')) {
          declaredWorkspace.push(k.slice('@factorywager/'.length));
        }
      }
    } catch {
      /* missing package.json */
    }
    declaredWorkspace.sort();
    const actualCrossPkg = [...(map.dependencies[p] ?? [])].sort();
    const declaredSet = new Set(declaredWorkspace);
    const actualSet = new Set(actualCrossPkg);
    out.push({
      package: p,
      npmName,
      declaredWorkspace,
      actualCrossPkg,
      missingInPackageJson: actualCrossPkg.filter(x => !declaredSet.has(x)),
      unusedDeclared: declaredWorkspace.filter(x => !actualSet.has(x)),
      inRootWorkspaceDeps: rootDeps.has(p),
    });
  }
  return out;
}

/** Reverse-aggregate externalEdges into hubs (heaviest shared planes first). */
export function buildExternalHubs(
  map: PackageGraphMap
): NonNullable<PackageGraphMap['externalHubs']> {
  const by = new Map<string, { plane: ExternalEdge['plane']; weight: number; from: Set<string> }>();
  for (const e of map.externalEdges) {
    const cur = by.get(e.targetPrefix) ?? {
      plane: e.plane,
      weight: 0,
      from: new Set<string>(),
    };
    cur.weight += e.weight;
    cur.from.add(e.fromPackage);
    by.set(e.targetPrefix, cur);
  }
  return [...by.entries()]
    .map(([targetPrefix, v]) => ({
      targetPrefix,
      plane: v.plane,
      weight: v.weight,
      fromPackages: [...v.from].sort(),
    }))
    .sort((a, b) => b.weight - a.weight || a.targetPrefix.localeCompare(b.targetPrefix));
}

/** Classify each package's coupling role (needs outsideConsumers + declared + scriptRefs). */
export function classifyPackageCoupling(
  map: PackageGraphMap
): NonNullable<PackageGraphMap['coupling']> {
  const outside = new Map((map.outsideConsumers ?? []).map(c => [c.package, c]));
  const scripts = new Map((map.scriptRefs ?? []).map(s => [s.package, s.scripts.length]));
  const declared = new Map((map.declared ?? []).map(d => [d.package, d]));
  return map.packages.map(p => {
    const oc = outside.get(p);
    const outsideCount = oc?.count ?? 0;
    const dependentCount = (map.dependents[p] ?? []).length;
    const scriptCount = scripts.get(p) ?? 0;
    const inRoot = declared.get(p)?.inRootWorkspaceDeps ?? false;
    let role: PackageCouplingRole;
    if (outsideCount > 0 || dependentCount > 0) {
      role = dependentCount > 0 && outsideCount === 0 ? 'internal-hub' : 'consumed';
    } else if (inRoot) {
      role = 'root-tooling';
    } else if (scriptCount > 0) {
      role = 'scripted';
    } else {
      role = 'dormant';
    }
    return {
      package: p,
      role,
      outsideCount,
      dependentCount,
      inRootWorkspaceDeps: inRoot,
      workspaceImports: oc?.workspaceImports ?? 0,
      relativeImports: oc?.relativeImports ?? 0,
      scriptCount,
    };
  });
}

/** Operator actions from coupling (wire / migrate / archive). */
export function buildCouplingActions(
  map: PackageGraphMap
): NonNullable<PackageGraphMap['actions']> {
  const coupling = map.coupling ?? classifyPackageCoupling(map);
  const actions: NonNullable<PackageGraphMap['actions']> = [];
  for (const c of coupling) {
    if (c.role === 'consumed') {
      if (!c.inRootWorkspaceDeps) {
        actions.push({
          package: c.package,
          action: 'wire-root-dep',
          reason: `consumed outside packages/ but missing from root workspace deps`,
        });
      }
      // Any residual packages/<name> path import is a bad import — even when workspace imports dominate.
      if (c.relativeImports > 0) {
        actions.push({
          package: c.package,
          action: 'migrate-relative-imports',
          reason: `${c.relativeImports} relative packages/${c.package} import(s); prefer @factorywager/${c.package}`,
        });
      }
      if (c.inRootWorkspaceDeps && c.workspaceImports > 0 && c.relativeImports === 0) {
        actions.push({
          package: c.package,
          action: 'ok',
          reason: 'workspace imports + root dep aligned',
        });
      }
    } else if (c.role === 'dormant') {
      actions.push({
        package: c.package,
        action: 'archive-candidate',
        reason: 'no outside imports, no root dep, no package.json script refs',
      });
    } else if (c.role === 'scripted') {
      actions.push({
        package: c.package,
        action: 'wire-root-dep',
        reason: `referenced by ${c.scriptCount} root script(s) but not in root workspace deps`,
      });
    }
  }
  return actions.sort(
    (a, b) => a.package.localeCompare(b.package) || a.action.localeCompare(b.action)
  );
}

function isEmptyExportIndex(text: string): boolean {
  const stripped = text
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\n]*/g, '')
    .replace(/^\s*["']use strict["'];?\s*/m, '')
    .trim();
  return stripped === '' || /^export\s*\{\s*\};?\s*$/.test(stripped);
}

/** Probe dormant / archive-candidate packages for placeholder vs real library. */
export async function probeArchiveCandidates(
  root: string,
  map: PackageGraphMap
): Promise<NonNullable<PackageGraphMap['archiveProbes']>> {
  const dormant = new Set(
    (map.coupling ?? []).filter(c => c.role === 'dormant').map(c => c.package)
  );
  const out: NonNullable<PackageGraphMap['archiveProbes']> = [];
  for (const p of [...dormant].sort()) {
    const srcGlob = new Bun.Glob(`packages/${p}/src/**/*.{ts,tsx}`);
    const testGlob = new Bun.Glob(`packages/${p}/**/*.{test,spec}.{ts,tsx}`);
    let srcFiles = 0;
    let bytes = 0;
    for await (const f of srcGlob.scan({ cwd: root, absolute: false, onlyFiles: true })) {
      srcFiles++;
      try {
        bytes += (await Bun.file(`${root}/${f}`).arrayBuffer()).byteLength;
      } catch {
        /* skip */
      }
    }
    let hasTests = false;
    for await (const _ of testGlob.scan({ cwd: root, absolute: false, onlyFiles: true })) {
      hasTests = true;
      break;
    }
    let indexText = '';
    for (const cand of [`packages/${p}/src/index.ts`, `packages/${p}/src/index.tsx`]) {
      try {
        indexText = await Bun.file(`${root}/${cand}`).text();
        break;
      } catch {
        /* try next */
      }
    }
    const indexIsEmptyExport = indexText ? isEmptyExportIndex(indexText) : srcFiles === 0;
    let kind: 'placeholder' | 'library' | 'empty' = 'library';
    if (srcFiles === 0) kind = 'empty';
    else if (indexIsEmptyExport && srcFiles <= 1) kind = 'placeholder';
    else if (indexIsEmptyExport) kind = 'placeholder';

    let recommendation: 'archive' | 'keep-review' | 'promote' = 'keep-review';
    let note = 'dormant with real source — review before archive';
    if (kind === 'placeholder' || kind === 'empty') {
      recommendation = 'archive';
      note = kind === 'empty' ? 'no src files' : 'index is empty export / placeholder';
    } else if (hasTests) {
      recommendation = 'keep-review';
      note = 'has tests but no outside consumers';
    }

    out.push({
      package: p,
      kind,
      srcFiles,
      bytes,
      hasTests,
      indexIsEmptyExport,
      recommendation,
      note,
    });
  }
  return out;
}

/** Per-package coupling score (same grade bands as monorepo-health). */
export function scorePackageCoupling(
  map: PackageGraphMap,
  packageStats?: Record<string, { orphans?: number; bytes?: number }>
): NonNullable<PackageGraphMap['packageScores']> {
  const coupling = new Map((map.coupling ?? []).map(c => [c.package, c]));
  const probes = new Map((map.archiveProbes ?? []).map(p => [p.package, p]));
  return map.packages.map(p => {
    const c = coupling.get(p);
    const probe = probes.get(p);
    const orphans = packageStats?.[p]?.orphans ?? 0;
    let score = 100;
    const reasons: string[] = [];
    if (orphans > 0) {
      score -= Math.min(40, orphans * 10);
      reasons.push(`${orphans} orphan file(s)`);
    }
    if (c?.relativeImports && c.relativeImports > 0) {
      // Penalize residual relative packages/* imports even when workspace imports exist.
      const onlyRelative = (c.workspaceImports ?? 0) === 0;
      score -= onlyRelative ? 15 : 8;
      reasons.push(
        onlyRelative
          ? 'relative-only outside imports'
          : `${c.relativeImports} residual relative import(s)`
      );
    }
    if (c?.role === 'consumed' && !c.inRootWorkspaceDeps) {
      score -= 20;
      reasons.push('consumed but missing root workspace dep');
    }
    if (c?.role === 'scripted') {
      score -= 10;
      reasons.push('scripted but not in root workspace deps');
    }
    if (c?.role === 'dormant') {
      if (probe?.kind === 'placeholder' || probe?.kind === 'empty') {
        score -= 25;
        reasons.push(`dormant ${probe.kind}`);
      } else {
        score -= 15;
        reasons.push('dormant library');
      }
    }
    if ((map.packageCycles ?? []).some(cycle => cycle.includes(p))) {
      score -= 30;
      reasons.push('in cross-package cycle');
    }
    score = Math.max(0, Math.min(100, score));
    const grade = score >= 90 ? 'healthy' : score >= 60 ? 'needs-improvement' : 'critical';
    if (!reasons.length) reasons.push('aligned');
    return { package: p, score, grade, reasons };
  });
}

export function buildMapSummary(map: PackageGraphMap): NonNullable<PackageGraphMap['summary']> {
  const coupling = map.coupling ?? [];
  const scores = map.packageScores ?? [];
  const avg =
    scores.length === 0
      ? 100
      : Number((scores.reduce((s, x) => s + x.score, 0) / scores.length).toFixed(1));
  return {
    packageCount: map.packages.length,
    consumed: coupling.filter(c => c.role === 'consumed').length,
    rootTooling: coupling.filter(c => c.role === 'root-tooling').length,
    scripted: coupling.filter(c => c.role === 'scripted').length,
    dormant: coupling.filter(c => c.role === 'dormant').length,
    openActions: (map.actions ?? []).filter(a => a.action !== 'ok').length,
    archivePlaceholders: (map.archiveProbes ?? []).filter(p => p.recommendation === 'archive')
      .length,
    avgPackageScore: avg,
    topHub: map.externalHubs?.[0]?.targetPrefix ?? null,
  };
}

/** Attach hubs + coupling + actions (+ optional probes/scores when root given). */
export function enrichCouplingMap(map: PackageGraphMap): PackageGraphMap {
  const withHubs = {
    ...map,
    externalHubs: buildExternalHubs(map),
    coupling: classifyPackageCoupling(map),
  };
  return {
    ...withHubs,
    actions: buildCouplingActions(withHubs),
  };
}

/** Detect repo wiring that blocks hard-delete of archive-recommended packages. */
export async function buildQuarantineList(
  root: string,
  map: PackageGraphMap
): Promise<NonNullable<PackageGraphMap['quarantine']>> {
  const candidates = (map.archiveProbes ?? []).filter(p => p.recommendation === 'archive');
  if (!candidates.length) return [];

  const blockChecks: Array<{ label: string; read: () => Promise<string> }> = [
    {
      label: 'tsconfig.json',
      read: () => Bun.file(`${root}/tsconfig.json`).text(),
    },
    {
      label: 'docs/IMPORT_BOUNDARIES.md',
      read: () => Bun.file(`${root}/docs/IMPORT_BOUNDARIES.md`).text(),
    },
    {
      label: 'scripts/verify-package-import-boundaries.ts',
      read: () => Bun.file(`${root}/scripts/verify-package-import-boundaries.ts`).text(),
    },
    {
      label: '.agents/skills/ast-grep/repo-map.json',
      read: () => Bun.file(`${root}/.agents/skills/ast-grep/repo-map.json`).text(),
    },
  ];
  const texts: Array<{ label: string; text: string }> = [];
  for (const c of blockChecks) {
    try {
      texts.push({ label: c.label, text: await c.read() });
    } catch {
      /* optional */
    }
  }

  return candidates.map(p => {
    const needles = [`packages/${p.package}`, `@factorywager/${p.package}`];
    const blockedBy = texts.filter(t => needles.some(n => t.text.includes(n))).map(t => t.label);
    return {
      package: p.package,
      reason: p.note,
      blockedBy,
    };
  });
}

/** Full deep enrichment: coupling → archive probes → scores → quarantine → summary. */
export async function enrichDeepPackageMap(
  map: PackageGraphMap,
  root: string,
  opts?: { packageStats?: Record<string, { orphans?: number; bytes?: number }> }
): Promise<PackageGraphMap> {
  let next = enrichCouplingMap(map);
  next = { ...next, archiveProbes: await probeArchiveCandidates(root, next) };
  next = { ...next, quarantine: await buildQuarantineList(root, next) };
  next = { ...next, packageScores: scorePackageCoupling(next, opts?.packageStats) };
  const summary = buildMapSummary(next);
  next = {
    ...next,
    summary: {
      ...summary,
      quarantineCount: next.quarantine?.length ?? 0,
    },
  };
  return next;
}

/**
 * Apply `wire-root-dep` actions by adding `@factorywager/<pkg>: workspace:*` to root dependencies.
 * Does not migrate imports or archive packages.
 */
export async function applyWireRootDeps(
  root: string,
  packagesToWire: string[],
  opts?: { dryRun?: boolean }
): Promise<{ added: string[]; skipped: string[]; dryRun: boolean }> {
  const pkgPath = `${root}/package.json`;
  const pkg = (await Bun.file(pkgPath).json()) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  };
  const deps = { ...(pkg.dependencies ?? {}) };
  const added: string[] = [];
  const skipped: string[] = [];
  for (const p of [...new Set(packagesToWire)].sort()) {
    const name = `@factorywager/${p}`;
    if (deps[name]?.includes('workspace:') || pkg.devDependencies?.[name]?.includes('workspace:')) {
      skipped.push(p);
      continue;
    }
    deps[name] = 'workspace:*';
    added.push(p);
  }
  if (!opts?.dryRun && added.length) {
    const sorted = Object.fromEntries(Object.entries(deps).sort(([a], [b]) => a.localeCompare(b)));
    pkg.dependencies = sorted;
    await Bun.write(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
  }
  return { added, skipped, dryRun: !!opts?.dryRun };
}

/** Mermaid for one package's intra file topo layers (ranks only — not a full edge dump). */
export function formatIntraPackageMermaid(
  packageName: string,
  info: NonNullable<PackageGraphMap['intra']>[string]
): string {
  const lines = [
    `flowchart TB`,
    `  subgraph ${mermaidId(packageName)}["${packageName} depth=${info.depth}"]`,
  ];
  for (let i = 0; i < info.layers.length; i++) {
    const id = `${mermaidId(packageName)}_L${i}`;
    const files = (info.layers[i] ?? []).join('<br/>') || '—';
    lines.push(`    ${id}["L${i}<br/>${files}"]`);
    if (i > 0) {
      lines.push(`    ${mermaidId(packageName)}_L${i - 1} --> ${id}`);
    }
  }
  lines.push(`  end`);
  return lines.join('\n') + '\n';
}

/** Non-ok coupling actions for operator / agent triage (bake top-level openActions). */
export type OpenCouplingAction = NonNullable<PackageGraphMap['actions']>[number] & {
  action: Exclude<CouplingAction, 'ok'>;
};

/** Compact operator rollup on packages-graph-map bake (schema v13 additive). */
export type PackagesGraphGlance = {
  score: number;
  grade: string;
  packageCount: number;
  consumed: number;
  dormant: number;
  openActions: number;
  avgPackageScore: number | null;
  orphanCount: number;
  cycleCount: number;
  hubCount: number;
  externalEdges: number;
  crossPackageEdges: number;
  topHub: string | null;
  surfacesPages: number | null;
  surfacesRegOrphan: number | null;
};

/** Portal board for this bake. */
export const PACKAGES_GRAPH_BOARD = '/portal/packages/' as const;

/**
 * Filter coupling actions to open work (exclude ok).
 */
export function filterOpenCouplingActions(
  actions: PackageGraphMap['actions'] | null | undefined
): OpenCouplingAction[] {
  return (actions ?? []).filter(
    (a): a is OpenCouplingAction => !!a && a.action !== 'ok' && typeof a.package === 'string'
  );
}

/**
 * Build operator glance from map + audit totals (+ optional surfaces summary).
 */
export function buildPackagesGraphGlance(input: {
  score: number;
  grade: string;
  map: PackageGraphMap;
  totals: {
    orphanCount: number;
    cycleCount: number;
    hubCount: number;
    externalEdges: number;
    crossPackageEdges: number;
    openActions?: number;
    avgPackageScore?: number;
  };
  surfacesSummary?: {
    portalPages?: number;
    registryOrphanFromPortal?: number;
  } | null;
}): PackagesGraphGlance {
  const summary = input.map.summary;
  const openFromActions = filterOpenCouplingActions(input.map.actions).length;
  return {
    score: input.score,
    grade: input.grade,
    packageCount: summary?.packageCount ?? input.map.packages.length,
    consumed: summary?.consumed ?? 0,
    dormant: summary?.dormant ?? 0,
    openActions: input.totals.openActions ?? summary?.openActions ?? openFromActions,
    avgPackageScore: input.totals.avgPackageScore ?? summary?.avgPackageScore ?? null,
    orphanCount: input.totals.orphanCount,
    cycleCount: input.totals.cycleCount,
    hubCount: input.totals.hubCount,
    externalEdges: input.totals.externalEdges,
    crossPackageEdges: input.totals.crossPackageEdges,
    topHub: summary?.topHub ?? null,
    surfacesPages:
      typeof input.surfacesSummary?.portalPages === 'number'
        ? input.surfacesSummary.portalPages
        : null,
    surfacesRegOrphan:
      typeof input.surfacesSummary?.registryOrphanFromPortal === 'number'
        ? input.surfacesSummary.registryOrphanFromPortal
        : null,
  };
}
