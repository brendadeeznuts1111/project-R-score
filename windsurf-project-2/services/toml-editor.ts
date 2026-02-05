import { parse as parseToml, stringify as stringifyToml } from 'bun:toml';
import { Database } from 'bun:sqlite';

declare const Bun: {
  file(path: string): { text(): Promise<string> };
  hash: {
    crc32(str: string): number;
  };
};

export interface EditorOptions {
  cacheDb?: string;
  policy?: SecurityPolicy;
  minSecurityScore?: number;
}

export interface EditResult {
  path: string;
  originalHash: string;
  optimizedHash: string;
  secretsCount: number;
  securityScore: number;
  changes: DiffChange[];
  validated: boolean;
  errors: string[];
}

export interface SecurityPolicy {
  allowedPatterns?: RegExp[];
  blockedPatterns?: RegExp[];
  maxSecrets?: number;
  requireEncryption?: boolean;
}

export interface DiffChange {
  path: string[];
  oldValue?: any;
  newValue?: any;
  type: 'added' | 'removed' | 'modified';
}

interface SecurityValidation {
  score: number;
  valid: boolean;
  issues: string[];
}

class SecurityValidator {
  private policy: SecurityPolicy;

  constructor(policy: SecurityPolicy = {}) {
    this.policy = {
      allowedPatterns: [/^[A-Z_][A-Z0-9_]*$/],
      blockedPatterns: [/password/i, /secret/i, /key/i, /token/i],
      maxSecrets: 50,
      requireEncryption: false,
      ...policy
    };
  }

  validate(secrets: Array<{ key: string; value: string }>): SecurityValidation {
    const issues: string[] = [];
    let score = 100;

    for (const secret of secrets) {
      // Check blocked patterns
      for (const pattern of this.policy.blockedPatterns!) {
        if (pattern.test(secret.key)) {
          issues.push(`Blocked pattern detected in: ${secret.key}`);
          score -= 10;
        }
      }

      // Check naming convention
      const validPattern = this.policy.allowedPatterns!.some(p => p.test(secret.key));
      if (!validPattern && secrets.length > 0) {
        issues.push(`Invalid secret naming: ${secret.key}`);
        score -= 5;
      }
    }

    // Check max secrets limit
    if (secrets.length > this.policy.maxSecrets!) {
      issues.push(`Too many secrets: ${secrets.length} (max: ${this.policy.maxSecrets})`);
      score -= 20;
    }

    return {
      score: Math.max(0, score),
      valid: score >= 70 && issues.length === 0,
      issues
    };
  }
}

export class TomlSecretsEditor {
  private db: Database;
  private security: SecurityValidator;

  constructor(private configPath: string, options: EditorOptions = {}) {
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

  private deepMerge(base: Record<string, any>, override: Record<string, any>): Record<string, any> {
    const result = { ...base };

    for (const key in override) {
      if (typeof override[key] === 'object' && override[key] !== null && !Array.isArray(override[key])) {
        result[key] = this.deepMerge(result[key] || {}, override[key]);
      } else {
        result[key] = override[key];
      }
    }

    return result;
  }

  private extractSecrets(parsed: Record<string, any>): Array<{ key: string; value: string }> {
    const secrets: Array<{ key: string; value: string }> = [];

    const traverse = (obj: Record<string, any>, path: string[] = []) => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = [...path, key];

        if (typeof value === 'object' && value !== null) {
          traverse(value as Record<string, any>, currentPath);
        } else if (key.toLowerCase().includes('secret') || key.toLowerCase().includes('password')) {
          secrets.push({ key: currentPath.join('.'), value: String(value) });
        }
      }
    };

    traverse(parsed);
    return secrets;
  }

  private validateSecrets(secrets: Array<{ key: string; value: string }>): SecurityValidation {
    return this.security.validate(secrets);
  }

  private optimizeToml(parsed: Record<string, any>): string {
    const optimized: Record<string, any> = {};

    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'object' && value !== null) {
        optimized[key] = value;
      } else {
        optimized[key] = value;
      }
    }

    return stringifyToml(optimized);
  }

  private generateDiff(original: string, optimized: string): DiffChange[] {
    const changes: DiffChange[] = [];
    const originalLines = original.split('\n');
    const optimizedLines = optimized.split('\n');

    const originalSet = new Set(originalLines);
    const optimizedSet = new Set(optimizedLines);

    for (const line of optimizedLines) {
      if (!originalSet.has(line)) {
        changes.push({
          path: [line.split('=')[0]?.trim() || ''],
          newValue: line,
          type: 'added'
        });
      }
    }

    for (const line of originalLines) {
      if (!optimizedSet.has(line)) {
        changes.push({
          path: [line.split('=')[0]?.trim() || ''],
          oldValue: line,
          type: 'removed'
        });
      }
    }

    return changes;
  }

  async edit(path: string, mutations: Record<string, any>): Promise<EditResult> {
    const original = await Bun.file(path).text();
    const parsed = parseToml(original) as Record<string, any>;

    const modified = this.deepMerge(parsed, mutations);

    const secrets = this.extractSecrets(modified);
    const validation = this.validateSecrets(secrets);

    const optimized = this.optimizeToml(modified);

    const originalHash = await this.hashString(original);
    const optimizedHash = await this.hashString(optimized);

    const result: EditResult = {
      path,
      originalHash,
      optimizedHash,
      secretsCount: secrets.length,
      securityScore: validation.score,
      changes: this.generateDiff(original, optimized),
      validated: validation.valid,
      errors: validation.issues
    };

    this.db.run(
      `INSERT OR REPLACE INTO toml_cache VALUES (?, ?, ?, ?, ?, ?)`,
      path, result.originalHash, result.optimizedHash,
      result.secretsCount, Date.now(), result.securityScore
    );

    return result;
  }

  private async hashString(content: string): Promise<string> {
    const hashBuffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(content));
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async getCache(path: string): Promise<Record<string, any> | null> {
    const query = this.db.query('SELECT * FROM toml_cache WHERE file_path = ?');
    return query.get(path) as Record<string, any> | null;
  }

  async close(): Promise<void> {
    this.db.close();
  }
}
