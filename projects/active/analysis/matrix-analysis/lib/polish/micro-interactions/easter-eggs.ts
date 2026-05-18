// lib/polish/micro-interactions/easter-eggs.ts - Easter Egg Registry
// ═══════════════════════════════════════════════════════════════════════════════

import { Runtime, colors } from "../core/runtime.ts";
import { storage } from "../core/storage.ts";
import { logger } from "../core/logger.ts";
import type { EasterEgg } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Easter Egg Registry
// ─────────────────────────────────────────────────────────────────────────────

const easterEggs: Map<string, EasterEgg> = new Map();
const discoveredEggs: Set<string> = new Set();

const STORAGE_KEY = "discovered-easter-eggs";

export async function loadDiscoveredEggs(): Promise<void> {
  const data = await storage.get<string[]>(STORAGE_KEY);
  if (data) {
    data.forEach((id) => discoveredEggs.add(id));
  }
}

export async function saveDiscoveredEggs(): Promise<void> {
  await storage.set(STORAGE_KEY, [...discoveredEggs]);
}

// ─────────────────────────────────────────────────────────────────────────────
// Registration
// ─────────────────────────────────────────────────────────────────────────────

export function registerEasterEgg(egg: EasterEgg): void {
  const id = typeof egg.trigger === "string" ? egg.trigger : egg.name;
  easterEggs.set(id, {
    ...egg,
    discovered: discoveredEggs.has(id),
  });
}

export function checkForEasterEgg(input: string): EasterEgg | null {
  for (const [id, egg] of easterEggs) {
    const trigger = egg.trigger;

    let matches = false;
    if (typeof trigger === "string") {
      matches = input.toLowerCase().includes(trigger.toLowerCase());
    } else {
      matches = trigger.test(input);
    }

    if (matches) {
      return egg;
    }
  }
  return null;
}

export async function triggerEasterEgg(input: string): Promise<boolean> {
  const egg = checkForEasterEgg(input);
  if (!egg) return false;

  const id = typeof egg.trigger === "string" ? egg.trigger : egg.name;
  const isFirstDiscovery = !discoveredEggs.has(id);

  if (isFirstDiscovery) {
    discoveredEggs.add(id);
    await saveDiscoveredEggs();
    logger.success(`You discovered: ${egg.name}!`);
  }

  await egg.action();
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery Info
// ─────────────────────────────────────────────────────────────────────────────

export function getDiscoveredCount(): number {
  return discoveredEggs.size;
}

export function getTotalCount(): number {
  return easterEggs.size;
}

export function getDiscoveryProgress(): string {
  return `${discoveredEggs.size}/${easterEggs.size}`;
}

export function listDiscovered(): string[] {
  return [...discoveredEggs];
}

export function isDiscovered(name: string): boolean {
  return discoveredEggs.has(name);
}

// ─────────────────────────────────────────────────────────────────────────────
// Built-in Easter Eggs
// ─────────────────────────────────────────────────────────────────────────────

export function registerBuiltInEasterEggs(): void {
  // Konami code pattern (as a string since we're CLI)
  registerEasterEgg({
    trigger: "konami",
    name: "Konami Code",
    action: async () => {
      console.info();
      console.info(colors.highlight("  ↑ ↑ ↓ ↓ ← → ← → B A  "));
      console.info(colors.success("  +30 lives unlocked!   "));
      console.info();
    },
  });

  // Bun trigger
  registerEasterEgg({
    trigger: "bun",
    name: "Bun Power",
    action: async () => {
      console.info();
      console.info("  🥟 " + colors.highlight("Bun is blazingly fast!") + " 🥟");
      console.info();
    },
  });

  // Power trigger
  registerEasterEgg({
    trigger: "power",
    name: "Power Mode",
    action: async () => {
      console.info();
      console.info(colors.bold("  ⚡ POWER MODE ACTIVATED ⚡"));
      console.info(colors.dim("  Hidden shortcuts unlocked..."));
      console.info();
    },
  });

  // Coffee
  registerEasterEgg({
    trigger: "coffee",
    name: "Coffee Break",
    action: async () => {
      console.info();
      console.info("  ☕ " + colors.dim("Time for a break..."));
      await Runtime.sleep(1000);
      console.info("  ☕ " + colors.info("Coffee is ready!"));
      console.info();
    },
  });

  // Matrix
  registerEasterEgg({
    trigger: /matrix|neo|morpheus/i,
    name: "The Matrix",
    action: async () => {
      console.info();
      console.info(colors.success("  There is no spoon..."));
      console.info();
    },
  });

  // Hello world
  registerEasterEgg({
    trigger: "hello world",
    name: "Classic Greeting",
    action: async () => {
      console.info();
      console.info(colors.info("  Hello, developer! 👋"));
      console.info();
    },
  });

  // 42
  registerEasterEgg({
    trigger: "42",
    name: "The Answer",
    action: async () => {
      console.info();
      console.info(colors.dim("  The answer to life, the universe, and everything."));
      console.info();
    },
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Input Tracker for Sequence Detection
// ─────────────────────────────────────────────────────────────────────────────

export class InputSequenceTracker {
  private buffer = "";
  private maxLength = 50;
  private timeout: Timer | null = null;
  private timeoutMs = 3000;

  track(char: string): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }

    this.buffer += char;
    if (this.buffer.length > this.maxLength) {
      this.buffer = this.buffer.slice(-this.maxLength);
    }

    this.timeout = setTimeout(() => {
      this.buffer = "";
    }, this.timeoutMs);
  }

  async check(): Promise<boolean> {
    const triggered = await triggerEasterEgg(this.buffer);
    if (triggered) {
      this.buffer = "";
    }
    return triggered;
  }

  getBuffer(): string {
    return this.buffer;
  }

  clear(): void {
    this.buffer = "";
    if (this.timeout) {
      clearTimeout(this.timeout);
      this.timeout = null;
    }
  }
}
