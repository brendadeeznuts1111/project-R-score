// lib/polish/visual/spinner.ts - CLI Loading Spinner
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime, ANSI, colors } from "../core/runtime.ts";
import type { SpinnerOptions } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Spinner Frames
// ─────────────────────────────────────────────────────────────────────────────

export const SPINNER_FRAMES = {
  dots: ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"],
  line: ["-", "\\", "|", "/"],
  arrow: ["←", "↖", "↑", "↗", "→", "↘", "↓", "↙"],
  bounce: ["⠁", "⠂", "⠄", "⡀", "⢀", "⠠", "⠐", "⠈"],
  circle: ["◐", "◓", "◑", "◒"],
  square: ["◰", "◳", "◲", "◱"],
  pulse: ["█", "▓", "▒", "░", "▒", "▓"],
} as const;

export type SpinnerStyle = keyof typeof SPINNER_FRAMES;

// ─────────────────────────────────────────────────────────────────────────────
// LoadingSpinner Class
// ─────────────────────────────────────────────────────────────────────────────

export class LoadingSpinner {
  private frames: string[];
  private interval: number;
  private frameIndex = 0;
  private timer: Timer | null = null;
  private text = "";
  private stream = process.stdout;
  private isSpinning = false;
  private startTime = 0;

  constructor(options: SpinnerOptions = {}) {
    this.frames = options.frames ?? SPINNER_FRAMES.dots;
    this.interval = options.interval ?? 80;
    if (options.text) this.text = options.text;
  }

  private render(): void {
    if (!Runtime.supportsTTY) {
      // Non-TTY: just print text updates without animation
      return;
    }

    const frame = this.frames[this.frameIndex];
    const line = `${ANSI.clearLine}\r${colors.info(frame)} ${this.text}`;
    this.stream.write(line);
    this.frameIndex = (this.frameIndex + 1) % this.frames.length;
  }

  start(text?: string): this {
    if (text) this.text = text;
    if (this.isSpinning) return this;

    this.isSpinning = true;
    this.startTime = Date.now();
    this.frameIndex = 0;

    if (Runtime.supportsTTY) {
      this.stream.write(ANSI.hideCursor);
      this.render();
      this.timer = setInterval(() => this.render(), this.interval);
    } else {
      // Non-TTY: print once
      console.log(`◌ ${this.text}...`);
    }

    return this;
  }

  stop(): this {
    if (!this.isSpinning) return this;

    this.isSpinning = false;
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    if (Runtime.supportsTTY) {
      this.stream.write(`${ANSI.clearLine}\r${ANSI.showCursor}`);
    }

    return this;
  }

  succeed(text?: string): this {
    this.stop();
    const elapsed = this.getElapsed();
    const message = text ?? this.text;
    console.log(`${colors.success("✓")} ${message} ${colors.dim(`(${elapsed})`)}`);
    return this;
  }

  fail(text?: string): this {
    this.stop();
    const elapsed = this.getElapsed();
    const message = text ?? this.text;
    console.log(`${colors.error("✗")} ${message} ${colors.dim(`(${elapsed})`)}`);
    return this;
  }

  warn(text?: string): this {
    this.stop();
    const elapsed = this.getElapsed();
    const message = text ?? this.text;
    console.log(`${colors.warning("⚠")} ${message} ${colors.dim(`(${elapsed})`)}`);
    return this;
  }

  info(text?: string): this {
    this.stop();
    const message = text ?? this.text;
    console.log(`${colors.info("ℹ")} ${message}`);
    return this;
  }

  update(text: string): this {
    this.text = text;
    if (!Runtime.supportsTTY && this.isSpinning) {
      console.log(`  ${text}`);
    }
    return this;
  }

  private getElapsed(): string {
    const ms = Date.now() - this.startTime;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  }

  // Static factory methods
  static create(style: SpinnerStyle = "dots"): LoadingSpinner {
    return new LoadingSpinner({ frames: SPINNER_FRAMES[style] });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Convenience Function
// ─────────────────────────────────────────────────────────────────────────────

export async function withSpinner<T>(
  text: string,
  operation: () => Promise<T>,
  style: SpinnerStyle = "dots"
): Promise<T | null> {
  const spinner = LoadingSpinner.create(style);
  spinner.start(text);

  try {
    const result = await operation();
    spinner.succeed();
    return result;
  } catch (error) {
    spinner.fail();
    console.error(colors.dim(`  ${error instanceof Error ? error.message : String(error)}`));
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Multi-step Spinner
// ─────────────────────────────────────────────────────────────────────────────

export interface Step {
  text: string;
  action: () => Promise<void>;
}

export async function runSteps(steps: Step[]): Promise<boolean> {
  const spinner = new LoadingSpinner();

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];
    const prefix = colors.dim(`[${i + 1}/${steps.length}]`);
    spinner.start(`${prefix} ${step.text}`);

    try {
      await step.action();
      spinner.succeed(`${prefix} ${step.text}`);
    } catch (error) {
      spinner.fail(`${prefix} ${step.text}`);
      console.error(
        colors.dim(`  ${error instanceof Error ? error.message : String(error)}`)
      );
      return false;
    }
  }

  return true;
}
