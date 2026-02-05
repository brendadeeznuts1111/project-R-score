// lib/polish/micro-interactions/animations.ts - Animation Utilities
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime, ANSI, colors } from "../core/runtime.ts";
import type { ConfettiOptions } from "../types.ts";

// Dynamic import to avoid React dependency in CLI context
let fireConfetti: ((options?: ConfettiOptions) => void) | null = null;

if (Runtime.isBrowser) {
  import("../visual/browser/confetti.tsx").then((module) => {
    fireConfetti = module.fireConfetti;
  }).catch(() => {
    // React not available, will use fallback
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI Celebration
// ─────────────────────────────────────────────────────────────────────────────

const CELEBRATION_FRAMES = [
  "   🎉   ",
  "  🎉🎊  ",
  " 🎉🎊🎉 ",
  "🎉🎊🎉🎊",
  " 🎊🎉🎊 ",
  "  🎊🎉  ",
  "   🎊   ",
];

export async function celebrateCLI(message = "Celebration!", duration = 2000): Promise<void> {
  if (!Runtime.supportsTTY) {
    console.log(`🎉 ${message} 🎉`);
    return;
  }

  const startTime = Date.now();
  let frameIndex = 0;

  process.stdout.write(ANSI.hideCursor);

  while (Date.now() - startTime < duration) {
    const frame = CELEBRATION_FRAMES[frameIndex % CELEBRATION_FRAMES.length];
    process.stdout.write(`${ANSI.clearLine}\r${frame} ${colors.highlight(message)} ${frame}`);
    frameIndex++;
    await Runtime.sleep(100);
  }

  process.stdout.write(`${ANSI.clearLine}\r${ANSI.showCursor}`);
  console.log(`🎉 ${colors.success(message)} 🎉`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-runtime Confetti
// ─────────────────────────────────────────────────────────────────────────────

export function showConfetti(options?: ConfettiOptions): void {
  if (Runtime.isBrowser && fireConfetti) {
    fireConfetti(options);
  } else if (Runtime.isCLI()) {
    // CLI fallback: simple celebration
    celebrateCLI("Congratulations!");
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Loading Messages Animation
// ─────────────────────────────────────────────────────────────────────────────

const LOADING_MESSAGES = [
  "Reticulating splines...",
  "Generating witty dialog...",
  "Swapping time and space...",
  "Spinning the hamster wheel...",
  "Convincing AI to help...",
  "Computing optimal solution...",
  "Consulting the oracle...",
  "Warming up the bits...",
];

export async function showLoadingMessages(
  count = 3,
  interval = 1500
): Promise<void> {
  if (!Runtime.supportsTTY) return;

  const messages = [...LOADING_MESSAGES]
    .sort(() => Math.random() - 0.5)
    .slice(0, count);

  process.stdout.write(ANSI.hideCursor);

  for (const message of messages) {
    process.stdout.write(`${ANSI.clearLine}\r${colors.dim(`⏳ ${message}`)}`);
    await Runtime.sleep(interval);
  }

  process.stdout.write(`${ANSI.clearLine}\r${ANSI.showCursor}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Sparkle Text
// ─────────────────────────────────────────────────────────────────────────────

const SPARKLE_CHARS = ["✦", "✧", "⋆", "·"];

export async function sparkleText(
  text: string,
  duration = 2000
): Promise<void> {
  if (!Runtime.supportsTTY) {
    console.log(`✨ ${text} ✨`);
    return;
  }

  const startTime = Date.now();
  process.stdout.write(ANSI.hideCursor);

  while (Date.now() - startTime < duration) {
    let sparkled = "";
    for (const char of text) {
      if (char === " " || Math.random() > 0.2) {
        sparkled += char;
      } else {
        sparkled += colors.dim(SPARKLE_CHARS[Math.floor(Math.random() * SPARKLE_CHARS.length)]);
      }
    }
    process.stdout.write(`${ANSI.clearLine}\r✨ ${sparkled} ✨`);
    await Runtime.sleep(100);
  }

  process.stdout.write(`${ANSI.clearLine}\r✨ ${text} ✨\n${ANSI.showCursor}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Wave Text Animation
// ─────────────────────────────────────────────────────────────────────────────

export async function waveText(
  text: string,
  cycles = 2
): Promise<void> {
  if (!Runtime.supportsTTY) {
    console.log(text);
    return;
  }

  process.stdout.write(ANSI.hideCursor);

  const chars = [...text];
  const totalFrames = chars.length * 2 * cycles;

  for (let frame = 0; frame < totalFrames; frame++) {
    let output = "";
    for (let i = 0; i < chars.length; i++) {
      const wave = Math.sin((frame + i) * 0.5) > 0;
      output += wave ? chars[i].toUpperCase() : chars[i].toLowerCase();
    }
    process.stdout.write(`${ANSI.clearLine}\r${output}`);
    await Runtime.sleep(80);
  }

  process.stdout.write(`\n${ANSI.showCursor}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Bouncing Text
// ─────────────────────────────────────────────────────────────────────────────

export async function bounceText(
  text: string,
  bounces = 3
): Promise<void> {
  if (!Runtime.supportsTTY) {
    console.log(text);
    return;
  }

  process.stdout.write(ANSI.hideCursor);

  const heights = [0, 1, 2, 3, 2, 1, 0];
  const maxHeight = 3;

  for (let b = 0; b < bounces; b++) {
    for (const h of heights) {
      const padding = " ".repeat(maxHeight - h);
      process.stdout.write(`${ANSI.clearLine}\r${padding}${text}`);
      await Runtime.sleep(60);
    }
  }

  process.stdout.write(`${ANSI.clearLine}\r${text}\n${ANSI.showCursor}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fireworks (CLI)
// ─────────────────────────────────────────────────────────────────────────────

const FIREWORK_FRAMES = [
  ["     *     "],
  ["    ***    "],
  ["   *****   "],
  ["  *  *  *  "],
  [" *   *   * "],
  ["*    *    *"],
  ["     *     "],
];

export async function showFireworks(count = 1): Promise<void> {
  if (!Runtime.supportsTTY || !Runtime.supportsColors) {
    console.log("🎆 Fireworks! 🎆");
    return;
  }

  process.stdout.write(ANSI.hideCursor);

  const fireworkColors = [ANSI.red, ANSI.yellow, ANSI.green, ANSI.cyan, ANSI.magenta];

  for (let f = 0; f < count; f++) {
    const color = fireworkColors[f % fireworkColors.length];

    for (const frame of FIREWORK_FRAMES) {
      for (const line of frame) {
        console.log(`${color}${line}${ANSI.reset}`);
      }
      await Runtime.sleep(100);

      // Move cursor up
      for (let i = 0; i < frame.length; i++) {
        process.stdout.write(ANSI.cursorUp(1) + ANSI.clearLine);
      }
    }

    await Runtime.sleep(200);
  }

  process.stdout.write(ANSI.showCursor);
}
