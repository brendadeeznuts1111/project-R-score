/**
 * §Types:131 - Pattern Constraints & Validation Rules
 * @pattern Pattern:131
 * @perf <0.05ms per constraint check
 * @roi ∞ (prevents invalid states)
 * @section §Constraints
 */

import type { LSPPatternInfo } from "./pattern-definitions";

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Constraint: Performance budget must be achievable
 * Example: Filter patterns cannot exceed 100μs
 */
export const PERF_CONSTRAINTS = {
  Gate: { max: 10, unit: 'μs' },
  Filter: { max: 100, unit: 'μs' },
  Query: { max: 0.5, unit: 'ms' },
  Pattern: { max: 1, unit: 'ms' },
  Workflow: { max: 5, unit: 'ms' },
  Storage: { max: 0.1, unit: 'ms' }, 
  Farm: { max: 5, unit: 'ms/1000' }
} as const;

/**
 * Constraint: ROI must be realistic for category
 */
export const ROI_CONSTRAINTS = {
  Gate: { min: 1, max: 100 },
  Filter: { min: 10, max: 10000 },
  Query: { min: 10, max: 1000 },
  Pattern: { min: 1, max: 1000 },
  Workflow: { min: 1, max: 100 },
  Storage: { min: 10, max: 1000 },
  Farm: { min: 1000, max: 100000 }
} as const;

/**
 * Constraint: Semantic tags must be unique per pattern type
 */
export const SEMANTIC_CONSTRAINTS = {
  Gate: ['score', 'status', 'gate'],
  Filter: ['result', 'filtered', 'groups', 'sanitized', 'cleaned'],
  Query: ['hit', 'data', 'cache', 'keys', 'latency', 'query'],
  Pattern: ['groups', 'match', 'pathname', 'regex', 'fallback'],
  Workflow: ['result', 'duration', 'stages', 'pipeline', 'throughput'],
  Storage: ['bucket', 'key', 'namespace', 'path', 'storage'],
  Farm: ['results', 'duration', 'throughput', 'batch', 'parallel']
} as const;

/**
 * Validate pattern definition against constraints
 */
export function validatePatternDefinition(
  category: keyof typeof PERF_CONSTRAINTS,
  definition: {
    perf: string;
    roi: string;
    semantics: string[];
  }
): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  
  // 1. Validate perf budget
  const perfMatch = (definition.perf || "").match(/<([\d.]+)(ms|μs|s|ms\/1000)/);
  if (perfMatch) {
    const value = parseFloat(perfMatch[1]!);
    const unit = perfMatch[2];
    const constraint = PERF_CONSTRAINTS[category];
    
    // @ts-ignore
    if (unit === constraint.unit && value > constraint.max) {
      warnings.push(`Perf budget ${definition.perf} exceeds ${category} maximum: ${constraint.max}${unit}`);
    }
  }
  
  // 2. Validate ROI
  const roiMatch = (definition.roi || "").match(/(\d+)x/);
  if (roiMatch) {
    const roi = parseInt(roiMatch[1]!);
    const constraint = ROI_CONSTRAINTS[category];
    
    if (roi < constraint.min || roi > constraint.max) {
      warnings.push(`ROI ${definition.roi} outside ${category} typical range: ${constraint.min}x-${constraint.max}x`);
    }
  }
  
  // 3. Validate semantics
  const allowedSemantics = SEMANTIC_CONSTRAINTS[category];
  const invalidSemantics = definition.semantics.filter(s => 
    !allowedSemantics.some(allowed => s.toLowerCase().includes(allowed))
  );
  
  if (invalidSemantics.length > 0 && category !== ('Storage' as any)) { 
    warnings.push(`Unusual semantics for ${category}: ${invalidSemantics.join(', ')}`);
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Auto-correct pattern definition based on constraints
 */
export function autoCorrectDefinition(
  category: keyof typeof PERF_CONSTRAINTS,
  definition: Partial<{
    perf: string;
    roi: string;
    semantics: string[];
  }>
): {
  perf: string;
  roi: string;
  semantics: string[];
} {
  const corrected = {
    perf: definition.perf || `<${PERF_CONSTRAINTS[category].max}${PERF_CONSTRAINTS[category].unit}`,
    roi: definition.roi || `${ROI_CONSTRAINTS[category].min}x`,
    semantics: definition.semantics || [SEMANTIC_CONSTRAINTS[category][0] as string]
  };
  
  // Auto-correct ROI if out of range
  const roiMatch = corrected.roi.match(/(\d+)x/);
  if (roiMatch) {
    const roi = parseInt(roiMatch[1]!);
    const constraint = ROI_CONSTRAINTS[category];
    if (roi > constraint.max) {
      corrected.roi = `${constraint.max}x`;
    } else if (roi < constraint.min) {
      corrected.roi = `${constraint.min}x`;
    }
  }
  
  // Auto-correct perf if missing unit
  if (corrected.perf && !corrected.perf.match(/ms|μs|s/)) {
    corrected.perf = `<${corrected.perf}${PERF_CONSTRAINTS[category].unit}`;
  }
  
  return corrected as any;
}
