import { Database } from 'bun:sqlite';
import { getDatabase, dbUtils } from '../database/init';
import { ShortcutConflictDetector } from './detector.ts';
import { EventEmitter } from 'events';
import type {
  ShortcutConfig,
  ShortcutProfile,
  ShortcutConflict,
  ShortcutPreferences,
  ShortcutMacro
} from '../types';

export class ShortcutRegistry {
  private db: Database;
  private shortcuts: Map<string, ShortcutConfig> = new Map();
  private profiles: Map<string, ShortcutProfile> = new Map();
  private activeProfile: string = 'professional';
  private preferences: ShortcutPreferences = {
    userId: 'default',
    activeProfileId: 'professional',
    keyboardLayout: 'us',
    enableSounds: true,
    enableHints: true,
    enableTraining: true,
    autoResolveConflicts: false
  };
  private emitter: EventEmitter = new EventEmitter();
  private detector: ShortcutConflictDetector = new ShortcutConflictDetector();
  private listeners: Map<string, Set<(...args: any[]) => void>> = new Map();
  private macros: Map<string, ShortcutMacro> = new Map();
  private platform: 'windows' | 'macOS' | 'linux';
  
  constructor() {
    this.db = getDatabase();
    this.platform = this.detectPlatform();
    this.loadPreferences();
    this.loadFromDatabase();
    this.setupAutoSave();
  }
  
  // ==================== LOAD/SAVE ====================
  
  async loadFromDatabase(): Promise<void> {
    // Load shortcuts
    const shortcuts = this.db.query('SELECT * FROM shortcuts WHERE enabled = 1').all() as any[];
    this.shortcuts.clear();
    
    for (const row of shortcuts) {
      const config: ShortcutConfig = {
        id: row.id,
        action: row.action,
        description: row.description,
        category: row.category as any,
        default: {
          primary: row.default_primary,
          secondary: row.default_secondary || undefined,
          macOS: row.default_macos || undefined,
          linux: row.default_linux || undefined
        },
        enabled: row.enabled === 1,
        scope: row.scope as 'global' | 'panel' | 'component',
        requiresConfirmation: row.requires_confirmation === 1,
        condition: row.condition ? this.parseCondition(row.condition) : undefined
      };
      this.shortcuts.set(config.id, config);
    }
    
    // Load profiles
    const profiles = this.db.query('SELECT * FROM profiles WHERE enabled = 1').all() as any[];
    this.profiles.clear();
    
    for (const row of profiles) {
      // Load overrides for this profile
      const overridesQuery = this.db.prepare(`
        SELECT shortcut_id, key_combination 
        FROM profile_overrides 
        WHERE profile_id = ?
      `);
      
      const overridesRows = overridesQuery.all(row.id) as any[];
      const overrides: Record<string, string> = {};
      
      for (const override of overridesRows) {
        overrides[override.shortcut_id] = override.key_combination;
      }
      
      const profile: ShortcutProfile = {
        id: row.id,
        name: row.name,
        description: row.description || '',
        basedOn: row.based_on || undefined,
        shortcuts: {}, // Will be populated on demand
        overrides,
        enabled: row.enabled === 1,
        locked: row.locked === 1,
        category: row.category as any
      };
      this.profiles.set(profile.id, profile);
    }
    
    // Load macros
    const macros = this.db.query('SELECT * FROM macros WHERE enabled = 1').all() as any[];
    this.macros.clear();
    
    for (const row of macros) {
      const macro: ShortcutMacro = {
        id: row.id,
        name: row.name,
        description: row.description || '',
        sequence: JSON.parse(row.sequence),
        profileId: row.profile_id,
        enabled: row.enabled === 1,
        usageCount: row.usage_count,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      this.macros.set(macro.id, macro);
    }
    
    this.emitter.emit('loaded', {
      shortcuts: this.shortcuts.size,
      profiles: this.profiles.size,
      macros: this.macros.size
    });
  }
  
  async saveToDatabase(): Promise<void> {
    // Save preferences
    const prefsStmt = this.db.prepare(`
      INSERT OR REPLACE INTO user_preferences 
      (user_id, active_profile_id, keyboard_layout, enable_sounds, enable_hints, enable_training, auto_resolve_conflicts, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    prefsStmt.run(
      this.preferences.userId,
      this.activeProfile,
      this.preferences.keyboardLayout,
      this.preferences.enableSounds ? 1 : 0,
      this.preferences.enableHints ? 1 : 0,
      this.preferences.enableTraining ? 1 : 0,
      this.preferences.autoResolveConflicts ? 1 : 0
    );
  }
  
  // ==================== SHORTCUT MANAGEMENT ====================
  
  register(config: ShortcutConfig): void {
    // Validate the shortcut
    this.validateShortcutConfig(config);
    
    // Check for conflicts
    const effectiveKey = this.getEffectiveKey(config);
    const conflicts = this.findConflicts(effectiveKey, config.id);
    
    if (conflicts.length > 0 && config.scope === 'global') {
      this.emitter.emit('conflict', {
        key: effectiveKey,
        actions: [config.id, ...conflicts],
        severity: 'high'
      });
      
      if (this.preferences.autoResolveConflicts) {
        this.autoResolveConflict(config.id, effectiveKey, conflicts);
      }
    }
    
    this.shortcuts.set(config.id, config);
    
    // Persist to database
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO shortcuts 
      (id, action, description, category, default_primary, default_secondary, 
       default_macos, default_linux, enabled, scope, requires_confirmation, condition, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `);
    
    stmt.run(
      config.id,
      config.action,
      config.description,
      config.category,
      config.default.primary,
      config.default.secondary || null,
      config.default.macOS || null,
      config.default.linux || null,
      config.enabled ? 1 : 0,
      config.scope,
      config.requiresConfirmation ? 1 : 0,
      config.condition ? JSON.stringify(config.condition.toString()) : null
    );
    
    this.emitter.emit('shortcut:registered', config);
  }
  
  unregister(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) return;
    
    this.shortcuts.delete(shortcutId);
    
    // Remove from database (soft delete by disabling)
    this.db.exec('UPDATE shortcuts SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?', [shortcutId]);
    
    this.emitter.emit('shortcut:unregistered', shortcutId);
  }
  
  trigger(shortcutId: string, context?: any, event?: KeyboardEvent): boolean {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut || !shortcut.enabled) {
      return false;
    }
    
    // Check conditions
    if (shortcut.condition) {
      try {
        const conditionMet = shortcut.condition.call(context);
        if (!conditionMet) return false;
      } catch (error) {
        console.error('Condition check failed:', error);
        return false;
      }
    }
    
    // Check scope
    if (!this.isInScope(shortcut.scope, context)) {
      return false;
    }
    
    // Handle confirmation if needed
    if (shortcut.requiresConfirmation && event) {
      if (!this.requestConfirmation(shortcut, event)) {
        return false;
      }
    }
    
    // Track usage
    dbUtils.trackUsage(
      shortcutId,
      this.activeProfile,
      this.preferences.userId,
      context?.scope || 'global',
      true
    );
    
    // Notify listeners
    this.emitter.emit('shortcut:triggered', {
      shortcut,
      context,
      timestamp: Date.now(),
      profile: this.activeProfile
    });
    
    // Execute any registered callbacks
    const callbacks = this.listeners.get(shortcutId);
    if (callbacks) {
      for (const callback of callbacks) {
        try {
          callback(context, event);
        } catch (error) {
          console.error('Shortcut callback failed:', error);
        }
      }
    }
    
    // Prevent default if event provided
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    
    return true;
  }
  
  onShortcut(shortcutId: string, callback: (...args: any[]) => void): () => void {
    if (!this.listeners.has(shortcutId)) {
      this.listeners.set(shortcutId, new Set());
    }
    this.listeners.get(shortcutId)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(shortcutId);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(shortcutId);
        }
      }
    };
  }
  
  // ==================== PROFILE MANAGEMENT ====================
  
  setActiveProfile(profileId: string): void {
    if (!this.profiles.has(profileId)) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    const previousProfile = this.activeProfile;
    this.activeProfile = profileId;
    
    // Update preferences
    this.preferences.activeProfileId = profileId;
    this.saveToDatabase();
    
    this.emitter.emit('profile:changed', {
      previous: previousProfile,
      current: profileId
    });
  }
  
  createProfile(name: string, description: string, basedOn?: string): ShortcutProfile {
    const id = `profile_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const profile: ShortcutProfile = {
      id,
      name,
      description,
      basedOn,
      shortcuts: {},
      overrides: {},
      enabled: true,
      locked: false,
      category: 'custom'
    };
    
    // Insert into database
    const stmt = this.db.prepare(`
      INSERT INTO profiles (id, name, description, based_on, category, enabled, locked)
      VALUES (?, ?, ?, ?, ?, 1, 0)
    `);
    
    stmt.run(id, name, description, basedOn || null, 'custom');
    
    this.profiles.set(id, profile);
    this.emitter.emit('profile:created', profile);
    
    return profile;
  }
  
  // ==================== UTILITY METHODS ====================
  
  getShortcutCount(): number {
    return this.shortcuts.size;
  }
  
  getActiveProfile(): string {
    return this.activeProfile;
  }
  
  getEffectiveKey(config: ShortcutConfig, profileId?: string): string {
    const targetProfileId = profileId || this.activeProfile;
    const profile = this.profiles.get(targetProfileId);
    
    if (profile && profile.overrides[config.id]) {
      return profile.overrides[config.id];
    }
    
    // Return platform-specific key
    switch (this.platform) {
      case 'macOS':
        return config.default.macOS || config.default.primary;
      case 'linux':
        return config.default.linux || config.default.primary;
      default:
        return config.default.primary;
    }
  }
  
  // Event handling
  on(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }
  
  off(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }
  
  // ==================== PUBLIC UTILITIES ====================
  
  getDbUtils() {
    return dbUtils;
  }
  
  // ==================== PRIVATE METHODS ====================
  
  private detectPlatform(): 'windows' | 'macOS' | 'linux' {
    const platform = process.platform;
    if (platform === 'darwin') return 'macOS';
    if (platform === 'linux') return 'linux';
    return 'windows';
  }
  
  private loadPreferences(): void {
    const prefs = this.db.query('SELECT * FROM user_preferences WHERE user_id = ?').get('default') as any;
    
    if (prefs) {
      this.preferences = {
        userId: prefs.user_id,
        activeProfileId: prefs.active_profile_id || 'professional',
        keyboardLayout: prefs.keyboard_layout || 'us',
        enableSounds: prefs.enable_sounds === 1,
        enableHints: prefs.enable_hints === 1,
        enableTraining: prefs.enable_training === 1,
        autoResolveConflicts: prefs.auto_resolve_conflicts === 1
      };
      this.activeProfile = this.preferences.activeProfileId;
    } else {
      // Default preferences
      this.preferences = {
        userId: 'default',
        activeProfileId: 'professional',
        keyboardLayout: 'us',
        enableSounds: true,
        enableHints: true,
        enableTraining: true,
        autoResolveConflicts: false
      };
    }
  }
  
  private setupAutoSave(): void {
    // Auto-save every 30 seconds
    setInterval(() => {
      this.saveToDatabase();
    }, 30000);
  }
  
  private validateShortcutConfig(config: ShortcutConfig): void {
    if (!config.id || !config.action || !config.description) {
      throw new Error('Shortcut must have id, action, and description');
    }
    
    if (!config.default.primary) {
      throw new Error('Shortcut must have a primary key combination');
    }
  }
  
  private parseCondition(conditionStr: string): Function {
    try {
      return new Function('return ' + conditionStr)();
    } catch (error) {
      console.warn('Failed to parse condition:', conditionStr);
      return () => true;
    }
  }
  
  private isInScope(scope: string, context?: any): boolean {
    if (scope === 'global') return true;
    if (!context) return false;
    return context.scope === scope;
  }
  
  private requestConfirmation(shortcut: ShortcutConfig, event: KeyboardEvent): boolean {
    // For now, always return true. In a real implementation, 
    // this would show a confirmation dialog
    return true;
  }
  
  detectConflicts(profileId?: string): ShortcutConflict[] {
    const targetProfileId = profileId || this.activeProfile;
    return this.detector.detectConflicts(this.shortcuts, targetProfileId, this.platform);
  }
  
  private findConflicts(keyCombination: string, excludeShortcutId?: string, profileId?: string): string[] {
    const targetProfileId = profileId || this.activeProfile;
    const normalizedKey = this.normalizeKey(keyCombination);
    const conflicts: string[] = [];
    
    for (const [shortcutId, config] of this.shortcuts.entries()) {
      if (shortcutId === excludeShortcutId) continue;
      
      const effectiveKey = this.getEffectiveKey(config, targetProfileId);
      if (this.normalizeKey(effectiveKey) === normalizedKey) {
        conflicts.push(shortcutId);
      }
    }
    
    return conflicts;
  }
  
  private normalizeKey(key: string): string {
    return key.toLowerCase().replace(/\s+/g, '');
  }
  
  private autoResolveConflict(shortcutId: string, key: string, conflicts: string[]): void {
    // Try to find alternative key
    const alternative = this.suggestAlternativeKey(shortcutId, key);
    if (alternative) {
      this.setOverride(shortcutId, alternative);
      console.log(`Auto-resolved conflict: ${shortcutId} now uses ${alternative}`);
    }
  }
  
  private suggestAlternativeKey(shortcutId: string, currentKey: string): string | null {
    // Simple alternative suggestion logic
    if (currentKey.includes('Ctrl')) {
      return currentKey.replace('Ctrl', 'Alt');
    }
    if (currentKey.includes('Alt')) {
      return currentKey.replace('Alt', 'Ctrl');
    }
    return null;
  }
  
  private setOverride(shortcutId: string, keyCombination: string, profileId?: string): void {
    const targetProfileId = profileId || this.activeProfile;
    const profile = this.profiles.get(targetProfileId);
    
    if (!profile) {
      throw new Error(`Profile ${targetProfileId} not found`);
    }
    
    // Update or insert override
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO profile_overrides (profile_id, shortcut_id, key_combination)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(targetProfileId, shortcutId, keyCombination);
    
    // Update in-memory cache
    profile.overrides[shortcutId] = keyCombination;
  }
  
  // ==================== CONFLICT DETECTION ====================
  
  detectConflicts(): ShortcutConflict[] {
    const shortcuts = Array.from(this.shortcuts.values());
    return this.detector.detectConflicts(shortcuts, this.activeProfile);
  }
}
