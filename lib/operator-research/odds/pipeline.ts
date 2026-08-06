// @see https://bun.com/docs/runtime/utils#bun-nanoseconds — Bun.nanoseconds
import { tryHostId, asHostId, trySportsbookId } from '../../types/branded.ts';
import type { HostId } from '../../types/branded.ts';
import { detectChanges } from './diff.ts';
import { fetchOddsOne } from './odds-fetcher.ts';
import { parseOddsJson } from './odds-parser.ts';
import { writeProvenanceFromSnapshot } from '../matching/provenance.ts';
import { ensureMatchingSchema } from '../matching/schema.ts';
import { storeNormalizedSnapshot } from '../normalization/store.ts';
import { openNormalizedDb } from '../normalization/schema.ts';
import {
  ensureOddsStore,
  getLastSnapshot,
  getLastSnapshots,
  storeEdgeSignals,
  storeSnapshot,
} from './odds-store.ts';
import { detectCrossBookArbitrage } from '../matching/arbitrage.ts';
import { evaluateAlerts, type AlertEvent } from '../matching/alerts.ts';
import { detectPatterns, scanCrossBookEdges } from './pattern-detector.ts';
import type { EdgeSignal, MonitorTickResult, OddsEndpoint, OddsSnapshot } from './types.ts';

export type PipelineHooks = {
  onDiff?: (host: HostId, result: MonitorTickResult) => void;
  onPatterns?: (host: HostId, patterns: EdgeSignal[]) => void;
  onAlerts?: (alerts: AlertEvent[]) => void;
};

export type RunMonitorOptions = {
  endpoints: OddsEndpoint[];
  fixtureFallback?: boolean;
  store?: boolean;
  window?: number;
  lineMoveRel?: number;
  crossBookArb?: boolean;
  /** Soft-book value vs sharp de-vig (requires ≥2 hosts). Default: same as crossBookArb. */
  crossBookValue?: boolean;
  minArbEdge?: number;
  minEvPct?: number;
  /** Run provenance cross-book arb + alert rules after tick (default: when store). */
  evaluateAlerts?: boolean;
  hooks?: PipelineHooks;
};

function hostOf(ep: OddsEndpoint): HostId {
  return ep.host;
}

/**
 * One monitor tick: prewarm+fetch → parse → diff → store → patterns.
 */
export async function runMonitorTick(opts: RunMonitorOptions): Promise<MonitorTickResult[]> {
  if (opts.store !== false) await ensureOddsStore();

  const results: MonitorTickResult[] = [];
  const liveSnapshots: OddsSnapshot[] = [];

  for (const ep of opts.endpoints) {
    const started = Bun.nanoseconds();
    const host = hostOf(ep);
    try {
      const fetched = await fetchOddsOne(ep, {
        fixtureFallback: opts.fixtureFallback,
        prewarm: true,
      });
      if (!fetched.ok && fetched.source === 'none') {
        const elapsedMs = (Number(Bun.nanoseconds()) - Number(started)) / 1_000_000;
        results.push({
          host,
          ok: false,
          elapsedMs,
          identical: true,
          diff: null,
          patterns: [],
          snapshot: null,
          error: fetched.error ?? 'fetch failed',
        });
        continue;
      }

      let snapshot = parseOddsJson(fetched.bodyText, {
        host,
        sportsbookId: ep.sportsbookId ?? trySportsbookId(String(host).split('.')[0] ?? ''),
        source: fetched.source === 'fixture' ? 'fixture' : 'live',
      });
      // Live HTML/blocked payloads often parse to zero markets — fall back to fixture once
      if (
        snapshot.markets.length === 0 &&
        fetched.source === 'live' &&
        opts.fixtureFallback !== false
      ) {
        const fx = await fetchOddsOne(
          { ...ep, url: `https://fixture.local/${ep.fixtureId ?? 'x'}` },
          { fixtureFallback: true, prewarm: false }
        );
        // Force fixture path: load via fixtureId only (broken URL → catch → fixture)
        if (fx.source === 'fixture' && fx.bodyText) {
          snapshot = parseOddsJson(fx.bodyText, {
            host,
            sportsbookId: ep.sportsbookId ?? trySportsbookId(String(host).split('.')[0] ?? ''),
            source: 'fixture',
          });
        }
      }

      const prev = getLastSnapshot(host);
      const diff = prev ? detectChanges(prev, snapshot) : null;
      const identical = diff?.identical ?? false;

      if (opts.store !== false && (!identical || !prev)) {
        const meta = storeSnapshot(snapshot);
        // Dual-write relational normalized lines + provenance history
        try {
          await openNormalizedDb();
          ensureMatchingSchema();
          storeNormalizedSnapshot(snapshot, {
            snapshotBlobId: meta.id,
            session: 'pregame',
          });
          const prov = writeProvenanceFromSnapshot(snapshot, {
            session: 'pregame',
            minMovePct: 2,
          });
          if (prov.movements.length > 0) {
            console.error(
              `[movement] ${String(host)}:`,
              prov.movements
                .map(
                  m =>
                    `${m.selection} ${m.direction} ${m.percentageChange.toFixed(2)}% (${m.from}→${m.to})`
                )
                .join('; ')
            );
          }
        } catch (normErr) {
          console.error(
            `[normalize] ${String(host)}:`,
            normErr instanceof Error ? normErr.message : String(normErr)
          );
        }
      }

      const history = getLastSnapshots(host, opts.window ?? 5);
      // If we just stored current, history includes it; patterns use previous window + current
      const previous = history
        .filter(s => s.timestamp !== snapshot.timestamp)
        .slice(-(opts.window ?? 5));
      const patterns = detectPatterns(snapshot, previous, {
        lineMoveRel: opts.lineMoveRel,
        diff,
      });

      if (patterns.length > 0 && opts.store !== false) {
        storeEdgeSignals(patterns);
      }

      liveSnapshots.push(snapshot);

      const elapsedMs = (Number(Bun.nanoseconds()) - Number(started)) / 1_000_000;
      const tick: MonitorTickResult = {
        host,
        ok: true,
        elapsedMs,
        identical: identical && !!prev,
        diff,
        patterns,
        snapshot,
      };
      results.push(tick);
      opts.hooks?.onDiff?.(host, tick);
      if (patterns.length > 0) opts.hooks?.onPatterns?.(host, patterns);
    } catch (err) {
      const elapsedMs = (Number(Bun.nanoseconds()) - Number(started)) / 1_000_000;
      results.push({
        host,
        ok: false,
        elapsedMs,
        identical: true,
        diff: null,
        patterns: [],
        snapshot: null,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  const wantArb = opts.crossBookArb === true;
  const wantValue = opts.crossBookValue ?? wantArb;
  if ((wantArb || wantValue) && liveSnapshots.length >= 2) {
    const cross = scanCrossBookEdges(liveSnapshots, {
      minArbEdge: wantArb ? (opts.minArbEdge ?? 0.02) : 1, // disable arb when not wanted
      minEvPct: wantValue ? (opts.minEvPct ?? 2) : 1e9, // disable value when not wanted
    }).filter(s => {
      if (s.type === 'arbitrage') return wantArb;
      if (s.type === 'value') return wantValue;
      return false;
    });
    if (cross.length > 0 && opts.store !== false) storeEdgeSignals(cross);
    for (const sig of cross) {
      const r = results.find(x => String(x.host) === String(sig.host));
      if (r) r.patterns.push(sig);
      else if (results[0]) results[0].patterns.push(sig);
    }
  }

  const shouldAlerts = opts.evaluateAlerts ?? opts.store !== false;
  if (shouldAlerts) {
    try {
      const provenanceArbs = detectCrossBookArbitrage({ minEdgePct: 1.5 });
      const alerts = await evaluateAlerts({ arbs: provenanceArbs });
      if (alerts.length > 0) {
        console.error(`[alerts] ${alerts.length} fired`);
        opts.hooks?.onAlerts?.(alerts);
      }
    } catch (alertErr) {
      console.error('[alerts]', alertErr instanceof Error ? alertErr.message : String(alertErr));
    }
  }

  return results;
}

export function endpointFromHost(
  host: string,
  opts: { url?: string; fixtureId?: string; sportsbookId?: string } = {} // brand-ok — opaque research/wire id
): OddsEndpoint {
  const h = tryHostId(host) ?? asHostId(host);
  const base = opts.url ?? `https://${String(h)}/api/odds`;
  return {
    host: h,
    url: base,
    sportsbookId: opts.sportsbookId
      ? trySportsbookId(opts.sportsbookId)
      : trySportsbookId(host.split('.')[0] ?? ''),
    fixtureId: opts.fixtureId ?? host.split('.')[0],
  };
}

/** Default high-priority research books (fixture-backed when live blocks). */
export const HIGH_PRIORITY_BOOKS = [
  'hardrock.bet',
  'sportsbook.draftkings.com',
  'sportsbook.fanduel.com',
] as const;
