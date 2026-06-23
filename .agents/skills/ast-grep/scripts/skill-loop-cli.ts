#!/usr/bin/env bun
/**
 * Unified skill loop — test, bench, network, snapshot, rate across agent skills.
 *
 *   bun scripts/skill-loop-cli.ts list
 *   bun scripts/skill-loop-cli.ts full --preset full --dry-run --explain
 *   bun run loop -- --dry-run --explain
 */

import { resolve } from "node:path";
import {
  captureLoopBaseline,
  diffLoopBaselines,
  formatLoopSummary,
  loadLoopBaseline,
  writeLoopBaseline,
} from "./scan/transpiler/skill-loop-baseline.ts";
import {
  formatBenchStatus,
  runBenchLoop,
} from "./scan/transpiler/bench-loop.ts";
import { formatColoredSkillLoopStatus } from "./scan/transpiler/loop-color.ts";
import {
  formatSkillLoopHerdrTab,
  formatSkillLoopJson,
} from "./scan/transpiler/skill-loop-herdr.ts";
import {
  formatCloseLoopStatus,
  runCloseLoop,
} from "./scan/transpiler/close-loop.ts";
import {
  formatSnapshotBenchStatus,
  runSnapshotBenchLoop,
} from "./scan/transpiler/snapshot-bench-loop.ts";
import {
  buildBenchPlan,
  buildCloseLoopPlan,
  buildFullPlan,
  buildMatrixPlan,
  buildRunPlan,
  buildSnapshotBenchPlan,
  formatLoopPlanJson,
  formatLoopPlanText,
  LOOP_CLI_FLAGS_HELP,
  type LoopPlanFlags,
} from "./scan/transpiler/skill-loop-plan.ts";
import {
  formatSkillLoopStatus,
  listLoopPresets,
  loadSkillLoopRegistry,
  listRegistrySkills,
  runSkillLoopMatrix,
  runSkillLoopOnce,
  runSkillLoopPreset,
  type SkillLoopPhase,
  type SkillLoopTick,
} from "./scan/transpiler/skill-loop.ts";
import {
  WorkflowLoop,
  type WorkflowEffects,
} from "./scan/transpiler/workflow-loop.ts";
import {
  defaultWorkflowReportPath,
  legacyEffectsToConfigs,
  mergeEffectConfigs,
  parseEffectFlags,
} from "./scan/transpiler/workflow-effects/config.ts";
import type { Severity } from "./scan/transpiler/types.ts";

const SKILL_ROOT = resolve(import.meta.dir, "..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

type Parsed = Record<string, string | boolean | number | string[]>;

function parseArgs(argv: string[]): Parsed {
  if (argv.includes("--help") || argv.includes("-h")) {
    return { action: "help" };
  }
  const out: Parsed = { action: argv[0] ?? "list" };
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--herdr-tab") out["herdr-tab"] = true;
    else if (a === "--no-color") out["no-color"] = true;
    else if (a === "--parallel") out.parallel = true;
    else if (a === "--dry-run" || a === "-n") out["dry-run"] = true;
    else if (a === "--explain") out.explain = true;
    else if (a === "--quiet" || a === "-q") out.quiet = true;
    else if (a === "--verbose" || a === "-v") out.verbose = true;
    else if (a === "--skip-preflight") out["skip-preflight"] = true;
    else if (a === "--smoke") out.smoke = true;
    else if (a === "--no-baseline") out["no-baseline"] = true;
    else if (a === "--fail-on-rating") out["fail-on-rating"] = true;
    else if (a === "--fail-on-drift") out["fail-on-drift"] = true;
    else if (a === "--baseline-write") out["baseline-write"] = true;
    else if (a.startsWith("--preset=")) out.preset = a.slice("--preset=".length);
    else if (a === "--preset" && argv[i + 1]) out.preset = argv[++i];
    else if (a.startsWith("--skill=")) out.skill = a.slice("--skill=".length);
    else if (a === "--skill" && argv[i + 1]) out.skill = argv[++i];
    else if (a.startsWith("--only=")) out.only = a.slice("--only=".length);
    else if (a === "--only" && argv[i + 1]) out.only = argv[++i];
    else if (a.startsWith("--phases=")) out.phases = a.slice("--phases=".length).split(",");
    else if (a === "--phases" && argv[i + 1]) out.phases = argv[++i].split(",");
    else if (a.startsWith("--profile=")) out.profile = a.slice("--profile=".length);
    else if (a === "--profile" && argv[i + 1]) out.profile = argv[++i];
    else if (a.startsWith("--iterations=")) out.iterations = Number(a.slice("--iterations=".length));
    else if (a === "--iterations" && argv[i + 1]) out.iterations = Number(argv[++i]);
    else if (a.startsWith("--min-rating=")) out["min-rating"] = Number(a.slice("--min-rating=".length));
    else if (a === "--min-rating" && argv[i + 1]) out["min-rating"] = Number(argv[++i]);
    else if (a.startsWith("--target-ms=")) out["target-ms"] = Number(a.slice("--target-ms=".length));
    else if (a === "--target-ms" && argv[i + 1]) out["target-ms"] = Number(argv[++i]);
    else if (a.startsWith("--domain=")) out.domain = a.slice("--domain=".length);
    else if (a === "--domain" && argv[i + 1]) out.domain = argv[++i];
    else if (a.startsWith("--scan-path=")) out["scan-path"] = a.slice("--scan-path=".length);
    else if (a === "--scan-path" && argv[i + 1]) out["scan-path"] = argv[++i];
    else if (a === "--ground-truth") out["ground-truth"] = true;
    else if (a === "--fail-on-network-drift") out["fail-on-network-drift"] = true;
    else if (a === "--seed") out.seed = true;
    else if (a === "--effect") out.effect = true;
    else if (a === "--fix") out.fix = true;
    else if (a === "--watch") out.watch = true;
    else if (a === "--report") {
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        out.report = next;
        i++;
      } else {
        out.report = true;
      }
    }
    else if (a.startsWith("--alert-url=")) out["alert-url"] = a.slice("--alert-url=".length);
    else if (a === "--alert-url" && argv[i + 1]) out["alert-url"] = argv[++i];
    else if (a.startsWith("--alert=")) out.alert = a.slice("--alert=".length);
    else if (a === "--alert" && argv[i + 1]) out.alert = argv[++i];
    else if (a.startsWith("--scanners=")) out.scanners = a.slice("--scanners=".length);
    else if (a === "--scanners" && argv[i + 1]) out.scanners = argv[++i];
    else if (a.startsWith("--interval=")) out.interval = Number(a.slice("--interval=".length));
    else if (a === "--interval" && argv[i + 1]) out.interval = Number(argv[++i]);
    else if (a.startsWith("--effects-dir=")) out["effects-dir"] = a.slice("--effects-dir=".length);
    else if (a === "--effects-dir" && argv[i + 1]) out["effects-dir"] = argv[++i];
    else if (a.startsWith("--effect=")) {
      const effects = (out.effect as string[] | undefined) ?? [];
      effects.push(a.slice("--effect=".length));
      out.effect = effects;
    }
    else if (a === "--effect" && argv[i + 1] && !argv[i + 1].startsWith("--")) {
      const effects = (out.effect as string[] | undefined) ?? [];
      effects.push(argv[++i]);
      out.effect = effects;
    }
    else if (!a.startsWith("-") && !out.skills) {
      const skills = (out.skills as string[] | undefined) ?? [];
      skills.push(a);
      out.skills = skills;
    }
  }
  if (out.action === "plan") out["dry-run"] = true;
  return out;
}

function loopFlags(opts: Parsed): LoopPlanFlags {
  return {
    dryRun: opts["dry-run"] === true,
    explain: opts.explain === true,
    quiet: opts.quiet === true,
    verbose: opts.verbose === true,
    skipPreflight: opts["skip-preflight"] === true,
    noBaseline: opts["no-baseline"] === true,
    smoke: opts.smoke === true,
    parallel: opts.parallel === true,
    failOnRating: opts["fail-on-rating"] === true,
    failOnDrift: opts["fail-on-drift"] === true,
    baselineWrite: opts["baseline-write"] === true,
    minRating: typeof opts["min-rating"] === "number" ? opts["min-rating"] : undefined,
    iterations: typeof opts.iterations === "number" ? opts.iterations : undefined,
    only: typeof opts.only === "string" ? opts.only : undefined,
  };
}

function parsePhases(raw: string | string[] | undefined): SkillLoopPhase[] {
  if (!raw) return ["test", "bench", "rate"];
  const text = Array.isArray(raw) ? raw.join(",") : raw;
  return text.split(",").map((p) => p.trim()).filter(Boolean) as SkillLoopPhase[];
}

function emitTick(tick: SkillLoopTick, opts: Parsed): void {
  if (opts.quiet === true || opts.json === true) return;
  if (opts["herdr-tab"] === true) {
    for (const line of formatSkillLoopHerdrTab(tick)) {
      process.stderr.write(`${line}\n`);
    }
    return;
  }
  if (opts["no-color"] === true) {
    process.stderr.write(`${formatSkillLoopStatus(tick)}\n`);
    return;
  }
  process.stderr.write(
    `${formatColoredSkillLoopStatus({
      skillId: tick.skillId,
      rating: tick.rating,
      grade: tick.grade,
      phases: tick.phases,
      reason: tick.detail,
    })}\n`,
  );
}

function phaseStart(opts: Parsed): (skillId: string, phase: SkillLoopPhase) => void {
  return (skillId, phase) => {
    if (opts.verbose === true && opts.quiet !== true) {
      process.stderr.write(`[loop] start ${skillId}.${phase}\n`);
    }
  };
}

function printPlan(plan: Awaited<ReturnType<typeof buildFullPlan>>, opts: Parsed): void {
  if (opts.json === true) {
    console.log(formatLoopPlanJson(plan));
  } else {
    console.log(formatLoopPlanText(plan));
  }
}

function tickFailed(tick: SkillLoopTick, minRating: number, failOnRating: boolean): boolean {
  if (failOnRating && tick.rating < minRating) return true;
  return !tick.phases.every((p) => p.ok);
}

async function cmdHelp(): Promise<number> {
  console.log(LOOP_CLI_FLAGS_HELP);
  console.log("\nactions: list | plan | full | run | matrix | bench | bench-snapshot | close-loop | workflow");
  console.log("run: bun run loop -- --dry-run --explain");
  return 0;
}

async function cmdList(opts: Parsed): Promise<number> {
  const registry = await loadSkillLoopRegistry(SKILL_ROOT);
  if (opts.json === true) {
    console.log(JSON.stringify(registry, null, 2));
    return 0;
  }
  console.log(`skill-loop registry v${registry.version}: ${listRegistrySkills(registry).length} skills`);
  for (const id of listLoopPresets(registry)) {
    const p = registry.presets![id];
    console.log(`  preset ${id.padEnd(12)} ${p.description ?? ""}`);
  }
  console.log("");
  for (const id of listRegistrySkills(registry)) {
    const entry = registry.skills[id];
    const enabled = Object.entries(entry.phases)
      .filter(([, spec]) => spec?.enabled !== false)
      .map(([phase]) => phase);
    console.log(`  ${id.padEnd(28)} ${entry.path}`);
    console.log(`    phases: ${enabled.join(", ")}`);
  }
  console.log("\nrun: bun run loop -- --dry-run --explain");
  console.log("help: bun scripts/skill-loop-cli.ts help");
  return 0;
}

async function cmdRun(opts: Parsed): Promise<number> {
  const flags = loopFlags(opts);
  const skillId = String(opts.skill ?? "ast-grep");
  const phases = parsePhases(opts.phases as string | string[] | undefined);
  const minRating = flags.minRating ?? 70;

  if (flags.dryRun) {
    printPlan(await buildRunPlan({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      skillId,
      phases,
      flags,
    }), opts);
    return 0;
  }

  const tick = await runSkillLoopOnce({
    skillRoot: SKILL_ROOT,
    repoRoot: REPO_ROOT,
    skillId,
    phases,
    iterations: flags.iterations,
    skipPreflight: flags.skipPreflight,
    smoke: flags.smoke,
    onTick: (t) => emitTick(t, opts),
    onPhaseStart: phaseStart(opts),
  });

  if (opts.json === true) console.log(formatSkillLoopJson(tick));
  else if (opts.quiet === true) process.stderr.write(`${formatSkillLoopStatus(tick)}\n`);
  return tickFailed(tick, minRating, flags.failOnRating === true) ? 1 : 0;
}

async function cmdMatrix(opts: Parsed): Promise<number> {
  const flags = loopFlags(opts);
  const phases = parsePhases(opts.phases as string | string[] | undefined);
  const skillIds = opts.skills as string[] | undefined;
  const minRating = flags.minRating ?? 50;

  if (flags.dryRun) {
    printPlan(await buildMatrixPlan({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      phases,
      skillIds,
      flags,
    }), opts);
    return 0;
  }

  const ticks = await runSkillLoopMatrix({
    skillRoot: SKILL_ROOT,
    repoRoot: REPO_ROOT,
    skillIds,
    phases,
    parallel: flags.parallel,
    only: flags.only,
    iterations: flags.iterations,
    skipPreflight: flags.skipPreflight,
    smoke: flags.smoke,
    onTick: (t) => emitTick(t, opts),
    onPhaseStart: phaseStart(opts),
  });

  if (opts.json === true) {
    console.log(JSON.stringify({ skills: ticks }, null, 2));
  } else {
    process.stderr.write(`\n${formatLoopSummary(ticks)}\n`);
  }

  for (const t of ticks) {
    if (tickFailed(t, minRating, flags.failOnRating === true)) return 1;
  }
  return 0;
}

async function cmdFull(opts: Parsed): Promise<number> {
  const presetName = String(opts.preset ?? "full");
  const flags = loopFlags(opts);
  const registry = await loadSkillLoopRegistry(SKILL_ROOT);
  const resolved = registry.presets?.[presetName];
  const minRating = flags.minRating ?? resolved?.failOnRating ?? 70;

  if (flags.dryRun) {
    printPlan(await buildFullPlan({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      presetName,
      flags,
    }), opts);
    return 0;
  }

  const baselinePath = resolve(SKILL_ROOT, "baselines/loop/skill-loop-baseline.json");
  const previous = await loadLoopBaseline(baselinePath);

  const result = await runSkillLoopPreset({
    skillRoot: SKILL_ROOT,
    repoRoot: REPO_ROOT,
    presetName,
    iterations: flags.iterations,
    skipPreflight: flags.skipPreflight,
    smoke: flags.smoke,
    only: flags.only,
    noBaseline: flags.noBaseline,
    onTick: (t) => emitTick(t, opts),
    onPhaseStart: phaseStart(opts),
  });

  if (opts.json === true) {
    console.log(JSON.stringify({
      preset: result.preset.name,
      matrix: result.matrix,
      run: result.run,
      all: result.all,
    }, null, 2));
  } else {
    process.stderr.write(`\n${formatLoopSummary(result.all)}\n`);
    process.stderr.write(`preset=${result.preset.name} (${result.preset.preset.description ?? ""})\n`);
  }

  if (previous) {
    const current = captureLoopBaseline(result.all);
    const deltas = diffLoopBaselines(current, previous);
    const drifted = deltas.filter((d) => d.drift);
    for (const d of drifted) {
      process.stderr.write(
        `[loop] Δ ${d.skillId} rating ${d.rating_delta >= 0 ? "+" : ""}${d.rating_delta}`
        + ` (${d.grade_before}→${d.grade_after}) phases=${d.phases_changed.join(",") || "none"}\n`,
      );
    }
    if (flags.failOnDrift && drifted.length) return 1;
  }

  const writeBaseline = !flags.noBaseline
    && (flags.baselineWrite || resolved?.baselineWrite);
  if (writeBaseline) {
    const path = await writeLoopBaseline(SKILL_ROOT, result.all, baselinePath);
    process.stderr.write(`[loop] baseline written ${path}\n`);
  }

  for (const t of result.all) {
    if (tickFailed(t, minRating, flags.failOnRating || resolved?.failOnRating !== undefined)) {
      return 1;
    }
  }
  return 0;
}

async function cmdCloseLoop(opts: Parsed): Promise<number> {
  const domain = String(opts.domain ?? "sports-terminal-os");
  const iterations = typeof opts.iterations === "number" ? opts.iterations : 3;
  const targetMs = typeof opts["target-ms"] === "number" ? opts["target-ms"] : 1500;
  const flags = loopFlags(opts);
  const scanPath = typeof opts["scan-path"] === "string" ? opts["scan-path"] : undefined;
  const groundTruth = opts["ground-truth"] === true || Boolean(scanPath);
  const closeLoopOpts = {
    skillRoot: SKILL_ROOT,
    repo: REPO_ROOT,
    domain,
    scanPath,
    iterations,
    seed: opts.seed === true,
    baselineWrite: flags.baselineWrite,
    failOnDrift: flags.failOnDrift,
    ratingDriftTolerance: flags.failOnDrift ? 0 : 15,
    benchSnapshot: {
      domain,
      scanPath,
      groundTruth,
      iterations,
      targetMs,
      failOnNetworkDrift: opts["fail-on-network-drift"] === true,
    },
  };
  const gateOpts = {
    minRating: flags.minRating ?? 70,
    failOnRating: flags.failOnRating,
  };

  if (opts.effect === true && !flags.dryRun) {
    const { Effect } = await import("effect");
    const { closeLoopProgram } = await import("./scan/transpiler/effect/close-loop-program.ts");
    const { CloseLoopLive } = await import("./scan/transpiler/effect/close-loop-service.ts");
    const { runCliExit } = await import("./scan/transpiler/effect/cli-runtime.ts");
    const { decodeCloseLoopSummary } = await import("./scan/transpiler/effect/schema.ts");

    const program = closeLoopProgram(closeLoopOpts, gateOpts).pipe(
      Effect.tap((summary) => Effect.sync(() => {
        if (opts.json === true) {
          decodeCloseLoopSummary(summary);
          console.log(JSON.stringify(summary, null, 2));
        } else if (opts.quiet !== true) {
          for (const s of summary.steps) {
            process.stderr.write(
              `[loop] close-loop step=${s.id} ok=${s.ok} elapsed=${s.elapsedMs}ms`
              + (s.detail ? ` ${s.detail}` : "")
              + "\n",
            );
          }
          process.stderr.write(`${formatCloseLoopStatus(summary, { verbose: flags.verbose })}\n`);
        }
      })),
      Effect.provide(CloseLoopLive),
    );

    return runCliExit(program, { quiet: opts.quiet === true });
  }

  if (flags.dryRun) {
    printPlan(await buildCloseLoopPlan({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      domain,
      scanPath,
      iterations,
      targetMs,
      groundTruth,
      seed: opts.seed === true,
      baselineWrite: flags.baselineWrite,
      failOnDrift: flags.failOnDrift,
      flags,
    }), opts);
    return 0;
  }

  const summary = await runCloseLoop({
    ...closeLoopOpts,
    onStep: (s) => {
      if (opts.quiet === true) return;
      process.stderr.write(
        `[loop] close-loop step=${s.id} ok=${s.ok} elapsed=${s.elapsedMs}ms`
        + (s.detail ? ` ${s.detail}` : "")
        + "\n",
      );
    },
  });

  if (opts.json === true) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    process.stderr.write(`${formatCloseLoopStatus(summary, { verbose: flags.verbose })}\n`);
    if (summary.drift?.length && flags.verbose) {
      for (const d of summary.drift.filter((x) => x.drift)) {
        process.stderr.write(
          `[loop] Δ ${d.skillId} rating ${d.rating_delta >= 0 ? "+" : ""}${d.rating_delta}`
          + ` (${d.grade_before}→${d.grade_after}) phases=${d.phases_changed.join(",") || "none"}\n`,
        );
      }
    }
  }

  if (gateOpts.failOnRating && (summary.rating ?? 0) < (gateOpts.minRating ?? 70)) return 1;
  if (!summary.ok) return 1;
  return 0;
}

async function cmdBenchSnapshot(opts: Parsed): Promise<number> {
  const domain = String(opts.domain ?? "sports-terminal-os");
  const iterations = typeof opts.iterations === "number" ? opts.iterations : 3;
  const targetMs = typeof opts["target-ms"] === "number" ? opts["target-ms"] : 1500;
  const flags = loopFlags(opts);
  const scanPath = typeof opts["scan-path"] === "string" ? opts["scan-path"] : undefined;
  const groundTruth = opts["ground-truth"] === true || Boolean(scanPath);
  const failOnNetworkDrift = opts["fail-on-network-drift"] === true;

  if (flags.dryRun) {
    printPlan(await buildSnapshotBenchPlan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      domain,
      scanPath,
      iterations,
      targetMs,
      groundTruth,
      failOnNetworkDrift,
      flags,
    }), opts);
    return 0;
  }

  const summary = await runSnapshotBenchLoop({
    skillRoot: SKILL_ROOT,
    repo: REPO_ROOT,
    domain,
    scanPath,
    iterations,
    targetMs,
    groundTruth,
    failOnNetworkDrift,
    onRun: (r) => {
      if (opts.quiet === true) return;
      let line = `[loop] bench-snapshot iter=${r.iteration} ok=${r.ok} elapsed=${r.elapsedMs}ms`
        + ` snapshot=${r.snapshotOk}`
        + (r.groundTruthOk !== undefined ? ` ground-truth=${r.groundTruthOk}` : "")
        + (r.detail ? ` ${r.detail}` : "");
      if (opts.verbose === true && r.phases) {
        const p = r.phases;
        const bits = [`load=${p.loadMs}ms`, `validate=${p.validateMs}ms`];
        if (p.networkMs !== undefined) bits.push(`network=${p.networkMs}ms`);
        if (p.groundTruthMs !== undefined) bits.push(`ground-truth=${p.groundTruthMs}ms`);
        line += ` phases={${bits.join(" ")}}`;
      }
      process.stderr.write(`${line}\n`);
    },
  });

  if (opts.json === true) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    process.stderr.write(`${formatSnapshotBenchStatus(summary, { verbose: flags.verbose })}\n`);
  }

  const minRating = flags.minRating ?? 70;
  if (flags.failOnRating && summary.rating < minRating) return 1;
  if (summary.passRate < 1) return 1;
  return 0;
}

async function cmdWorkflow(opts: Parsed): Promise<number> {
  const domain = String(opts.domain ?? "sports-terminal-os");
  const scanPath = typeof opts["scan-path"] === "string" ? opts["scan-path"] : undefined;
  const flags = loopFlags(opts);

  const legacyEffects: WorkflowEffects = {
    log: opts.quiet !== true,
    alert: typeof opts["alert-url"] === "string"
      ? opts["alert-url"]
      : typeof opts.alert === "string" ? opts.alert : undefined,
    fix: opts.fix === true,
    report: opts.report === true
      ? defaultWorkflowReportPath(SKILL_ROOT, domain)
      : typeof opts.report === "string" ? opts.report : undefined,
  };
  const effectsConfig = mergeEffectConfigs(
    legacyEffectsToConfigs(legacyEffects, SKILL_ROOT, domain),
    parseEffectFlags(Array.isArray(opts.effect) ? opts.effect : []),
  );

  if (flags.dryRun) {
    const loop = new WorkflowLoop({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      domain: { id: domain, scanPath },
      effectsConfig,
      effectsDir: typeof opts["effects-dir"] === "string" ? opts["effects-dir"] : undefined,
    });
    const custom = loop.registry.list().map((p) => p.id);
    if (typeof opts["effects-dir"] === "string") {
      await loop.loadCustomEffects(opts["effects-dir"]);
    }
    console.log(JSON.stringify({
      action: "workflow",
      domain,
      scanPath,
      watch: opts.watch === true,
      effectsConfig,
      effectsDir: opts["effects-dir"],
      registeredEffects: loop.registry.list().map((p) => p.id),
      customLoaded: loop.registry.list().length - custom.length,
    }, null, 2));
    return 0;
  }

  const loop = new WorkflowLoop({
    skillRoot: SKILL_ROOT,
    repo: REPO_ROOT,
    domain: { id: domain, scanPath },
    scanners: typeof opts.scanners === "string"
      ? opts.scanners.split(",").map((s) => s.trim()).filter(Boolean)
      : undefined,
    intervalMs: typeof opts.interval === "number" ? opts.interval : 60_000,
    watch: opts.watch === true,
    dryRun: flags.dryRun,
    output: opts["herdr-tab"] === true ? "herdr" : opts.json === true ? "json" : "table",
    failOnSeverity: "error" as Severity,
    failOnIssue: flags.failOnDrift,
    failOnDrift: flags.failOnDrift,
    seedPath: opts.seed === true
      ? resolve(SKILL_ROOT, "baselines", domain, "network-baseline.json5")
      : undefined,
    effects: legacyEffects,
    effectsConfig,
    effectsDir: typeof opts["effects-dir"] === "string" ? opts["effects-dir"] : undefined,
  });

  await loop.runAll();
  return 0;
}

async function cmdBench(opts: Parsed): Promise<number> {
  const profile = String(opts.profile ?? "unit");
  const iterations = typeof opts.iterations === "number" ? opts.iterations : 3;
  const targetMs = typeof opts["target-ms"] === "number" ? opts["target-ms"] : 8000;
  const flags = loopFlags(opts);

  if (flags.dryRun) {
    printPlan(await buildBenchPlan({
      skillRoot: SKILL_ROOT,
      repoRoot: REPO_ROOT,
      profile,
      iterations,
      flags,
    }), opts);
    return 0;
  }

  const summary = await runBenchLoop({
    skillRoot: SKILL_ROOT,
    repoRoot: REPO_ROOT,
    profile,
    iterations,
    targetMs,
    skipPreflight: flags.skipPreflight,
    onRun: (r) => {
      if (opts.quiet === true) return;
      const line = `[loop] bench iter=${r.iteration} ok=${r.ok} elapsed=${r.elapsedMs}ms pass=${r.pass} fail=${r.fail}`;
      process.stderr.write(`${line}\n`);
    },
  });

  if (opts.json === true) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    process.stderr.write(`${formatBenchStatus(summary)}\n`);
  }

  const minRating = flags.minRating ?? 70;
  if (flags.failOnRating && summary.rating < minRating) return 1;
  if (summary.passRate < 1) return 1;
  return 0;
}

async function main(): Promise<void> {
  const opts = parseArgs(process.argv.slice(2));
  const action = String(opts.action);

  let code = 0;
  switch (action) {
    case "help":
      code = await cmdHelp();
      break;
    case "list":
      code = await cmdList(opts);
      break;
    case "plan":
    case "run":
      code = await cmdRun(opts);
      break;
    case "matrix":
      code = await cmdMatrix(opts);
      break;
    case "full":
      code = await cmdFull(opts);
      break;
    case "bench":
      code = await cmdBench(opts);
      break;
    case "bench-snapshot":
      code = await cmdBenchSnapshot(opts);
      break;
    case "close-loop":
      code = await cmdCloseLoop(opts);
      break;
    case "workflow":
      code = await cmdWorkflow(opts);
      break;
    default:
      console.error(`unknown action: ${action} — use help | list | plan | full | run | matrix | bench | workflow`);
      code = 1;
  }
  process.exit(code);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});