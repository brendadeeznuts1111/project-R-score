#!/usr/bin/env bun

import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dir, '..');
const PLACEHOLDER_PATTERNS = [
  /^your_/i,
  /^replace_me$/i,
  /^changeme$/i,
  /^example/i,
  /^dummy/i,
  /^test-/i,
  /^xxx/i,
];

type Finding = {
  file: string;
  line: number;
  key: string;
  reason: string;
  tracked: boolean;
};

const findings: Finding[] = [];

function isPlaceholder(value: string): boolean {
  if (value.length === 0) return true;
  return PLACEHOLDER_PATTERNS.some((re) => re.test(value));
}

function looksLikeSecretKey(key: string): boolean {
  return /(SECRET|TOKEN|PASSWORD|PRIVATE|ACCESS_KEY|API_KEY|WEBHOOK|AUTH)/i.test(key);
}

function looksHighConfidenceSecret(value: string): boolean {
  if (isPlaceholder(value)) return false;
  if (value.length < 12) return false;
  if (value.includes(' ')) return false;
  if (/^[A-Za-z0-9+/_=-]{12,}$/.test(value)) return true;
  if (/^[A-Fa-f0-9]{24,}$/.test(value)) return true;
  return false;
}

function parseEnvFile(filePath: string, tracked: boolean) {
  if (!existsSync(filePath)) return;
  const rel = filePath.replace(ROOT + '/', '');
  const lines = Bun.file(filePath).text();
  return lines.then((content) => {
    content.split('\n').forEach((rawLine, idx) => {
      const line = rawLine.trim();
      if (line.length === 0 || line.startsWith('#')) return;
      const eq = line.indexOf('=');
      if (eq < 1) return;
      const key = line.slice(0, eq).trim();
      const value = line.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
      if (!looksLikeSecretKey(key)) return;
      if (!looksHighConfidenceSecret(value)) return;
      findings.push({
        file: rel,
        line: idx + 1,
        key,
        reason: 'high-confidence plaintext secret-like value',
        tracked,
      });
    });
  });
}

function getTrackedEnvFiles(): string[] {
  const output = Bun.spawnSync(['git', 'ls-files'], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
  if (output.exitCode !== 0) return [];
  const text = new TextDecoder().decode(output.stdout);
  return text
    .split('\n')
    .map((v) => v.trim())
    .filter(Boolean)
    .filter((file) => /^\.env(\..+)?$/.test(file));
}

function isIgnoredByGit(filePath: string): boolean {
  const output = Bun.spawnSync(['git', 'check-ignore', '-q', filePath], { cwd: ROOT, stdout: 'pipe', stderr: 'pipe' });
  return output.exitCode === 0;
}

async function main() {
  console.log('Local secret scan');
  console.log(`cwd=${ROOT}`);
  console.log('');

  const trackedEnvFiles = getTrackedEnvFiles();
  const trackedAbsolute = trackedEnvFiles.map((file) => resolve(ROOT, file));

  const localCandidates = [
    '.env',
    '.env.local',
    '.env.secret.local',
    '.env.production',
    '.env.factory-wager',
    '.env.bun-secrets',
    '.env.bun-secrets-v37',
    '.env.registry',
    '.env.secret',
  ].map((file) => resolve(ROOT, file));

  await Promise.all([
    ...trackedAbsolute.map((file) => parseEnvFile(file, true)),
    ...localCandidates.map((file) => parseEnvFile(file, false)),
  ]);

  const trackedFindings = findings.filter((f) => f.tracked);
  const localFindings = findings.filter((f) => !f.tracked);

  if (trackedFindings.length > 0) {
    console.log('FAIL tracked plaintext secrets found:');
    for (const finding of trackedFindings) {
      console.log(`  ${finding.file}:${finding.line} ${finding.key} (${finding.reason})`);
    }
  } else {
    console.log('PASS no high-confidence plaintext secrets in tracked .env files');
  }

  const requiredLocalFiles = ['.env.local', '.env.secret.local'];
  for (const file of requiredLocalFiles) {
    const ignored = isIgnoredByGit(file);
    if (ignored) {
      console.log(`PASS gitignore-local ${file} ignored`);
    } else {
      console.log(`FAIL gitignore-local ${file} is not ignored`);
    }
  }

  if (localFindings.length > 0) {
    console.log('WARN local secret-like values detected in untracked env files:');
    const dedup = new Set<string>();
    for (const finding of localFindings) {
      const line = `${finding.file}:${finding.line} ${finding.key}`;
      if (dedup.has(line)) continue;
      dedup.add(line);
      console.log(`  ${line}`);
    }
    console.log('WARN ensure these values are rotated if previously exposed and remain untracked.');
  } else {
    console.log('PASS no local secret-like values detected in scanned local files');
  }

  console.log('');
  console.log('Rotation checklist');
  console.log('1. Rotate any credential that has ever appeared in tracked history.');
  console.log('2. Update runtime secret stores and local untracked env files.');
  console.log('3. Validate with `bun run security:secrets:local` and deploy smoke checks.');
  console.log('4. Revoke old credentials after successful rollout validation.');

  const hasGitIgnoreFailure = requiredLocalFiles.some((file) => !isIgnoredByGit(file));
  process.exit(trackedFindings.length > 0 || hasGitIgnoreFailure ? 1 : 0);
}

main();
