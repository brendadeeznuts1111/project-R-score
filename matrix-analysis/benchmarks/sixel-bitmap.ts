#!/usr/bin/env bun
/**
 * SIXEL Bitmap Graphics Generator
 * Creates actual pixel-based charts using SIXEL protocol
 *
 * Works with: Ghostty, iTerm2, mlterm, foot, WezTerm
 * @usage bun run benchmarks/sixel-bitmap.ts
 */

// SIXEL protocol constants
const DCS = "\x1bP"; // Device Control String
const ST = "\x1b\\"; // String Terminator
const CAN = "\x18"; // Cancel

interface ChartData {
  label: string;
  value: number;
  color: [number, number, number]; // RGB
}

/** Convert RGB to SIXEL color register */
function regColor(idx: number, [r, g, b]: [number, number, number]): string {
  return `#${idx};2;${Math.floor(r * 100 / 255)};${Math.floor(g * 100 / 255)};${Math.floor(b * 100 / 255)}`;
}

/** Create a horizontal bar in SIXEL format */
function sixelBar(
  width: number,
  height: number,
  colorIdx: number,
  yPos: number,
): string {
  const lines: string[] = [];

  // Move to Y position
  if (yPos > 0) {
    lines.push(`@${yPos}`);
  }

  // Draw bar line by line
  for (let row = 0; row < height; row++) {
    let line = `#${colorIdx}`;

    // Calculate how many full 6-pixel chunks
    const fullChunks = Math.floor(width / 6);
    const remainder = width % 6;

    // Full chunks (all 6 pixels set = 0x3F = '?' character)
    for (let i = 0; i < fullChunks; i++) {
      line += "?";
    }

    // Partial chunk
    if (remainder > 0) {
      // Create partial: bits 5-(6-remainder) set
      const val = (1 << remainder) - 1;
      line += String.fromCharCode(0x3F + (val << (6 - remainder)));
    }

    lines.push(line);

    // Move to next line (except last)
    if (row < height - 1) {
      lines.push("-");
    }
  }

  return lines.join("");
}

/** Generate a bitmap bar chart */
function generateBarChart(data: ChartData[], opts: {
  width?: number;
  barHeight?: number;
  gap?: number;
  title?: string;
} = {}): string {
  const {
    width = 400,
    barHeight = 30,
    gap = 10,
    title = "Benchmark Results",
  } = opts;

  const maxValue = Math.max(...data.map((d) => d.value));
  let sixel = `${DCS}q"1;1`; // Set raster attributes

  // Register colors
  data.forEach((d, i) => {
    sixel += regColor(i + 1, d.color);
  });

  // Title area (skip for now, add text later)
  sixel += "-".repeat(20);

  // Draw each bar
  let currentY = 30; // Start after title space
  data.forEach((d, i) => {
    const barWidth = Math.floor((d.value / maxValue) * width);
    sixel += sixelBar(barWidth, barHeight, i + 1, currentY);
    currentY += barHeight + gap;
  });

  sixel += ST;
  return sixel;
}

/** Simple pixel buffer approach for better graphics */
class PixelBuffer {
  width: number;
  height: number;
  data: Uint8Array;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.data = new Uint8Array(width * height);
  }

  set(x: number, y: number, color: number) {
    if (x >= 0 && x < this.width && y >= 0 && y < this.height) {
      this.data[y * this.width + x] = color;
    }
  }

  drawRect(x: number, y: number, w: number, h: number, color: number) {
    for (let dy = 0; dy < h; dy++) {
      for (let dx = 0; dx < w; dx++) {
        this.set(x + dx, y + dy, color);
      }
    }
  }

  drawBar(x: number, y: number, w: number, h: number, color: number) {
    // Rounded corners effect
    this.drawRect(x, y, w, h, color);
    // Highlight top edge
    for (let dx = 2; dx < w - 2; dx++) {
      this.set(x + dx, y + 1, Math.min(color + 1, 15));
    }
  }

  /** Convert to SIXEL format */
  toSixel(palette: [number, number, number][]): string {
    let sixel = `${DCS}q"1;1`;

    // Register palette
    palette.forEach((rgb, i) => {
      sixel += regColor(i + 1, rgb);
    });

    // Encode pixel data in 6-pixel vertical slices
    for (let y = 0; y < this.height; y += 6) {
      const rowData: Map<number, number[]> = new Map();

      // Group pixels by color for this 6-pixel band
      for (let x = 0; x < this.width; x++) {
        for (let bit = 0; bit < 6 && y + bit < this.height; bit++) {
          const color = this.data[(y + bit) * this.width + x];
          if (color > 0) {
            if (!rowData.has(color)) rowData.set(color, []);
            const arr = rowData.get(color)!;
            if (!arr[x]) arr[x] = 0;
            arr[x] |= 1 << bit;
          }
        }
      }

      // Output color runs
      rowData.forEach((pixels, color) => {
        sixel += `#${color}`;
        for (let x = 0; x < this.width; x++) {
          const val = pixels[x] || 0;
          sixel += String.fromCharCode(0x3F + val);
        }
      });

      // Line feed to next 6-pixel band
      sixel += "-";
    }

    sixel += ST;
    return sixel;
  }
}

/** Generate a visual benchmark chart */
function generateBenchmarkChart(): string {
  const benchmarks = [
    { name: "Buffer(8)", value: 16.03, color: [14, 165, 233] as [number, number, number] }, // Cyan
    { name: "Buffer(64)", value: 14.32, color: [34, 197, 94] as [number, number, number] }, // Green
    { name: "padStart", value: 20.96, color: [234, 179, 8] as [number, number, number] }, // Yellow
    { name: "async/await", value: 6.63, color: [217, 70, 239] as [number, number, number] }, // Magenta
    { name: "wrapAnsi", value: 2.75, color: [239, 68, 68] as [number, number, number] }, // Red
  ];

  const WIDTH = 320;
  const HEIGHT = 180;
  const BAR_HEIGHT = 24;
  const GAP = 12;
  const LEFT_MARGIN = 100;
  const TOP_MARGIN = 20;

  const buf = new PixelBuffer(WIDTH, HEIGHT);
  const maxValue = Math.max(...benchmarks.map((b) => b.value));

  // Background
  buf.drawRect(0, 0, WIDTH, HEIGHT, 0);

  // Draw bars
  benchmarks.forEach((b, i) => {
    const barWidth = Math.floor((b.value / maxValue) * (WIDTH - LEFT_MARGIN - 20));
    const y = TOP_MARGIN + i * (BAR_HEIGHT + GAP);

    // Label background
    buf.drawRect(5, y, 90, BAR_HEIGHT, 0);

    // Bar
    buf.drawBar(LEFT_MARGIN, y, barWidth, BAR_HEIGHT, i + 1);
  });

  // Generate SIXEL with palette
  const palette = [
    [0, 0, 0], // 0: Black/transparent
    ...benchmarks.map((b) => b.color),
  ];

  // For now, use simpler approach - text + basic bars
  return generateTextWithBars(benchmarks);
}

/** Generate text + simple SIXEL bars */
function generateTextWithBars(benchmarks: Array<{
  name: string;
  value: number;
  color: [number, number, number];
}>): string {
  const maxValue = Math.max(...benchmarks.map((b) => b.value));
  const lines: string[] = [];

  // Header
  lines.push("");
  lines.push(`${DCS}q"1;1`);

  // Register colors
  benchmarks.forEach((b, i) => {
    lines.push(regColor(i + 1, b.color));
  });

  lines.push("#0!80~"); // Gray separator line

  // Each bar as SIXEL + text label
  benchmarks.forEach((b, i) => {
    const barWidth = Math.floor((b.value / maxValue) * 200);
    const colorIdx = i + 1;

    // Draw colored bar
    let bar = `#${colorIdx}`;
    const chunks = Math.floor(barWidth / 6);
    for (let c = 0; c < chunks; c++) bar += "?";
    const rem = barWidth % 6;
    if (rem > 0) {
      bar += String.fromCharCode(0x3F + ((1 << rem) - 1) << (6 - rem));
    }

    lines.push(bar);
    lines.push("-"); // Next line
  });

  lines.push(ST);

  // Add text labels (regular ANSI)
  const textOutput = benchmarks.map((b, i) => {
    const pct = Math.round((b.value / maxValue) * 100);
    return `${b.name.padEnd(12)} ${"█".repeat(pct / 5)} ${b.value.toFixed(2)}M ops/s`;
  }).join("\n");

  return lines.join("") + "\n" + textOutput;
}

/** Detect SIXEL support */
function detectSixelSupport(): boolean {
  const term = process.env.TERM || "";
  const termProgram = process.env.TERM_PROGRAM || "";

  const supportedTerms = ["ghostty", "iTerm", "mlterm", "foot", "wezterm"];
  const supported = supportedTerms.some((t) =>
    term.toLowerCase().includes(t.toLowerCase()) ||
    termProgram.toLowerCase().includes(t.toLowerCase())
  );

  return supported;
}

/** Main */
function main() {
  const args = process.argv.slice(2);
  const force = args.includes("--force");
  const text = args.includes("--text");

  if (text) {
    // ASCII only
    const benchmarks = [
      { name: "Buffer(8)", value: 16.03, color: [14, 165, 233] as [number, number, number] },
      { name: "Buffer(64)", value: 14.32, color: [34, 197, 94] as [number, number, number] },
      { name: "padStart", value: 20.96, color: [234, 179, 8] as [number, number, number] },
      { name: "async/await", value: 6.63, color: [217, 70, 239] as [number, number, number] },
      { name: "wrapAnsi", value: 2.75, color: [239, 68, 68] as [number, number, number] },
    ];

    const max = Math.max(...benchmarks.map((b) => b.value));
    benchmarks.forEach((b) => {
      const bar = "█".repeat(Math.round((b.value / max) * 40));
      console.log(`${b.name.padEnd(12)} │${bar}│ ${b.value.toFixed(2)}M`);
    });
    return;
  }

  if (!detectSixelSupport() && !force) {
    console.log("SIXEL not detected. Use --force to try anyway, or --text for ASCII.");
    console.log("Supported: Ghostty, iTerm2, mlterm, foot, WezTerm");
    return;
  }

  // Output SIXEL graphics
  console.log(generateBenchmarkChart());
}

main();
