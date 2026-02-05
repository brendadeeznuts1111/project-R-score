/**
 * Type definitions for the ShortcutRegistry system
 */

export type ShortcutCategory =
  | 'general'
  | 'ui'
  | 'developer'
  | 'navigation'
  | 'ide'
  | 'browser'
  | 'window'
  | 'theme'
  | 'telemetry'
  | 'emulator'
  | 'compliance'
  | 'logs'
  | 'accessibility'
  | 'data'
  | 'payment'
  | 'custom';

export type ShortcutScope = 'global' | 'panel' | 'component';

export type Platform = 'windows' | 'macOS' | 'linux';

export interface ShortcutKeyDefaults {
  primary: string;
  secondary?: string;
  macOS?: string;
  linux?: string;
}

export interface ShortcutConfig {
  id: string;
  action: string;
  description: string;
  category: ShortcutCategory;
  default: ShortcutKeyDefaults;
  enabled: boolean;
  scope: ShortcutScope;
  requiresConfirmation?: boolean;
  condition?: () => boolean;
}

export interface ShortcutProfile {
  id: string;
  name: string;
  description: string;
  basedOn?: string;
  shortcuts: Record<string, ShortcutConfig>;
  overrides: Record<string, string>;
  enabled: boolean;
  locked: boolean;
  category: ShortcutCategory;
}

export interface ShortcutConflict {
  key: string;
  actions: string[];
  severity: 'low' | 'medium' | 'high';
  profileId?: string;
}

export interface ShortcutPreferences {
  userId: string;
  activeProfileId: string;
  keyboardLayout: string;
  enableSounds: boolean;
  enableHints: boolean;
  enableTraining: boolean;
  autoResolveConflicts: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShortcutMacro {
  id: string;
  name: string;
  description: string;
  sequence: Array<{ action: string; delay: number }>;
  profileId: string;
  enabled: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShortcutUsage {
  shortcutId: string;
  profileId: string;
  userId: string;
  scope: string;
  success: boolean;
  timestamp: Date;
}

export interface TrainingProgress {
  lessonId: string;
  score: number;
  completed: boolean;
  completedAt?: Date;
  attempts: number;
  bestTimeMs?: number;
}
