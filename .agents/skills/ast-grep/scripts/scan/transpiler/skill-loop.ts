import { access } from "node:fs/promises";
import { readFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import {
  formatBenchStatus,
  runBenchLoop,
  type BenchLoopSummary,
} from "./bench-loop.ts";
import {
  compareAuditToGroundTruth,
  groundTruthIdForDomain,
} from "./network-ground-truth-validator.ts";
import { runNetworkAuditOnce } from "./network-loop.ts";
import { assembleTestCommand, loadTestProfiles } from "./test-runner.ts";
import {
  formatSnapshotBenchStatus,
  runSnapshotBenchLoop,
  type SnapshotBenchSummary,
} from "./snapshot-bench-loop.ts";
export type { SnapshotBenchSummary } from "./snapshot-bench-loop.ts";
import { validateSnapshotFull } from "./snapshot.ts";
import { defaultSnapshotPath } from "./snapshot-network.ts";

export type SkillLoopPhase = "doctor" | "test" | "bench" | "network" | "snapshot" | "rate";

export type SkillPhaseSpec = {
  enabled?: boolean;
  profile?: string;
  iterations?: number;
  targetMs?: number;
  minRating?: number;
  scanPath?: string;
  domain?: string;
  healthUrl?: string;
  /** Run scripts/smoke.sh when present (heavy — off by default in loop ticks). */
  smoke?: boolean;
};

export type SkillRegistryEntry = {
  path: string;
  zone?: string;
  workspace?: string;
  phases: Partial<Record<SkillLoopPhase, SkillPhaseSpec>>;
};

export type BenchSnapshotPresetSpec = {
  domain?: string;
  scanPath?: string;
  groundTruth?: boolean;
  failOnNetworkDrift?: boolean;
  iterations?: number;
  targetMs?: number;
};

export type CloseLoopPresetSpec = BenchSnapshotPresetSpec & {
  seed?: boolean;
  baselineWrite?: boolean;
  failOnDrift?: boolean;
  ratingDriftTolerance?: number;
  skipGroundTruth?: boolean;
};

export type LoopPreset = {
  description?: string;
  skill?: string;
  phases?: SkillLoopPhase[];
  matrix?: boolean;
  matrixPhases?: SkillLoopPhase[];
  parallel?: boolean;
  skipPreflight?: boolean;
  baselineWrite?: boolean;
  failOnRating?: number;
  iterations?: number;
  /** Runs skill-loop-cli bench-snapshot instead of phase pipeline. */
  benchSnapshot?: BenchSnapshotPresetSpec;
  /** Full closed loop: ground-truth → bench-snapshot → baseline diff/write. */
  closeLoop?: CloseLoopPresetSpec;
};

export type SkillLoopRegistry = {
  version: number;
  description?: string;
  defaultPhases?: SkillLoopPhase[];
  presets?: Record<string, LoopPreset>;
  skills: Record<string, SkillRegistryEntry>;
};

export type ResolvedLoopPreset = {
  name: string;
  preset: LoopPreset;
  matrixPhases: SkillLoopPhase[];
  runPhases: SkillLoopPhase[];
  skillId: string;
  benchSnapshot?: BenchSnapshotPresetSpec;
  closeLoop?: CloseLoopPresetSpec;
};

export type PhaseResult = {
  phase: SkillLoopPhase;
  ok: boolean;
  detail?: string;
  rating?: number;
  grade?: string;
  elapsedMs?: number;
  bench?: BenchLoopSummary;
};

export type SkillLoopTick = {
  skillId: string;
  reason: "initial" | "cycle" | "watch";
  detail?: string;
  phases: PhaseResult[];
  rating: number;
  grade: string;
  at: number;
  snapshotBench?: SnapshotBenchSummary;
};

export type SkillLoopOptions = {
  skillRoot: string;
  repoRoot: string;
  skillId: string;
  phases: SkillLoopPhase[];
  iterations?: number;
  skipPreflight?: boolean;
  smoke?: boolean;
  onTick: (tick: SkillLoopTick) => void | Promise<void>;
  onPhaseStart?: (skillId: string, phase: SkillLoopPhase) => void | Promise<void>;
  signal?: AbortSignal;
};

export async function loadSkillLoopRegistry(skillRoot: string): Promise<SkillLoopRegistry> {
  const path = join(skillRoot, "skill-loop-registry.json");
  const raw = await readFile(path, "utf8");
  return JSON.parse(raw) as SkillLoopRegistry;
}

export function listRegistrySkills(registry: SkillLoopRegistry): string[] {
  return Object.keys(registry.skills).sort();
}

export function filterSkillsByOnly(skills: string[], only?: string): string[] {
  if (!only) return skills;
  const needle = only.toLowerCase();
  return skills.filter((id) => id.toLowerCase().includes(needle));
}

export function resolveSkillPhases(
  entry: SkillRegistryEntry,
  requested: SkillLoopPhase[],
): SkillLoopPhase[] {
  return requested.filter((phase) => entry.phases[phase]?.enabled !== false);
}

export function resolveLoopPreset(
  registry: SkillLoopRegistry,
  name: string,
): ResolvedLoopPreset {
  const preset = registry.presets?.[name];
  if (!preset) {
    const names = Object.keys(registry.presets ?? {}).sort().join(", ");
    throw new Error(`unknown loop preset '${name}' — choose: ${names || "(none)"}`);
  }
  return {
    name,
    preset,
    matrixPhases: preset.matrixPhases ?? preset.phases ?? ["doctor", "rate"],
    runPhases: preset.benchSnapshot || preset.closeLoop
      ? []
      : (preset.phases ?? registry.defaultPhases ?? ["test", "bench", "rate"]),
    skillId: preset.skill ?? "ast-grep",
    benchSnapshot: preset.benchSnapshot,
    closeLoop: preset.closeLoop,
  };
}

export function resolveCloseLoopPreset(
  registry: SkillLoopRegistry,
  skillId: string,
  spec: CloseLoopPresetSpec,
): CloseLoopPresetSpec & Required<Pick<CloseLoopPresetSpec, "domain" | "iterations" | "targetMs">> {
  const bs = resolveBenchSnapshotPreset(registry, skillId, spec);
  return {
    ...spec,
    domain: bs.domain,
    scanPath: bs.scanPath,
    groundTruth: spec.skipGroundTruth ? false : bs.groundTruth,
    iterations: bs.iterations,
    targetMs: bs.targetMs,
    ratingDriftTolerance: spec.ratingDriftTolerance ?? 15,
  };
}

export function resolveBenchSnapshotPreset(
  registry: SkillLoopRegistry,
  skillId: string,
  spec: BenchSnapshotPresetSpec,
): Required<Pick<BenchSnapshotPresetSpec, "domain" | "iterations" | "targetMs">> & BenchSnapshotPresetSpec {
  const entry = registry.skills[skillId];
  const network = entry?.phases?.network;
  return {
    domain: spec.domain ?? network?.domain ?? skillId,
    scanPath: spec.scanPath ?? network?.scanPath ?? entry?.workspace,
    groundTruth: spec.groundTruth ?? Boolean(spec.scanPath ?? network?.scanPath),
    failOnNetworkDrift: spec.failOnNetworkDrift,
    iterations: spec.iterations ?? 3,
    targetMs: spec.targetMs ?? 1500,
  };
}

export function snapshotBenchSummaryToTick(
  skillId: string,
  summary: SnapshotBenchSummary,
): SkillLoopTick {
  const ok = summary.passRate >= 1;
  const minRating = 70;
  return {
    skillId,
    reason: "initial",
    snapshotBench: summary,
    phases: [
      {
        phase: "snapshot",
        ok,
        detail: formatSnapshotBenchStatus(summary),
        rating: summary.rating,
        grade: summary.grade,
      },
      {
        phase: "rate",
        ok: summary.rating >= minRating,
        detail: `bench-snapshot pass_rate=${Math.round(summary.passRate * 100)}% rating=${summary.rating} (${summary.grade})`,
        rating: summary.rating,
        grade: summary.grade,
      },
    ],
    rating: summary.rating,
    grade: summary.grade,
    at: Date.now(),
  };
}

export function listLoopPresets(registry: SkillLoopRegistry): string[] {
  return Object.keys(registry.presets ?? {}).sort();
}

async function runDoctorPhase(
  repoRoot: string,
  skillId: string,
  entry: SkillRegistryEntry,
  spec: SkillPhaseSpec,
): Promise<PhaseResult> {
  const started = performance.now();
  const skillPath = resolve(repoRoot, entry.path);
  const skillMd = join(skillPath, "SKILL.md");
  const issues: string[] = [];
  if (!(await Bun.file(skillMd).exists())) issues.push("SKILL.md missing");
  try {
    await access(skillPath);
  } catch {
    issues.push("skill path missing");
  }
  if (spec.smoke === true) {
    const smoke = join(skillPath, "scripts/smoke.sh");
    if (await Bun.file(smoke).exists()) {
      const proc = Bun.spawn(["bash", smoke], {
        cwd: skillPath,
        stdout: "pipe",
        stderr: "pipe",
      });
      const code = await proc.exited;
      if (code !== 0) issues.push(`smoke exit ${code}`);
    }
  }
  const ok = issues.length === 0;
  return {
    phase: "doctor",
    ok,
    detail: ok ? `${skillId} ok` : issues.join("; "),
    rating: ok ? 100 : 40,
    grade: ok ? "A" : "F",
    elapsedMs: Math.round(performance.now() - started),
  };
}

async function runTestPhase(
  opts: SkillLoopOptions,
  spec: SkillPhaseSpec,
): Promise<PhaseResult> {
  const started = performance.now();
  const profile = spec.profile ?? "ci";
  const { profiles } = await loadTestProfiles(opts.skillRoot);
  const assembled = assembleTestCommand(profiles, {
    skillRoot: opts.skillRoot,
    repoRoot: opts.repoRoot,
    profile,
  });

  if (assembled.preflight && !opts.skipPreflight) {
    const pf = Bun.spawn(assembled.preflight.command, {
      cwd: assembled.preflight.cwd,
      stdout: "inherit",
      stderr: "inherit",
      env: assembled.env ? { ...process.env, ...assembled.env } : process.env,
    });
    if ((await pf.exited) !== 0) {
      return {
        phase: "test",
        ok: false,
        detail: `preflight ${assembled.preflight.label} failed`,
        rating: 0,
        grade: "F",
        elapsedMs: Math.round(performance.now() - started),
      };
    }
  }

  const proc = Bun.spawn(assembled.command, {
    cwd: assembled.cwd,
    stdout: "pipe",
    stderr: "pipe",
    env: assembled.env ? { ...process.env, ...assembled.env } : process.env,
  });
  const [stdout, stderr, code] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
    proc.exited,
  ]);
  const elapsedMs = Math.round(performance.now() - started);
  const ok = code === 0;
  const passMatch = `${stdout}\n${stderr}`.match(/(\d+)\s+pass/);
  const failMatch = `${stdout}\n${stderr}`.match(/(\d+)\s+fail/);
  const pass = passMatch ? Number(passMatch[1]) : 0;
  const fail = failMatch ? Number(failMatch[1]) : 0;
  return {
    phase: "test",
    ok,
    detail: `profile=${profile} pass=${pass} fail=${fail}`,
    rating: ok ? 100 : Math.max(0, Math.round((pass / Math.max(1, pass + fail)) * 100)),
    grade: ok ? "A" : "F",
    elapsedMs,
  };
}

async function runBenchPhase(
  opts: SkillLoopOptions,
  spec: SkillPhaseSpec,
): Promise<PhaseResult> {
  const profile = spec.profile ?? "unit";
  const summary = await runBenchLoop({
    skillRoot: opts.skillRoot,
    repoRoot: opts.repoRoot,
    profile,
    iterations: opts.iterations ?? spec.iterations ?? 3,
    targetMs: spec.targetMs,
    skipPreflight: opts.skipPreflight,
    signal: opts.signal,
  });
  const ok = summary.passRate >= 1 && summary.rating >= (spec.minRating ?? 70);
  return {
    phase: "bench",
    ok,
    detail: formatBenchStatus(summary, "bench"),
    rating: summary.rating,
    grade: summary.grade,
    bench: summary,
  };
}

async function runNetworkPhase(
  opts: SkillLoopOptions,
  entry: SkillRegistryEntry,
  spec: SkillPhaseSpec,
): Promise<PhaseResult> {
  const started = performance.now();
  const scanPath = spec.scanPath ?? entry.workspace ?? entry.path;
  const profile = spec.profile ?? "supply-chain-network-dist";
  const domain = spec.domain ?? opts.skillId;
  try {
    const audit = await runNetworkAuditOnce({
      skillRoot: opts.skillRoot,
      repo: opts.repoRoot,
      scanPath,
      profileName: profile,
      domain,
      healthUrl: spec.healthUrl,
      verbose: false,
    });
    const endpoints = audit.endpoints;
    const health = audit.healthStatus ?? "unknown";
    const gtId = groundTruthIdForDomain(domain);
    const gtCheck = gtId ? compareAuditToGroundTruth(audit, gtId) : undefined;
    const gtOk = gtCheck?.ok !== false;
    const ok = health !== "unreachable" && gtOk;
    const gtNote = gtCheck && !gtCheck.ok
      ? ` ground-truth=${gtCheck.issues.join(";")}`
      : gtCheck?.ok
        ? " ground-truth=ok"
        : "";
    let rating = health === "healthy" ? 100 : health === "degraded" ? 70 : 30;
    if (!gtOk) rating = Math.min(rating, 50);
    const grade =
      rating >= 95 ? "A" :
      rating >= 85 ? "B" :
      rating >= 70 ? "C" :
      rating >= 50 ? "D" : "F";
    return {
      phase: "network",
      ok,
      detail: `endpoints=${endpoints} health=${health} unique=${audit.networkUnique}${gtNote}`,
      rating,
      grade,
      elapsedMs: Math.round(performance.now() - started),
    };
  } catch (e) {
    return {
      phase: "network",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
      rating: 0,
      grade: "F",
      elapsedMs: Math.round(performance.now() - started),
    };
  }
}

async function runSnapshotPhase(
  opts: SkillLoopOptions,
  spec: SkillPhaseSpec,
): Promise<PhaseResult> {
  const started = performance.now();
  const domain = spec.domain ?? opts.skillId;
  const snapshotPath = defaultSnapshotPath(opts.skillRoot, domain);
  try {
    const raw = await readFile(snapshotPath, "utf8");
    const snapshot = JSON.parse(raw);
    const result = await validateSnapshotFull({ skillRoot: opts.skillRoot, snapshot });
    const ok = result.ok;
    return {
      phase: "snapshot",
      ok,
      detail: ok ? `snapshot ok (${domain})` : `snapshot drift sections=${result.sections.join(",")}`,
      rating: ok ? 100 : 50,
      grade: ok ? "A" : "D",
      elapsedMs: Math.round(performance.now() - started),
    };
  } catch (e) {
    return {
      phase: "snapshot",
      ok: false,
      detail: e instanceof Error ? e.message : String(e),
      rating: 0,
      grade: "F",
      elapsedMs: Math.round(performance.now() - started),
    };
  }
}

function computeOverallRating(phases: PhaseResult[], minRating?: number): { rating: number; grade: string; ok: boolean } {
  const rated = phases.filter((p) => p.rating !== undefined);
  if (!rated.length) return { rating: 0, grade: "F", ok: false };
  const rating = Math.round(rated.reduce((s, p) => s + (p.rating ?? 0), 0) / rated.length);
  const grade =
    rating >= 95 ? "A" :
    rating >= 85 ? "B" :
    rating >= 70 ? "C" :
    rating >= 50 ? "D" : "F";
  const ok = rating >= (minRating ?? 70) && phases.every((p) => p.ok);
  return { rating, grade, ok };
}

async function runSkillPhases(
  opts: SkillLoopOptions,
  entry: SkillRegistryEntry,
  phases: SkillLoopPhase[],
): Promise<SkillLoopTick> {
  const results: PhaseResult[] = [];
  for (const phase of phases) {
    if (opts.signal?.aborted) break;
    const spec = entry.phases[phase] ?? {};
    if (spec.enabled === false) continue;

    await opts.onPhaseStart?.(opts.skillId, phase);
    const phaseSpec = opts.smoke ? { ...spec, smoke: true } : spec;

    let result: PhaseResult;
    switch (phase) {
      case "doctor":
        result = await runDoctorPhase(opts.repoRoot, opts.skillId, entry, phaseSpec);
        break;
      case "test":
        result = await runTestPhase(opts, phaseSpec);
        break;
      case "bench":
        result = await runBenchPhase(opts, phaseSpec);
        break;
      case "network":
        result = await runNetworkPhase(opts, entry, phaseSpec);
        break;
      case "snapshot":
        result = await runSnapshotPhase(opts, phaseSpec);
        break;
      case "rate":
        continue;
      default:
        continue;
    }
    results.push(result);
  }

  const rateSpec = entry.phases.rate ?? {};
  const { rating, grade } = computeOverallRating(results, rateSpec.minRating);
  if (phases.includes("rate") && rateSpec.enabled !== false) {
    results.push({
      phase: "rate",
      ok: rating >= (rateSpec.minRating ?? 70),
      detail: `overall rating=${rating} (${grade})`,
      rating,
      grade,
    });
  }

  return {
    skillId: opts.skillId,
    reason: "initial",
    phases: results,
    rating,
    grade,
    at: Date.now(),
  };
}

export async function runSkillLoopOnce(opts: SkillLoopOptions): Promise<SkillLoopTick> {
  const registry = await loadSkillLoopRegistry(opts.skillRoot);
  const entry = registry.skills[opts.skillId];
  if (!entry) {
    throw new Error(`unknown skill '${opts.skillId}' — choose: ${listRegistrySkills(registry).join(", ")}`);
  }
  const phases = resolveSkillPhases(entry, opts.phases);
  const tick = await runSkillPhases(opts, entry, phases);
  await opts.onTick(tick);
  return tick;
}

export type SkillLoopMatrixOptions = {
  skillRoot: string;
  repoRoot: string;
  skillIds?: string[];
  phases?: SkillLoopPhase[];
  iterations?: number;
  skipPreflight?: boolean;
  smoke?: boolean;
  only?: string;
  parallel?: boolean;
  onTick?: (tick: SkillLoopTick) => void | Promise<void>;
  onPhaseStart?: (skillId: string, phase: SkillLoopPhase) => void | Promise<void>;
  signal?: AbortSignal;
};

async function runMatrixSkill(
  opts: SkillLoopMatrixOptions,
  registry: SkillLoopRegistry,
  skillId: string,
  phases: SkillLoopPhase[],
): Promise<SkillLoopTick | null> {
  const entry = registry.skills[skillId];
  if (!entry) return null;
  const resolved = resolveSkillPhases(entry, phases);
  return runSkillPhases(
    {
      skillRoot: opts.skillRoot,
      repoRoot: opts.repoRoot,
      skillId,
      phases: resolved,
      iterations: opts.iterations,
      skipPreflight: opts.skipPreflight,
      smoke: opts.smoke,
      onTick: async () => {},
      onPhaseStart: opts.onPhaseStart,
      signal: opts.signal,
    },
    entry,
    resolved,
  );
}

export async function runSkillLoopMatrix(opts: SkillLoopMatrixOptions): Promise<SkillLoopTick[]> {
  const registry = await loadSkillLoopRegistry(opts.skillRoot);
  let ids = opts.skillIds?.length
    ? opts.skillIds
    : listRegistrySkills(registry);
  ids = filterSkillsByOnly(ids, opts.only);
  const phases = opts.phases ?? (registry.defaultPhases as SkillLoopPhase[]) ?? ["doctor", "rate"];

  const runOne = async (skillId: string): Promise<SkillLoopTick | null> => {
    if (opts.signal?.aborted) return null;
    return runMatrixSkill(opts, registry, skillId, phases);
  };

  const raw = opts.parallel === true
    ? await Promise.all(ids.map(runOne))
    : await (async () => {
        const out: Array<SkillLoopTick | null> = [];
        for (const id of ids) out.push(await runOne(id));
        return out;
      })();

  const ticks = raw.filter((t): t is SkillLoopTick => t !== null);
  for (const tick of ticks) await opts.onTick?.(tick);
  return ticks;
}

export type SkillLoopFullOptions = {
  skillRoot: string;
  repoRoot: string;
  presetName: string;
  iterations?: number;
  skipPreflight?: boolean;
  smoke?: boolean;
  only?: string;
  noBaseline?: boolean;
  onTick?: (tick: SkillLoopTick) => void | Promise<void>;
  onPhaseStart?: (skillId: string, phase: SkillLoopPhase) => void | Promise<void>;
  signal?: AbortSignal;
};

export async function runSkillLoopPreset(opts: SkillLoopFullOptions): Promise<{
  preset: ResolvedLoopPreset;
  matrix: SkillLoopTick[];
  run?: SkillLoopTick;
  all: SkillLoopTick[];
}> {
  const registry = await loadSkillLoopRegistry(opts.skillRoot);
  const preset = resolveLoopPreset(registry, opts.presetName);
  const all: SkillLoopTick[] = [];

  let matrix: SkillLoopTick[] = [];
  if (preset.preset.matrix) {
    matrix = await runSkillLoopMatrix({
      skillRoot: opts.skillRoot,
      repoRoot: opts.repoRoot,
      phases: preset.matrixPhases,
      parallel: preset.preset.parallel,
      skipPreflight: opts.skipPreflight ?? preset.preset.skipPreflight,
      smoke: opts.smoke,
      only: opts.only,
      iterations: preset.preset.iterations,
      onTick: opts.onTick,
      onPhaseStart: opts.onPhaseStart,
      signal: opts.signal,
    });
    all.push(...matrix);
  }

  let run: SkillLoopTick | undefined;
  if (preset.closeLoop) {
    const cl = resolveCloseLoopPreset(registry, preset.skillId, {
      ...preset.closeLoop,
      iterations: opts.iterations ?? preset.closeLoop.iterations,
    });
    const { runCloseLoop } = await import("./close-loop.ts");
    const summary = await runCloseLoop({
      skillRoot: opts.skillRoot,
      repo: opts.repoRoot,
      skillId: preset.skillId,
      domain: cl.domain,
      scanPath: cl.scanPath,
      iterations: cl.iterations,
      seed: cl.seed,
      baselineWrite: cl.baselineWrite,
      failOnDrift: cl.failOnDrift,
      ratingDriftTolerance: cl.ratingDriftTolerance,
      benchSnapshot: cl,
      signal: opts.signal,
    });
    if (summary.bench) {
      run = snapshotBenchSummaryToTick(preset.skillId, summary.bench);
      await opts.onTick?.(run);
      all.push(run);
    }
  } else if (preset.benchSnapshot) {
    const bs = resolveBenchSnapshotPreset(registry, preset.skillId, {
      ...preset.benchSnapshot,
      iterations: opts.iterations ?? preset.benchSnapshot.iterations,
    });
    const summary = await runSnapshotBenchLoop({
      skillRoot: opts.skillRoot,
      repo: opts.repoRoot,
      domain: bs.domain,
      scanPath: bs.scanPath,
      iterations: bs.iterations,
      targetMs: bs.targetMs,
      groundTruth: bs.groundTruth,
      failOnNetworkDrift: bs.failOnNetworkDrift,
      signal: opts.signal,
    });
    run = snapshotBenchSummaryToTick(preset.skillId, summary);
    await opts.onTick?.(run);
    all.push(run);
  } else if (preset.runPhases.length) {
    run = await runSkillLoopOnce({
      skillRoot: opts.skillRoot,
      repoRoot: opts.repoRoot,
      skillId: preset.skillId,
      phases: preset.runPhases,
      iterations: preset.preset.iterations,
      skipPreflight: opts.skipPreflight ?? preset.preset.skipPreflight,
      smoke: opts.smoke,
      onTick: async (tick) => {
        await opts.onTick?.(tick);
      },
      onPhaseStart: opts.onPhaseStart,
      signal: opts.signal,
    });
    all.push(run);
  }

  return { preset, matrix, run, all };
}

export function formatSkillLoopStatus(tick: SkillLoopTick): string {
  const phaseBits = tick.phases.map((p) => `${p.phase}=${p.ok ? "ok" : "fail"}`).join(" ");
  return `[loop] skill=${tick.skillId} rating=${tick.rating} (${tick.grade}) ${phaseBits}`;
}