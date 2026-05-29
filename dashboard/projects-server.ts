#!/usr/bin/env bun

import { readdir } from 'node:fs/promises';
import { resolve, relative, sep } from 'node:path';

const PORT = parseInt(Bun.env.PROJECTS_DASHBOARD_PORT || Bun.env.PORT || '3999', 10);
const HOST = Bun.env.HOST || 'localhost';
const ALLOW_PORT_FALLBACK = parseBool(Bun.env.ALLOW_PORT_FALLBACK, true);
const CACHE_TTL = parseInt(Bun.env.PROJECTS_CACHE_TTL || '30000', 10);

const PROJECTS_ROOT = resolve('./projects');
const DASHBOARD_HTML_PATH = resolve('./dashboard/projects-dashboard.html');
const SECTIONS = ['active', 'experimental', 'archive'] as const;

interface ProjectPackage {
  name?: string;
  version?: string;
  description?: string;
  private?: boolean;
  homepage?: string;
  repository?: { url?: string } | string;
  bugs?: { url?: string } | string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

interface GitInfo {
  lastCommit: string;
  lastCommitDate: string;
  lastCommitMessage: string;
  dirty: boolean;
}

interface Project {
  name: string;
  path: string;
  fullPath: string;
  section: string;
  category: string;
  packageName?: string;
  version?: string;
  description?: string;
  homepageUrl?: string;
  fileCount: number;
  depCount: number;
  git: GitInfo | null;
}

interface ProjectsData {
  projects: Project[];
  generatedAt: string;
  totals: {
    active: number;
    experimental: number;
    archive: number;
    total: number;
  };
}

let cache: { data: ProjectsData; expiresAt: number } | null = null;
let activePort = PORT;
let scanPromise: Promise<ProjectsData> | null = null;

process.on('uncaughtException', (err) => {
  console.error('[projects-server] UNCAUGHT:', err?.message || err);
});
process.on('unhandledRejection', (err: any) => {
  console.error('[projects-server] UNHANDLED REJECTION:', err?.message || err);
});

function parseBool(v: string | undefined, fallback: boolean): boolean {
  if (!v) return fallback;
  return ['1', 'true', 'yes', 'on'].includes(v.trim().toLowerCase());
}

function sectionDir(s: string): string { return s === 'active' ? 'active' : s; }

async function readPackageJson(dir: string): Promise<ProjectPackage | null> {
  try {
    const pkgPath = resolve(dir, 'package.json');
    const file = Bun.file(pkgPath);
    if (!(await file.exists())) return null;
    return await file.json() as ProjectPackage;
  } catch { return null; }
}

function extractHomepage(pkg: ProjectPackage | null): string | undefined {
  if (pkg?.homepage) return pkg.homepage;
  const repo = pkg?.repository;
  if (repo && typeof repo === 'object' && repo.url) return repo.url.replace(/^git\+/, '').replace(/\.git$/, '');
  if (typeof repo === 'string') return repo.replace(/^git\+/, '').replace(/\.git$/, '');
  const bugs = pkg?.bugs;
  if (bugs && typeof bugs === 'object' && bugs.url) return bugs.url;
  if (typeof bugs === 'string') return bugs;
  return undefined;
}

const SKIP_DIRS = new Set(['.git', 'node_modules']);

async function countFiles(dir: string): Promise<number> {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    let count = 0;
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules') continue;
      if (entry.name.startsWith('.')) continue;
      count++;
    }
    return count;
  } catch { return 0; }
}

function countDeps(pkg: ProjectPackage | null): number {
  if (!pkg) return 0;
  const deps = pkg.dependencies ? Object.keys(pkg.dependencies).length : 0;
  const devDeps = pkg.devDependencies ? Object.keys(pkg.devDependencies).length : 0;
  return deps + devDeps;
}

async function getGitInfo(dir: string): Promise<GitInfo | null> {
  try {
    const logProc = Bun.spawnSync(['git', '-C', dir, 'log', '-1', '--format=%h|%cr|%s'], { stdout: 'pipe', stderr: 'pipe' });
    if (logProc.exitCode !== 0) return null;
    const logOut = logProc.stdout?.toString().trim();
    if (!logOut) return null;
    const [hash, date, ...msgParts] = logOut.split('|');
    const statusProc = Bun.spawnSync(['git', '-C', dir, 'status', '--porcelain'], { stdout: 'pipe', stderr: 'pipe' });
    const dirty = statusProc.exitCode === 0 && (statusProc.stdout?.toString().trim()?.length ?? 0) > 0;
    return { lastCommit: hash || 'unknown', lastCommitDate: date || 'unknown', lastCommitMessage: msgParts.join('|') || 'unknown', dirty };
  } catch { return null; }
}

async function scanProjects(): Promise<ProjectsData> {
  const projects: Project[] = [];
  const totals = { active: 0, experimental: 0, archive: 0, total: 0 };
  const seen = new Set<string>();

  async function addProject(projectDir: string, section: string, category: string): Promise<void> {
    if (seen.has(projectDir)) return;
    seen.add(projectDir);

    const pkg = await readPackageJson(projectDir);
    const git = await getGitInfo(projectDir);
    const rel = relative(PROJECTS_ROOT, projectDir);
    const parts = rel.split(sep);
    const projectName = pkg?.name || parts[parts.length - 1] || rel;
    const path = section === 'active'
      ? `projects/active/${category}/${parts[parts.length - 1]}`
      : `projects/${section}/${parts[parts.length - 1]}`;

    const fileCount = await countFiles(projectDir);
    const depCount = countDeps(pkg);
    projects.push({
      name: projectName,
      path,
      fullPath: projectDir,
      section,
      category,
      packageName: pkg?.name,
      version: pkg?.version,
      description: pkg?.description,
      homepageUrl: extractHomepage(pkg),
      fileCount,
      depCount,
      git,
    });
    (totals as Record<string, number>)[section]++;
    totals.total++;
  }

  for (const section of SECTIONS) {
    const sectionPath = resolve(PROJECTS_ROOT, sectionDir(section));
    if (section === 'active') {
      const categories = await readdir(sectionPath, { withFileTypes: true });
      for (const cat of categories) {
        if (!cat.isDirectory() || cat.name.startsWith('.')) continue;
        const catPath = resolve(sectionPath, cat.name);
        const entries = await readdir(catPath, { withFileTypes: true });
        for (const entry of entries) {
          if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
          await addProject(resolve(catPath, entry.name), section, cat.name);
        }
      }
    } else {
      const entries = await readdir(sectionPath, { withFileTypes: true });
      for (const entry of entries) {
        if (!entry.isDirectory() || entry.name.startsWith('.')) continue;
        await addProject(resolve(sectionPath, entry.name), section, section);
      }
    }
  }

  projects.sort((a, b) => a.name.localeCompare(b.name));
  return { projects, generatedAt: new Date().toISOString(), totals };
}

async function getProjectsData(): Promise<ProjectsData> {
  const now = Date.now();
  if (cache && cache.expiresAt > now) return cache.data;
  if (scanPromise) return scanPromise;
  scanPromise = scanProjects().then(data => {
    cache = { data, expiresAt: Date.now() + CACHE_TTL };
    scanPromise = null;
    return data;
  });
  return scanPromise;
}

// Pre-warm cache at startup
scanProjects().then(data => {
  cache = { data, expiresAt: Date.now() + CACHE_TTL };
  console.error('[projects-server] cache primed:', data.totals.total, 'projects');
}).catch((err: any) => {
  console.error('[projects-server] cache prime failed:', err?.message || err);
});

function serveDashboardHTML(): Promise<Response> {
  const file = Bun.file(DASHBOARD_HTML_PATH);
  return Promise.resolve(new Response(file, { headers: { 'Content-Type': 'text/html; charset=utf-8' } }));
}

function serveProjectsJSON(projects: ProjectsData): Response {
  return Response.json(projects, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
}

function findPortOwner(port: number): string | null {
  try {
    const cmd = Bun.spawnSync(['lsof', '-nP', '-iTCP:' + String(port), '-sTCP:LISTEN'], { stdout: 'pipe', stderr: 'pipe' });
    if (cmd.exitCode !== 0) return null;
    const output = cmd.stdout?.toString().trim();
    if (!output) return null;
    const lines = output.split('\n');
    if (lines.length < 2) return null;
    const parts = lines[1].trim().split(/\s+/);
    return parts[0] || null;
  } catch { return null; }
}

function startServer(port: number): void {
  Bun.serve({
    port,
    hostname: HOST,
    fetch: async (req: Request): Promise<Response> => {
      try {
      const url = new URL(req.url);


      if (req.method === 'OPTIONS') {
        return new Response(null, { headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Methods': 'GET, OPTIONS', 'Access-Control-Allow-Headers': 'Content-Type' } });
      }

      if (url.pathname === '/api/projects' || url.pathname === '/api/projects/') {
        let data: ProjectsData;
        try { data = await getProjectsData(); } catch (e: any) {
          console.error('[projects-server] scan failed:', e?.message || e);
          return Response.json({ error: 'scan failed', detail: e?.message || String(e) }, { status: 500 });
        }

        const section = url.searchParams.get('section');
        const category = url.searchParams.get('category');
        const search = url.searchParams.get('search')?.toLowerCase();

        let filtered = data.projects;
        if (section && SECTIONS.includes(section as any)) filtered = filtered.filter(p => p.section === section);
        if (category) filtered = filtered.filter(p => p.category === category);
        if (search) filtered = filtered.filter(p => p.name.toLowerCase().includes(search) || p.description?.toLowerCase().includes(search) || p.category.includes(search));

        const searchParam = search || '';

        if (searchParam || section || category) {
          const totals = { active: 0, experimental: 0, archive: 0, total: filtered.length };
          for (const p of filtered) totals[p.section as keyof typeof totals]++;
          return serveProjectsJSON({ projects: filtered, generatedAt: data.generatedAt, totals });
        }
        return serveProjectsJSON(data);
      }

      if (url.pathname === '/api/health') {
        return Response.json({ status: 'ok', uptime: process.uptime(), port: activePort, bun: Bun.version, platform: process.platform, arch: process.arch });
      }

      if (url.pathname === '/' || url.pathname === '/index.html') {
        return serveDashboardHTML();
      }

      const staticFile = Bun.file(resolve('./dashboard', url.pathname.slice(1)));
      if (await staticFile.exists()) return new Response(staticFile);
      return new Response('Not Found', { status: 404 });
    } catch (e: any) {
      console.error('[projects-server] fetch error:', e?.message || e);
      return new Response('Internal Server Error', { status: 500 });
    }
  },
  });

  activePort = port;
  console.info(`[projects-server] http://${HOST}:${port}`);
}

try {
  startServer(PORT);
} catch (err: any) {
  if (err?.code === 'EADDRINUSE' && ALLOW_PORT_FALLBACK) {
    const owner = findPortOwner(PORT);
    console.warn(`[projects-server] Port ${PORT} in use${owner ? ` by ${owner}` : ''}, trying port ${PORT + 1}`);
    startServer(PORT + 1);
  } else {
    console.error('[projects-server] Failed to start:', err?.message || err);
    process.exit(1);
  }
}
