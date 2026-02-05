// packages/test/config-schema.ts
import { z } from 'zod'

// Install configuration schema
export const InstallConfigSchema = z.object({
  registry: z.string().url().optional(),
  cafile: z.string().optional(),
  prefer: z.enum(['offline', 'online']).optional(),
  exact: z.boolean().optional(),
  token: z.string().optional()
})

// Coverage threshold schema
export const CoverageThresholdSchema = z.object({
  lines: z.number().min(0).max(1),
  functions: z.number().min(0).max(1),
  statements: z.number().min(0).max(1),
  branches: z.number().min(0).max(1)
})

// Coverage configuration schema
export const CoverageConfigSchema = z.object({
  reporter: z.array(z.enum(['text', 'lcov', 'json', 'html'])),
  threshold: CoverageThresholdSchema,
  pathIgnore: z.array(z.string())
})

// Test configuration schema
export const TestConfigSchema = z.object({
  root: z.string().optional(),
  preload: z.array(z.string()).optional(),
  timeout: z.number().positive().optional(),
  smol: z.boolean().optional(),
  coverage: z.union([
    z.boolean(),
    CoverageConfigSchema
  ]).optional(),
  reporter: z.enum(['spec', 'tap', 'json', 'junit']).optional(),
  updateSnapshots: z.boolean().optional(),
  match: z.array(z.string()).optional(),
  _inherited: z.object({
    registry: z.string().url().optional(),
    cafile: z.string().optional(),
    prefer: z.enum(['offline', 'online']).optional(),
    exact: z.boolean().optional()
  }).optional()
})

// Main Bun test configuration schema
export const BunTestConfigSchema = z.object({
  install: InstallConfigSchema.default({}),
  test: TestConfigSchema.default({}),
  'test.ci': TestConfigSchema.partial().optional(),
  'test.staging': TestConfigSchema.partial().optional(),
  'test.local': TestConfigSchema.partial().optional()
})

// Runtime validation function
export function validateTestConfig(config: any): BunTestConfig {
  try {
    return BunTestConfigSchema.parse(config)
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.errors.map(err => {
        const path = err.path.join('.')
        return `${path}: ${err.message}`
      }).join('\n')
      
      throw new ConfigValidationError(
        `Invalid test configuration:\n${formattedErrors}`,
        { errors: error.errors }
      )
    }
    throw error
  }
}

// Type exports
export type BunTestConfig = z.infer<typeof BunTestConfigSchema>
export type InstallConfig = z.infer<typeof InstallConfigSchema>
export type TestConfig = z.infer<typeof TestConfigSchema>
export type CoverageConfig = z.infer<typeof CoverageConfigSchema>
export type CoverageThreshold = z.infer<typeof CoverageThresholdSchema>

// Custom error class
export class ConfigValidationError extends Error {
  constructor(message: string, public details?: any) {
    super(message)
    this.name = 'ConfigValidationError'
  }
}

// Configuration validation utilities
export class ConfigValidator {
  static validateRegistryUrl(url: string): boolean {
    try {
      new URL(url)
      return true
    } catch {
      return false
    }
  }
  
  static validateTimeout(timeout: number): boolean {
    return timeout > 0 && timeout <= 300000 // Max 5 minutes
  }
  
  static validateCoverageThreshold(threshold: number): boolean {
    return threshold >= 0 && threshold <= 1
  }
  
  static validatePreloadScripts(scripts: string[]): { valid: string[]; invalid: string[] } {
    const valid: string[] = []
    const invalid: string[] = []
    
    for (const script of scripts) {
      if (Bun.file(script).exists()) {
        valid.push(script)
      } else {
        invalid.push(script)
      }
    }
    
    return { valid, invalid }
  }
  
  static validateEnvironmentVariables(env: Record<string, string>): {
    safe: Record<string, string>
    suspicious: string[]
  } {
    const safe: Record<string, string> = {}
    const suspicious: string[] = []
    
    const suspiciousPatterns = [
      /password/i,
      /secret/i,
      /token/i,
      /api[_-]?key/i,
      /private[_-]?key/i
    ]
    
    for (const [key, value] of Object.entries(env)) {
      const isSuspicious = suspiciousPatterns.some(pattern => pattern.test(key))
      
      if (isSuspicious && value.length > 8) {
        suspicious.push(key)
      } else {
        safe[key] = value
      }
    }
    
    return { safe, suspicious }
  }
}

// Default configurations
export const DEFAULT_CONFIGS = {
  install: {
    prefer: 'online' as const,
    exact: false
  },
  test: {
    root: '.',
    timeout: 5000,
    smol: false,
    coverage: false,
    reporter: 'spec' as const
  },
  'test.ci': {
    timeout: 30000,
    smol: true,
    coverage: {
      reporter: ['text', 'lcov'] as const,
      threshold: {
        lines: 0.9,
        functions: 0.9,
        statements: 0.85,
        branches: 0.8
      },
      pathIgnore: ['**/*.spec.ts', '**/*.test.ts', 'generated/**']
    }
  },
  'test.staging': {
    timeout: 15000,
    coverage: false
  },
  'test.local': {
    timeout: 5000,
    updateSnapshots: true
  }
} as const

// Configuration merger utility
export class ConfigMerger {
  static merge(base: any, override: any): any {
    const result = { ...base }
    
    for (const [key, value] of Object.entries(override)) {
      if (value === undefined || value === null) {
        continue
      }
      
      if (typeof value === 'object' && !Array.isArray(value) && value.constructor === Object) {
        result[key] = this.merge(result[key] || {}, value)
      } else {
        result[key] = value
      }
    }
    
    return result
  }
  
  static applyInheritance(
    config: any,
    context: 'ci' | 'local' | 'staging'
  ): BunTestConfig {
    const base = {
      install: config.install || {},
      test: config.test || {}
    }
    
    // Apply context-specific overrides
    const contextKey = `test.${context}`
    if (config[contextKey]) {
      base.test = this.merge(base.test, config[contextKey])
    }
    
    // Add inherited install settings
    base.test._inherited = {
      registry: base.install.registry,
      cafile: base.install.cafile,
      prefer: base.install.prefer,
      exact: base.install.exact
    }
    
    return base as BunTestConfig
  }
}

// Security validation rules
export const SECURITY_RULES = {
  // No production URLs in test configs
  noProductionUrls: (value: string): boolean => {
    const prodPatterns = [
      /prod\./i,
      /production\./i,
      /live\./i,
      /api\.prod/i
    ]
    return !prodPatterns.some(pattern => pattern.test(value))
  },
  
  // Token length validation
  tokenLength: (token: string): boolean => {
    return token.length >= 20 && token.length <= 512
  },
  
  // File path validation
  safePath: (path: string): boolean => {
    return !path.includes('..') && !path.startsWith('/')
  },
  
  // Registry URL validation
  secureRegistry: (url: string): boolean => {
    try {
      const parsed = new URL(url)
      return parsed.protocol === 'https:' || parsed.hostname === 'localhost'
    } catch {
      return false
    }
  }
} as const

// Configuration security validator
export class ConfigSecurityValidator {
  static validate(config: BunTestConfig): { valid: boolean; violations: string[] } {
    const violations: string[] = []
    
    // Validate install section
    if (config.install.registry) {
      if (!SECURITY_RULES.secureRegistry(config.install.registry)) {
        violations.push('Registry must use HTTPS or be localhost')
      }
    }
    
    if (config.install.token) {
      if (!SECURITY_RULES.tokenLength(config.install.token)) {
        violations.push('Registry token must be between 20-512 characters')
      }
    }
    
    // Validate test section
    if (config.test.root && !SECURITY_RULES.safePath(config.test.root)) {
      violations.push('Test root path must be relative and not contain ".."')
    }
    
    if (config.test.preload) {
      for (const preload of config.test.preload) {
        if (!SECURITY_RULES.safePath(preload)) {
          violations.push(`Preload script path must be safe: ${preload}`)
        }
      }
    }
    
    // Validate coverage thresholds
    if (typeof config.test.coverage === 'object') {
      const thresholds = config.test.coverage.threshold
      for (const [key, value] of Object.entries(thresholds)) {
        if (typeof value === 'number' && (value < 0 || value > 1)) {
          violations.push(`Coverage threshold ${key} must be between 0 and 1`)
        }
      }
    }
    
    return {
      valid: violations.length === 0,
      violations
    }
  }
}
