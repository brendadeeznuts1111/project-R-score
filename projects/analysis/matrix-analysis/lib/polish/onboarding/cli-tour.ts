// lib/polish/onboarding/cli-tour.ts - CLI-specific Tour Implementation
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime, ANSI, colors } from "../core/runtime.ts";
import { logger } from "../core/logger.ts";
import { AnimatedProgressBar } from "../visual/progress.ts";
import { typeText } from "../visual/terminal-animation.ts";
import { BaseTour, type TourBuilder } from "./tour.ts";
import type { TourConfig, TourStep } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// CLI Tour Implementation
// ─────────────────────────────────────────────────────────────────────────────

export class CLITour extends BaseTour {
  private progressBar: AnimatedProgressBar | null = null;

  constructor(config: TourConfig) {
    super(config);
  }

  protected async showStep(index: number): Promise<void> {
    const step = this.config.steps[index];
    if (!step) return;

    // Clear previous output
    if (Runtime.supportsTTY) {
      console.log();
    }

    // Show progress indicator
    this.showProgress(index);

    // Show step content
    await this.displayStep(step);

    // Execute step action if any
    if (step.action) {
      await step.action();
    }

    // Show navigation hint
    this.showNavigationHint(index);
  }

  private showProgress(currentIndex: number): void {
    const total = this.config.steps.length;
    const progress = `[${currentIndex + 1}/${total}]`;
    const bar = this.createProgressBar(currentIndex, total);

    console.log(colors.dim(`${progress} ${bar}`));
  }

  private createProgressBar(current: number, total: number): string {
    const width = 20;
    const filled = Math.round((current / (total - 1)) * width) || 0;
    const empty = width - filled;

    return (
      colors.info("━".repeat(filled)) +
      colors.dim("─".repeat(empty))
    );
  }

  private async displayStep(step: TourStep): Promise<void> {
    // Title with box
    const titleWidth = Math.min(Runtime.getTerminalWidth() - 4, 60);
    const titlePadding = Math.floor((titleWidth - step.title.length - 2) / 2);

    console.log(colors.info("╭" + "─".repeat(titleWidth) + "╮"));
    console.log(
      colors.info("│") +
      " ".repeat(titlePadding) +
      colors.bold(step.title) +
      " ".repeat(titleWidth - titlePadding - step.title.length) +
      colors.info("│")
    );
    console.log(colors.info("├" + "─".repeat(titleWidth) + "┤"));

    // Content with word wrap
    const contentLines = this.wrapText(step.content, titleWidth - 2);
    for (const line of contentLines) {
      console.log(colors.info("│") + " " + line.padEnd(titleWidth - 1) + colors.info("│"));
    }

    console.log(colors.info("╰" + "─".repeat(titleWidth) + "╯"));

    // Show target hint if present
    if (step.target) {
      console.log();
      console.log(colors.dim(`  📍 Try: ${step.target}`));
    }
  }

  private wrapText(text: string, maxWidth: number): string[] {
    const words = text.split(" ");
    const lines: string[] = [];
    let currentLine = "";

    for (const word of words) {
      if (currentLine.length + word.length + 1 <= maxWidth) {
        currentLine += (currentLine ? " " : "") + word;
      } else {
        if (currentLine) lines.push(currentLine);
        currentLine = word;
      }
    }
    if (currentLine) lines.push(currentLine);

    return lines;
  }

  private showNavigationHint(currentIndex: number): void {
    console.log();

    const hints: string[] = [];

    if (currentIndex > 0) {
      hints.push(colors.dim("[←] Previous"));
    }

    if (currentIndex < this.config.steps.length - 1) {
      hints.push(colors.info("[→] Next"));
    } else {
      hints.push(colors.success("[Enter] Complete"));
    }

    if (this.config.skipable) {
      hints.push(colors.dim("[s] Skip tour"));
    }

    console.log("  " + hints.join("  "));
  }

  protected async onComplete(): Promise<void> {
    console.log();
    console.log(colors.success("✓ Tour completed!"));

    // Celebration animation
    if (Runtime.supportsTTY) {
      await typeText("🎉 You're all set!", { speed: 30 });
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Interactive Mode
  // ─────────────────────────────────────────────────────────────────────────

  async runInteractive(): Promise<void> {
    await this.start();

    if (!Runtime.isBun) {
      logger.warning("Interactive mode requires Bun runtime");
      return;
    }

    // Simple key-based navigation using stdin
    const stdin = process.stdin;
    stdin.setRawMode?.(true);
    stdin.resume();

    return new Promise((resolve) => {
      const handleKey = async (data: Buffer) => {
        const key = data.toString();

        if (key === "\x03" || key === "q") {
          // Ctrl+C or q to quit
          stdin.setRawMode?.(false);
          stdin.pause();
          resolve();
          return;
        }

        if (key === "\r" || key === "\n" || key === " " || key === "\x1b[C") {
          // Enter, Space, or Right Arrow
          const hasNext = await this.next();
          if (!hasNext) {
            stdin.setRawMode?.(false);
            stdin.pause();
            resolve();
          }
        } else if (key === "\x1b[D") {
          // Left Arrow
          await this.previous();
        } else if (key === "s" || key === "S") {
          // Skip
          await this.skip();
          stdin.setRawMode?.(false);
          stdin.pause();
          resolve();
        }
      };

      stdin.on("data", handleKey);
    });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Factory
// ─────────────────────────────────────────────────────────────────────────────

export function createCLITour(config: TourConfig): CLITour {
  return new CLITour(config);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pre-built CLI Tours
// ─────────────────────────────────────────────────────────────────────────────

export const WELCOME_TOUR: TourConfig = {
  id: "welcome",
  steps: [
    {
      id: "welcome",
      title: "Welcome!",
      content: "Thanks for using this tool. Let's take a quick tour of the main features.",
    },
    {
      id: "basics",
      title: "The Basics",
      content: "Use arrow keys or Enter to navigate through this tour. Press 's' to skip at any time.",
    },
    {
      id: "help",
      title: "Getting Help",
      content: "Type --help after any command to see available options. You can also use -h for short.",
      target: "command --help",
    },
    {
      id: "done",
      title: "You're Ready!",
      content: "That's all for now. Happy coding!",
    },
  ],
  skipable: true,
  persistProgress: true,
};

export async function showWelcomeTour(): Promise<void> {
  const tour = createCLITour(WELCOME_TOUR);
  await tour.init();

  if (!tour.isComplete) {
    await tour.runInteractive();
  }
}
