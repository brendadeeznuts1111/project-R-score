#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/glob — Bun.Glob
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
/** Validate Project R's portable contract and optional installed skill parity. */

import { joinPath, resolvePath } from '../lib/path-bun.ts';
import { jsonOut } from '../lib/console-depth.ts';

export const PROJECT_R_AGENT_CONTRACT_PATH = 'config/project-r-agent-contract.json';

export type ProjectRAgentContract = {
  schemaVersion: 1;
  contractKind: 'agent-alignment';
  projectKey: 'project-r';
  agentContext: string;
  skillAuthority: string;
  installedSkills: string[];
  globalAuthorityPointers: string[];
};

export type ProjectRAgentContractCheck = {
  ok: boolean;
  contract: ProjectRAgentContract | null;
  issues: string[];
};

export type InstalledSkillAlignmentCheck = {
  ok: boolean;
  installedRoot: string;
  skillCount: number;
  filesCompared: number;
  issues: string[];
};

const SKILL_NAME = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isSafeRelativePath(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    value.length > 0 &&
    !value.startsWith('/') &&
    !value.startsWith('~') &&
    !value.split('/').includes('..')
  );
}

function parseStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) return null;
  return [...value];
}

function unique(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await Bun.file(path).stat();
    return true;
  } catch {
    return false;
  }
}

async function listPackageFiles(root: string): Promise<string[]> {
  const files: string[] = [];
  try {
    for await (const path of new Bun.Glob('**/*').scan({ cwd: root, onlyFiles: true })) {
      files.push(path);
    }
  } catch {
    return [];
  }
  return files.sort();
}

async function filesEqual(left: string, right: string): Promise<boolean> {
  try {
    const [leftBytes, rightBytes] = await Promise.all([
      Bun.file(left).bytes(),
      Bun.file(right).bytes(),
    ]);
    if (leftBytes.byteLength !== rightBytes.byteLength) return false;
    return leftBytes.every((byte, index) => byte === rightBytes[index]);
  } catch {
    return false;
  }
}

/** Compare complete repository-owned skill packages with an installed Codex skill root. */
export async function checkInstalledSkillAlignment(
  repoRoot: string,
  contract: ProjectRAgentContract,
  installedRoot: string
): Promise<InstalledSkillAlignmentCheck> {
  const issues: string[] = [];
  let filesCompared = 0;

  for (const name of contract.installedSkills) {
    const authorityRoot = resolvePath(repoRoot, contract.skillAuthority, name);
    const targetRoot = resolvePath(installedRoot, name);
    const [authorityFiles, targetFiles] = await Promise.all([
      listPackageFiles(authorityRoot),
      listPackageFiles(targetRoot),
    ]);

    if (authorityFiles.length === 0) {
      issues.push(`${name}: repository skill package is missing or empty`);
      continue;
    }
    if (targetFiles.length === 0) {
      issues.push(`${name}: installed skill package is missing or empty`);
      continue;
    }

    const authoritySet = new Set(authorityFiles);
    const targetSet = new Set(targetFiles);
    for (const path of authorityFiles) {
      if (!targetSet.has(path)) {
        issues.push(`${name}: installed package is missing ${path}`);
        continue;
      }
      filesCompared++;
      if (!(await filesEqual(joinPath(authorityRoot, path), joinPath(targetRoot, path)))) {
        issues.push(`${name}: installed file differs: ${path}`);
      }
    }
    for (const path of targetFiles) {
      if (!authoritySet.has(path))
        issues.push(`${name}: installed package has stale file: ${path}`);
    }
  }

  return {
    ok: issues.length === 0,
    installedRoot,
    skillCount: contract.installedSkills.length,
    filesCompared,
    issues,
  };
}

export async function parseProjectRAgentContract(
  repoRoot: string,
  rawContract?: unknown
): Promise<ProjectRAgentContractCheck> {
  const issues: string[] = [];
  let raw = rawContract;
  if (raw === undefined) {
    try {
      raw = await Bun.file(resolvePath(repoRoot, PROJECT_R_AGENT_CONTRACT_PATH)).json();
    } catch (error) {
      return {
        ok: false,
        contract: null,
        issues: [`contract unreadable: ${error instanceof Error ? error.message : String(error)}`],
      };
    }
  }

  if (!isRecord(raw)) {
    return { ok: false, contract: null, issues: ['contract must be a JSON object'] };
  }

  if (raw.schemaVersion !== 1) issues.push('schemaVersion must be 1');
  if (raw.contractKind !== 'agent-alignment') issues.push('contractKind must be agent-alignment');
  if (raw.projectKey !== 'project-r') issues.push('projectKey must be project-r');
  if (!isSafeRelativePath(raw.agentContext))
    issues.push('agentContext must be a safe relative path');
  if (!isSafeRelativePath(raw.skillAuthority))
    issues.push('skillAuthority must be a safe relative path');

  const installedSkills = parseStringArray(raw.installedSkills);
  if (!installedSkills || installedSkills.length === 0) {
    issues.push('installedSkills must be a non-empty string array');
  } else {
    if (!unique(installedSkills)) issues.push('installedSkills must be unique');
    for (const name of installedSkills) {
      if (!SKILL_NAME.test(name)) issues.push(`invalid installed skill name: ${name}`);
    }
  }

  const globalAuthorityPointers = parseStringArray(raw.globalAuthorityPointers);
  if (!globalAuthorityPointers || globalAuthorityPointers.length === 0) {
    issues.push('globalAuthorityPointers must be a non-empty string array');
  } else {
    if (!unique(globalAuthorityPointers)) issues.push('globalAuthorityPointers must be unique');
    for (const path of globalAuthorityPointers) {
      if (!isSafeRelativePath(path)) issues.push(`invalid global authority pointer: ${path}`);
    }
  }

  if (issues.length > 0 || !installedSkills || !globalAuthorityPointers) {
    return { ok: false, contract: null, issues };
  }

  const contract = raw as ProjectRAgentContract;
  const requiredPaths = [
    contract.agentContext,
    contract.skillAuthority,
    ...contract.installedSkills.map(name => `${contract.skillAuthority}/${name}/SKILL.md`),
    ...contract.globalAuthorityPointers,
  ];
  for (const relativePath of requiredPaths) {
    if (!(await pathExists(resolvePath(repoRoot, relativePath)))) {
      issues.push(`required repository path is missing: ${relativePath}`);
    }
  }

  return { ok: issues.length === 0, contract, issues };
}

if (import.meta.main) {
  const repoRoot = resolvePath(import.meta.dir, '..');
  const args = Bun.argv.slice(2);
  const installed = args.includes('--installed');
  const json = args.includes('--json');
  const unknown = args.filter(arg => arg !== '--installed' && arg !== '--json');
  if (unknown.length > 0) {
    console.error(`❌ unknown option: ${unknown[0]}`);
    process.exit(2);
  }
  const result = await parseProjectRAgentContract(repoRoot);
  let alignment: InstalledSkillAlignmentCheck | null = null;
  if (result.ok && installed) {
    const userHome = Bun.env.HOME;
    if (!userHome) {
      result.issues.push('HOME is required for installed skill alignment');
      result.ok = false;
    } else {
      alignment = await checkInstalledSkillAlignment(
        repoRoot,
        result.contract!,
        resolvePath(userHome, '.codex/skills')
      );
      if (!alignment.ok) {
        result.issues.push(...alignment.issues);
        result.ok = false;
      }
    }
  }

  if (json) {
    jsonOut({ ...result, alignment });
  } else if (result.ok) {
    console.info(
      `✅ Project R agent contract: ${result.contract!.installedSkills.length} repository skill packages · ${result.contract!.globalAuthorityPointers.length} global pointers`
    );
    if (alignment) {
      console.info(
        `✅ project-r-agent-alignment: ${alignment.skillCount} packages · ${alignment.filesCompared} files exact`
      );
    }
  } else {
    for (const item of result.issues) console.error(`❌ ${item}`);
  }
  process.exit(result.ok ? 0 : 1);
}
