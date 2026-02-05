#!/usr/bin/env bun
// [DUOPLUS][VALIDATION][TS][META:{native,schema}][SCHEMA][#REF:META-SCHEMA-41][BUN:4.1]

/**
 * Meta Schema v4.1 - Structured validation for META:{} properties
 *
 * Zero-dependency implementation using native TypeScript validation.
 * All monetary values are stored in cents to avoid floating point errors.
 */

// Type definitions
export interface Revenue {
  mrr?: number;  // Monthly recurring revenue in cents
  arr?: number;  // Annual recurring revenue in cents
  ltv?: number;  // Lifetime value in cents
  cac?: number;  // Customer acquisition cost in cents
}

export interface Performance {
  p50?: number;        // 50th percentile latency (ms)
  p95?: number;        // 95th percentile latency (ms)
  p99?: number;        // 99th percentile latency (ms)
  errorRate?: number;  // Error rate (0.01 = 1%)
  throughput?: number; // Requests per second
}

export interface Security {
  audit?: boolean;
  encrypted?: boolean;
  pii?: boolean;
  compliance?: ('PCI-DSS' | 'GDPR' | 'SOC2' | 'HIPAA' | 'ISO27001')[];
}

export interface Quality {
  complexity?: 'low' | 'medium' | 'high';
  coverage?: number;
  techDebt?: 'low' | 'medium' | 'high';
  maintainability?: 'A' | 'B' | 'C' | 'D' | 'F';
}

export interface Meta {
  revenue?: Revenue;
  performance?: Performance;
  security?: Security;
  quality?: Quality;
  live?: boolean;
  deprecated?: boolean;
  experimental?: boolean;
  custom?: Record<string, string | number | boolean>;
}

// Validation helpers
const isNonNegativeInt = (v: unknown): v is number =>
  typeof v === 'number' && Number.isInteger(v) && v >= 0;

const isNonNegative = (v: unknown): v is number =>
  typeof v === 'number' && v >= 0;

const isInRange = (v: unknown, min: number, max: number): v is number =>
  typeof v === 'number' && v >= min && v <= max;

const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean';

const COMPLIANCE_VALUES = ['PCI-DSS', 'GDPR', 'SOC2', 'HIPAA', 'ISO27001'] as const;
const COMPLEXITY_VALUES = ['low', 'medium', 'high'] as const;
const GRADE_VALUES = ['A', 'B', 'C', 'D', 'F'] as const;

function validateRevenue(r: unknown): string[] {
  const errors: string[] = [];
  if (r === undefined || r === null) return errors;
  if (typeof r !== 'object') return ['revenue: must be an object'];
  const rev = r as Record<string, unknown>;
  if (rev.mrr !== undefined && !isNonNegativeInt(rev.mrr)) errors.push('revenue.mrr: must be non-negative integer');
  if (rev.arr !== undefined && !isNonNegativeInt(rev.arr)) errors.push('revenue.arr: must be non-negative integer');
  if (rev.ltv !== undefined && !isNonNegativeInt(rev.ltv)) errors.push('revenue.ltv: must be non-negative integer');
  if (rev.cac !== undefined && !isNonNegativeInt(rev.cac)) errors.push('revenue.cac: must be non-negative integer');
  return errors;
}

function validatePerformance(p: unknown): string[] {
  const errors: string[] = [];
  if (p === undefined || p === null) return errors;
  if (typeof p !== 'object') return ['performance: must be an object'];
  const perf = p as Record<string, unknown>;
  if (perf.p50 !== undefined && !isNonNegative(perf.p50)) errors.push('performance.p50: must be non-negative');
  if (perf.p95 !== undefined && !isNonNegative(perf.p95)) errors.push('performance.p95: must be non-negative');
  if (perf.p99 !== undefined && !isNonNegative(perf.p99)) errors.push('performance.p99: must be non-negative');
  if (perf.errorRate !== undefined && !isInRange(perf.errorRate, 0, 1)) errors.push('performance.errorRate: must be 0-1');
  if (perf.throughput !== undefined && !isNonNegative(perf.throughput)) errors.push('performance.throughput: must be non-negative');
  return errors;
}

function validateSecurity(s: unknown): string[] {
  const errors: string[] = [];
  if (s === undefined || s === null) return errors;
  if (typeof s !== 'object') return ['security: must be an object'];
  const sec = s as Record<string, unknown>;
  if (sec.audit !== undefined && !isBoolean(sec.audit)) errors.push('security.audit: must be boolean');
  if (sec.encrypted !== undefined && !isBoolean(sec.encrypted)) errors.push('security.encrypted: must be boolean');
  if (sec.pii !== undefined && !isBoolean(sec.pii)) errors.push('security.pii: must be boolean');
  if (sec.compliance !== undefined) {
    if (!Array.isArray(sec.compliance)) errors.push('security.compliance: must be array');
    else if (!sec.compliance.every(c => COMPLIANCE_VALUES.includes(c as any))) {
      errors.push(`security.compliance: must be one of ${COMPLIANCE_VALUES.join(', ')}`);
    }
  }
  return errors;
}

function validateQuality(q: unknown): string[] {
  const errors: string[] = [];
  if (q === undefined || q === null) return errors;
  if (typeof q !== 'object') return ['quality: must be an object'];
  const qual = q as Record<string, unknown>;
  if (qual.complexity !== undefined && !COMPLEXITY_VALUES.includes(qual.complexity as any)) {
    errors.push(`quality.complexity: must be one of ${COMPLEXITY_VALUES.join(', ')}`);
  }
  if (qual.coverage !== undefined && !isInRange(qual.coverage, 0, 100)) errors.push('quality.coverage: must be 0-100');
  if (qual.techDebt !== undefined && !COMPLEXITY_VALUES.includes(qual.techDebt as any)) {
    errors.push(`quality.techDebt: must be one of ${COMPLEXITY_VALUES.join(', ')}`);
  }
  if (qual.maintainability !== undefined && !GRADE_VALUES.includes(qual.maintainability as any)) {
    errors.push(`quality.maintainability: must be one of ${GRADE_VALUES.join(', ')}`);
  }
  return errors;
}

/**
 * Validate metadata against schema
 */
export function validateMeta(meta: unknown): { success: boolean; data?: Meta; error?: string } {
  if (meta === undefined || meta === null) return { success: true, data: {} };
  if (typeof meta !== 'object') return { success: false, error: 'must be an object' };

  const m = meta as Record<string, unknown>;
  const errors: string[] = [
    ...validateRevenue(m.revenue),
    ...validatePerformance(m.performance),
    ...validateSecurity(m.security),
    ...validateQuality(m.quality),
  ];

  if (m.live !== undefined && !isBoolean(m.live)) errors.push('live: must be boolean');
  if (m.deprecated !== undefined && !isBoolean(m.deprecated)) errors.push('deprecated: must be boolean');
  if (m.experimental !== undefined && !isBoolean(m.experimental)) errors.push('experimental: must be boolean');

  if (errors.length > 0) {
    return { success: false, error: errors.join('; ') };
  }

  return { success: true, data: meta as Meta };
}

/**
 * Parse META string from tag comment format
 * Converts META:{key1:value1,key2:value2} to object
 */
export function parseMetaString(metaString: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  // Remove META:{} wrapper if present
  const content = metaString.replace(/^META:\{?/, '').replace(/\}?$/, '');

  if (!content) return result;

  // Split by comma and parse key:value pairs
  const pairs = content.split(',');

  for (const pair of pairs) {
    const [key, value] = pair.split(':').map(s => s.trim());

    if (!key) continue;

    // Try to parse value as number, boolean, or keep as string
    if (value === undefined || value === '') {
      result[key] = true; // Flag without value
    } else if (value === 'true') {
      result[key] = true;
    } else if (value === 'false') {
      result[key] = false;
    } else if (!isNaN(Number(value))) {
      result[key] = Number(value);
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Serialize Meta object to tag comment format
 */
export function serializeMeta(meta: Meta): string {
  const parts: string[] = [];

  // Flatten nested objects
  const flatten = (obj: Record<string, unknown>, prefix = ''): void => {
    for (const [key, value] of Object.entries(obj)) {
      if (value === undefined || value === null) continue;

      const fullKey = prefix ? `${prefix}.${key}` : key;

      if (typeof value === 'object' && !Array.isArray(value)) {
        flatten(value as Record<string, unknown>, fullKey);
      } else if (Array.isArray(value)) {
        parts.push(`${fullKey}:[${value.join('|')}]`);
      } else if (value === true) {
        parts.push(fullKey);
      } else if (value !== false) {
        parts.push(`${fullKey}:${value}`);
      }
    }
  };

  flatten(meta);

  return parts.length > 0 ? `META:{${parts.join(',')}}` : '';
}

// CLI interface
async function main() {
  const command = process.argv[2];

  switch (command) {
    case '--validate':
      const input = process.argv[3];
      if (!input) {
        console.log('Usage: bun run meta-schema.ts --validate \'{"revenue":{"mrr":210000}}\'');
        process.exit(1);
      }

      try {
        const parsed = JSON.parse(input);
        const result = validateMeta(parsed);

        if (result.success) {
          console.log('✅ Valid metadata');
          console.log(JSON.stringify(result.data, null, 2));
        } else {
          console.log('❌ Invalid metadata:', result.error);
          process.exit(1);
        }
      } catch (e) {
        console.log('❌ Invalid JSON:', (e as Error).message);
        process.exit(1);
      }
      break;

    case '--parse':
      const metaStr = process.argv[3];
      if (!metaStr) {
        console.log('Usage: bun run meta-schema.ts --parse "META:{mrr:210000,live}"');
        process.exit(1);
      }

      const parsed = parseMetaString(metaStr);
      console.log('Parsed:', JSON.stringify(parsed, null, 2));
      break;

    case '--serialize':
      const jsonStr = process.argv[3];
      if (!jsonStr) {
        console.log('Usage: bun run meta-schema.ts --serialize \'{"revenue":{"mrr":210000},"live":true}\'');
        process.exit(1);
      }

      try {
        const obj = JSON.parse(jsonStr) as Meta;
        const serialized = serializeMeta(obj);
        console.log('Serialized:', serialized);
      } catch (e) {
        console.log('❌ Invalid JSON:', (e as Error).message);
        process.exit(1);
      }
      break;

    default:
      console.log(`
📋 Meta Schema Validator v4.1

Usage:
  bun run meta-schema.ts --validate '{"revenue":{"mrr":210000}}'
  bun run meta-schema.ts --parse "META:{mrr:210000,live}"
  bun run meta-schema.ts --serialize '{"revenue":{"mrr":210000},"live":true}'

Schema Structure:
  revenue:     { mrr, arr, ltv, cac } (cents)
  performance: { p50, p95, p99, errorRate, throughput }
  security:    { audit, encrypted, pii, compliance[] }
  quality:     { complexity, coverage, techDebt, maintainability }
  flags:       live, deprecated, experimental
  custom:      { [key]: string | number | boolean }

Examples:
  Valid:   {"revenue":{"mrr":210000},"quality":{"complexity":"medium"}}
  Invalid: {"revenue":{"mrr":"$2.1k"}} (use cents, not strings)
      `);
  }
}

if (import.meta.main) {
  main().catch(console.error);
}
