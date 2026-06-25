#!/usr/bin/env bun
/**
 * Workflow loop CLI — continuous scan + drift + effect plugin handlers.
 *
 *   bun scripts/workflow-cli.ts start --domain sports-terminal-os --scan-path dist/frontend
 *   bun scripts/workflow-cli.ts start --effect alert.url=https://hooks.slack.com/...
 *   bun scripts/workflow-cli.ts start --effects-dir ./effects --effect custom
 */

import { resolve } from "node:path";
import {
  WorkflowLoop,
  type WorkflowEffects,
  type WorkflowOptions,
} from "./scan/transpiler/workflow-loop.ts";
import {
  defaultWorkflowReportPath,
  legacyEffectsToConfigs,
  mergeEffectConfigs,
  parseEffectFlags,
} from "./scan/transpiler/workflow-effects/config.ts";
import {
  captureBunRuntime,
  defaultWorkflowRuntimeSeedPath,
} from "./scan/transpiler/workflow-effects/runtime.ts";
import type { Severity } from "./scan/transpiler/types.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

type Parsed = Record<string, string | boolean | number | string[] | undefined>;

function printHelp(): void {
  console.log(`workflow — continuous security workflow with pluggable effect handlers

Usage:
  bun scripts/workflow-cli.ts start [options]

Options:
  --domain <id>           Domain id (required)
  --scan-path <path>      Scan target path (relative to repo root)
  --scanners <list>       Comma-separated scanners: semver,network (default)
  --interval <ms>         Watch interval (default 60000)
  --output <fmt>          table | json | herdr (default table)
  --fail-on-severity <s>  Minimum severity to fail (default error)
  --seed <path>           Seed baseline path (json5)
  --seed-write <path>     Write baseline after each run
  --effects-dir <dir>     Load custom effect plugins from directory (*.ts)
  --effect <spec>         Configure effect (repeatable):
                            alert.url=https://hooks.slack.com/...
                            log.enabled=false
                            fix
                            report.path=reports/latest.md
  --alert-url <url>       Legacy: enable alert effect with URL
  --alert <url>           Alias for --alert-url
  --fix                   Legacy: enable fix effect
  --report [path]         Legacy: enable report effect
  --log / --no-log        Legacy: toggle log effect (default on)
  --watch                 Continuous watch loop
  --dry-run               Explain actions without applying fixes
  --fail-on-issue         Exit 1 when issues exceed fail-on-severity
  --fail-on-drift         Exit 1 on baseline drift
  --tls-ca <path>         CA bundle for alert webhook TLS
  --tls-cert <path>       Client certificate for alert webhook TLS
  --tls-key <path>        Client private key for alert webhook TLS
  --tls-reject-unauthorized <bool>  Reject invalid TLS certs (default true)
  --bun-seed-write [path] Capture Bun runtime baseline (workflow-runtime.json)
  --no-include-bun-version  Omit Bun metadata from alerts/reports/logs
  -h, --help              Show help

Examples:
  bun scripts/workflow-cli.ts start --domain sports-terminal-os \\
    --scan-path projects/active/sports-terminal-os/dist/frontend \\
    --effect alert.url=https://hooks.slack.com/... --effect fix

  bun scripts/workflow-cli.ts start --domain sports-terminal-os \\
    --effects-dir .agents/skills/ast-grep/effects --effect custom
`);
}

function parseArgs(argv: string[]): Parsed {
  const out: Parsed = { action: argv[0] ?? "help", effect: [] };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--help" || a === "-h") return { action: "help" };
    if (a === "--watch") out.watch = true;
    else if (a === "--dry-run" || a === "-n") out["dry-run"] = true;
    else if (a === "--fail-on-issue") out["fail-on-issue"] = true;
    else if (a === "--fail-on-drift") out["fail-on-drift"] = true;
    else if (a === "--no-color") out["no-color"] = true;
    else if (a === "--fix") out.fix = true;
    else if (a === "--log") out.log = true;
    else if (a === "--no-log") out.log = false;
    else if (a === "--report") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out.report = next;
        i++;
      } else {
        out.report = true;
      }
    }
    else if (a.startsWith("--effect=")) {
      (out.effect as string[]).push(a.slice("--effect=".length));
    }
    else if (a === "--effect" && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      (out.effect as string[]).push(argv[++i]);
    }
    else if (a.startsWith("--domain=")) out.domain = a.slice("--domain=".length);
    else if (a === "--domain" && argv[i + 1]) out.domain = argv[++i];
    else if (a.startsWith("--scan-path=")) out["scan-path"] = a.slice("--scan-path=".length);
    else if (a === "--scan-path" && argv[i + 1]) out["scan-path"] = argv[++i];
    else if (a.startsWith("--scanners=")) out.scanners = a.slice("--scanners=".length);
    else if (a === "--scanners" && argv[i + 1]) out.scanners = argv[++i];
    else if (a.startsWith("--interval=")) out.interval = Number(a.slice("--interval=".length));
    else if (a === "--interval" && argv[i + 1]) out.interval = Number(argv[++i]);
    else if (a.startsWith("--output=")) out.output = a.slice("--output=".length);
    else if (a === "--output" && argv[i + 1]) out.output = argv[++i];
    else if (a.startsWith("--fail-on-severity=")) out["fail-on-severity"] = a.slice("--fail-on-severity=".length);
    else if (a === "--fail-on-severity" && argv[i + 1]) out["fail-on-severity"] = argv[++i];
    else if (a.startsWith("--seed=")) out.seed = a.slice("--seed=".length);
    else if (a === "--seed") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out.seed = next;
        i++;
      } else {
        out.seed = true;
      }
    }
    else if (a.startsWith("--seed-write=")) out["seed-write"] = a.slice("--seed-write=".length);
    else if (a === "--seed-write" && argv[i + 1]) out["seed-write"] = argv[++i];
    else if (a.startsWith("--effects-dir=")) out["effects-dir"] = a.slice("--effects-dir=".length);
    else if (a === "--effects-dir" && argv[i + 1]) out["effects-dir"] = argv[++i];
    else if (a.startsWith("--alert-url=")) out["alert-url"] = a.slice("--alert-url=".length);
    else if (a === "--alert-url" && argv[i + 1]) out["alert-url"] = argv[++i];
    else if (a.startsWith("--alert=")) out.alert = a.slice("--alert=".length);
    else if (a === "--alert" && argv[i + 1]) out.alert = argv[++i];
    else if (a.startsWith("--tls-ca=")) out["tls-ca"] = a.slice("--tls-ca=".length);
    else if (a === "--tls-ca" && argv[i + 1]) out["tls-ca"] = argv[++i];
    else if (a.startsWith("--tls-cert=")) out["tls-cert"] = a.slice("--tls-cert=".length);
    else if (a === "--tls-cert" && argv[i + 1]) out["tls-cert"] = argv[++i];
    else if (a.startsWith("--tls-key=")) out["tls-key"] = a.slice("--tls-key=".length);
    else if (a === "--tls-key" && argv[i + 1]) out["tls-key"] = argv[++i];
    else if (a.startsWith("--tls-reject-unauthorized=")) {
      out["tls-reject-unauthorized"] = a.slice("--tls-reject-unauthorized=".length) === "true";
    }
    else if (a === "--tls-reject-unauthorized" && argv[i + 1]) {
      out["tls-reject-unauthorized"] = argv[++i] === "true";
    }
    else if (a === "--no-include-bun-version") out["include-bun-version"] = false;
    else if (a === "--bun-seed-write") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out["bun-seed-write"] = next;
        i++;
      } else {
        out["bun-seed-write"] = true;
      }
    }
    else if (a.startsWith("--bun-seed-write=")) out["bun-seed-write"] = a.slice("--bun-seed-write=".length);
  }
  return out;
}

function buildWorkflowOptions(opts: Parsed): WorkflowOptions {
  const domainId = String(opts.domain ?? "sports-terminal-os");
  const scanPath = typeof opts["scan-path"] === "string" ? opts["scan-path"] : undefined;

  const legacyEffects: WorkflowEffects = {
    log: opts.log !== false,
    alert: typeof opts["alert-url"] === "string"
      ? opts["alert-url"]
      : typeof opts.alert === "string"
        ? opts.alert
        : undefined,
    fix: opts.fix === true,
    report: opts.report === true
      ? defaultWorkflowReportPath(SKILL_ROOT, domainId)
      : typeof opts.report === "string"
        ? opts.report
        : undefined,
  };

  const effectFlags = Array.isArray(opts.effect) ? opts.effect : [];
  const effectsConfig = mergeEffectConfigs(
    legacyEffectsToConfigs(legacyEffects, SKILL_ROOT, domainId),
    parseEffectFlags(effectFlags),
  );

  let seedPath: string | undefined;
  if (typeof opts.seed === "string") {
    seedPath = resolve(REPO_ROOT, opts.seed);
  } else if (opts.seed === true) {
    seedPath = resolve(SKILL_ROOT, "baselines", domainId, "network-baseline.json5");
  }

  let seedWritePath: string | undefined;
  if (typeof opts["seed-write"] === "string") {
    seedWritePath = resolve(REPO_ROOT, opts["seed-write"]);
  } else if (opts["seed-write"] === true) {
    seedWritePath = resolve(SKILL_ROOT, "baselines", domainId, "network-baseline.json5");
  }

  let effectsDir: string | undefined;
  if (typeof opts["effects-dir"] === "string") {
    effectsDir = opts["effects-dir"];
  }

  const tlsPaths = (opts["tls-ca"] || opts["tls-cert"] || opts["tls-key"] || opts["tls-reject-unauthorized"] !== undefined)
    ? {
        ca: typeof opts["tls-ca"] === "string" ? opts["tls-ca"] : undefined,
        cert: typeof opts["tls-cert"] === "string" ? opts["tls-cert"] : undefined,
        key: typeof opts["tls-key"] === "string" ? opts["tls-key"] : undefined,
        rejectUnauthorized: typeof opts["tls-reject-unauthorized"] === "boolean"
          ? opts["tls-reject-unauthorized"]
          : undefined,
      }
    : undefined;

  let bunSeedWritePath: string | undefined;
  if (typeof opts["bun-seed-write"] === "string") {
    bunSeedWritePath = resolve(REPO_ROOT, opts["bun-seed-write"]);
  } else if (opts["bun-seed-write"] === true) {
    bunSeedWritePath = defaultWorkflowRuntimeSeedPath(SKILL_ROOT, domainId);
  }

  return {
    skillRoot: SKILL_ROOT,
    repo: REPO_ROOT,
    domain: { id: domainId, scanPath },
    scanners: typeof opts.scanners === "string"
      ? opts.scanners.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    intervalMs: typeof opts.interval === "number" ? opts.interval : 60_000,
    watch: opts.watch === true,
    dryRun: opts["dry-run"] === true,
    output: (typeof opts.output === "string" ? opts.output : "table") as WorkflowOptions["output"],
    failOnSeverity: (typeof opts["fail-on-severity"] === "string"
      ? opts["fail-on-severity"]
      : "error") as Severity,
    failOnIssue: opts["fail-on-issue"] === true,
    failOnDrift: opts["fail-on-drift"] === true,
    seedPath,
    seedWritePath,
    effects: legacyEffects,
    effectsConfig,
    effectsDir,
    tlsPaths,
    includeBunVersion: opts["include-bun-version"] !== false,
    bunSeedWritePath,
  };
}

async function cmdStart(opts: Parsed): Promise<number> {
  if (!opts.domain) {
    console.error("error: --domain is required");
    return 1;
  }

  const wf = buildWorkflowOptions(opts);

  if (opts["dry-run"] === true) {
    const loop = new WorkflowLoop(wf);
    let customCount = 0;
    if (wf.effectsDir) {
      customCount = await loop.loadCustomEffects(wf.effectsDir);
    }
    console.log(JSON.stringify({
      dry_run: true,
      domain: wf.domain,
      scanners: wf.scanners,
      watch: wf.watch,
      intervalMs: wf.intervalMs,
      effectsConfig: wf.effectsConfig,
      effectsDir: wf.effectsDir,
      customEffectsLoaded: customCount,
      registeredEffects: loop.registry.list().map((p) => p.id),
      seedPath: wf.seedPath,
      seedWritePath: wf.seedWritePath,
      tlsPaths: wf.tlsPaths,
      includeBunVersion: wf.includeBunVersion,
      bun: captureBunRuntime(),
      bunSeedWritePath: wf.bunSeedWritePath,
    }, null, 2));
    return 0;
  }

  const loop = new WorkflowLoop(wf);
  await loop.runAll();
  return 0;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  let code = 0;
  switch (opts.action) {
    case "help":
      printHelp();
      break;
    case "start":
      code = await cmdStart(opts);
      break;
    default:
      console.error(`unknown action: ${opts.action} — use: start | help`);
      code = 1;
  }
  process.exit(code);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});