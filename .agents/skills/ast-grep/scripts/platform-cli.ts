#!/usr/bin/env bun
/**
 * Platform target CLI — CPU/OS cross-install alignment (Layer 5).
 *
 *   bun scripts/platform-cli.ts
 *   bun scripts/platform-cli.ts check x64 linux
 *   bun scripts/platform-cli.ts resolve cross-linux-x64
 */

import { resolve } from "node:path";
import {
  CPU_VALUES,
  OS_VALUES,
  PLATFORM_DOCS,
  PlatformMatcher,
  loadInstallProfiles,
  resolveInstallProfile,
  resolveScanPlatform,
  type PlatformTarget,
} from "./scan/transpiler/platform-matcher.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = { action: "list" };
  if (argv[0] === "check") {
    out.action = "check";
    out.cpu = argv[1] ?? "";
    out.os = argv[2] ?? "";
    for (const a of argv.slice(3)) {
      if (a === "--json") out.json = true;
    }
    return out;
  }
  if (argv[0] === "resolve") {
    out.action = "resolve";
    out.profile = argv[1] ?? "";
    for (const a of argv.slice(2)) {
      if (a === "--json") out.json = true;
    }
    return out;
  }
  for (const a of argv) {
    if (a === "--json") out.json = true;
  }
  return out;
}

async function listPlatform(opts: Record<string, string | boolean>): Promise<void> {
  const host = PlatformMatcher.detectHost();
  const envTarget = PlatformMatcher.fromEnv();
  const profiles = await loadInstallProfiles(SKILL_ROOT);
  const crossProfiles = profiles.filter((p) => p.target);

  const payload = {
    layer: "5",
    command: "platform",
    docs: PLATFORM_DOCS,
    host,
    envTarget,
    cpuValues: CPU_VALUES,
    osValues: OS_VALUES,
    installProfiles: crossProfiles.map((p) => ({
      name: p.name,
      description: p.description,
      target: p.target,
      args: p.args,
    })),
  };

  if (opts.json === true) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return;
  }

  console.log(`host: ${host.cpu}/${host.os} (${host.rawArch} · ${host.rawPlatform} ${host.release})`);
  console.log(`bun: ${host.bunVersion}`);
  if (envTarget) console.log(`env target: ${envTarget.cpu}/${envTarget.os}`);
  console.log(`\ncpu: ${CPU_VALUES.join(", ")}`);
  console.log(`os: ${OS_VALUES.join(", ")}`);
  console.log("\n[cross-target install profiles]");
  for (const p of crossProfiles) {
    const t = p.target!;
    console.log(`  ${p.name}: ${t.cpu}/${t.os} — bun install ${p.args.join(" ")}`);
  }
  console.log("\nrun: bun scripts/platform-cli.ts check x64 linux");
}

async function checkPlatform(opts: Record<string, string | boolean>): Promise<number> {
  const cpu = String(opts.cpu ?? "");
  const osName = String(opts.os ?? "");
  if (!cpu || !osName) {
    console.error("Usage: bun scripts/platform-cli.ts check <cpu> <os> [--json]");
    return 1;
  }

  const normalized: PlatformTarget = {
    cpu: PlatformMatcher.normalizeCpu(cpu) ?? cpu as PlatformTarget["cpu"],
    os: PlatformMatcher.normalizeOs(osName) ?? osName as PlatformTarget["os"],
  };
  const valid = PlatformMatcher.isValidTarget(normalized);
  const ctx = resolveScanPlatform({ cliTarget: valid ? normalized : null });

  const payload = {
    layer: "5",
    command: "platform check",
    valid,
    requested: { cpu, os: osName },
    target: normalized,
    host: ctx.host,
    crossTarget: ctx.crossTarget,
    installArgs: ctx.installArgs,
  };

  if (opts.json === true) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return valid ? 0 : 1;
  }

  if (!valid) {
    console.error(`invalid target ${cpu}/${osName} — cpu: ${CPU_VALUES.join("|")} os: ${OS_VALUES.join("|")}`);
    return 1;
  }

  const status = ctx.crossTarget ? "CROSS-TARGET" : "NATIVE";
  console.log(`${normalized.cpu}/${normalized.os} — ${status}`);
  console.log(`  host: ${ctx.host.cpu}/${ctx.host.os}`);
  console.log(`  install: bun install ${ctx.installArgs.join(" ")}`);
  return 0;
}

async function resolveProfile(opts: Record<string, string | boolean>): Promise<number> {
  const name = String(opts.profile ?? "");
  if (!name) {
    console.error("Usage: bun scripts/platform-cli.ts resolve <install-profile> [--json]");
    return 1;
  }

  const spec = await resolveInstallProfile(SKILL_ROOT, name);
  if (!spec) {
    console.error(`unknown install profile '${name}'`);
    return 1;
  }

  const ctx = resolveScanPlatform({ installProfile: spec });
  const payload = {
    layer: "5",
    command: "platform resolve",
    profile: spec.name,
    description: spec.description,
    args: spec.args,
    target: spec.target ?? ctx.target,
    installArgs: ctx.installArgs,
    crossTarget: ctx.crossTarget,
  };

  if (opts.json === true) {
    process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
    return 0;
  }

  console.log(`${spec.name}: ${spec.description ?? ""}`);
  console.log(`  bun install ${spec.args.join(" ")}`);
  if (spec.target) {
    console.log(`  target: ${spec.target.cpu}/${spec.target.os} (${ctx.crossTarget ? "cross" : "native"})`);
  }
  return 0;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.action === "check") {
    process.exit(await checkPlatform(opts));
    return;
  }
  if (opts.action === "resolve") {
    process.exit(await resolveProfile(opts));
    return;
  }
  await listPlatform(opts);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});