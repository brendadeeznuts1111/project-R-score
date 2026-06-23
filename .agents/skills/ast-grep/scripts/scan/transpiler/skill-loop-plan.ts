import { join, resolve } from "node:path";
import { assembleTestCommand, loadTestProfiles } from "./test-runner.ts";
import { defaultLoopBaselinePath } from "./skill-loop-baseline.ts";
import { defaultSnapshotPath } from "./snapshot-network.ts";
import {
  filterSkillsByOnly,
  listRegistrySkills,
  loadSkillLoopRegistry,
  resolveBenchSnapshotPreset,
  resolveCloseLoopPreset,
  resolveLoopPreset,
  resolveSkillPhases,
  type LoopPreset,
  type SkillLoopPhase,
  type SkillRegistryEntry,
} from "./skill-loop.ts";

export { filterSkillsByOnly };

export type LoopPlanFlags = {
  dryRun?: boolean;
  explain?: boolean;
  quiet?: boolean;
  verbose?: boolean;
  skipPreflight?: boolean;
  noBaseline?: boolean;
  smoke?: boolean;
  parallel?: boolean;
  failOnRating?: boolean;
  failOnDrift?: boolean;
  baselineWrite?: boolean;
  minRating?: number;
  iterations?: number;
  only?: string;
};

export type LoopPlanStep = {
  skillId: string;
  phase: SkillLoopPhase;
  profile?: string;
  iterations?: number;
  detail: string;
  command?: string[];
  cwd?: string;
  preflight?: string[];
  /** Per-iteration pipeline (bench-snapshot --explain). */
  substeps?: string[];
};

export type LoopPlan = {
  action: string;
  preset?: string;
  description?: string;
  flags: LoopPlanFlags;
  matrixSkills: string[];
  steps: LoopPlanStep[];
  gates: string[];
  artifacts: string[];
  estimatedCommands: number;
};

async function planPhaseStep(
  skillRoot: string,
  repoRoot: string,
  skillId: string,
  entry: SkillRegistryEntry,
  phase: SkillLoopPhase,
  opts: {
    skipPreflight?: boolean;
    smoke?: boolean;
    iterations?: number;
  },
): Promise<LoopPlanStep | null> {
  const spec = entry.phases[phase] ?? {};
  if (spec.enabled === false) return null;

  switch (phase) {
    case "doctor": {
      const bits = [`check SKILL.md @ ${entry.path}`];
      if (opts.smoke || spec.smoke) bits.push("run scripts/smoke.sh (heavy)");
      return { skillId, phase, detail: bits.join("; ") };
    }
    case "test": {
      const profile = spec.profile ?? "ci";
      const { profiles } = await loadTestProfiles(skillRoot);
      const assembled = assembleTestCommand(profiles, {
        skillRoot,
        repoRoot,
        profile,
      });
      return {
        skillId,
        phase,
        profile,
        detail: `bun test profile=${profile}`,
        command: assembled.command,
        cwd: assembled.cwd,
        preflight: assembled.preflight && !opts.skipPreflight
          ? assembled.preflight.command
          : undefined,
      };
    }
    case "bench": {
      const profile = spec.profile ?? "unit";
      const iters = opts.iterations ?? spec.iterations ?? 3;
      const { profiles } = await loadTestProfiles(skillRoot);
      const assembled = assembleTestCommand(profiles, {
        skillRoot,
        repoRoot,
        profile,
      });
      return {
        skillId,
        phase,
        profile,
        iterations: iters,
        detail: `bench ×${iters} profile=${profile} targetMs=${spec.targetMs ?? "default"}`,
        command: assembled.command,
        cwd: assembled.cwd,
      };
    }
    case "network": {
      const scanPath = spec.scanPath ?? entry.workspace ?? entry.path;
      return {
        skillId,
        phase,
        profile: spec.profile ?? "supply-chain-network-dist",
        detail: `bundle scan path=${scanPath} health=${spec.healthUrl ?? "none"}`,
      };
    }
    case "snapshot": {
      const domain = spec.domain ?? skillId;
      const path = defaultSnapshotPath(skillRoot, domain);
      return {
        skillId,
        phase,
        detail: `validate snapshot domain=${domain}`,
        command: ["bun", join(skillRoot, "scripts/snapshot-cli.ts"), "validate", path],
        cwd: repoRoot,
      };
    }
    case "rate":
      return { skillId, phase, detail: "compute overall rating from prior phases" };
    default:
      return null;
  }
}

async function planSkill(
  skillRoot: string,
  repoRoot: string,
  skillId: string,
  entry: SkillRegistryEntry,
  phases: SkillLoopPhase[],
  opts: {
    skipPreflight?: boolean;
    smoke?: boolean;
    iterations?: number;
  },
): Promise<LoopPlanStep[]> {
  const resolved = resolveSkillPhases(entry, phases);
  const steps: LoopPlanStep[] = [];
  for (const phase of resolved) {
    const step = await planPhaseStep(skillRoot, repoRoot, skillId, entry, phase, opts);
    if (step) steps.push(step);
  }
  return steps;
}

function collectGates(flags: LoopPlanFlags, preset?: LoopPreset): string[] {
  const gates: string[] = [];
  const min = flags.minRating ?? preset?.failOnRating;
  if (flags.failOnRating && min !== undefined) gates.push(`fail-on-rating < ${min}`);
  if (flags.failOnDrift) gates.push("fail-on-drift vs baseline");
  if (preset?.failOnRating !== undefined && !flags.failOnRating) {
    gates.push(`preset failOnRating=${preset.failOnRating}`);
  }
  return gates;
}

export async function buildRunPlan(input: {
  skillRoot: string;
  repoRoot: string;
  skillId: string;
  phases: SkillLoopPhase[];
  flags: LoopPlanFlags;
}): Promise<LoopPlan> {
  const registry = await loadSkillLoopRegistry(input.skillRoot);
  const entry = registry.skills[input.skillId];
  if (!entry) throw new Error(`unknown skill '${input.skillId}'`);
  const steps = await planSkill(
    input.skillRoot,
    input.repoRoot,
    input.skillId,
    entry,
    input.phases,
    input.flags,
  );
  return {
    action: "run",
    flags: input.flags,
    matrixSkills: [],
    steps,
    gates: collectGates(input.flags),
    artifacts: [],
    estimatedCommands: steps.filter((s) => s.command).length
      + steps.filter((s) => s.preflight).length
      + (steps.find((s) => s.phase === "bench")?.iterations ?? 0),
  };
}

export async function buildMatrixPlan(input: {
  skillRoot: string;
  repoRoot: string;
  phases: SkillLoopPhase[];
  skillIds?: string[];
  flags: LoopPlanFlags;
}): Promise<LoopPlan> {
  const registry = await loadSkillLoopRegistry(input.skillRoot);
  let ids = input.skillIds?.length ? input.skillIds : listRegistrySkills(registry);
  ids = filterSkillsByOnly(ids, input.flags.only);
  const steps: LoopPlanStep[] = [];
  for (const skillId of ids) {
    const entry = registry.skills[skillId];
    if (!entry) continue;
    steps.push(...await planSkill(
      input.skillRoot,
      input.repoRoot,
      skillId,
      entry,
      input.phases,
      input.flags,
    ));
  }
  return {
    action: "matrix",
    flags: input.flags,
    matrixSkills: ids,
    steps,
    gates: collectGates(input.flags),
    artifacts: [],
    estimatedCommands: steps.length,
  };
}

export async function buildFullPlan(input: {
  skillRoot: string;
  repoRoot: string;
  presetName: string;
  flags: LoopPlanFlags;
}): Promise<LoopPlan> {
  const registry = await loadSkillLoopRegistry(input.skillRoot);
  const resolved = resolveLoopPreset(registry, input.presetName);
  const preset = resolved.preset;

  if (preset.closeLoop) {
    const cl = resolveCloseLoopPreset(registry, resolved.skillId, {
      ...preset.closeLoop,
      iterations: input.flags.iterations ?? preset.closeLoop.iterations,
    });
    const plan = await buildCloseLoopPlan({
      skillRoot: input.skillRoot,
      repoRoot: input.repoRoot,
      domain: cl.domain,
      scanPath: cl.scanPath,
      iterations: cl.iterations,
      targetMs: cl.targetMs,
      groundTruth: cl.groundTruth,
      seed: cl.seed,
      baselineWrite: cl.baselineWrite ?? input.flags.baselineWrite,
      failOnDrift: cl.failOnDrift ?? input.flags.failOnDrift,
      flags: {
        ...input.flags,
        minRating: input.flags.minRating ?? preset.failOnRating,
        failOnRating: input.flags.failOnRating ?? preset.failOnRating !== undefined,
        baselineWrite: cl.baselineWrite ?? input.flags.baselineWrite,
        failOnDrift: cl.failOnDrift ?? input.flags.failOnDrift,
      },
    });
    return {
      ...plan,
      action: "full",
      preset: input.presetName,
      description: preset.description,
    };
  }

  if (preset.benchSnapshot) {
    const bs = resolveBenchSnapshotPreset(registry, resolved.skillId, preset.benchSnapshot);
    const benchPlan = await buildSnapshotBenchPlan({
      skillRoot: input.skillRoot,
      repo: input.repoRoot,
      domain: bs.domain,
      scanPath: bs.scanPath,
      iterations: input.flags.iterations ?? bs.iterations,
      targetMs: bs.targetMs,
      groundTruth: bs.groundTruth,
      failOnNetworkDrift: bs.failOnNetworkDrift,
      flags: {
        ...input.flags,
        minRating: input.flags.minRating ?? preset.failOnRating,
        failOnRating: input.flags.failOnRating ?? preset.failOnRating !== undefined,
      },
    });
    return {
      action: "full",
      preset: input.presetName,
      description: preset.description,
      flags: benchPlan.flags,
      matrixSkills: [],
      steps: benchPlan.steps,
      gates: benchPlan.gates,
      artifacts: benchPlan.artifacts,
      estimatedCommands: benchPlan.estimatedCommands,
    };
  }

  const mergedFlags: LoopPlanFlags = {
    ...input.flags,
    skipPreflight: input.flags.skipPreflight ?? preset.skipPreflight,
    parallel: input.flags.parallel ?? preset.parallel,
    iterations: input.flags.iterations ?? preset.iterations,
    minRating: input.flags.minRating ?? preset.failOnRating,
  };

  const steps: LoopPlanStep[] = [];
  let matrixSkills: string[] = [];

  if (preset.matrix) {
    const matrixPlan = await buildMatrixPlan({
      skillRoot: input.skillRoot,
      repoRoot: input.repoRoot,
      phases: resolved.matrixPhases,
      flags: { ...mergedFlags, only: input.flags.only },
    });
    matrixSkills = matrixPlan.matrixSkills;
    steps.push(...matrixPlan.steps);
  }

  const entry = registry.skills[resolved.skillId];
  if (entry && resolved.runPhases.length) {
    steps.push(...await planSkill(
      input.skillRoot,
      input.repoRoot,
      resolved.skillId,
      entry,
      resolved.runPhases,
      mergedFlags,
    ));
  }

  const writeBaseline = !mergedFlags.noBaseline
    && (mergedFlags.baselineWrite || preset.baselineWrite);
  const artifacts: string[] = [];
  if (writeBaseline) {
    artifacts.push(defaultLoopBaselinePath(input.skillRoot));
  }

  const benchStep = steps.find((s) => s.phase === "bench");
  const benchMultiplier = benchStep?.iterations ?? 1;

  return {
    action: "full",
    preset: input.presetName,
    description: preset.description,
    flags: mergedFlags,
    matrixSkills,
    steps,
    gates: collectGates(mergedFlags, preset),
    artifacts,
    estimatedCommands: steps.filter((s) => s.command).length * benchMultiplier
      + steps.filter((s) => !s.command && s.phase !== "rate").length,
  };
}

export async function buildSnapshotBenchPlan(input: {
  skillRoot: string;
  repo: string;
  domain: string;
  scanPath?: string;
  iterations: number;
  targetMs?: number;
  groundTruth?: boolean;
  failOnNetworkDrift?: boolean;
  flags: LoopPlanFlags;
}): Promise<LoopPlan> {
  const snapshotPath = `baselines/${input.domain}/snapshot.json`;
  const groundTruth = input.groundTruth === true;
  const modeParts = [
    input.scanPath ? `live=${input.scanPath}` : "snapshot-only",
    groundTruth ? "ground-truth=on" : null,
    input.failOnNetworkDrift ? "fail-on-drift" : null,
    input.targetMs ? `target-p50=${input.targetMs}ms` : null,
  ].filter(Boolean);
  const substeps = [
    `1. load ${snapshotPath}`,
    ...(input.scanPath
      ? [
          `2. runNetworkAuditOnce scanPath=${input.scanPath} profile=supply-chain-network-dist`,
          "3. captureNetworkSectionFromReport → currentNetwork",
        ]
      : ["2. (skip live network — no --scan-path)"]),
    "4. validateSnapshotFull(version, sections, scanner, drift)",
    ...(groundTruth
      ? [
          "5. validateNetworkGroundTruth(sports-terminal-snapshot, policy, profile)",
          ...(input.scanPath ? ["6. compareAuditToGroundTruth(live pinned counts)"] : []),
        ]
      : ["5. (skip ground-truth — omit --ground-truth)"]),
    `rating: pass_rate × speed vs target ${input.targetMs ?? 1500}ms → A–F`,
  ];
  const cmd = [
    "bun",
    "scripts/skill-loop-cli.ts",
    "bench-snapshot",
    "--domain",
    input.domain,
    "--iterations",
    String(input.iterations),
    "--target-ms",
    String(input.targetMs ?? 1500),
    ...(input.scanPath ? ["--scan-path", input.scanPath] : []),
    ...(groundTruth ? ["--ground-truth"] : []),
    ...(input.failOnNetworkDrift ? ["--fail-on-network-drift"] : []),
    ...(input.flags.failOnRating ? ["--fail-on-rating"] : []),
    ...(input.flags.minRating !== undefined ? ["--min-rating", String(input.flags.minRating)] : []),
  ];
  return {
    action: "bench-snapshot",
    description: `Repeated snapshot validate${input.scanPath ? " + live network drift" : ""}${groundTruth ? " + ground-truth gate" : ""}`,
    flags: input.flags,
    matrixSkills: [],
    steps: [{
      skillId: "ast-grep",
      phase: "snapshot",
      iterations: input.iterations,
      detail: `bench-snapshot ×${input.iterations} domain=${input.domain} ${modeParts.join(" ")}`,
      command: cmd,
      cwd: input.skillRoot,
      substeps,
    }],
    gates: [
      ...collectGates(input.flags),
      ...(input.failOnNetworkDrift ? ["fail-on-network-drift"] : []),
    ],
    artifacts: [snapshotPath, ...(input.scanPath ? [input.scanPath] : [])],
    estimatedCommands: input.iterations,
  };
}

export async function buildCloseLoopPlan(input: {
  skillRoot: string;
  repoRoot: string;
  domain: string;
  scanPath?: string;
  iterations: number;
  targetMs?: number;
  groundTruth?: boolean;
  seed?: boolean;
  baselineWrite?: boolean;
  failOnDrift?: boolean;
  flags: LoopPlanFlags;
}): Promise<LoopPlan> {
  const snapshotPath = `baselines/${input.domain}/snapshot.json`;
  const loopBaseline = "baselines/loop/skill-loop-baseline.json";
  const substeps = [
    ...(input.seed && input.scanPath
      ? [`1. seedNetworkBaseline → ${snapshotPath}`]
      : []),
    "2. validateNetworkGroundTruth(repo refs + live pinned counts)",
    `3. runSnapshotBenchLoop ×${input.iterations} (load → network → validate → ground-truth)`,
    `4. diffLoopBaselines vs ${loopBaseline}`,
    ...(input.baselineWrite ? [`5. writeLoopBaseline → ${loopBaseline}`] : ["5. (skip baseline write — omit --baseline-write)"]),
    `gates: ground-truth + pass_rate=100% + rating vs target ${input.targetMs ?? 1500}ms`,
  ];
  const cmd = [
    "bun",
    "scripts/skill-loop-cli.ts",
    "close-loop",
    "--domain",
    input.domain,
    "--iterations",
    String(input.iterations),
    "--target-ms",
    String(input.targetMs ?? 1500),
    ...(input.scanPath ? ["--scan-path", input.scanPath] : []),
    ...(input.groundTruth !== false ? ["--ground-truth"] : []),
    ...(input.seed ? ["--seed"] : []),
    ...(input.baselineWrite ? ["--baseline-write"] : []),
    ...(input.failOnDrift ? ["--fail-on-drift"] : []),
    ...(input.flags.failOnRating ? ["--fail-on-rating"] : []),
    ...(input.flags.minRating !== undefined ? ["--min-rating", String(input.flags.minRating)] : []),
  ];
  return {
    action: "close-loop",
    description: "Closed loop: ground-truth gate → bench-snapshot → baseline diff/write",
    flags: input.flags,
    matrixSkills: [],
    steps: [{
      skillId: "ast-grep",
      phase: "snapshot",
      iterations: input.iterations,
      detail: `close-loop domain=${input.domain}${input.scanPath ? ` live=${input.scanPath}` : ""}`,
      command: cmd,
      cwd: input.skillRoot,
      substeps,
    }],
    gates: [
      ...collectGates(input.flags),
      ...(input.failOnDrift ? ["fail-on-drift vs loop baseline"] : []),
      "ground-truth validate",
      "bench-snapshot pass_rate=100%",
    ],
    artifacts: [snapshotPath, loopBaseline, ...(input.scanPath ? [input.scanPath] : [])],
    estimatedCommands: input.iterations,
  };
}

export async function buildBenchPlan(input: {
  skillRoot: string;
  repoRoot: string;
  profile: string;
  iterations: number;
  flags: LoopPlanFlags;
}): Promise<LoopPlan> {
  const { profiles } = await loadTestProfiles(input.skillRoot);
  const assembled = assembleTestCommand(profiles, {
    skillRoot: input.skillRoot,
    repoRoot: input.repoRoot,
    profile: input.profile,
  });
  return {
    action: "bench",
    flags: input.flags,
    matrixSkills: [],
    steps: [{
      skillId: "ast-grep",
      phase: "bench",
      profile: input.profile,
      iterations: input.iterations,
      detail: `bench ×${input.iterations} profile=${input.profile}`,
      command: assembled.command,
      cwd: assembled.cwd,
    }],
    gates: collectGates(input.flags),
    artifacts: [],
    estimatedCommands: input.iterations,
  };
}

export function formatLoopPlanText(plan: LoopPlan): string {
  const lines = [
    `[loop] dry-run action=${plan.action}${plan.preset ? ` preset=${plan.preset}` : ""}`,
  ];
  if (plan.description) lines.push(`  ${plan.description}`);
  if (plan.matrixSkills.length) {
    lines.push(`  matrix: ${plan.matrixSkills.length} skills${plan.flags.parallel ? " (parallel)" : ""}`);
    if (plan.flags.only) lines.push(`  only: ${plan.flags.only}`);
  }
  lines.push(`  steps: ${plan.steps.length}  estimated subprocesses: ~${plan.estimatedCommands}`);
  if (plan.gates.length) lines.push(`  gates: ${plan.gates.join("; ")}`);
  if (plan.artifacts.length) lines.push(`  artifacts: ${plan.artifacts.join(", ")}`);
  lines.push("");
  for (const s of plan.steps) {
    lines.push(`  ${s.skillId}.${s.phase}: ${s.detail}`);
    if (plan.flags.explain) {
      if (s.preflight?.length) lines.push(`    preflight: ${s.preflight.join(" ")}`);
      if (s.command?.length) lines.push(`    cmd: ${s.command.join(" ")}`);
      if (s.cwd) lines.push(`    cwd: ${s.cwd}`);
      if (s.substeps?.length) {
        lines.push("    per-iteration pipeline:");
        for (const sub of s.substeps) lines.push(`      ${sub}`);
      }
      if (s.iterations && s.iterations > 1) {
        lines.push(`    repeat: ${s.iterations}× (in-process, no subprocess per iter)`);
      }
    }
  }
  const flagBits = [
    plan.flags.dryRun ? "dry-run" : null,
    plan.flags.skipPreflight ? "skip-preflight" : null,
    plan.flags.smoke ? "smoke" : null,
    plan.flags.quiet ? "quiet" : null,
    plan.flags.noBaseline ? "no-baseline" : null,
  ].filter(Boolean);
  if (flagBits.length) lines.push("", `  flags: ${flagBits.join(", ")}`);
  return lines.join("\n");
}

export function formatLoopPlanJson(plan: LoopPlan): string {
  return JSON.stringify({ schemaVersion: 1, tool: "skill-loop", mode: "dry-run", ...plan }, null, 2);
}

export const LOOP_CLI_FLAGS_HELP = `
skill-loop flags:
  --dry-run, -n       Preview plan without executing
  --explain           With --dry-run: show commands, cwd, preflight
  --quiet, -q         Suppress per-tick stderr (summary only)
  --verbose, -v       Log phase starts during execution
  --preset <name>     quick | standard | full | ci
  --skill <id>        Target skill (run action)
  --phases a,b,c      doctor,test,bench,network,snapshot,rate
  --only <substr>     Filter matrix skills by id substring
  --parallel          Run matrix skills concurrently
  --iterations N      Bench repeat count
  --domain <id>       bench-snapshot domain (default: sports-terminal-os)
  --scan-path <path>  bench-snapshot live network drift vs snapshot
  --ground-truth      bench-snapshot include ground-truth validation
  --fail-on-network-drift  bench-snapshot gate on route drift
  --target-ms N       bench-snapshot p50 speed target (default 1500)
  --seed              close-loop: refresh network baseline before gates
  --baseline-write    close-loop: write baselines/loop/skill-loop-baseline.json
  --effect            close-loop: Effect-TS program (TaggedError + CloseLoopEngine layer)
  --skip-preflight    Skip snapshot validate before tests
  --smoke             Run scripts/smoke.sh in doctor phase (heavy)
  --no-baseline       Skip baseline write on full preset
  --baseline-write    Force baseline capture
  --fail-on-rating    Exit 1 when rating below --min-rating
  --fail-on-drift     Exit 1 when baseline drift detected
  --min-rating N      Rating gate threshold
  --json              NDJSON / JSON output
  --herdr-tab         Herdr tab formatted stderr
  --no-color          Plain stderr
`.trim();