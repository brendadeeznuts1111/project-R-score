// lib/polish/feedback/visual.ts - Visual Feedback Effects
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime, ANSI, colors } from "../core/runtime.ts";
import type { VisualFlashType } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// CLI Visual Feedback
// ─────────────────────────────────────────────────────────────────────────────

const CLI_FLASH_COLORS: Record<VisualFlashType, string> = {
  success: ANSI.bgGreen,
  error: ANSI.bgRed,
  warning: ANSI.bgYellow,
  info: ANSI.bgBlue,
};

export async function flashCLI(type: VisualFlashType, duration = 150): Promise<void> {
  if (!Runtime.supportsTTY) return;

  const bgColor = CLI_FLASH_COLORS[type];

  // Flash effect using terminal background
  process.stdout.write(`${bgColor}${ANSI.clearLine}\r${ANSI.reset}`);
  await Runtime.sleep(duration);
  process.stdout.write(`${ANSI.clearLine}\r`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Browser Visual Feedback
// ─────────────────────────────────────────────────────────────────────────────

const BROWSER_FLASH_COLORS: Record<VisualFlashType, string> = {
  success: "rgba(16, 185, 129, 0.3)",
  error: "rgba(239, 68, 68, 0.3)",
  warning: "rgba(245, 158, 11, 0.3)",
  info: "rgba(59, 130, 246, 0.3)",
};

export function flashElement(
  element: HTMLElement | string,
  type: VisualFlashType,
  duration = 200
): void {
  if (!Runtime.isBrowser) return;

  const el = typeof element === "string"
    ? document.querySelector<HTMLElement>(element)
    : element;

  if (!el) return;

  const originalTransition = el.style.transition;
  const originalBackground = el.style.backgroundColor;

  el.style.transition = `background-color ${duration}ms ease`;
  el.style.backgroundColor = BROWSER_FLASH_COLORS[type];

  setTimeout(() => {
    el.style.backgroundColor = originalBackground;
    setTimeout(() => {
      el.style.transition = originalTransition;
    }, duration);
  }, duration);
}

export function flashScreen(type: VisualFlashType, duration = 150): void {
  if (!Runtime.isBrowser) return;

  const overlay = document.createElement("div");
  overlay.style.cssText = `
    position: fixed;
    inset: 0;
    background-color: ${BROWSER_FLASH_COLORS[type]};
    pointer-events: none;
    z-index: 99999;
    opacity: 1;
    transition: opacity ${duration}ms ease;
  `;

  document.body.appendChild(overlay);

  // Trigger fade out
  requestAnimationFrame(() => {
    overlay.style.opacity = "0";
  });

  setTimeout(() => {
    overlay.remove();
  }, duration + 50);
}

// ─────────────────────────────────────────────────────────────────────────────
// Pulse Animation
// ─────────────────────────────────────────────────────────────────────────────

export function pulseElement(
  element: HTMLElement | string,
  pulses = 2,
  duration = 150
): void {
  if (!Runtime.isBrowser) return;

  const el = typeof element === "string"
    ? document.querySelector<HTMLElement>(element)
    : element;

  if (!el) return;

  el.style.animation = `polish-pulse ${duration * 2}ms ease ${pulses}`;

  el.addEventListener(
    "animationend",
    () => {
      el.style.animation = "";
    },
    { once: true }
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Shake Animation
// ─────────────────────────────────────────────────────────────────────────────

export function shakeElement(
  element: HTMLElement | string,
  intensity = 5,
  duration = 400
): void {
  if (!Runtime.isBrowser) return;

  const el = typeof element === "string"
    ? document.querySelector<HTMLElement>(element)
    : element;

  if (!el) return;

  const originalTransform = el.style.transform;
  const startTime = performance.now();

  function animate(currentTime: number) {
    const elapsed = currentTime - startTime;
    const progress = elapsed / duration;

    if (progress >= 1) {
      el!.style.transform = originalTransform;
      return;
    }

    // Damped shake
    const damping = 1 - progress;
    const offset = Math.sin(elapsed * 0.05) * intensity * damping;
    el!.style.transform = `${originalTransform} translateX(${offset}px)`;

    requestAnimationFrame(animate);
  }

  requestAnimationFrame(animate);
}

// ─────────────────────────────────────────────────────────────────────────────
// Highlight Effect
// ─────────────────────────────────────────────────────────────────────────────

export function highlightElement(
  element: HTMLElement | string,
  duration = 1500
): void {
  if (!Runtime.isBrowser) return;

  const el = typeof element === "string"
    ? document.querySelector<HTMLElement>(element)
    : element;

  if (!el) return;

  const rect = el.getBoundingClientRect();

  const highlight = document.createElement("div");
  highlight.style.cssText = `
    position: fixed;
    left: ${rect.left - 4}px;
    top: ${rect.top - 4}px;
    width: ${rect.width + 8}px;
    height: ${rect.height + 8}px;
    border: 2px solid var(--polish-primary, #8b5cf6);
    border-radius: 6px;
    pointer-events: none;
    z-index: 99999;
    animation: polish-pulse 500ms ease 3;
  `;

  document.body.appendChild(highlight);

  setTimeout(() => {
    highlight.remove();
  }, duration);
}

// ─────────────────────────────────────────────────────────────────────────────
// Cross-runtime Flash
// ─────────────────────────────────────────────────────────────────────────────

export async function flash(type: VisualFlashType, target?: HTMLElement | string): Promise<void> {
  if (Runtime.isCLI()) {
    await flashCLI(type);
  } else if (Runtime.isBrowser) {
    if (target) {
      flashElement(target, type);
    } else {
      flashScreen(type);
    }
  }
}
