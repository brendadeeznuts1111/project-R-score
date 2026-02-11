#!/usr/bin/env bun

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateTier1CoverageAcrossDemos, validateTier1SourcesForDemo } from "./demo-tier1-baselines";

type DemoContract = {
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

type DemoContractFile = {
  version: number;
  total: number;
  generatedAt: string;
  modules: Record<string, DemoContract>;
};

const ROOT = process.cwd();
const SERVER_PATH = join(ROOT, "scratch", "bun-v1.3.9-examples", "playground-web", "server.ts");
const CONTRACT_PATH = join(ROOT, "scratch", "bun-v1.3.9-examples", "playground-web", "demo-module-contract.json");
const REQUIRED_KEYS = ["language", "defaults", "flags", "benchCommand", "testCommand", "benchmarkBaseline"] as const;

function collectDemoIds(source: string): string[] {
  const marker = "const DEMOS_BASE = [";
  const start = source.indexOf(marker);
  if (start === -1) throw new Error(`Unable to find '${marker}' in ${SERVER_PATH}`);
  const end = source.indexOf("\n\nasync function runCommand", start);
  if (end === -1) throw new Error(`Unable to find DEMOS_BASE boundary in ${SERVER_PATH}`);
  const block = source.slice(start, end);
  return [...block.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
}

function fail(messages: string[]): never {
  for (const message of messages) {
    console.error(`[demo-contract][fail] ${message}`);
  }
  process.exit(1);
}

function main() {
  const serverSource = readFileSync(SERVER_PATH, "utf8");
  const contractFile = JSON.parse(readFileSync(CONTRACT_PATH, "utf8")) as DemoContractFile;
  const demoIds = collectDemoIds(serverSource);
  const contractIds = Object.keys(contractFile.modules || {});

  const errors: string[] = [];

  if (!Number.isFinite(contractFile.total) || contractFile.total !== demoIds.length) {
    errors.push(`contract total=${contractFile.total} does not match demos=${demoIds.length}`);
  }

  const missingIds = demoIds.filter((id) => !contractIds.includes(id));
  if (missingIds.length > 0) {
    errors.push(`missing contract entries for demo ids: ${missingIds.join(", ")}`);
  }

  const unknownIds = contractIds.filter((id) => !demoIds.includes(id));
  if (unknownIds.length > 0) {
    errors.push(`contract has unknown demo ids: ${unknownIds.join(", ")}`);
  }

  for (const id of demoIds) {
    const contract = contractFile.modules[id];
    if (!contract) continue;
    for (const key of REQUIRED_KEYS) {
      const value = (contract as any)[key];
      const isEmptyString = typeof value === "string" && value.trim() === "";
      const isEmptyArray = Array.isArray(value) && value.length === 0;
      const isMissing = value === null || value === undefined || isEmptyString || isEmptyArray;
      if (isMissing) {
        errors.push(`${id}.${key} is missing/empty`);
      }
    }
    if (!["bash", "typescript", "javascript", "json", "text"].includes(contract.language)) {
      errors.push(`${id}.language must be one of bash|typescript|javascript|json|text`);
    }
    if (typeof contract.defaults !== "object" || Array.isArray(contract.defaults)) {
      errors.push(`${id}.defaults must be an object`);
    }
    if (!Array.isArray(contract.flags) || !contract.flags.every((flag) => typeof flag === "string")) {
      errors.push(`${id}.flags must be a string[]`);
    }
    if (!String(contract.benchCommand).startsWith("bun run ")) {
      errors.push(`${id}.benchCommand must start with 'bun run '`);
    }
    if (!String(contract.testCommand).startsWith("bun run ")) {
      errors.push(`${id}.testCommand must start with 'bun run '`);
    }
    if (!contract.benchmarkBaseline) {
      errors.push(`${id}.benchmarkBaseline is missing`);
    } else {
      if (!["hash", "string", "map-size"].includes(contract.benchmarkBaseline.mode)) {
        errors.push(`${id}.benchmarkBaseline.mode invalid`);
      }
      if (!Number.isFinite(contract.benchmarkBaseline.iterations) || contract.benchmarkBaseline.iterations <= 0) {
        errors.push(`${id}.benchmarkBaseline.iterations must be > 0`);
      }
      if (!Number.isFinite(contract.benchmarkBaseline.minOpsPerSec) || contract.benchmarkBaseline.minOpsPerSec <= 0) {
        errors.push(`${id}.benchmarkBaseline.minOpsPerSec must be > 0`);
      }
      if (!Array.isArray(contract.benchmarkBaseline.sourceIds) || contract.benchmarkBaseline.sourceIds.length === 0) {
        errors.push(`${id}.benchmarkBaseline.sourceIds must be a non-empty string[]`);
      }
    }

    const tier1 = validateTier1SourcesForDemo(id);
    if (!tier1.ok) {
      errors.push(...tier1.errors);
    }
  }

  const tier1Coverage = validateTier1CoverageAcrossDemos(demoIds);
  if (!tier1Coverage.ok) {
    errors.push(...tier1Coverage.errors);
  }

  if (errors.length > 0) {
    fail(errors);
  }

  console.log(`[demo-contract][pass] demos=${demoIds.length} contracts=${contractIds.length}`);
}

main();
