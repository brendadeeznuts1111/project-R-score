#!/usr/bin/env bun
// Tier-1380 Configuration Schema & Validation
// [TIER-1380-SCHEMA-001] [ZOD-VALIDATION-002]

import { z } from 'zod';

export const InstallConfigSchema = z.object({
  registry: z.string().url().optional(),
  cafile: z.string().optional(),
  prefer: z.enum(['offline', 'online']).optional(),
  exact: z.boolean().optional(),
  token: z.string().optional()
});

export const CoverageThresholdSchema = z.object({
  lines: z.number().min(0).max(1),
  functions: z.number().min(0).max(1),
  statements: z.number().min(0).max(1),
  branches: z.number().min(0).max(1)
});

export const TestConfigSchema = z.object({
  root: z.string().optional(),
  preload: z.array(z.string()).optional(),
  timeout: z.number().positive().optional(),
  smol: z.boolean().optional(),
  coverage: z.union([
    z.boolean(),
    z.object({
      reporter: z.array(z.enum(['text', 'lcov', 'json', 'html'])),
      threshold: CoverageThresholdSchema,
      pathIgnore: z.array(z.string())
    })
  ]).optional(),
  reporter: z.enum(['spec', 'tap', 'json', 'junit']).optional(),
  updateSnapshots: z.boolean().optional(),
  match: z.array(z.string()).optional()
});

export const BunTestConfigSchema = z.object({
  install: InstallConfigSchema.default({}),
  test: TestConfigSchema.default({}),
  'test.ci': TestConfigSchema.partial().optional(),
  'test.staging': TestConfigSchema.partial().optional(),
  'test.local': TestConfigSchema.partial().optional()
});

// Runtime validation
export function validateTestConfig(config: any): any {
  try {
    return BunTestConfigSchema.parse(config);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ConfigValidationError(
        'Invalid test configuration',
        { errors: error.errors }
      );
    }
    throw error;
  }
}

// Error class
class ConfigValidationError extends Error {
  constructor(message: string, public details: any) {
    super(message);
    this.name = 'ConfigValidationError';
  }
}

export { ConfigValidationError };
