#!/usr/bin/env bun
/**
 * FactoryWager Configuration Validator v1.3.8
 * Comprehensive YAML validation with 5 security gates
 */

import { readFileSync } from 'fs';

interface ValidationResult {
  passed: boolean;
  gate: number;
  gateName: string;
  violations: Violation[];
  environment: string;
  hardeningLevel: string;
  riskScore: number;
}

interface Violation {
  line?: number;
  key: string;
  message: string;
  severity: 'error' | 'warning';
  suggestion?: string;
}

class FactoryWagerValidator {
  private content: string;
  private lines: string[];
  private environment: string;
  private strict: boolean;

  constructor(filePath: string, environment: string, strict: boolean = false) {
    this.content = readFileSync(filePath, 'utf8');
    this.lines = this.content.split('\n');
    this.environment = environment;
    this.strict = strict;
  }

  async validate(): Promise<ValidationResult> {
    console.log(`🔍 FactoryWager Configuration Validator`);
    console.log(`=======================================`);
    console.log(`Environment: ${this.environment}`);
    console.log(`Strict Mode: ${this.strict ? 'ENABLED' : 'DISABLED'}`);
    console.log('');

    const gates = [
      { name: 'Environment Variable Resolution', handler: () => this.gate1EnvironmentVars() },
      { name: 'Circular Reference Detection', handler: () => this.gate2CircularRefs() },
      { name: 'Secret Detection', handler: () => this.gate3SecretDetection() },
      { name: 'Hardening Level Verification', handler: () => this.gate4HardeningLevel() },
      { name: 'Anchor Resolution', handler: () => this.gate5AnchorResolution() }
    ];

    let allViolations: Violation[] = [];
    let failedGate = -1;
    let failedGateName = '';

    for (let i = 0; i < gates.length; i++) {
      const gate = gates[i];
      console.log(`📍 Gate ${i + 1}: ${gate.name}`);

      try {
        const violations = await gate.handler();

        if (violations.length > 0) {
          console.log(`   ❌ ${violations.length} violation(s) found`);
          violations.forEach(v => this.printViolation(v));
          allViolations.push(...violations);

          if (failedGate === -1) {
            failedGate = i + 1;
            failedGateName = gate.name;
          }
        } else {
          console.log(`   ✅ Passed`);
        }
      } catch (error) {
        const violation: Violation = {
          key: 'system',
          message: `Gate execution failed: ${(error as Error).message}`,
          severity: 'error'
        };
        allViolations.push(violation);
        if (failedGate === -1) {
          failedGate = i + 1;
          failedGateName = gate.name;
        }
      }
    }

    const passed = allViolations.length === 0 || (!this.strict && allViolations.every(v => v.severity === 'warning'));
    const hardeningLevel = this.determineHardeningLevel();
    const riskScore = this.calculateRiskScore(allViolations);

    console.log('');
    if (passed) {
      console.log(`✅ VALIDATION PASSED`);
      console.log(`Environment: ${this.environment}`);
      console.log(`Hardening Level: ${hardeningLevel} (confirmed)`);
      console.log(`Checks: 5/5 passed`);
      console.log(`Risk Score: ${riskScore}/100 (${this.getRiskLevel(riskScore)})`);
    } else {
      console.log(`❌ VALIDATION FAILED [Gate ${failedGate}: ${failedGateName}]`);
      console.log('');
      console.log(`Violations:`);
      allViolations.forEach(v => this.printViolation(v));
    }

    return {
      passed,
      gate: failedGate,
      gateName: failedGateName,
      violations: allViolations,
      environment: this.environment,
      hardeningLevel,
      riskScore
    };
  }

  private async gate1EnvironmentVars(): Promise<Violation[]> {
    const violations: Violation[] = [];
    const envVarPattern = /\$\{([^}]+)\}/g;
    let match;

    while ((match = envVarPattern.exec(this.content)) !== null) {
      const varName = match[1];
      const envValue = process.env[varName];

      if (!envValue || envValue.trim() === '') {
        const lineNum = this.getLineNumber(match.index);
        violations.push({
          line: lineNum,
          key: varName,
          message: `Environment variable ${varName} is not set or empty`,
          severity: 'error',
          suggestion: `Export ${varName} in your shell: export ${varName}="your-value"`
        });
      }
    }

    return violations;
  }

  private async gate2CircularRefs(): Promise<Violation[]> {
    const violations: Violation[] = [];
    const anchors = new Map<string, string>();
    const aliases = new Map<string, string[]>();

    // Extract anchors and aliases
    this.lines.forEach((line, index) => {
      const anchorMatch = line.match(/^(\s*)&(\w+)/);
      if (anchorMatch) {
        const anchorName = anchorMatch[2];
        anchors.set(anchorName, line);
      }

      const aliasMatch = line.match(/\*(\w+)/g);
      if (aliasMatch) {
        aliasMatch.forEach(alias => {
          const aliasName = alias.substring(1);
          if (!aliases.has(aliasName)) {
            aliases.set(aliasName, []);
          }
          aliases.get(aliasName)!.push(`Line ${index + 1}`);
        });
      }
    });

    // Check for dangling aliases
    for (const [aliasName, references] of aliases) {
      if (!anchors.has(aliasName)) {
        violations.push({
          key: aliasName,
          message: `Dangling alias *${aliasName} referenced in ${references.join(', ')}`,
          severity: 'error',
          suggestion: `Define anchor &${aliasName} or remove references`
        });
      }
    }

    // Simple circular reference detection
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    for (const aliasName of aliases.keys()) {
      if (this.hasCircularReference(aliasName, anchors, aliases, visited, recursionStack)) {
        violations.push({
          key: aliasName,
          message: `Circular reference detected involving *${aliasName}`,
          severity: 'error',
          suggestion: `Break the circular reference chain`
        });
      }
    }

    return violations;
  }

  private hasCircularReference(
    aliasName: string,
    anchors: Map<string, string>,
    aliases: Map<string, string[]>,
    visited: Set<string>,
    recursionStack: Set<string>
  ): boolean {
    if (recursionStack.has(aliasName)) return true;
    if (visited.has(aliasName)) return false;

    visited.add(aliasName);
    recursionStack.add(aliasName);

    const anchorLine = anchors.get(aliasName);
    if (anchorLine) {
      const aliasMatches = anchorLine.match(/\*(\w+)/g);
      if (aliasMatches) {
        for (const match of aliasMatches) {
          const refAlias = match.substring(1);
          if (this.hasCircularReference(refAlias, anchors, aliases, visited, recursionStack)) {
            return true;
          }
        }
      }
    }

    recursionStack.delete(aliasName);
    return false;
  }

  private async gate3SecretDetection(): Promise<Violation[]> {
    const violations: Violation[] = [];

    // Skip for development environment
    if (this.environment === 'development') {
      return violations;
    }

    // Secret detection patterns
    const secretPatterns = [
      { pattern: /password\s*[:=]\s*["'][^"']+["']/i, type: 'password' },
      { pattern: /secret\s*[:=]\s*["'][^"']+["']/i, type: 'secret' },
      { pattern: /key\s*[:=]\s*["'][^"']+["']/i, type: 'key' },
      { pattern: /token\s*[:=]\s*["'][^"']+["']/i, type: 'token' },
      { pattern: /api[_-]?key\s*[:=]\s*["'][^"']+["']/i, type: 'api_key' },
      { pattern: /demo-[a-z-]+-[a-f0-9]+/i, type: 'demo_secret' }
    ];

    this.lines.forEach((line, index) => {
      // Skip environment variable interpolations
      if (line.includes('${')) return;

      secretPatterns.forEach(({ pattern, type }) => {
        const match = line.match(pattern);
        if (match) {
          violations.push({
            line: index + 1,
            key: match[0].split(/[=:]/)[0].trim(),
            message: `Hardcoded ${type.replace('_', ' ')} found in ${this.environment} environment`,
            severity: 'error',
            suggestion: `Replace with environment variable interpolation: ${type.toUpperCase()}`
          });
        }
      });
    });

    return violations;
  }

  private async gate4HardeningLevel(): Promise<Violation[]> {
    const violations: Violation[] = [];
    const expectedLevels = {
      development: 'any',
      staging: 'staging',
      production: 'production'
    };

    const detectedLevel = this.determineHardeningLevel();
    const expectedLevel = expectedLevels[this.environment as keyof typeof expectedLevels];

    if (expectedLevel !== 'any' && detectedLevel !== expectedLevel) {
      violations.push({
        key: 'hardening_level',
        message: `Hardening level mismatch: expected '${expectedLevel}', detected '${detectedLevel}'`,
        severity: 'error',
        suggestion: `Add environment-specific security configurations for ${this.environment}`
      });
    }

    return violations;
  }

  private async gate5AnchorResolution(): Promise<Violation[]> {
    const violations: Violation[] = [];
    const anchors = new Set<string>();
    const aliases = new Set<string>();

    // Extract anchors
    this.lines.forEach(line => {
      const anchorMatch = line.match(/^(\s*)&(\w+)/);
      if (anchorMatch) {
        anchors.add(anchorMatch[2]);
      }

      const aliasMatches = line.match(/\*(\w+)/g);
      if (aliasMatches) {
        aliasMatches.forEach(alias => {
          aliases.add(alias.substring(1));
        });
      }
    });

    // Check for undefined anchors
    for (const alias of aliases) {
      if (!anchors.has(alias)) {
        violations.push({
          key: alias,
          message: `Undefined anchor &${alias} referenced`,
          severity: 'error',
          suggestion: `Define anchor &${alias} or remove *${alias} reference`
        });
      }
    }

    return violations;
  }

  private determineHardeningLevel(): string {
    // Simple hardening level detection based on content
    const content = this.content.toLowerCase();
    if (content.includes('production') || content.includes('prod')) {
      return 'production';
    } else if (content.includes('staging') || content.includes('stage')) {
      return 'staging';
    } else {
      return 'development';
    }
  }

  private calculateRiskScore(violations: Violation[]): number {
    let score = 0;
    violations.forEach(v => {
      score += v.severity === 'error' ? 20 : 5;
    });
    return Math.min(score, 100);
  }

  private getRiskLevel(score: number): string {
    if (score >= 70) return 'high';
    if (score >= 40) return 'medium';
    return 'low';
  }

  private getLineNumber(index: number): number {
    const beforeIndex = this.content.substring(0, index);
    return beforeIndex.split('\n').length;
  }

  private printViolation(violation: Violation): void {
    const location = violation.line ? `Line ${violation.line}: ` : '';
    const icon = violation.severity === 'error' ? '❌' : '⚠️';
    console.log(`   ${icon} ${location}${violation.key} = ${violation.message}`);
    if (violation.suggestion) {
      console.log(`      💡 Suggestion: ${violation.suggestion}`);
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const fileIndex = args.findIndex(arg => !arg.startsWith('--'));

  if (fileIndex === -1) {
    console.error('❌ Usage: fw-validate <file> --env=<environment> [--strict]');
    process.exit(127);
  }

  const filePath = args[fileIndex];
  const envFlag = args.find(arg => arg.startsWith('--env='));
  const strictFlag = args.includes('--strict');

  if (!envFlag) {
    console.error('❌ Environment required: --env=<development|staging|production>');
    process.exit(127);
  }

  const environment = envFlag.split('=')[1];
  const strict = strictFlag;

  try {
    const validator = new FactoryWagerValidator(filePath, environment, strict);
    const result = await validator.validate();

    // Audit logging
    const auditLog = `[${new Date().toISOString()}] fw-validate ${filePath} --env=${environment} gates=${result.passed ? '5' : '4'}/5 exit=${result.passed ? '0' : '1'}\n`;
    await Bun.write(Bun.file('./.factory-wager/audit.log'), auditLog);

    process.exit(result.passed ? 0 : 1);
  } catch (error) {
    console.error(`❌ Validation failed: ${(error as Error).message}`);
    process.exit(2);
  }
}

if (import.meta.main) {
  main();
}
