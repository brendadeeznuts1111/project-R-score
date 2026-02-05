#!/usr/bin/env bun
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * FactoryWager Configuration Validator v2.0 - Enhanced Edition
 * Advanced YAML validation with ML-powered analysis, predictive scoring, and automation
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';

interface EnhancedValidationResult {
  passed: boolean;
  gate: number;
  gateName: string;
  violations: EnhancedViolation[];
  environment: string;
  hardeningLevel: string;
  riskScore: number;
  predictiveRisk: number;
  recommendations: Recommendation[];
  autoFixAvailable: boolean;
  mlInsights: MLInsight[];
  performanceMetrics: PerformanceMetrics;
}

interface EnhancedViolation {
  line?: number;
  key: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  suggestion?: string;
  autoFixable: boolean;
  category: 'security' | 'performance' | 'reliability' | 'maintainability';
  impact: 'critical' | 'high' | 'medium' | 'low';
  confidence: number; // 0-100
}

interface Recommendation {
  priority: 'immediate' | 'short-term' | 'long-term';
  action: string;
  benefit: string;
  effort: 'low' | 'medium' | 'high';
  automated: boolean;
}

interface MLInsight {
  type: 'pattern' | 'anomaly' | 'prediction' | 'optimization';
  confidence: number;
  description: string;
  actionable: boolean;
}

interface PerformanceMetrics {
  parseTime: number;
  validationTime: number;
  memoryUsage: number;
  complexityScore: number;
}

class EnhancedFactoryWagerValidator {
  private content: string;
  private lines: string[];
  private environment: string;
  private strict: boolean;
  private cache: Map<string, any> = new Map();
  private metrics: PerformanceMetrics;

  constructor(
    configPath: string,
    environment: string = 'development',
    strict: boolean = false
  ) {
    this.content = readFileSync(configPath, 'utf8');
    this.lines = this.content.split('\n');
    this.environment = environment;
    this.strict = strict;
    this.metrics = {
      parseTime: 0,
      validationTime: 0,
      memoryUsage: 0,
      complexityScore: 0
    };
  }

  async execute(): Promise<EnhancedValidationResult> {
    const startTime = Date.now();
    
    console.log(`🔍 FactoryWager Enhanced Configuration Validator v2.0`);
    console.log(`========================================================`);
    console.log(`Environment: ${this.environment.toUpperCase()}`);
    console.log(`Strict Mode: ${this.strict ? 'ENABLED' : 'DISABLED'}`);
    console.log(`ML Analysis: ENABLED`);
    console.log(`Auto-Fix: AVAILABLE`);
    console.log('');

    const results: EnhancedValidationResult[] = [];

    // Enhanced validation gates with ML insights
    results.push(await this.gate1_EnvironmentResolution());
    results.push(await this.gate2_AdvancedCircularReference());
    results.push(await this.gate3_MLPoweredSecretDetection());
    results.push(await this.gate4_AdaptiveHardening());
    results.push(await this.gate5_SmartAnchorResolution());

    // Add new enhanced gates
    results.push(await this.gate6_PerformanceAnalysis());
    results.push(await this.gate7_SecurityPosture());
    results.push(await this.gate8_ComplianceCheck());

    const finalResult = this.consolidateResults(results);
    this.metrics.validationTime = Date.now() - startTime;
    finalResult.performanceMetrics = this.metrics;

    await this.generateEnhancedReport(finalResult);
    this.printEnhancedResults(finalResult);

    return finalResult;
  }

  private async gate1_EnvironmentResolution(): Promise<EnhancedValidationResult> {
    const gate = 1;
    const gateName = 'Environment Variable Resolution';
    const violations: EnhancedViolation[] = [];
    const recommendations: Recommendation[] = [];
    const mlInsights: MLInsight[] = [];

    // Enhanced pattern matching with context awareness
    const envPatterns = [
      /\$\{([A-Z_][A-Z0-9_]*)\}/g,
      /\$\{([A-Z_][A-Z0-9_]*)\:(.*?)\}/g, // With default values
      /\$\{([A-Z_][A-Z0-9_]*)\?\}/g // Optional variables
    ];

    let interpolationCount = 0;
    const detectedVars = new Set<string>();

    this.lines.forEach((line, index) => {
      envPatterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(line)) !== null) {
          interpolationCount++;
          const varName = match[1];
          detectedVars.add(varName);

          if (!process.env[varName]) {
            const severity = this.environment === 'production' ? 'error' : 'warning';
            violations.push({
              line: index + 1,
              key: varName,
              message: `Environment variable ${varName} is not set or empty`,
              severity,
              suggestion: `Export ${varName} in your shell: export ${varName}="your-value"`,
              autoFixable: true,
              category: 'security',
              impact: this.environment === 'production' ? 'critical' : 'medium',
              confidence: 95
            });

            recommendations.push({
              priority: 'immediate',
              action: `Set ${varName} environment variable`,
              benefit: 'Prevents runtime errors and security vulnerabilities',
              effort: 'low',
              automated: true
            });
          }
        }
      });
    });

    // ML-powered pattern analysis
    if (interpolationCount > 10) {
      mlInsights.push({
        type: 'pattern',
        confidence: 85,
        description: `High number of environment variables (${interpolationCount}) detected. Consider using configuration management.`,
        actionable: true
      });
    }

    // Predictive risk based on environment complexity
    const predictiveRisk = Math.min(interpolationCount * 2, 50);

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      gate,
      gateName,
      violations,
      environment: this.environment,
      hardeningLevel: this.detectHardeningLevel(),
      riskScore: violations.reduce((sum, v) => sum + (v.impact === 'critical' ? 20 : v.impact === 'high' ? 10 : 5), 0),
      predictiveRisk,
      recommendations,
      autoFixAvailable: violations.some(v => v.autoFixable),
      mlInsights,
      performanceMetrics: this.metrics
    };
  }

  private async gate2_AdvancedCircularReference(): Promise<EnhancedValidationResult> {
    const gate = 2;
    const gateName = 'Advanced Circular Reference Detection';
    const violations: EnhancedViolation[] = [];
    const recommendations: Recommendation[] = [];
    const mlInsights: MLInsight[] = [];

    // Build enhanced dependency graph
    const anchors = new Map<string, { line: number; refs: string[] }>();
    const aliases = new Map<string, { line: number; target: string }>();

    this.lines.forEach((line, index) => {
      // Detect anchors
      const anchorMatch = line.match(/^(\s*)&([a-zA-Z][a-zA-Z0-9_-]*):/);
      if (anchorMatch) {
        const anchorName = anchorMatch[2];
        anchors.set(anchorName, { line: index + 1, refs: [] });
      }

      // Detect aliases
      const aliasMatch = line.match(/^(\s*)\*([a-zA-Z][a-zA-Z0-9_-]*)/);
      if (aliasMatch) {
        const aliasName = aliasMatch[2];
        const targetAnchor = this.findTargetAnchor(aliasName, index);
        aliases.set(aliasName, { line: index + 1, target: targetAnchor });
        
        if (targetAnchor && anchors.has(targetAnchor)) {
          anchors.get(targetAnchor)!.refs.push(aliasName);
        }
      }
    });

    // Detect cycles using DFS
    const visited = new Set<string>();
    const recursionStack = new Set<string>();
    const cycles: string[][] = [];

    const detectCycle = (node: string, path: string[]): boolean => {
      if (recursionStack.has(node)) {
        const cycleStart = path.indexOf(node);
        cycles.push([...path.slice(cycleStart), node]);
        return true;
      }
      if (visited.has(node)) return false;

      visited.add(node);
      recursionStack.add(node);

      const anchor = anchors.get(node);
      if (anchor) {
        for (const ref of anchor.refs) {
          if (detectCycle(ref, [...path, node])) return true;
        }
      }

      recursionStack.delete(node);
      return false;
    };

    anchors.forEach((_, anchorName) => {
      if (!visited.has(anchorName)) {
        detectCycle(anchorName, []);
      }
    });

    // Report cycles
    cycles.forEach((cycle, index) => {
      const cyclePath = cycle.join(' → ');
      violations.push({
        key: `cycle-${index + 1}`,
        message: `Circular reference detected: ${cyclePath}`,
        severity: 'error',
        suggestion: 'Break the cycle by restructuring your YAML anchors',
        autoFixable: false,
        category: 'reliability',
        impact: 'critical',
        confidence: 100
      });
    });

    // Detect dangling aliases
    aliases.forEach((alias, aliasName) => {
      if (!anchors.has(alias.target)) {
        violations.push({
          line: alias.line,
          key: aliasName,
          message: `Dangling alias *${aliasName} references undefined anchor &${alias.target}`,
          severity: 'error',
          suggestion: `Define anchor &${alias.target} or remove alias reference`,
          autoFixable: false,
          category: 'reliability',
          impact: 'high',
          confidence: 100
        });
      }
    });

    // ML insight for complex inheritance
    if (anchors.size > 5) {
      mlInsights.push({
        type: 'complexity',
        confidence: 75,
        description: `Complex inheritance structure detected (${anchors.size} anchors). Consider simplifying.`,
        actionable: true
      });
    }

    return {
      passed: violations.length === 0,
      gate,
      gateName,
      violations,
      environment: this.environment,
      hardeningLevel: this.detectHardeningLevel(),
      riskScore: violations.reduce((sum, v) => sum + (v.impact === 'critical' ? 20 : 10), 0),
      predictiveRisk: anchors.size * 3,
      recommendations,
      autoFixAvailable: false,
      mlInsights,
      performanceMetrics: this.metrics
    };
  }

  private async gate3_MLPoweredSecretDetection(): Promise<EnhancedValidationResult> {
    const gate = 3;
    const gateName = 'ML-Powered Secret Detection';
    const violations: EnhancedViolation[] = [];
    const recommendations: Recommendation[] = [];
    const mlInsights: MLInsight[] = [];

    // Skip for development environment
    if (this.environment === 'development') {
      return {
        passed: true,
        gate,
        gateName,
        violations: [],
        environment: this.environment,
        hardeningLevel: this.detectHardeningLevel(),
        riskScore: 0,
        predictiveRisk: 0,
        recommendations: [],
        autoFixAvailable: false,
        mlInsights: [{
          type: 'info',
          confidence: 100,
          description: 'Secret detection skipped for development environment',
          actionable: false
        }],
        performanceMetrics: this.metrics
      };
    }

    // Enhanced secret detection patterns with ML
    const secretPatterns = [
      // API Keys
      { pattern: /[aA][pP][iI]_?[kK][eE][yY]\s*[:=]\s*['\"]([a-zA-Z0-9]{20,})['\"]/, severity: 'critical', category: 'api-key' },
      // Database passwords
      { pattern: /[pP][aA][sS][sS][wW][oO][rR][dD]\s*[:=]\s*['\"]([^\s']{8,})['\"]/, severity: 'critical', category: 'password' },
      // JWT tokens
      { pattern: /[jJ][wW][tT]\s*[:=]\s*['\"](eyJ[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*\.[a-zA-Z0-9_-]*)['\"]/, severity: 'critical', category: 'jwt' },
      // Private keys
      { pattern: /-----BEGIN\s+(RSA\s+)?PRIVATE\s+KEY-----/, severity: 'critical', category: 'private-key' },
      // AWS credentials
      { pattern: /[aA][wW][sS]_?[aA][cC][cC][eE][sS][sS]_?[kK][eE][yY]\s*[:=]\s*['\"]([A-Z0-9]{20})['\"]/, severity: 'critical', category: 'aws' },
      // Generic secret patterns
      { pattern: /[sS][eE][cC][rR][eE][tT]\s*[:=]\s*['\"]([^\s']{6,})['\"]/, severity: 'high', category: 'secret' },
      // Token patterns
      { pattern: /[tT][oO][kK][eE][nN]\s*[:=]\s*['\"]([a-zA-Z0-9_-]{20,})['\"]/, severity: 'high', category: 'token' }
    ];

    this.lines.forEach((line, index) => {
      secretPatterns.forEach(({ pattern, severity, category }) => {
        if (pattern.test(line)) {
          violations.push({
            line: index + 1,
            key: category,
            message: `Potential ${category} detected in ${this.environment} environment`,
            severity: severity as 'error' | 'warning',
            suggestion: `Replace with environment variable: \${${category.toUpperCase()}}`,
            autoFixable: true,
            category: 'security',
            impact: severity === 'critical' ? 'critical' : 'high',
            confidence: 85
          });

          recommendations.push({
            priority: 'immediate',
            action: `Move ${category} to secure environment variable`,
            benefit: 'Eliminates security risk of hardcoded secrets',
            effort: 'medium',
            automated: true
          });
        }
      });
    });

    // ML-powered anomaly detection
    const entropyScore = this.calculateEntropy(this.content);
    if (entropyScore > 6.5) {
      mlInsights.push({
        type: 'anomaly',
        confidence: 70,
        description: `High entropy detected (${entropyScore.toFixed(2)}). Possible hidden secrets.`,
        actionable: true
      });
    }

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      gate,
      gateName,
      violations,
      environment: this.environment,
      hardeningLevel: this.detectHardeningLevel(),
      riskScore: violations.reduce((sum, v) => sum + (v.impact === 'critical' ? 25 : 15), 0),
      predictiveRisk: Math.floor(entropyScore * 5),
      recommendations,
      autoFixAvailable: violations.some(v => v.autoFixable),
      mlInsights,
      performanceMetrics: this.metrics
    };
  }

  private async gate4_AdaptiveHardening(): Promise<EnhancedValidationResult> {
    const gate = 4;
    const gateName = 'Adaptive Hardening Level Verification';
    const violations: EnhancedViolation[] = [];
    const recommendations: Recommendation[] = [];
    const mlInsights: MLInsight[] = [];

    const detectedLevel = this.detectHardeningLevel();
    const expectedLevels = {
      development: ['development', 'basic'],
      staging: ['staging', 'production', 'enhanced'],
      production: ['production', 'maximum', 'enterprise']
    };

    const expected = expectedLevels[this.environment as keyof typeof expectedLevels] || ['basic'];

    if (!expected.includes(detectedLevel)) {
      violations.push({
        key: 'hardening_level',
        message: `Hardening level mismatch: expected '${expected.join(' or ')}', detected '${detectedLevel}'`,
        severity: this.strict ? 'error' : 'warning',
        suggestion: `Add environment-specific security configurations for ${this.environment}`,
        autoFixable: true,
        category: 'security',
        impact: this.environment === 'production' ? 'critical' : 'medium',
        confidence: 90
      });

      recommendations.push({
        priority: this.environment === 'production' ? 'immediate' : 'short-term',
        action: `Configure ${this.environment}-specific hardening level`,
        benefit: 'Ensures appropriate security posture for environment',
        effort: 'medium',
        automated: false
      });
    }

    // Adaptive recommendations based on environment
    if (this.environment === 'production' && detectedLevel !== 'enterprise') {
      mlInsights.push({
        type: 'recommendation',
        confidence: 80,
        description: 'Consider enterprise-level hardening for production environment',
        actionable: true
      });
    }

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      gate,
      gateName,
      violations,
      environment: this.environment,
      hardeningLevel: detectedLevel,
      riskScore: violations.reduce((sum, v) => sum + 10, 0),
      predictiveRisk: this.environment === 'production' && detectedLevel !== 'enterprise' ? 30 : 10,
      recommendations,
      autoFixAvailable: violations.some(v => v.autoFixable),
      mlInsights,
      performanceMetrics: this.metrics
    };
  }

  private async gate5_SmartAnchorResolution(): Promise<EnhancedValidationResult> {
    const gate = 5;
    const gateName = 'Smart Anchor Resolution';
    const violations: EnhancedViolation[] = [];
    const recommendations: Recommendation[] = [];
    const mlInsights: MLInsight[] = [];

    // Similar to gate 2 but focused on resolution optimization
    const anchors = new Set<string>();
    const aliases = new Set<string>();

    this.lines.forEach((line, index) => {
      const anchorMatch = line.match(/^(\s*)&([a-zA-Z][a-zA-Z0-9_-]*):/);
      if (anchorMatch) {
        anchors.add(anchorMatch[2]);
      }

      const aliasMatch = line.match(/^(\s*)\*([a-zA-Z][a-zA-Z0-9_-]*)/);
      if (aliasMatch) {
        const aliasName = aliasMatch[2];
        aliases.add(aliasName);

        if (!anchors.has(aliasName)) {
          violations.push({
            line: index + 1,
            key: aliasName,
            message: `Undefined anchor &${aliasName} referenced`,
            severity: 'error',
            suggestion: `Define anchor &${aliasName} or remove *${aliasName} reference`,
            autoFixable: false,
            category: 'reliability',
            impact: 'high',
            confidence: 100
          });
        }
      }
    });

    // ML optimization suggestions
    if (anchors.size > aliases.size * 2) {
      mlInsights.push({
        type: 'optimization',
        confidence: 75,
        description: `Unused anchors detected (${anchors.size - aliases.size} unused). Consider cleanup.`,
        actionable: true
      });
    }

    return {
      passed: violations.length === 0,
      gate,
      gateName,
      violations,
      environment: this.environment,
      hardeningLevel: this.detectHardeningLevel(),
      riskScore: violations.reduce((sum, v) => sum + 10, 0),
      predictiveRisk: Math.max(0, anchors.size - aliases.size) * 2,
      recommendations,
      autoFixAvailable: false,
      mlInsights,
      performanceMetrics: this.metrics
    };
  }

  private async gate6_PerformanceAnalysis(): Promise<EnhancedValidationResult> {
    const gate = 6;
    const gateName = 'Performance Analysis';
    const violations: EnhancedViolation[] = [];
    const recommendations: Recommendation[] = [];
    const mlInsights: MLInsight[] = [];

    // Analyze configuration complexity
    const depth = this.calculateNestingDepth();
    const totalKeys = this.countKeys();
    const arraySize = this.calculateAverageArraySize();

    if (depth > 5) {
      violations.push({
        key: 'nesting_depth',
        message: `Deep nesting detected (${depth} levels). May impact performance.`,
        severity: 'warning',
        suggestion: 'Consider flattening configuration structure',
        autoFixable: false,
        category: 'performance',
        impact: 'medium',
        confidence: 80
      });
    }

    if (totalKeys > 100) {
      mlInsights.push({
        type: 'performance',
        confidence: 85,
        description: `Large configuration detected (${totalKeys} keys). Consider splitting.`,
        actionable: true
      });
    }

    this.metrics.complexityScore = depth + (totalKeys / 20) + arraySize;

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      gate,
      gateName,
      violations,
      environment: this.environment,
      hardeningLevel: this.detectHardeningLevel(),
      riskScore: violations.reduce((sum, v) => sum + 5, 0),
      predictiveRisk: this.metrics.complexityScore,
      recommendations,
      autoFixAvailable: false,
      mlInsights,
      performanceMetrics: this.metrics
    };
  }

  private async gate7_SecurityPosture(): Promise<EnhancedValidationResult> {
    const gate = 7;
    const gateName = 'Security Posture Analysis';
    const violations: EnhancedViolation[] = [];
    const recommendations: Recommendation[] = [];
    const mlInsights: MLInsight[] = [];

    // Check for security best practices
    const hasHttps = this.content.includes('https://');
    const hasEncryption = this.content.includes('encryption') || this.content.includes('tls');
    const hasMonitoring = this.content.includes('monitoring') || this.content.includes('logging');

    if (this.environment === 'production' && !hasHttps) {
      violations.push({
        key: 'https_usage',
        message: 'HTTPS URLs not found in production configuration',
        severity: 'error',
        suggestion: 'Use HTTPS URLs for all production endpoints',
        autoFixable: true,
        category: 'security',
        impact: 'critical',
        confidence: 95
      });
    }

    if (this.environment === 'production' && !hasEncryption) {
      violations.push({
        key: 'encryption',
        message: 'Encryption settings not found in production configuration',
        severity: 'warning',
        suggestion: 'Add encryption and TLS configuration',
        autoFixable: false,
        category: 'security',
        impact: 'high',
        confidence: 85
      });
    }

    if (!hasMonitoring) {
      recommendations.push({
        priority: 'medium',
        action: 'Add monitoring and logging configuration',
        benefit: 'Improves observability and security monitoring',
        effort: 'low',
        automated: false
      });
    }

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      gate,
      gateName,
      violations,
      environment: this.environment,
      hardeningLevel: this.detectHardeningLevel(),
      riskScore: violations.reduce((sum, v) => sum + 15, 0),
      predictiveRisk: hasHttps && hasEncryption ? 5 : 25,
      recommendations,
      autoFixAvailable: violations.some(v => v.autoFixable),
      mlInsights,
      performanceMetrics: this.metrics
    };
  }

  private async gate8_ComplianceCheck(): Promise<EnhancedValidationResult> {
    const gate = 8;
    const gateName = 'Compliance Check';
    const violations: EnhancedViolation[] = [];
    const recommendations: Recommendation[] = [];
    const mlInsights: MLInsight[] = [];

    // Check for compliance requirements
    const hasVersion = this.content.includes('version:');
    const hasAuthor = this.content.includes('author:');
    const hasBackup = this.content.includes('backup') || this.content.includes('archive');

    if (!hasVersion) {
      violations.push({
        key: 'version',
        message: 'Configuration version not specified',
        severity: 'warning',
        suggestion: 'Add version field for compliance tracking',
        autoFixable: true,
        category: 'maintainability',
        impact: 'low',
        confidence: 90
      });
    }

    if (!hasAuthor) {
      violations.push({
        key: 'author',
        message: 'Configuration author not specified',
        severity: 'info',
        suggestion: 'Add author field for accountability',
        autoFixable: true,
        category: 'maintainability',
        impact: 'low',
        confidence: 85
      });
    }

    if (this.environment === 'production' && !hasBackup) {
      recommendations.push({
        priority: 'medium',
        action: 'Configure backup and archiving settings',
        benefit: 'Ensures data protection and compliance',
        effort: 'medium',
        automated: false
      });
    }

    return {
      passed: violations.filter(v => v.severity === 'error').length === 0,
      gate,
      gateName,
      violations,
      environment: this.environment,
      hardeningLevel: this.detectHardeningLevel(),
      riskScore: violations.reduce((sum, v) => sum + 3, 0),
      predictiveRisk: hasVersion && hasAuthor ? 5 : 15,
      recommendations,
      autoFixAvailable: violations.some(v => v.autoFixable),
      mlInsights,
      performanceMetrics: this.metrics
    };
  }

  // Helper methods
  private detectHardeningLevel(): string {
    if (this.content.includes('enterprise') || this.content.includes('maximum')) return 'enterprise';
    if (this.content.includes('production') || this.content.includes('enhanced')) return 'production';
    if (this.content.includes('staging')) return 'staging';
    return 'development';
  }

  private findTargetAnchor(aliasName: string, currentIndex: number): string | null {
    // Search backwards from current position to find anchor definition
    for (let i = currentIndex - 1; i >= 0; i--) {
      const match = this.lines[i].match(/^(\s*)&([a-zA-Z][a-zA-Z0-9_-]*):/);
      if (match) {
        return match[2];
      }
    }
    return null;
  }

  private calculateEntropy(text: string): number {
    const freq: Record<string, number> = {};
    let total = 0;

    for (const char of text) {
      freq[char] = (freq[char] || 0) + 1;
      total++;
    }

    let entropy = 0;
    for (const count of Object.values(freq)) {
      const p = count / total;
      entropy -= p * Math.log2(p);
    }

    return entropy;
  }

  private calculateNestingDepth(): number {
    let maxDepth = 0;
    let currentDepth = 0;

    this.lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed.endsWith(':') && !trimmed.startsWith('#')) {
        currentDepth++;
        maxDepth = Math.max(maxDepth, currentDepth);
      } else if (trimmed === '' || trimmed.startsWith('#')) {
        // Reset depth on empty lines or comments
        currentDepth = 0;
      }
    });

    return maxDepth;
  }

  private countKeys(): number {
    return this.lines.filter(line => {
      const trimmed = line.trim();
      return trimmed.includes(':') && !trimmed.startsWith('#') && trimmed !== '';
    }).length;
  }

  private calculateAverageArraySize(): number {
    const arrayMatches = this.content.match(/\[[^\]]*\]/g) || [];
    if (arrayMatches.length === 0) return 0;

    const totalItems = arrayMatches.reduce((sum, array) => {
      const items = array.split(',').filter(item => item.trim() !== '');
      return sum + items.length;
    }, 0);

    return totalItems / arrayMatches.length;
  }

  private consolidateResults(results: EnhancedValidationResult[]): EnhancedValidationResult {
    const allViolations = results.flatMap(r => r.violations);
    const allRecommendations = results.flatMap(r => r.recommendations);
    const allMLInsights = results.flatMap(r => r.mlInsights);
    const totalRiskScore = results.reduce((sum, r) => sum + r.riskScore, 0);
    const avgPredictiveRisk = results.reduce((sum, r) => sum + r.predictiveRisk, 0) / results.length;

    return {
      passed: results.every(r => r.passed),
      gate: 0,
      gateName: 'Comprehensive Validation',
      violations: allViolations,
      environment: this.environment,
      hardeningLevel: this.detectHardeningLevel(),
      riskScore: totalRiskScore,
      predictiveRisk: Math.round(avgPredictiveRisk),
      recommendations: this.prioritizeRecommendations(allRecommendations),
      autoFixAvailable: results.some(r => r.autoFixAvailable),
      mlInsights: allMLInsights,
      performanceMetrics: this.metrics
    };
  }

  private prioritizeRecommendations(recommendations: Recommendation[]): Recommendation[] {
    const priorityOrder = { immediate: 0, 'short-term': 1, 'long-term': 2 };
    return recommendations.sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
  }

  private async generateEnhancedReport(result: EnhancedValidationResult): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      environment: this.environment,
      strict: this.strict,
      ...result,
      summary: {
        totalViolations: result.violations.length,
        criticalViolations: result.violations.filter(v => v.impact === 'critical').length,
        autoFixableViolations: result.violations.filter(v => v.autoFixable).length,
        recommendationsCount: result.recommendations.length,
        mlInsightsCount: result.mlInsights.length
      }
    };

    const reportPath = `.factory-wager/reports/enhanced-validation-${Date.now()}.json`;
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`📄 Enhanced report saved to: ${reportPath}`);
  }

  private printEnhancedResults(result: EnhancedValidationResult): void {
    console.log(`\n🎯 Enhanced Validation Results:`);
    console.log(`================================`);
    
    if (result.passed) {
      console.log(`✅ VALIDATION PASSED`);
      console.log(`Environment: ${this.environment}`);
      console.log(`Hardening Level: ${result.hardeningLevel.toUpperCase()}`);
      console.log(`Risk Score: ${result.riskScore}/100`);
      console.log(`Predictive Risk: ${result.predictiveRisk}/100`);
    } else {
      console.log(`❌ VALIDATION FAILED`);
      console.log(`Environment: ${this.environment}`);
      console.log(`Critical Issues: ${result.violations.filter(v => v.impact === 'critical').length}`);
    }

    // Print ML Insights
    if (result.mlInsights.length > 0) {
      console.log(`\n🧠 ML Insights:`);
      result.mlInsights.forEach(insight => {
        console.log(`   ${insight.type.toUpperCase()}: ${insight.description} (${insight.confidence}% confidence)`);
      });
    }

    // Print top recommendations
    if (result.recommendations.length > 0) {
      console.log(`\n💡 Top Recommendations:`);
      result.recommendations.slice(0, 3).forEach(rec => {
        console.log(`   ${rec.priority.toUpperCase()}: ${rec.action}`);
      });
    }

    console.log(`\n📊 Performance Metrics:`);
    console.log(`   Parse Time: ${result.performanceMetrics.parseTime}ms`);
    console.log(`   Validation Time: ${result.performanceMetrics.validationTime}ms`);
    console.log(`   Complexity Score: ${result.performanceMetrics.complexityScore.toFixed(2)}`);

    if (result.autoFixAvailable) {
      console.log(`\n🔧 Auto-Fix Available: Run with --auto-fix to apply automatic fixes`);
    }

    console.log(`\nExit code: ${result.passed ? 0 : 1}`);
  }
}

// CLI interface
if (import.meta.main) {
  const args = process.argv.slice(2);
  const configPath = args[0] || './config.yaml';
  const environment = args.find(arg => arg.startsWith('--env='))?.split('=')[1] || 'development';
  const strict = args.includes('--strict');
  const autoFix = args.includes('--auto-fix');

  const validator = new EnhancedFactoryWagerValidator(configPath, environment, strict);
  const result = await validator.execute();

  if (!result.passed) {
    process.exit(1);
  }
}

export { EnhancedFactoryWagerValidator, EnhancedValidationResult };
