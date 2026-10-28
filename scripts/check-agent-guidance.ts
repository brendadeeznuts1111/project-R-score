#!/usr/bin/env bun
/** Validate that always-loaded AGENTS.md chains stay bounded and free of edit artifacts. */

import { dirnamePath, joinPath, relativePath, resolvePath } from '../lib/path-bun.ts';

export const DEFAULT_AGENT_GUIDANCE_MAX_BYTES = 32 * 1024;

export type AgentGuidanceIssue = {
  code: 'instruction-chain-size' | 'edit-artifact';
  path: string;
  message: string;
};

export type AgentGuidanceResult = {
  ok: boolean;
  files: number;
  maxBytes: number;
  issues: AgentGuidanceIssue[];
};

const EDIT_ARTIFACTS = ['</content>', '<parameter name="filePath">'];
const SKIP_SEGMENTS = new Set(['.git', '.worktrees', 'node_modules', 'vendor']);

function displayPath(repoRoot: string, filePath: string): string {
  const display = relativePath(repoRoot, filePath);
  return display === '.' ? 'AGENTS.md' : display;
}

function ancestorGuidance(repoRoot: string, filePath: string): string[] {
  const chain: string[] = [];
  let current = dirnamePath(filePath);
  while (current.startsWith(repoRoot)) {
    chain.push(joinPath(current, 'AGENTS.md'));
    if (current === repoRoot) break;
    current = dirnamePath(current);
  }
  return chain.reverse();
}

export async function checkAgentGuidance(
  repoRoot: string,
  maxBytes = DEFAULT_AGENT_GUIDANCE_MAX_BYTES
): Promise<AgentGuidanceResult> {
  const root = resolvePath(repoRoot);
  const files: string[] = [];
  for await (const relativePath of new Bun.Glob('**/AGENTS.md').scan({
    cwd: root,
    dot: true,
    onlyFiles: true,
  })) {
    if (relativePath.split('/').some(segment => SKIP_SEGMENTS.has(segment))) continue;
    files.push(joinPath(root, relativePath));
  }
  if (await Bun.file(joinPath(root, 'AGENTS.md')).exists()) {
    files.push(joinPath(root, 'AGENTS.md'));
  }

  const uniqueFiles = [...new Set(files)].sort();
  const existing = new Set(uniqueFiles);
  const issues: AgentGuidanceIssue[] = [];

  for (const filePath of uniqueFiles) {
    const text = await Bun.file(filePath).text();
    for (const artifact of EDIT_ARTIFACTS) {
      if (!text.includes(artifact)) continue;
      issues.push({
        code: 'edit-artifact',
        path: displayPath(root, filePath),
        message: `contains editor artifact ${artifact}`,
      });
    }

    const chain = ancestorGuidance(root, filePath).filter(candidate => existing.has(candidate));
    const bytes = chain.reduce((total, candidate) => total + Bun.file(candidate).size, 0);
    if (bytes > maxBytes) {
      issues.push({
        code: 'instruction-chain-size',
        path: displayPath(root, filePath),
        message: `${bytes} bytes across ${chain.map(item => displayPath(root, item)).join(' + ')} exceeds ${maxBytes}`,
      });
    }
  }

  return { ok: issues.length === 0, files: uniqueFiles.length, maxBytes, issues };
}

if (import.meta.main) {
  const json = Bun.argv.includes('--json');
  const result = await checkAgentGuidance(resolvePath(import.meta.dir, '..'));
  if (json) {
    console.log(JSON.stringify(result, null, 2));
  } else if (result.ok) {
    console.log(`Agent guidance valid: ${result.files} files; every chain <= ${result.maxBytes} bytes`);
  } else {
    for (const issue of result.issues) {
      console.error(`${issue.code}: ${issue.path}: ${issue.message}`);
    }
  }
  process.exitCode = result.ok ? 0 : 1;
}
