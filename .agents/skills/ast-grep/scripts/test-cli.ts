#!/usr/bin/env bun
/**
 * Test runner CLI — discovery index + command assembly for bun test-ci.
 *
 *   bun scripts/test-cli.ts list [--json] [--format markdown]
 *   bun scripts/test-cli.ts assemble --profile integration [-t pattern] [filters...]
 *   bun scripts/test-cli.ts run --profile ci [--dry-run]
 */

import { resolve } from "node:path";
import {
  assembleTestCommand,
  buildTestIndex,
  formatTestListMarkdown,
  loadTestProfiles,
  type AssembledTestCommand,
} from "./scan/transpiler/test-runner.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

type Parsed = Record<string, string | boolean | string[]>;

function parseArgs(argv: string[]): Parsed {
  const out: Parsed = { action: argv[0] ?? "list", filters: [] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) {
      const filters = (out.filters as string[]) ?? [];
      filters.push(a);
      out.filters = filters;
      continue;
    }
    const key = a.slice(2);
    const next = argv[i + 1];
    if (next && !next.startsWith("--")) {
      out[key] = next;
      i++;
    } else {
      out[key] = true;
    }
  }
  return out;
}

function mergeSpawnEnv(extra?: Record<string, string>): Record<string, string | undefined> {
  return extra ? { ...process.env, ...extra } : process.env;
}

async function runPreflight(
  preflight: NonNullable<AssembledTestCommand["preflight"]>,
  env?: Record<string, string>,
): Promise<number> {
  const proc = Bun.spawn(preflight.command, {
    cwd: preflight.cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: mergeSpawnEnv(env),
  });
  return await proc.exited;
}

async function cmdList(opts: Parsed): Promise<number> {
  const index = await buildTestIndex(SKILL_ROOT);
  if (opts.json === true) {
    console.log(JSON.stringify(index, null, 2));
    return 0;
  }
  if (opts.format === "markdown") {
    console.log(formatTestListMarkdown(index));
    return 0;
  }

  console.log(`ast-grep tests: ${index.totals.files} files`);
  console.log(`  discovery: ${index.discovery.doc}`);
  console.log(`  api: ${index.api.ref}`);
  console.log(`  unit ${index.totals.unit} | integration ${index.totals.integration} | concurrent ${index.totals.concurrent}`);
  console.log("\nBun file patterns:");
  for (const p of index.discovery.filePatterns) console.log(`  ${p}`);
  console.log("exclusions: node_modules, hidden dirs (.*)");
  console.log("exact path: ./tests/foo.test.ts  |  filter: bun test unit (substring)");
  console.log("-t label: describe blocks + test name, space-separated");
  console.log("\nExpect shapes (domain types):");
  for (const s of index.shapes) {
    console.log(`  ${s.id.padEnd(22)} ${s.requiredKeys.length} required keys — ${s.assert}`);
  }
  console.log("\nExpect matchers (object):");
  for (const m of index.matchers.object.slice(0, 4)) console.log(`  ${m}`);
  console.log(`  ... +${index.matchers.object.length - 4} more (${index.matchers.doc})`);
  console.log(`\nDates/times (${index.time.doc}):`);
  console.log(`  default TZ: ${index.time.defaultTimezone}`);
  for (const api of index.time.apis) console.log(`  ${api}`);
  console.log("\nposition filters:");
  for (const f of index.positionFilters) {
    console.log(`  ${f.id.padEnd(14)} ${f.example}`);
  }
  console.log("\ndomain presets (profile → -t pattern):");
  for (const d of index.domainPresets) {
    console.log(`  ${d.id.padEnd(14)} profile=${d.profile}  -t "${d.testNamePattern}"`);
  }
  console.log("\nprofiles:");
  for (const [name, spec] of Object.entries(index.profiles)) {
    const extra = [
      spec.filters?.length ? `filters=${spec.filters.join(",")}` : "",
      spec.testNamePattern ? `-t="${spec.testNamePattern}"` : "",
      spec.preflight ? `preflight=${spec.preflight}` : "",
    ].filter(Boolean).join(" ");
    console.log(`  ${name.padEnd(14)} ${spec.description ?? ""}${extra ? ` (${extra})` : ""}`);
  }
  console.log("\nconcurrentTestGlob:");
  for (const g of index.bunfig.concurrentTestGlob) console.log(`  ${g}`);
  console.log("\nrun: bun scripts/test-cli.ts assemble --profile network --dry-run");
  return 0;
}

async function cmdAssemble(opts: Parsed): Promise<number> {
  const profile = String(opts.profile ?? "ci");
  const { profiles } = await loadTestProfiles(SKILL_ROOT);
  const assembled = assembleTestCommand(profiles, {
    skillRoot: SKILL_ROOT,
    repoRoot: REPO_ROOT,
    profile,
    cliFilters: (opts.filters as string[]) ?? [],
    testPath: typeof opts.path === "string" ? opts.path : undefined,
    testNamePattern: typeof opts.t === "string"
      ? opts.t
      : typeof opts["test-name-pattern"] === "string"
        ? opts["test-name-pattern"]
        : undefined,
    shard: typeof opts.shard === "string" ? opts.shard : undefined,
    changed: typeof opts.changed === "string" ? opts.changed : undefined,
  });

  if (opts.json === true) {
    console.log(JSON.stringify(assembled, null, 2));
    return 0;
  }
  if (opts["dry-run"] === true) {
    console.log(`cwd=${assembled.cwd} ${assembled.command.join(" ")}`);
    if (assembled.preflight) {
      console.log(`preflight: ${assembled.preflight.command.join(" ")}`);
    }
    return 0;
  }
  return 0;
}

async function cmdRun(opts: Parsed): Promise<number> {
  const profile = String(opts.profile ?? "ci");
  const { profiles } = await loadTestProfiles(SKILL_ROOT);
  const assembled = assembleTestCommand(profiles, {
    skillRoot: SKILL_ROOT,
    repoRoot: REPO_ROOT,
    profile,
    cliFilters: (opts.filters as string[]) ?? [],
    testPath: typeof opts.path === "string" ? opts.path : undefined,
    testNamePattern: typeof opts.t === "string" ? opts.t : undefined,
    shard: typeof opts.shard === "string" ? opts.shard : undefined,
    changed: typeof opts.changed === "string" ? opts.changed : undefined,
  });

  if (opts["dry-run"] === true || opts["dry-run"] === "true") {
    console.log(`cwd=${assembled.cwd} ${assembled.command.join(" ")}`);
    return 0;
  }

  if (assembled.preflight && opts["skip-preflight"] !== true) {
    const code = await runPreflight(assembled.preflight, assembled.env);
    if (code !== 0) return code;
  }

  const started = Date.now();
  const proc = Bun.spawn(assembled.command, {
    cwd: assembled.cwd,
    stdout: "inherit",
    stderr: "inherit",
    env: mergeSpawnEnv(assembled.env),
  });
  const code = await proc.exited;

  if (opts.json === true) {
    console.log(JSON.stringify({
      profile: assembled.profile,
      command: assembled.command,
      cwd: assembled.cwd,
      returncode: code,
      elapsed_ms: Date.now() - started,
    }, null, 2));
  }
  return code;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const action = String(opts.action);
  let code = 1;
  if (action === "list") code = await cmdList(opts);
  else if (action === "assemble") code = await cmdAssemble(opts);
  else if (action === "run") code = await cmdRun(opts);
  else {
    console.error(`unknown action: ${action} (list | assemble | run)`);
    code = 1;
  }
  process.exit(code);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});