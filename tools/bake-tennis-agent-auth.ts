#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/utils#bun-deepequals — Bun.deepEquals

import { joinPath } from '../lib/path-bun.ts';
import { loadVaultMapFile } from '../lib/security/vault-map.ts';
import { buildTennisAgentAuthArtifact, TENNIS_AGENT_AUTH_PATH } from '../lib/tennis/agent-auth.ts';

const root = joinPath(import.meta.dir, '..');
const outPath = joinPath(root, 'public', 'registry', 'tennis', 'agent-auth.json');
const vaultMapPath = joinPath(root, 'config', 'vault-map.toml');
const check = Bun.argv.includes('--check');

const artifact = buildTennisAgentAuthArtifact(await loadVaultMapFile(vaultMapPath));

if (check) {
  const existing = (await Bun.file(outPath).json()) as typeof artifact;
  const { generatedAt: _newGeneratedAt, ...stableNew } = artifact;
  const { generatedAt: _oldGeneratedAt, ...stableOld } = existing;
  if (!Bun.deepEquals(stableNew, stableOld, true)) {
    console.error(`❌ ${TENNIS_AGENT_AUTH_PATH} is stale; run bun run tennis:agent-auth:bake`);
    process.exit(1);
  }
  console.info(`✅ tennis agent auth current (${artifact.status} · secret values excluded)`);
  process.exit(0);
}

await Bun.write(outPath, `${JSON.stringify(artifact, null, 2)}\n`);
console.info(`✅ wrote ${TENNIS_AGENT_AUTH_PATH} (${artifact.status} · secret values excluded)`);
