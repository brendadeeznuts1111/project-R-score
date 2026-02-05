// lib/polish/visual/terminal-animation.ts - CLI typing and animation effects
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime, ANSI, colors } from "../core/runtime.ts";
import type { TerminalAnimationOptions, TypewriterOptions } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Typewriter Effect
// ─────────────────────────────────────────────────────────────────────────────

export async function typeText(
  text: string,
  options: TypewriterOptions = {}
): Promise<void> {
  const speed = options.speed ?? 50;
  const cursor = options.cursor ?? "▌";
  const showCursor = cursor !== "";

  if (!Runtime.supportsTTY) {
    // Non-TTY: just print the text
    console.log(text);
    return;
  }

  process.stdout.write(ANSI.hideCursor);

  for (let i = 0; i <= text.length; i++) {
    const displayText = text.slice(0, i);
    const cursorChar = showCursor && i < text.length ? cursor : "";

    process.stdout.write(`${ANSI.clearLine}\r${displayText}${cursorChar}`);

    // Variable timing for natural feel
    const charDelay = speed + Math.random() * (speed * 0.5);
    await Runtime.sleep(charDelay);
  }

  process.stdout.write(`\n${ANSI.showCursor}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Text Animation
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteText(
  currentText: string,
  options: TypewriterOptions = {}
): Promise<void> {
  const speed = options.deleteSpeed ?? options.speed ?? 30;

  if (!Runtime.supportsTTY) return;

  for (let i = currentText.length; i >= 0; i--) {
    const displayText = currentText.slice(0, i);
    process.stdout.write(`${ANSI.clearLine}\r${displayText}▌`);
    await Runtime.sleep(speed);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Typing with Delete (Type, pause, delete, type next)
// ─────────────────────────────────────────────────────────────────────────────

export async function typeSequence(
  texts: string[],
  options: TypewriterOptions & { loop?: boolean } = {}
): Promise<void> {
  const pauseAfter = options.pauseAfter ?? 2000;
  const loop = options.loop ?? false;

  do {
    for (const text of texts) {
      await typeText(text, options);
      await Runtime.sleep(pauseAfter);
      await deleteText(text, options);
      await Runtime.sleep(200);
    }
  } while (loop);
}

// ─────────────────────────────────────────────────────────────────────────────
// Rainbow Text Animation
// ─────────────────────────────────────────────────────────────────────────────

const RAINBOW_COLORS = [
  ANSI.red,
  ANSI.yellow,
  ANSI.green,
  ANSI.cyan,
  ANSI.blue,
  ANSI.magenta,
];

export async function rainbowText(
  text: string,
  cycles = 3,
  speed = 100
): Promise<void> {
  if (!Runtime.supportsTTY || !Runtime.supportsColors) {
    console.log(text);
    return;
  }

  process.stdout.write(ANSI.hideCursor);

  for (let c = 0; c < cycles * RAINBOW_COLORS.length; c++) {
    let colored = "";
    for (let i = 0; i < text.length; i++) {
      const colorIndex = (i + c) % RAINBOW_COLORS.length;
      colored += `${RAINBOW_COLORS[colorIndex]}${text[i]}`;
    }
    process.stdout.write(`${ANSI.clearLine}\r${colored}${ANSI.reset}`);
    await Runtime.sleep(speed);
  }

  process.stdout.write(`\n${ANSI.showCursor}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Fade In Text
// ─────────────────────────────────────────────────────────────────────────────

export async function fadeInText(
  text: string,
  steps = 5,
  stepDuration = 150
): Promise<void> {
  if (!Runtime.supportsTTY) {
    console.log(text);
    return;
  }

  // Simulate fade by gradually revealing characters
  const chars = [...text];
  const revealed = new Set<number>();

  process.stdout.write(ANSI.hideCursor);

  for (let step = 0; step < steps; step++) {
    const toReveal = Math.ceil(chars.length / steps);
    for (let j = 0; j < toReveal; j++) {
      const remaining = chars
        .map((_, i) => i)
        .filter((i) => !revealed.has(i));
      if (remaining.length === 0) break;
      const idx = remaining[Math.floor(Math.random() * remaining.length)];
      revealed.add(idx);
    }

    let display = "";
    for (let i = 0; i < chars.length; i++) {
      display += revealed.has(i) ? chars[i] : " ";
    }

    process.stdout.write(`${ANSI.clearLine}\r${display}`);
    await Runtime.sleep(stepDuration);
  }

  process.stdout.write(`${ANSI.clearLine}\r${text}\n${ANSI.showCursor}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulsing Text
// ─────────────────────────────────────────────────────────────────────────────

export async function pulseText(
  text: string,
  pulses = 3,
  duration = 200
): Promise<void> {
  if (!Runtime.supportsTTY) {
    console.log(text);
    return;
  }

  process.stdout.write(ANSI.hideCursor);

  for (let i = 0; i < pulses; i++) {
    // Bright
    process.stdout.write(`${ANSI.clearLine}\r${ANSI.bold}${text}${ANSI.reset}`);
    await Runtime.sleep(duration);

    // Dim
    process.stdout.write(`${ANSI.clearLine}\r${ANSI.dim}${text}${ANSI.reset}`);
    await Runtime.sleep(duration);
  }

  process.stdout.write(`${ANSI.clearLine}\r${text}\n${ANSI.showCursor}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Slide In From Left
// ─────────────────────────────────────────────────────────────────────────────

export async function slideInText(
  text: string,
  speed = 30
): Promise<void> {
  if (!Runtime.supportsTTY) {
    console.log(text);
    return;
  }

  const width = Runtime.getTerminalWidth();
  process.stdout.write(ANSI.hideCursor);

  for (let offset = width; offset >= 0; offset -= 2) {
    const padding = " ".repeat(Math.max(0, offset));
    const visibleText = text.slice(0, width - offset);
    process.stdout.write(`${ANSI.clearLine}\r${padding}${visibleText}`);
    await Runtime.sleep(speed);
  }

  process.stdout.write(`\n${ANSI.showCursor}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Countdown Animation
// ─────────────────────────────────────────────────────────────────────────────

export async function countdown(
  from: number,
  message = "Starting in"
): Promise<void> {
  if (!Runtime.supportsTTY) {
    console.log(`${message} ${from}...`);
    await Runtime.sleep(from * 1000);
    return;
  }

  process.stdout.write(ANSI.hideCursor);

  for (let i = from; i > 0; i--) {
    process.stdout.write(`${ANSI.clearLine}\r${message} ${colors.highlight(String(i))}...`);
    await Runtime.sleep(1000);
  }

  process.stdout.write(`${ANSI.clearLine}\r${ANSI.showCursor}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Matrix-style Rain Effect (Brief)
// ─────────────────────────────────────────────────────────────────────────────

export async function matrixRain(
  lines = 5,
  duration = 2000
): Promise<void> {
  if (!Runtime.supportsTTY || !Runtime.supportsColors) return;

  const width = Math.min(Runtime.getTerminalWidth(), 80);
  const chars = "ｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ0123456789";
  const columns: number[] = Array(width).fill(0);

  process.stdout.write(ANSI.hideCursor);
  console.log(); // Create space

  const startTime = Date.now();
  while (Date.now() - startTime < duration) {
    let line = "";
    for (let i = 0; i < width; i++) {
      if (Math.random() < 0.1) {
        columns[i] = Math.random() < 0.3 ? 1 : 0;
      }
      if (columns[i]) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        line += `${ANSI.green}${char}`;
        columns[i] = Math.random() < 0.9 ? 1 : 0;
      } else {
        line += " ";
      }
    }
    process.stdout.write(`${line}${ANSI.reset}\n`);
    await Runtime.sleep(50);
  }

  process.stdout.write(ANSI.showCursor);
}
