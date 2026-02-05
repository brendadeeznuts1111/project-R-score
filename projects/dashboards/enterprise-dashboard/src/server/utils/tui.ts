/**
 * TUI formatting utilities for ASCII dashboard.
 * Uses Bun.stringWidth and Bun.color for alignment and gradients.
 */

import { stringWidth, color } from "bun";

export const c = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bgBlue: "\x1b[44m",
  ok: "\x1b[36m",
  err: "\x1b[35m",
  warn: "\x1b[33m",
};

let BOX_WIDTH = getBoxWidthInternal();

function getBoxWidthInternal(): number {
  const termWidth = process.stdout?.columns || 80;
  return Math.max(58, Math.min(termWidth - 2, 118));
}

export function getBoxWidth(): number {
  return BOX_WIDTH;
}

let resizeHandler: (() => void) | null = null;

export function setupResizeHandler(debug?: (label: string, data?: unknown) => void): void {
  if (resizeHandler) {
    process.stdout?.off?.("resize", resizeHandler);
  }
  resizeHandler = () => {
    BOX_WIDTH = getBoxWidthInternal();
    debug?.("Terminal resized", { columns: process.stdout?.columns, BOX_WIDTH });
  };
  process.stdout?.on?.("resize", resizeHandler);
}

export function padRight(text: string, width: number): string {
  const currentWidth = stringWidth(text);
  return text + " ".repeat(Math.max(0, width - currentWidth));
}

export function truncateToWidth(text: string, maxWidth: number): string {
  if (stringWidth(text) <= maxWidth) return text;
  let result = "";
  let width = 0;
  for (const char of text) {
    const charWidth = stringWidth(char);
    if (width + charWidth + 3 > maxWidth) return result + "...";
    result += char;
    width += charWidth;
  }
  return result;
}

export function createBadge(icon: string, label: string, colorName: string = c.white): string {
  return `${icon} ${c.bold}${colorName}${label}${c.reset}`;
}

export function createPill(label: string, colorName: string = c.white): string {
  return `[ ${c.bold}${colorName}${label}${c.reset} ]`;
}

export function formatBoxLine(content: string, width: number, borderColor: string = c.cyan): string {
  const currentWidth = stringWidth(content);
  const padding = " ".repeat(Math.max(0, width - currentWidth));
  return `${borderColor}║${c.reset} ${content}${padding} ${borderColor}║${c.reset}`;
}

export function healthToAnsi(pct: number): string {
  pct = Math.max(0, Math.min(100, pct));
  const magenta = color("#d946ef", "[rgb]");
  const yellow = color("#facc15", "[rgb]");
  const cyan = color("#22d3ee", "[rgb]");
  if (!magenta || !yellow || !cyan) return c.white;

  let r: number, g: number, b: number;
  if (pct < 50) {
    const t = pct / 50;
    r = Math.floor(magenta[0] * (1 - t) + yellow[0] * t);
    g = Math.floor(magenta[1] * (1 - t) + yellow[1] * t);
    b = Math.floor(magenta[2] * (1 - t) + yellow[2] * t);
  } else {
    const t = (pct - 50) / 50;
    r = Math.floor(yellow[0] * (1 - t) + cyan[0] * t);
    g = Math.floor(yellow[1] * (1 - t) + cyan[1] * t);
    b = Math.floor(yellow[2] * (1 - t) + cyan[2] * t);
  }
  return `\x1b[38;2;${r};${g};${b}m`;
}

export function renderHealthBar(pct: number, width: number = 8): string {
  const filled = Math.round((pct / 100) * width);
  const empty = width - filled;
  const ansiColor = healthToAnsi(pct);
  return `${ansiColor}${"█".repeat(filled)}${c.dim}${"░".repeat(empty)}${c.reset}`;
}

export function getThermalColor(pct: number): string {
  pct = Math.max(0, Math.min(100, pct));
  const cold = color("blue", "[rgb]");
  const cool = color("cyan", "[rgb]");
  const warm = color("yellow", "[rgb]");
  const hot = color("red", "[rgb]");
  if (!cold || !cool || !warm || !hot) return c.white;

  let r: number, g: number, b: number;
  if (pct < 25) {
    const t = pct / 25;
    r = Math.floor(cold[0] * (1 - t) + cool[0] * t);
    g = Math.floor(cold[1] * (1 - t) + cool[1] * t);
    b = Math.floor(cold[2] * (1 - t) + cool[2] * t);
  } else if (pct < 50) {
    const t = (pct - 25) / 25;
    r = Math.floor(cool[0] * (1 - t) + warm[0] * t);
    g = Math.floor(cool[1] * (1 - t) + warm[1] * t);
    b = Math.floor(cool[2] * (1 - t) + warm[2] * t);
  } else if (pct < 75) {
    const t = (pct - 50) / 25;
    r = Math.floor(warm[0] * (1 - t) + hot[0] * t);
    g = Math.floor(warm[1] * (1 - t) + hot[1] * t);
    b = Math.floor(warm[2] * (1 - t) + hot[2] * t);
  } else {
    r = hot[0];
    g = hot[1];
    b = hot[2];
  }
  return `\x1b[38;2;${r};${g};${b}m`;
}

/**
 * Create a queue utilization badge with worker status
 */
export function createQueueBadge(stats: { isThrottled: boolean; utilizationPercent: number; active: number; maxConcurrent: number; pending: number }): string {
  const icon = stats.isThrottled ? "🔴" : stats.utilizationPercent > 50 ? "🟡" : "🟢";
  const thermalColor = getThermalColor(stats.utilizationPercent);
  const activeBar = "█".repeat(Math.min(8, stats.active));
  const emptyBar = "░".repeat(Math.max(0, 8 - stats.active));
  return `${icon} ${c.dim}Workers:${c.reset} ${thermalColor}[${activeBar}${c.dim}${emptyBar}${thermalColor}]${c.reset} ${stats.active}/${stats.maxConcurrent} ${stats.pending > 0 ? `${c.yellow}+${stats.pending} queued${c.reset}` : ""}`;
}

export function renderProgressBar(
  percent: number,
  width: number = 16,
  showPercent: boolean = true
): string {
  percent = Math.max(0, Math.min(100, percent));
  const filled = Math.round((percent / 100) * width);
  const empty = width - filled;
  const thermalColor = getThermalColor(percent);
  const bar = `${thermalColor}${"█".repeat(filled)}${c.dim}${"░".repeat(empty)}${c.reset}`;
  return showPercent ? `[ ${bar} ] ${thermalColor}${percent.toFixed(0)}%${c.reset}` : `[ ${bar} ]`;
}

export function formatBytes(bytes: number, decimals: number = 1): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
  return `${(bytes / Math.pow(k, i)).toFixed(decimals)} ${sizes[i]}`;
}

export function formatUptimeLong(seconds: number): string {
  const d = Math.floor(seconds / 86400);
  const h = Math.floor((seconds % 86400) / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}
