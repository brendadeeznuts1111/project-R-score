import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { SnapshotBenchPhaseSummary } from "./snapshot-bench-loop.ts";
import type { SkillLoopPhase, SkillLoopTick } from "./skill-loop.ts";

export type LoopBaselineBenchMetrics = {
  passRate: number;
  p50Ms: number;
  p95Ms: number;
  phaseP50?: SnapshotBenchPhaseSummary;
};

export type LoopBaselineEntry = {
  skillId: string;
  rating: number;
  grade: string;
  phases: Array<{ phase: SkillLoopPhase; ok: boolean; rating?: number }>;
  at: string;
  bench?: LoopBaselineBenchMetrics;
};

export type LoopBaseline = {
  version: 1;
  capturedAt: string;
  skills: Record<string, LoopBaselineEntry>;
};

export type LoopBaselineDelta = {
  skillId: string;
  rating_delta: number;
  grade_before: string;
  grade_after: string;
  phases_changed: SkillLoopPhase[];
  drift: boolean;
};

export function defaultLoopBaselinePath(skillRoot: string): string {
  return join(skillRoot, "baselines/loop/skill-loop-baseline.json");
}

export function tickToBaselineEntry(tick: SkillLoopTick): LoopBaselineEntry {
  const bench = tick.snapshotBench
    ? {
        passRate: tick.snapshotBench.passRate,
        p50Ms: tick.snapshotBench.p50Ms,
        p95Ms: tick.snapshotBench.p95Ms,
        phaseP50: tick.snapshotBench.phaseP50,
      }
    : undefined;
  return {
    skillId: tick.skillId,
    rating: tick.rating,
    grade: tick.grade,
    phases: tick.phases.map((p) => ({
      phase: p.phase,
      ok: p.ok,
      rating: p.rating,
    })),
    at: new Date(tick.at).toISOString(),
    bench,
  };
}

export function captureLoopBaseline(ticks: SkillLoopTick[]): LoopBaseline {
  const skills: Record<string, LoopBaselineEntry> = {};
  for (const tick of ticks) {
    skills[tick.skillId] = tickToBaselineEntry(tick);
  }
  return {
    version: 1,
    capturedAt: new Date().toISOString(),
    skills,
  };
}

export async function loadLoopBaseline(path: string): Promise<LoopBaseline | null> {
  try {
    return JSON.parse(await readFile(path, "utf8")) as LoopBaseline;
  } catch {
    return null;
  }
}

export function diffLoopBaseline(
  current: LoopBaselineEntry,
  previous: LoopBaselineEntry,
  opts?: { ratingDriftTolerance?: number; strict?: boolean },
): LoopBaselineDelta {
  const phases_changed: SkillLoopPhase[] = [];
  const prevMap = new Map(previous.phases.map((p) => [p.phase, p]));
  for (const p of current.phases) {
    const old = prevMap.get(p.phase);
    if (!old || old.ok !== p.ok) {
      phases_changed.push(p.phase);
    } else if (opts?.strict && old.rating !== p.rating) {
      phases_changed.push(p.phase);
    }
  }
  const tolerance = opts?.strict ? 0 : (opts?.ratingDriftTolerance ?? 0);
  const ratingDelta = current.rating - previous.rating;
  const ratingDrift = Math.abs(ratingDelta) > tolerance;
  const passRateDrift = current.bench && previous.bench
    ? current.bench.passRate < previous.bench.passRate
    : false;
  const drift = phases_changed.length > 0 || passRateDrift
    || (opts?.strict ? ratingDrift : (ratingDrift && ratingDelta < 0));
  return {
    skillId: current.skillId,
    rating_delta: current.rating - previous.rating,
    grade_before: previous.grade,
    grade_after: current.grade,
    phases_changed,
    drift,
  };
}

export function diffLoopBaselines(
  current: LoopBaseline,
  previous: LoopBaseline,
  opts?: { ratingDriftTolerance?: number; strict?: boolean },
): LoopBaselineDelta[] {
  const deltas: LoopBaselineDelta[] = [];
  for (const [skillId, entry] of Object.entries(current.skills)) {
    const prev = previous.skills[skillId];
    if (prev) deltas.push(diffLoopBaseline(entry, prev, opts));
  }
  return deltas;
}

export async function writeLoopBaseline(
  skillRoot: string,
  ticks: SkillLoopTick[],
  outPath?: string,
): Promise<string> {
  const path = outPath ?? defaultLoopBaselinePath(skillRoot);
  await mkdir(join(path, ".."), { recursive: true });
  const baseline = captureLoopBaseline(ticks);
  await writeFile(path, `${JSON.stringify(baseline, null, 2)}\n`, "utf8");
  return path;
}

export function formatLoopSummary(ticks: SkillLoopTick[]): string {
  const lines = ["skill-loop summary:", ""];
  const sorted = [...ticks].sort((a, b) => b.rating - a.rating);
  for (const t of sorted) {
    const phases = t.phases.map((p) => `${p.phase}:${p.ok ? "ok" : "fail"}`).join(" ");
    const elapsed = t.phases.reduce((s, p) => s + (p.elapsedMs ?? 0), 0);
    lines.push(
      `  ${t.skillId.padEnd(28)} rating=${String(t.rating).padStart(3)} (${t.grade})`
      + `${elapsed ? ` ${elapsed}ms` : ""}  ${phases}`,
    );
  }
  const avg = Math.round(sorted.reduce((s, t) => s + t.rating, 0) / Math.max(1, sorted.length));
  lines.push("", `  average rating: ${avg}`);
  return lines.join("\n");
}