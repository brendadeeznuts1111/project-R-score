#!/usr/bin/env bun
/**
 * Bun-native entry for ast-grep skill — fast path via Bun.spawn, zero extra deps.
 * Delegates to ast_grep_helper.py for full subcommands; runs sg directly for `sg` passthrough.
 *
 * Usage:
 *   bun scripts/bun-cli.ts doctor
 *   bun scripts/bun-cli.ts bun inventory --zone sports-terminal
 *   bun scripts/bun-cli.ts sg run -p 'Bun.serve($$$)' --lang ts --path src/
 */

import { join, resolve } from "node:path";

const SKILL_ROOT = resolve(import.meta.dir, "..");
const REPO_ROOT = process.env.AST_GREP_REPO_ROOT || process.env.WORKSPACE_FOLDER || process.cwd();

async function executable(path: string): Promise<boolean> {
  return Bun.file(path).exists();
}

async function resolveSg(): Promise<string> {
  const env = process.env.AST_GREP_BIN;
  if (env && await executable(env)) return env;
  const candidates = [
    join(SKILL_ROOT, "node_modules/.bin/ast-grep"),
    "/opt/homebrew/bin/ast-grep",
    "/usr/local/bin/ast-grep",
  ];
  for (const c of candidates) {
    if (!await executable(c)) continue;
    const proc = Bun.spawn([c, "outline", "--help"], { stdout: "pipe", stderr: "pipe" });
    if (await proc.exited === 0) return c;
  }
  throw new Error("ast-grep 0.44+ not found. Run: cd .agents/skills/ast-grep && ./scripts/install.sh");
}

async function runPython(args: string[]): Promise<number> {
  const helper = join(SKILL_ROOT, "scripts/ast_grep_helper.py");
  const proc = Bun.spawn(["python3", helper, ...args], {
    cwd: REPO_ROOT,
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });
  return await proc.exited;
}

async function runSgPassthrough(args: string[]): Promise<number> {
  const bin = await resolveSg();
  const proc = Bun.spawn([bin, ...args], {
    cwd: REPO_ROOT,
    stdout: "inherit",
    stderr: "inherit",
    env: process.env,
  });
  return await proc.exited;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.error("Usage: bun scripts/bun-cli.ts <helper-subcommand> [args...]");
    console.error("       bun scripts/bun-cli.ts sg <ast-grep-args...>");
    process.exit(1);
  }

  if (args[0] === "sg") {
    process.exit(await runSgPassthrough(args.slice(1)));
  }

  process.exit(await runPython(args));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});