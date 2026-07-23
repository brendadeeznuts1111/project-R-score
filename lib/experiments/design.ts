// @see https://bun.com/docs/runtime/hashing#bun-hash — Bun.hash
/**
 * Factorial / fractional design generation (pure, no DB).
 *
 * - Full factorial: cartesian product of factor levels
 * - Regular 2-level fraction (denom power of 2): free columns + generators
 * - Mixed / other fractions: deterministic balanced subset of full grid
 *
 * `fractionDenom` is the reciprocal of the fraction (1 = full, 2 = ½, 4 = ¼).
 */
import {
  unbrand,
  type ExperimentId,
  type TreeNodeId,
} from '../types/branded.ts';

export type FactorLevel = string | number | boolean;

export type Factor = {
  name: string;
  levels: FactorLevel[];
};

/** One design cell: factor name → level. */
export type VariantConfig = Record<string, FactorLevel>;

export type DesignMethod = 'full' | 'regular-2level' | 'balanced-subset';

export type FactorialDesignResult = {
  variants: VariantConfig[];
  fullRuns: number;
  targetRuns: number;
  fractionDenom: number;
  method: DesignMethod;
  /** Human-readable alias notes for regular fractions (e.g. I = A×B×C). */
  aliases: string[];
};

/** Stable key for grouping / unique constraint (sorted keys). */
export function configKey(config: VariantConfig): string {
  const keys = Object.keys(config).sort();
  const ordered: Record<string, FactorLevel> = {};
  for (const k of keys) ordered[k] = config[k]!;
  return JSON.stringify(ordered);
}

export function fullRunCount(factors: Factor[]): number {
  if (factors.length === 0) return 0;
  return factors.reduce((prod, f) => {
    if (!f.levels.length) throw new Error(`Factor "${f.name}" has no levels`);
    return prod * f.levels.length;
  }, 1);
}

/** Cartesian product of all factor levels. */
export function fullFactorial(factors: Factor[]): VariantConfig[] {
  if (factors.length === 0) return [];
  for (const f of factors) {
    if (!f.name) throw new Error('Factor name required');
    if (!f.levels.length) throw new Error(`Factor "${f.name}" has no levels`);
  }

  let combos: VariantConfig[] = [{}];
  for (const factor of factors) {
    const next: VariantConfig[] = [];
    for (const partial of combos) {
      for (const level of factor.levels) {
        next.push({ ...partial, [factor.name]: level });
      }
    }
    combos = next;
  }
  return combos;
}

function isPowerOfTwo(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && (n & (n - 1)) === 0;
}

function allTwoLevel(factors: Factor[]): boolean {
  return factors.every(f => f.levels.length === 2);
}

/**
 * Regular 2^{k-p} fraction: free factors get full 2^{k-p} grid;
 * generated factors are products of free coded levels (±1).
 * Half-fraction (p=1): last factor = product of all free (I = A×B×…×K).
 */
export function regularTwoLevelFraction(
  factors: Factor[],
  fractionDenom: number
): { variants: VariantConfig[]; aliases: string[] } {
  if (!allTwoLevel(factors)) {
    throw new Error('regularTwoLevelFraction requires all factors to have exactly 2 levels');
  }
  if (!isPowerOfTwo(fractionDenom) || fractionDenom < 2) {
    throw new Error(`fractionDenom must be power of 2 ≥ 2 (got ${fractionDenom})`);
  }
  const p = Math.log2(fractionDenom);
  if (!Number.isInteger(p)) throw new Error('fractionDenom must be power of 2');
  const k = factors.length;
  const freeCount = k - p;
  if (freeCount < 1) {
    throw new Error(
      `Too many generators: ${k} factors cannot support 1/${fractionDenom} (need free ≥ 1)`
    );
  }

  const free = factors.slice(0, freeCount);
  const generated = factors.slice(freeCount);
  const freeGrid = fullFactorial(free);
  const aliases: string[] = [];

  // Generators: generated[g] ← product of free factors, skipping free[g % freeCount]
  // For p=1 this is product of all free → classic resolution-max half fraction when k free+1.
  for (let g = 0; g < generated.length; g++) {
    const gen = generated[g]!;
    const parts = free.map(f => f.name);
    if (p > 1 && freeCount > 1) {
      // Drop one free factor from the product to diversify generators
      const drop = g % freeCount;
      const used = free.filter((_, i) => i !== drop).map(f => f.name);
      aliases.push(`I = ${[...used, gen.name].join('×')}`);
    } else {
      aliases.push(`I = ${[...parts, gen.name].join('×')}`);
    }
  }

  const variants = freeGrid.map(row => {
    const out: VariantConfig = { ...row };
    const freeCoded = free.map(f => (row[f.name] === f.levels[1] ? 1 : -1));

    for (let g = 0; g < generated.length; g++) {
      const gen = generated[g]!;
      let prod = 1;
      if (p > 1 && freeCount > 1) {
        const drop = g % freeCount;
        for (let i = 0; i < freeCoded.length; i++) {
          if (i !== drop) prod *= freeCoded[i]!;
        }
      } else {
        for (const c of freeCoded) prod *= c;
      }
      out[gen.name] = prod === 1 ? gen.levels[1]! : gen.levels[0]!;
    }
    return out;
  });

  return { variants, aliases };
}

/**
 * Greedy balanced subset of the full factorial (deterministic).
 * Prefers rows that reduce per-factor level imbalance; ties broken by configKey sort.
 */
export function balancedSubset(factors: Factor[], targetRuns: number): VariantConfig[] {
  const full = fullFactorial(factors);
  if (targetRuns >= full.length) return full;
  if (targetRuns <= 0) return [];

  const sorted = [...full].sort((a, b) => configKey(a).localeCompare(configKey(b)));
  const selected: VariantConfig[] = [];
  const counts = new Map<string, Map<string, number>>(); // factor → levelKey → n
  for (const f of factors) {
    counts.set(f.name, new Map());
  }

  const levelKey = (v: FactorLevel) => JSON.stringify(v);

  while (selected.length < targetRuns) {
    let best: VariantConfig | null = null;
    let bestScore = Infinity;
    let bestKey = '';

    for (const cand of sorted) {
      const key = configKey(cand);
      if (selected.some(s => configKey(s) === key)) continue;

      // Score = sum of (count after pick)^2 — prefer filling under-represented cells
      let score = 0;
      for (const f of factors) {
        const map = counts.get(f.name)!;
        const lk = levelKey(cand[f.name]!);
        const next = (map.get(lk) ?? 0) + 1;
        score += next * next;
      }
      // slight preference for earlier keys when tied
      if (score < bestScore || (score === bestScore && key < bestKey)) {
        bestScore = score;
        best = cand;
        bestKey = key;
      }
    }

    if (!best) break;
    selected.push(best);
    for (const f of factors) {
      const map = counts.get(f.name)!;
      const lk = levelKey(best[f.name]!);
      map.set(lk, (map.get(lk) ?? 0) + 1);
    }
  }

  return selected;
}

/**
 * Build a factorial design.
 * @param fractionDenom 1 = full; 2 = half; 4 = quarter (ceil of full/denom runs)
 */
export function generateDesign(
  factors: Factor[],
  fractionDenom: number = 1
): FactorialDesignResult {
  if (!Number.isFinite(fractionDenom) || fractionDenom < 1) {
    throw new Error(`fractionDenom must be ≥ 1 (got ${fractionDenom})`);
  }
  const denom = Math.max(1, Math.floor(fractionDenom));
  const fullRuns = fullRunCount(factors);
  if (fullRuns === 0) {
    return {
      variants: [],
      fullRuns: 0,
      targetRuns: 0,
      fractionDenom: denom,
      method: 'full',
      aliases: [],
    };
  }

  const targetRuns = Math.max(1, Math.ceil(fullRuns / denom));

  if (denom === 1) {
    return {
      variants: fullFactorial(factors),
      fullRuns,
      targetRuns: fullRuns,
      fractionDenom: 1,
      method: 'full',
      aliases: [],
    };
  }

  if (allTwoLevel(factors) && isPowerOfTwo(denom) && factors.length - Math.log2(denom) >= 1) {
    try {
      const { variants, aliases } = regularTwoLevelFraction(factors, denom);
      return {
        variants,
        fullRuns,
        targetRuns: variants.length,
        fractionDenom: denom,
        method: 'regular-2level',
        aliases,
      };
    } catch {
      // fall through to balanced subset
    }
  }

  const variants = balancedSubset(factors, targetRuns);
  return {
    variants,
    fullRuns,
    targetRuns: variants.length,
    fractionDenom: denom,
    method: 'balanced-subset',
    aliases: [
      `Deterministic balanced subset (${variants.length}/${fullRuns}); interactions may be aliased — prefer full or regular-2level when feasible.`,
    ],
  };
}

/** Sticky index into variants for a partner (stable across restarts). */
export function stickyVariantIndex(
  experimentId: ExperimentId,
  partnerId: TreeNodeId,
  variantCount: number
): number {
  if (variantCount <= 0) return 0;
  const h = Bun.hash(`${unbrand(experimentId)}:${unbrand(partnerId)}`);
  // Bun.hash may return bigint | number depending on overload — coerce
  const n = typeof h === 'bigint' ? Number(h % BigInt(variantCount)) : h % variantCount;
  return ((n % variantCount) + variantCount) % variantCount;
}
