// @see https://bun.com/docs/runtime/utils#bun-version — Bun.version
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/docs/runtime/image — Bun.Image
/**
 * Generate SVG charts for limit detection data.
 * Used by snapshot tool to produce visual artifacts.
 */
import { write, file } from 'bun';

// ── Colors ────────────────────────────────────────────────────────────────
const CHART_COLORS = {
  bg: '#f8f9fa',
  text: '#333',
  dim: '#666',
  border: '#ddd',
  green: '#16a34a',
  red: '#dc2626',
  blue: '#2563eb',
  amber: '#f59e0b',
  barBg: '#e5e7eb',
};

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Chart: Limit changes overview ─────────────────────────────────────────
export function generateLimitChartSvg(data: {
  raises: number;
  decreases: number;
  netDelta: number;
  avgScore: number | null;
  books: number;
  partners: number;
  changes?: Array<{
    sportsbook: string;
    direction: string;
    previous_max: number;
    new_limit: number;
  }>;
  predictionAccuracy?: {
    mae: number;
    rmse: number;
    bias: number;
    n: number;
  };
  /** ISO timestamp for footer (tests pass a fixed value for stable snapshots). */
  generatedAt?: string;
  /** Runtime label override for deterministic tests; defaults to the active Bun version. */
  bunVersion?: string;
}): string {
  const lines: string[] = [];
  let y = 25;
  const leftX = 20;

  // Header
  lines.push(
    `<text x="${leftX}" y="${y}" font-family="system-ui" font-size="16" font-weight="bold" fill="${CHART_COLORS.text}">🚀 Limit Changes Snapshot</text>`
  );
  y += 30;

  // Summary metrics
  const metrics = [
    `Total changes: ${data.raises + data.decreases}`,
    `🚀 Raises: ${data.raises}`,
    data.decreases > 0 ? `⬇️ Decreases: ${data.decreases}` : null,
    `Net: ${data.netDelta >= 0 ? '+' : ''}$${Math.abs(data.netDelta).toLocaleString()}`,
    data.avgScore != null ? `Avg score: ${(data.avgScore * 100).toFixed(0)}%` : null,
    `Books: ${data.books}`,
    `Partners: ${data.partners}`,
  ].filter((metric): metric is string => metric !== null);

  for (const m of metrics) {
    lines.push(
      `<text x="${leftX}" y="${y}" font-family="system-ui" font-size="12" fill="${CHART_COLORS.dim}">${esc(m)}</text>`
    );
    y += 18;
  }

  y += 10;

  // Bar chart: top changes
  if (data.changes && data.changes.length > 0) {
    lines.push(
      `<text x="${leftX}" y="${y}" font-family="system-ui" font-size="14" font-weight="bold" fill="${CHART_COLORS.text}">Recent Changes</text>`
    );
    y += 25;

    const barMax = 400;
    const barH = 18;
    const maxDelta = Math.max(
      1,
      ...data.changes.map(c => Math.abs((c.new_limit ?? 0) - (c.previous_max ?? 0)))
    );

    for (const c of data.changes.slice(0, 5)) {
      const delta = (c.new_limit ?? 0) - (c.previous_max ?? 0);
      const barW = Math.max(20, (Math.abs(delta) / maxDelta) * barMax);
      const isUp = c.direction !== 'down';
      const color = isUp ? CHART_COLORS.green : CHART_COLORS.red;
      const icon = isUp ? '🚀' : '⬇️';

      // Label
      lines.push(
        `<text x="${leftX}" y="${y + 12}" font-family="system-ui" font-size="11" fill="${CHART_COLORS.text}">${icon} ${esc(c.sportsbook)}</text>`
      );
      // Bar
      lines.push(
        `<rect x="120" y="${y}" width="${barW.toFixed(0)}" height="${barH}" fill="${color}" rx="3" opacity="0.8"/>`
      );
      // Value
      lines.push(
        `<text x="${125 + barW}" y="${y + 13}" font-family="system-ui" font-size="11" fill="${color}">${delta >= 0 ? '+' : ''}$${Math.abs(delta).toLocaleString()}</text>`
      );
      y += 24;
    }
  }

  y += 15;

  // Prediction accuracy
  if (data.predictionAccuracy && data.predictionAccuracy.n > 0) {
    const p = data.predictionAccuracy;
    lines.push(
      `<line x1="${leftX}" y1="${y}" x2="580" y2="${y}" stroke="${CHART_COLORS.border}" stroke-width="1"/>`
    );
    y += 20;
    lines.push(
      `<text x="${leftX}" y="${y}" font-family="system-ui" font-size="14" font-weight="bold" fill="${CHART_COLORS.text}">Prediction Accuracy (n=${p.n})</text>`
    );
    y += 22;
    lines.push(
      `<text x="${leftX}" y="${y}" font-family="system-ui" font-size="12" fill="${CHART_COLORS.dim}">MAE: ${p.mae.toFixed(4)} | RMSE: ${p.rmse.toFixed(4)} | Bias: ${p.bias.toFixed(4)}</text>`
    );
  }

  // Footer
  y += 25;
  lines.push(
    `<line x1="${leftX}" y1="${y}" x2="580" y2="${y}" stroke="${CHART_COLORS.border}" stroke-width="1"/>`
  );
  y += 18;
  const generatedAt = data.generatedAt ?? new Date().toISOString().slice(0, 19);
  lines.push(
    `<text x="${leftX}" y="${y}" font-family="system-ui" font-size="10" fill="${CHART_COLORS.dim}">Generated: ${esc(generatedAt)} | Bun ${esc(data.bunVersion ?? Bun.version)}</text>`
  );

  const svg = [
    `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="${y + 10}" viewBox="0 0 600 ${y + 10}">`,
    `<rect width="600" height="${y + 10}" fill="${CHART_COLORS.bg}" rx="8"/>`,
    ...lines,
    '</svg>',
  ].join('\n');

  return svg;
}

// ── Write chart as SVG and optionally rasterize via Bun.Image ──────────────
export async function writeChartArtifacts(
  data: Parameters<typeof generateLimitChartSvg>[0],
  basePath: string
): Promise<{ svgPath: string; pngPath?: string }> {
  const svg = generateLimitChartSvg(data);
  const svgPath = `${basePath}.svg`;
  await write(svgPath, svg);

  let pngPath: string | undefined;
  try {
    const img = new Bun.Image(file(svgPath));
    const buf = img.toBuffer();
    if (buf) {
      pngPath = `${basePath}.png`;
      await write(pngPath, buf);
    }
  } catch {}

  return { svgPath, pngPath };
}
