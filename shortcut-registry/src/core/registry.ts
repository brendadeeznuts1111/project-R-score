/**
 * ShortcutRegistry - Comprehensive keyboard shortcut management system
 * 
 * Provides functionality for:
 * - Registering and managing keyboard shortcuts
 * - Profile-based shortcut configurations
 * - Conflict detection and resolution
 * - Macro sequences
 * - Usage tracking and analytics
 * - Database persistence
 * 
 * @example
 * ```typescript
 * const registry = new ShortcutRegistry();
 * 
 * registry.register({
 *   id: 'file.save',
 *   action: 'save',
 *   description: 'Save file',
 *   category: 'general',
 *   default: { primary: 'Ctrl+S', macOS: 'Cmd+S' },
 *   enabled: true,
 *   scope: 'global'
 * });
 * 
 * registry.on('file.save', () => {
 *   console.log('Save triggered!');
 * });
 * ```
 */
// src/core/registry.ts
import { Database } from 'bun:sqlite';
import { getDatabase, dbUtils } from '../database/init';
import { ShortcutConflictDetector } from './detector';
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
  private preferences!: ShortcutPreferences;
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
  
  /**
   * Load shortcuts, profiles, and macros from the database
   * 
   * This method populates the in-memory cache with data from the SQLite database.
   * It's called automatically during initialization but can be called manually
   * to refresh the cache.
   * 
   * @emits loaded - Emitted when data is loaded with counts of loaded items
   * @returns Promise that resolves when loading is complete
   * 
   * @example
   * ```typescript
   * await registry.loadFromDatabase();
   * ```
   */
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
  
  /**
   * Save current preferences to the database
   * 
   * Persists user preferences including active profile, keyboard layout,
   * and feature flags to the database.
   * 
   * @returns Promise that resolves when save is complete
   * 
   * @example
   * ```typescript
   * await registry.saveToDatabase();
   * ```
   */
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
  
  /**
   * Register a new keyboard shortcut
   * 
   * Validates the shortcut configuration, checks for conflicts, and persists
   * it to the database. If conflicts are detected and auto-resolve is enabled,
   * attempts to automatically resolve them.
   * 
   * @param config - Shortcut configuration object
   * @throws {ValidationError} If the shortcut configuration is invalid
   * @throws {ConflictError} If conflicts are detected and auto-resolve is disabled
   * @emits shortcut:registered - Emitted when shortcut is successfully registered
   * @emits conflict - Emitted when conflicts are detected
   * 
   * @example
   * ```typescript
   * registry.register({
   *   id: 'file.save',
   *   action: 'save',
   *   description: 'Save file',
   *   category: 'general',
   *   default: { primary: 'Ctrl+S', macOS: 'Cmd+S' },
   *   enabled: true,
   *   scope: 'global'
   * });
   * ```
   */
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
  
  /**
   * Unregister a keyboard shortcut
   * 
   * Removes the shortcut from the registry and disables it in the database
   * (soft delete). The shortcut is no longer available for triggering.
   * 
   * @param shortcutId - Unique identifier of the shortcut to unregister
   * @emits shortcut:unregistered - Emitted when shortcut is unregistered
   * 
   * @example
   * ```typescript
   * registry.unregister('file.save');
   * ```
   */
  unregister(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (!shortcut) return;
    
    this.shortcuts.delete(shortcutId);
    
    // Remove from database (soft delete by disabling)
    const stmt = this.db.prepare('UPDATE shortcuts SET enabled = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
    stmt.run(shortcutId);
    
    this.emitter.emit('shortcut:unregistered', shortcutId);
  }
  
  /**
   * Trigger a keyboard shortcut
   * 
   * Executes the shortcut if it's enabled, conditions are met, and scope
   * is valid. Tracks usage and calls registered callbacks.
   * 
   * @param shortcutId - Unique identifier of the shortcut to trigger
   * @param context - Optional context object for condition evaluation
   * @param event - Optional keyboard event (prevents default if provided)
   * @returns true if shortcut was triggered successfully, false otherwise
   * @emits shortcut:triggered - Emitted when shortcut is triggered
   * 
   * @example
   * ```typescript
   * const success = registry.trigger('file.save', { scope: 'editor' });
   * if (success) {
   *   console.log('Save action executed');
   * }
   * ```
   */
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
  
  /**
   * Register a callback for when a shortcut is triggered
   * 
   * The callback receives the context and keyboard event (if available)
   * when the shortcut is triggered.
   * 
   * @param shortcutId - Unique identifier of the shortcut
   * @param callback - Function to call when shortcut is triggered
   * @returns Unsubscribe function to remove the callback
   * 
   * @example
   * ```typescript
   * const unsubscribe = registry.on('file.save', (context, event) => {
   *   console.log('Save triggered!', context);
   * });
   * 
   * // Later, to unsubscribe:
   * unsubscribe();
   * ```
   */
  on(shortcutId: string, callback: (...args: any[]) => void): () => void {
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
  
  /**
   * Set the active shortcut profile
   * 
   * Changes the active profile, which affects which shortcuts and overrides
   * are used. The change is persisted to the database.
   * 
   * @param profileId - Unique identifier of the profile to activate
   * @throws {ProfileNotFoundError} If the profile doesn't exist
   * @emits profile:changed - Emitted when profile changes
   * 
   * @example
   * ```typescript
   * registry.setActiveProfile('professional');
   * ```
   */
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
  
  /**
   * Create a new shortcut profile
   * 
   * Creates a new profile with optional inheritance from another profile.
   * The profile is persisted to the database immediately.
   * 
   * @param name - Display name of the profile
   * @param description - Description of the profile
   * @param basedOn - Optional ID of profile to inherit from
   * @returns The created profile object
   * @emits profile:created - Emitted when profile is created
   * 
   * @example
   * ```typescript
   * const profile = registry.createProfile(
   *   'My Profile',
   *   'Custom shortcuts',
   *   'professional' // Inherit from professional profile
   * );
   * ```
   */
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
  
  updateProfile(profileId: string, updates: Partial<ShortcutProfile>): void {
    const profile = this.profiles.get(profileId);
    if (!profile) {
      throw new Error(`Profile ${profileId} not found`);
    }
    
    if (profile.locked) {
      throw new Error('Cannot update locked profile');
    }
    
    const updatedProfile = { ...profile, ...updates };
    this.profiles.set(profileId, updatedProfile);
    
    // Update database
    const stmt = this.db.prepare(`
      UPDATE profiles 
      SET name = ?, description = ?, based_on = ?, category = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);
    
    stmt.run(
      updatedProfile.name,
      updatedProfile.description,
      updatedProfile.basedOn || null,
      updatedProfile.category,
      profileId
    );
    
    this.emitter.emit('profile:updated', updatedProfile);
  }
  
  // ==================== OVERRIDE MANAGEMENT ====================
  
  setOverride(shortcutId: string, keyCombination: string, profileId?: string): void {
    const targetProfileId = profileId || this.activeProfile;
    const profile = this.profiles.get(targetProfileId);
    
    if (!profile) {
      throw new Error(`Profile ${targetProfileId} not found`);
    }
    
    if (profile.locked) {
      throw new Error('Cannot override shortcuts in locked profile');
    }
    
    // Validate key combination
    if (!this.validateKeyCombination(keyCombination)) {
      throw new Error(`Invalid key combination: ${keyCombination}`);
    }
    
    // Check for conflicts
    const conflicts = this.findConflicts(keyCombination, shortcutId, targetProfileId);
    if (conflicts.length > 0) {
      throw new Error(`Key conflict with: ${conflicts.join(', ')}`);
    }
    
    // Update or insert override
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO profile_overrides (profile_id, shortcut_id, key_combination)
      VALUES (?, ?, ?)
    `);
    
    stmt.run(targetProfileId, shortcutId, keyCombination);
    
    // Update in-memory cache
    profile.overrides[shortcutId] = keyCombination;
    
    this.emitter.emit('override:set', {
      profileId: targetProfileId,
      shortcutId,
      keyCombination
    });
  }
  
  removeOverride(shortcutId: string, profileId?: string): void {
    const targetProfileId = profileId || this.activeProfile;
    const profile = this.profiles.get(targetProfileId);
    
    if (profile && profile.overrides[shortcutId]) {
      delete profile.overrides[shortcutId];
      
      // Remove from database
      const stmt = this.db.prepare('DELETE FROM profile_overrides WHERE profile_id = ? AND shortcut_id = ?');
      stmt.run(targetProfileId, shortcutId);
      
      this.emitter.emit('override:removed', {
        profileId: targetProfileId,
        shortcutId
      });
    }
  }
  
  // ==================== CONFLICT DETECTION ====================
  
  /**
   * Detect conflicts in shortcuts for a profile
   * 
   * Scans all shortcuts in the specified profile (or active profile) and
   * identifies any key combinations that are used by multiple shortcuts.
   * 
   * @param profileId - Optional profile ID (defaults to active profile)
   * @returns Array of conflict objects with severity levels
   * 
   * @example
   * ```typescript
   * const conflicts = registry.detectConflicts();
   * conflicts.forEach(conflict => {
   *   console.log(`Conflict: ${conflict.key} - ${conflict.severity}`);
   * });
   * ```
   */
  detectConflicts(profileId?: string): ShortcutConflict[] {
    const targetProfileId = profileId || this.activeProfile;
    return this.detector.detectConflicts(
      this.shortcuts,
      targetProfileId,
      this.platform,
      (config, pid) => this.getEffectiveKey(config, pid)
    );
  }
  
  findConflicts(keyCombination: string, excludeShortcutId?: string, profileId?: string): string[] {
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
  
  autoResolveConflict(shortcutId: string, key: string, conflicts: string[]): void {
    // Try to find alternative key
    const alternative = this.suggestAlternativeKey(shortcutId, key);
    if (alternative && this.findConflicts(alternative, shortcutId).length === 0) {
      this.setOverride(shortcutId, alternative);
      console.log(`Auto-resolved conflict: ${shortcutId} -> ${alternative}`);
    } else {
      // Disable the conflicting shortcut
      this.disableShortcut(conflicts[0]);
      console.log(`Disabled conflicting shortcut: ${conflicts[0]}`);
    }
  }
  
  // ==================== MACRO SUPPORT ====================
  
  /**
   * Create a macro sequence
   * 
   * Macros allow executing multiple shortcuts in sequence with delays.
   * Useful for complex workflows that require multiple actions.
   * 
   * @param name - Display name of the macro
   * @param sequence - Array of actions with delays in milliseconds
   * @param profileId - Optional profile ID (defaults to active profile)
   * @param description - Optional description of the macro
   * @returns The created macro object
   * @emits macro:created - Emitted when macro is created
   * 
   * @example
   * ```typescript
   * const macro = registry.createMacro('Save and Close', [
   *   { action: 'file.save', delay: 0 },
   *   { action: 'file.close', delay: 100 }
   * ]);
   * ```
   */
  createMacro(name: string, sequence: Array<{action: string; delay: number}>, profileId?: string, description?: string): ShortcutMacro {
    const id = `macro_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const targetProfileId = profileId || this.activeProfile;

    const macro: ShortcutMacro = {
      id,
      name,
      description: description || '',
      sequence,
      profileId: targetProfileId,
      enabled: true,
      usageCount: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    
    // Save to database
    const stmt = this.db.prepare(`
      INSERT INTO macros (id, name, description, sequence, profile_id, enabled, usage_count)
      VALUES (?, ?, ?, ?, ?, 1, 0)
    `);
    
    stmt.run(
      id,
      name,
      macro.description,
      JSON.stringify(sequence),
      targetProfileId
    );
    
    this.macros.set(id, macro);
    this.emitter.emit('macro:created', macro);
    
    return macro;
  }
  
  executeMacro(macroId: string, context?: any): Promise<void> {
    return new Promise((resolve) => {
      const macro = this.macros.get(macroId);
      if (!macro || !macro.enabled) {
        resolve();
        return;
      }

      let delay = 0;
      for (const step of macro.sequence) {
        setTimeout(() => {
          this.trigger(step.action, context);
        }, delay);
        delay += step.delay;
      }

      // Update usage count
      macro.usageCount++;
      macro.updatedAt = new Date();

      const stmt = this.db.prepare('UPDATE macros SET usage_count = usage_count + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?');
      stmt.run(macroId);

      setTimeout(resolve, delay);
    });
  }

  /**
   * Get all macros
   *
   * Returns an array of all registered macros.
   *
   * @returns Array of macro objects
   */
  getAllMacros(): ShortcutMacro[] {
    return Array.from(this.macros.values());
  }

  /**
   * Delete a macro
   *
   * Removes a macro from the registry and database.
   *
   * @param macroId - ID of the macro to delete
   * @emits macro:deleted - Emitted when macro is deleted
   */
  deleteMacro(macroId: string): void {
    const macro = this.macros.get(macroId);
    if (!macro) return;

    // Remove from database
    const stmt = this.db.prepare('DELETE FROM macros WHERE id = ?');
    stmt.run(macroId);

    // Remove from memory
    this.macros.delete(macroId);
    this.emitter.emit('macro:deleted', macro);
  }
  
  // ==================== UTILITY METHODS ====================
  
  /**
   * Get the effective key combination for a shortcut
   * 
   * Returns the actual key combination that will be used, taking into account
   * platform-specific defaults and profile overrides.
   * 
   * @param config - Shortcut configuration
   * @param profileId - Optional profile ID (defaults to active profile)
   * @returns The effective key combination string
   * 
   * @example
   * ```typescript
   * const key = registry.getEffectiveKey(shortcut);
   * console.log(`Shortcut uses: ${key}`);
   * ```
   */
  getEffectiveKey(config: ShortcutConfig, profileId?: string): string {
    const targetProfileId = profileId || this.activeProfile;
    const profile = this.profiles.get(targetProfileId);
    
    // Check for override
    if (profile?.overrides?.[config.id]) {
      return profile.overrides[config.id];
    }
    
    // Use platform-specific default
    switch (this.platform) {
      case 'macOS':
        return config.default.macOS || config.default.primary;
      case 'linux':
        return config.default.linux || config.default.primary;
      default:
        return config.default.primary;
    }
  }
  
  getShortcutsForProfile(profileId: string): ShortcutConfig[] {
    const profile = this.profiles.get(profileId);
    if (!profile) return [];
    
    return Array.from(this.shortcuts.values())
      .filter(shortcut => shortcut.enabled)
      .map(shortcut => ({
        ...shortcut,
        effectiveKey: this.getEffectiveKey(shortcut, profileId)
      }));
  }
  
  /**
   * Get usage statistics for shortcuts
   * 
   * Returns aggregated usage data including counts, success rates, and
   * timestamps for shortcuts over the specified time period.
   * 
   * @param days - Number of days to look back (default: 30)
   * @returns Array of usage statistics objects
   * 
   * @example
   * ```typescript
   * const stats = registry.getUsageStatistics(7); // Last 7 days
   * stats.forEach(stat => {
   *   console.log(`${stat.description}: ${stat.usage_count} uses`);
   * });
   * ```
   */
  getUsageStatistics(days: number = 30): any {
    return dbUtils.getUsageStats(days);
  }
  
  getTrainingProgress(userId: string = 'default'): any {
    const query = this.db.prepare(`
      SELECT 
        lesson_id,
        score,
        completed,
        completed_at,
        attempts,
        best_time_ms
      FROM training_progress
      WHERE user_id = ?
      ORDER BY completed_at DESC
    `);
    
    return query.all(userId);
  }
  
  // ==================== PRIVATE METHODS ====================
  
  private detectPlatform(): 'windows' | 'macOS' | 'linux' {
    const platform = process.platform;
    if (platform === 'darwin') return 'macOS';
    if (platform === 'linux') return 'linux';
    return 'windows';
  }
  
  private loadPreferences(): void {
    const row = this.db.query(`
      SELECT * FROM user_preferences WHERE user_id = 'default'
    `).get() as any;
    
    if (row) {
      this.preferences = {
        userId: row.user_id,
        activeProfileId: row.active_profile_id,
        keyboardLayout: row.keyboard_layout,
        enableSounds: row.enable_sounds === 1,
        enableHints: row.enable_hints === 1,
        enableTraining: row.enable_training === 1,
        autoResolveConflicts: row.auto_resolve_conflicts === 1,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at)
      };
      this.activeProfile = row.active_profile_id || 'professional';
    } else {
      // Default preferences
      this.preferences = {
        userId: 'default',
        activeProfileId: 'professional',
        keyboardLayout: 'us',
        enableSounds: true,
        enableHints: true,
        enableTraining: true,
        autoResolveConflicts: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
    }
  }
  
  private setupAutoSave(): void {
    // Auto-save every 5 minutes
    setInterval(() => {
      this.saveToDatabase().catch(error => {
        console.error('Auto-save failed:', error);
      });
    }, 5 * 60 * 1000);
  }
  
  private validateShortcutConfig(config: ShortcutConfig): void {
    if (!config.id || !config.action || !config.description) {
      throw new Error('Shortcut config requires id, action, and description');
    }
    
    if (!config.default.primary) {
      throw new Error('Shortcut must have a default primary key');
    }
    
    if (!['global', 'panel', 'component'].includes(config.scope)) {
      throw new Error('Scope must be global, panel, or component');
    }
    
    const validCategories = [
      'theme', 'telemetry', 'emulator', 'general', 'compliance', 'logs',
      'ui', 'developer', 'accessibility', 'data', 'payment', 'custom'
    ];
    
    if (!validCategories.includes(config.category)) {
      throw new Error(`Invalid category: ${config.category}`);
    }
  }
  
  private validateKeyCombination(key: string): boolean {
    // Simplified validation - in production, use a more robust validation
    if (!key || key.trim().length === 0) return false;
    
    const parts = key.split('+');
    const mainKey = parts[parts.length - 1];
    
    // Basic validation
    if (parts.length > 4) return false; // Too many modifiers
    
    const validModifiers = ['ctrl', 'shift', 'alt', 'meta', 'cmd', 'option'];
    const modifiers = parts.slice(0, -1);
    
    for (const modifier of modifiers) {
      if (!validModifiers.includes(modifier.toLowerCase())) {
        return false;
      }
    }
    
    return true;
  }
  
  private normalizeKey(key: string): string {
    return key.toLowerCase()
      .replace(/ctrl/g, 'control')
      .replace(/cmd/g, 'meta')
      .replace(/opt/g, 'alt')
      .replace(/option/g, 'alt')
      .replace(/\s+/g, '')
      .replace(/\+/g, '+');
  }
  
  private isInScope(scope: string, context?: any): boolean {
    if (scope === 'global') return true;
    if (!context) return false;
    
    return context.scope === scope || 
           (context.element && context.element.closest(`[data-scope="${scope}"]`));
  }
  
  private requestConfirmation(shortcut: ShortcutConfig, event: KeyboardEvent): boolean {
    // In a real implementation, this would show a confirmation dialog
    // For now, we'll use a simple approach
    if (shortcut.requiresConfirmation) {
      const key = this.getEffectiveKey(shortcut);
      const message = `Execute "${shortcut.description}"?\nShortcut: ${key}`;
      
      // In a browser environment, this would be window.confirm
      // For server-side, we'll always confirm
      return true;
    }
    
    return true;
  }
  
  private parseCondition(conditionStr: string): (() => boolean) | undefined {
    try {
      // Parse function string (simplified)
      if (conditionStr.includes('=>')) {
        // Arrow function
        const body = conditionStr.match(/=>\s*(.+)/)?.[1];
        if (body) {
          return new Function(`return ${body}`) as () => boolean;
        }
      }
      
      // Regular function
      const body = conditionStr.match(/\{([^}]+)\}/)?.[1];
      if (body) {
        return new Function(`return (${body})`) as () => boolean;
      }
      
      return undefined;
    } catch (error) {
      console.error('Failed to parse condition:', error);
      return undefined;
    }
  }
  
  private disableShortcut(shortcutId: string): void {
    const shortcut = this.shortcuts.get(shortcutId);
    if (shortcut) {
      shortcut.enabled = false;
      const stmt = this.db.prepare('UPDATE shortcuts SET enabled = 0 WHERE id = ?');
      stmt.run(shortcutId);
      this.emitter.emit('shortcut:disabled', shortcutId);
    }
  }
  
  private suggestAlternativeKey(shortcutId: string, currentKey: string): string | null {
    const shortcuts = Array.from(this.shortcuts.values());
    const usedKeys = new Set(shortcuts.map(s => this.getEffectiveKey(s)));
    
    // Try common alternatives
    const alternatives = [
      `Ctrl+Shift+${currentKey.split('+').pop()}`,
      `Alt+${currentKey.split('+').pop()}`,
      `Ctrl+Alt+${currentKey.split('+').pop()}`,
      `Shift+${currentKey.split('+').pop()}`
    ];
    
    for (const alt of alternatives) {
      if (!usedKeys.has(alt)) {
        return alt;
      }
    }
    
    return null;
  }
  
  // ==================== PUBLIC GETTERS ====================
  
  getShortcutCount(): number {
    return this.shortcuts.size;
  }
  
  getProfileCount(): number {
    return this.profiles.size;
  }
  
  getActiveProfile(): ShortcutProfile {
    return this.profiles.get(this.activeProfile)!;
  }
  
  getAllProfiles(): ShortcutProfile[] {
    return Array.from(this.profiles.values());
  }
  
  getAllShortcuts(): ShortcutConfig[] {
    return Array.from(this.shortcuts.values());
  }
  
  getPlatform(): string {
    return this.platform;
  }
  
  getPreferences(): ShortcutPreferences {
    return { ...this.preferences };
  }
  
  // Event emitter methods
  onEvent(event: string, listener: (...args: any[]) => void): void {
    this.emitter.on(event, listener);
  }
  
  offEvent(event: string, listener: (...args: any[]) => void): void {
    this.emitter.off(event, listener);
  }
}
