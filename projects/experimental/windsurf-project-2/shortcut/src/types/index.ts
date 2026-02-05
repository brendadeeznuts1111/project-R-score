// src/types/index.ts
export interface ShortcutConfig {
  id: string;
  action: string;
  description: string;
  category: 'theme' | 'telemetry' | 'emulator' | 'general' | 'compliance' | 'logs' | 'ui' | 'developer' | 'accessibility' | 'data' | 'payment';
  default: {
    primary: string;
    secondary?: string;
    macOS?: string;
    linux?: string;
  };
  enabled: boolean;
  scope: 'global' | 'panel' | 'component';
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
  locked?: boolean;
  category: 'default' | 'professional' | 'developer' | 'compliance' | 'accessibility' | 'custom' | 'terminal';
  seedNumber?: number;
  hierarchyLevel?: number;
  parentProfileId?: string;
  childProfileIds?: string[];
  priority?: number;
  inheritsFrom?: string[];
  metadata?: {
    createdAt: Date;
    updatedAt: Date;
    version: string;
    tags?: string[];
  };
}

export interface ProfileHierarchy {
  rootProfiles: string[];
  profileTree: Record<string, {
    profile: ShortcutProfile;
    children: string[];
    depth: number;
    path: string[];
  }>;
  inheritanceMap: Record<string, string[]>;
}

export interface ProfileSwitchResult {
  success: boolean;
  fromProfile: string;
  toProfile: string;
  conflicts?: ShortcutConflict[];
  inheritedShortcuts?: string[];
  overriddenShortcuts?: string[];
}

export interface ProfileSeed {
  number: number;
  profileId: string;
  name: string;
  description: string;
  template: Partial<ShortcutProfile>;
  autoInherit: boolean;
  priority: number;
}

export interface ShortcutConflict {
  key: string;
  actions: string[];
  severity: 'low' | 'medium' | 'high';
  resolution?: string[];
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
  sequence: Array<{action: string; delay: number}>;
  profileId?: string;
  enabled: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface TrainingProgress {
  userId: string;
  lessonId: string;
  score: number;
  completed: boolean;
  completedAt?: Date;
  attempts: number;
  bestTimeMs?: number;
}

export interface UsageAnalytics {
  shortcutId: string;
  profileId: string;
  userId: string;
  timestamp: Date;
  context?: string;
  success: boolean;
  responseTimeMs?: number;
}
