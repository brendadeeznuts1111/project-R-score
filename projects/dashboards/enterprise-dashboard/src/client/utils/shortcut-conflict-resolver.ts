/**
 * Shortcut Conflict Resolver
 * Utility functions for detecting and resolving keyboard shortcut conflicts
 */

import type { ShortcutBinding } from "../config";

export interface ConflictInfo {
  key: string;
  actions: string[];
  categories: string[];
  priorities: number[];
}

export interface ConflictResolution {
  key: string;
  resolvedAction: string;
  removedActions: string[];
  strategy: "priority" | "manual" | "first-wins";
}

// Category priority (higher = more important)
const CATEGORY_PRIORITY: Record<string, number> = {
  global: 100,
  tabs: 90,
  data: 80,
  view: 70,
  projects: 60,
  network: 50,
  dev: 40,
  diagnose: 30,
  kyc: 20,
};

/**
 * Normalize key for conflict detection
 */
export function normalizeKeyForConflict(key: string, platform: "mac" | "windows" | "linux" = "mac"): string {
  const modifierKey = platform === "mac" ? "cmd" : "ctrl";
  return key
    .toLowerCase()
    .replace(/cmdorctrl/gi, modifierKey)
    .replace(/cmd\/ctrl/gi, modifierKey)
    .trim();
}

/**
 * Detect conflicts in shortcuts configuration
 */
export function detectConflicts(
  shortcuts: Record<string, Record<string, ShortcutBinding>>,
  platform: "mac" | "windows" | "linux" = "mac"
): ConflictInfo[] {
  const keyMap = new Map<string, { action: string; category: string; priority: number }[]>();
  const conflicts: ConflictInfo[] = [];

  // Build key map with priorities
  Object.entries(shortcuts).forEach(([category, bindings]) => {
    if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) return;

    Object.entries(bindings).forEach(([key, binding]) => {
      if (!binding || typeof binding !== 'object' || !binding.action) return;

      const normalizedKey = normalizeKeyForConflict(key, platform);

      if (!keyMap.has(normalizedKey)) {
        keyMap.set(normalizedKey, []);
      }

      const priority = CATEGORY_PRIORITY[category] || 0;
      keyMap.get(normalizedKey)!.push({
        action: binding.action,
        category,
        priority,
      });
    });
  });

  // Detect conflicts
  keyMap.forEach((actions, key) => {
    if (actions.length > 1) {
      // Sort by priority (higher first)
      const sortedActions = [...actions].sort((a, b) => b.priority - a.priority);

      conflicts.push({
        key,
        actions: sortedActions.map(a => a.action),
        categories: sortedActions.map(a => a.category),
        priorities: sortedActions.map(a => a.priority),
      });
    }
  });

  // Sort conflicts by severity (more actions = higher severity)
  conflicts.sort((a, b) => b.actions.length - a.actions.length);

  return conflicts;
}

/**
 * Resolve conflicts using priority strategy
 */
export function resolveConflictsByPriority(
  shortcuts: Record<string, Record<string, ShortcutBinding>>,
  conflicts: ConflictInfo[],
  platform: "mac" | "windows" | "linux" = "mac"
): ConflictResolution[] {
  const resolutions: ConflictResolution[] = [];

  conflicts.forEach((conflict) => {
    // Find the action with highest priority
    const highestPriorityIndex = conflict.priorities.indexOf(Math.max(...conflict.priorities));
    const resolvedAction = conflict.actions[highestPriorityIndex];
    const removedActions = conflict.actions.filter((_, i) => i !== highestPriorityIndex);

    resolutions.push({
      key: conflict.key,
      resolvedAction,
      removedActions,
      strategy: "priority",
    });
  });

  return resolutions;
}

/**
 * Apply conflict resolutions to shortcuts
 */
export function applyResolutions(
  shortcuts: Record<string, Record<string, ShortcutBinding>>,
  resolutions: ConflictResolution[]
): Record<string, Record<string, ShortcutBinding>> {
  const updated = JSON.parse(JSON.stringify(shortcuts)) as typeof shortcuts;

  resolutions.forEach((resolution) => {
    // Remove all conflicting actions except the resolved one
    Object.entries(updated).forEach(([category, bindings]) => {
      if (!bindings || typeof bindings !== 'object' || Array.isArray(bindings)) return;

      Object.entries(bindings).forEach(([key, binding]) => {
        if (resolution.removedActions.includes(binding.action)) {
          delete (bindings as Record<string, ShortcutBinding>)[key];
        }
      });
    });
  });

  return updated;
}

/**
 * Get conflict summary statistics
 */
export function getConflictStats(conflicts: ConflictInfo[]): {
  total: number;
  bySeverity: { [key: number]: number };
  mostConflicted: ConflictInfo | null;
  totalAffectedActions: number;
} {
  const bySeverity: { [key: number]: number } = {};
  let mostConflicted: ConflictInfo | null = null;
  let maxActions = 0;
  let totalAffected = 0;

  conflicts.forEach((conflict) => {
    const severity = conflict.actions.length;
    bySeverity[severity] = (bySeverity[severity] || 0) + 1;
    totalAffected += severity;

    if (severity > maxActions) {
      maxActions = severity;
      mostConflicted = conflict;
    }
  });

  return {
    total: conflicts.length,
    bySeverity,
    mostConflicted,
    totalAffectedActions: totalAffected,
  };
}

/**
 * Check if a key combination would conflict
 */
export function wouldConflict(
  shortcuts: Record<string, Record<string, ShortcutBinding>>,
  newKey: string,
  category: string,
  platform: "mac" | "windows" | "linux" = "mac"
): ConflictInfo | null {
  const normalizedNewKey = normalizeKeyForConflict(newKey, platform);
  const allConflicts = detectConflicts(shortcuts, platform);
  
  return allConflicts.find(c => c.key === normalizedNewKey) || null;
}

/**
 * Suggest alternative keys to avoid conflicts
 */
export function suggestAlternatives(
  shortcuts: Record<string, Record<string, ShortcutBinding>>,
  preferredKey: string,
  platform: "mac" | "windows" | "linux" = "mac"
): string[] {
  const alternatives: string[] = [];
  const modifier = platform === "mac" ? "Cmd" : "Ctrl";
  
  // Common alternative keys
  const commonKeys = [
    `${modifier} + Shift + K`,
    `${modifier} + Alt + K`,
    `${modifier} + K, K`, // Chord sequence
    `Alt + K`,
    `Shift + K`,
  ];

  commonKeys.forEach((altKey) => {
    const conflict = wouldConflict(shortcuts, altKey, "", platform);
    if (!conflict) {
      alternatives.push(altKey);
    }
  });

  return alternatives;
}
