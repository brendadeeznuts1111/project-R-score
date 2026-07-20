// @see https://bun.com/docs/runtime/file-io — Bun.file
// @see https://bun.com/docs/runtime/child-process — Bun.spawn
// @see https://bun.com/docs/runtime/environment-variables — Bun.env
/**
 * gate-map.json loader, validator, and project resolution for monorepo gates.
 */

import { join } from 'node:path';

import { type ProjectId, asProjectId } from './types/branded.ts';

export const REPO_ROOT = import.meta.dir.replace(/\/lib$/, '');
export const DEFAULT_GATE_MAP_PATH = join(REPO_ROOT, '.agents/skills/ast-grep/gate-map.json');

export type GateMapGate = {
  id: string; // brand-ok — opaque entity primary key
  label: string;
  description: string;
  cmd: string[];
  cwd?: string;
  optional?: boolean;
  /** Parse stdout as kimi-toolchain `check --json-summary` and attach step metrics */
  kimiCheckJson?: boolean;
};

export type GateMapProject = {
  id: string; // brand-ok — opaque entity primary key
  zone: string;
  name: string;
  path: string;
  enabled: boolean;
  description?: string;
  gates: GateMapGate[];
  /** Repo lives outside Projects/ monorepo root (resolved via pathEnv or relative path) */
  external?: boolean;
  /** Env var override for project root, e.g. KIMI_TOOLCHAIN_ROOT */
  pathEnv?: string;
};

export type GateMap = {
  version: number;
  generatedAt?: string;
  description?: string;
  zones: Record<string, string>;
  projects: GateMapProject[];
};

export type GateMapValidationIssue = {
  level: 'error' | 'warning';
  projectId?: ProjectId;
  message: string;
};

export type GateMapValidation = {
  ok: boolean;
  issues: GateMapValidationIssue[];
  projects: GateMapProject[];
};

export type ProjectFilter = {
  all?: boolean;
  zone?: string;
  projectId?: ProjectId;
  changedOnly?: boolean;
};

export async function loadGateMap(path = DEFAULT_GATE_MAP_PATH): Promise<GateMap> {
  const file = Bun.file(path);
  if (!(await file.exists())) {
    throw new Error(`gate-map not found: ${path}`);
  }
  return file.json() as Promise<GateMap>;
}

export function resolveProjectPath(project: GateMapProject, root = REPO_ROOT): string {
  if (project.pathEnv && Bun.env[project.pathEnv]?.trim()) {
    return Bun.env[project.pathEnv]!.trim();
  }
  if (project.path.startsWith('/') || project.path.startsWith('~')) {
    return project.path.replace(/^~/, Bun.env.HOME ?? '');
  }
  return join(root, project.path);
}

/** @deprecated use resolveProjectPath */
export function projectRoot(project: GateMapProject, root = REPO_ROOT): string {
  return resolveProjectPath(project, root);
}

export async function validateGateMap(map: GateMap, root = REPO_ROOT): Promise<GateMapValidation> {
  const issues: GateMapValidationIssue[] = [];
  const ids = new Set<string>();

  if (map.version !== 1) {
    issues.push({ level: 'error', message: `Unsupported gate-map version: ${map.version}` });
  }

  for (const project of map.projects) {
    if (ids.has(project.id)) {
      issues.push({
        level: 'error',
        projectId: asProjectId(project.id),
        message: `Duplicate project id: ${project.id}`,
      });
    }
    ids.add(project.id);

    if (!map.zones[project.zone]) {
      issues.push({
        level: 'warning',
        projectId: asProjectId(project.id),
        message: `Zone "${project.zone}" not documented in gate-map.zones`,
      });
    }

    const absPath = resolveProjectPath(project, root);
    if (!(await Bun.file(join(absPath, 'package.json')).exists())) {
      const hasOtherMarker =
        (await Bun.file(absPath).exists()) &&
        (project.path === '.' || project.id === 'ast-grep-skill');
      if (!hasOtherMarker && project.path !== '.') {
        issues.push({
          level: 'error',
          projectId: asProjectId(project.id),
          message: `Missing package.json at ${absPath}`,
        });
      }
    } else if (project.external) {
      const resolved = resolveProjectPath(project, root);
      if (!resolved.startsWith(root) && !project.pathEnv) {
        issues.push({
          level: 'warning',
          projectId: asProjectId(project.id),
          message: `External project resolved outside monorepo: ${resolved}`,
        });
      }
    }

    if (project.gates.length === 0) {
      issues.push({
        level: 'warning',
        projectId: asProjectId(project.id),
        message: 'No gates defined',
      });
    }

    const gateIds = new Set<string>();
    for (const gate of project.gates) {
      if (gateIds.has(gate.id)) {
        issues.push({
          level: 'error',
          projectId: asProjectId(project.id),
          message: `Duplicate gate id: ${gate.id}`,
        });
      }
      gateIds.add(gate.id);
      if (gate.cmd.length === 0) {
        issues.push({
          level: 'error',
          projectId: asProjectId(project.id),
          message: `Gate ${gate.id} has empty cmd`,
        });
      }
    }
  }

  const errors = issues.filter(i => i.level === 'error');
  return { ok: errors.length === 0, issues, projects: map.projects };
}

export async function gitChangedPaths(root = REPO_ROOT): Promise<string[]> {
  const proc = Bun.spawn(['git', 'diff', '--name-only', 'HEAD'], {
    cwd: root,
    stdout: 'pipe',
    stderr: 'pipe',
  });
  const out = await new Response(proc.stdout).text();
  await proc.exited;
  if (proc.exitCode !== 0) return [];
  return out
    .split('\n')
    .map(p => p.trim())
    .filter(Boolean);
}

export function projectMatchesChanges(project: GateMapProject, changedPaths: string[]): boolean {
  if (project.path === '.') {
    const rootPrefixes = ['scripts/', 'lib/', 'config/', '.husky/', 'package.json', 'bunfig.toml'];
    return changedPaths.some(p => rootPrefixes.some(pre => p === pre || p.startsWith(pre)));
  }
  const prefix = `${project.path}/`;
  return changedPaths.some(p => p === project.path || p.startsWith(prefix));
}

export function resolveProjects(
  map: GateMap,
  filter: ProjectFilter,
  changedPaths: string[] = []
): GateMapProject[] {
  let projects = map.projects.filter(p => p.enabled);

  if (filter.projectId) {
    projects = projects.filter(p => p.id === filter.projectId);
  } else if (filter.zone) {
    projects = projects.filter(p => p.zone === filter.zone);
  }

  if (filter.changedOnly && !filter.all && !filter.projectId) {
    projects = projects.filter(p => projectMatchesChanges(p, changedPaths));
  }

  return projects;
}

export function formatGateMapTree(map: GateMap, projects?: GateMapProject[]): string {
  const list = projects ?? map.projects;
  const byZone = new Map<string, GateMapProject[]>();
  for (const p of list) {
    const arr = byZone.get(p.zone) ?? [];
    arr.push(p);
    byZone.set(p.zone, arr);
  }

  const lines: string[] = [`gate-map v${map.version}`, map.description ?? '', ''];

  for (const [zone, zoneProjects] of [...byZone.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const zoneDesc = map.zones[zone] ?? '';
    lines.push(`zone: ${zone}`);
    if (zoneDesc) lines.push(`  ${zoneDesc}`);
    for (const p of zoneProjects) {
      const status = p.enabled ? 'enabled' : 'disabled';
      const ext = p.external ? ' external' : '';
      lines.push(`  • ${p.id} [${status}${ext}] — ${p.name}`);
      lines.push(`    path: ${p.path}${p.pathEnv ? ` (env: ${p.pathEnv})` : ''}`);
      for (const g of p.gates) {
        const opt = g.optional ? ' (optional)' : '';
        lines.push(`    - ${g.id}: ${g.label}${opt}`);
      }
    }
    lines.push('');
  }

  return lines.join('\n').trim();
}
