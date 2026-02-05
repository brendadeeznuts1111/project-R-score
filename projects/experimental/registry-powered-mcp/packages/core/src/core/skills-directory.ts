/**
 * Skills Directory Infrastructure v2.4.1
 * Level 1: State - Boot-time skill registry with SHA-256 integrity verification
 *
 * Golden Matrix Integration:
 * | Skills-Directory-Loader | Level 1: State | I/O: <5ms | sha256-... | ACTIVE |
 *
 * Powered by Bun Native APIs:
 * - Bun.file() for zero-copy skill loading (<5ms per skill)
 * - Bun.CryptoHasher for SHA-256 integrity verification (<0.5ms)
 * - Bun.watch() for hot-reload capability (<10ms reload)
 * - URLPattern for skill route matching (O(1) dispatch)
 * - Native TOML import for config parsing
 */

// Quiet mode for tests - suppress boot sequence logging
const QUIET_MODE = process.env.NODE_ENV === 'test' || process.env.LATTICE_QUIET === 'true';
const log = QUIET_MODE ? (() => {}) : console.log.bind(console);
const warn = QUIET_MODE ? (() => {}) : console.warn.bind(console);
const error = console.error.bind(console); // Always show errors

import type { InfrastructureFeature } from '../types/feature-flags';

/**
 * Skill permission types for security validation
 */
export type SkillPermission =
  | 'filesystem:read'
  | 'filesystem:write'
  | 'network:fetch'
  | 'network:serve'
  | 'crypto:sign'
  | 'crypto:encrypt'
  | 'env:read'
  | 'env:write';

/**
 * Skill route definition for URLPattern integration
 */
export interface SkillRoute {
  readonly pattern: string;
  readonly method: '*' | 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  readonly handler: string;
  readonly description?: string;
}

/**
 * Skill manifest interface (skill.json)
 * Immutable structure for compile-time safety
 */
export interface SkillManifest {
  readonly name: string;
  readonly version: string;
  readonly description: string;
  readonly integrity: `sha256-${string}`;
  readonly features: readonly InfrastructureFeature[];
  readonly entry: string;
  readonly author?: string;
  readonly repository?: string;
  readonly dependencies?: Record<string, string>;
  readonly permissions?: readonly SkillPermission[];
  readonly routes?: readonly SkillRoute[];
}

/**
 * Individual skill entry in config.toml
 */
export interface SkillEntry {
  readonly name: string;
  readonly path: string;
  readonly enabled: boolean;
  readonly priority: number;
  readonly features?: readonly InfrastructureFeature[];
}

/**
 * Skills directory configuration (config.toml)
 */
export interface SkillsDirectoryConfig {
  readonly version: string;
  readonly enabled: boolean;
  readonly hot_reload: boolean;
  readonly integrity_check: 'strict' | 'warn' | 'disabled';
  readonly feature_propagation: boolean;
  readonly load_timeout_ms: number;
  readonly skills: readonly SkillEntry[];
}

/**
 * Compiled skill route with URLPattern
 */
export interface CompiledSkillRoute {
  readonly pattern: URLPattern;
  readonly method: string;
  readonly handler: Function;
  readonly skillName: string;
  readonly originalPattern: string;
}

/**
 * Loaded skill with runtime metadata
 */
export interface LoadedSkill {
  readonly manifest: SkillManifest;
  readonly path: string;
  readonly scope: 'global' | 'local';
  readonly loadedAt: number;
  readonly integrityVerified: boolean;
  readonly module: unknown;
  readonly routes: readonly CompiledSkillRoute[];
}

/**
 * Per-skill loading timing
 */
export interface SkillLoadTiming {
  readonly skillName: string;
  readonly scope: 'global' | 'local';
  readonly loadTimeMs: number;
  readonly integrityCheckMs: number;
  readonly routeCompilationMs: number;
}

/**
 * Integrity violation report
 */
export interface IntegrityViolation {
  readonly skillName: string;
  readonly expectedHash: string;
  readonly actualHash: string;
  readonly severity: 'error' | 'warning';
  readonly action: 'blocked' | 'loaded_with_warning';
}

/**
 * Skills loading result with telemetry
 */
export interface SkillsLoadResult {
  readonly success: boolean;
  readonly loadedCount: number;
  readonly failedCount: number;
  readonly totalLoadTimeMs: number;
  readonly perSkillTimings: readonly SkillLoadTiming[];
  readonly integrityViolations: readonly IntegrityViolation[];
  readonly propagatedFeatures: readonly InfrastructureFeature[];
}

/**
 * Skills registry state
 */
export interface SkillsRegistry {
  readonly globalSkills: Map<string, LoadedSkill>;
  readonly localSkills: Map<string, LoadedSkill>;
  readonly routeIndex: Map<string, CompiledSkillRoute>;
  readonly featureFlags: Set<InfrastructureFeature>;
  readonly bootTime: number;
  readonly lastReload: number;
}

/**
 * Performance targets for skills loading (SLA)
 */
export const SKILLS_PERFORMANCE_TARGETS = {
  LOAD_PER_SKILL_MS: 5,
  INTEGRITY_CHECK_MS: 0.5,
  HOT_RELOAD_MS: 10,
  TOTAL_BOOT_IMPACT_MS: 50,
  ROUTE_COMPILATION_MS: 0.1,
} as const;

/**
 * Internal result type for skill loading
 */
interface SkillLoadInternalResult {
  success: boolean;
  timing: SkillLoadTiming;
  violation?: IntegrityViolation;
}

/**
 * SkillsDirectoryLoader - Bun-Native Skills Registry
 *
 * Boot Integration: Phase 1.5 in LatticeRouter 4-phase boot sequence
 *
 * Performance Contract:
 * - <5ms per skill loading
 * - <0.5ms integrity verification (SHA-256)
 * - <10ms hot-reload
 * - <50ms total boot impact for 10 skills
 */
export class SkillsDirectoryLoader {
  private globalSkills: Map<string, LoadedSkill> = new Map();
  private localSkills: Map<string, LoadedSkill> = new Map();
  private routeIndex: Map<string, CompiledSkillRoute> = new Map();
  private featureFlags: Set<InfrastructureFeature> = new Set();
  private watcher: ReturnType<typeof Bun.watch> | null = null;

  private readonly globalDir: string;
  private readonly localDir: string;

  private bootTime: number = 0;
  private lastReload: number = 0;

  constructor(options?: {
    globalDir?: string;
    localDir?: string;
  }) {
    this.globalDir = options?.globalDir ?? `${process.env.HOME}/.claude/skills`;
    this.localDir = options?.localDir ?? './.claude/skills';
  }

  /**
   * Initialize skills directory (Phase 1.5 of boot sequence)
   * Called after Native API Audit, before Server Registry
   */
  async initialize(): Promise<SkillsLoadResult> {
    const startTime = performance.now();
    log('🎯 LATTICE BOOT SEQUENCE: Skills Directory Loading (Phase 1.5)');

    const result = await this.loadAllSkills();

    this.bootTime = performance.now() - startTime;
    log(`✓ Loaded ${result.loadedCount} skills in ${this.bootTime.toFixed(2)}ms`);

    if (this.bootTime > SKILLS_PERFORMANCE_TARGETS.TOTAL_BOOT_IMPACT_MS) {
      warn(`⚠️  Skills loading exceeded target: ${this.bootTime.toFixed(2)}ms > ${SKILLS_PERFORMANCE_TARGETS.TOTAL_BOOT_IMPACT_MS}ms`);
    }

    return result;
  }

  /**
   * Load all skills from global and local directories
   */
  private async loadAllSkills(): Promise<SkillsLoadResult> {
    const perSkillTimings: SkillLoadTiming[] = [];
    const integrityViolations: IntegrityViolation[] = [];
    let loadedCount = 0;
    let failedCount = 0;

    // Load global skills first
    const globalConfig = await this.loadDirectoryConfig(this.globalDir);
    if (globalConfig?.enabled) {
      log(`  📂 Loading global skills from ${this.globalDir}`);
      for (const entry of globalConfig.skills) {
        if (!entry.enabled) continue;

        const result = await this.loadSkill(
          `${this.globalDir}/${entry.path}`,
          'global',
          globalConfig
        );

        if (result.success) {
          loadedCount++;
          perSkillTimings.push(result.timing);
        } else {
          failedCount++;
          if (result.violation) {
            integrityViolations.push(result.violation);
          }
        }
      }
    }

    // Load local skills (override global with same name)
    const localConfig = await this.loadDirectoryConfig(this.localDir);
    if (localConfig?.enabled) {
      log(`  📂 Loading local skills from ${this.localDir}`);
      for (const entry of localConfig.skills) {
        if (!entry.enabled) continue;

        const result = await this.loadSkill(
          `${this.localDir}/${entry.path}`,
          'local',
          localConfig
        );

        if (result.success) {
          loadedCount++;
          perSkillTimings.push(result.timing);
        } else {
          failedCount++;
          if (result.violation) {
            integrityViolations.push(result.violation);
          }
        }
      }
    }

    const totalLoadTimeMs = perSkillTimings.reduce(
      (sum, t) => sum + t.loadTimeMs, 0
    );

    return {
      success: failedCount === 0,
      loadedCount,
      failedCount,
      totalLoadTimeMs,
      perSkillTimings,
      integrityViolations,
      propagatedFeatures: Array.from(this.featureFlags),
    };
  }

  /**
   * Load directory configuration (config.toml)
   * Uses Bun's native TOML import
   */
  private async loadDirectoryConfig(dir: string): Promise<SkillsDirectoryConfig | null> {
    const configPath = `${dir}/config.toml`;

    try {
      const file = Bun.file(configPath);
      if (!await file.exists()) {
        return null;
      }

      // Use Bun's native TOML parsing with dynamic import
      const absolutePath = configPath.startsWith('/') ? configPath : `${process.cwd()}/${configPath}`;
      const config = await import(absolutePath, {
        with: { type: 'toml' }
      }) as { default: SkillsDirectoryConfig };

      return config.default;
    } catch (error) {
      warn(`  ⚠️  Could not load config from ${configPath}:`, error);
      return null;
    }
  }

  /**
   * Load a single skill with integrity verification
   */
  private async loadSkill(
    skillPath: string,
    scope: 'global' | 'local',
    config: SkillsDirectoryConfig
  ): Promise<SkillLoadInternalResult> {
    const startTime = performance.now();
    let integrityCheckTime = 0;
    let routeCompilationTime = 0;

    try {
      // Load manifest
      const manifestPath = `${skillPath}/skill.json`;
      const manifestFile = Bun.file(manifestPath);

      if (!await manifestFile.exists()) {
        warn(`  ⚠️  Skill manifest not found: ${manifestPath}`);
        return {
          success: false,
          timing: this.createTiming('unknown', scope, startTime, 0, 0),
        };
      }

      const manifestContent = await manifestFile.text();
      const manifest: SkillManifest = JSON.parse(manifestContent);

      // Integrity verification
      const integrityStart = performance.now();
      const integrityResult = await this.verifyIntegrity(
        skillPath,
        manifest,
        config.integrity_check
      );
      integrityCheckTime = performance.now() - integrityStart;

      if (!integrityResult.valid && config.integrity_check === 'strict') {
        error(`  ❌ Integrity check failed for skill "${manifest.name}"`);
        return {
          success: false,
          timing: this.createTiming(manifest.name, scope, startTime, integrityCheckTime, 0),
          violation: integrityResult.violation,
        };
      }

      // Load skill module
      const entryPath = `${skillPath}/${manifest.entry}`;
      const absoluteEntryPath = entryPath.startsWith('/') ? entryPath : `${process.cwd()}/${entryPath}`;
      const module = await import(absoluteEntryPath);

      // Compile routes
      const routeStart = performance.now();
      const compiledRoutes = this.compileSkillRoutes(manifest, module);
      routeCompilationTime = performance.now() - routeStart;

      // Register skill
      const loadedSkill: LoadedSkill = {
        manifest,
        path: skillPath,
        scope,
        loadedAt: Date.now(),
        integrityVerified: integrityResult.valid,
        module,
        routes: compiledRoutes,
      };

      if (scope === 'global') {
        this.globalSkills.set(manifest.name, loadedSkill);
      } else {
        this.localSkills.set(manifest.name, loadedSkill);
      }

      // Register routes
      for (const route of compiledRoutes) {
        this.routeIndex.set(`${route.method}:${route.originalPattern}`, route);
      }

      // Propagate feature flags
      for (const feature of manifest.features) {
        this.featureFlags.add(feature);
      }

      const loadTime = performance.now() - startTime;
      log(`    ✓ ${manifest.name}@${manifest.version} (${loadTime.toFixed(2)}ms)`);

      return {
        success: true,
        timing: this.createTiming(
          manifest.name, scope, startTime, integrityCheckTime, routeCompilationTime
        ),
        violation: integrityResult.violation,
      };

    } catch (error) {
      error(`  ❌ Failed to load skill at ${skillPath}:`, error);
      return {
        success: false,
        timing: this.createTiming('unknown', scope, startTime, integrityCheckTime, routeCompilationTime),
      };
    }
  }

  /**
   * Verify skill integrity using SHA-256
   * Uses Bun.CryptoHasher for native performance
   */
  private async verifyIntegrity(
    skillPath: string,
    manifest: SkillManifest,
    mode: 'strict' | 'warn' | 'disabled'
  ): Promise<{
    valid: boolean;
    violation?: IntegrityViolation;
  }> {
    if (mode === 'disabled') {
      return { valid: true };
    }

    const entryPath = `${skillPath}/${manifest.entry}`;
    const file = Bun.file(entryPath);

    if (!await file.exists()) {
      return {
        valid: false,
        violation: {
          skillName: manifest.name,
          expectedHash: manifest.integrity,
          actualHash: 'file-not-found',
          severity: mode === 'strict' ? 'error' : 'warning',
          action: mode === 'strict' ? 'blocked' : 'loaded_with_warning',
        },
      };
    }

    const content = await file.arrayBuffer();

    // Use Bun's native CryptoHasher
    const hasher = new Bun.CryptoHasher('sha256');
    hasher.update(new Uint8Array(content));
    const actualHash = `sha256-${hasher.digest('hex')}`;

    if (actualHash !== manifest.integrity) {
      const violation: IntegrityViolation = {
        skillName: manifest.name,
        expectedHash: manifest.integrity,
        actualHash,
        severity: mode === 'strict' ? 'error' : 'warning',
        action: mode === 'strict' ? 'blocked' : 'loaded_with_warning',
      };

      if (mode === 'warn') {
        warn(`  ⚠️  Integrity mismatch for skill "${manifest.name}": ${actualHash}`);
        return { valid: true, violation };
      }

      return { valid: false, violation };
    }

    return { valid: true };
  }

  /**
   * Compile skill routes to URLPattern instances
   */
  private compileSkillRoutes(
    manifest: SkillManifest,
    module: Record<string, unknown>
  ): CompiledSkillRoute[] {
    if (!manifest.routes) return [];

    return manifest.routes
      .filter(route => typeof module[route.handler] === 'function')
      .map(route => ({
        pattern: new URLPattern({ pathname: route.pattern }),
        method: route.method,
        handler: module[route.handler] as Function,
        skillName: manifest.name,
        originalPattern: route.pattern,
      }));
  }

  /**
   * Create timing record
   */
  private createTiming(
    skillName: string,
    scope: 'global' | 'local',
    startTime: number,
    integrityCheckMs: number,
    routeCompilationMs: number
  ): SkillLoadTiming {
    return {
      skillName,
      scope,
      loadTimeMs: performance.now() - startTime,
      integrityCheckMs,
      routeCompilationMs,
    };
  }

  /**
   * Enable hot-reload watching
   */
  async enableHotReload(): Promise<void> {
    if (this.watcher) return;

    log('🔄 Enabling skills hot-reload');

    const paths: string[] = [];

    // Check which directories exist
    const globalExists = await Bun.file(`${this.globalDir}/config.toml`).exists();
    const localExists = await Bun.file(`${this.localDir}/config.toml`).exists();

    if (globalExists) paths.push(this.globalDir);
    if (localExists) paths.push(this.localDir);

    if (paths.length === 0) {
      warn('  ⚠️  No skill directories to watch');
      return;
    }

    this.watcher = Bun.watch(paths, {
      recursive: true,
      ignorePermissionErrors: true,
    });

    // Handle watch events in background
    this.watchForChanges();
  }

  /**
   * Watch for file changes and reload affected skills
   */
  private async watchForChanges(): Promise<void> {
    if (!this.watcher) return;

    for await (const event of this.watcher) {
      if (event.path.endsWith('.ts') || event.path.endsWith('.json') || event.path.endsWith('.toml')) {
        const reloadStart = performance.now();
        await this.reloadAffectedSkill(event.path);
        this.lastReload = performance.now() - reloadStart;

        if (this.lastReload > SKILLS_PERFORMANCE_TARGETS.HOT_RELOAD_MS) {
          warn(`⚠️  Hot-reload exceeded target: ${this.lastReload.toFixed(2)}ms`);
        }
      }
    }
  }

  /**
   * Reload skill affected by file change
   */
  private async reloadAffectedSkill(changedPath: string): Promise<void> {
    const scope = changedPath.includes(this.globalDir) ? 'global' : 'local';
    const skills = scope === 'global' ? this.globalSkills : this.localSkills;
    const dir = scope === 'global' ? this.globalDir : this.localDir;

    for (const [name, skill] of skills) {
      if (changedPath.startsWith(skill.path)) {
        log(`🔄 Reloading skill: ${name}`);

        // Remove old routes
        for (const route of skill.routes) {
          this.routeIndex.delete(`${route.method}:${route.originalPattern}`);
        }

        // Remove old features
        for (const feature of skill.manifest.features) {
          this.featureFlags.delete(feature);
        }

        // Reload skill
        const config = await this.loadDirectoryConfig(dir);
        if (config) {
          await this.loadSkill(skill.path, scope, config);
        }
        break;
      }
    }
  }

  /**
   * Match request to skill route
   */
  matchRoute(pathname: string, method: string): CompiledSkillRoute | null {
    for (const [, route] of this.routeIndex) {
      if (route.method !== '*' && route.method !== method) continue;

      const testUrl = `http://localhost${pathname}`;
      if (route.pattern.test(testUrl)) {
        return route;
      }
    }
    return null;
  }

  /**
   * Get all propagated feature flags
   */
  getPropagatedFeatures(): readonly InfrastructureFeature[] {
    return Array.from(this.featureFlags);
  }

  /**
   * Get skill by name (local takes precedence over global)
   */
  getSkill(name: string): LoadedSkill | null {
    return this.localSkills.get(name) ?? this.globalSkills.get(name) ?? null;
  }

  /**
   * Get all loaded skills
   */
  getAllSkills(): LoadedSkill[] {
    const all: LoadedSkill[] = [];
    for (const skill of this.globalSkills.values()) {
      all.push(skill);
    }
    for (const skill of this.localSkills.values()) {
      // Local overrides global
      const existing = all.findIndex(s => s.manifest.name === skill.manifest.name);
      if (existing >= 0) {
        all[existing] = skill;
      } else {
        all.push(skill);
      }
    }
    return all;
  }

  /**
   * Get skills registry state
   */
  getRegistry(): SkillsRegistry {
    return {
      globalSkills: this.globalSkills,
      localSkills: this.localSkills,
      routeIndex: this.routeIndex,
      featureFlags: this.featureFlags,
      bootTime: this.bootTime,
      lastReload: this.lastReload,
    };
  }

  /**
   * Cleanup and stop watching
   */
  async shutdown(): Promise<void> {
    if (this.watcher) {
      this.watcher.stop();
      this.watcher = null;
    }
    this.globalSkills.clear();
    this.localSkills.clear();
    this.routeIndex.clear();
    this.featureFlags.clear();
  }
}
