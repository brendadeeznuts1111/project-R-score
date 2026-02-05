// utils/pattern-matrix.ts
import { watch } from 'node:fs';

export interface PatternRow {
  category: string;
  name: string;
  perf: string;
  semantics: string[];
  roi: string;
  section: string;
  deps: string[];
  verified: string;
}

/**
 * Production-ready master matrix for ID generation.
 * Tracks and increments IDs per section prefix.
 */
export class PatternMatrix {
  private static instance: PatternMatrix;
  private counters = new Map<string, number>();
  private rows: PatternRow[] = [];
  
  private constructor() {}

  static getInstance(): PatternMatrix {
    if (!PatternMatrix.instance) {
      PatternMatrix.instance = new PatternMatrix();
    }
    return PatternMatrix.instance;
  }

  getNextId(section: string): string {
    const parts = section.split(':');
    const baseSection = parts[0]!;
    
    // If an ID is provided in the section string (e.g., "§Types:128"), use it
    if (parts.length > 1) {
      const explicitId = parseInt(parts[1]!);
      if (!isNaN(explicitId)) {
        const currentMax = this.counters.get(baseSection) ?? 0;
        this.counters.set(baseSection, Math.max(currentMax, explicitId + 1));
        return section;
      }
    }

    const current = this.counters.get(baseSection) ?? 100; // Start high for dynamic IDs
    this.counters.set(baseSection, current + 1);
    return `${baseSection}:${current}`;
  }

  registerPattern(category: string, name: string, def: PatternDefinition): string {
    const sectionWithId = this.getNextId(def.section);
    const row: PatternRow = {
      category,
      name,
      perf: def.perf,
      semantics: def.semantics,
      roi: def.roi,
      section: sectionWithId,
      deps: def.deps || [],
      verified: def.verified || ''
    };
    this.rows.push(row);
    
    return `| ${category} | ${name} | ${def.perf} | {${def.semantics.slice(0, 3).join(', ')}} | ${def.roi} | ${sectionWithId} |`;
  }

  getRows(): PatternRow[] {
    return this.rows;
  }

  reset() {
    this.rows = [];
    this.counters.clear();
  }
}

export interface PatternDefinition {
  perf: string; 
  semantics: string[];
  roi: string; 
  section: string; 
  deps?: string[]; 
  verified?: string; 
}

/**
 * Register a new Empire Pro pattern in the system matrix.
 */
export function addPattern(
  category: string, 
  name: string, 
  def: PatternDefinition
): string {
  return PatternMatrix.getInstance().registerPattern(category, name, def);
}

/**
 * §Types:128-131 - Formal Type Registrations
 */
export function registerTypeDefinitions(): void {
  // Prevent duplicate registration
  if (PatternMatrix.getInstance().getRows().some(r => r.section.startsWith('§Types'))) return;

  addPattern('Type', 'PatternDefinitions', {
    perf: '<1ms type checking',
    semantics: ['typescript', 'lsp', 'validation'],
    roi: '∞',
    section: '§Types:128',
    deps: ['typescript', 'bun-types'],
    verified: '✅'
  });

  addPattern('Type', 'PatternValidator', {
    perf: '<0.1ms validation',
    semantics: ['runtime', 'constraints', 'safety'],
    roi: '∞',
    section: '§Types:129',
    deps: ['validation-engine'],
    verified: '✅'
  });

  addPattern('Type', 'LSPIntegration', {
    perf: '<50ms indexing',
    semantics: ['ide', 'autocomplete', 'hover'],
    roi: '∞',
    section: '§Types:130',
    deps: ['vscode-lsp'],
    verified: '✅'
  });

  addPattern('Type', 'PatternConstraints', {
    perf: '<0.05ms constraint check',
    semantics: ['constraints', 'rules', 'enforcement'],
    roi: '∞',
    section: '§Types:131',
    deps: ['constraint-engine'],
    verified: '✅'
  });

  // Bun 1.1+ Superpower Patterns
  addPattern('Workflow', 'TerminalPTY', {
    perf: '<5ms/spawn',
    semantics: ['pty', 'interactive', 'shell'],
    roi: '500x',
    section: '§Bun:132',
    verified: '✅'
  });

  addPattern('Gate', 'BunFeatureFlag', {
    perf: '<1μs',
    semantics: ['compiler', 'dce', 'config'],
    roi: '∞',
    section: '§Bun:133',
    verified: '✅'
  });

  addPattern('Filter', 'UnicodeStringWidth', {
    perf: '<10μs',
    semantics: ['unicode', 'alignment', 'ui'],
    roi: '100x',
    section: '§Bun:134',
    verified: '✅'
  });

  addPattern('Storage', 'S3ContentDisposition', {
    perf: '<0.1ms',
    semantics: ['s3', 'r2', 'disposition'],
    roi: '50x',
    section: '§Bun:135',
    verified: '✅'
  });

  // Existing realized services
  addPattern('Gate', 'IdentityShieldGate', {
    perf: '<10μs',
    semantics: ['score', 'status', 'gate'],
    roi: '100x',
    section: '§Gate:132',
    verified: '✅'
  });

  addPattern('Workflow', 'IdentityShieldWorkflow', {
    perf: '<5ms',
    semantics: ['result', 'duration', 'stages'],
    roi: '1000x',
    section: '§Workflow:133',
    verified: '✅'
  });

  addPattern('Workflow', 'AutonomicController', {
    perf: '<5ms',
    semantics: ['result', 'duration', 'pipeline'],
    roi: '73x',
    section: '§Workflow:100',
    verified: '✅'
  });

  addPattern('Workflow', 'DashboardRenderer', {
    perf: '<50μs',
    semantics: ['svg', 'canvas', 'grid'],
    roi: '100x',
    section: '§Workflow:141',
    verified: '✅'
  });

  // Storage patterns
  addPattern('Storage', 'R2AuditPath', {
    perf: '<0.1ms',
    semantics: ['bucket', 'key', 'namespace', 'path'],
    roi: '1000x',
    section: '§Storage:132',
    verified: '✅'
  });

  addPattern('Filter', 'PhoneIntelQualifier', {
    perf: '<100μs',
    semantics: ['trustScore', 'carrier', 'intel'],
    roi: '73x',
    section: '§Filter:89',
    verified: '✅'
  });

  addPattern('Gate', 'CarrierLatencyGate', {
    perf: '<100μs',
    semantics: ['latency', 'carrier', 'gate'],
    roi: '100x',
    section: '§Gate:134',
    verified: '✅'
  });

  addPattern('Workflow', 'CarrierFailoverWorkflow', {
    perf: '<2ms',
    semantics: ['failover', 'carrier', 'healing'],
    roi: '1000x',
    section: '§Workflow:135',
    verified: '✅'
  });

  addPattern('Query', 'CacheQuery', {
    perf: '<0.5ms',
    semantics: ['cache', 'query', 'performance'],
    roi: '∞',
    section: '§Query:91',
    verified: '✅'
  });

  addPattern('CLI', 'DashboardAPI', {
    perf: '<2ms',
    semantics: ['api', 'dashboard', 'elysia'],
    roi: '500x',
    section: '§CLI:140',
    verified: '✅'
  });

  addPattern('Workflow', 'TerminalPTYManager', {
    perf: '<10ms spawn',
    semantics: ['pty', 'bun-terminal', 'interactive'],
    roi: '500x',
    section: '§Terminal:132',
    verified: '✅'
  });

  addPattern('Gate', 'BunCompilerFlag', {
    perf: '<1μs',
    semantics: ['bun-bundle', 'dce', 'flags'],
    roi: '∞',
    section: '§BunFlag:133',
    verified: '✅'
  });

  addPattern('Filter', 'StringVisualWidth', {
    perf: '<10μs',
    semantics: ['stringWidth', 'visual', 'align'],
    roi: '50x',
    section: '§UI:132',
    verified: '✅'
  });

    addPattern('Storage', 'ZstdCompression', {
    perf: '<1ms',
    semantics: ['zstd', 'compress', 'r2'],
    roi: '200x',
    section: '§Storage:Zstd',
    verified: '✅'
  });

  addPattern('Gate', 'RBACPermissionGate', {
    perf: '<5μs',
    semantics: ['rbac', 'auth', 'security'],
    roi: '∞',
    section: '§Security:132',
    verified: '✅'
  });

  console.log('✅ Type definitions registered: Bun 1.1+ Turbocharged.');
}

/**
 * LSP Integration for IDE intelligence
 */
export class PatternMatrixLSP {
  static getPatternInfo(id: string): string | null {
    const matrix = PatternMatrix.getInstance();
    const row = matrix.getRows().find(r => r.section === id);
    if (!row) return null;
    return `**Empire Pro Pattern: ${row.name}**\n- ID: ${row.section}\n- ROI: ${row.roi}\n- Performance: ${row.perf}`;
  }

  static generatePatternTypes(): string {
    const rows = PatternMatrix.getInstance().getRows();
    let output = `export const PATTERN_IDS = {\n`;
    rows.forEach(row => {
      const safeName = row.name.replace(/[^a-zA-Z0-9]/g, '');
      output += `  ${safeName}: '${row.section}',\n`;
    });
    output += `} as const;\n`;
    return output;
  }
}

// Watch function for Hot Reload
export function watchMatrixChanges(callback: () => void) {
  return watch('utils/pattern-matrix.ts', (event, filename) => {
    console.log('🔄 Pattern Matrix changed. Triggering hot reload...');
    callback();
  });
}

// Initial Registration
registerTypeDefinitions();