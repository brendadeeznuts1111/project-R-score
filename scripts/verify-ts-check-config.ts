// scripts/verify-ts-check-config.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

type TsRef = { path: string };
type TsConfig = {
  references?: TsRef[];
};

const ROOT = process.cwd();

function readJsonFile<T>(path: string): T {
  const absPath = join(ROOT, path);
  const raw = readFileSync(absPath, "utf8");
  return JSON.parse(raw) as T;
}

function fail(message: string): never {
  console.error(`❌ ${message}`);
  process.exit(1);
}

function assertExists(path: string): void {
  const absPath = join(ROOT, path);
  if (!existsSync(absPath)) {
    fail(`Missing required file: ${path}`);
  }
}

function pathsFromRefs(cfg: TsConfig): string[] {
  return (cfg.references ?? []).map((r) => r.path);
}

function assertSubset(name: string, subset: string[], superset: string[]): void {
  const set = new Set(superset);
  const missing = subset.filter((p) => !set.has(p));
  if (missing.length > 0) {
    fail(`${name} has references not present in root tsconfig.json: ${missing.join(", ")}`);
  }
}

function main(): void {
  const pkg = readJsonFile<{ scripts?: Record<string, string> }>("package.json");
  const rootCfg = readJsonFile<TsConfig>("tsconfig.json");
  const ciCfg = readJsonFile<TsConfig>("tsconfig.ci.json");

  assertExists("tsconfig.base.json");
  assertExists("tsconfig.check.json");
  assertExists("tsconfig.ci.json");
  assertExists("tsconfig.json");

  const scripts = pkg.scripts ?? {};
  if (scripts["type-check"] !== "bun run tsc -b tsconfig.check.json") {
    fail(`package.json script type-check is unexpected: ${scripts["type-check"] ?? "<missing>"}`);
  }
  if (scripts["type-check:ci"] !== "bun run tsc -b tsconfig.ci.json") {
    fail(`package.json script type-check:ci is unexpected: ${scripts["type-check:ci"] ?? "<missing>"}`);
  }
  if (scripts["type-check:full"] !== "bun run tsc -b") {
    fail(`package.json script type-check:full is unexpected: ${scripts["type-check:full"] ?? "<missing>"}`);
  }

  const rootRefs = pathsFromRefs(rootCfg);
  const ciRefs = pathsFromRefs(ciCfg);

  if (rootRefs.length === 0) {
    fail("tsconfig.json has no references.");
  }
  if (!rootRefs.includes("./tsconfig.check.json")) {
    fail("tsconfig.json must reference ./tsconfig.check.json");
  }
  if (!ciRefs.includes("./tsconfig.check.json")) {
    fail("tsconfig.ci.json must reference ./tsconfig.check.json");
  }

  assertSubset("tsconfig.ci.json", ciRefs, rootRefs);

  for (const refPath of rootRefs) {
    const candidate = refPath.endsWith(".json") ? refPath : `${refPath}/tsconfig.json`;
    assertExists(candidate);
  }

  console.log("✅ TypeScript check configuration looks consistent.");
}

main();
