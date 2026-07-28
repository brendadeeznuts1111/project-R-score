// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
/**
 * Package-level dependency mapping from a file-level import adjacency.
 * Used by tools/packages-metafile-audit.ts (schema v5+).
 */

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
  ];
  const maxConsumers = opts?.maxConsumers ?? 12;
  const nameSet = new Set(packageNames);
  const npmToShort = new Map(packageNames.map(p => [`@factorywager/${p}`, p]));
  const hits = new Map<string, Set<string>>();

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
      for (const im of imports) {
        const spec = im.path;
        let pkg: string | null = null;
        if (npmToShort.has(spec)) pkg = npmToShort.get(spec)!;
        else {
          const m = spec.match(/^@factorywager\/([^/]+)/);
          if (m && nameSet.has(m[1]!)) pkg = m[1]!;
          else {
            const m2 = spec.match(/packages\/([^/]+)/);
            if (m2 && nameSet.has(m2[1]!)) pkg = m2[1]!;
          }
        }
        if (!pkg) continue;
        const set = hits.get(pkg) ?? new Set();
        set.add(f);
        hits.set(pkg, set);
      }
    }
  }

  return packageNames
    .map(packageName => {
      const consumers = [...(hits.get(packageName) ?? [])].sort();
      return {
        package: packageName,
        count: consumers.length,
        consumers: consumers.slice(0, maxConsumers),
      };
    })
    .filter(r => r.count > 0)
    .sort((a, b) => b.count - a.count || a.package.localeCompare(b.package));
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
