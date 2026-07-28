// @see https://bun.com/docs/runtime/shell#getting-started — Bun.$
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// @see https://bun.com/docs/runtime/utils#bun-sleep — Bun.sleep
// @see https://bun.com/docs/runtime/image#input — Bun.Image
// @see https://bun.com/docs/runtime/webview#new-bun-webview-options — Bun.WebView
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
/**
 * Coverage prediction report — SVG chart for Pages + optional Bun.WebView
 * screenshot polished with Bun.Image for local ops station.
 */
import type { Database } from 'bun:sqlite';
import type { AccuracySummary, PredictionTest } from './tester.ts';
import { getPredictionAccuracy } from './tester.ts';
import { ensurePredictionSchema } from './schema.ts';

export type ReportSeriesPoint = {
  date: string;
  predicted: number;
  actual: number;
  /** Signed residual: predicted − actual (matches bias convention). */
  error: number;
};

export type ReportDiagnostics = {
  maxAbsError: number;
  worstDate: string;
  meanAbsError: number;
  lastPredicted: number;
  lastActual: number;
  lastSignedError: number;
  within5Pct: number;
  within15Pct: number;
  overCount: number;
  underCount: number;
  exactCount: number;
  firstHalfMae: number;
  secondHalfMae: number;
  /** second − first; negative means improving (lower MAE). */
  maeDelta: number;
  trend: 'improving' | 'worsening' | 'stable' | 'unknown';
  /** Std-dev of signed residuals (coverage % points). */
  errorStdDev: number;
  /** Human label from MAE bands (≤5 / ≤15). */
  qualityLabel: string;
  biasSeverity: 'low' | 'medium' | 'high' | 'unknown';
  within5Status: 'above_target' | 'marginal' | 'below_target' | 'unknown';
  within5Target: number;
  trendLabel: 'improving' | 'worsening' | 'stable' | 'unknown';
  decayDetected: boolean;
  /** MAE/RMSE when RMSE > 0. */
  maeRmseRatio: number | null;
};

export type HistogramBin = {
  lo: number;
  hi: number;
  count: number;
  pct: number;
  containsMae: boolean;
};

export type WorstDay = {
  date: string;
  predicted: number;
  actual: number;
  error: number;
  absError: number;
  within5: boolean;
  exceedsRmse: boolean;
};

export type OpsStrip = {
  stripTone: 'good' | 'warn' | 'bad' | 'unknown';
  within5Text: string;
  trendText: string;
};

export type ReportPreviousSummary = {
  generatedAt: string;
  mae: number;
  rmse: number;
  bias: number;
  within5Pct: number;
  n: number;
  qualityLabel: string;
};

export type ReportDiff = {
  available: boolean;
  maeDelta?: number;
  maePctBetter?: number;
  within5Pp?: number;
  biasDelta?: number;
  improved?: boolean;
};

export type RollingSeries = {
  window: number;
  mae: number[];
  stdUpper: number[];
  stdLower: number[];
  overallMae: number;
};

/** within≤5 hit-rate target (% of days). */
export const WITHIN5_TARGET_PCT = 65;

export const PREDICTION_REPORT_SCHEMA = 3 as const;

export type PredictionReportSummary = {
  schemaVersion: typeof PREDICTION_REPORT_SCHEMA;
  generated: string;
  model: 'naive-coverage-v1';
  range: { from: string | null; to: string | null };
  accuracy: AccuracySummary;
  diagnostics: ReportDiagnostics;
  quality: 'good' | 'fair' | 'poor' | 'unknown';
  points: number;
  histogramBins: HistogramBin[];
  worstDays: WorstDay[];
  ops: OpsStrip;
  previous: ReportPreviousSummary | null;
  diff: ReportDiff;
  rolling: RollingSeries;
  artifacts: {
    report: '/registry/prediction/report/';
    coverageSvg: '/registry/prediction/coverage-chart.svg';
    errorSvg: '/registry/prediction/error-chart.svg';
    histogramSvg: '/registry/prediction/error-histogram.svg';
    rollingSvg: '/registry/prediction/rolling-mae.svg';
    summaryJson: '/registry/prediction/report/summary.json';
    coveragePng?: '/registry/prediction/coverage-chart.png';
  };
};

export type PredictionReportResult = {
  outDir: string;
  svgPath: string;
  htmlPath: string;
  summaryPath: string;
  pngPath?: string;
  points: number;
  accuracy: AccuracySummary;
  diagnostics: ReportDiagnostics;
  openedWebView: boolean;
};

const DEFAULT_OUT = 'public/registry/prediction';

/** Load most-recent coverage series from prediction_accuracy (or empty). */
export function loadCoverageSeries(db: Database, limit = 60): ReportSeriesPoint[] {
  ensurePredictionSchema(db);
  const rows = db
    .query(
      `SELECT prediction_date, predicted_value, actual_value, error
       FROM prediction_accuracy
       WHERE prediction_type = 'coverage'
       ORDER BY prediction_date DESC
       LIMIT $n`
    )
    .all({ $n: limit }) as Array<{
    prediction_date: string;
    predicted_value: number;
    actual_value: number;
    error: number;
  }>;
  // Chronological for charts (oldest → newest)
  return rows
    .slice()
    .reverse()
    .map(r => ({
      date: r.prediction_date,
      predicted: r.predicted_value,
      actual: r.actual_value,
      // Prefer signed residual; DB `error` is absolute for MAE storage.
      error: r.predicted_value - r.actual_value,
    }));
}

/** Build SVG line chart (predicted vs actual). Pure string — safe for static Pages. */
export function buildCoverageChartSvg(
  points: ReportSeriesPoint[],
  accuracy: AccuracySummary,
  opts?: { width?: number; height?: number }
): string {
  const width = opts?.width ?? 720;
  const height = opts?.height ?? 320;
  const pad = { l: 48, r: 16, t: 36, b: 40 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;

  const title = `Coverage prediction · n=${accuracy.n} · MAE ${accuracy.mae.toFixed(2)} · RMSE ${accuracy.rmse.toFixed(2)}`;

  if (points.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <text x="${width / 2}" y="${height / 2}" fill="#8b949e" font-family="ui-sans-serif,system-ui" font-size="14" text-anchor="middle">No prediction_accuracy rows — run ops:prediction backtest</text>
</svg>
`;
  }

  const ys = points.flatMap(p => [p.predicted, p.actual]);
  let yMin = Math.min(...ys, 0);
  let yMax = Math.max(...ys, 100);
  if (yMax - yMin < 1) {
    yMin -= 1;
    yMax += 1;
  }
  const xAt = (i: number) =>
    pad.l + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yAt = (v: number) => pad.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;

  const predPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.predicted).toFixed(1)}`)
    .join(' ');
  const actPath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(p.actual).toFixed(1)}`)
    .join(' ');

  const yTicks = 4;
  const grid: string[] = [];
  for (let t = 0; t <= yTicks; t++) {
    const v = yMin + ((yMax - yMin) * t) / yTicks;
    const y = yAt(v);
    grid.push(
      `<line x1="${pad.l}" y1="${y.toFixed(1)}" x2="${width - pad.r}" y2="${y.toFixed(1)}" stroke="#21262d" stroke-width="1"/>`,
      `<text x="${pad.l - 8}" y="${(y + 4).toFixed(1)}" fill="#8b949e" font-size="11" text-anchor="end" font-family="ui-sans-serif,system-ui">${v.toFixed(0)}</text>`
    );
  }

  const first = points[0]!.date;
  const last = points[points.length - 1]!.date;
  const dots = points
    .map(
      (p, i) =>
        `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(p.actual).toFixed(1)}" r="3" fill="#3fb950" opacity="0.9"/>` +
        `<circle cx="${xAt(i).toFixed(1)}" cy="${yAt(p.predicted).toFixed(1)}" r="2.5" fill="#58a6ff" opacity="0.85"/>`
    )
    .join('');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <text x="${pad.l}" y="22" fill="#e6edf3" font-family="ui-sans-serif,system-ui" font-size="14" font-weight="600">${escapeXml(title)}</text>
  ${grid.join('\n  ')}
  <path d="${actPath}" fill="none" stroke="#3fb950" stroke-width="2.5"/>
  <path d="${predPath}" fill="none" stroke="#58a6ff" stroke-width="2.5" stroke-dasharray="6 4"/>
  ${dots}
  <text x="${pad.l}" y="${height - 12}" fill="#8b949e" font-size="11" font-family="ui-sans-serif,system-ui">${escapeXml(first)}</text>
  <text x="${width - pad.r}" y="${height - 12}" fill="#8b949e" font-size="11" text-anchor="end" font-family="ui-sans-serif,system-ui">${escapeXml(last)}</text>
  <g font-family="ui-sans-serif,system-ui" font-size="11">
    <rect x="${width - 150}" y="40" width="12" height="3" fill="#3fb950"/>
    <text x="${width - 134}" y="45" fill="#e6edf3">actual</text>
    <rect x="${width - 150}" y="56" width="12" height="3" fill="#58a6ff"/>
    <text x="${width - 134}" y="61" fill="#e6edf3">predicted</text>
  </g>
</svg>
`;
}

/** Residual / signed-error bars (actual − predicted semantics via `error` field). */
export function buildErrorChartSvg(
  points: ReportSeriesPoint[],
  opts?: { width?: number; height?: number }
): string {
  const width = opts?.width ?? 720;
  const height = opts?.height ?? 200;
  const pad = { l: 48, r: 16, t: 32, b: 36 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;

  if (points.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <text x="${width / 2}" y="${height / 2}" fill="#8b949e" font-family="ui-sans-serif,system-ui" font-size="13" text-anchor="middle">No residuals</text>
</svg>
`;
  }

  const errs = points.map(p => p.error);
  const absMax = Math.max(...errs.map(Math.abs), 1);
  const yMin = -absMax;
  const yMax = absMax;
  const xAt = (i: number) =>
    pad.l + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yAt = (v: number) => pad.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const zeroY = yAt(0);
  const barW = Math.max(4, Math.min(18, (plotW / points.length) * 0.55));

  const bars = points
    .map((p, i) => {
      const x = xAt(i) - barW / 2;
      const y1 = yAt(p.error);
      const top = Math.min(y1, zeroY);
      const h = Math.max(1, Math.abs(y1 - zeroY));
      const fill = p.error >= 0 ? '#f85149' : '#3fb950';
      return `<rect x="${x.toFixed(1)}" y="${top.toFixed(1)}" width="${barW.toFixed(1)}" height="${h.toFixed(1)}" fill="${fill}" opacity="0.85" rx="1"/>`;
    })
    .join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <text x="${pad.l}" y="20" fill="#e6edf3" font-family="ui-sans-serif,system-ui" font-size="13" font-weight="600">Residuals (error) · ±${absMax.toFixed(1)}</text>
  <line x1="${pad.l}" y1="${zeroY.toFixed(1)}" x2="${width - pad.r}" y2="${zeroY.toFixed(1)}" stroke="#30363d" stroke-width="1" stroke-dasharray="4 3"/>
  ${bars}
  <text x="${pad.l}" y="${height - 10}" fill="#8b949e" font-size="11" font-family="ui-sans-serif,system-ui">${escapeXml(points[0]!.date)}</text>
  <text x="${width - pad.r}" y="${height - 10}" fill="#8b949e" font-size="11" text-anchor="end" font-family="ui-sans-serif,system-ui">${escapeXml(points[points.length - 1]!.date)}</text>
  <g font-family="ui-sans-serif,system-ui" font-size="10">
    <rect x="${width - 168}" y="28" width="10" height="10" fill="#f85149" rx="1"/>
    <text x="${width - 154}" y="36" fill="#e6edf3">over-pred (err&gt;0)</text>
    <rect x="${width - 168}" y="44" width="10" height="10" fill="#3fb950" rx="1"/>
    <text x="${width - 154}" y="52" fill="#e6edf3">under-pred (err&lt;0)</text>
  </g>
</svg>
`;
}

/** Shared |error| histogram bins (also embedded in summary.json). */
export function computeHistogramBins(
  points: ReportSeriesPoint[],
  opts?: { buckets?: number; mae?: number }
): HistogramBin[] {
  const bucketCount = opts?.buckets ?? 8;
  if (points.length === 0) return [];
  const absErrs = points.map(p => Math.abs(p.error));
  const maxAbs = Math.max(...absErrs, 1);
  const mae = opts?.mae ?? absErrs.reduce((s, e) => s + e, 0) / absErrs.length;
  const edges: number[] = [];
  for (let i = 0; i <= bucketCount; i++) edges.push((maxAbs * i) / bucketCount);
  const counts = new Array(bucketCount).fill(0) as number[];
  for (const e of absErrs) {
    let idx = Math.min(bucketCount - 1, Math.floor((e / maxAbs) * bucketCount));
    if (e >= maxAbs) idx = bucketCount - 1;
    counts[idx]!++;
  }
  const n = points.length;
  return counts.map((count, i) => {
    const lo = edges[i]!;
    const hi = edges[i + 1]!;
    return {
      lo,
      hi,
      count,
      pct: (100 * count) / n,
      containsMae: mae >= lo && (i === bucketCount - 1 ? mae <= hi : mae < hi),
    };
  });
}

/** Worst-k days by absolute residual. */
export function computeWorstDays(
  points: ReportSeriesPoint[],
  opts?: { k?: number; rmse?: number }
): WorstDay[] {
  const k = Math.min(10, Math.max(1, opts?.k ?? 5));
  const rmse = opts?.rmse ?? 0;
  return [...points]
    .map(p => {
      const absError = Math.abs(p.error);
      return {
        date: p.date,
        predicted: p.predicted,
        actual: p.actual,
        error: p.error,
        absError,
        within5: absError <= 5,
        exceedsRmse: rmse > 0 && absError > rmse,
      };
    })
    .sort((a, b) => b.absError - a.absError)
    .slice(0, k);
}

/** Absolute-error histogram (bucket counts). */
export function buildErrorHistogramSvg(
  points: ReportSeriesPoint[],
  opts?: { width?: number; height?: number; buckets?: number }
): string {
  const width = opts?.width ?? 720;
  const height = opts?.height ?? 200;
  const pad = { l: 48, r: 16, t: 32, b: 40 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;
  const bins = computeHistogramBins(points, { buckets: opts?.buckets ?? 8 });

  if (bins.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <text x="${width / 2}" y="${height / 2}" fill="#8b949e" font-family="ui-sans-serif,system-ui" font-size="13" text-anchor="middle">No |error| distribution</text>
</svg>
`;
  }

  const maxAbs = bins[bins.length - 1]!.hi;
  const maxCount = Math.max(...bins.map(b => b.count), 1);
  const gap = 4;
  const barW = (plotW - gap * (bins.length - 1)) / bins.length;

  const bars = bins
    .map((b, i) => {
      const h = (b.count / maxCount) * plotH;
      const x = pad.l + i * (barW + gap);
      const y = pad.t + plotH - h;
      const fill = b.hi <= 5 ? '#3fb950' : b.hi <= 15 ? '#d29922' : '#f85149';
      const stroke = b.containsMae ? ' stroke="#e6edf3" stroke-width="1.5"' : '';
      return (
        `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="${barW.toFixed(1)}" height="${Math.max(h, b.count > 0 ? 2 : 0).toFixed(1)}" fill="${fill}" opacity="0.9" rx="2"${stroke}/>` +
        `<text x="${(x + barW / 2).toFixed(1)}" y="${height - 14}" fill="#8b949e" font-size="10" text-anchor="middle" font-family="ui-sans-serif,system-ui">${b.lo.toFixed(0)}</text>` +
        (b.count > 0
          ? `<text x="${(x + barW / 2).toFixed(1)}" y="${(y - 4).toFixed(1)}" fill="#e6edf3" font-size="10" text-anchor="middle" font-family="ui-sans-serif,system-ui">${b.count}</text>`
          : '')
      );
    })
    .join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <text x="${pad.l}" y="20" fill="#e6edf3" font-family="ui-sans-serif,system-ui" font-size="13" font-weight="600">|Error| distribution · max ${maxAbs.toFixed(1)}</text>
  ${bars}
  <text x="${width - pad.r}" y="${height - 14}" fill="#8b949e" font-size="10" text-anchor="end" font-family="ui-sans-serif,system-ui">|error| →</text>
</svg>
`;
}

/** Rolling MAE + per-window std band series (shared by SVG + summary.json). */
export function computeRollingSeries(points: ReportSeriesPoint[], window = 7): RollingSeries {
  const w = Math.max(2, window);
  const mae: number[] = [];
  const stdUpper: number[] = [];
  const stdLower: number[] = [];
  for (let i = 0; i < points.length; i++) {
    const from = Math.max(0, i - w + 1);
    const slice = points.slice(from, i + 1);
    const absErrs = slice.map(p => Math.abs(p.error));
    const mean = absErrs.reduce((s, e) => s + e, 0) / slice.length;
    mae.push(mean);
    let std = 0;
    if (slice.length > 1) {
      let varSum = 0;
      for (const e of absErrs) varSum += (e - mean) ** 2;
      std = Math.sqrt(varSum / slice.length);
    }
    stdUpper.push(mean + std);
    stdLower.push(Math.max(0, mean - std));
  }
  const overallMae =
    points.length === 0 ? 0 : points.reduce((s, p) => s + Math.abs(p.error), 0) / points.length;
  return { window: w, mae, stdUpper, stdLower, overallMae };
}

/** Rolling MAE (window) over the series with ±1σ band. */
export function buildRollingMaeSvg(
  points: ReportSeriesPoint[],
  opts?: { width?: number; height?: number; window?: number; rolling?: RollingSeries }
): string {
  const width = opts?.width ?? 720;
  const height = opts?.height ?? 180;
  const window = Math.max(2, opts?.window ?? 7);
  const pad = { l: 48, r: 16, t: 32, b: 36 };
  const plotW = width - pad.l - pad.r;
  const plotH = height - pad.t - pad.b;

  if (points.length === 0) {
    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <text x="${width / 2}" y="${height / 2}" fill="#8b949e" font-family="ui-sans-serif,system-ui" font-size="13" text-anchor="middle">No rolling MAE</text>
</svg>
`;
  }

  const series = opts?.rolling ?? computeRollingSeries(points, window);
  const { mae: rolling, stdUpper, stdLower, overallMae } = series;
  const yMin = 0;
  const yMax = Math.max(...stdUpper, overallMae, ...rolling, 1);
  const xAt = (i: number) =>
    pad.l + (points.length === 1 ? plotW / 2 : (i / (points.length - 1)) * plotW);
  const yAt = (v: number) => pad.t + plotH - ((v - yMin) / (yMax - yMin)) * plotH;
  const path = rolling
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
    .join(' ');
  const upperPath = stdUpper
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`)
    .join(' ');
  const lowerPath = [...stdLower]
    .reverse()
    .map((v, ri) => {
      const i = stdLower.length - 1 - ri;
      return `${ri === 0 ? 'L' : 'L'}${xAt(i).toFixed(1)},${yAt(v).toFixed(1)}`;
    })
    .join(' ');
  const bandPath = `${upperPath} ${lowerPath} Z`;
  const band5 = yAt(5);
  const band15 = yAt(Math.min(15, yMax));
  const overallY = yAt(Math.min(overallMae, yMax));

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <text x="${pad.l}" y="20" fill="#e6edf3" font-family="ui-sans-serif,system-ui" font-size="13" font-weight="600">Rolling MAE · window ${window} · ±1σ</text>
  ${yMax >= 5 ? `<line x1="${pad.l}" y1="${band5.toFixed(1)}" x2="${width - pad.r}" y2="${band5.toFixed(1)}" stroke="#3fb950" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/>` : ''}
  ${yMax >= 15 ? `<line x1="${pad.l}" y1="${band15.toFixed(1)}" x2="${width - pad.r}" y2="${band15.toFixed(1)}" stroke="#d29922" stroke-width="1" stroke-dasharray="3 3" opacity="0.5"/>` : ''}
  <line x1="${pad.l}" y1="${overallY.toFixed(1)}" x2="${width - pad.r}" y2="${overallY.toFixed(1)}" stroke="#8b949e" stroke-width="1" stroke-dasharray="4 4" opacity="0.65"/>
  <path d="${bandPath}" fill="#58a6ff" opacity="0.18"/>
  <path d="${path}" fill="none" stroke="#58a6ff" stroke-width="2.25"/>
  <text x="${pad.l}" y="${height - 10}" fill="#8b949e" font-size="11" font-family="ui-sans-serif,system-ui">${escapeXml(points[0]!.date)}</text>
  <text x="${width - pad.r}" y="${height - 10}" fill="#8b949e" font-size="11" text-anchor="end" font-family="ui-sans-serif,system-ui">${escapeXml(points[points.length - 1]!.date)}</text>
  <text x="${width - pad.r}" y="36" fill="#58a6ff" font-size="11" text-anchor="end" font-family="ui-sans-serif,system-ui">last ${rolling[rolling.length - 1]!.toFixed(2)} · overall ${overallMae.toFixed(2)}</text>
</svg>
`;
}

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function stripXmlDecl(svg: string): string {
  return svg.replace(/^<\?xml[^>]*>\s*/, '');
}

function emptyDiagnostics(): ReportDiagnostics {
  return {
    maxAbsError: 0,
    worstDate: '—',
    meanAbsError: 0,
    lastPredicted: 0,
    lastActual: 0,
    lastSignedError: 0,
    within5Pct: 0,
    within15Pct: 0,
    overCount: 0,
    underCount: 0,
    exactCount: 0,
    firstHalfMae: 0,
    secondHalfMae: 0,
    maeDelta: 0,
    trend: 'unknown',
    errorStdDev: 0,
    qualityLabel: 'No data',
    biasSeverity: 'unknown',
    within5Status: 'unknown',
    within5Target: WITHIN5_TARGET_PCT,
    trendLabel: 'unknown',
    decayDetected: false,
    maeRmseRatio: null,
  };
}

export function reportQuality(a: AccuracySummary): PredictionReportSummary['quality'] {
  return a.n === 0 ? 'unknown' : a.mae <= 5 ? 'good' : a.mae <= 15 ? 'fair' : 'poor';
}

function qualityLabelFrom(q: PredictionReportSummary['quality']): string {
  return q === 'good'
    ? 'Good fit'
    : q === 'fair'
      ? 'Fair fit'
      : q === 'poor'
        ? 'High error'
        : 'No data';
}

function biasSeverityOf(bias: number, n: number): ReportDiagnostics['biasSeverity'] {
  if (n === 0) return 'unknown';
  const a = Math.abs(bias);
  return a <= 1 ? 'low' : a <= 3 ? 'medium' : 'high';
}

function within5StatusOf(pct: number, n: number): ReportDiagnostics['within5Status'] {
  if (n === 0) return 'unknown';
  return pct >= WITHIN5_TARGET_PCT ? 'above_target' : pct >= 50 ? 'marginal' : 'below_target';
}

export function buildOpsStrip(
  d: ReportDiagnostics,
  quality: PredictionReportSummary['quality']
): OpsStrip {
  const w5ok = d.within5Status === 'above_target';
  const trendOk = d.trend === 'improving' || d.trend === 'stable';
  const stripTone: OpsStrip['stripTone'] =
    quality === 'unknown' || d.within5Status === 'unknown'
      ? 'unknown'
      : w5ok && trendOk && quality === 'good'
        ? 'good'
        : !w5ok && d.decayDetected
          ? 'bad'
          : 'warn';
  const arrow =
    d.trend === 'improving'
      ? '↓'
      : d.trend === 'worsening'
        ? '↑'
        : d.trend === 'stable'
          ? '→'
          : '·';
  return {
    stripTone,
    within5Text: `Within 5: ${d.within5Pct.toFixed(0)}% · target ${d.within5Target}%`,
    trendText: `Trend: ${arrow} ${d.trendLabel} · Δ ${d.maeDelta > 0 ? '+' : ''}${d.maeDelta.toFixed(2)}`,
  };
}

/** Plain-English tooltip copy for the stats glance row (coverage % points). */
export function buildStatTooltips(
  a: AccuracySummary,
  stats: ReportDiagnostics
): Record<'n' | 'mae' | 'rmse' | 'bias' | 'within5' | 'trend', string> {
  const ratio = stats.maeRmseRatio;
  const ratioBit =
    ratio != null ? ` Ratio RMSE/MAE (${ratio.toFixed(2)}) indicates outlier severity.` : '';
  const biasDir =
    Math.abs(a.bias) < 0.5
      ? 'near zero is best'
      : a.bias >= 0
        ? 'slight over-prediction'
        : 'slight under-prediction';
  return {
    n: `Number of evaluation days in this report window (${a.n}).`,
    mae: `Mean Absolute Error — average miss in coverage percentage points. Lower is better. Here, typical error is ${a.mae.toFixed(2)}. Good ≤5, fair ≤15.`,
    rmse: `Root Mean Squared Error — penalizes large misses. Always ≥ MAE.${ratioBit}`,
    bias: `Average over/under-prediction (predicted − actual). ${a.bias >= 0 ? '+' : ''}${a.bias.toFixed(2)} means ${biasDir}.`,
    within5: `${stats.within5Pct.toFixed(0)}% of predictions were within 5 coverage points of actual. Target ≥${stats.within5Target}%.`,
    trend: `Half-series MAE trend: ${stats.trendLabel}. Δ ${stats.maeDelta > 0 ? '+' : ''}${stats.maeDelta.toFixed(2)} — positive means errors growing (worsening).`,
  };
}

export function computeReportDiff(
  current: { accuracy: AccuracySummary; diagnostics: ReportDiagnostics },
  previous: ReportPreviousSummary | null
): ReportDiff {
  if (!previous || previous.n === 0) return { available: false };
  const maeDelta = current.accuracy.mae - previous.mae;
  const maePctBetter =
    previous.mae > 0 ? ((previous.mae - current.accuracy.mae) / previous.mae) * 100 : 0;
  const within5Pp = current.diagnostics.within5Pct - previous.within5Pct;
  const biasDelta = current.accuracy.bias - previous.bias;
  const improved = maeDelta < 0 && within5Pp >= 0;
  return { available: true, maeDelta, maePctBetter, within5Pp, biasDelta, improved };
}

export async function readPreviousSummary(
  summaryPath: string
): Promise<ReportPreviousSummary | null> {
  try {
    const f = Bun.file(summaryPath);
    if (!(await f.exists())) return null;
    const s = (await f.json()) as PredictionReportSummary;
    if (!s.accuracy || !s.diagnostics) return null;
    return {
      generatedAt: s.generated ?? '',
      mae: s.accuracy.mae,
      rmse: s.accuracy.rmse,
      bias: s.accuracy.bias,
      within5Pct: s.diagnostics.within5Pct ?? 0,
      n: s.accuracy.n,
      qualityLabel: s.diagnostics.qualityLabel ?? '—',
    };
  } catch {
    return null;
  }
}

/** Series diagnostics for report cards + summary.json. */
export function computeReportDiagnostics(
  points: ReportSeriesPoint[],
  accuracy?: AccuracySummary
): ReportDiagnostics {
  if (points.length === 0) return emptyDiagnostics();
  let maxAbs = -1;
  let worstDate = points[0]!.date;
  let sumAbs = 0;
  let within5 = 0;
  let within15 = 0;
  let over = 0;
  let under = 0;
  let exact = 0;
  let sumErr = 0;
  for (const p of points) {
    const a = Math.abs(p.error);
    sumAbs += a;
    sumErr += p.error;
    if (a > maxAbs) {
      maxAbs = a;
      worstDate = p.date;
    }
    if (a <= 5) within5++;
    if (a <= 15) within15++;
    if (p.error > 0) over++;
    else if (p.error < 0) under++;
    else exact++;
  }
  const n = points.length;
  const meanErr = sumErr / n;
  let varSum = 0;
  for (const p of points) varSum += (p.error - meanErr) ** 2;
  const errorStdDev = Math.sqrt(varSum / n);

  const mid = Math.floor(n / 2) || 1;
  const first = points.slice(0, mid);
  const second = points.slice(mid);
  const mae = (xs: ReportSeriesPoint[]) =>
    xs.length === 0 ? 0 : xs.reduce((s, p) => s + Math.abs(p.error), 0) / xs.length;
  const firstHalfMae = mae(first);
  const secondHalfMae = mae(second.length ? second : first);
  const maeDelta = secondHalfMae - firstHalfMae;
  const trend: ReportDiagnostics['trend'] =
    n < 4
      ? 'unknown'
      : Math.abs(maeDelta) < 0.25
        ? 'stable'
        : maeDelta < 0
          ? 'improving'
          : 'worsening';
  const last = points[points.length - 1]!;
  const acc = accuracy ?? {
    mae: sumAbs / n,
    rmse: 0,
    bias: meanErr,
    n,
  };
  const quality = reportQuality(acc);
  const within5Pct = (100 * within5) / n;
  return {
    maxAbsError: maxAbs,
    worstDate,
    meanAbsError: sumAbs / n,
    lastPredicted: last.predicted,
    lastActual: last.actual,
    lastSignedError: last.error,
    within5Pct,
    within15Pct: (100 * within15) / n,
    overCount: over,
    underCount: under,
    exactCount: exact,
    firstHalfMae,
    secondHalfMae,
    maeDelta,
    trend,
    errorStdDev,
    qualityLabel: qualityLabelFrom(quality),
    biasSeverity: biasSeverityOf(acc.bias, acc.n),
    within5Status: within5StatusOf(within5Pct, acc.n),
    within5Target: WITHIN5_TARGET_PCT,
    trendLabel: trend,
    decayDetected: trend === 'worsening',
    maeRmseRatio: acc.rmse > 0 ? acc.mae / acc.rmse : null,
  };
}

export function buildPredictionReportSummary(opts: {
  points: ReportSeriesPoint[];
  accuracy: AccuracySummary;
  generated: string;
  diagnostics?: ReportDiagnostics;
  /** Include coverage PNG in artifacts when file exists. */
  pngPresent?: boolean;
  worstK?: number;
  previous?: ReportPreviousSummary | null;
  diff?: ReportDiff;
  rolling?: RollingSeries;
}): PredictionReportSummary {
  const diagnostics = opts.diagnostics ?? computeReportDiagnostics(opts.points, opts.accuracy);
  const quality = reportQuality(opts.accuracy);
  const rolling = opts.rolling ?? computeRollingSeries(opts.points);
  const previous = opts.previous ?? null;
  const diff = opts.diff ?? computeReportDiff({ accuracy: opts.accuracy, diagnostics }, previous);
  return {
    schemaVersion: PREDICTION_REPORT_SCHEMA,
    generated: opts.generated,
    model: 'naive-coverage-v1',
    range: {
      from: opts.points[0]?.date ?? null,
      to: opts.points[opts.points.length - 1]?.date ?? null,
    },
    accuracy: opts.accuracy,
    diagnostics,
    quality,
    points: opts.points.length,
    histogramBins: computeHistogramBins(opts.points, { mae: opts.accuracy.mae }),
    worstDays: computeWorstDays(opts.points, {
      k: opts.worstK ?? 5,
      rmse: opts.accuracy.rmse,
    }),
    ops: buildOpsStrip(diagnostics, quality),
    previous,
    diff,
    rolling,
    artifacts: {
      report: '/registry/prediction/report/',
      coverageSvg: '/registry/prediction/coverage-chart.svg',
      errorSvg: '/registry/prediction/error-chart.svg',
      histogramSvg: '/registry/prediction/error-histogram.svg',
      rollingSvg: '/registry/prediction/rolling-mae.svg',
      summaryJson: '/registry/prediction/report/summary.json',
      ...(opts.pngPresent
        ? { coveragePng: '/registry/prediction/coverage-chart.png' as const }
        : {}),
    },
  };
}

export function buildReportHtml(opts: {
  svgInline: string;
  errorSvgInline?: string;
  histogramSvgInline?: string;
  rollingSvgInline?: string;
  accuracy: AccuracySummary;
  points: ReportSeriesPoint[];
  generated: string;
  diagnostics?: ReportDiagnostics;
  /** Optional link to PNG artifact when present at generate time. */
  pngHref?: string;
  previous?: ReportPreviousSummary | null;
  diff?: ReportDiff;
  rolling?: RollingSeries;
}): string {
  const stats = opts.diagnostics ?? computeReportDiagnostics(opts.points, opts.accuracy);
  const a = opts.accuracy;
  const quality = reportQuality(a);
  const tips = buildStatTooltips(a, stats);
  const previous = opts.previous ?? null;
  const diff = opts.diff ?? computeReportDiff({ accuracy: a, diagnostics: stats }, previous);
  const rollingSeries = opts.rolling ?? computeRollingSeries(opts.points);
  const qualityLabel =
    quality === 'good'
      ? 'Good fit'
      : quality === 'fair'
        ? 'Fair fit'
        : quality === 'poor'
          ? 'High error'
          : 'No data';
  const trendLabel =
    stats.trend === 'improving'
      ? 'Improving'
      : stats.trend === 'worsening'
        ? 'Worsening'
        : stats.trend === 'stable'
          ? 'Stable'
          : 'n/a';
  const trendClass =
    stats.trend === 'improving' ? 'good' : stats.trend === 'worsening' ? 'poor' : 'unknown';
  const bins = computeHistogramBins(opts.points, { mae: a.mae });
  const worst = computeWorstDays(opts.points, { k: 5, rmse: a.rmse });
  const ops = buildOpsStrip(stats, quality);
  const w5Tone =
    stats.within5Status === 'above_target'
      ? 'good'
      : stats.within5Status === 'marginal'
        ? 'fair'
        : stats.within5Status === 'below_target'
          ? 'poor'
          : 'unknown';
  const biasTone =
    stats.biasSeverity === 'low'
      ? 'good'
      : stats.biasSeverity === 'medium'
        ? 'fair'
        : stats.biasSeverity === 'high'
          ? 'poor'
          : 'unknown';
  const maxBin = Math.max(...bins.map(b => b.count), 1);
  const miniBars = bins
    .map(b => {
      const w = Math.max(4, Math.round((b.count / maxBin) * 100));
      const fill = b.hi <= 5 ? 'var(--green)' : b.hi <= 15 ? 'var(--yellow)' : 'var(--red)';
      const maeMark = b.containsMae ? ' mae-bin' : '';
      return `<div class="mini-bar${maeMark}" style="width:${w}%;background:${fill}" title="${b.lo.toFixed(1)}–${b.hi.toFixed(1)}: ${b.count} (${b.pct.toFixed(0)}%)${b.containsMae ? ' · MAE here' : ''}"></div>`;
    })
    .join('');
  const worstRows = worst
    .map(d => {
      const flag = d.exceedsRmse ? '<span class="flag" title="|error| &gt; RMSE">•</span>' : '';
      return `<tr class="${d.within5 ? 'err-ok' : 'err-bad'}"><td class="mono">${escapeXml(d.date)}</td><td>${d.actual.toFixed(1)}</td><td>${d.predicted.toFixed(1)}</td><td>${d.error.toFixed(2)}</td><td>${d.within5 ? 'yes' : 'no'}${flag}</td></tr>`;
    })
    .join('\n');

  const allRows = [...opts.points].reverse();
  const rows = allRows
    .map(p => {
      const abs = Math.abs(p.error);
      const cls = abs <= 5 ? 'err-ok' : abs <= 15 ? 'err-mid' : 'err-bad';
      return `<tr class="${cls}" data-abs="${abs.toFixed(4)}">
  <td class="mono">${escapeXml(p.date)}</td>
  <td>${p.predicted.toFixed(2)}</td>
  <td>${p.actual.toFixed(2)}</td>
  <td>${p.error.toFixed(2)}</td>
  <td>${abs.toFixed(2)}</td>
</tr>`;
    })
    .join('\n');

  const errorChart = opts.errorSvgInline
    ? stripXmlDecl(opts.errorSvgInline)
    : stripXmlDecl(buildErrorChartSvg(opts.points));
  const histChart = opts.histogramSvgInline
    ? stripXmlDecl(opts.histogramSvgInline)
    : stripXmlDecl(buildErrorHistogramSvg(opts.points));
  const rollingChart = opts.rollingSvgInline
    ? stripXmlDecl(opts.rollingSvgInline)
    : stripXmlDecl(buildRollingMaeSvg(opts.points, { rolling: rollingSeries }));

  const range =
    opts.points.length > 0
      ? `${escapeXml(opts.points[0]!.date)} → ${escapeXml(opts.points[opts.points.length - 1]!.date)}`
      : '—';

  const emptyBanner =
    a.n === 0
      ? `<div class="status-banner" role="alert">
      <strong>No backtest data.</strong>
      Seed: <code>bun run ops:seed:prediction</code> ·
      Backtest: <code>bun run ops:prediction backtest</code> ·
      Bake: <code>bun run ops:snapshot</code> (or <code>ops:snapshot:demo</code>).
      <a href="/portal/ops/">Ops dashboard</a>
    </div>`
      : '';

  const pngNav = opts.pngHref ? `<a href="${escapeXml(opts.pngHref)}">PNG</a>` : '';

  const whatChanged =
    diff.available && previous
      ? `<details class="what-changed" id="what-changed">
  <summary>What changed? <span class="delta ${diff.improved ? 'delta-good' : 'delta-bad'}">${diff.improved ? 'Improved' : 'Mixed/regressed'}</span></summary>
  <p class="diff-row">
    <span class="${diff.maeDelta! < 0 ? 'delta-good' : diff.maeDelta! > 0 ? 'delta-bad' : ''}">MAE: ${previous.mae.toFixed(2)} → ${a.mae.toFixed(2)} (${diff.maeDelta! < 0 ? '↓' : diff.maeDelta! > 0 ? '↑' : '→'} ${Math.abs(diff.maePctBetter ?? 0).toFixed(0)}% ${diff.maeDelta! < 0 ? 'better' : 'worse'})</span>
    · <span class="${(diff.within5Pp ?? 0) >= 0 ? 'delta-good' : 'delta-bad'}">≤5: ${previous.within5Pct.toFixed(0)}% → ${stats.within5Pct.toFixed(0)}% (${(diff.within5Pp ?? 0) >= 0 ? '↑' : '↓'} ${Math.abs(diff.within5Pp ?? 0).toFixed(0)}pp)</span>
    · <span>Bias: ${previous.bias >= 0 ? '+' : ''}${previous.bias.toFixed(2)} → ${a.bias >= 0 ? '+' : ''}${a.bias.toFixed(2)}</span>
  </p>
  <p class="note">Compared to prior bake ${escapeXml(previous.generatedAt)} (${escapeXml(previous.qualityLabel)}).</p>
</details>`
      : `<details class="what-changed" id="what-changed">
  <summary>What changed?</summary>
  <p class="note">No previous bake to compare.</p>
</details>`;

  const statBlock = (key: keyof typeof tips, label: string, valueHtml: string, sub: string) =>
    `<div class="stat" tabindex="0" role="group" aria-describedby="tip-${key}">
      <div class="label">${label}</div>
      <div class="value">${valueHtml}</div>
      <div class="sub">${sub}</div>
      <div class="tip" id="tip-${key}" role="tooltip">${escapeXml(tips[key])}</div>
    </div>`;

  return `<!DOCTYPE html>
<html lang="en" data-theme="dark">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="dark light"/>
  <meta name="description" content="FactoryWager coverage prediction backtest — MAE, residuals, calibration"/>
  <title>Coverage prediction · FactoryWager</title>
  <link rel="alternate" type="application/json" href="/registry/prediction/report/summary.json"/>
  <style>
    :root, html[data-theme="dark"] {
      color-scheme: dark;
      --bg: #0d1117; --surface: #161b22; --border: #30363d;
      --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
      --green: #3fb950; --red: #f85149; --yellow: #d29922;
      --radius: 8px;
    }
    html[data-theme="light"] {
      color-scheme: light;
      --bg: #ffffff; --surface: #f6f8fa; --border: #d0d7de;
      --text: #1f2328; --muted: #656d76; --accent: #0969da;
      --green: #1a7f37; --red: #cf222e; --yellow: #9a6700;
    }
    * { box-sizing: border-box; }
    body { margin: 0; background: var(--bg); color: var(--text); font-family: ui-sans-serif, system-ui, -apple-system, sans-serif; line-height: 1.45; }
    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }
    .topbar {
      display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between;
      gap: 12px; padding: 14px 24px; border-bottom: 1px solid var(--border);
      background: rgba(22,27,34,.9); position: sticky; top: 0; z-index: 10;
      backdrop-filter: blur(8px);
    }
    .brand { font-weight: 600; font-size: 15px; letter-spacing: .02em; }
    .brand .mark { color: var(--accent); margin-right: 6px; }
    .brand .page { color: var(--muted); font-weight: 500; margin-left: 8px; }
    nav { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; }
    nav a { color: var(--muted); }
    nav a:hover, nav a.active { color: var(--text); }
    .topbar-actions { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .topbar-actions button {
      background: var(--surface); border: 1px solid var(--border); color: var(--text);
      border-radius: 6px; padding: 6px 10px; font-size: 12px; cursor: pointer;
    }
    .topbar-actions button:hover { border-color: var(--accent); }
    main { max-width: 1100px; margin: 0 auto; padding: 24px 20px 48px; }
    .hero { margin-bottom: 8px; }
    .hero h1 { font-size: 22px; margin: 0 0 6px; font-weight: 600; }
    .hero-sub { color: var(--muted); font-size: 14px; margin: 0 0 8px; }
    .meta { font-size: 12px; color: var(--muted); margin: 0 0 16px; font-variant-numeric: tabular-nums; }
    .meta code { background: var(--surface); padding: 1px 6px; border-radius: 4px; font-size: 11px; border: 1px solid var(--border); }
    .status {
      display: inline-block; font-size: 12px; font-weight: 600; padding: 2px 8px;
      border-radius: 6px; border: 1px solid var(--border); margin-left: 8px; vertical-align: middle;
    }
    .status.good { color: var(--green); border-color: rgba(63,185,80,.4); background: rgba(63,185,80,.08); }
    .status.fair { color: var(--yellow); border-color: rgba(210,153,34,.4); background: rgba(210,153,34,.08); }
    .status.poor { color: var(--red); border-color: rgba(248,81,73,.4); background: rgba(248,81,73,.08); }
    .status.unknown { color: var(--muted); }
    .stats-row {
      display: grid; grid-template-columns: repeat(6, 1fr); gap: 12px; margin: 0 0 20px;
    }
    @media (max-width: 900px) { .stats-row { grid-template-columns: repeat(3, 1fr); } }
    @media (max-width: 520px) { .stats-row { grid-template-columns: repeat(2, 1fr); } }
    .stat {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 14px 16px; position: relative;
    }
    .stat:focus { outline: 2px solid var(--accent); outline-offset: 2px; }
    .stat .tip {
      display: none; position: absolute; left: 0; right: 0; top: calc(100% + 6px); z-index: 20;
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 10px 12px; font-size: 12px; color: var(--text); line-height: 1.4;
      box-shadow: 0 8px 24px rgba(0,0,0,.25);
    }
    .stat:hover .tip, .stat:focus-within .tip { display: block; }
    .stat .label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin-bottom: 6px; }
    .stat .value { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .stat .sub { font-size: 11px; color: var(--muted); margin-top: 4px; }
    .panel {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 12px; margin-bottom: 16px;
    }
    .panel h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin: 0 0 10px; font-weight: 600; }
    .chart-grid {
      display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 16px;
    }
    @media (max-width: 840px) { .chart-grid { grid-template-columns: 1fr; } }
    .chart { width: 100%; overflow-x: auto; }
    .chart svg { display: block; max-width: 100%; height: auto; }
    html[data-theme="light"] .chart svg { filter: invert(1) hue-rotate(180deg); }
    .latest {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px;
    }
    @media (max-width: 720px) { .latest { grid-template-columns: repeat(2, 1fr); } }
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 8px 0 12px; font-size: 12px; color: var(--muted); }
    .toolbar input, .toolbar button {
      background: var(--bg); border: 1px solid var(--border); color: var(--text);
      border-radius: 6px; padding: 6px 10px; font-size: 13px;
    }
    .toolbar input { min-width: 160px; }
    .toolbar button { cursor: pointer; }
    .toolbar button:hover { border-color: var(--accent); color: var(--text); }
    .chips { display: flex; flex-wrap: wrap; gap: 6px; }
    .chips button {
      background: transparent; border: 1px solid var(--border); color: var(--muted);
      border-radius: 999px; padding: 4px 10px; font-size: 11px; cursor: pointer;
    }
    .chips button.active, .chips button:hover { color: var(--text); border-color: var(--accent); }
    table { border-collapse: collapse; width: 100%; font-size: 13px; font-variant-numeric: tabular-nums; }
    th, td { text-align: left; padding: 8px 10px; border-bottom: 1px solid #21262d; }
    th { color: var(--muted); font-weight: 500; position: sticky; top: 0; background: var(--surface); cursor: pointer; user-select: none; }
    th:hover { color: var(--text); }
    th .sort { opacity: .4; font-size: 10px; margin-left: 4px; }
    td.mono { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; }
    tr.err-ok td:nth-child(4), tr.err-ok td:nth-child(5) { color: var(--green); }
    tr.err-mid td:nth-child(4), tr.err-mid td:nth-child(5) { color: var(--yellow); }
    tr.err-bad td:nth-child(4), tr.err-bad td:nth-child(5) { color: var(--red); }
    tr.hidden { display: none; }
    .table-wrap { max-height: 420px; overflow: auto; border-radius: 6px; }
    .footer {
      margin-top: 28px; padding-top: 16px; border-top: 1px solid var(--border);
      font-size: 12px; color: var(--muted);
    }
    .footer code { background: var(--surface); padding: 1px 6px; border-radius: 4px; font-size: 11px; border: 1px solid var(--border); }
    .links { display: flex; flex-wrap: wrap; gap: 12px; margin: 8px 0 0; font-size: 13px; }
    .status-banner {
      margin: 0 0 16px; padding: 12px 14px; border-radius: var(--radius);
      background: rgba(210,153,34,.08); border: 1px solid rgba(210,153,34,.35);
      color: var(--yellow); font-size: 13px;
    }
    .status-banner code { background: var(--surface); padding: 1px 6px; border-radius: 4px; font-size: 11px; border: 1px solid var(--border); }
    .status-banner a { margin-left: 8px; }

    .ops-strip {
      display: flex; flex-wrap: wrap; gap: 10px; margin: 0 0 16px; font-size: 12px; font-weight: 600;
    }
    .ops-strip .chip {
      padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); background: var(--surface);
    }
    .ops-strip.good .chip { border-color: rgba(63,185,80,.45); color: var(--green); background: rgba(63,185,80,.08); }
    .ops-strip.warn .chip { border-color: rgba(210,153,34,.45); color: var(--yellow); background: rgba(210,153,34,.08); }
    .ops-strip.bad .chip { border-color: rgba(248,81,73,.45); color: var(--red); background: rgba(248,81,73,.08); }
    .ops-cards {
      display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin: 0 0 20px;
    }
    @media (max-width: 720px) { .ops-cards { grid-template-columns: 1fr; } }
    .ops-card {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 14px 16px; font-size: 13px;
    }
    .ops-card h3 { margin: 0 0 10px; font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); }
    .ops-card ul { margin: 0; padding: 0 0 0 18px; color: var(--text); }
    .ops-card li { margin: 4px 0; }
    .ops-card .card-link { display: inline-block; margin-top: 10px; font-size: 12px; }
    .stat .value.tone-good, .stat .value .tone-good { color: var(--green); }
    .stat .value.tone-fair, .stat .value .tone-fair { color: var(--yellow); }
    .stat .value.tone-poor, .stat .value .tone-poor { color: var(--red); }
    .dist-grid {
      display: grid; grid-template-columns: 1fr 1.2fr; gap: 16px; margin-bottom: 16px;
    }
    @media (max-width: 840px) { .dist-grid { grid-template-columns: 1fr; } }
    .mini-hist { display: flex; align-items: flex-end; gap: 3px; height: 72px; margin: 8px 0 4px; }
    .mini-bar { height: 100%; min-width: 8px; border-radius: 3px 3px 0 0; opacity: .9; }
    .mini-bar.mae-bin { outline: 1px solid var(--text); opacity: 1; }
    .flag { color: var(--red); margin-left: 4px; font-weight: 700; }
    .worst-table { width: 100%; font-size: 12px; }
    .note { font-size: 12px; color: var(--muted); margin: 0 0 8px; }
    .what-changed {
      margin: 0 0 16px; padding: 10px 14px; background: var(--surface);
      border: 1px solid var(--border); border-radius: var(--radius); font-size: 13px;
    }
    .what-changed summary { cursor: pointer; font-weight: 600; }
    .diff-row { margin: 8px 0 4px; font-variant-numeric: tabular-nums; }
    .delta-good { color: var(--green); }
    .delta-bad { color: var(--red); }
    @media print {
      .topbar-actions, nav, .toolbar, .chips, #csv-btn, #filter, #thresh-chips { display: none !important; }
      body { background: #fff; color: #000; }
      .topbar { position: static; background: #fff; border-bottom: 1px solid #ccc; }
      .panel, .stat, .ops-card { break-inside: avoid; border-color: #ccc; }
      .stat .tip { display: none !important; }
      html[data-theme="light"] .chart svg, .chart svg { filter: none !important; }
      a { color: #000; text-decoration: underline; }
    }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="brand"><span class="mark">■</span>FactoryWager<span class="page">Coverage prediction</span></div>
    <div class="topbar-actions">
      <button type="button" id="theme-toggle" aria-label="Toggle light/dark theme">Theme</button>
      <button type="button" id="print-btn">Print</button>
      <button type="button" id="download-btn">Download HTML</button>
    </div>
    <nav aria-label="Primary">
      <a href="/portal/ops/">Ops</a>
      <a href="/portal/dashboard/">Dashboard</a>
      <a href="/portal/health/">Health</a>
      <a href="/monitoring">Monitoring</a>
      <a href="/registry/prediction/report/" class="active">Report</a>
    </nav>
  </header>
  <main>
    <section class="hero">
      <h1>Coverage prediction backtest
        <span class="status ${quality}">${qualityLabel} · ${trendLabel}</span>
      </h1>
      <p class="hero-sub">Backtest accuracy for coverage % (predicted − actual).</p>
      <p class="meta" id="gen-meta">
        ${escapeXml(opts.generated)} · schema v3 · model naive-coverage-v1 · range ${range} ·
        <a href="/registry/prediction/report/summary.json">summary.json</a>
      </p>
    </section>

    ${emptyBanner}

    <div class="ops-strip ${ops.stripTone}" id="ops" aria-label="Ops strip">
      <span class="chip">${escapeXml(ops.within5Text)}</span>
      <span class="chip">${escapeXml(ops.trendText)}</span>
    </div>

    <section class="stats-row" id="glance" aria-label="Fit at a glance">
      ${statBlock('n', 'n', String(a.n), 'backtest rows')}
      ${statBlock('mae', 'MAE', `<span class="tone-${quality}">${a.mae.toFixed(2)}</span>`, 'mean abs error')}
      ${statBlock('rmse', 'RMSE', a.rmse.toFixed(2), `ratio ${stats.maeRmseRatio == null ? '—' : stats.maeRmseRatio.toFixed(2)}`)}
      ${statBlock('bias', 'Bias', `<span class="tone-${biasTone}">${a.bias >= 0 ? '+' : ''}${a.bias.toFixed(2)}</span>`, `${stats.biasSeverity} · mean (pred − actual)`)}
      ${statBlock('within5', 'Within ≤5', `<span class="tone-${w5Tone}">${stats.within5Pct.toFixed(0)}%</span>`, `target ${stats.within5Target}% · ≤15: ${stats.within15Pct.toFixed(0)}%`)}
      ${statBlock('trend', 'Trend', `<span class="tone-${trendClass === 'good' ? 'good' : trendClass === 'poor' ? 'poor' : 'fair'}">${trendLabel}</span>`, `${stats.firstHalfMae.toFixed(2)} → ${stats.secondHalfMae.toFixed(2)} (Δ ${stats.maeDelta > 0 ? '+' : ''}${stats.maeDelta.toFixed(2)})`)}
    </section>

    ${whatChanged}

    <section class="ops-cards" aria-label="Ops summary">
      <div class="ops-card">
        <h3>Quality check</h3>
        <ul>
          <li>${escapeXml(stats.qualityLabel)}</li>
          <li>MAE/RMSE ratio: ${stats.maeRmseRatio == null ? '—' : stats.maeRmseRatio.toFixed(2)}</li>
          <li>Bias ${stats.biasSeverity} (${a.bias >= 0 ? '+' : ''}${a.bias.toFixed(2)})</li>
          <li>≤5 rate ${stats.within5Pct.toFixed(0)}% (target &gt;${stats.within5Target}%)</li>
          <li>σ(errors) ${stats.errorStdDev.toFixed(2)}</li>
        </ul>
        <a class="card-link" href="/registry/prediction/error-histogram.svg">View error distribution →</a>
      </div>
      <div class="ops-card">
        <h3>Trend &amp; stability</h3>
        <ul>
          <li>Half-series trend: ${escapeXml(trendLabel)} (Δ ${stats.maeDelta > 0 ? '+' : ''}${stats.maeDelta.toFixed(2)})</li>
          <li>${stats.decayDetected ? 'Decay warning — second-half MAE rose' : 'No decay detected'}</li>
          <li>First half MAE ${stats.firstHalfMae.toFixed(2)} → second ${stats.secondHalfMae.toFixed(2)}</li>
          <li>Over/under ${stats.overCount}/${stats.underCount} (${stats.exactCount} exact)</li>
        </ul>
        <a class="card-link" href="/registry/prediction/rolling-mae.svg">View rolling performance →</a>
      </div>
    </section>

    <section class="panel" id="charts">
      <h2>Predicted vs actual</h2>
      <div class="chart">${stripXmlDecl(opts.svgInline)}</div>
    </section>

    <div class="chart-grid">
      <section class="panel" style="margin:0">
        <h2>Residuals</h2>
        <p class="note">Signed error (predicted − actual). Red = over-prediction.</p>
        <div class="chart">${errorChart}</div>
      </section>
      <section class="panel" style="margin:0">
        <h2>|Error| distribution</h2>
        <p class="note">Bucket counts · green ≤5 · amber ≤15 · red &gt;15.</p>
        <div class="chart">${histChart}</div>
      </section>
    </div>

    <section class="panel" id="stability">
      <h2>Stability · rolling MAE</h2>
      <p class="note">7-day rolling mean absolute error with ±1σ band and good/fair guides.</p>
      <div class="chart">${rollingChart}</div>
    </section>

    <section class="latest" aria-label="Latest point">
      <div class="stat"><div class="label">Last predicted</div><div class="value">${stats.lastPredicted.toFixed(1)}</div><div class="sub">coverage %</div></div>
      <div class="stat"><div class="label">Last actual</div><div class="value">${stats.lastActual.toFixed(1)}</div><div class="sub">residual ${stats.lastSignedError >= 0 ? '+' : ''}${stats.lastSignedError.toFixed(2)}</div></div>
      <div class="stat"><div class="label">Worst |error|</div><div class="value">${stats.maxAbsError.toFixed(2)}</div><div class="sub">${escapeXml(stats.worstDate)}</div></div>
      <div class="stat"><div class="label">Over / under</div><div class="value">${stats.overCount}/${stats.underCount}</div><div class="sub">${stats.exactCount} exact</div></div>
    </section>

    <section class="panel" id="distribution" aria-label="Error distribution summary">
      <h2>Error distribution summary</h2>
      <div class="dist-grid">
        <div>
          <p class="note">Mini histogram · outlined bar contains MAE · hover for counts.</p>
          <div class="mini-hist">${miniBars || '<span class="note">No bins</span>'}</div>
          <a class="card-link" href="/registry/prediction/error-histogram.svg">Full histogram SVG →</a>
        </div>
        <div>
          <p class="note">Worst ${worst.length} days by |error| · red • exceeds RMSE.</p>
          <table class="worst-table">
            <thead><tr><th>Date</th><th>Actual</th><th>Pred</th><th>Error</th><th>≤5?</th></tr></thead>
            <tbody>
${worstRows || '<tr><td colspan="5">—</td></tr>'}
            </tbody>
          </table>
        </div>
      </div>
    </section>

    <section class="panel" id="series">
      <h2>Series (${opts.points.length} rows)</h2>
      <div class="toolbar">
        <label>Filter <input type="search" id="filter" placeholder="YYYY-MM… or value" autocomplete="off"/></label>
        <div class="chips" id="thresh-chips" role="group" aria-label="Absolute error threshold">
          <button type="button" data-max="" class="active">All</button>
          <button type="button" data-max="5">|err| ≤5</button>
          <button type="button" data-max="15">|err| ≤15</button>
          <button type="button" data-max="bad">|err| &gt;15</button>
        </div>
        <button type="button" id="csv-btn">Download CSV</button>
        <span id="row-count">${opts.points.length} shown</span>
      </div>
      <div class="table-wrap">
        <table id="series-table">
          <thead>
            <tr>
              <th data-col="0">Date<span class="sort">↕</span></th>
              <th data-col="1">Predicted<span class="sort">↕</span></th>
              <th data-col="2">Actual<span class="sort">↕</span></th>
              <th data-col="3">Error<span class="sort">↕</span></th>
              <th data-col="4">|Error|<span class="sort">↕</span></th>
            </tr>
          </thead>
          <tbody>
${rows || '<tr><td colspan="5">No rows — run <code>bun run ops:prediction backtest</code></td></tr>'}
          </tbody>
        </table>
      </div>
    </section>

    <footer class="footer">
      <p>Regenerate: <code>bun run ops:seed:prediction</code> · <code>bun run ops:prediction daily</code> · <code>bun run ops:prediction backtest</code> · <code>bun run ops:prediction report</code> · <code>bun run ops:snapshot</code> · PNG: <code>bun run ops:prediction report --webview</code></p>
      <p>Bands: green ≤5 · amber ≤15 · red &gt;15 abs coverage points. Residual sign matches bias (predicted − actual).</p>
      <div class="links">
        <a href="/portal/ops/">Ops dashboard</a>
        <a href="/registry/prediction/report/summary.json">summary.json</a>
        <a href="/registry/prediction/coverage-chart.svg">coverage SVG</a>
        <a href="/registry/prediction/error-chart.svg">residuals SVG</a>
        <a href="/registry/prediction/error-histogram.svg">histogram SVG</a>
        <a href="/registry/prediction/rolling-mae.svg">rolling MAE SVG</a>
        ${pngNav}
      </div>
    </footer>
  </main>
  <script>
    (function () {
      const input = document.getElementById('filter');
      const tbody = document.querySelector('#series-table tbody');
      const count = document.getElementById('row-count');
      const chips = document.getElementById('thresh-chips');
      const csvBtn = document.getElementById('csv-btn');
      if (!tbody) return;
      const rows = Array.from(tbody.querySelectorAll('tr'));
      let maxMode = '';

      function rowVisible(tr) {
        const q = (input && input.value || '').trim().toLowerCase();
        const textOk = !q || (tr.textContent || '').toLowerCase().includes(q);
        const abs = Number(tr.getAttribute('data-abs') || '0');
        let threshOk = true;
        if (maxMode === '5') threshOk = abs <= 5;
        else if (maxMode === '15') threshOk = abs <= 15;
        else if (maxMode === 'bad') threshOk = abs > 15;
        return textOk && threshOk;
      }

      function refresh() {
        let n = 0;
        for (const tr of rows) {
          const show = rowVisible(tr);
          tr.classList.toggle('hidden', !show);
          if (show) n++;
        }
        if (count) count.textContent = n + ' shown';
      }
      if (input) input.addEventListener('input', refresh);

      if (chips) {
        chips.querySelectorAll('button[data-max]').forEach(btn => {
          btn.addEventListener('click', () => {
            maxMode = btn.getAttribute('data-max') || '';
            chips.querySelectorAll('button').forEach(b => b.classList.toggle('active', b === btn));
            refresh();
          });
        });
      }

      if (csvBtn) {
        csvBtn.addEventListener('click', () => {
          const lines = ['date,predicted,actual,error,abs_error,quality_band'];
          for (const tr of rows) {
            if (tr.classList.contains('hidden')) continue;
            const cells = Array.from(tr.children).map(td => (td.textContent || '').trim());
            if (cells.length < 5) continue;
            const abs = Number(cells[4]);
            const band = abs <= 5 ? 'ok' : abs <= 15 ? 'mid' : 'bad';
            lines.push(cells.join(',') + ',' + band);
          }
          const blob = new Blob([lines.join('\\n') + '\\n'], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'coverage-prediction-series.csv';
          a.click();
          URL.revokeObjectURL(url);
        });
      }

      let sortCol = -1;
      let sortAsc = true;
      document.querySelectorAll('#series-table th[data-col]').forEach(th => {
        th.addEventListener('click', () => {
          const col = Number(th.getAttribute('data-col'));
          if (sortCol === col) sortAsc = !sortAsc;
          else { sortCol = col; sortAsc = col === 0; }
          const sorted = rows.slice().sort((a, b) => {
            const ta = a.children[col]?.textContent?.trim() || '';
            const tb = b.children[col]?.textContent?.trim() || '';
            const na = Number(ta); const nb = Number(tb);
            let cmp;
            if (!Number.isNaN(na) && !Number.isNaN(nb) && ta !== '' && tb !== '') cmp = na - nb;
            else cmp = ta.localeCompare(tb);
            return sortAsc ? cmp : -cmp;
          });
          for (const tr of sorted) tbody.appendChild(tr);
          refresh();
        });
      });
    })();

    (function themeExport() {
      const KEY = 'fw-prediction-report-theme';
      const root = document.documentElement;
      const meta = document.querySelector('meta[name="color-scheme"]');
      const btn = document.getElementById('theme-toggle');
      function apply(theme) {
        root.setAttribute('data-theme', theme);
        if (meta) meta.setAttribute('content', theme === 'light' ? 'light' : 'dark');
        if (btn) btn.textContent = theme === 'light' ? 'Dark' : 'Light';
      }
      const stored = localStorage.getItem(KEY);
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      apply(stored === 'light' || stored === 'dark' ? stored : prefersDark ? 'dark' : 'light');
      if (btn) {
        btn.addEventListener('click', () => {
          const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
          localStorage.setItem(KEY, next);
          apply(next);
        });
      }
      const printBtn = document.getElementById('print-btn');
      if (printBtn) printBtn.addEventListener('click', () => window.print());
      const dlBtn = document.getElementById('download-btn');
      if (dlBtn) {
        dlBtn.addEventListener('click', () => {
          const html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
          const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = 'prediction-report-' + new Date().toISOString().slice(0, 10) + '.html';
          a.click();
          URL.revokeObjectURL(url);
        });
      }
    })();
  </script>
</body>
</html>
`;
}

/**
 * Write SVG + HTML report under outDir.
 * When `webview: true`, screenshot via Bun.WebView and polish with Bun.Image → PNG.
 */
export async function writePredictionReport(
  db: Database,
  opts?: {
    outDir?: string;
    webview?: boolean;
    /** Prefer series from a just-run backtest instead of DB. */
    series?: PredictionTest[];
  }
): Promise<PredictionReportResult> {
  const outDir = opts?.outDir ?? DEFAULT_OUT;

  const points: ReportSeriesPoint[] = opts?.series
    ? opts.series.map(r => ({
        date: r.date,
        predicted: r.predictedValue,
        actual: r.actualValue,
        error: r.predictedValue - r.actualValue,
      }))
    : loadCoverageSeries(db);

  const accuracy = getPredictionAccuracy(db, 'coverage');
  const diagnostics = computeReportDiagnostics(points, accuracy);
  const rollingSeries = computeRollingSeries(points);
  const svg = buildCoverageChartSvg(points, accuracy);
  const errorSvg = buildErrorChartSvg(points);
  const histogramSvg = buildErrorHistogramSvg(points);
  const rollingSvg = buildRollingMaeSvg(points, { rolling: rollingSeries });
  const generated = new Date().toISOString();
  const svgPath = `${outDir}/coverage-chart.svg`;
  const errorSvgPath = `${outDir}/error-chart.svg`;
  const histogramSvgPath = `${outDir}/error-histogram.svg`;
  const rollingSvgPath = `${outDir}/rolling-mae.svg`;
  const htmlPath = `${outDir}/report/index.html`;
  const summaryPath = `${outDir}/report/summary.json`;
  const pngOut = `${outDir}/coverage-chart.png`;
  const pngHrefAbs = '/registry/prediction/coverage-chart.png';

  const previous = await readPreviousSummary(summaryPath);
  const diff = computeReportDiff({ accuracy, diagnostics }, previous);

  await Bun.write(svgPath, svg);
  await Bun.write(errorSvgPath, errorSvg);
  await Bun.write(histogramSvgPath, histogramSvg);
  await Bun.write(rollingSvgPath, rollingSvg);

  let pngPath: string | undefined;
  let openedWebView = false;

  const htmlOpts = {
    svgInline: svg,
    errorSvgInline: errorSvg,
    histogramSvgInline: histogramSvg,
    rollingSvgInline: rollingSvg,
    accuracy,
    points,
    generated,
    diagnostics,
    previous,
    diff,
    rolling: rollingSeries,
    pngHref: undefined as string | undefined,
  };

  // Absolute PNG href — report lives under /report/, file is sibling of report/
  let hasPng = await Bun.file(pngOut).exists();
  htmlOpts.pngHref = hasPng ? pngHrefAbs : undefined;
  let html = buildReportHtml(htmlOpts);

  if (opts?.webview) {
    pngPath = await captureReportWithWebView(html, pngOut);
    openedWebView = true;
    hasPng = true;
    htmlOpts.pngHref = pngHrefAbs;
    html = buildReportHtml(htmlOpts);
  }

  const summary = buildPredictionReportSummary({
    points,
    accuracy,
    generated,
    diagnostics,
    pngPresent: hasPng,
    previous,
    diff,
    rolling: rollingSeries,
  });

  await Bun.$`mkdir -p ${outDir}/report`.quiet();
  await Bun.write(htmlPath, html);
  await Bun.write(summaryPath, JSON.stringify(summary, null, 2) + '\n');

  return {
    outDir,
    svgPath,
    htmlPath,
    summaryPath,
    pngPath: pngPath ?? (hasPng ? pngOut : undefined),
    points: points.length,
    accuracy,
    diagnostics,
    openedWebView,
  };
}

/**
 * Headless WebView renders HTML (data URL) → screenshot → Bun.Image PNG.
 */
export async function captureReportWithWebView(
  htmlOrPath: string,
  pngOut: string
): Promise<string> {
  if (typeof Bun.WebView !== 'function') {
    throw new Error('Bun.WebView not available in this Bun build');
  }

  let html = htmlOrPath;
  if (!htmlOrPath.includes('<html') && (await Bun.file(htmlOrPath).exists())) {
    html = await Bun.file(htmlOrPath).text();
  }
  const dataUrl = `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;

  await using view = new Bun.WebView({ headless: true });
  await view.navigate(dataUrl);
  await Bun.sleep(250);
  const shot = await view.screenshot();
  const polished = await new Bun.Image(shot)
    .resize(960, 540, { fit: 'inside', withoutEnlargement: true })
    .png()
    .bytes();
  await Bun.write(pngOut, polished);
  return pngOut;
}
