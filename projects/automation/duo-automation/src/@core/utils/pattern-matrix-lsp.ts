/**
 * Pattern Matrix LSP - Language Server Protocol Integration
 * Generates TypeScript types for enhanced IDE support and autocompletion
 */

export interface PatternDefinition {
  id: string;
  name: string;
  type: 'shortcut' | 'sequence' | 'conditional' | 'quantum' | 'neural';
  description: string;
  parameters?: PatternParameter[];
  returnType?: string;
  examples?: PatternExample[];
  metadata?: PatternMetadata;
}

export interface PatternParameter {
  name: string;
  type: string;
  required: boolean;
  description: string;
  defaultValue?: any;
  validation?: PatternValidation;
}

export interface PatternValidation {
  min?: number;
  max?: number;
  pattern?: RegExp;
  enum?: string[];
  custom?: (value: any) => boolean;
}

export interface PatternExample {
  description: string;
  code: string;
  expected?: any;
}

export interface PatternMetadata {
  category: string;
  tags: string[];
  complexity: 'simple' | 'intermediate' | 'advanced' | 'expert';
  deprecated?: boolean;
  since?: string;
  version?: string;
}

export class PatternMatrixLSP {
  private patterns: Map<string, PatternDefinition> = new Map();
  private typeCache: Map<string, string> = new Map();

  constructor() {
    this.initializeCorePatterns();
  }

  /**
   * Initialize core pattern definitions
   */
  private initializeCorePatterns(): void {
    // Core shortcut patterns
    this.registerPattern({
      id: 'basic-shortcut',
      name: 'BasicShortcut',
      type: 'shortcut',
      description: 'Basic keyboard shortcut pattern',
      parameters: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Key combination (e.g., "ctrl+s")'
        },
        {
          name: 'callback',
          type: 'Function',
          required: true,
          description: 'Function to execute when shortcut is triggered'
        },
        {
          name: 'options',
          type: 'ShortcutOptions',
          required: false,
          description: 'Optional configuration',
          defaultValue: {}
        }
      ],
      returnType: 'void',
      examples: [
        {
          description: 'Save shortcut',
          code: 'registerShortcut("ctrl+s", () => saveFile());'
        }
      ],
      metadata: {
        category: 'core',
        tags: ['shortcut', 'keyboard', 'basic'],
        complexity: 'simple',
        since: '1.0.0'
      }
    });

    // Sequence patterns
    this.registerPattern({
      id: 'key-sequence',
      name: 'KeySequence',
      type: 'sequence',
      description: 'Multi-key sequence pattern',
      parameters: [
        {
          name: 'keys',
          type: 'string[]',
          required: true,
          description: 'Array of keys in sequence'
        },
        {
          name: 'callback',
          type: 'Function',
          required: true,
          description: 'Function to execute when sequence is completed'
        },
        {
          name: 'timeout',
          type: 'number',
          required: false,
          description: 'Time between keys in milliseconds',
          defaultValue: 1000
        }
      ],
      returnType: 'void',
      examples: [
        {
          description: 'Gmail style sequence',
          code: 'registerSequence(["g", "i"], () => gotoInbox());'
        }
      ],
      metadata: {
        category: 'advanced',
        tags: ['sequence', 'multi-key', 'gmail'],
        complexity: 'intermediate',
        since: '1.0.0'
      }
    });

    // Conditional patterns
    this.registerPattern({
      id: 'conditional-shortcut',
      name: 'ConditionalShortcut',
      type: 'conditional',
      description: 'Shortcut that executes based on conditions',
      parameters: [
        {
          name: 'key',
          type: 'string',
          required: true,
          description: 'Key combination'
        },
        {
          name: 'conditions',
          type: 'ShortcutCondition[]',
          required: true,
          description: 'Array of conditions to evaluate'
        },
        {
          name: 'callback',
          type: 'Function',
          required: true,
          description: 'Function to execute if conditions are met'
        }
      ],
      returnType: 'void',
      examples: [
        {
          description: 'Context-aware shortcut',
          code: 'registerConditional("ctrl+shift+p", [isEditorFocused], openCommandPalette);'
        }
      ],
      metadata: {
        category: 'advanced',
        tags: ['conditional', 'context', 'smart'],
        complexity: 'advanced',
        since: '1.0.0'
      }
    });

    // Quantum patterns
    this.registerPattern({
      id: 'quantum-shortcut',
      name: 'QuantumShortcut',
      type: 'quantum',
      description: 'Quantum-enhanced shortcut with superposition',
      parameters: [
        {
          name: 'keys',
          type: 'string[]',
          required: true,
          description: 'Multiple possible keys (superposition)'
        },
        {
          name: 'callback',
          type: 'Function',
          required: true,
          description: 'Function to execute'
        },
        {
          name: 'quantumOptions',
          type: 'QuantumOptions',
          required: false,
          description: 'Quantum-specific options',
          defaultValue: { superposition: true, entanglement: false }
        }
      ],
      returnType: 'void',
      examples: [
        {
          description: 'Quantum superposition shortcut',
          code: 'registerQuantum(["ctrl+s", "cmd+s"], saveFile, { superposition: true });'
        }
      ],
      metadata: {
        category: 'quantum',
        tags: ['quantum', 'superposition', 'advanced'],
        complexity: 'expert',
        since: '2.0.0'
      }
    });

    // Neural patterns
    this.registerPattern({
      id: 'neural-shortcut',
      name: 'NeuralShortcut',
      type: 'neural',
      description: 'AI-powered shortcut that learns from user behavior',
      parameters: [
        {
          name: 'baseKey',
          type: 'string',
          required: true,
          description: 'Base key combination'
        },
        {
          name: 'neuralOptions',
          type: 'NeuralOptions',
          required: true,
          description: 'Neural network configuration'
        },
        {
          name: 'callback',
          type: 'Function',
          required: true,
          description: 'Function to execute'
        }
      ],
      returnType: 'void',
      examples: [
        {
          description: 'Learning shortcut',
          code: 'registerNeural("ctrl+k", { learning: true, adaptive: true }, smartSearch);'
        }
      ],
      metadata: {
        category: 'ai',
        tags: ['neural', 'learning', 'adaptive', 'ai'],
        complexity: 'expert',
        since: '3.0.0'
      }
    });
  }

  /**
   * Register a new pattern definition
   */
  registerPattern(pattern: PatternDefinition): void {
    this.patterns.set(pattern.id, pattern);
    this.clearTypeCache();
  }

  /**
   * Get pattern definition by ID
   */
  getPattern(id: string): PatternDefinition | undefined {
    return this.patterns.get(id);
  }

  /**
   * Get all registered patterns
   */
  getAllPatterns(): PatternDefinition[] {
    return Array.from(this.patterns.values());
  }

  /**
   * Generate TypeScript types for all patterns
   */
  generatePatternTypes(): string {
    if (this.typeCache.has('all')) {
      return this.typeCache.get('all')!;
    }

    const types = [
      this.generateHeader(),
      this.generateCoreInterfaces(),
      this.generatePatternTypes(),
      this.generateUtilityTypes(),
      this.generateFunctionSignatures(),
      this.generateExports()
    ].join('\n\n');

    this.typeCache.set('all', types);
    return types;
  }

  /**
   * Generate file header
   */
  private generateHeader(): string {
    return `/**
 * Auto-generated Pattern Matrix Types
 * Generated on: ${new Date().toISOString()}
 * Total patterns: ${this.patterns.size}
 * 
 * ⚠️ DO NOT EDIT MANUALLY - This file is auto-generated
 * Run 'bun run generate-types' to regenerate
 */

// Core pattern matrix types
declare module '@pattern-matrix/core' {`;
  }

  /**
   * Generate core interface definitions
   */
  private generateCoreInterfaces(): string {
    return `  // Core interfaces
  export interface ShortcutOptions {
    preventDefault?: boolean;
    stopPropagation?: boolean;
    capture?: boolean;
    passive?: boolean;
    once?: boolean;
  }

  export interface ShortcutCondition {
    test: () => boolean;
    description?: string;
    priority?: number;
  }

  export interface QuantumOptions {
    superposition?: boolean;
    entanglement?: boolean;
    tunneling?: boolean;
    observer?: boolean;
  }

  export interface NeuralOptions {
    learning?: boolean;
    adaptive?: boolean;
    prediction?: boolean;
    threshold?: number;
    model?: 'basic' | 'advanced' | 'quantum';
  }

  export interface PatternConfig {
    debug?: boolean;
    timeout?: number;
    retry?: number;
    fallback?: boolean;
  }`;
  }

  /**
   * Generate type definitions for each pattern
   */
  private generatePatternTypes(): string {
    const patternTypes: string[] = [];

    this.patterns.forEach((pattern, id) => {
      const typeDef = this.generatePatternType(pattern);
      patternTypes.push(typeDef);
    });

    return patternTypes.join('\n\n');
  }

  /**
   * Generate type definition for a single pattern
   */
  private generatePatternType(pattern: PatternDefinition): string {
    const paramTypes = pattern.parameters?.map(param => {
      const optional = param.required ? '' : '?';
      return `${param.name}${optional}: ${param.type}`;
    }).join(', ') || '';

    const comment = [
      `/**`,
      ` * ${pattern.description}`,
      ` * @category ${pattern.metadata?.category || 'general'}`,
      ` * @complexity ${pattern.metadata?.complexity || 'simple'}`
    ];

    if (pattern.examples) {
      pattern.examples.forEach(example => {
        comment.push(` * @example`);
        comment.push(` * \`\`\`typescript`);
        comment.push(` * ${example.code}`);
        comment.push(` * \`\`\``);
      });
    }

    comment.push(` */`);

    return `  ${comment.join('\n  ')}
  export type ${pattern.name} = (${paramTypes}) => ${pattern.returnType || 'void'};`;
  }

  /**
   * Generate utility types
   */
  private generateUtilityTypes(): string {
    return `  // Utility types
  export type ShortcutKey = 
    | 'ctrl' | 'alt' | 'shift' | 'meta'
    | 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm'
    | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z'
    | '0' | '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
    | 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'f6' | 'f7' | 'f8' | 'f9' | 'f10' | 'f11' | 'f12'
    | 'up' | 'down' | 'left' | 'right'
    | 'space' | 'enter' | 'escape' | 'tab' | 'backspace' | 'delete'
    | 'home' | 'end' | 'pageup' | 'pagedown'
    | 'insert' | 'capslock' | 'numlock' | 'scrolllock'
    | ';' | '=' | ',' | '-' | '.' | '/' | '\`' | '[' | '\\' | ']' | "'";

  export type KeyCombo = string | string[];

  export type ShortcutCallback = () => void | Promise<void>;

  export type PatternType = 'shortcut' | 'sequence' | 'conditional' | 'quantum' | 'neural';

  export type PatternRegistry = Map<string, PatternDefinition>;

  export interface PatternEvent {
    type: PatternType;
    key: string;
    timestamp: number;
    target?: EventTarget;
    prevented?: boolean;
  }`;
  }

  /**
   * Generate function signatures
   */
  private generateFunctionSignatures(): string {
    return `  // Function signatures
  export declare function registerShortcut(
    key: KeyCombo, 
    callback: ShortcutCallback, 
    options?: ShortcutOptions
  ): () => void;

  export declare function registerSequence(
    keys: string[], 
    callback: ShortcutCallback, 
    timeout?: number
  ): () => void;

  export declare function registerConditional(
    key: KeyCombo, 
    conditions: ShortcutCondition[], 
    callback: ShortcutCallback
  ): () => void;

  export declare function registerQuantum(
    keys: KeyCombo, 
    callback: ShortcutCallback, 
    options?: QuantumOptions
  ): () => void;

  export declare function registerNeural(
    baseKey: KeyCombo, 
    neuralOptions: NeuralOptions, 
    callback: ShortcutCallback
  ): () => void;

  export declare function unregisterShortcut(key: KeyCombo): boolean;

  export declare function listPatterns(): PatternDefinition[];

  export declare function getPattern(id: string): PatternDefinition | undefined;

  export declare function enablePatternDebug(enabled: boolean): void;

  export declare function setPatternConfig(config: PatternConfig): void;`;
  }

  /**
   * Generate exports
   */
  private generateExports(): string {
    const exports = Array.from(this.patterns.keys()).map(id => {
      const pattern = this.patterns.get(id)!;
      return `  export declare const ${pattern.name}: ${pattern.name};`;
    }).join('\n');

    return `  // Pattern exports
${exports}

  // Global pattern registry
  export declare const patternRegistry: PatternRegistry;

  // Version info
  export declare const PATTERN_MATRIX_VERSION: string;
  export declare const GENERATED_AT: string;
}`;
  }

  /**
   * Generate specific type for a pattern category
   */
  generateCategoryTypes(category: string): string {
    const categoryPatterns = Array.from(this.patterns.values())
      .filter(pattern => pattern.metadata?.category === category);

    if (categoryPatterns.length === 0) {
      return `// No patterns found for category: ${category}`;
    }

    const types = categoryPatterns.map(pattern => 
      this.generatePatternType(pattern)
    ).join('\n\n');

    return types;
  }

  /**
   * Clear type cache
   */
  private clearTypeCache(): void {
    this.typeCache.clear();
  }

  /**
   * Validate pattern definition
   */
  validatePattern(pattern: PatternDefinition): boolean {
    // Basic validation
    if (!pattern.id || !pattern.name || !pattern.type) {
      return false;
    }

    // Validate parameters
    if (pattern.parameters) {
      for (const param of pattern.parameters) {
        if (!param.name || !param.type) {
          return false;
        }
      }
    }

    // Validate type
    const validTypes: PatternType[] = ['shortcut', 'sequence', 'conditional', 'quantum', 'neural'];
    if (!validTypes.includes(pattern.type as PatternType)) {
      return false;
    }

    return true;
  }

  /**
   * Get pattern statistics
   */
  getStatistics(): {
    total: number;
    byType: Record<string, number>;
    byComplexity: Record<string, number>;
    byCategory: Record<string, number>;
  } {
    const stats = {
      total: this.patterns.size,
      byType: {} as Record<string, number>,
      byComplexity: {} as Record<string, number>,
      byCategory: {} as Record<string, number>
    };

    this.patterns.forEach(pattern => {
      // Count by type
      stats.byType[pattern.type] = (stats.byType[pattern.type] || 0) + 1;
      
      // Count by complexity
      const complexity = pattern.metadata?.complexity || 'simple';
      stats.byComplexity[complexity] = (stats.byComplexity[complexity] || 0) + 1;
      
      // Count by category
      const category = pattern.metadata?.category || 'general';
      stats.byCategory[category] = (stats.byCategory[category] || 0) + 1;
    });

    return stats;
  }
}

// Export singleton instance
export const patternMatrixLSP = new PatternMatrixLSP();

// Export types
export type {
  PatternDefinition,
  PatternParameter,
  PatternValidation,
  PatternExample,
  PatternMetadata
};
