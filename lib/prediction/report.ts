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
  error: number;
};

export type PredictionReportResult = {
  outDir: string;
  svgPath: string;
  htmlPath: string;
  pngPath?: string;
  points: number;
  accuracy: AccuracySummary;
  openedWebView: boolean;
};

const DEFAULT_OUT = 'public/registry/prediction';

/** Load coverage series from prediction_accuracy (or empty). */
export function loadCoverageSeries(db: Database, limit = 60): ReportSeriesPoint[] {
  ensurePredictionSchema(db);
  const rows = db
    .query(
      `SELECT prediction_date, predicted_value, actual_value, error
       FROM prediction_accuracy
       WHERE prediction_type = 'coverage'
       ORDER BY prediction_date ASC
       LIMIT $n`
    )
    .all({ $n: limit }) as Array<{
    prediction_date: string;
    predicted_value: number;
    actual_value: number;
    error: number;
  }>;
  return rows.map(r => ({
    date: r.prediction_date,
    predicted: r.predicted_value,
    actual: r.actual_value,
    error: r.error,
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
    <rect x="${width - 160}" y="28" width="10" height="10" fill="#f85149" rx="1"/>
    <text x="${width - 146}" y="36" fill="#e6edf3">over (err&gt;0)</text>
    <rect x="${width - 160}" y="44" width="10" height="10" fill="#3fb950" rx="1"/>
    <text x="${width - 146}" y="52" fill="#e6edf3">under (err&lt;0)</text>
  </g>
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

function seriesStats(points: ReportSeriesPoint[]) {
  if (points.length === 0) {
    return {
      maxAbsError: 0,
      worstDate: '—',
      meanAbsError: 0,
      lastPredicted: 0,
      lastActual: 0,
    };
  }
  let maxAbs = -1;
  let worstDate = points[0]!.date;
  let sumAbs = 0;
  for (const p of points) {
    const a = Math.abs(p.error);
    sumAbs += a;
    if (a > maxAbs) {
      maxAbs = a;
      worstDate = p.date;
    }
  }
  const last = points[points.length - 1]!;
  return {
    maxAbsError: maxAbs,
    worstDate,
    meanAbsError: sumAbs / points.length,
    lastPredicted: last.predicted,
    lastActual: last.actual,
  };
}

export function buildReportHtml(opts: {
  svgInline: string;
  errorSvgInline?: string;
  accuracy: AccuracySummary;
  points: ReportSeriesPoint[];
  generated: string;
  /** Optional link to PNG artifact when present at generate time. */
  pngHref?: string;
}): string {
  const stats = seriesStats(opts.points);
  const a = opts.accuracy;
  const quality = a.n === 0 ? 'unknown' : a.mae <= 5 ? 'good' : a.mae <= 15 ? 'fair' : 'poor';
  const qualityLabel =
    quality === 'good'
      ? 'Good fit'
      : quality === 'fair'
        ? 'Fair fit'
        : quality === 'poor'
          ? 'High error'
          : 'No data';

  const allRows = [...opts.points].reverse();
  const rows = allRows
    .map(p => {
      const abs = Math.abs(p.error);
      const cls = abs <= 5 ? 'err-ok' : abs <= 15 ? 'err-mid' : 'err-bad';
      return `<tr class="${cls}">
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

  const range =
    opts.points.length > 0
      ? `${escapeXml(opts.points[0]!.date)} → ${escapeXml(opts.points[opts.points.length - 1]!.date)}`
      : '—';

  const emptyBanner =
    a.n === 0
      ? `<div class="empty-banner">
      <strong>No backtest data.</strong>
      Run <code>bun run ops:snapshot:demo</code> (seed + snapshot) or
      <code>bun run ops:prediction backtest</code> then <code>bun run ops:snapshot</code>.
      <a href="/portal/ops/">← Ops dashboard</a>
    </div>`
      : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <meta name="color-scheme" content="dark"/>
  <title>Coverage prediction · FactoryWager</title>
  <style>
    :root {
      --bg: #0d1117; --surface: #161b22; --border: #30363d;
      --text: #e6edf3; --muted: #8b949e; --accent: #58a6ff;
      --green: #3fb950; --red: #f85149; --yellow: #d29922;
      --radius: 8px;
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
    .logo { font-weight: 600; font-size: 15px; letter-spacing: .02em; }
    .logo span { color: var(--accent); margin-right: 6px; }
    nav { display: flex; flex-wrap: wrap; gap: 14px; font-size: 13px; }
    nav a { color: var(--muted); }
    nav a:hover, nav a.active { color: var(--text); }
    main { max-width: 960px; margin: 0 auto; padding: 24px 20px 48px; }
    h1 { font-size: 22px; margin: 0 0 6px; font-weight: 600; }
    .lede { color: var(--muted); font-size: 13px; margin: 0 0 20px; }
    .badge {
      display: inline-block; font-size: 11px; font-weight: 600; padding: 2px 8px;
      border-radius: 999px; border: 1px solid var(--border); vertical-align: middle; margin-left: 8px;
    }
    .badge.good { color: var(--green); border-color: rgba(63,185,80,.4); background: rgba(63,185,80,.08); }
    .badge.fair { color: var(--yellow); border-color: rgba(210,153,34,.4); background: rgba(210,153,34,.08); }
    .badge.poor { color: var(--red); border-color: rgba(248,81,73,.4); background: rgba(248,81,73,.08); }
    .badge.unknown { color: var(--muted); }
    .cards {
      display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px;
    }
    @media (max-width: 720px) { .cards { grid-template-columns: repeat(2, 1fr); } }
    .card {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 14px 16px;
    }
    .card .label { font-size: 11px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin-bottom: 6px; }
    .card .value { font-size: 22px; font-weight: 600; font-variant-numeric: tabular-nums; }
    .card .sub { font-size: 11px; color: var(--muted); margin-top: 4px; }
    .panel {
      background: var(--surface); border: 1px solid var(--border); border-radius: var(--radius);
      padding: 12px; margin-bottom: 16px;
    }
    .panel h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .04em; color: var(--muted); margin: 0 0 10px; font-weight: 600; }
    .chart { width: 100%; overflow-x: auto; }
    .chart svg { display: block; max-width: 100%; height: auto; }
    .toolbar { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; margin: 8px 0 12px; font-size: 12px; color: var(--muted); }
    .toolbar input {
      background: var(--bg); border: 1px solid var(--border); color: var(--text);
      border-radius: 6px; padding: 6px 10px; font-size: 13px; min-width: 160px;
    }
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
    .links { display: flex; flex-wrap: wrap; gap: 12px; margin: 12px 0 0; font-size: 13px; }
    .empty-banner {
      margin: 0 0 16px; padding: 12px 14px; border-radius: var(--radius);
      background: rgba(210,153,34,.08); border: 1px solid rgba(210,153,34,.35);
      color: var(--yellow); font-size: 13px;
    }
    .empty-banner code { background: var(--surface); padding: 1px 6px; border-radius: 4px; font-size: 11px; border: 1px solid var(--border); }
    .empty-banner a { margin-left: 8px; }
  </style>
</head>
<body>
  <header class="topbar">
    <div class="logo"><span>■</span> Coverage prediction</div>
    <nav>
      <a href="/portal/ops/">Ops</a>
      <a href="/monitoring">Monitoring</a>
      <a href="/registry/ops-summary.json">ops-summary</a>
      <a href="/registry/static.json">static</a>
      <a href="/registry/prediction/coverage-chart.svg">SVG</a>
      ${opts.pngHref ? `<a href="${escapeXml(opts.pngHref)}">PNG</a>` : ''}
      <a href="/registry/prediction/report.html" class="active">Report</a>
    </nav>
  </header>
  <main>
    <h1>Coverage prediction backtest
      <span class="badge ${quality}">${qualityLabel}</span>
    </h1>
    <p class="lede">Generated ${escapeXml(opts.generated)} · range ${range} · model naive coverage % · static Pages artifact from <code>ops:prediction report</code> / <code>ops:snapshot</code></p>

    ${emptyBanner}

    <div class="cards">
      <div class="card">
        <div class="label">n</div>
        <div class="value">${a.n}</div>
        <div class="sub">backtest rows</div>
      </div>
      <div class="card">
        <div class="label">MAE</div>
        <div class="value">${a.mae.toFixed(2)}</div>
        <div class="sub">mean abs error</div>
      </div>
      <div class="card">
        <div class="label">RMSE</div>
        <div class="value">${a.rmse.toFixed(2)}</div>
        <div class="sub">root mean square</div>
      </div>
      <div class="card">
        <div class="label">Bias</div>
        <div class="value">${a.bias.toFixed(2)}</div>
        <div class="sub">mean signed error</div>
      </div>
    </div>

    <div class="cards">
      <div class="card">
        <div class="label">Worst |error|</div>
        <div class="value">${stats.maxAbsError.toFixed(2)}</div>
        <div class="sub">${escapeXml(stats.worstDate)}</div>
      </div>
      <div class="card">
        <div class="label">Mean |error|</div>
        <div class="value">${stats.meanAbsError.toFixed(2)}</div>
        <div class="sub">series absolute</div>
      </div>
      <div class="card">
        <div class="label">Last predicted</div>
        <div class="value">${stats.lastPredicted.toFixed(1)}</div>
        <div class="sub">coverage %</div>
      </div>
      <div class="card">
        <div class="label">Last actual</div>
        <div class="value">${stats.lastActual.toFixed(1)}</div>
        <div class="sub">coverage %</div>
      </div>
    </div>

    <section class="panel">
      <h2>Predicted vs actual</h2>
      <div class="chart">${stripXmlDecl(opts.svgInline)}</div>
    </section>

    <section class="panel">
      <h2>Residuals</h2>
      <div class="chart">${errorChart}</div>
    </section>

    <section class="panel">
      <h2>Series (${opts.points.length} rows)</h2>
      <div class="toolbar">
        <label>Filter date <input type="search" id="filter" placeholder="YYYY-MM…" autocomplete="off"/></label>
        <span id="row-count">${opts.points.length} shown</span>
      </div>
      <div class="table-wrap">
        <table id="series">
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
      <div class="links">
        <a href="/portal/ops/">← Ops dashboard</a>
        <a href="/api/operations/summary">Live ops summary API</a>
        <a href="/registry/prediction/coverage-chart.svg">Open SVG</a>
      </div>
    </section>

    <footer class="footer">
      <p>Regenerate: <code>bun run ops:snapshot:demo</code> · <code>bun run ops:prediction report</code> · <code>bun run ops:snapshot</code> · optional PNG: <code>bun run ops:prediction report --webview</code></p>
      <p>Error coloring: green ≤5 · amber ≤15 · red &gt;15 absolute points of coverage %.</p>
    </footer>
  </main>
  <script>
    (function () {
      const input = document.getElementById('filter');
      const tbody = document.querySelector('#series tbody');
      const count = document.getElementById('row-count');
      if (!input || !tbody) return;
      const rows = Array.from(tbody.querySelectorAll('tr'));
      function refresh() {
        const q = (input.value || '').trim().toLowerCase();
        let n = 0;
        for (const tr of rows) {
          const show = !q || tr.textContent.toLowerCase().includes(q);
          tr.classList.toggle('hidden', !show);
          if (show) n++;
        }
        if (count) count.textContent = n + ' shown';
      }
      input.addEventListener('input', refresh);

      let sortCol = -1;
      let sortAsc = true;
      document.querySelectorAll('#series th[data-col]').forEach(th => {
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
        error: r.error,
      }))
    : loadCoverageSeries(db);

  const accuracy = getPredictionAccuracy(db, 'coverage');
  const svg = buildCoverageChartSvg(points, accuracy);
  const errorSvg = buildErrorChartSvg(points);
  const generated = new Date().toISOString();
  const svgPath = `${outDir}/coverage-chart.svg`;
  const errorSvgPath = `${outDir}/error-chart.svg`;
  const htmlPath = `${outDir}/report.html`;
  const pngOut = `${outDir}/coverage-chart.png`;

  await Bun.write(svgPath, svg);
  await Bun.write(errorSvgPath, errorSvg);

  let pngPath: string | undefined;
  let openedWebView = false;

  // Draft HTML for WebView capture (PNG link optional until file exists)
  let hasPng = await Bun.file(pngOut).exists();
  let html = buildReportHtml({
    svgInline: svg,
    errorSvgInline: errorSvg,
    accuracy,
    points,
    generated,
    pngHref: hasPng ? 'coverage-chart.png' : undefined,
  });

  if (opts?.webview) {
    pngPath = await captureReportWithWebView(html, pngOut);
    openedWebView = true;
    hasPng = true;
    html = buildReportHtml({
      svgInline: svg,
      errorSvgInline: errorSvg,
      accuracy,
      points,
      generated,
      pngHref: 'coverage-chart.png',
    });
  }

  await Bun.write(htmlPath, html);

  return {
    outDir,
    svgPath,
    htmlPath,
    pngPath: pngPath ?? (hasPng ? pngOut : undefined),
    points: points.length,
    accuracy,
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
