// @see https://bun.com/docs/runtime/utils#bun-inspect-custom — Bun.inspect.custom
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/utils#bun-inspect — Bun.inspect (depth)
// @see https://bun.com/docs/runtime/utils#bun-stringwidth — Bun.stringWidth
/**
 * Multi-factor limit-raise report with Bun.inspect.table + inspect.custom.
 *
 * Prefer `console.log(report)` — Bun calls `[Bun.inspect.custom]` automatically.
 * Nested proof digests print as Uint8Array; driver lists as arrays; context via
 * deep Bun.inspect (console-depth SSOT).
 *
 * @see lib/http/networking-report.ts — RouteProbeReport pattern
 * @see lib/console-depth.ts — getConsoleDepth · inspectCustom · shouldColor
 */
import { getConsoleDepth, inspectCustom, shouldColor, widthOf } from '../console-depth.ts';
import { deepEquals } from '../deep-equals.ts';
import {
  inspectTable,
  proveInspectTable,
  projectTableRows,
  type InspectTableProof,
  type TableRow,
} from '../http/networking-report.ts';
import type { MultiFactorEnrichedRaise } from './partner-analytics-repo.ts';
import type { EnrichedLimitRaise, LimitRaise } from '../account-limits-repo.ts';

/** Explicit columns for the primary raises table. */
export const LIMIT_RAISE_TABLE_PROPERTIES = [
  'node',
  'book',
  'sport',
  'market',
  'type',
  'prev',
  'new',
  'dir',
  'score',
  'line5m',
  'when',
] as const;

/** Driver contribution rows (multi-factor). */
export const LIMIT_FACTOR_TABLE_PROPERTIES = [
  'limit_id',
  'factor',
  'weight_score',
  'rank',
] as const;

/** CLV mover rows. */
export const LIMIT_CLV_TABLE_PROPERTIES = ['limit_id', 'player', 'tier', 'delta'] as const;

/** Context metric rows (flattened key/value per raise). */
export const LIMIT_CONTEXT_TABLE_PROPERTIES = ['limit_id', 'metric', 'value'] as const;

/** Proof digest rows (hex + Uint8Array length for inspect.table). */
export const LIMIT_PROOF_TABLE_PROPERTIES = [
  'limit_id',
  'algorithm',
  'digest_hex',
  'digest_bytes',
  'signed',
  'valid',
] as const;

export type LimitRaiseReportOpts = {
  nodeId?: string; // brand-ok — TreeNodeId wire / partner slug
  hours?: number;
  multi?: boolean;
};

function hexToUint8Array(hex: string | null | undefined): Uint8Array | null {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.replace(/^0x/i, '').replace(/[^0-9a-f]/gi, '');
  if (clean.length < 2 || clean.length % 2 !== 0) return null;
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = Number.parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function shortNode(nodeId: string | undefined): string {
  // brand-ok — TreeNodeId wire
  if (!nodeId) return '—';
  return nodeId.length > 14 ? `${nodeId.slice(0, 12)}…` : nodeId;
}

function directionOf(r: LimitRaise): 'up' | 'down' | 'flat' {
  if (r.new_limit > r.previous_max) return 'up';
  if (r.new_limit < r.previous_max) return 'down';
  return 'flat';
}

/** Normalize any raise-like row into MultiFactorEnrichedRaise-compatible fields. */
function asMulti(
  r: LimitRaise | EnrichedLimitRaise | MultiFactorEnrichedRaise,
  nodeId?: string // brand-ok — TreeNodeId wire
): MultiFactorEnrichedRaise {
  const base = r as MultiFactorEnrichedRaise;
  return {
    limit_id: base.limit_id ?? 0,
    sportsbook: base.sportsbook,
    sport_id: base.sport_id,
    market_id: base.market_id,
    bet_type: base.bet_type,
    previous_max: base.previous_max,
    new_limit: base.new_limit,
    increased_at: base.increased_at,
    line_move_5m: base.line_move_5m ?? null,
    top_clv: base.top_clv ?? [],
    context: base.context ?? null,
    multi_factor_score: base.multi_factor_score ?? 0,
    top_contributing_factors: base.top_contributing_factors ?? [],
    factor_scores: base.factor_scores ?? {},
    context_proof: base.context_proof ?? null,
    // stash node for table projection
    ...(nodeId ? { node_id: nodeId } : {}),
  } as MultiFactorEnrichedRaise & { node_id?: string /* brand-ok */ };
}

export type LimitRaiseTableRow = {
  node: string;
  book: string;
  sport: string;
  market: string;
  type: string;
  prev: number;
  new: number;
  dir: string;
  score: string;
  line5m: string;
  when: string;
  limit_id: number;
};

/**
 * Full limit-raise report.
 * - `console.log(report)` → multi-table layout via `[Bun.inspect.custom]`
 * - nested digests as `Uint8Array`, drivers as `string[]`, context deep-inspected
 */
export class LimitRaiseReport {
  readonly nodeId: string; // brand-ok — TreeNodeId wire
  readonly hours: number;
  readonly multi: boolean;
  readonly raises: MultiFactorEnrichedRaise[];

  constructor(
    raises: Array<LimitRaise | EnrichedLimitRaise | MultiFactorEnrichedRaise>,
    opts: LimitRaiseReportOpts = {}
  ) {
    this.nodeId = opts.nodeId ?? '—';
    this.hours = opts.hours ?? 24;
    this.multi = opts.multi ?? true;
    this.raises = raises.map(r => asMulti(r, opts.nodeId));
  }

  /** Primary raise rows for Bun.inspect.table(data, properties). */
  raiseRows(): LimitRaiseTableRow[] {
    return this.raises.map(r => {
      const dir = directionOf(r);
      const score =
        this.multi && r.multi_factor_score != null ? r.multi_factor_score.toFixed(2) : '—';
      return {
        node: shortNode((r as { node_id?: string /* brand-ok */ }).node_id ?? this.nodeId),
        book: r.sportsbook,
        sport: r.sport_id,
        market: r.market_id,
        type: r.bet_type,
        prev: r.previous_max,
        new: r.new_limit,
        dir: dir === 'up' ? '↑' : dir === 'down' ? '↓' : '·',
        score,
        line5m:
          r.line_move_5m != null && Number.isFinite(r.line_move_5m)
            ? r.line_move_5m.toFixed(2)
            : '—',
        when: new Date(r.increased_at * 1000).toISOString().slice(0, 19),
        limit_id: r.limit_id,
      };
    });
  }

  /** Flattened multi-factor driver scores (array of objects). */
  factorRows(): TableRow[] {
    const rows: TableRow[] = [];
    for (const r of this.raises) {
      const entries = Object.entries(r.factor_scores ?? {}).sort((a, b) => b[1] - a[1]);
      entries.forEach(([factor, weight_score], i) => {
        rows.push({
          limit_id: r.limit_id,
          factor,
          weight_score: Number(weight_score.toFixed(4)),
          rank: i + 1,
        });
      });
      // top_contributing_factors is a string[] — also emit rank by that list
      if (entries.length === 0 && r.top_contributing_factors?.length) {
        r.top_contributing_factors.forEach((factor, i) => {
          rows.push({
            limit_id: r.limit_id,
            factor,
            weight_score: null,
            rank: i + 1,
          });
        });
      }
    }
    return rows;
  }

  /** CLV mover array rows. */
  clvRows(): TableRow[] {
    const rows: TableRow[] = [];
    for (const r of this.raises) {
      for (const p of r.top_clv ?? []) {
        rows.push({
          limit_id: r.limit_id,
          player: p.player_name,
          tier: p.tier,
          delta: Math.round(p.delta),
        });
      }
    }
    return rows;
  }

  /** Context metrics as key/value table (+ nested arrays / Uint8Array digests via deep section). */
  contextRows(): TableRow[] {
    const rows: TableRow[] = [];
    for (const r of this.raises) {
      const c = r.context;
      if (!c) continue;
      const metrics: Array<[string, string | number | boolean | null]> = [
        ['active_players_7d', c.active_players_7d],
        ['new_players_7d', c.new_players_7d],
        ['total_handle_7d', c.total_handle_7d],
        ['avg_clv_7d', c.avg_clv_7d],
        ['top_tier_player_count', c.top_tier_player_count],
        ['violation_count_30d', c.violation_count_30d],
        ['chargeback_count_30d', c.chargeback_count_30d],
        ['kyc_pass_rate', c.kyc_pass_rate],
        ['market_volatility_index', c.market_volatility_index],
        ['sportsbook_share', c.sportsbook_share],
        ['partner_profit_30d', c.partner_profit_30d],
        ['partner_roi_30d', c.partner_roi_30d],
        ['peak_betting_hours', c.peak_betting_hours],
      ];
      for (const [metric, value] of metrics) {
        rows.push({ limit_id: r.limit_id, metric, value });
      }
    }
    return rows;
  }

  /** Proof digests as inspect.table rows (hex + byte length). */
  proofRows(): TableRow[] {
    return this.raises.map(r => {
      const hex =
        typeof r.context?.proof_digest === 'string' && r.context.proof_digest.length > 0
          ? r.context.proof_digest
          : null;
      const bytes = hexToUint8Array(hex);
      const proof = r.context_proof;
      return {
        limit_id: r.limit_id,
        algorithm: r.context?.proof_algorithm ?? proof?.algorithm ?? '—',
        digest_hex: hex ? `${hex.slice(0, 16)}…` : '—',
        digest_bytes: bytes ? bytes.byteLength : 0,
        signed: proof?.signed ?? Boolean(r.context?.proof_hmac),
        valid: proof?.valid ?? false,
      };
    });
  }

  /**
   * Deep payload for Bun.inspect: includes Array, nested objects, and Uint8Array digests.
   * Depth controlled by getConsoleDepth() / --console-depth.
   */
  deepPayload(): object {
    return this.raises.map(r => {
      const digestHex =
        typeof r.context?.proof_digest === 'string' && r.context.proof_digest.length > 0
          ? r.context.proof_digest
          : null;
      let peakHours: number[] | string = [];
      try {
        peakHours = r.context?.peak_betting_hours
          ? (JSON.parse(r.context.peak_betting_hours) as number[])
          : [];
      } catch {
        peakHours = r.context?.peak_betting_hours ?? [];
      }
      const digestBytes = hexToUint8Array(digestHex);
      const roundedFactors: Record<string, number> = {};
      for (const [k, v] of Object.entries(r.factor_scores ?? {})) {
        roundedFactors[k] = Number(Number(v).toFixed(4));
      }
      return {
        limit_id: r.limit_id,
        book: r.sportsbook,
        market: `${r.sport_id}/${r.market_id}`,
        bet_type: r.bet_type,
        previous_max: r.previous_max,
        new_limit: r.new_limit,
        multi_factor_score: Number((r.multi_factor_score ?? 0).toFixed(4)),
        /** string[] — top drivers */
        top_contributing_factors: [...(r.top_contributing_factors ?? [])],
        /** Array of CLV movers */
        top_clv: (r.top_clv ?? []).map(p => ({ ...p })),
        /** number[] peak hours from context JSON */
        peak_betting_hours: Array.isArray(peakHours) ? peakHours : [peakHours],
        /** Uint8Array digest bytes when proof present (Bun.inspect shows Uint8Array(n) [ … ]) */
        proof_digest_bytes: digestBytes ?? new Uint8Array(0),
        proof_digest_hex: digestHex,
        context_proof: r.context_proof,
        factor_scores: roundedFactors,
        context: r.context
          ? {
              handle7d: r.context.total_handle_7d,
              clv7d: r.context.avg_clv_7d,
              kyc: r.context.kyc_pass_rate,
              viol: r.context.violation_count_30d,
              cb: r.context.chargeback_count_30d,
              roi30d: r.context.partner_roi_30d,
            }
          : null,
      };
    });
  }

  tableProof(): {
    raises: InspectTableProof;
    factors?: InspectTableProof;
    clv?: InspectTableProof;
    context?: InspectTableProof;
    proofs?: InspectTableProof;
  } {
    const raiseRows = projectTableRows(
      this.raiseRows() as unknown as TableRow[],
      LIMIT_RAISE_TABLE_PROPERTIES
    );
    const proof: ReturnType<LimitRaiseReport['tableProof']> = {
      raises: proveInspectTable(raiseRows, LIMIT_RAISE_TABLE_PROPERTIES),
    };
    const factors = this.factorRows();
    if (factors.length) {
      proof.factors = proveInspectTable(factors, LIMIT_FACTOR_TABLE_PROPERTIES);
    }
    const clv = this.clvRows();
    if (clv.length) {
      proof.clv = proveInspectTable(clv, LIMIT_CLV_TABLE_PROPERTIES);
    }
    const ctx = this.contextRows();
    if (ctx.length) {
      proof.context = proveInspectTable(ctx, LIMIT_CONTEXT_TABLE_PROPERTIES);
    }
    const proofs = this.proofRows();
    if (proofs.length) {
      proof.proofs = proveInspectTable(proofs, LIMIT_PROOF_TABLE_PROPERTIES);
    }
    return proof;
  }

  render(opts: { colors?: boolean } = {}): {
    raises: string;
    factors: string;
    clv: string;
    context: string;
    proofs: string;
    deep: string;
    /** Bun.inspect of a sample Uint8Array for demo/docs */
    u8sample: string;
  } {
    const colors = opts.colors ?? shouldColor();
    const raiseRows = this.raiseRows() as unknown as TableRow[];
    const factors = this.factorRows();
    const clv = this.clvRows();
    const ctx = this.contextRows();
    const proofs = this.proofRows();
    const depth = getConsoleDepth();

    // prove idempotency on primary table
    const projected = projectTableRows(raiseRows, LIMIT_RAISE_TABLE_PROPERTIES);
    const t1 = Bun.inspect.table(projected, [...LIMIT_RAISE_TABLE_PROPERTIES], {
      colors: false,
    });
    const t2 = Bun.inspect.table(projected, [...LIMIT_RAISE_TABLE_PROPERTIES], {
      colors: false,
    });
    if (!deepEquals(t1, t2)) {
      throw new Error('LimitRaiseReport: inspect.table not idempotent');
    }

    const deep = this.deepPayload() as Array<{ proof_digest_bytes?: Uint8Array }>;
    const firstU8 = deep.find(
      d => d.proof_digest_bytes && d.proof_digest_bytes.byteLength > 0
    )?.proof_digest_bytes;
    const u8sample = firstU8
      ? Bun.inspect(firstU8, { depth: 1, colors, compact: true })
      : Bun.inspect(new Uint8Array(0), { colors, compact: true });

    return {
      raises: inspectTable(raiseRows, LIMIT_RAISE_TABLE_PROPERTIES, { colors }),
      factors: factors.length
        ? inspectTable(factors, LIMIT_FACTOR_TABLE_PROPERTIES, { colors })
        : '(no factor scores)',
      clv: clv.length
        ? inspectTable(clv, LIMIT_CLV_TABLE_PROPERTIES, { colors })
        : '(no CLV movers)',
      context: ctx.length
        ? inspectTable(ctx, LIMIT_CONTEXT_TABLE_PROPERTIES, { colors })
        : '(no context snapshots)',
      proofs: proofs.length
        ? inspectTable(proofs, LIMIT_PROOF_TABLE_PROPERTIES, { colors })
        : '(no proofs)',
      deep: Bun.inspect(this.deepPayload(), {
        depth,
        colors,
        sorted: true,
      }),
      u8sample,
    };
  }

  toJSON(): object {
    const proof = this.tableProof();
    return {
      nodeId: this.nodeId,
      hours: this.hours,
      multi: this.multi,
      count: this.raises.length,
      raises: this.raiseRows(),
      factors: this.factorRows(),
      clv: this.clvRows(),
      context: this.contextRows(),
      deep: this.deepPayload(),
      tableProof: proof,
      /** column visual widths for primary table */
      columnWidths: Object.fromEntries(
        LIMIT_RAISE_TABLE_PROPERTIES.map(p => {
          const rows = this.raiseRows() as unknown as TableRow[];
          let max = widthOf(p);
          for (const row of rows) {
            max = Math.max(max, widthOf(String((row as Record<string, unknown>)[p] ?? '')));
          }
          return [p, max];
        })
      ),
    };
  }

  /**
   * @see https://bun.com/docs/runtime/utils#bun-inspect-custom
   * console.log / Bun.inspect call this automatically.
   */
  [inspectCustom](_depth?: number, options?: { colors?: boolean }): string {
    const colors = options?.colors ?? shouldColor();
    const r = this.render({ colors });
    const depth = getConsoleDepth();
    const parts = [
      `LimitRaiseReport · node=${this.nodeId} · last ${this.hours}h · n=${this.raises.length}` +
        (this.multi ? ' · multi-factor' : '') +
        ` · depth=${depth}`,
      '',
      '── RAISES (Bun.inspect.table · properties) ──',
      r.raises,
    ];
    if (this.multi) {
      parts.push('', '── MULTI-FACTOR DRIVERS ──', r.factors);
      parts.push('', '── CLV MOVERS (array) ──', r.clv);
      parts.push('', '── CONTEXT METRICS ──', r.context);
      parts.push('', '── PROOFS (digest table) ──', r.proofs);
      parts.push('', '── Uint8Array sample (Bun.inspect) ──', r.u8sample);
      parts.push('', '── DEEP (Bun.inspect · string[] · number[] · Uint8Array digests) ──', r.deep);
    }
    return parts.join('\n');
  }
}

/** Convenience: build report and print via inspect.custom. */
export function printLimitRaiseReport(
  raises: Array<LimitRaise | EnrichedLimitRaise | MultiFactorEnrichedRaise>,
  opts: LimitRaiseReportOpts = {}
): LimitRaiseReport {
  const report = new LimitRaiseReport(raises, opts);
  console.log(report);
  return report;
}
