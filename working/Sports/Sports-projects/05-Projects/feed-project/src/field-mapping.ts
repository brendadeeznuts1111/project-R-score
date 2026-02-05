// Feed Project - Field Mapping Engine
//
// Transforms DashboardConfig through field mappings
// Applies HSL colors and meta tags
//
// Flow:
// 1. Load DashboardConfig
// 2. Apply field mappings
// 3. Substitute env vars
// 4. Attach _fieldMappings metadata
// 5. Return EnhancedDashboardConfig

import type {
  DashboardConfig,
  EnhancedDashboardConfig,
  FieldMapping,
} from "./types";
import { FIELD_MAPPINGS } from "./types";
import { substituteInObject } from "./env-substitutor";

export function transform(config: DashboardConfig): EnhancedDashboardConfig {
  // Substitute env vars in config
  const substituted = substituteInObject(config);

  // Build field mappings metadata
  const fieldMappings: Record<string, { color: string; metaTag: string }> = {};

  for (const mapping of FIELD_MAPPINGS) {
    fieldMappings[mapping.field] = {
      color: mapping.hslColor,
      metaTag: mapping.metaTag,
    };
  }

  return {
    ...substituted,
    _fieldMappings: fieldMappings,
  };
}

export function getFieldMapping(fieldName: string): FieldMapping | undefined {
  return FIELD_MAPPINGS.find((m) => m.field === fieldName);
}

export function applyTransformation(
  value: unknown,
  mapping: FieldMapping
): unknown {
  // If value matches pre, return post
  if (mapping.pre !== null && value === mapping.pre) {
    return mapping.post;
  }
  // Otherwise return value as-is
  return value;
}

export function generateCssVariables(
  config: EnhancedDashboardConfig
): Record<string, string> {
  const cssVars: Record<string, string> = {};

  for (const [field, meta] of Object.entries(config._fieldMappings)) {
    cssVars[`--field-${field}-color`] = meta.color;
  }

  return cssVars;
}

export function validateConfig(config: DashboardConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  const required = ["id", "path", "template", "status", "name"] as const;

  for (const field of required) {
    if (!config[field]) {
      errors.push(`Missing required field: ${field}`);
    }
  }

  if (config.tags && !Array.isArray(config.tags)) {
    errors.push("Field 'tags' must be an array");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
