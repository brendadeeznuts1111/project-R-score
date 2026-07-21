#!/usr/bin/env bun
// @see https://bun.com/docs/pm/cli/install#dry-run — --dry-run
/**
 * Regenerate public/registry/projects-registry.json from on-disk projects/.
 *
 * Usage:
 *   bun run scripts/generate-project-registry.ts
 *   bun run scripts/generate-project-registry.ts --dry-run
 *
 * @see https://bun.com/docs/runtime/file-io — Bun.file / Bun.write
 * @see https://bun.com/docs/runtime/glob — Bun.Glob
 */

import {
  baseName,
  dirSizeBytes,
  fileExistsSync,
  isDirectory,
  joinPath,
  lastModified,
  listChildDirectoryNames,
  readPackageJson,
  readTextFile,
} from '../lib/projects-scan';

const ROOT = process.cwd();
const OUT = joinPath(ROOT, 'public/registry/projects-registry.json');
const DRY = Bun.argv.includes('--dry-run');

/** Top-level entries under projects/active that are projects (not category folders). */
const ACTIVE_SPECIALS = new Set([
  'factorywager',
  'sports-terminal-os',
  'kimiremote',
  'f402-openapi',
  'playwriter-skill',
]);

const CATEGORY_DIRS = new Set([
  'analysis',
  'automation',
  'dashboards',
  'development',
  'enterprise',
  'tools',
  'utilities',
]);

const FEATURED_IDS = ['kimiremote', 'sports-terminal-os', 'factorywager', 'scratch'] as const;

type RegistryProject = {
  id: string; // brand-ok — opaque inventory key (directory basename)
  name: string;
  path: string;
  category: string;
  size_bytes: number;
  size_human: string;
  last_modified: string;
  has_package_json: boolean;
  has_readme: boolean;
  description: string;
  tags: string[];
  primary_language: string;
};

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let n = bytes / 1024;
  let i = 0;
  while (n >= 1024 && i < units.length - 1) {
    n /= 1024;
    i++;
  }
  const digits = n >= 100 || i === 0 ? 0 : n >= 10 ? 1 : 1;
  return `${n.toFixed(digits)} ${units[i]}`;
}

function firstMarkdownHeading(text: string): string | null {
  for (const line of text.split('\n')) {
    const m = line.match(/^#\s+(.+)$/);
    if (m?.[1]) return m[1].trim();
  }
  return null;
}

async function describe(dir: string): Promise<string> {
  for (const name of ['README.md', 'readme.md', 'AGENTS.md']) {
    const text = await readTextFile(joinPath(dir, name));
    if (!text) continue;
    const heading = firstMarkdownHeading(text);
    if (heading) return `# ${heading}`;
  }
  const pkg = await readPackageJson(dir);
  const desc = typeof pkg.description === 'string' ? pkg.description.trim() : '';
  if (desc) return desc;
  return 'No description found';
}

async function detectLanguage(dir: string): Promise<string> {
  if (fileExistsSync(joinPath(dir, 'package.json'))) return 'TypeScript / Bun';
  if (fileExistsSync(joinPath(dir, 'Cargo.toml'))) return 'Rust';
  if (fileExistsSync(joinPath(dir, 'go.mod'))) return 'Go';
  if (fileExistsSync(joinPath(dir, 'pyproject.toml'))) return 'Python';
  return 'Mixed';
}

async function buildEntry(
  relPath: string,
  category: string,
  forceCategory?: string
): Promise<RegistryProject> {
  const abs = joinPath(ROOT, relPath);
  const id = baseName(relPath);
  const size = dirSizeBytes(abs);
  const lm = lastModified(abs);
  return {
    id,
    name: id,
    path: relPath,
    category: forceCategory ?? category,
    size_bytes: size,
    size_human: humanSize(size),
    last_modified: lm ? lm.toISOString() : new Date(0).toISOString(),
    has_package_json: fileExistsSync(joinPath(abs, 'package.json')),
    has_readme:
      fileExistsSync(joinPath(abs, 'README.md')) || fileExistsSync(joinPath(abs, 'readme.md')),
    description: await describe(abs),
    tags: [],
    primary_language: await detectLanguage(abs),
  };
}

function discoverActiveProjects(): { rel: string; category: string }[] {
  const activeRoot = joinPath(ROOT, 'projects/active');
  const out: { rel: string; category: string }[] = [];
  for (const name of listChildDirectoryNames(activeRoot).sort()) {
    if (ACTIVE_SPECIALS.has(name)) {
      out.push({ rel: `projects/active/${name}`, category: name });
      continue;
    }
    if (!CATEGORY_DIRS.has(name)) continue;
    const catDir = joinPath(activeRoot, name);
    for (const child of listChildDirectoryNames(catDir).sort()) {
      out.push({ rel: `projects/active/${name}/${child}`, category: name });
    }
  }
  return out;
}

function discoverTierProjects(
  tier: 'experimental' | 'archive'
): { rel: string; category: string }[] {
  const tierRoot = joinPath(ROOT, `projects/${tier}`);
  if (!isDirectory(tierRoot)) return [];
  return listChildDirectoryNames(tierRoot)
    .filter(name => name !== 'README.md' && isDirectory(joinPath(tierRoot, name)))
    .sort()
    .map(name => ({ rel: `projects/${tier}/${name}`, category: tier }));
}

async function main(): Promise<void> {
  const discovered = [
    ...discoverActiveProjects(),
    ...discoverTierProjects('experimental'),
    ...discoverTierProjects('archive'),
  ];

  const projects: RegistryProject[] = [];
  for (const d of discovered) {
    projects.push(await buildEntry(d.rel, d.category));
  }

  const byId = new Map(projects.map(p => [p.id, p]));
  const featured: RegistryProject[] = [];

  for (const id of FEATURED_IDS) {
    if (id === 'scratch') {
      const scratchPath = joinPath(ROOT, 'scratch');
      if (isDirectory(scratchPath)) {
        featured.push(await buildEntry('scratch', 'featured', 'featured'));
      }
      continue;
    }
    const existing = byId.get(id);
    if (!existing) continue;
    featured.push({ ...existing, category: 'featured' });
  }

  const featuredPaths = new Set(featured.map(f => f.path));
  const listProjects = projects.filter(p => !featuredPaths.has(p.path));

  const by_category: Record<string, number> = {};
  for (const p of [...featured, ...listProjects]) {
    const parts = p.path.split('/');
    let statsCat = p.category;
    if (p.path === 'scratch') statsCat = 'scratch';
    else if (parts[0] === 'projects' && parts[1] === 'experimental') statsCat = 'experimental';
    else if (parts[0] === 'projects' && parts[1] === 'archive') statsCat = 'archive';
    else if (parts[0] === 'projects' && parts[1] === 'active' && parts[2]) {
      statsCat = CATEGORY_DIRS.has(parts[2]) ? parts[2] : parts[2];
    }
    by_category[statsCat] = (by_category[statsCat] ?? 0) + 1;
  }

  const total_size_bytes = [...featured, ...listProjects].reduce((s, p) => s + p.size_bytes, 0);
  const payload = {
    meta: {
      generated_at: new Date().toISOString(),
      root: ROOT,
      version: '1.0.0',
    },
    stats: {
      total_projects: featured.length + listProjects.length,
      total_size_bytes,
      total_size_human: humanSize(total_size_bytes),
      by_category,
    },
    featured,
    projects: listProjects.sort((a, b) => b.size_bytes - a.size_bytes),
  };

  if (DRY) {
    console.info(JSON.stringify(payload.stats, null, 2));
    console.info(`Would write ${OUT} (${payload.stats.total_projects} projects)`);
    return;
  }

  await Bun.write(OUT, `${JSON.stringify(payload, null, 2)}\n`);
  console.info(
    `Wrote ${OUT} — ${payload.stats.total_projects} projects, ${payload.stats.total_size_human}`
  );
}

if (import.meta.main) {
  await main();
}
