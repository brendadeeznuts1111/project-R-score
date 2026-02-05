/**
 * Pattern Registry Module
 * Central registry for pattern definitions, connections, and management
 */

import type {
  PatternType,
  PatternContext,
  PatternDefinition,
  PatternConnection,
  DEFAULT_PATTERN_CONFIG,
  PATTERN_DESCRIPTIONS,
} from '../core/pattern-types';

export class PatternRegistry {
  private patterns: Map<PatternType, PatternDefinition> = new Map();
  private connections: Map<string, PatternConnection[]> = new Map();
  private contextMappings: Map<PatternContext, PatternType[]> = new Map();

  constructor() {
    this.initializePatterns();
    this.initializeConnections();
    this.initializeContextMappings();
  }

  /**
   * Register a new pattern
   */
  registerPattern(pattern: PatternDefinition): void {
    this.patterns.set(pattern.name, pattern);
    console.log(`📝 Registered pattern: ${pattern.emoji} ${pattern.name} - ${pattern.description}`);
  }

  /**
   * Get pattern definition
   */
  getPattern(patternName: PatternType): PatternDefinition | null {
    return this.patterns.get(patternName) || null;
  }

  /**
   * Get all patterns
   */
  getAllPatterns(): PatternDefinition[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Check if pattern exists
   */
  hasPattern(patternName: PatternType): boolean {
    return this.patterns.has(patternName);
  }

  /**
   * Get patterns for a specific context
   */
  getPatternsForContext(context: PatternContext): PatternType[] {
    return this.contextMappings.get(context) || [];
  }

  /**
   * Get contexts for a specific pattern
   */
  getContextsForPattern(pattern: PatternType): PatternContext[] {
    const contexts: PatternContext[] = [];
    for (const [context, patterns] of this.contextMappings) {
      if (patterns.includes(pattern)) {
        contexts.push(context);
      }
    }
    return contexts;
  }

  /**
   * Add pattern connection
   */
  addConnection(connection: PatternConnection): void {
    const key = this.getConnectionKey(connection.from, connection.to);
    if (!this.connections.has(key)) {
      this.connections.set(key, []);
    }
    this.connections.get(key)!.push(connection);

    // Add reverse connection if bidirectional
    if (connection.bidirectional) {
      const reverseKey = this.getConnectionKey(connection.to, connection.from);
      if (!this.connections.has(reverseKey)) {
        this.connections.set(reverseKey, []);
      }
      this.connections.get(reverseKey)!.push({
        ...connection,
        from: connection.to,
        to: connection.from,
      });
    }
  }

  /**
   * Get connections for a pattern
   */
  getConnections(pattern: PatternType): PatternConnection[] {
    const connections: PatternConnection[] = [];
    for (const [key, connectionList] of this.connections) {
      if (key.startsWith(`${pattern}_`)) {
        connections.push(...connectionList);
      }
    }
    return connections;
  }

  /**
   * Check if two patterns are connected
   */
  areConnected(pattern1: PatternType, pattern2: PatternType): boolean {
    const key = this.getConnectionKey(pattern1, pattern2);
    const connections = this.connections.get(key);
    return connections && connections.length > 0;
  }

  /**
   * Get connection strength between patterns
   */
  getConnectionStrength(pattern1: PatternType, pattern2: PatternType): number {
    const key = this.getConnectionKey(pattern1, pattern2);
    const connections = this.connections.get(key);
    if (!connections || connections.length === 0) return 0;

    // Return the strongest connection
    return Math.max(...connections.map(c => c.strength));
  }

  /**
   * Get pattern dependencies
   */
  getDependencies(pattern: PatternType): PatternType[] {
    const patternDef = this.getPattern(pattern);
    return patternDef?.dependencies || [];
  }

  /**
   * Get patterns that depend on a specific pattern
   */
  getDependents(pattern: PatternType): PatternType[] {
    const dependents: PatternType[] = [];
    for (const [_, patternDef] of this.patterns) {
      if (patternDef.dependencies.includes(pattern)) {
        dependents.push(patternDef.name);
      }
    }
    return dependents;
  }

  /**
   * Validate pattern configuration
   */
  validatePatternConfig(pattern: PatternType): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const patternDef = this.getPattern(pattern);
    if (!patternDef) {
      return {
        isValid: false,
        errors: [`Pattern ${pattern} is not registered`],
        warnings: [],
      };
    }

    const errors: string[] = [];
    const warnings: string[] = [];

    // Check dependencies
    for (const dependency of patternDef.dependencies) {
      if (!this.hasPattern(dependency)) {
        errors.push(`Missing dependency: ${dependency}`);
      }
    }

    // Check configuration
    const config = patternDef.config;
    if (config.timeout && config.timeout < 0) {
      errors.push('Timeout must be positive');
    }
    if (config.retries && config.retries < 0) {
      errors.push('Retries must be non-negative');
    }
    if (config.priority < 0 || config.priority > 10) {
      warnings.push('Priority should be between 0-10');
    }

    return { isValid: errors.length === 0, errors, warnings };
  }

  /**
   * Get registry statistics
   */
  getStatistics(): {
    totalPatterns: number;
    enabledPatterns: number;
    totalConnections: number;
    contextsCovered: number;
    patternDistribution: Record<PatternType, number>;
  } {
    const enabledPatterns = Array.from(this.patterns.values()).filter(p => p.config.enabled).length;

    let totalConnections = 0;
    for (const connections of this.connections.values()) {
      totalConnections += connections.length;
    }

    const patternDistribution = {} as Record<PatternType, number>;
    for (const [context, patterns] of this.contextMappings) {
      patterns.forEach(pattern => {
        patternDistribution[pattern] = (patternDistribution[pattern] || 0) + 1;
      });
    }

    return {
      totalPatterns: this.patterns.size,
      enabledPatterns,
      totalConnections: totalConnections / 2, // Divide by 2 since connections are stored bidirectionally
      contextsCovered: this.contextMappings.size,
      patternDistribution,
    };
  }

  /**
   * Export registry data
   */
  exportRegistry(): {
    patterns: Record<PatternType, PatternDefinition>;
    connections: Record<string, PatternConnection[]>;
    contextMappings: Record<PatternContext, PatternType[]>;
    statistics: any;
  } {
    const patterns: Record<PatternType, PatternDefinition> = {};
    for (const [key, value] of this.patterns) {
      patterns[key] = value;
    }

    const connections: Record<string, PatternConnection[]> = {};
    for (const [key, value] of this.connections) {
      connections[key] = value;
    }

    const contextMappings: Record<PatternContext, PatternType[]> = {};
    for (const [key, value] of this.contextMappings) {
      contextMappings[key] = value;
    }

    return {
      patterns,
      connections,
      contextMappings,
      statistics: this.getStatistics(),
    };
  }

  // Private methods

  private initializePatterns(): void {
    const patternTypes: PatternType[] = [
      'LOADER',
      'STYLER',
      'TABULAR',
      'SECURE',
      'TIMING',
      'BUILDER',
      'VERSIONER',
      'SHELL',
      'BUNX',
      'INTERACTIVE',
      'STREAM',
      'FILESYSTEM',
      'UTILITIES',
    ];

    patternTypes.forEach(patternType => {
      const config = DEFAULT_PATTERN_CONFIG[patternType];
      const description = PATTERN_DESCRIPTIONS[patternType];

      const pattern: PatternDefinition = {
        name: patternType,
        description: description.description,
        emoji: description.emoji,
        contexts: this.getContextsForPattern(patternType),
        dependencies: this.getDefaultDependencies(patternType),
        config,
      };

      this.registerPattern(pattern);
    });

    console.log(`✅ Initialized ${patternTypes.length} pattern definitions`);
  }

  private initializeConnections(): void {
    const defaultConnections: Array<[PatternType, PatternType, number, boolean]> = [
      ['LOADER', 'TABULAR', 0.8, true],
      ['SECURE', 'TIMING', 0.9, false],
      ['BUILDER', 'VERSIONER', 0.7, true],
      ['SHELL', 'BUNX', 0.6, true],
      ['TIMING', 'TABULAR', 0.8, true],
      ['FILESYSTEM', 'LOADER', 0.9, false],
      ['UTILITIES', 'TABULAR', 0.5, true],
      ['STREAM', 'TIMING', 0.7, true],
      ['INTERACTIVE', 'SHELL', 0.8, false],
    ];

    defaultConnections.forEach(([from, to, strength, bidirectional]) => {
      this.addConnection({
        from,
        to,
        strength,
        bidirectional,
      });
    });

    console.log(`✅ Initialized ${defaultConnections.length} pattern connections`);
  }

  private initializeContextMappings(): void {
    const contextMappings: Record<PatternContext, PatternType[]> = {
      API: ['LOADER', 'SECURE', 'TIMING', 'TABULAR'],
      DATABASE: ['LOADER', 'TABULAR', 'TIMING'],
      BUILD: ['BUILDER', 'VERSIONER', 'TIMING', 'SHELL'],
      AUTH: ['SECURE', 'VERSIONER'],
      STYLES: ['STYLER', 'LOADER', 'BUILDER'],
      CONFIG: ['LOADER', 'VERSIONER'],
      MONITORING: ['TIMING', 'TABULAR'],
      REPORTS: ['TABULAR', 'TIMING', 'LOADER'],
      AUTOMATION: ['SHELL', 'BUNX', 'TIMING'],
      DEPLOYMENT: ['SHELL', 'BUILDER', 'SECURE', 'VERSIONER'],
      DEVELOPMENT: ['BUNX', 'SHELL', 'TIMING', 'TABULAR'],
      TOOLS: ['BUNX', 'SHELL', 'LOADER'],
      CLI: ['INTERACTIVE', 'SHELL', 'TABULAR', 'TIMING'],
      PIPES: ['STREAM', 'TIMING', 'TABULAR'],
      INPUT: ['INTERACTIVE', 'STREAM', 'SECURE'],
      VALIDATION: ['FILESYSTEM', 'TIMING', 'TABULAR'],
      FILES: ['FILESYSTEM', 'LOADER', 'SECURE'],
      TEXT: ['UTILITIES', 'TABULAR', 'TIMING'],
      COMPRESSION: ['UTILITIES', 'FILESYSTEM', 'TIMING'],
      DEBUGGING: ['UTILITIES', 'TIMING', 'TABULAR', 'INTERACTIVE'],
      PERFORMANCE: ['UTILITIES', 'TIMING', 'TABULAR'],
    };

    for (const [context, patterns] of Object.entries(contextMappings)) {
      this.contextMappings.set(context as PatternContext, patterns);
    }

    console.log(`✅ Initialized ${Object.keys(contextMappings).length} context mappings`);
  }

  private getDefaultDependencies(pattern: PatternType): PatternType[] {
    const dependencies: Record<PatternType, PatternType[]> = {
      LOADER: [],
      STYLER: ['LOADER'],
      TABULAR: [],
      SECURE: [],
      TIMING: [],
      BUILDER: ['SHELL'],
      VERSIONER: [],
      SHELL: [],
      BUNX: ['SHELL'],
      INTERACTIVE: ['SHELL'],
      STREAM: [],
      FILESYSTEM: [],
      UTILITIES: [],
    };

    return dependencies[pattern] || [];
  }

  private getConnectionKey(pattern1: PatternType, pattern2: PatternType): string {
    return `${pattern1}_${pattern2}`;
  }
}
