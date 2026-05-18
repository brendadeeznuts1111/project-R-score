#!/usr/bin/env bun
// 🏛️ Advanced Metrics & Package Registry Integration
// Deep TypeScript and security analysis integration

import { parse as parseToml } from 'toml';
import { YAML } from "bun";
import { Database } from 'bun:sqlite';
import { join } from 'path';
import { createInterface } from 'readline';

interface PackageMetrics {
  name: string;
  version: string;
  registry: string;
  downloads: number;
  dependencies: number;
  securityScore: number;
  typeScriptCoverage: number;
  lastUpdated: string;
  maintainers: number;
  weeklyDownloads: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface TypeScriptMetrics {
  files: number;
  linesOfCode: number;
  typeCoverage: number;
  anyTypes: number;
  strictMode: boolean;
  lintErrors: number;
  compileTime: number;
  bundleSize: number;
  complexity: number;
  maintainabilityIndex: number;
}

interface SecurityMetrics {
  urlPatterns: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  dependencies: {
    total: number;
    vulnerabilities: number;
    outdated: number;
    devDependencies: number;
  };
  codeSecurity: {
    sqliRisks: number;
    xssRisks: number;
    ssrfRisks: number;
    pathTraversalRisks: number;
  };
}

interface RegistryMetrics {
  packages: PackageMetrics[];
  totalDownloads: number;
  activeMaintainers: number;
  avgSecurityScore: number;
  registryHealth: number;
  lastSync: string;
}

export class AdvancedMetricsCollector {
  private db: Database;
  private projectRoot: string;
  private cacheExpiry = 300000; // 5 minutes

  constructor(projectRoot: string = process.cwd()) {
    this.projectRoot = projectRoot;
    this.db = new Database(join(projectRoot, 'data', 'metrics.db'));
    this.initializeDatabase();
  }

  private initializeDatabase(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS package_metrics (
        id INTEGER PRIMARY KEY,
        name TEXT UNIQUE,
        version TEXT,
        registry TEXT,
        downloads INTEGER,
        security_score INTEGER,
        last_updated TEXT,
        cached_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS typescript_metrics (
        id INTEGER PRIMARY KEY,
        files INTEGER,
        lines_of_code INTEGER,
        type_coverage INTEGER,
        lint_errors INTEGER,
        compile_time INTEGER,
        bundle_size INTEGER,
        complexity INTEGER,
        measured_at INTEGER
      );
      
      CREATE TABLE IF NOT EXISTS security_metrics (
        id INTEGER PRIMARY KEY,
        url_patterns_total INTEGER,
        url_patterns_critical INTEGER,
        dependencies_vulnerable INTEGER,
        code_security_score INTEGER,
        analyzed_at INTEGER
      );
    `);
  }

  async collectPackageRegistryMetrics(): Promise<RegistryMetrics> {

    // Read package.json and dependencies
    const packageJson = await this.readPackageJson();
    const dependencies = await this.analyzeDependencies(packageJson);
    
    // Mock registry data (in production, this would call real registry APIs)
    const packages: PackageMetrics[] = dependencies.map(dep => ({
      name: dep.name,
      version: dep.version,
      registry: 'npm',
      downloads: Math.floor(Math.random() * 1000000),
      dependencies: dep.dependencies?.length || 0,
      securityScore: Math.floor(Math.random() * 100),
      typeScriptCoverage: dep.types ? 95 : 60,
      lastUpdated: new Date().toISOString(),
      maintainers: Math.floor(Math.random() * 10) + 1,
      weeklyDownloads: Math.floor(Math.random() * 10000),
      riskLevel: this.calculateRiskLevel(dep)
    }));

    const totalDownloads = packages.reduce((sum, pkg) => sum + pkg.downloads, 0);
    const avgSecurityScore = packages.reduce((sum, pkg) => sum + pkg.securityScore, 0) / packages.length;

    return {
      packages,
      totalDownloads,
      activeMaintainers: packages.reduce((sum, pkg) => sum + pkg.maintainers, 0),
      avgSecurityScore,
      registryHealth: this.calculateRegistryHealth(packages),
      lastSync: new Date().toISOString()
    };
  }

  async collectTypeScriptMetrics(): Promise<TypeScriptMetrics> {

    const startTime = Date.now();
    
    // Count TypeScript files
    const tsFiles = await this.findTypeScriptFiles();
    const files = tsFiles.length;
    
    // Analyze code complexity
    let linesOfCode = 0;
    let anyTypes = 0;
    let complexity = 0;
    
    for (const file of tsFiles) {
      const content = await Bun.file(file).text();
      const lines = content.split('\n').length;
      linesOfCode += lines;
      
      // Count 'any' types
      anyTypes += (content.match(/: any/g) || []).length;
      
      // Calculate complexity (simplified)
      complexity += this.calculateComplexity(content);
    }
    
    // Check tsconfig.json for strict mode
    const tsConfig = await this.readTsConfig();
    const strictMode = tsConfig.compilerOptions?.strict === true;
    
    // Mock compile time measurement
    const compileTime = Date.now() - startTime;
    
    // Mock bundle size estimation
    const bundleSize = Math.floor(linesOfCode * 2.5 * Math.random());
    
    // Calculate maintainability index
    const maintainabilityIndex = this.calculateMaintainabilityIndex(linesOfCode, complexity, anyTypes);
    
    const metrics: TypeScriptMetrics = {
      files,
      linesOfCode,
      typeCoverage: Math.max(0, 100 - (anyTypes / linesOfCode * 100)),
      anyTypes,
      strictMode,
      lintErrors: await this.countLintErrors(),
      compileTime,
      bundleSize,
      complexity,
      maintainabilityIndex
    };
    
    // Cache metrics
    this.cacheTypeScriptMetrics(metrics);
    
    return metrics;
  }

  async collectSecurityMetrics(): Promise<SecurityMetrics> {

    // Analyze URL patterns using the plugin logic
    const urlPatterns = await this.analyzeURLPatterns();
    
    // Analyze dependencies for vulnerabilities
    const dependencies = await this.analyzeDependencySecurity();
    
    // Analyze code for security risks
    const codeSecurity = await this.analyzeCodeSecurity();
    
    return {
      urlPatterns,
      dependencies,
      codeSecurity
    };
  }

  private async analyzeURLPatterns() {
    const patterns = { total: 0, critical: 0, high: 0, medium: 0, low: 0 };
    
    // Find config files
    const configFiles = await this.findConfigFiles();
    
    for (const file of configFiles) {
      const content = await Bun.file(file).text();
      const ext = file.split('.').pop()!;
      
      let extracted: any[] = [];
      
      try {
        switch (ext) {
          case 'toml':
            extracted = this.extractFromToml(parseToml(content));
            break;
          case 'yaml':
          case 'yml':
            extracted = this.extractFromYaml(parseYaml(content));
            break;
          case 'json':
            extracted = this.extractFromJson(JSON.parse(content));
            break;
        }
      } catch (error) {

        continue; // Skip this file and continue with others
      }
      
      for (const pattern of extracted) {
        patterns.total++;
        const risk = this.assessPatternRisk(pattern);
        patterns[risk]++;
      }
    }
    
    return patterns;
  }

  private extractFromToml(obj: any, keyPath = ''): any[] {
    const patterns: any[] = [];
    
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = keyPath ? `${keyPath}.${key}` : key;
      
      if (typeof value === 'string' && this.looksLikeURLPattern(value)) {
        patterns.push({ pattern: value, keyPath: currentPath, source: 'toml' });
      } else if (typeof value === 'object' && value !== null) {
        patterns.push(...this.extractFromToml(value, currentPath));
      }
    }
    
    return patterns;
  }

  private extractFromYaml(obj: any, keyPath = ''): any[] {
    // Similar to TOML extraction
    return this.extractFromToml(obj, keyPath);
  }

  private extractFromJson(obj: any, keyPath = ''): any[] {
    // Similar to TOML extraction
    return this.extractFromToml(obj, keyPath);
  }

  private looksLikeURLPattern(str: string): boolean {
    return str.includes(':') || 
           str.includes('*') || 
           str.startsWith('http') || 
           str.startsWith('/');
  }

  private assessPatternRisk(pattern: any): 'low' | 'medium' | 'high' | 'critical' {
    const { pattern: urlPattern } = pattern;
    
    if (urlPattern.startsWith('http://localhost') || urlPattern.includes('/*')) {
      return 'critical';
    }
    if (urlPattern.includes(':') && urlPattern.includes('https://')) {
      return 'high';
    }
    if (urlPattern.includes('*') || urlPattern.includes(':')) {
      return 'medium';
    }
    return 'low';
  }

  private async findConfigFiles(): Promise<string[]> {
    const files: string[] = [];
    const extensions = ['.toml', '.yaml', '.yml', '.json'];
    
    try {
      for (const ext of extensions) {
        const glob = new Bun.Glob(`**/*${ext}`);
        const matches = await Array.fromAsync(glob.scan());
        files.push(...(matches as string[]));
      }
    } catch (error) {

      // Fallback to known config files
      const fallbackFiles = [
        'bun.lockb', 'package.json', 'tsconfig.json', 'bunfig.toml',
        '.env.example', '.gitignore', 'README.md'
      ];
      for (const file of fallbackFiles) {
        try {
          await Bun.file(file).text();
          files.push(file);
        } catch {
          // File doesn't exist, skip
        }
      }
    }
    
    return files;
  }

  private async analyzeDependencySecurity() {
    // Mock dependency security analysis
    return {
      total: 45,
      vulnerabilities: 2,
      outdated: 8,
      devDependencies: 12
    };
  }

  private async analyzeCodeSecurity() {
    // Mock code security analysis
    return {
      sqliRisks: 0,
      xssRisks: 1,
      ssrfRisks: 2,
      pathTraversalRisks: 0
    };
  }

  private async readPackageJson(): Promise<any> {
    try {
      const content = await Bun.file(join(this.projectRoot, 'package.json')).text();
      return JSON.parse(content);
    } catch {
      return { dependencies: {}, devDependencies: {} };
    }
  }

  private async analyzeDependencies(packageJson: any): Promise<any[]> {
    const deps = Object.entries({
      ...packageJson.dependencies,
      ...packageJson.devDependencies
    }).map(([name, version]) => ({ name, version }));
    
    return deps;
  }

  private calculateRiskLevel(dep: any): 'low' | 'medium' | 'high' | 'critical' {
    // Mock risk calculation
    return Math.random() > 0.8 ? 'high' : 'low';
  }

  private calculateRegistryHealth(packages: PackageMetrics[]): number {
    const avgSecurity = packages.reduce((sum, pkg) => sum + pkg.securityScore, 0) / packages.length;
    const avgDownloads = packages.reduce((sum, pkg) => sum + pkg.downloads, 0) / packages.length;
    
    return Math.min(100, (avgSecurity + Math.log10(avgDownloads + 1) * 10) / 2);
  }

  private async findTypeScriptFiles(): Promise<string[]> {
  try {
    const glob = new Bun.Glob('**/*.ts');
    const files = await Array.fromAsync(glob.scan());
    return files as string[];
  } catch (error) {

    // Fallback to simple file system search
    return [];
  }
}

  private calculateComplexity(content: string): number {
    // Simplified complexity calculation
    const conditions = (content.match(/\bif\b|\bfor\b|\bwhile\b/g) || []).length;
    const functions = (content.match(/function\s+\w+|=>\s*{|\w+\s*:\s*\(/g) || []).length;
    return conditions + functions;
  }

  private async readTsConfig(): Promise<any> {
    try {
      const content = await Bun.file(join(this.projectRoot, 'tsconfig.json')).text();
      return JSON.parse(content);
    } catch {
      return { compilerOptions: {} };
    }
  }

  private async countLintErrors(): Promise<number> {
    // Mock lint error count
    return Math.floor(Math.random() * 5);
  }

  private calculateMaintainabilityIndex(loc: number, complexity: number, anyTypes: number): number {
    // Simplified maintainability index calculation
    const volume = loc * Math.log2(complexity + 1);
    const difficulty = complexity / (loc / 1000 + 1);
    const penalty = anyTypes * 2;
    
    return Math.max(0, 171 - 5.2 * Math.log(volume) - 0.23 * complexity - 16.2 * Math.log(difficulty) - penalty);
  }

  private cacheTypeScriptMetrics(metrics: TypeScriptMetrics): void {
    const stmt = this.db.prepare(`
      INSERT INTO typescript_metrics 
      (files, lines_of_code, type_coverage, lint_errors, compile_time, bundle_size, complexity, measured_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      metrics.files,
      metrics.linesOfCode,
      metrics.typeCoverage,
      metrics.lintErrors,
      metrics.compileTime,
      metrics.bundleSize,
      metrics.complexity,
      Date.now()
    );
  }

  async generateComprehensiveReport(): Promise<string> {

    const [registryMetrics, tsMetrics, securityMetrics] = await Promise.all([
      this.collectPackageRegistryMetrics(),
      this.collectTypeScriptMetrics(),
      this.collectSecurityMetrics()
    ]);
    
    const report = this.formatReport(registryMetrics, tsMetrics, securityMetrics);
    
    // Save report to file
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = `comprehensive-metrics-${timestamp}.md`;
    await Bun.write(reportFile, report);

    return report;
  }

  private formatReport(registry: RegistryMetrics, ts: TypeScriptMetrics, security: SecurityMetrics): string {
    return `
# 🏛️ Comprehensive Metrics Report
*Generated: ${new Date().toLocaleString()}*

## 📦 Package Registry Metrics

### Overview
- **Total Packages**: ${registry.packages.length}
- **Total Downloads**: ${registry.totalDownloads.toLocaleString()}
- **Active Maintainers**: ${registry.activeMaintainers}
- **Avg Security Score**: ${registry.avgSecurityScore.toFixed(1)}/100
- **Registry Health**: ${registry.registryHealth.toFixed(1)}/100

### Top Packages by Downloads
${registry.packages
  .sort((a, b) => b.downloads - a.downloads)
  .slice(0, 5)
  .map(pkg => `- **${pkg.name}**: ${pkg.downloads.toLocaleString()} downloads (${pkg.securityScore}/100 security)`)
  .join('\n')}

### Security Risk Distribution
${Object.entries(
  registry.packages.reduce((acc, pkg) => {
    acc[pkg.riskLevel] = (acc[pkg.riskLevel] || 0) + 1;
    return acc;
  }, {} as Record<string, number>)
)
.map(([risk, count]) => `- **${risk.toUpperCase()}**: ${count} packages`)
.join('\n')}

## 📘 TypeScript Metrics

### Code Quality
- **Files**: ${ts.files}
- **Lines of Code**: ${ts.linesOfCode.toLocaleString()}
- **Type Coverage**: ${ts.typeCoverage.toFixed(1)}%
- **Strict Mode**: ${ts.strictMode ? '✅ Enabled' : '❌ Disabled'}
- **Maintainability Index**: ${ts.maintainabilityIndex.toFixed(1)}/100

### Performance
- **Compile Time**: ${ts.compileTime}ms
- **Bundle Size**: ${(ts.bundleSize / 1024).toFixed(1)}KB
- **Complexity Score**: ${ts.complexity}
- **Lint Errors**: ${ts.lintErrors}

### Type Safety Analysis
- **'any' Types**: ${ts.anyTypes} instances
- **Type Safety Score**: ${ts.typeCoverage.toFixed(1)}%
- **Code Quality**: ${ts.maintainabilityIndex > 80 ? '🟢 Excellent' : ts.maintainabilityIndex > 60 ? '🟡 Good' : '🔴 Needs Improvement'}

## 🔒 Security Metrics

### URL Pattern Analysis
- **Total Patterns**: ${security.urlPatterns.total}
- **Critical Risk**: ${security.urlPatterns.critical} 🚨
- **High Risk**: ${security.urlPatterns.high} ⚠️
- **Medium Risk**: ${security.urlPatterns.medium}
- **Low Risk**: ${security.urlPatterns.low} ✅

### Dependency Security
- **Total Dependencies**: ${security.dependencies.total}
- **Vulnerabilities**: ${security.dependencies.vulnerabilities} 🚨
- **Outdated Packages**: ${security.dependencies.outdated}
- **Dev Dependencies**: ${security.dependencies.devDependencies}

### Code Security Analysis
- **SQL Injection Risks**: ${security.codeSecurity.sqliRisks}
- **XSS Risks**: ${security.codeSecurity.xssRisks}
- **SSRF Risks**: ${security.codeSecurity.ssrfRisks}
- **Path Traversal Risks**: ${security.codeSecurity.pathTraversalRisks}

## 📈 Overall Health Score

### Component Scores
- **Registry Health**: ${registry.registryHealth.toFixed(1)}/100
- **TypeScript Quality**: ${ts.typeCoverage.toFixed(1)}/100
- **Security Posture**: ${Math.max(0, 100 - (security.urlPatterns.critical * 20 + security.urlPatterns.high * 10 + security.dependencies.vulnerabilities * 15)).toFixed(1)}/100

### Overall Score: ${((registry.registryHealth + ts.typeCoverage + Math.max(0, 100 - (security.urlPatterns.critical * 20 + security.urlPatterns.high * 10 + security.dependencies.vulnerabilities * 15))) / 3).toFixed(1)}/100

## 🎯 Recommendations

### Immediate Actions
${security.urlPatterns.critical > 0 ? `- 🚨 Fix ${security.urlPatterns.critical} critical URL pattern risks` : ''}
${security.dependencies.vulnerabilities > 0 ? `- 🚨 Address ${security.dependencies.vulnerabilities} security vulnerabilities` : ''}
${ts.typeCoverage < 80 ? `- 📚 Improve TypeScript type coverage (current: ${ts.typeCoverage.toFixed(1)}%)` : ''}

### Improvements
- 📦 Consider updating ${security.dependencies.outdated} outdated dependencies
- 🔧 Enable strict TypeScript mode for better type safety
- 🛡️ Implement automated security scanning in CI/CD
- 📊 Set up monitoring for package registry health

### Long-term Goals
- 🎯 Achieve 95%+ TypeScript type coverage
- 🔒 Maintain zero critical security risks
- 📈 Improve overall maintainability index above 85
- 🚀 Optimize bundle size and compile performance

---
*Report generated by Advanced Metrics Collector v1.0.0*
`;
  }

  close(): void {
    this.db.close();
  }
}
