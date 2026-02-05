/**
 * §Pattern:129 - Runtime Pattern Validation
 * @pattern Filter:129
 * @perf <0.1ms per validation
 * @roi ∞ (prevents runtime errors)
 * @section §Validation
 */

import type { BasePattern, LSPPatternInfo } from '../types/pattern-definitions';
import { PatternMatrix } from '../../utils/pattern-matrix';
import { PERF_METADATA_KEY, ROI_METADATA_KEY } from './decorators';
import { feature } from "../common/feature-flags";
import "reflect-metadata";

export class PatternValidator {
  /**
   * Validate pattern implementation against its definition
   */
  static validate<T extends BasePattern>(pattern: T, definition: LSPPatternInfo, failOnWarning = false): ValidationResult {
    // Bun 1.1+ DEAD-CODE ELIMINATION
    const isStrict = feature("VALIDATION_STRICT");
    
    // If not strict and not validation enabled, skip (DCE targets this)
    // Note: We'll allow basic validation if not strict but ENV says so
    if (!isStrict && !process.env.EMPIRE_FEATURES?.includes("VALIDATION")) {
       // Graceful low-overhead path for prod
       // return { valid: true, errors: [], warnings: [] };
    }

    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Check required methods
    if (typeof pattern.test !== 'function') {
      errors.push(`Pattern ${definition.id} missing test() method`);
    }
    if (typeof pattern.exec !== 'function') {
      errors.push(`Pattern ${definition.id} missing exec() method`);
    }
    
    // 2. Validate perf budget
    const perfRegex = definition.perf.match(/<([\d.]+)(ms|μs|s)/);
    if (perfRegex) {
      const budget = parseFloat(perfRegex[1]!);
      const unit = perfRegex[2];
      if (budget > 1000 && unit === 'ms') {
        const category = (pattern as any).category || 'Pattern';
        errors.push(`Budget ${definition.perf} seems too high for ${category}`);
      }
    }
    
    // 3. Validate ROI format
    if (!definition.roi.match(/\d+x/) && definition.roi !== '∞') {
      errors.push(`Invalid ROI format: ${definition.roi}`);
    }
    
    // 4. Validate semantics
    if (definition.semantics.length < 1) {
      errors.push(`Pattern ${definition.id} missing semantics`);
    }

    // 5. Decorator Metadata Scanning
    const decoratedPerf = (Reflect as any).getMetadata(PERF_METADATA_KEY, pattern, 'exec');
    if (decoratedPerf && decoratedPerf !== definition.perf) {
      warnings.push(`Mismatch: Definition budget (${definition.perf}) vs @perfBudget (${decoratedPerf})`);
    }

    const decoratedROI = (Reflect as any).getMetadata(ROI_METADATA_KEY, pattern, 'exec');
    if (decoratedROI && decoratedROI !== definition.roi) {
      warnings.push(`Mismatch: Definition ROI (${definition.roi}) vs @roiMin (${decoratedROI})`);
    }
    
    // 6. Category-specific validation
    const category = (pattern as any).category;
    switch (category) {
      case 'Filter':
        if (!('hasRegex' in pattern)) {
          errors.push(`Filter ${definition.id} missing hasRegex property`);
        }
        break;
      case 'Query':
        if (!('getStats' in pattern)) {
          errors.push(`Query ${definition.id} missing getStats() method`);
        }
        break;
      case 'Workflow':
        if (!('stages' in pattern)) {
          errors.push(`Workflow ${definition.id} missing stages property`);
        }
        break;
    }

    // Gated Validation Strictness (§Validation:STRICT)
    // feature("VALIDATION_STRICT") ? PatternValidator.failOnWarning(true) : lenient.
    if (isStrict && warnings.length > 0) {
      errors.push(...warnings.map(w => `[STRICT] ${w}`));
    } else if (failOnWarning && warnings.length > 0) {
      errors.push(...warnings.map(w => `[PANIC] ${w}`));
    }
    
    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Auto-generate LSP info from pattern instance
   */
  static generateLSPInfo<T extends BasePattern>(pattern: T): LSPPatternInfo {
    return {
      id: (pattern as any).id || '§Unknown:0',
      perf: (pattern as any).perfBudget || '<unknown>',
      roi: (pattern as any).roi || '0x',
      semantics: (pattern as any).semantics || [],
      description: `${(pattern as any).category || 'Pattern'} pattern for ${(pattern as any).constructor?.name || 'unknown'}`,
      examples: this.generateExamples(pattern)
    };
  }

  private static generateExamples<T extends BasePattern>(pattern: T): string[] {
    const category = (pattern as any).category;
    
    switch (category) {
      case 'Filter':
        return [
          `const result = pattern.test(input); // Boolean check`,
          `const { result, groups } = await pattern.exec(input); // Full execution`
        ];
      case 'Query':
        return [
          `const hit = await pattern.test(key); // Cache hit check`,
          `const { data } = await pattern.exec({ method: 'get', key }); // Retrieve`
        ];
      case 'Workflow':
        return [
          `const { result, duration } = await pattern.exec(input); // Run workflow`,
          `const metrics = await pattern.getMetrics(); // Get stats`
        ];
      default:
        return [`const result = await pattern.exec(input);`];
    }
  }

  /**
   * §Types:130 - validatePatternReferences()
   * Scans for §XXX:YY references and ensures they are registered.
   */
  static validatePatternReferences(content: string): ValidationResult {
    const regex = /§([a-zA-Z]+):(\d+)/g;
    const matches = [...content.matchAll(regex)];
    const errors: string[] = [];
    const matrix = PatternMatrix.getInstance();
    const rows = matrix.getRows();

    for (const match of matches) {
      const fullRef = match[0];
      const registered = rows.some(r => r.section === fullRef);
      if (!registered) {
        errors.push(`Unregistered pattern reference found: ${fullRef}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings: []
    };
  }

  /**
   * Validate pattern composition (e.g., Workflow uses correct Filter)
   */
  static validateComposition(workflow: BasePattern, dependencies: BasePattern[]): ValidationResult {
    const errors: string[] = [];
    
    if ((workflow as any).category !== 'Workflow') {
      return { valid: false, errors: ['Not a workflow'], warnings: [] };
    }
    
    const workflowDef = workflow as any;
    const stagePatterns = workflowDef.stages?.map((s: any) => s.pattern) || [];
    
    for (const depId of stagePatterns) {
      const dep = dependencies.find(d => (d as any).id === depId);
      if (!dep) {
        errors.push(`Workflow depends on missing pattern: ${depId}`);
      } else {
        // Check if dependency is registered in matrix
        const matrix = PatternMatrix.getInstance();
        const registered = matrix.getRows().some(r => r.section === depId);
        if (!registered) {
          errors.push(`Pattern ${depId} not registered in Master Matrix`);
        }
      }
    }
    
    return { valid: errors.length === 0, errors, warnings: [] };
  }
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// LSP Integration: Provide hover info
declare global {
  interface Pattern {
    // VSCode will show this on hover
    /** 
     * Empire Pro Pattern: {category}
     * ID: {id}
     * Perf: {perfBudget}
     * ROI: {roi}
     * Semantics: {semantics}
     */
    __lspInfo?: LSPPatternInfo;
  }
}
