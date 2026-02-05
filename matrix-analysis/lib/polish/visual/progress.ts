// lib/polish/visual/progress.ts - Animated Progress Bar
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime, ANSI, colors } from "../core/runtime.ts";
import type { ProgressBarOptions } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Progress Bar Characters
// ─────────────────────────────────────────────────────────────────────────────

const BAR_CHARS = {
  standard: { complete: "█", incomplete: "░" },
  smooth: { complete: "▓", incomplete: "░" },
  blocks: { complete: "■", incomplete: "□" },
  arrows: { complete: "▸", incomplete: "▹" },
} as const;

// ─────────────────────────────────────────────────────────────────────────────
// AnimatedProgressBar Class
// ─────────────────────────────────────────────────────────────────────────────

export class AnimatedProgressBar {
  private width: number;
  private filledChar: string;
  private emptyChar: string;
  private showPercentage: boolean;
  private showETA: boolean;
  private gradient: boolean;

  private current = 0;
  private total = 100;
  private startTime = 0;
  private lastRender = 0;
  private text = "";
  private stream = process.stdout;

  constructor(options: ProgressBarOptions = {}) {
    this.width = options.width ?? Math.min(40, Runtime.getTerminalWidth() - 20);
    this.filledChar = options.complete ?? BAR_CHARS.standard.complete;
    this.emptyChar = options.incomplete ?? BAR_CHARS.standard.incomplete;
    this.showPercentage = options.showPercentage ?? true;
    this.showETA = options.showETA ?? true;
    this.gradient = options.gradient ?? Runtime.supportsColors;
  }

  start(total: number, text = ""): this {
    this.total = total;
    this.current = 0;
    this.text = text;
    this.startTime = Date.now();
    this.lastRender = 0;

    if (Runtime.supportsTTY) {
      this.stream.write(ANSI.hideCursor);
    }
    this.render();
    return this;
  }

  update(current: number, text?: string): this {
    this.current = Math.min(current, this.total);
    if (text !== undefined) this.text = text;

    // Throttle renders to 60fps
    const now = Date.now();
    if (now - this.lastRender >= 16) {
      this.render();
      this.lastRender = now;
    }
    return this;
  }

  increment(amount = 1, text?: string): this {
    return this.update(this.current + amount, text);
  }

  stop(): this {
    if (Runtime.supportsTTY) {
      this.stream.write(`\n${ANSI.showCursor}`);
    }
    return this;
  }

  complete(text?: string): this {
    this.current = this.total;
    this.render();
    this.stop();
    if (text) {
      console.log(`${colors.success("✓")} ${text}`);
    }
    return this;
  }

  private render(): void {
    const progress = this.total > 0 ? this.current / this.total : 0;
    const filled = Math.round(this.width * progress);
    const empty = this.width - filled;

    let bar: string;
    if (this.gradient && Runtime.supportsColors) {
      bar = this.renderGradientBar(filled, empty);
    } else {
      bar = this.filledChar.repeat(filled) + this.emptyChar.repeat(empty);
    }

    const parts: string[] = [];

    // Text prefix
    if (this.text) {
      parts.push(this.text);
    }

    // Progress bar
    parts.push(`[${bar}]`);

    // Percentage
    if (this.showPercentage) {
      const pct = Math.round(progress * 100).toString().padStart(3);
      parts.push(`${pct}%`);
    }

    // ETA
    if (this.showETA && this.current > 0 && this.current < this.total) {
      const eta = this.calculateETA();
      if (eta) {
        parts.push(colors.dim(`ETA: ${eta}`));
      }
    }

    const line = parts.join(" ");

    if (Runtime.supportsTTY) {
      this.stream.write(`${ANSI.clearLine}\r${line}`);
    }
  }

  private renderGradientBar(filled: number, empty: number): string {
    // Gradient from red -> yellow -> green based on progress
    const progress = filled / this.width;

    let color: string;
    if (progress < 0.33) {
      color = ANSI.red;
    } else if (progress < 0.66) {
      color = ANSI.yellow;
    } else {
      color = ANSI.green;
    }

    const filledPart = `${color}${this.filledChar.repeat(filled)}${ANSI.reset}`;
    const emptyPart = `${ANSI.dim}${this.emptyChar.repeat(empty)}${ANSI.reset}`;

    return filledPart + emptyPart;
  }

  private calculateETA(): string | null {
    const elapsed = Date.now() - this.startTime;
    const rate = this.current / elapsed;
    const remaining = this.total - this.current;
    const etaMs = remaining / rate;

    if (!Number.isFinite(etaMs) || etaMs < 0) return null;

    if (etaMs < 1000) return "<1s";
    if (etaMs < 60000) return `${Math.round(etaMs / 1000)}s`;
    if (etaMs < 3600000) return `${Math.round(etaMs / 60000)}m`;
    return `${Math.round(etaMs / 3600000)}h`;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Simple Progress Indicator
// ─────────────────────────────────────────────────────────────────────────────

export function progressIndicator(
  current: number,
  total: number,
  width = 20
): string {
  const progress = total > 0 ? current / total : 0;
  const filled = Math.round(width * progress);
  const empty = width - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);
  const pct = Math.round(progress * 100).toString().padStart(3);

  return `[${bar}] ${pct}%`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Async Iteration Progress
// ─────────────────────────────────────────────────────────────────────────────

export async function* withProgress<T>(
  items: T[],
  text = "Processing"
): AsyncGenerator<T, void, unknown> {
  const bar = new AnimatedProgressBar();
  bar.start(items.length, text);

  for (let i = 0; i < items.length; i++) {
    yield items[i];
    bar.update(i + 1);
  }

  bar.complete();
}
