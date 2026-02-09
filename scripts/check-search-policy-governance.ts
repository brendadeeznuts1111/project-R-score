#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

type PolicyShape = {
  policyVersion?: string;
  policyChangeRationale?: Record<string, string>;
};

function fetchDepthArg(): string {
  const raw = (Bun.env.SEARCH_GOVERNANCE_FETCH_DEPTH || '5').trim();
  const value = Number(raw);
  const depth = Number.isFinite(value) && value > 0 ? Math.floor(value) : 5;
  return `--depth=${depth}`;
}

async function runGit(args: string[]): Promise<{ code: number; stdout: string }> {
  const proc = Bun.spawn(['git', ...args], {
    cwd: process.cwd(),
    stdout: 'pipe',
    stderr: 'ignore',
  });
  const stdout = await new Response(proc.stdout).text();
  const code = await proc.exited;
  return {
    code,
    stdout: stdout.trim(),
  };
}

async function resolveDiffRange(): Promise<string> {
  const baseRef = (Bun.env.GITHUB_BASE_REF || '').trim();
  if (baseRef) {
    const fetch = await runGit(['fetch', 'origin', baseRef, fetchDepthArg()]);
    if (fetch.code === 0) {
      return `origin/${baseRef}...HEAD`;
    }
  }
  const headPrev = await runGit(['rev-parse', '--verify', 'HEAD~1']);
  if (headPrev.code === 0) {
    return 'HEAD~1...HEAD';
  }
  return 'HEAD';
}

async function fileListFromDiff(range: string): Promise<string[]> {
  const diff = await runGit(['diff', '--name-only', range]);
  if (diff.code !== 0 || !diff.stdout) return [];
  return diff.stdout
    .split('\n')
    .map(v => v.trim())
    .filter(Boolean);
}

async function policyThresholdChanged(range: string): Promise<boolean> {
  const out = await runGit(['diff', '--unified=0', range, '--', '.search/policies.json']);
  if (out.code !== 0 || !out.stdout) return false;
  return /scoreThresholdsByQueryPack|strictLatencyP95WarnMs|strictPeakHeapWarnMB|strictPeakRssWarnMB|strictReliabilityFloor|qualityDropWarn|slopRiseWarn|reliabilityDropWarn/.test(
    out.stdout
  );
}

async function main(): Promise<void> {
  const fetchDepth = fetchDepthArg();
  const range = await resolveDiffRange();
  const changed = await fileListFromDiff(range);
  const policyPath = '.search/policies.json';
  const changelogPath = '.search/POLICY_CHANGELOG.md';
  const policyChanged = changed.includes(policyPath);
  const thresholdChanged = policyChanged && (await policyThresholdChanged(range));

  const errors: string[] = [];

  if (policyChanged) {
    const path = resolve(policyPath);
    if (!existsSync(path)) {
      errors.push(`missing ${policyPath}`);
    } else {
      const raw = JSON.parse(await readFile(path, 'utf8')) as PolicyShape;
      if (!raw.policyVersion || !String(raw.policyVersion).trim()) {
        errors.push('policyVersion is required in .search/policies.json');
      }
      const rationale = raw.policyChangeRationale || {};
      if (Object.keys(rationale).length === 0) {
        errors.push('policyChangeRationale is required and must include at least one key');
      }
      if (existsSync(resolve(changelogPath))) {
        const log = await readFile(resolve(changelogPath), 'utf8');
        if (raw.policyVersion && !log.includes(String(raw.policyVersion))) {
          errors.push(
            `.search/POLICY_CHANGELOG.md must include policyVersion ${raw.policyVersion}`
          );
        }
      } else {
        errors.push(`missing ${changelogPath}`);
      }
    }
  }

  if (thresholdChanged) {
    const testChanged = changed.some(file => /^tests\/.*\.test\.ts$/.test(file));
    const changelogChanged = changed.includes(changelogPath);
    if (!testChanged) {
      errors.push('threshold policy changed but no test file changed under tests/*.test.ts');
    }
    if (!changelogChanged) {
      errors.push('threshold policy changed but .search/POLICY_CHANGELOG.md was not updated');
    }
  }

  if (errors.length > 0) {
    console.error('[policy-governance] failed');
    for (const err of errors) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }

  console.log('[policy-governance] ok');
  console.log(`fetchDepth=${fetchDepth}`);
  console.log(`range=${range}`);
  console.log(`policyChanged=${policyChanged}`);
  console.log(`thresholdChanged=${thresholdChanged}`);
}

await main();
