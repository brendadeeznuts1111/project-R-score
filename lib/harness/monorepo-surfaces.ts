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
 * Claim: packages-graph-map-v13
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

export type RegistryArtifact = {
  /** File name under public/registry (top-level .json only). */
  file: string;
  /** kind field from JSON when present. */
  kind: string | null;
  /** schemaVersion when present. */
  schemaVersion: number | null;
  bytes: number;
};

export type MonorepoSurfaces = {
  schemaVersion: 1;
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
    }>;
    theme: { jsonc: boolean; tokensCss: boolean; styleCss: boolean };
  };
  brand: {
    tenants: string[]; // brand-ok — icon tenant ids
    assets: BrandAsset[];
  };
  registry: {
    topLevel: RegistryArtifact[];
    storagePackageNames: string[]; // brand-ok — published artifact names under storage/
    scopedLatest: string[]; // brand-ok — @factorywager/*/latest.json paths
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

function planeOfWorkspacePath(rel: string): WorkspaceMember['plane'] {
  if (rel.startsWith('packages/')) return 'packages';
  if (rel.startsWith('lib/')) return 'lib';
  if (rel.startsWith('projects/')) return 'projects';
  return 'other';
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

export async function discoverPortalPages(root: string): Promise<PortalPage[]> {
  const portalRoot = joinPath(root, 'public/portal');
  const pages: PortalPage[] = [];
  // Root portal home
  const homeIndex = Bun.file(joinPath(portalRoot, 'index.html'));
  if (await homeIndex.exists()) {
    pages.push({
      href: '/portal/',
      slug: '',
      hasIndex: true,
      hasMd: await Bun.file(joinPath(portalRoot, 'index.md')).exists(),
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
    topLevel.push({ file, kind, schemaVersion, bytes });
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

/** Build full multi-surface inventory for bake + CLI. */
export async function buildMonorepoSurfaces(
  root: string,
  generatedAt = new Date().toISOString()
): Promise<MonorepoSurfaces> {
  const [workspaces, packagesGraphDirs, pages, modules, chromeComponents, brand, registry] =
    await Promise.all([
      discoverWorkspaceMembers(root),
      discoverPackagesGraphDirs(root),
      discoverPortalPages(root),
      discoverPortalModules(root),
      loadChromeComponents(root),
      discoverBrandAssets(root),
      discoverRegistryArtifacts(root),
    ]);

  const packagesPlane = workspaces.filter(w => w.plane === 'packages').length;
  const otherWorkspaces = workspaces.length - packagesPlane;

  const theme = {
    jsonc: await Bun.file(joinPath(root, 'public/portal/theme.jsonc')).exists(),
    tokensCss: await Bun.file(joinPath(root, 'public/portal/theme-tokens.css')).exists(),
    styleCss: await Bun.file(joinPath(root, 'public/portal/style.css')).exists(),
  };

  const brandTenantNote = brand.tenants.length > 0 ? brand.tenants.join(', ') : '(none)';

  const surfaces: MonorepoSurfaces = {
    schemaVersion: 1,
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
    },
    workspaces,
    packagesGraphDirs,
    portal: {
      pages,
      modules,
      chromeComponents,
      theme,
    },
    brand: {
      tenants: brand.tenants,
      assets: brand.assets,
    },
    registry: {
      topLevel: registry.topLevel,
      storagePackageNames: registry.storagePackageNames,
      scopedLatest: registry.scopedLatest,
    },
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
        id: 'portal-pages',
        label: 'portal HTML pages',
        count: pages.length,
        portal: '/portal/',
        note: 'public/portal/*/index.html shells',
      },
      {
        id: 'portal-chrome',
        label: 'portal chrome components',
        count: chromeComponents.length,
        bake: '/registry/portal-chrome.json',
        note: 'nav + shared modules SSOT · portal:chrome:bake',
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
        note: 'tenants: ' + brandTenantNote + ' · public/icons · public/brand',
      },
      {
        id: 'registry-bake',
        label: 'registry top-level JSON',
        count: registry.topLevel.length,
        bake: '/registry/',
        note: 'ops/proof/health bakes — not npm package deps',
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
