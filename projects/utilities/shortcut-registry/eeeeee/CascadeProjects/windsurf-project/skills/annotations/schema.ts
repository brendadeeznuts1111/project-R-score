/**
 * Annotation Schema for Bun-Native Skills Curriculum
 * Defines the structure for code annotations and validation
 */

import { z } from 'zod';

// Core annotation domains
export const AnnotationDomain = z.enum([
  'PERF',      // Performance issues
  'ERROR',     // Error handling problems
  'SECURITY',  // Security vulnerabilities
  'BUN_NATIVE' // Bun-specific optimizations
]);

// Annotation scopes
export const AnnotationScope = z.enum([
  'GLOBAL',    // System-wide issues
  'MODULE',    // Module-specific
  'FUNCTION',  // Function-level
  'LOCAL'      // Variable-level
]);

// Annotation types
export const AnnotationType = z.enum([
  'SYNC_IO',           // Synchronous I/O operations
  'DANGLING_PROMISE',  // Unhandled promises
  'SLOW_HASH',         // Slow hashing algorithms
  'MEMORY_LEAK',       // Memory management issues
  'SECURITY_RISK',     // Security vulnerabilities
  'BUN_OPTIMIZATION'   // Bun-specific improvements
]);

// Metadata schema for annotations
export const AnnotationMeta = z.object({
  fix: z.string().describe('Suggested fix'),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  speedup: z.string().optional().describe('Performance improvement (e.g., "7x")'),
  issueId: z.string().optional().describe('Issue identifier'),
  complexity: z.enum(['simple', 'moderate', 'complex']).optional(),
  estimatedTime: z.string().optional().describe('Time to fix (e.g., "5min")')
});

// Reference schema for learning materials
export const AnnotationReference = z.array(z.string().regex(/^#REF:skills-\w+$/));

// Complete annotation schema
export const AnnotationSchema = z.object({
  domain: AnnotationDomain,
  scope: AnnotationScope,
  type: AnnotationType,
  meta: AnnotationMeta,
  ref: AnnotationReference.optional(),
  context: z.object({
    component: z.string().optional().describe('Component name'),
    interface: z.string().optional().describe('Interface name'),
    function: z.string().optional().describe('Function name')
  }).optional()
});

// Annotation parser for extracting from comments
export interface ParsedAnnotation {
  domain: string;
  scope: string;
  type: string;
  meta: Record<string, unknown>;
  ref?: string[];
  context?: {
    component?: string;
    interface?: string;
    function?: string;
  };
}

export class AnnotationParser {
  /**
   * Parse annotation from comment string
   * Format: [DOMAIN][SCOPE][TYPE][META:{...}][Component][Interface][Function][#REF:...][BUN-NATIVE]
   */
  static parse(comment: string): ParsedAnnotation | null {
    const match = comment.match(/^\s*\/\/\s*\[([^\]]+)\](?:\s*\[([^\]]+)\])*(?:\s*\[([^\]]+)\])?(?:\s*\[META:({[^}]+})\])?(?:\s*\[([^\]]+)\])?(?:\s*\[([^\]]+)\])?(?:\s*\[([^\]]+)\])?(?:\s*\[([^\]]+)\])?/);
    
    if (!match) return null;
    
    const [, domain, scope, type, metaStr, component, interface_, function_, ref, bunNative] = match;
    
    let meta: Record<string, unknown> = {};
    if (metaStr) {
      try {
        meta = JSON.parse(metaStr);
      } catch {
        console.warn('Invalid META annotation:', metaStr);
      }
    }
    
    let refs: string[] | undefined;
    if (ref) {
      refs = ref.split(',').map(r => r.trim());
    }
    
    return {
      domain,
      scope,
      type,
      meta,
      ref: refs,
      context: {
        component,
        interface: interface_,
        function: function_
      }
    };
  }
  
  /**
   * Generate annotation string from components
   */
  static generate(annotation: ParsedAnnotation): string {
    const parts = [
      `[${annotation.domain}]`,
      `[${annotation.scope}]`,
      `[${annotation.type}]`
    ];
    
    if (Object.keys(annotation.meta).length > 0) {
      parts.push(`[META:${JSON.stringify(annotation.meta)}]`);
    }
    
    if (annotation.context?.component) {
      parts.push(`[${annotation.context.component}]`);
    }
    
    if (annotation.context?.interface) {
      parts.push(`[${annotation.context.interface}]`);
    }
    
    if (annotation.context?.function) {
      parts.push(`[${annotation.context.function}]`);
    }
    
    if (annotation.ref && annotation.ref.length > 0) {
      parts.push(`[${annotation.ref.join(',')}]`);
    }
    
    parts.push('[BUN-NATIVE]');
    
    return parts.join('');
  }
}

// Validation functions
export function validateAnnotation(annotation: unknown): annotation is ParsedAnnotation {
  try {
    AnnotationSchema.parse(annotation);
    return true;
  } catch {
    return false;
  }
}

// Exercise completion criteria
export interface ExerciseCriteria {
  requiredFixes: string[];      // Annotation types that must be fixed
  bannedPatterns: string[];     // Patterns that must not exist
  performanceThresholds: Record<string, number>; // Minimum performance improvements
  testCoverage: number;         // Minimum test coverage percentage
}

export const ExerciseCriteriaSchema = z.object({
  requiredFixes: z.array(z.string()),
  bannedPatterns: z.array(z.string()),
  performanceThresholds: z.record(z.number()),
  testCoverage: z.number().min(0).max(100)
});

export type Annotation = z.infer<typeof AnnotationSchema>;
export type ExerciseCompletionCriteria = z.infer<typeof ExerciseCriteriaSchema>;

// Utility functions for annotation generation
export const AnnotationUtils = {
  generate: AnnotationParser.generate,
  parse: AnnotationParser.parse,
  validate: validateAnnotation
};
