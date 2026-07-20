#!/usr/bin/env bun

// @see https://bun.com/docs/runtime/file-io — Bun.file, Bun.write
import { readJsonSync, writeJson, resolvePath } from './lib/fs-bun';
import { buildBaselineForDemo } from './demo-tier1-baselines';

type DemoModuleContract = {
  language: string;
  defaults: Record<string, unknown>;
  flags: string[];
  benchCommand: string;
  testCommand: string;
  benchmarkBaseline?: {
    mode: 'hash' | 'string' | 'map-size';
    iterations: number;
    minOpsPerSec: number;
    sourceIds: string[];
  };
};

type DemoModuleContractFile = {
  version: number;
  total: number;
  generatedAt: string;
  modules: Record<string, DemoModuleContract>;
};

const CONTRACT_PATH = resolvePath(
  'scratch',
  'bun-v1.3.9-examples',
  'playground-web',
  'demo-module-contract.json'
);

async function main() {
  const contract = readJsonSync<DemoModuleContractFile>(CONTRACT_PATH);
  let updated = 0;
  for (const id of Object.keys(contract.modules || {})) {
    const baseline = buildBaselineForDemo(id);
    contract.modules[id].benchmarkBaseline = {
      mode: baseline.benchmark.mode,
      iterations: baseline.benchmark.iterations,
      minOpsPerSec: baseline.benchmark.minOpsPerSec,
      sourceIds: baseline.sourceIds,
    };
    updated++;
  }
  contract.generatedAt = new Date().toISOString();
  await writeJson(CONTRACT_PATH, contract);
  console.info(`[demo-baseline-hydrate] updated benchmarkBaseline for ${updated} demos`);
}

if (import.meta.main) {
  await main();
}
