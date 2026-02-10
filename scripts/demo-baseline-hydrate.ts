#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { buildBaselineForDemo } from "./demo-tier1-baselines";

type DemoModuleContract = {
  language: string;
  defaults: Record<string, unknown>;
  flags: string[];
  benchCommand: string;
  testCommand: string;
  benchmarkBaseline?: {
    mode: "hash" | "string" | "map-size";
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

const ROOT = process.cwd();
const CONTRACT_PATH = join(ROOT, "scratch", "bun-v1.3.9-examples", "playground-web", "demo-module-contract.json");

function main() {
  const contract = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as DemoModuleContractFile;
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
  Bun.write(CONTRACT_PATH, `${JSON.stringify(contract, null, 2)}\n`);
  console.log(`[demo-baseline-hydrate] updated benchmarkBaseline for ${updated} demos`);
}

main();
