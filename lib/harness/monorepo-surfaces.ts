// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob#quickstart — Bun.Glob
// @see https://bun.com/docs/bundler/loaders#jsonc — jsonc theme tokens
/**
 * Multi-surface monorepo inventory for packages-graph-map (schema v13+).
 *
 * Why this exists: packages star-src import coupling is only one plane.
 * Operators also see portal chrome, brand icons, registry bake JSON, and
 * full workspace package.json members (STO + lib/shared). This module
 * inventories those surfaces without inventing edges between planes.
 *
 * Claim: packages-graph-map-v13 · monorepo-surfaces schema v2
 */

import { Glob } from 'bun';
import { joinPath } from '../path-bun.ts';

export type WorkspaceMember = {
  /** Repo-relative directory (packages/rip, lib/shared, …). */
  path: string;
  /** package.json name when present. */
  name: string;
  version?: string;
  /** packages | lib | projects | other */
  plane: 'packages' | 'lib' | 'projects' | 'other';
  /** True when path is under packages/ (import-graph audit plane). */
  inPackagesGraph: boolean;
};

export type PortalPage = {
  /** URL path e.g. /portal/ops/ */
  href: string;
  /** Directory slug under public/portal */
  slug: string;
  hasIndex: boolean;
  hasMd: boolean;
  /** Script srcs referenced from this page shell (repo-relative web paths). */
  scripts?: string[];
};

export type PortalModule = {
  path: string; // brand-ok — portal relative path
  kind: 'component' | 'module' | 'style' | 'theme' | 'template' | 'page-script';
  id: string; // brand-ok — file basename without ext
};

export type BrandAsset = {
  path: string; // brand-ok — public/ relative
  tenant?: string; // brand-ok — factory|science|tennis|telegram
  kind: 'icon' | 'brand' | 'manifest';
};

/** Heuristic family when JSON has no kind field (most registry bakes). */
export type RegistryFamily =
  | 'proof'
  | 'ops'
  | 'compliance'
  | 'portal'
  | 'verification'
  | 'vault'
  | 'telegram'
  | 'health'
  | 'catalog'
  | 'packages'
  | 'env'
  | 'tenant'
  | 'other';

export type RegistryArtifact = {
  /** File name under public/registry (top-level .json only). */
  file: string;
  /** kind field from JSON when present. */
  kind: string | null;
  /** schemaVersion when present. */
  schemaVersion: number | null;
  bytes: number;
  /** Heuristic family from kind or filename (v2). */
  family: RegistryFamily;
};

export type PortalRegistryRef = {
  /** Path as referenced e.g. /registry/ops-summary.json */
  path: string;
  /** Source portal files that reference it. */
  from: string[];
  /** True when public/registry/<file> exists. */
  exists: boolean;
};

export type LibPlaneDir = {
  name: string; // brand-ok — lib/<name>
  hasPackageJson: boolean;
  /** Approximate .ts/.tsx file count (depth-capped). */
  tsFiles: number;
};

export type StoNestedPackage = {
  path: string;
  name: string;
  version?: string;
};

export type ThemeInventory = {
  jsonc: boolean;
  tokensCss: boolean;
  styleCss: boolean;
  version?: string;
  colorSchemeDefault?: string;
  darkTokenCount: number;
  lightTokenCount: number;
  fontKeys: string[]; // brand-ok — theme font slot keys
  layoutKeys: string[]; // brand-ok — theme layout slot keys
};

export type MonorepoSurfaces = {
  schemaVersion: 2;
  kind: 'monorepo-surfaces';
  generatedAt: string;
  summary: {
    workspaceMembers: number;
    packagesPlane: number;
    otherWorkspaces: number;
    portalPages: number;
    portalModules: number;
    chromeComponents: number;
    brandAssets: number;
    registryTopLevelJson: number;
    registryStoragePackages: number;
    /** v2 */
    libTopLevelDirs?: number;
    stoNestedPackages?: number;
    portalRegistryRefs?: number;
    registryOrphanFromPortal?: number;
    registryFamilyCount?: number;
    themeDarkTokens?: number;
  };
  /** Full workspace package.json members (root workspaces globs). */
  workspaces: WorkspaceMember[];
  /** Dir names under packages/ that the import graph scans. */
  packagesGraphDirs: string[];
  portal: {
    pages: PortalPage[];
    modules: PortalModule[];
    /** From baked portal-chrome.json when available. */
    chromeComponents: Array<{
      id: string; // brand-ok — chrome component key, not domain *Id
      path: string;
      kind: string;
      role: string;
      onDisk?: boolean;
    }>;
    theme: ThemeInventory;
    /** Modules counted by kind (v2). */
    modulesByKind?: Record<string, number>;
  };
  brand: {
    tenants: string[]; // brand-ok — icon tenant ids
    assets: BrandAsset[];
  };
  registry: {
    topLevel: RegistryArtifact[];
    storagePackageNames: string[]; // brand-ok — published artifact names under storage/
    scopedLatest: string[]; // brand-ok — @factorywager/*/latest.json paths
    /** Family rollup counts (v2). */
    byFamily?: Array<{ family: RegistryFamily; count: number }>;
    /** /registry/*.json referenced from portal JS/HTML (v2). */
    portalRefs?: PortalRegistryRef[];
    /** Top-level registry JSON never referenced from portal (v2). */
    orphanFromPortal?: string[];
  };
  /** lib/ top-level dirs (not only workspace package.json members) (v2). */
  libPlane?: {
    dirs: LibPlaneDir[];
    workspaceShared: boolean;
  };
  /** Nested package.json under sports-terminal-os (v2). */
  sto?: {
    root: string;
    nested: StoNestedPackage[];
  };
  /** Explicit plane map so operators know why counts differ. */
  planes: Array<{
    id: string; // brand-ok — surface plane id
    label: string;
    count: number;
    bake?: string;
    portal?: string;
    note: string;
  }>;
};

const SKIP_PORTAL_DIRS = new Set(['components', 'dist', 'icons', 'node_modules']);

const RE_PKG_JSON_SUFFIX = /\/package\.json$/;
const RE_BACKSLASH = /\\/g;
const RE_PORTAL_PREFIX = /^public\/portal\//;
const RE_INDEX_HTML = /\/index\.html$/;
const RE_EXT = /\.(js|css|html|jsonc)$/;
const RE_REGISTRY_PREFIX = /^public\/registry\//;
const RE_REGISTRY_REF = /\/registry\/[A-Za-z0-9_@./-]+\.json/g;
const RE_SCRIPT_SRC = /src=["']([^"']+)["']/g;

function planeOfWorkspacePath(rel: string): WorkspaceMember['plane'] {
  if (rel.startsWith('packages/')) return 'packages';
  if (rel.startsWith('lib/')) return 'lib';
  if (rel.startsWith('projects/')) return 'projects';
  return 'other';
}

/** Exact basename → family (no .json). */
const REGISTRY_FAMILY_EXACT: Record<string, RegistryFamily> = {
  'portal-chrome': 'portal',
  'portal-weave': 'portal',
  'packages-graph-map': 'packages',
  'package-info': 'packages',
  'env-inventory': 'env',
  'monorepo-health': 'health',
  'vps-health': 'health',
  monitoring: 'health',
  'limit-raises': 'compliance',
  'dod-queue': 'compliance',
  'dod-registry': 'compliance',
  'proof-taxonomy-audit': 'verification',
  ratchet: 'verification',
  'release-features': 'verification',
  'catalog-snapshot': 'catalog',
  'skills-catalog': 'catalog',
  'harness-skills-catalog': 'catalog',
  'doc-index': 'catalog',
  static: 'catalog',
  'content-type-matrix': 'catalog',
  'channel-meta-bake': 'catalog',
  'install-platform': 'catalog',
  'ops-summary': 'ops',
  'toc-ops': 'ops',
  'toc-ops-bake-proof': 'ops',
  'seat-capital-desk': 'ops',
  'cloudflare-pages-preflight': 'ops',
  failures: 'ops',
  'projects-registry': 'tenant',
};

/** Substring match on kind or basename → family (first hit wins). */
const REGISTRY_FAMILY_NEEDLES: Array<{ needle: string; family: RegistryFamily }> = [
  { needle: 'portal-chrome', family: 'portal' },
  { needle: 'portal-weave', family: 'portal' },
  { needle: 'packages-graph', family: 'packages' },
  { needle: 'vault', family: 'vault' },
  { needle: 'env-inventory', family: 'env' },
  { needle: 'monorepo-health', family: 'health' },
  { needle: 'telegram', family: 'telegram' },
  { needle: 'compliance', family: 'compliance' },
  { needle: 'verification', family: 'verification' },
  { needle: 'test-failures', family: 'ops' },
  { needle: 'proof', family: 'proof' },
  { needle: 'ops', family: 'ops' },
  { needle: 'tenant', family: 'tenant' },
];

/**
 * Classify registry JSON into operator families.
 * Table-driven (exact basename + needles) to keep cyclomatic complexity low.
 */
export function classifyRegistryFamily(
  file: string,
  kind: string | null | undefined
): RegistryFamily {
  const f = file.toLowerCase().replace(/\.json$/, '');
  const k = (kind ?? '').toLowerCase();

  const exact = REGISTRY_FAMILY_EXACT[f];
  if (exact) return exact;

  if (f.startsWith('package-')) return 'packages';
  if (f.startsWith('vault-')) return 'vault';
  if (f.endsWith('-health')) return 'health';
  if (f.startsWith('compliance')) return 'compliance';
  if (f.startsWith('verification-')) return 'verification';
  if (f.endsWith('-proof') || f.includes('-proof') || f.endsWith('proof')) return 'proof';
  if (f.startsWith('test-failures')) return 'ops';
  if (f.startsWith('toc-')) return 'tenant';

  const hay = k || f;
  for (const row of REGISTRY_FAMILY_NEEDLES) {
    if (hay.includes(row.needle)) return row.family;
  }
  return 'other';
}

/** Disk path for a chrome/module web path like /portal/foo.js → public/portal/foo.js */
function webPathToPublicRel(webPath: string): string {
  const p = webPath.startsWith('/') ? webPath.slice(1) : webPath;
  if (p.startsWith('public/')) return p;
  return 'public/' + p;
}

/** Expand root workspaces globs to concrete package.json dirs. */
export async function discoverWorkspaceMembers(root: string): Promise<WorkspaceMember[]> {
  const pkgPath = joinPath(root, 'package.json');
  const rootPkg = (await Bun.file(pkgPath).json()) as {
    workspaces?: string[] | { packages?: string[] };
  };
  const patterns = Array.isArray(rootPkg.workspaces)
    ? rootPkg.workspaces
    : (rootPkg.workspaces?.packages ?? []);

  const seen = new Set<string>();
  const out: WorkspaceMember[] = [];

  for (const pattern of patterns) {
    // packages/* -> packages/*/package.json ; exact path -> path/package.json
    const base = pattern.endsWith('/') ? pattern.slice(0, -1) : pattern;
    const globPat = base + '/package.json';
    const g = new Glob(globPat);
    for await (const match of g.scan({ cwd: root, onlyFiles: true, absolute: false })) {
      const dir = match.replace(RE_PKG_JSON_SUFFIX, '').replace(RE_BACKSLASH, '/');
      if (seen.has(dir)) continue;
      seen.add(dir);
      let name = dir.split('/').pop() ?? dir;
      let version: string | undefined;
      try {
        const j = (await Bun.file(joinPath(root, match)).json()) as {
          name?: string;
          version?: string;
        };
        if (j.name) name = j.name;
        if (j.version) version = j.version;
      } catch {
        /* ignore unreadable */
      }
      const plane = planeOfWorkspacePath(dir);
      out.push({
        path: dir,
        name,
        version,
        plane,
        inPackagesGraph: plane === 'packages',
      });
    }
  }

  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export async function discoverPackagesGraphDirs(root: string): Promise<string[]> {
  const g = new Glob('packages/*/package.json');
  const dirs: string[] = [];
  for await (const match of g.scan({ cwd: root, onlyFiles: true, absolute: false })) {
    const name = match.replace(/^packages\//, '').replace(RE_PKG_JSON_SUFFIX, '');
    if (name && !name.includes('/')) dirs.push(name);
  }
  return dirs.sort();
}

async function extractScriptSrcs(htmlPath: string): Promise<string[]> {
  try {
    const text = await Bun.file(htmlPath).text();
    const out: string[] = [];
    RE_SCRIPT_SRC.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = RE_SCRIPT_SRC.exec(text)) !== null) {
      const src = m[1];
      if (!src || src.startsWith('http') || src.startsWith('//')) continue;
      out.push(src.startsWith('/') ? src : '/' + src);
    }
    return out;
  } catch {
    return [];
  }
}

export async function discoverPortalPages(root: string): Promise<PortalPage[]> {
  const portalRoot = joinPath(root, 'public/portal');
  const pages: PortalPage[] = [];
  // Root portal home
  const homeIndexPath = joinPath(portalRoot, 'index.html');
  const homeIndex = Bun.file(homeIndexPath);
  if (await homeIndex.exists()) {
    pages.push({
      href: '/portal/',
      slug: '',
      hasIndex: true,
      hasMd: await Bun.file(joinPath(portalRoot, 'index.md')).exists(),
      scripts: await extractScriptSrcs(homeIndexPath),
    });
  }
  const g = new Glob('public/portal/*/index.html');
  for await (const match of g.scan({ cwd: root, onlyFiles: true, absolute: false })) {
    const slug = match.replace(RE_PORTAL_PREFIX, '').replace(RE_INDEX_HTML, '');
    if (SKIP_PORTAL_DIRS.has(slug)) continue;
    pages.push({
      href: '/portal/' + slug + '/',
      slug,
      hasIndex: true,
      hasMd: await Bun.file(joinPath(root, 'public/portal/' + slug + '.md')).exists(),
      scripts: await extractScriptSrcs(joinPath(root, match)),
    });
  }
  return pages.sort((a, b) => a.href.localeCompare(b.href));
}

export async function discoverPortalModules(root: string): Promise<PortalModule[]> {
  const out: PortalModule[] = [];
  const add = (rel: string, kind: PortalModule['kind']) => {
    const base = rel.split('/').pop() ?? rel;
    const id = base.replace(RE_EXT, '');
    const webPath = '/' + rel.replace(/^public/, '').replace(RE_BACKSLASH, '/');
    out.push({ path: webPath, kind, id });
  };

  for await (const m of new Glob('public/portal/components/*.js').scan({
    cwd: root,
    onlyFiles: true,
  })) {
    add(m, 'component');
  }
  for await (const m of new Glob('public/portal/*.js').scan({ cwd: root, onlyFiles: true })) {
    add(m, 'module');
  }
  // Page-local scripts (ops/toc/dod dashboards)
  for await (const m of new Glob('public/portal/*/*.js').scan({ cwd: root, onlyFiles: true })) {
    if (m.includes('/components/')) continue;
    add(m, 'page-script');
  }
  if (await Bun.file(joinPath(root, 'public/portal/style.css')).exists()) {
    add('public/portal/style.css', 'style');
  }
  if (await Bun.file(joinPath(root, 'public/portal/theme-tokens.css')).exists()) {
    add('public/portal/theme-tokens.css', 'theme');
  }
  if (await Bun.file(joinPath(root, 'public/portal/theme.jsonc')).exists()) {
    add('public/portal/theme.jsonc', 'theme');
  }
  if (await Bun.file(joinPath(root, 'public/portal/_page-template.html')).exists()) {
    add('public/portal/_page-template.html', 'template');
  }
  return out.sort((a, b) => a.path.localeCompare(b.path));
}

export async function loadChromeComponents(root: string): Promise<
  Array<{
    id: string; // brand-ok — chrome component key, not domain *Id
    path: string;
    kind: string;
    role: string;
  }>
> {
  const p = joinPath(root, 'public/registry/portal-chrome.json');
  const f = Bun.file(p);
  if (!(await f.exists())) return [];
  try {
    const j = (await f.json()) as {
      components?: Array<{
        id?: string; // brand-ok — chrome component key from portal-chrome.json
        path?: string;
        kind?: string;
        role?: string;
      }>;
    };
    return (j.components ?? [])
      .filter(c => c.id && c.path)
      .map(c => ({
        id: String(c.id), // brand-ok — opaque chrome component key
        path: String(c.path),
        kind: String(c.kind ?? 'module'),
        role: String(c.role ?? ''),
      }));
  } catch {
    return [];
  }
}

export async function discoverBrandAssets(root: string): Promise<{
  tenants: string[];
  assets: BrandAsset[];
}> {
  const assets: BrandAsset[] = [];
  const tenants = new Set<string>();

  for await (const m of new Glob('public/icons/**/*').scan({
    cwd: root,
    onlyFiles: true,
  })) {
    const rel = m.replace(RE_BACKSLASH, '/');
    if (rel.endsWith('manifest.json')) {
      assets.push({ path: rel, kind: 'manifest' });
      continue;
    }
    const parts = rel.split('/');
    // public/icons/<tenant>/...
    const tenant = parts[2];
    if (tenant && tenant !== 'manifest.json') tenants.add(tenant);
    assets.push({ path: rel, tenant, kind: 'icon' });
  }

  for await (const m of new Glob('public/brand/**/*').scan({
    cwd: root,
    onlyFiles: true,
  })) {
    const rel = m.replace(RE_BACKSLASH, '/');
    const parts = rel.split('/');
    const tenant = parts[2];
    if (tenant) tenants.add(tenant);
    assets.push({ path: rel, tenant, kind: 'brand' });
  }

  return {
    tenants: [...tenants].sort(),
    assets: assets.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

export async function discoverRegistryArtifacts(root: string): Promise<{
  topLevel: RegistryArtifact[];
  storagePackageNames: string[];
  scopedLatest: string[];
}> {
  const topLevel: RegistryArtifact[] = [];

  for await (const m of new Glob('public/registry/*.json').scan({
    cwd: root,
    onlyFiles: true,
  })) {
    const file = m.replace(RE_REGISTRY_PREFIX, '');
    const abs = joinPath(root, m);
    const f = Bun.file(abs);
    const bytes = f.size;
    let kind: string | null = null;
    let schemaVersion: number | null = null;
    try {
      const j = (await f.json()) as { kind?: string; schemaVersion?: number };
      if (typeof j.kind === 'string') kind = j.kind;
      if (typeof j.schemaVersion === 'number') schemaVersion = j.schemaVersion;
    } catch {
      /* binary or invalid */
    }
    topLevel.push({
      file,
      kind,
      schemaVersion,
      bytes,
      family: classifyRegistryFamily(file, kind),
    });
  }

  const storagePackageNames = new Set<string>();
  for await (const m of new Glob('public/registry/storage/**/artifact.tgz').scan({
    cwd: root,
    onlyFiles: true,
  })) {
    // public/registry/storage/@scope/name/version/artifact.tgz or storage/name/version/
    const parts = m.replace(RE_BACKSLASH, '/').split('/');
    const storageIdx = parts.indexOf('storage');
    if (storageIdx < 0) continue;
    const after = parts.slice(storageIdx + 1);
    // drop version + artifact.tgz
    if (after.length >= 3) {
      const nameParts = after.slice(0, -2);
      storagePackageNames.add(nameParts.join('/'));
    }
  }

  const scopedLatest: string[] = [];
  for await (const m of new Glob('public/registry/@*/*/latest.json').scan({
    cwd: root,
    onlyFiles: true,
  })) {
    scopedLatest.push(m.replace(RE_REGISTRY_PREFIX, '').replace(RE_BACKSLASH, '/'));
  }

  return {
    topLevel: topLevel.sort((a, b) => a.file.localeCompare(b.file)),
    storagePackageNames: [...storagePackageNames].sort(),
    scopedLatest: scopedLatest.sort(),
  };
}

/** Scan portal JS/HTML for /registry/*.json references. */
export async function discoverPortalRegistryRefs(root: string): Promise<PortalRegistryRef[]> {
  const byPath = new Map<string, Set<string>>();
  const globs = ['public/portal/**/*.js', 'public/portal/**/*.html'];
  for (const pat of globs) {
    for await (const m of new Glob(pat).scan({ cwd: root, onlyFiles: true })) {
      const rel = m.replace(RE_BACKSLASH, '/');
      let text: string;
      try {
        text = await Bun.file(joinPath(root, m)).text();
      } catch {
        continue;
      }
      RE_REGISTRY_REF.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = RE_REGISTRY_REF.exec(text)) !== null) {
        const path = match[0];
        let set = byPath.get(path);
        if (!set) {
          set = new Set();
          byPath.set(path, set);
        }
        set.add(rel);
      }
    }
  }

  const out: PortalRegistryRef[] = [];
  for (const [path, fromSet] of [...byPath.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const file = path.replace(/^\/registry\//, '');
    const exists = await Bun.file(joinPath(root, 'public/registry', file)).exists();
    out.push({
      path,
      from: [...fromSet].sort(),
      exists,
    });
  }
  return out;
}

export async function discoverLibPlane(root: string): Promise<{
  dirs: LibPlaneDir[];
  workspaceShared: boolean;
}> {
  const dirs: LibPlaneDir[] = [];
  const libRoot = joinPath(root, 'lib');
  try {
    for await (const entry of new Glob('lib/*').scan({
      cwd: root,
      onlyFiles: false,
      absolute: false,
    })) {
      const name = entry.replace(/^lib\//, '').replace(/\/$/, '');
      if (!name || name.includes('/') || name.startsWith('.')) continue;
      // Skip top-level files (console-depth.ts etc.) — only dirs with children
      let anyChild = false;
      for await (const _ of new Glob('lib/' + name + '/*').scan({
        cwd: root,
        onlyFiles: false,
      })) {
        anyChild = true;
        break;
      }
      if (!anyChild) continue;

      const hasPackageJson = await Bun.file(joinPath(root, 'lib', name, 'package.json')).exists();
      let tsFiles = 0;
      for await (const _ of new Glob('lib/' + name + '/**/*.{ts,tsx}').scan({
        cwd: root,
        onlyFiles: true,
      })) {
        tsFiles++;
        if (tsFiles > 500) break;
      }
      dirs.push({ name, hasPackageJson, tsFiles });
    }
  } catch {
    /* no lib */
  }

  const uniq = new Map<string, LibPlaneDir>();
  for (const d of dirs) {
    const prev = uniq.get(d.name);
    if (!prev || d.tsFiles > prev.tsFiles) uniq.set(d.name, d);
  }

  const sorted = [...uniq.values()].sort((a, b) => a.name.localeCompare(b.name));
  const workspaceShared = await Bun.file(joinPath(libRoot, 'shared/package.json')).exists();
  return { dirs: sorted, workspaceShared };
}

export async function discoverStoNested(root: string): Promise<{
  root: string;
  nested: StoNestedPackage[];
} | null> {
  const stoRoot = 'projects/active/sports-terminal-os';
  if (!(await Bun.file(joinPath(root, stoRoot, 'package.json')).exists())) return null;
  const nested: StoNestedPackage[] = [];
  for await (const m of new Glob(stoRoot + '/**/package.json').scan({
    cwd: root,
    onlyFiles: true,
  })) {
    const rel = m.replace(RE_BACKSLASH, '/');
    if (rel === stoRoot + '/package.json') continue;
    // skip node_modules
    if (rel.includes('/node_modules/')) continue;
    const dir = rel.replace(RE_PKG_JSON_SUFFIX, '');
    let name = dir.split('/').pop() ?? dir;
    let version: string | undefined;
    try {
      const j = (await Bun.file(joinPath(root, m)).json()) as {
        name?: string;
        version?: string;
      };
      if (j.name) name = j.name;
      if (j.version) version = j.version;
    } catch {
      /* ignore */
    }
    nested.push({ path: dir, name, version });
  }
  return {
    root: stoRoot,
    nested: nested.sort((a, b) => a.path.localeCompare(b.path)),
  };
}

export async function discoverThemeInventory(root: string): Promise<ThemeInventory> {
  const jsoncPath = joinPath(root, 'public/portal/theme.jsonc');
  const jsonc = await Bun.file(jsoncPath).exists();
  const tokensCss = await Bun.file(joinPath(root, 'public/portal/theme-tokens.css')).exists();
  const styleCss = await Bun.file(joinPath(root, 'public/portal/style.css')).exists();
  const inv: ThemeInventory = {
    jsonc,
    tokensCss,
    styleCss,
    darkTokenCount: 0,
    lightTokenCount: 0,
    fontKeys: [],
    layoutKeys: [],
  };
  if (!jsonc) return inv;
  try {
    // Bun native jsonc import path via file read + JSONC strip is fragile;
    // use Bun.JSONC if available else dynamic import.
    let theme: {
      version?: string;
      colorSchemeDefault?: string;
      dark?: Record<string, unknown>;
      light?: Record<string, unknown>;
      fonts?: Record<string, unknown>;
      layout?: Record<string, unknown>;
    };
    try {
      theme = (await import(jsoncPath)).default as typeof theme;
    } catch {
      // fallback: strip // comments lightly
      const raw = await Bun.file(jsoncPath).text();
      const stripped = raw
        .split('\n')
        .map(line => {
          const t = line.trim();
          if (t.startsWith('//')) return '';
          return line;
        })
        .join('\n');
      theme = JSON.parse(stripped) as typeof theme;
    }
    inv.version = theme.version;
    inv.colorSchemeDefault = theme.colorSchemeDefault;
    inv.darkTokenCount = theme.dark ? Object.keys(theme.dark).length : 0;
    inv.lightTokenCount = theme.light ? Object.keys(theme.light).length : 0;
    inv.fontKeys = theme.fonts ? Object.keys(theme.fonts).sort() : [];
    inv.layoutKeys = theme.layout ? Object.keys(theme.layout).sort() : [];
  } catch {
    /* leave zeros */
  }
  return inv;
}

/** Build full multi-surface inventory for bake + CLI. */
export async function buildMonorepoSurfaces(
  root: string,
  generatedAt = new Date().toISOString()
): Promise<MonorepoSurfaces> {
  const [
    workspaces,
    packagesGraphDirs,
    pages,
    modules,
    chromeRaw,
    brand,
    registry,
    portalRefs,
    libPlane,
    sto,
    theme,
  ] = await Promise.all([
    discoverWorkspaceMembers(root),
    discoverPackagesGraphDirs(root),
    discoverPortalPages(root),
    discoverPortalModules(root),
    loadChromeComponents(root),
    discoverBrandAssets(root),
    discoverRegistryArtifacts(root),
    discoverPortalRegistryRefs(root),
    discoverLibPlane(root),
    discoverStoNested(root),
    discoverThemeInventory(root),
  ]);

  const packagesPlane = workspaces.filter(w => w.plane === 'packages').length;
  const otherWorkspaces = workspaces.length - packagesPlane;

  // Chrome onDisk check
  const chromeComponents = await Promise.all(
    chromeRaw.map(async c => {
      const disk = joinPath(root, webPathToPublicRel(c.path));
      return { ...c, onDisk: await Bun.file(disk).exists() };
    })
  );

  const modulesByKind: Record<string, number> = {};
  for (const m of modules) {
    modulesByKind[m.kind] = (modulesByKind[m.kind] ?? 0) + 1;
  }

  const byFamilyMap = new Map<RegistryFamily, number>();
  for (const a of registry.topLevel) {
    byFamilyMap.set(a.family, (byFamilyMap.get(a.family) ?? 0) + 1);
  }
  const byFamily = [...byFamilyMap.entries()]
    .map(([family, count]) => ({ family, count }))
    .sort((a, b) => b.count - a.count || a.family.localeCompare(b.family));

  const topFiles = new Set(registry.topLevel.map(a => a.file));
  const referencedTop = new Set(
    portalRefs.map(r => r.path.replace(/^\/registry\//, '')).filter(f => !f.includes('/'))
  );
  const orphanFromPortal = [...topFiles].filter(f => !referencedTop.has(f)).sort();

  const brandTenantNote = brand.tenants.length > 0 ? brand.tenants.join(', ') : '(none)';
  const familyNote = byFamily
    .slice(0, 6)
    .map(x => x.family + '=' + x.count)
    .join(' · ');

  const surfaces: MonorepoSurfaces = {
    schemaVersion: 2,
    kind: 'monorepo-surfaces',
    generatedAt,
    summary: {
      workspaceMembers: workspaces.length,
      packagesPlane,
      otherWorkspaces,
      portalPages: pages.length,
      portalModules: modules.length,
      chromeComponents: chromeComponents.length,
      brandAssets: brand.assets.length,
      registryTopLevelJson: registry.topLevel.length,
      registryStoragePackages: registry.storagePackageNames.length,
      libTopLevelDirs: libPlane.dirs.length,
      stoNestedPackages: sto?.nested.length ?? 0,
      portalRegistryRefs: portalRefs.length,
      registryOrphanFromPortal: orphanFromPortal.length,
      registryFamilyCount: byFamily.length,
      themeDarkTokens: theme.darkTokenCount,
    },
    workspaces,
    packagesGraphDirs,
    portal: {
      pages,
      modules,
      chromeComponents,
      theme,
      modulesByKind,
    },
    brand: {
      tenants: brand.tenants,
      assets: brand.assets,
    },
    registry: {
      topLevel: registry.topLevel,
      storagePackageNames: registry.storagePackageNames,
      scopedLatest: registry.scopedLatest,
      byFamily,
      portalRefs,
      orphanFromPortal,
    },
    libPlane,
    sto: sto ?? undefined,
    planes: [
      {
        id: 'packages-graph',
        label: 'packages/* import graph',
        count: packagesGraphDirs.length,
        bake: '/registry/packages-graph-map.json',
        portal: '/portal/packages/',
        note: 'Default audit:packages glob — coupling / orphans / roles only',
      },
      {
        id: 'workspaces',
        label: 'bun workspaces (package.json)',
        count: workspaces.length,
        note: 'packages/* + sports-terminal-os + lib/* — see bun pm ls',
      },
      {
        id: 'lib-plane',
        label: 'lib/ top-level dirs',
        count: libPlane.dirs.length,
        note:
          'interior modules; workspace package only lib/shared · shared=' +
          (libPlane.workspaceShared ? 'yes' : 'no'),
      },
      {
        id: 'sto-nested',
        label: 'STO nested package.json',
        count: sto?.nested.length ?? 0,
        note: 'under projects/active/sports-terminal-os (not packages/* graph)',
      },
      {
        id: 'portal-pages',
        label: 'portal HTML pages',
        count: pages.length,
        portal: '/portal/',
        note: 'public/portal/*/index.html shells + script src inventory',
      },
      {
        id: 'portal-chrome',
        label: 'portal chrome components',
        count: chromeComponents.length,
        bake: '/registry/portal-chrome.json',
        note:
          'nav + shared modules SSOT · onDisk=' +
          chromeComponents.filter(c => c.onDisk).length +
          '/' +
          chromeComponents.length,
      },
      {
        id: 'portal-modules',
        label: 'portal JS/CSS modules',
        count: modules.length,
        note: 'components/ + root modules + page scripts + theme',
      },
      {
        id: 'brand',
        label: 'brand + tenant icons',
        count: brand.assets.length,
        note:
          'tenants: ' +
          brandTenantNote +
          ' · theme darkTokens=' +
          theme.darkTokenCount +
          ' fonts=' +
          theme.fontKeys.join(','),
      },
      {
        id: 'registry-bake',
        label: 'registry top-level JSON',
        count: registry.topLevel.length,
        bake: '/registry/',
        note: 'families: ' + (familyNote || '—') + ' · not npm package deps',
      },
      {
        id: 'registry-portal-refs',
        label: 'portal → registry refs',
        count: portalRefs.length,
        note: 'unique /registry/*.json from portal JS/HTML · orphanTop=' + orphanFromPortal.length,
      },
      {
        id: 'registry-storage',
        label: 'registry storage packages',
        count: registry.storagePackageNames.length,
        note: 'public/registry/storage published artifact.tgz names',
      },
    ],
  };

  return surfaces;
}
