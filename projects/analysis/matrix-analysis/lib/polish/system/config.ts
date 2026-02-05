// lib/polish/system/config.ts - Default Configuration
// ═══════════════════════════════════════════════════════════════════════════════

import { storage } from "../core/storage.ts";
import type { PolishConfig } from "../types.ts";
import { DEFAULT_POLISH_CONFIG } from "../types.ts";

// ─────────────────────────────────────────────────────────────────────────────
// Config Management
// ─────────────────────────────────────────────────────────────────────────────

const CONFIG_KEY = "polish-config";

let currentConfig: PolishConfig = { ...DEFAULT_POLISH_CONFIG };

export async function loadConfig(): Promise<PolishConfig> {
  const stored = await storage.get<PolishConfig>(CONFIG_KEY);
  if (stored) {
    currentConfig = { ...DEFAULT_POLISH_CONFIG, ...stored };
  }
  return currentConfig;
}

export async function saveConfig(config: Partial<PolishConfig>): Promise<void> {
  currentConfig = { ...currentConfig, ...config };
  await storage.set(CONFIG_KEY, currentConfig);
}

export function getConfig(): PolishConfig {
  return { ...currentConfig };
}

export function updateConfig(updates: Partial<PolishConfig>): void {
  currentConfig = { ...currentConfig, ...updates };
}

export async function resetConfig(): Promise<void> {
  currentConfig = { ...DEFAULT_POLISH_CONFIG };
  await storage.delete(CONFIG_KEY);
}

// ─────────────────────────────────────────────────────────────────────────────
// Config Presets
// ─────────────────────────────────────────────────────────────────────────────

export const CONFIG_PRESETS = {
  full: DEFAULT_POLISH_CONFIG,

  minimal: {
    ...DEFAULT_POLISH_CONFIG,
    audio: { enabled: false, volume: 0 },
    haptic: { enabled: false },
    visual: {
      animations: true,
      colors: true,
      spinnerStyle: "dots" as const,
    },
    onboarding: { enabled: false, showOnFirstRun: false, persistProgress: false },
    easterEggs: { enabled: false },
  },

  silent: {
    ...DEFAULT_POLISH_CONFIG,
    audio: { enabled: false, volume: 0 },
    haptic: { enabled: false },
  },

  accessible: {
    ...DEFAULT_POLISH_CONFIG,
    audio: { enabled: true, volume: 0.7 },
    visual: {
      animations: false,
      colors: true,
      spinnerStyle: "line" as const,
    },
  },

  demo: {
    ...DEFAULT_POLISH_CONFIG,
    debug: true,
    audio: { enabled: true, volume: 0.3 },
    visual: {
      animations: true,
      colors: true,
      spinnerStyle: "dots" as const,
    },
    easterEggs: { enabled: true },
  },
} as const;

export type ConfigPreset = keyof typeof CONFIG_PRESETS;

export function applyPreset(preset: ConfigPreset): PolishConfig {
  currentConfig = { ...CONFIG_PRESETS[preset] };
  return currentConfig;
}
