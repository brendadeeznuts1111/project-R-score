/**
 * Factorial contrast analysis — main effects + two-way interactions.
 * Effect sizes from cell means; optional simple SE from per-partner averages.
 * Product thresholds are policy, not p-values.
 */

import type { Factor, FactorLevel, VariantConfig } from './design.ts';

export type PartnerMetricRow = {
  config: VariantConfig;
  /** Mean metric for this partner under their assigned config. */
  metric: number;
  /** Unbranded for SQL join rows; engine mints TreeNodeId at the boundary. */
  partnerId: string; // brand-ok — TreeNodeId wire/DTO
};

export type EffectEstimate = {
  name: string;
  effect: number;
  /** Observations contributing to the contrast (partner means). */
  n: number;
  /** Rough SE of the effect under equal variance (may be NaN if n small). */
  se: number | null;
  /** Policy flag: |effect| exceeds threshold (not a hypothesis test). */
  noteworthy: boolean;
};

export type FactorialAnalysis = {
  metricName: string;
  nPartners: number;
  grandMean: number;
  mainEffects: EffectEstimate[];
  interactions: EffectEstimate[];
};

function levelKey(v: FactorLevel): string {
  return JSON.stringify(v);
}

function mean(xs: number[]): number {
  if (!xs.length) return NaN;
  return xs.reduce((a, b) => a + b, 0) / xs.length;
}

function sampleVar(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}

/** Two-level main effect = mean(level1) − mean(level0). Multi-level = max mean − min mean (range). */
function factorEffect(
  rows: PartnerMetricRow[],
  factor: Factor,
  noteworthyThreshold: number
): EffectEstimate {
  const byLevel = new Map<string, number[]>();
  for (const r of rows) {
    const lv = r.config[factor.name];
    if (lv === undefined) continue;
    const k = levelKey(lv);
    const arr = byLevel.get(k) ?? [];
    arr.push(r.metric);
    byLevel.set(k, arr);
  }

  const levels = factor.levels.map(l => levelKey(l));
  const groupMeans = levels.map(k => mean(byLevel.get(k) ?? []));
  const groupNs = levels.map(k => (byLevel.get(k) ?? []).length);
  const n = groupNs.reduce((a, b) => a + b, 0);

  let effect = 0;
  if (factor.levels.length === 2) {
    effect = groupMeans[1]! - groupMeans[0]!;
  } else {
    const finite = groupMeans.filter(Number.isFinite);
    effect = finite.length ? Math.max(...finite) - Math.min(...finite) : 0;
  }

  // Pooled SE for two-level difference of means
  let se: number | null = null;
  if (factor.levels.length === 2 && groupNs[0]! >= 2 && groupNs[1]! >= 2) {
    const v0 = sampleVar(byLevel.get(levels[0]!) ?? []);
    const v1 = sampleVar(byLevel.get(levels[1]!) ?? []);
    se = Math.sqrt(v0 / groupNs[0]! + v1 / groupNs[1]!);
  }

  return {
    name: factor.name,
    effect: Number.isFinite(effect) ? effect : 0,
    n,
    se,
    noteworthy: Math.abs(effect) >= noteworthyThreshold,
  };
}

/**
 * Interaction A×B ≈ (effect of A | B=high) − (effect of A | B=low)
 * for two-level factors; 0 when either factor is multi-level without 2×2 cells.
 */
function interactionEffect(
  rows: PartnerMetricRow[],
  f1: Factor,
  f2: Factor,
  noteworthyThreshold: number
): EffectEstimate {
  const name = `${f1.name}×${f2.name}`;
  if (f1.levels.length !== 2 || f2.levels.length !== 2) {
    return { name, effect: 0, n: rows.length, se: null, noteworthy: false };
  }

  const cell = (a: FactorLevel, b: FactorLevel) =>
    rows
      .filter(
        r =>
          levelKey(r.config[f1.name]!) === levelKey(a) &&
          levelKey(r.config[f2.name]!) === levelKey(b)
      )
      .map(r => r.metric);

  const a0 = f1.levels[0]!;
  const a1 = f1.levels[1]!;
  const b0 = f2.levels[0]!;
  const b1 = f2.levels[1]!;

  const m00 = mean(cell(a0, b0));
  const m10 = mean(cell(a1, b0));
  const m01 = mean(cell(a0, b1));
  const m11 = mean(cell(a1, b1));

  // Classic 2×2 interaction contrast: (m11 - m01) - (m10 - m00)
  const effect =
    Number.isFinite(m00) && Number.isFinite(m10) && Number.isFinite(m01) && Number.isFinite(m11)
      ? m11 - m01 - (m10 - m00)
      : 0;

  const n =
    cell(a0, b0).length + cell(a1, b0).length + cell(a0, b1).length + cell(a1, b1).length;

  return {
    name,
    effect,
    n,
    se: null,
    noteworthy: Math.abs(effect) >= noteworthyThreshold,
  };
}

export type AnalyzeOpts = {
  metricName?: string;
  /** |main effect| threshold for noteworthy (default 0.02). */
  mainThreshold?: number;
  /** |interaction| threshold for noteworthy (default 0.015). */
  interactionThreshold?: number;
};

/** Analyze partner-level means under factorial assignment. */
export function analyzeFactorial(
  factors: Factor[],
  rows: PartnerMetricRow[],
  opts: AnalyzeOpts = {}
): FactorialAnalysis {
  const metricName = opts.metricName ?? 'win_rate';
  const mainThreshold = opts.mainThreshold ?? 0.02;
  const interactionThreshold = opts.interactionThreshold ?? 0.015;

  const metrics = rows.map(r => r.metric);
  const grandMean = mean(metrics);

  const mainEffects = factors.map(f => factorEffect(rows, f, mainThreshold));

  const interactions: EffectEstimate[] = [];
  for (let i = 0; i < factors.length; i++) {
    for (let j = i + 1; j < factors.length; j++) {
      interactions.push(
        interactionEffect(rows, factors[i]!, factors[j]!, interactionThreshold)
      );
    }
  }

  return {
    metricName,
    nPartners: rows.length,
    grandMean: Number.isFinite(grandMean) ? grandMean : 0,
    mainEffects,
    interactions,
  };
}

/**
 * Simple additive predictor with optional two-way interactions from analysis.
 * 2-level coding ±0.5 so main contribution is ±effect/2 around the grand mean.
 */
export function predictFromEffects(
  analysis: FactorialAnalysis,
  factors: Factor[],
  config: VariantConfig,
  includeInteractions = true
): number {
  let y = analysis.grandMean;

  for (const main of analysis.mainEffects) {
    const factor = factors.find(f => f.name === main.name);
    if (!factor || factor.levels.length !== 2) continue;
    const lv = config[factor.name];
    if (lv === undefined) continue;
    const coded = levelKey(lv) === levelKey(factor.levels[1]!) ? 0.5 : -0.5;
    y += coded * main.effect;
  }

  if (includeInteractions) {
    for (const ix of analysis.interactions) {
      const [n1, n2] = ix.name.split('×');
      if (!n1 || !n2) continue;
      const f1 = factors.find(f => f.name === n1);
      const f2 = factors.find(f => f.name === n2);
      if (!f1 || !f2 || f1.levels.length !== 2 || f2.levels.length !== 2) continue;
      const c1 = levelKey(config[f1.name]!) === levelKey(f1.levels[1]!) ? 0.5 : -0.5;
      const c2 = levelKey(config[f2.name]!) === levelKey(f2.levels[1]!) ? 0.5 : -0.5;
      // 2×2 interaction contrast maps to 4·c1·c2 under ±0.5 coding
      y += 4 * c1 * c2 * ix.effect;
    }
  }

  return y;
}
