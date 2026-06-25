import type { SkillLoopTick } from "./skill-loop.ts";

export const SKILL_LOOP_CHANGED_STATUS = "skill.loop.changed";

export function fingerprintSkillLoopTick(tick: SkillLoopTick): string {
  return JSON.stringify({
    skillId: tick.skillId,
    rating: tick.rating,
    grade: tick.grade,
    phases: tick.phases.map((p) => ({ phase: p.phase, ok: p.ok, rating: p.rating })),
  });
}

export function formatSkillLoopHerdrTab(tick: SkillLoopTick): string[] {
  const stamp = new Date(tick.at).toISOString();
  const lines = [`[${stamp}] skill-loop: ${tick.skillId}`];
  lines.push(`overall: rating=${tick.rating} grade=${tick.grade}`);
  for (const p of tick.phases) {
    const rating = p.rating !== undefined ? ` rating=${p.rating}` : "";
    lines.push(`  ${p.phase}: ${p.ok ? "ok" : "FAIL"}${rating}${p.detail ? ` — ${p.detail}` : ""}`);
    if (p.bench) {
      lines.push(
        `    bench p50=${p.bench.p50Ms}ms p95=${p.bench.p95Ms}ms pass_rate=${Math.round(p.bench.passRate * 100)}%`,
      );
    }
  }
  if (tick.detail) lines.push(`trigger: ${tick.detail}`);
  return lines;
}

export function formatSkillLoopJson(tick: SkillLoopTick): string {
  return JSON.stringify({
    schemaVersion: 1,
    tool: "skill-loop",
    mode: "loop",
    at: new Date(tick.at).toISOString(),
    reason: tick.reason,
    detail: tick.detail,
    summary: {
      skillId: tick.skillId,
      ok: tick.phases.every((p) => p.ok),
      rating: tick.rating,
      grade: tick.grade,
    },
    phases: tick.phases,
    fingerprint: fingerprintSkillLoopTick(tick),
  });
}