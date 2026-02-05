import { parse as parseToml } from 'bun:toml';

export interface TomlPattern {
  pattern: string;
  keyPath: string;
  envVars: string[];
  isDynamic: boolean;
  location: {
    file: string;
    line: number;
    column: number;
  };
}

export interface PatternSecurityResult {
  patterns: TomlPattern[];
  securityIssues: SecurityIssue[];
  recommendations: string[];
}

export interface SecurityIssue {
  type: 'dangerous_env_var' | 'untrusted_pattern' | 'missing_validation';
  pattern: string;
  keyPath: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
}

export function extractURLPatternsFromToml(obj: any, keyPath = '', filePath = ''): TomlPattern[] {
  const patterns: TomlPattern[] = [];
  
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = keyPath ? `${keyPath}.${key}` : key;
    
    if (typeof value === 'string' && looksLikeURLPattern(value)) {
      patterns.push({
        pattern: value,
        keyPath: currentPath,
        envVars: extractEnvVars(value),
        isDynamic: value.includes('${'),
        location: { file: filePath, line: 0, column: 0 } // Populated by parser
      });
    } else if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      patterns.push(...extractURLPatternsFromToml(value, currentPath, filePath));
    }
  }
  
  return patterns;
}

export function looksLikeURLPattern(value: string): boolean {
  // Bun's URLPattern heuristics
  return value.includes(':') || 
         value.includes('*') || 
         /https?:\/\//.test(value) ||
         value.startsWith('/') ||
         value.includes('${');
}

export function extractEnvVars(value: string): string[] {
  return [...value.matchAll(/\$\{([A-Z_][A-Z0-9_]*)/g)].map(m => m[1]);
}

export class URLPatternSecurityAnalyzer {
  private dangerousPatterns = [
    /\$\{.*USER_INPUT.*\}/,
    /\$\{.*REQUEST.*\}/,
    /\$\{.*BODY.*\}/,
    /\$\{.*QUERY.*\}/,
    /\$\{.*(PASSWORD|TOKEN|KEY|SECRET).*\}/i
  ];

  private trustedDomains = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '*.internal',
    '*.local'
  ];

  analyzePatterns(patterns: TomlPattern[]): PatternSecurityResult {
    const securityIssues: SecurityIssue[] = [];
    const recommendations: string[] = [];

    for (const pattern of patterns) {
      // Check for dangerous environment variables
      for (const envVar of pattern.envVars) {
        if (this.isDangerousEnvVar(envVar)) {
          securityIssues.push({
            type: 'dangerous_env_var',
            pattern: pattern.pattern,
            keyPath: pattern.keyPath,
            severity: 'high',
            description: `Dangerous environment variable ${envVar} used in URL pattern`
          });
        }
      }

      // Check for untrusted domains
      const domain = this.extractDomain(pattern.pattern);
      if (domain && !this.isTrustedDomain(domain)) {
        securityIssues.push({
          type: 'untrusted_pattern',
          pattern: pattern.pattern,
          keyPath: pattern.keyPath,
          severity: 'medium',
          description: `Untrusted domain ${domain} in URL pattern`
        });
      }

      // Check for missing validation
      if (pattern.isDynamic && !this.hasValidationPattern(pattern.pattern)) {
        securityIssues.push({
          type: 'missing_validation',
          pattern: pattern.pattern,
          keyPath: pattern.keyPath,
          severity: 'low',
          description: 'Dynamic URL pattern lacks validation constraints'
        });
      }
    }

    // Generate recommendations
    if (securityIssues.length > 0) {
      recommendations.push('Review and fix security issues before deployment');
      recommendations.push('Consider using allowlist for external domains');
      recommendations.push('Add validation patterns for dynamic routes');
    }

    if (patterns.some(p => p.isDynamic)) {
      recommendations.push('Document environment variable requirements');
      recommendations.push('Consider runtime validation of dynamic URLs');
    }

    return {
      patterns,
      securityIssues,
      recommendations
    };
  }

  private isDangerousEnvVar(envVar: string): boolean {
    return this.dangerousPatterns.some(pattern => 
      pattern.test(`\${${envVar}}`)
    );
  }

  private extractDomain(pattern: string): string | null {
    const urlMatch = pattern.match(/https?:\/\/([^\/]+)/);
    return urlMatch ? urlMatch[1] : null;
  }

  private isTrustedDomain(domain: string): boolean {
    return this.trustedDomains.some(trusted => {
      if (trusted.startsWith('*.')) {
        return domain.endsWith(trusted.substring(1));
      }
      return domain === trusted;
    });
  }

  private hasValidationPattern(pattern: string): boolean {
    // Look for validation patterns like :param(\\d+) or {param:[a-z]+}
    return /:\w+\([^)]+\)|\{\w+:[^}]+\}/.test(pattern);
  }
}

export class URLPatternExtractor {
  private analyzer = new URLPatternSecurityAnalyzer();

  extractAndAnalyze(tomlContent: string, filePath: string): PatternSecurityResult {
    try {
      const parsed = parseToml(tomlContent);
      const patterns = extractURLPatternsFromToml(parsed, '', filePath);
      return this.analyzer.analyzePatterns(patterns);
    } catch (error) {
      return {
        patterns: [],
        securityIssues: [{
          type: 'untrusted_pattern',
          pattern: '',
          keyPath: '',
          severity: 'critical',
          description: `Failed to parse TOML: ${error.message}`
        }],
        recommendations: ['Fix TOML syntax errors before analysis']
      };
    }
  }

  generateSecurityReport(result: PatternSecurityResult): string {
    const lines: string[] = [];
    
    lines.push('# URLPattern Security Analysis Report');
    lines.push('');
    
    if (result.patterns.length === 0) {
      lines.push('✅ No URL patterns found in TOML file');
      return lines.join('\n');
    }

    lines.push(`## Patterns Found: ${result.patterns.length}`);
    lines.push('');
    
    for (const pattern of result.patterns) {
      lines.push(`### ${pattern.keyPath}`);
      lines.push(`- **Pattern**: \`${pattern.pattern}\``);
      lines.push(`- **Dynamic**: ${pattern.isDynamic ? 'Yes' : 'No'}`);
      lines.push(`- **Environment Variables**: ${pattern.envVars.join(', ') || 'None'}`);
      lines.push('');
    }

    if (result.securityIssues.length > 0) {
      lines.push('## Security Issues');
      lines.push('');
      
      for (const issue of result.securityIssues) {
        const emoji = this.getSeverityEmoji(issue.severity);
        lines.push(`### ${emoji} ${issue.type.replace('_', ' ').toUpperCase()}`);
        lines.push(`- **Pattern**: \`${issue.pattern}\``);
        lines.push(`- **Location**: \`${issue.keyPath}\``);
        lines.push(`- **Severity**: ${issue.severity.toUpperCase()}`);
        lines.push(`- **Description**: ${issue.description}`);
        lines.push('');
      }
    }

    if (result.recommendations.length > 0) {
      lines.push('## Recommendations');
      lines.push('');
      
      for (const recommendation of result.recommendations) {
        lines.push(`- ${recommendation}`);
      }
    }

    return lines.join('\n');
  }

  private getSeverityEmoji(severity: string): string {
    switch (severity) {
      case 'critical': return '🚨';
      case 'high': return '⚠️';
      case 'medium': return '⚡';
      case 'low': return 'ℹ️';
      default: return '❓';
    }
  }
}
