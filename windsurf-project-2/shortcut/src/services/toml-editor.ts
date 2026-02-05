import { parse as parseToml, stringify as stringifyToml } from 'bun:toml';
import { Database } from 'bun:sqlite';

export interface EditorOptions {
  cacheDb?: string;
  policy?: SecurityPolicy;
}

export interface SecurityPolicy {
  allowedPrefixes?: string[];
  blockedPatterns?: string[];
  requireDefaults?: boolean;
  maxSecretsPerFile?: number;
  scanTomlValues?: boolean;
}

export interface EditResult {
  path: string;
  originalHash: string;
  optimizedHash: string;
  secretsCount: number;
  securityScore: number;
  changes: string[];
}

export interface ValidationResult {
  valid: boolean;
  variables: SecretVariable[];
  errors: string[];
  score: number;
}

export interface SecretVariable {
  name: string;
  hasDefault: boolean;
  isDangerous: boolean;
  classification: 'public' | 'private' | 'secret' | 'dangerous';
}

export interface OptimizeOptions {
  skip?: string[];
  env?: Record<string, string>;
}

export interface OptimizeResult {
  optimized: string;
  metrics: TransformMetrics[];
  sizeReduction: number;
  compressionRatio: number;
}

export interface TransformMetrics {
  rule: string;
  durationNs: number;
  bytesReduced: number;
}

export class TomlSecretsEditor {
  private db: Database;
  private security: SecurityValidator;
  
  constructor(private configPath: string, private options: EditorOptions = {}) {
    this.db = new Database(options.cacheDb || ':memory:');
    this.security = new SecurityValidator(options.policy);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS toml_cache (
        file_path TEXT PRIMARY KEY,
        original_hash TEXT,
        optimized_hash TEXT,
        secrets_count INTEGER,
        last_modified INTEGER,
        security_score REAL
      )
    `);
  }

  async edit(path: string, mutations: Record<string, any>): Promise<EditResult> {
    const original = await Bun.file(path).text();
    const parsed = parseToml(original);
    
    // Apply mutations
    const modified = this.deepMerge(parsed, mutations);
    
    // Validate Bun secrets syntax
    const secrets = this.extractSecrets(modified);
    const validation = this.security.validateSecrets(secrets);
    
    if (!validation.valid) {
      throw new Error(`Security validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Optimize
    const optimizer = new TomlOptimizer();
    const optimized = await optimizer.optimize(stringifyToml(modified), this.options);
    
    // Generate result
    const result: EditResult = {
      path,
      originalHash: Bun.hash.crc32(original).toString(16),
      optimizedHash: Bun.hash.crc32(optimized.optimized).toString(16),
      secretsCount: secrets.length,
      securityScore: validation.score,
      changes: this.generateDiff(original, optimized.optimized)
    };
    
    // Cache result
    this.db.run(
      `INSERT OR REPLACE INTO toml_cache VALUES (?, ?, ?, ?, ?, ?)`,
      path, result.originalHash, result.optimizedHash,
      result.secretsCount, Date.now(), result.securityScore
    );
    
    return result;
  }

  private deepMerge(target: any, source: any): any {
    if (source === null || source === undefined) return target;
    if (typeof source !== 'object' || typeof target !== 'object') return source;
    
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }

  private extractSecrets(obj: any, path = ''): string[] {
    const secrets: string[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'string' && value.includes('${')) {
        secrets.push(value);
      } else if (typeof value === 'object' && value !== null) {
        secrets.push(...this.extractSecrets(value, currentPath));
      }
    }
    
    return secrets;
  }

  private generateDiff(original: string, modified: string): string[] {
    const lines1 = original.split('\n');
    const lines2 = modified.split('\n');
    const changes: string[] = [];
    
    const maxLines = Math.max(lines1.length, lines2.length);
    
    for (let i = 0; i < maxLines; i++) {
      const line1 = lines1[i] || '';
      const line2 = lines2[i] || '';
      
      if (line1 !== line2) {
        if (line1 && !line2) {
          changes.push(`- ${line1}`);
        } else if (!line1 && line2) {
          changes.push(`+ ${line2}`);
        } else {
          changes.push(`- ${line1}`);
          changes.push(`+ ${line2}`);
        }
      }
    }
    
    return changes;
  }
}

export class SecurityValidator {
  private patterns = {
    envVar: /\$\{([A-Z_][A-Z0-9_]*)((?::-\w+)?)\}/g,
    publicVar: /^\$\{PUBLIC_[A-Z_]+\}$/,
    privateVar: /^\$\{PRIVATE_[A-Z_]+\}$/,
    secretVar: /^\$\{SECRET_[A-Z_]+\}$/,
    trustedVar: /^\$\{TRUSTED_[A-Z_]+\}$/,
    dangerousVar: /\$\{(PASSWORD|TOKEN|KEY|SECRET)\b/i,
    userInputVar: /\$\{.*USER_INPUT.*\}/,
    requestVar: /\$\{.*REQUEST.*\}/
  };

  constructor(private policy: SecurityPolicy = {}) {}

  validateSecrets(secrets: string[]): ValidationResult {
    const variables: SecretVariable[] = [];
    const errors: string[] = [];
    
    for (const secret of secrets) {
      const matches = [...secret.matchAll(this.patterns.envVar)];
      
      for (const [full, name, defaultVal] of matches) {
        const variable: SecretVariable = {
          name,
          hasDefault: !!defaultVal,
          isDangerous: this.patterns.dangerousVar.test(full),
          classification: this.classifyVariable(name)
        };
        
        variables.push(variable);
        
        // Validate against policy
        if (this.policy.allowedPrefixes && !this.policy.allowedPrefixes.some(prefix => name.startsWith(prefix))) {
          errors.push(`Variable ${name} does not have allowed prefix`);
        }
        
        if (this.policy.blockedPatterns && this.policy.blockedPatterns.some(pattern => name.includes(pattern))) {
          errors.push(`Variable ${name} contains blocked pattern`);
        }
        
        if (this.policy.requireDefaults && !variable.hasDefault) {
          errors.push(`Variable ${name} requires default value`);
        }
        
        if (variable.isDangerous) {
          errors.push(`Variable ${name} contains dangerous pattern`);
        }
      }
    }
    
    if (this.policy.maxSecretsPerFile && variables.length > this.policy.maxSecretsPerFile) {
      errors.push(`Too many secrets: ${variables.length} > ${this.policy.maxSecretsPerFile}`);
    }
    
    const score = this.calculateSecurityScore(variables, errors);
    
    return {
      valid: errors.length === 0,
      variables,
      errors,
      score
    };
  }

  private classifyVariable(name: string): SecretVariable['classification'] {
    if (name.startsWith('PUBLIC_')) return 'public';
    if (name.startsWith('PRIVATE_')) return 'private';
    if (name.startsWith('SECRET_')) return 'secret';
    if (this.patterns.dangerousVar.test(name)) return 'dangerous';
    return 'private';
  }

  private calculateSecurityScore(variables: SecretVariable[], errors: string[]): number {
    let score = 100;
    
    // Deduct points for errors
    score -= errors.length * 10;
    
    // Deduct points for dangerous variables
    const dangerousCount = variables.filter(v => v.isDangerous).length;
    score -= dangerousCount * 5;
    
    // Bonus for proper classification
    const properlyClassified = variables.filter(v => 
      v.classification !== 'dangerous' && 
      (v.name.startsWith('PUBLIC_') || v.name.startsWith('PRIVATE_') || v.name.startsWith('SECRET_'))
    ).length;
    score += properlyClassified * 2;
    
    return Math.max(0, Math.min(100, score));
  }
}

export class TomlOptimizer {
  private transformations = [
    {
      name: "stripComments",
      transform: (toml: string) => toml.replace(/#.*$/gm, '').trim()
    },
    {
      name: "inlineEnvVars",
      transform: (toml: string, env: Record<string, string>) => {
        return toml.replace(
          /\$\{([A-Z_]+)(?::-([^}]+))?\}/g,
          (_: string, varName: string, defaultVal?: string) => {
            return env[varName] || defaultVal || '';
          }
        );
      }
    },
    {
      name: "sortKeys",
      transform: (obj: any) => this.sortObjectKeys(obj)
    },
    {
      name: "minify",
      transform: (toml: string) => toml.replace(/\n\s*\n/g, '\n').trim()
    }
  ];

  async optimize(toml: string, options: OptimizeOptions = {}): Promise<OptimizeResult> {
    let current = toml;
    const metrics: TransformMetrics[] = [];
    const env = options.env || process.env;
    
    for (const rule of this.transformations) {
      if (options.skip?.includes(rule.name)) continue;
      
      const start = Bun.nanoseconds();
      const previous = current;
      
      if (rule.name === 'sortKeys') {
        const parsed = parseToml(current);
        current = stringifyToml(rule.transform(parsed));
      } else {
        current = rule.transform(current, env);
      }
      
      metrics.push({
        rule: rule.name,
        durationNs: Bun.nanoseconds() - start,
        bytesReduced: previous.length - current.length
      });
    }
    
    return {
      optimized: current,
      metrics,
      sizeReduction: toml.length - current.length,
      compressionRatio: current.length / toml.length
    };
  }

  private sortObjectKeys(obj: any): any {
    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item));
    }
    
    if (obj && typeof obj === 'object') {
      const sorted: any = {};
      const keys = Object.keys(obj).sort();
      
      for (const key of keys) {
        sorted[key] = this.sortObjectKeys(obj[key]);
      }
      
      return sorted;
    }
    
    return obj;
  }
}
