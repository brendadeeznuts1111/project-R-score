#!/usr/bin/env bun
/**
 * Project Registry Generator
 *
 * Scans the monorepo and produces:
 * - public/registry/projects-registry.json
 *
 * Categories are derived from the directory structure under projects/
 * Featured projects are the large ones that remain at the root.
 */

import { readdir, stat } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const PROJECTS_ROOT = join(ROOT, 'projects');
const OUTPUT_FILE = join(ROOT, 'public', 'registry', 'projects-registry.json');

// Core platform directories that should NOT be treated as "projects"
const CORE_PLATFORM = new Set([
  'src',
  'lib',
  'packages',
  'docs',
  'scripts',
  'tests',
  'benchmarks',
  'tools',
  'utils',
  'config',
  'cli',
  'bin',
  'server',
  'services',
  'dashboard',
  'deployment',
  'public',
  'assets',
  'data',
  'logs',
  'artifacts',
  'build',
  'dist',
  'node_modules',
  '.git',
]);

// Featured projects that live at the root (large active work)
const FEATURED_AT_ROOT = ['barbershop', 'factorywager', 'kimiremote', 'peer', 'scratch'];

interface ProjectEntry {
  id: string;
  name: string;
  path: string;
  category: string;
  subcategory?: string;
  size_bytes: number;
  size_human: string;
  last_modified: string;
  has_package_json: boolean;
  has_readme: boolean;
  description: string;
  tags: string[];
  primary_language: string;
}

interface Registry {
  meta: {
    generated_at: string;
    root: string;
    version: string;
  };
  stats: {
    total_projects: number;
    total_size_bytes: number;
    total_size_human: string;
    by_category: Record<string, number>;
  };
  featured: ProjectEntry[];
  projects: ProjectEntry[];
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

async function getDirSize(dirPath: string): Promise<number> {
  try {
    // Use du -s for speed on large directories
    const output = execSync(`du -s "${dirPath}"`, { encoding: 'utf8' });
    const size = parseInt(output.split(/\s+/)[0], 10) * 1024; // du returns KB
    return size;
  } catch {
    return 0;
  }
}

async function getLastModified(dirPath: string): Promise<string> {
  try {
    const stats = await stat(dirPath);
    return stats.mtime.toISOString();
  } catch {
    return new Date().toISOString();
  }
}

async function readFirstReadmeLine(dirPath: string): Promise<string> {
  const readmePath = join(dirPath, 'README.md');
  try {
    const content = await Bun.file(readmePath).text();
    const firstLine = content.split('\n').find(l => l.trim().length > 10) || '';
    return firstLine.trim().slice(0, 180);
  } catch {
    return '';
  }
}

async function scanProject(
  dirPath: string,
  category: string,
  subcategory?: string
): Promise<ProjectEntry | null> {
  try {
    const stats = await stat(dirPath);
    if (!stats.isDirectory()) return null;

    const name = dirPath.split('/').pop()!;
    const id = name.toLowerCase().replace(/[^a-z0-9]/g, '-');

    const size = await getDirSize(dirPath);
    const lastModified = await getLastModified(dirPath);

    const hasPackage = await Bun.file(join(dirPath, 'package.json')).exists();
    const hasReadme = await Bun.file(join(dirPath, 'README.md')).exists();

    const description = hasReadme ? await readFirstReadmeLine(dirPath) : '';

    // Simple tech detection
    const hasTs = await Bun.file(join(dirPath, 'tsconfig.json')).exists();
    const hasBun = await Bun.file(join(dirPath, 'bunfig.toml')).exists();
    const primaryLanguage = hasTs || hasBun ? 'TypeScript / Bun' : 'Mixed';

    return {
      id,
      name,
      path: relative(ROOT, dirPath),
      category,
      subcategory,
      size_bytes: size,
      size_human: formatBytes(size),
      last_modified: lastModified,
      has_package_json: hasPackage,
      has_readme: hasReadme,
      description: description || 'No description found',
      tags: [],
      primary_language: primaryLanguage,
    };
  } catch (err) {
    console.warn(`  Skipping ${dirPath}: ${err}`);
    return null;
  }
}

async function scanCategory(categoryPath: string, categoryName: string): Promise<ProjectEntry[]> {
  const entries: ProjectEntry[] = [];
  const items = await readdir(categoryPath, { withFileTypes: true });

  for (const item of items) {
    if (!item.isDirectory() || item.name.startsWith('.')) continue;

    const fullPath = join(categoryPath, item.name);
    const project = await scanProject(fullPath, categoryName);
    if (project) entries.push(project);
  }

  return entries;
}

async function main() {
  console.info('🔍 Generating Projects Registry...\n');

  const allProjects: ProjectEntry[] = [];
  const byCategory: Record<string, number> = {};

  // Scan projects/ categories
  const categories = await readdir(PROJECTS_ROOT, { withFileTypes: true });

  for (const cat of categories) {
    if (!cat.isDirectory() || cat.name === 'README.md') continue;

    const catPath = join(PROJECTS_ROOT, cat.name);
    console.info(`Scanning category: ${cat.name}`);

    const projectsInCat = await scanCategory(catPath, cat.name);
    allProjects.push(...projectsInCat);
    byCategory[cat.name] = projectsInCat.length;
  }

  // Add featured projects from root
  console.info('\nScanning featured root projects...');
  const featured: ProjectEntry[] = [];

  for (const name of FEATURED_AT_ROOT) {
    const fullPath = join(ROOT, name);
    const project = await scanProject(fullPath, 'featured');
    if (project) {
      project.category = 'featured';
      featured.push(project);
      console.info(`  ✓ ${name}`);
    }
  }

  // Build stats
  const totalSize =
    allProjects.reduce((sum, p) => sum + p.size_bytes, 0) +
    featured.reduce((sum, p) => sum + p.size_bytes, 0);

  const registry: Registry = {
    meta: {
      generated_at: new Date().toISOString(),
      root: ROOT,
      version: '1.0.0',
    },
    stats: {
      total_projects: allProjects.length + featured.length,
      total_size_bytes: totalSize,
      total_size_human: formatBytes(totalSize),
      by_category: byCategory,
    },
    featured: featured.sort((a, b) => b.size_bytes - a.size_bytes),
    projects: allProjects.sort((a, b) => b.size_bytes - a.size_bytes),
  };

  // Write registry
  await Bun.write(OUTPUT_FILE, JSON.stringify(registry, null, 2));

  console.info('\n✅ Registry generated successfully!');
  console.info(`   Total projects: ${registry.stats.total_projects}`);
  console.info(`   Total size: ${registry.stats.total_size_human}`);
  console.info(`   Output: ${relative(ROOT, OUTPUT_FILE)}`);
}

main().catch(console.error);
