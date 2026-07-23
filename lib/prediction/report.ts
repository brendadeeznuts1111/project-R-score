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

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#0d1117"/>
  <text x="${pad.l}" y="22" fill="#e6edf3" font-family="ui-sans-serif,system-ui" font-size="14" font-weight="600">${escapeXml(title)}</text>
  ${grid.join('\n  ')}
  <path d="${actPath}" fill="none" stroke="#3fb950" stroke-width="2.5"/>
  <path d="${predPath}" fill="none" stroke="#58a6ff" stroke-width="2.5" stroke-dasharray="6 4"/>
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

function escapeXml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildReportHtml(opts: {
  svgInline: string;
  accuracy: AccuracySummary;
  points: ReportSeriesPoint[];
  generated: string;
}): string {
  const rows = opts.points
    .slice(-20)
    .reverse()
    .map(
      p =>
        `<tr><td>${escapeXml(p.date)}</td><td>${p.predicted.toFixed(2)}</td><td>${p.actual.toFixed(2)}</td><td>${p.error.toFixed(2)}</td></tr>`
    )
    .join('\n');
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1"/>
  <title>Coverage prediction report</title>
  <style>
    body { margin: 0; background: #0d1117; color: #e6edf3; font-family: ui-sans-serif, system-ui, sans-serif; padding: 24px; }
    h1 { font-size: 18px; margin: 0 0 8px; }
    .meta { color: #8b949e; font-size: 13px; margin-bottom: 16px; }
    .chart { max-width: 100%; background: #161b22; border-radius: 8px; padding: 8px; border: 1px solid #30363d; }
    table { border-collapse: collapse; width: 100%; max-width: 720px; margin-top: 20px; font-size: 13px; }
    th, td { text-align: left; padding: 6px 10px; border-bottom: 1px solid #21262d; }
    th { color: #8b949e; font-weight: 500; }
  </style>
</head>
<body>
  <h1>Coverage prediction backtest</h1>
  <p class="meta">Generated ${escapeXml(opts.generated)} · n=${opts.accuracy.n} · MAE ${opts.accuracy.mae.toFixed(2)} · RMSE ${opts.accuracy.rmse.toFixed(2)} · bias ${opts.accuracy.bias.toFixed(2)}</p>
  <div class="chart">${opts.svgInline.replace(/^<\?xml[^>]*>\s*/, '')}</div>
  <table>
    <thead><tr><th>Date</th><th>Predicted</th><th>Actual</th><th>Error</th></tr></thead>
    <tbody>
${rows || '<tr><td colspan="4">No rows</td></tr>'}
    </tbody>
  </table>
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
  const generated = new Date().toISOString();
  const html = buildReportHtml({ svgInline: svg, accuracy, points, generated });

  const svgPath = `${outDir}/coverage-chart.svg`;
  const htmlPath = `${outDir}/report.html`;
  // Bun.write creates parent directories
  await Bun.write(svgPath, svg);
  await Bun.write(htmlPath, html);

  let pngPath: string | undefined;
  let openedWebView = false;

  if (opts?.webview) {
    pngPath = await captureReportWithWebView(html, `${outDir}/coverage-chart.png`);
    openedWebView = true;
  }

  return {
    outDir,
    svgPath,
    htmlPath,
    pngPath,
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
