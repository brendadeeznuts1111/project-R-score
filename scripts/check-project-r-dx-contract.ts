#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
/** Validate Project R's portable contract consumed by the global DX setup doctor. */

import { resolvePath } from '../lib/path-bun.ts';

export const PROJECT_R_DX_CONTRACT_PATH = 'config/project-r-dx-contract.json';

export type ProjectRDxContract = {
  schemaVersion: 1;
  projectKey: 'project-r';
  agentContext: string;
  skillAuthority: string;
  installedSkills: string[];
  globalAuthorityPointers: string[];
};

export type ProjectRDxContractCheck = {
  ok: boolean;
  contract: ProjectRDxContract | null;
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

export async function parseProjectRDxContract(
  repoRoot: string,
  rawContract?: unknown
): Promise<ProjectRDxContractCheck> {
  const issues: string[] = [];
  let raw = rawContract;
  if (raw === undefined) {
    try {
      raw = await Bun.file(resolvePath(repoRoot, PROJECT_R_DX_CONTRACT_PATH)).json();
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

  const contract = raw as ProjectRDxContract;
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
  const result = await parseProjectRDxContract(repoRoot);
  if (result.ok) {
    console.info(
      `✅ Project R DX contract: ${result.contract!.installedSkills.length} installed skills · ${result.contract!.globalAuthorityPointers.length} global pointers`
    );
  } else {
    for (const item of result.issues) console.error(`❌ ${item}`);
    process.exit(1);
  }
}
