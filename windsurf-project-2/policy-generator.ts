import { extractPatternsWithContext, TomlPattern, PatternExtractionResult } from './integrations/pattern-extractor';
import { validateSecretSyntax, BUN_SECRET_PATTERNS, VariableInfo } from './validators/secrets-syntax';
import { TomlOptimizer } from './optimizers/toml-optimizer';

declare const Bun: {
  file(path: string): { text(): Promise<string>; write(content: string): Promise<void> };
  glob(pattern: string): Promise<string[]>;
};

export interface PolicyGenerationOptions {
  sourcePatterns?: string[];
  outputPath?: string;
  mergeExisting?: boolean;
  dryRun?: boolean;
  strictMode?: boolean;
  includeWebhooks?: boolean;
  webhookUrl?: string;
}

export interface GeneratedPolicy {
  secrets: SecretsSection;
  url_patterns: URLPatternsSection;
  validation: ValidationSection;
  optimization: OptimizationSection;
  audit: AuditSection;
  features: FeaturesSection;
  metadata: PolicyMetadata;
}

export interface SecretsSection {
  allowed_prefixes: string[];
  blocked_substrings: string[];
  blocked_patterns: string[];
  max_secrets_per_file: number;
  require_defaults: boolean;
  require_encryption: boolean;
  classifications: Classification[];
}

export interface Classification {
  pattern: string;
  risk: 'critical' | 'high' | 'medium' | 'low';
  action: 'block' | 'audit' | 'warn';
  prefix?: string;
}

export interface URLPatternsSection {
  high_risk: string[];
  medium_risk: string[];
  blocked_url_patterns: string[];
  max_exec_ms: number;
  scan_toml_values: boolean;
}

export interface ValidationSection {
  require_defaults: boolean;
  max_line_length: number;
  scan_toml_values: boolean;
  blocked_url_patterns: string[];
  fail_on_dangerous: boolean;
}

export interface OptimizationSection {
  strip_comments: boolean;
  sort_keys: boolean;
  minify: boolean;
  preserve_section_order: boolean;
  inline_public_vars: boolean;
}

export interface AuditSection {
  enable_realtime_logging: boolean;
  log_retention_days: number;
  require_user_attribution: boolean;
  alert_score_threshold: number;
}

export interface FeaturesSection {
  experimental: boolean;
  verbose_logging: boolean;
  enable_caching: boolean;
  cache_ttl: number;
}

export interface PolicyMetadata {
  generated_at: number;
  source_directory: string;
  patterns_found: number;
  secrets_classified: number;
  url_patterns_extracted: number;
  version: string;
}

export class PolicyGenerator {
  private optimizer: TomlOptimizer;
  private sourceDir: string;

  constructor(sourceDir: string = '.') {
    this.sourceDir = sourceDir;
    this.optimizer = new TomlOptimizer();
  }

  async generate(options: PolicyGenerationOptions = {}): Promise<GeneratedPolicy> {
    const patterns = await this.scanForPatterns(options.sourcePatterns);
    const secrets = await this.classifySecrets(patterns.patterns);
    const urlPatterns = this.analyzeURLPatterns(patterns.patterns);

    const policy: GeneratedPolicy = {
      secrets: this.buildSecretsSection(secrets, patterns.patterns),
      url_patterns: urlPatterns,
      validation: this.buildValidationSection(secrets, urlPatterns, options.strictMode),
      optimization: this.buildOptimizationSection(),
      audit: this.buildAuditSection(),
      features: this.buildFeaturesSection(options),
      metadata: {
        generated_at: Date.now(),
        source_directory: this.sourceDir,
        patterns_found: patterns.patterns.length,
        secrets_classified: secrets.length,
        url_patterns_extracted: patterns.patterns.filter(p => p.pattern.includes('://') || p.pattern.startsWith('/')).length,
        version: '1.0.0'
      }
    };

    return policy;
  }

  async scanForPatterns(patterns?: string[]): Promise<PatternExtractionResult> {
    const scanPatterns = patterns || [
      './**/*.toml',
      './**/*.ts',
      './**/*.js',
      './**/*.json'
    ];

    const allPatterns: TomlPattern[] = [];

    for (const pattern of scanPatterns) {
      const files = await this.globFiles(pattern);
      for (const file of files) {
        try {
          const content = await Bun.file(file).text();
          const extracted = extractPatternsWithContext({ content: this.parseContent(content) }, file);
          allPatterns.push(...extracted.patterns);
        } catch {
          // Skip files that can't be parsed
        }
      }
    }

    return {
      patterns: allPatterns,
      staticPatterns: allPatterns.filter(p => !p.isDynamic),
      dynamicPatterns: allPatterns.filter(p => p.isDynamic),
      envVarReferences: new Map()
    };
  }

  private async classifySecrets(patterns: TomlPattern[]): Promise<ClassifiedSecret[]> {
    const classified: ClassifiedSecret[] = [];

    for (const pattern of patterns) {
      const keyPathUpper = pattern.keyPath.toUpperCase();

      if (keyPathUpper.includes('SECRET') ||
          keyPathUpper.includes('PASSWORD') ||
          keyPathUpper.includes('TOKEN') ||
          keyPathUpper.includes('KEY') ||
          keyPathUpper.includes('CREDENTIAL')) {

        const validation = validateSecretSyntax(pattern.pattern);
        const risk = this.calculateRisk(pattern.keyPath, validation);
        const prefix = this.extractPrefix(pattern.keyPath);

        classified.push({
          pattern: pattern.keyPath,
          risk,
          action: risk === 'critical' ? 'block' : risk === 'high' ? 'block' : 'audit',
          prefix,
          validation
        });
      }
    }

    return classified;
  }

  private analyzeURLPatterns(patterns: TomlPattern[]): URLPatternsSection {
    const highRisk: string[] = [];
    const mediumRisk: string[] = [];
    const blocked: string[] = [];

    for (const pattern of patterns) {
      if (this.isURLPattern(pattern.pattern)) {
        if (this.isHighRiskURL(pattern.pattern)) {
          highRisk.push(pattern.pattern);
        } else if (this.isMediumRiskURL(pattern.pattern)) {
          mediumRisk.push(pattern.pattern);
        }

        if (this.shouldBlockURL(pattern.pattern)) {
          blocked.push(pattern.pattern);
        }
      }
    }

    return {
      high_risk: [...new Set(highRisk)],
      medium_risk: [...new Set(mediumRisk)],
      blocked_url_patterns: [...new Set(blocked)],
      max_exec_ms: 1.0,
      scan_toml_values: true
    };
  }

  private buildSecretsSection(classified: ClassifiedSecret[], patterns: TomlPattern[]): SecretsSection {
    const prefixes = new Set<string>(['PUBLIC_', 'PRIVATE_', 'SECRET_', 'TRUSTED_']);
    const blockedSubstrings = new Set<string>(['PASSWORD', 'TOKEN', 'KEY', 'SECRET_KEY', 'CREDENTIAL']);
    const blockedPatterns = new Set<string>();
    const classifications: Classification[] = [];

    for (const secret of classified) {
      prefixes.add(secret.prefix || this.extractPrefix(secret.pattern));

      if (secret.risk === 'critical' || secret.risk === 'high') {
        blockedSubstrings.add(secret.pattern.split('.').pop()?.toUpperCase() || '');
        blockedPatterns.add(`*${secret.pattern.split('.').pop()}*`);
      }

      classifications.push({
        pattern: secret.pattern,
        risk: secret.risk,
        action: secret.action,
        prefix: secret.prefix
      });
    }

    return {
      allowed_prefixes: Array.from(prefixes).sort(),
      blocked_substrings: Array.from(blockedSubstrings).sort(),
      blocked_patterns: Array.from(blockedPatterns).sort(),
      max_secrets_per_file: 50,
      require_defaults: true,
      require_encryption: true,
      classifications
    };
  }

  private buildValidationSection(classified: ClassifiedSecret[], urlSection: URLPatternsSection, strict?: boolean): ValidationSection {
    const hasCritical = classified.some(c => c.risk === 'critical');

    return {
      require_defaults: true,
      max_line_length: strict ? 2048 : 4096,
      scan_toml_values: true,
      blocked_url_patterns: urlSection.blocked_url_patterns,
      fail_on_dangerous: hasCritical || (strict ?? false)
    };
  }

  private buildOptimizationSection(): OptimizationSection {
    return {
      strip_comments: true,
      sort_keys: true,
      minify: false,
      preserve_section_order: true,
      inline_public_vars: true
    };
  }

  private buildAuditSection(): AuditSection {
    return {
      enable_realtime_logging: true,
      log_retention_days: 90,
      require_user_attribution: true,
      alert_score_threshold: 70
    };
  }

  private buildFeaturesSection(options: PolicyGenerationOptions): FeaturesSection {
    return {
      experimental: false,
      verbose_logging: false,
      enable_caching: true,
      cache_ttl: 3600
    };
  }

  async generateTOML(policy: GeneratedPolicy): Promise<string> {
    const tomlObj = this.policyToObject(policy);
    const tomlString = this.stringifyTOML(tomlObj);

    const optimized = await this.optimizer.optimize(tomlString, {
      skip: ['sortKeys']
    });

    return optimized.optimized;
  }

  async savePolicy(policy: GeneratedPolicy, outputPath: string = '.observatory-policy.toml'): Promise<void> {
    const toml = await this.generateTOML(policy);
    await Bun.file(outputPath).write(toml);
  }

  async diffWithExisting(policy: GeneratedPolicy, existingPath: string = '.observatory-policy.toml'): Promise<PolicyDiff> {
    const existing = await this.loadExistingPolicy(existingPath);
    const newToml = await this.generateTOML(policy);

    return {
      added: this.findAddedSections(existing, policy),
      removed: this.findRemovedSections(existing, policy),
      modified: this.findModifiedSections(existing, policy),
      diff: this.computeTextDiff(existing.raw || '', newToml)
    };
  }

  private async loadExistingPolicy(path: string): Promise<any> {
    try {
      const content = await Bun.file(path).text();
      return { raw: content, parsed: this.parseContent(content) };
    } catch {
      return { raw: '', parsed: {} };
    }
  }

  private policyToObject(policy: GeneratedPolicy): any {
    return {
      secrets: {
        allowed_prefixes: policy.secrets.allowed_prefixes,
        blocked_substrings: policy.secrets.blocked_substrings,
        blocked_patterns: policy.secrets.blocked_patterns,
        max_secrets_per_file: policy.secrets.max_secrets_per_file,
        require_defaults: policy.secrets.require_defaults,
        require_encryption: policy.secrets.require_encryption
      },
      url_patterns: {
        high_risk: policy.url_patterns.high_risk,
        medium_risk: policy.url_patterns.medium_risk,
        blocked_url_patterns: policy.url_patterns.blocked_url_patterns,
        max_exec_ms: policy.url_patterns.max_exec_ms,
        scan_toml_values: policy.url_patterns.scan_toml_values
      },
      validation: {
        require_defaults: policy.validation.require_defaults,
        max_line_length: policy.validation.max_line_length,
        scan_toml_values: policy.validation.scan_toml_values,
        blocked_url_patterns: policy.validation.blocked_url_patterns,
        fail_on_dangerous: policy.validation.fail_on_dangerous
      },
      optimization: {
        strip_comments: policy.optimization.strip_comments,
        sort_keys: policy.optimization.sort_keys,
        minify: policy.optimization.minify,
        preserve_section_order: policy.optimization.preserve_section_order,
        inline_public_vars: policy.optimization.inline_public_vars
      },
      audit: {
        enable_realtime_logging: policy.audit.enable_realtime_logging,
        log_retention_days: policy.audit.log_retention_days,
        require_user_attribution: policy.audit.require_user_attribution,
        alert_score_threshold: policy.audit.alert_score_threshold
      },
      features: {
        experimental: policy.features.experimental,
        verbose_logging: policy.features.verbose_logging,
        enable_caching: policy.features.enable_caching,
        cache_ttl: policy.features.cache_ttl
      }
    };
  }

  private stringifyTOML(obj: any): string {
    let toml = '';

    for (const [section, values] of Object.entries(obj)) {
      toml += `[${section}]\n`;
      if (Array.isArray(values)) {
        for (const item of values) {
          toml += this.formatArrayItem(item);
        }
      } else if (typeof values === 'object' && values !== null) {
        for (const [key, value] of Object.entries(values)) {
          toml += this.formatKeyValue(key, value);
        }
      }
      toml += '\n';
    }

    return toml;
  }

  private formatKeyValue(key: string, value: any): string {
    const formattedKey = key.replace(/_/g, '-');
    if (typeof value === 'boolean') {
      return `${formattedKey} = ${value}\n`;
    }
    if (typeof value === 'number') {
      return `${formattedKey} = ${value}\n`;
    }
    if (Array.isArray(value)) {
      return `${formattedKey} = [${value.map(v => `"${v}"`).join(', ')}]\n`;
    }
    return `${formattedKey} = "${value}"\n`;
  }

  private formatArrayItem(item: any): string {
    if (typeof item === 'string') {
      return `  "${item}"\n`;
    }
    return `  ${item}\n`;
  }

  private parseContent(content: string): Record<string, any> {
    const result: Record<string, any> = {};
    const lines = content.split('\n');
    let currentSection: Record<string, any> = result;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        const sectionName = trimmed.slice(1, -1);
        currentSection = result;
        const parts = sectionName.split('.');
        for (const part of parts) {
          if (!currentSection[part]) {
            currentSection[part] = {};
          }
          currentSection = currentSection[part];
        }
      } else {
        const eqIndex = trimmed.indexOf('=');
        if (eqIndex > 0) {
          const key = trimmed.slice(0, eqIndex).trim();
          const value = trimmed.slice(eqIndex + 1).trim();
          currentSection[key] = this.parseValue(value);
        }
      }
    }

    return result;
  }

  private parseValue(value: string): any {
    if (value.startsWith('"') && value.endsWith('"')) {
      return value.slice(1, -1);
    }
    if (value.startsWith('[') && value.endsWith(']')) {
      return value.slice(1, -1).split(',').map(s => s.trim().replace(/"/g, ''));
    }
    const num = Number(value);
    if (!isNaN(num)) return num;
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  }

  private async globFiles(pattern: string): Promise<string[]> {
    const result = await Bun.glob(pattern);
    return Array.from(result);
  }

  private calculateRisk(keyPath: string, validation: { valid: boolean; errors: any[] }): 'critical' | 'high' | 'medium' | 'low' {
    const upperPath = keyPath.toUpperCase();

    if (/PASSWORD|SECRET_KEY|PRIVATE_KEY|CREDENTIAL/i.test(upperPath)) {
      return 'critical';
    }
    if (/TOKEN|API_KEY|SECRET/i.test(upperPath)) {
      return 'high';
    }
    if (!validation.valid || validation.errors.length > 0) {
      return 'high';
    }
    if (/SECRET/i.test(upperPath)) {
      return 'medium';
    }
    return 'low';
  }

  private extractPrefix(keyPath: string): string {
    const parts = keyPath.split('.');
    const lastPart = parts[parts.length - 1];
    const match = lastPart.match(/^([A-Z_]+)_/);
    return match ? match[1] + '_' : 'UNKNOWN_';
  }

  private isURLPattern(pattern: string): boolean {
    return pattern.includes('://') ||
           pattern.startsWith('/') ||
           pattern.includes('*') ||
           /https?:\/\//.test(pattern);
  }

  private isHighRiskURL(pattern: string): boolean {
    return /localhost|127\.0\.0\.1|0\.0\.0\.0|:\{/.test(pattern) ||
           pattern.includes('${') && /REQUEST|USER_INPUT/i.test(pattern);
  }

  private isMediumRiskURL(pattern: string): boolean {
    return pattern.includes('://') &&
           !/https:\/\/(api\.)?example\.com/i.test(pattern);
  }

  private shouldBlockURL(pattern: string): boolean {
    return /localhost|127\.0\.0\.1|0\.0\.0\.0/.test(pattern);
  }

  private findAddedSections(existing: any, policy: GeneratedPolicy): string[] {
    const added: string[] = [];
    const newSections = Object.keys(this.policyToObject(policy));

    for (const section of newSections) {
      if (!existing.parsed || !existing.parsed[section]) {
        added.push(section);
      }
    }

    return added;
  }

  private findRemovedSections(existing: any, policy: GeneratedPolicy): string[] {
    const removed: string[] = [];
    if (!existing.parsed) return removed;

    const existingSections = Object.keys(existing.parsed);
    const newSections = Object.keys(this.policyToObject(policy));

    for (const section of existingSections) {
      if (!newSections.includes(section)) {
        removed.push(section);
      }
    }

    return removed;
  }

  private findModifiedSections(existing: any, policy: GeneratedPolicy): string[] {
    const modified: string[] = [];
    if (!existing.parsed) return modified;

    const newObj = this.policyToObject(policy);

    for (const [section, values] of Object.entries(newObj)) {
      if (existing.parsed[section]) {
        const existingSection = existing.parsed[section];
        if (JSON.stringify(values) !== JSON.stringify(existingSection)) {
          modified.push(section);
        }
      }
    }

    return modified;
  }

  private computeTextDiff(oldText: string, newText: string): string {
    const oldLines = oldText.split('\n');
    const newLines = newText.split('\n');
    const added = newLines.filter(l => !oldLines.includes(l));
    const removed = oldLines.filter(l => !newLines.includes(l));

    return `+${added.length} lines, -${removed.length} lines`;
  }
}

interface ClassifiedSecret {
  pattern: string;
  risk: 'critical' | 'high' | 'medium' | 'low';
  action: 'block' | 'audit' | 'warn';
  prefix?: string;
  validation: { valid: boolean; errors: any[] };
}

interface PolicyDiff {
  added: string[];
  removed: string[];
  modified: string[];
  diff: string;
}
