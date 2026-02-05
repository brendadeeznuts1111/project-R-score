export interface ShortcutConfig {
  id: string;
  action: string;
  description: string;
  category: ShortcutCategory;
  default: {
    primary: string;
    secondary?: string;
    macOS?: string;
    linux?: string;
  };
  enabled: boolean;
  scope: 'global' | 'panel' | 'component';
  requiresConfirmation?: boolean;
  condition?: Function;
}

export interface ShortcutProfile {
  id: string;
  name: string;
  description: string;
  basedOn?: string;
  shortcuts: Record<string, string>;
  overrides: Record<string, string>;
  enabled: boolean;
  locked: boolean;
  category: ProfileCategory;
}

export interface ShortcutPreferences {
  userId: string;
  activeProfileId: string;
  keyboardLayout: 'us' | 'uk' | 'dvorak';
  enableSounds: boolean;
  enableHints: boolean;
  enableTraining: boolean;
  autoResolveConflicts: boolean;
}

export interface ShortcutConflict {
  key: string;
  actions: string[];
  severity: 'low' | 'medium' | 'high';
  resolution?: string;
}

export interface ShortcutMacro {
  id: string;
  name: string;
  description: string;
  sequence: Array<{
    action: string;
    delay: number;
  }>;
  profileId: string;
  enabled: boolean;
  usageCount: number;
  createdAt: Date;
  updatedAt: Date;
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

export type ShortcutCategory = 
  | 'theme' 
  | 'telemetry' 
  | 'emulator' 
  | 'general' 
  | 'compliance' 
  | 'logs'
  | 'ui' 
  | 'developer' 
  | 'accessibility' 
  | 'data' 
  | 'payment';

export type ProfileCategory = 
  | 'default' 
  | 'professional' 
  | 'developer' 
  | 'compliance' 
  | 'accessibility' 
  | 'custom' 
  | 'terminal';

export interface PlatformInfo {
  os: 'windows' | 'macOS' | 'linux';
  arch: string;
  version: string;
}

export interface KeyboardEvent {
  key: string;
  ctrlKey: boolean;
  altKey: boolean;
  shiftKey: boolean;
  metaKey: boolean;
  preventDefault(): void;
  stopPropagation(): void;
}

export interface ShortcutTriggerEvent {
  shortcut: ShortcutConfig;
  context?: any;
  timestamp: number;
  profile: string;
}

// Profile hierarchy types - Updated for registry compatibility
export interface ProfileHierarchy {
  profileId?: string;
  parentId?: string;
  children?: string[];
  depth?: number;
  path?: string[];
  rootProfiles: string[];
  profileTree: Record<string, {
    profile: string;
    children: string[];
    depth: number;
    path: string[];
  }>;
  inheritanceMap: Record<string, string[]>;
}

// Profile switch result type - Complete with all properties
export interface ProfileSwitchResult {
  success: boolean;
  fromProfileId?: string;
  toProfileId?: string;
  fromProfile?: string;
  toProfile?: string;
  conflicts?: ShortcutConflict[];
  migratedShortcuts?: string[];
  inheritedShortcuts?: string[];
  overriddenShortcuts?: string[];
  timestamp?: Date;
}

// Profile seed type - Complete with all required properties
export interface ProfileSeed {
  id: string;
  name: string;
  seed: number;
  number: number;
  category: ProfileCategory;
  isDefault: boolean;
  shortcuts: Record<string, string>;
  profileId: string;
  description?: string;
  template?: any;
  autoInherit?: boolean;
  priority?: number;
}

// Additional export to force TypeScript re-evaluation
export type RegistryTypes = {
  ProfileHierarchy: ProfileHierarchy;
  ProfileSwitchResult: ProfileSwitchResult;
  ProfileSeed: ProfileSeed;
};
