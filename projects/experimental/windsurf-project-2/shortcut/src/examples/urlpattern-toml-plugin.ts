#!/usr/bin/env bun

/**
 * URLPattern TOML Security Plugin
 * 
 * Scans TOML config files for URLPattern strings and injects security guards
 * Turns configuration into first-class security citizens
 */

import { Database } from 'bun:sqlite';

interface PluginOptions {
  scanConfigFiles: string[];
  failOnRisk: 'critical' | 'high' | 'medium' | 'low' | 'none';
  autoInjectGuards: boolean;
  outputReport?: string;
}

interface PatternRisk {
  pattern: string;
  risk: 'critical' | 'high' | 'medium' | 'low';
  issues: string[];
  file: string;
  line: number;
  column: number;
}

interface TomlSecurityReport {
  timestamp: string;
  totalPatterns: number;
  risks: PatternRisk[];
  summary: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
}

class URLPatternTomlScanner {
  private db: Database;
  private options: PluginOptions;
  
  constructor(options: PluginOptions) {
    this.options = options;
    this.db = new Database(':memory:');
    this.setupDatabase();
  }
  
  private setupDatabase() {
    this.db.run(`
      CREATE TABLE patterns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pattern TEXT NOT NULL,
        risk TEXT NOT NULL,
        file TEXT NOT NULL,
        line INTEGER,
        column INTEGER,
        issues TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    
    this.db.run(`
      CREATE TABLE config_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_path TEXT UNIQUE NOT NULL,
        patterns_count INTEGER DEFAULT 0,
        scanned_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  
  async scanAllConfigs(): Promise<TomlSecurityReport> {
    console.log('🔍 Scanning TOML configs for URLPattern security risks...');
    
    const allPatterns: PatternRisk[] = [];
    
    for (const globPattern of this.options.scanConfigFiles) {
      const files = await this.globFiles(globPattern);
      
      for (const file of files) {
        console.log(`   📁 Scanning ${file}...`);
        const patterns = await this.scanTOMLFile(file);
        allPatterns.push(...patterns);
        
        // Save to database
        this.db.run(
          'INSERT OR REPLACE INTO config_files (file_path, patterns_count) VALUES (?, ?)',
          [file, patterns.length]
        );
      }
    }
    
    const report = this.generateReport(allPatterns);
    
    // Save patterns to database
    const insertPattern = this.db.prepare(`
      INSERT INTO patterns (pattern, risk, file, line, column, issues)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    
    allPatterns.forEach(pattern => {
      insertPattern.run(
        pattern.pattern,
        pattern.risk,
        pattern.file,
        pattern.line,
        pattern.column,
        JSON.stringify(pattern.issues)
      );
    });
    
    return report;
  }
  
  private async globFiles(pattern: string): Promise<string[]> {
    const files: string[] = [];
    
    try {
      // Handle specific patterns for our demo
      if (pattern === 'config/**/*.toml') {
        // Scan known config files directly
        const knownFiles = [
          'config/routes.toml',
          'config/tenants/tenant-a.toml'
        ];
        
        for (const file of knownFiles) {
          if (await Bun.file(file).exists()) {
            files.push(file);
          }
        }
      } else if (pattern.includes('*')) {
        // Handle simple *.toml patterns
        const parts = pattern.split('/');
        const baseDir = parts.slice(0, -1).join('/') || '.';
        const filename = parts[parts.length - 1];
        
        if (filename === '*.toml') {
          // For demo purposes, check known files
          const knownTomlFiles = [
            `${baseDir}/routes.toml`,
            `${baseDir}/tenant-a.toml`,
            `${baseDir}/demo.toml`
          ];
          
          for (const file of knownTomlFiles) {
            if (await Bun.file(file).exists()) {
              files.push(file);
            }
          }
        }
      } else {
        // Direct file path
        if (await Bun.file(pattern).exists()) {
          files.push(pattern);
        }
      }
    } catch (error) {
      console.error(`   ⚠️  Could not scan ${pattern}:`, error);
    }
    
    return files;
  }
  
  private async scanTOMLFile(filePath: string): Promise<PatternRisk[]> {
    const patterns: PatternRisk[] = [];
    
    try {
      // Read TOML file content
      const content = await Bun.file(filePath).text();
      const lines = content.split('\n');
      
      // Scan each line for potential URLPattern strings
      lines.forEach((line, lineIndex) => {
        const urlPatternMatches = this.findURLPatternsInLine(line);
        
        urlPatternMatches.forEach(match => {
          const risk = this.analyzePatternRisk(match.pattern);
          patterns.push({
            pattern: match.pattern,
            risk: risk.level,
            issues: risk.issues,
            file: filePath,
            line: lineIndex + 1,
            column: match.column
          });
        });
      });
      
    } catch (error) {
      console.error(`   ❌ Failed to scan ${filePath}:`, error);
    }
    
    return patterns;
  }
  
  private findURLPatternsInLine(line: string): Array<{ pattern: string; column: number }> {
    const patterns: Array<{ pattern: string; column: number }> = [];
    
    // URL pattern indicators
    const urlIndicators = [
      'http://',
      'https://',
      'ftp://',
      'ws://',
      'wss://'
    ];
    
    // Find quoted strings that look like URLs
    const quotedStrings = line.match(/"([^"]+)"/g) || [];
    
    quotedStrings.forEach((quoted, index) => {
      const pattern = quoted.slice(1, -1); // Remove quotes
      
      // Check if it looks like a URL pattern
      const hasUrlIndicator = urlIndicators.some(indicator => pattern.includes(indicator));
      const hasPatternSyntax = pattern.includes(':') || pattern.includes('*');
      
      if (hasUrlIndicator && hasPatternSyntax) {
        const column = line.indexOf(quoted) + 1;
        patterns.push({ pattern, column });
      }
    });
    
    return patterns;
  }
  
  private analyzePatternRisk(pattern: string): { level: 'critical' | 'high' | 'medium' | 'low'; issues: string[] } {
    const issues: string[] = [];
    
    // Critical risks
    if (pattern.includes('localhost') || pattern.includes('127.0.0.1')) {
      issues.push('SSRF risk - localhost access');
    }
    
    if (pattern.includes('..') || pattern.includes('%2e%2e')) {
      issues.push('Path traversal vulnerability');
    }
    
    if (pattern.includes('file://')) {
      issues.push('File system access');
    }
    
    if (pattern.includes('admin') && pattern.includes('*')) {
      issues.push('Wildcard admin access');
    }
    
    // High risks
    if (pattern.includes('internal') || pattern.includes('private')) {
      issues.push('Internal network access');
    }
    
    if (pattern.includes('192.168.') || pattern.includes('10.') || pattern.includes('172.16.')) {
      issues.push('Private network range');
    }
    
    // Medium risks
    if (pattern.includes('://*') || pattern.includes('://*.')) {
      issues.push('Open redirect risk');
    }
    
    if (pattern.includes('**') && pattern.length > 50) {
      issues.push('Complex pattern - potential ReDoS');
    }
    
    // Low risks
    if (!pattern.startsWith('https://')) {
      issues.push('Insecure protocol (non-HTTPS)');
    }
    
    // Determine risk level
    if (issues.some(issue => issue.includes('SSRF') || issue.includes('Path traversal') || issue.includes('File system'))) {
      return { level: 'critical', issues };
    }
    
    if (issues.some(issue => issue.includes('Internal') || issue.includes('Private network') || issue.includes('Wildcard admin'))) {
      return { level: 'high', issues };
    }
    
    if (issues.some(issue => issue.includes('Open redirect') || issue.includes('ReDoS'))) {
      return { level: 'medium', issues };
    }
    
    if (issues.length > 0) {
      return { level: 'low', issues };
    }
    
    return { level: 'low', issues: ['No significant risks detected'] };
  }
  
  private generateReport(patterns: PatternRisk[]): TomlSecurityReport {
    const summary = {
      critical: patterns.filter(p => p.risk === 'critical').length,
      high: patterns.filter(p => p.risk === 'high').length,
      medium: patterns.filter(p => p.risk === 'medium').length,
      low: patterns.filter(p => p.risk === 'low').length
    };
    
    return {
      timestamp: new Date().toISOString(),
      totalPatterns: patterns.length,
      risks: patterns,
      summary
    };
  }
  
  async injectGuards(report: TomlSecurityReport): Promise<void> {
    if (!this.options.autoInjectGuards) {
      console.log('⚠️  Guard injection disabled');
      return;
    }
    
    console.log('🛡️  Injecting security guards...');
    
    for (const pattern of report.risks) {
      if (this.shouldInjectGuard(pattern.risk)) {
        await this.injectGuardForPattern(pattern);
      }
    }
  }
  
  private shouldInjectGuard(risk: string): boolean {
    const riskLevels = ['critical', 'high', 'medium', 'low', 'none'];
    const optionLevel = riskLevels.indexOf(this.options.failOnRisk);
    const patternLevel = riskLevels.indexOf(risk);
    
    return patternLevel <= optionLevel && this.options.failOnRisk !== 'none';
  }
  
  private async injectGuardForPattern(pattern: PatternRisk): Promise<void> {
    console.log(`   🛡️  Injecting guard for ${pattern.risk} risk pattern in ${pattern.file}`);
    
    // Read the original file
    const content = await Bun.file(pattern.file).text();
    const lines = content.split('\n');
    
    // Find the pattern line
    const targetLine = lines[pattern.line - 1];
    
    // Generate guard code
    const guardCode = this.generateGuardCode(pattern);
    
    // Insert guard before the pattern
    lines.splice(pattern.line - 1, 0, guardCode);
    
    // Write back the file
    await Bun.write(pattern.file, lines.join('\n'));
  }
  
  private generateGuardCode(pattern: PatternRisk): string {
    const timestamp = new Date().toISOString();
    const riskEmoji = {
      critical: '🚨',
      high: '⚠️',
      medium: '⚡',
      low: 'ℹ️'
    };
    
    return `# [URLPattern Guard - ${timestamp}] ${riskEmoji[pattern.risk]} ${pattern.risk.toUpperCase()} risk pattern detected
# Issues: ${pattern.issues.join(', ')}
# Consider using a safer pattern or adding runtime validation`;
  }
  
  async validateBuild(report: TomlSecurityReport): Promise<boolean> {
    console.log('\n📊 Build Validation Summary:');
    console.log('================================');
    
    console.log(`   Total patterns: ${report.totalPatterns}`);
    console.log(`   🚨 Critical: ${report.summary.critical}`);
    console.log(`   ⚠️  High: ${report.summary.high}`);
    console.log(`   ⚡ Medium: ${report.summary.medium}`);
    console.log(`   ℹ️  Low: ${report.summary.low}`);
    
    // Show critical issues
    const criticalIssues = report.risks.filter(r => r.risk === 'critical');
    if (criticalIssues.length > 0) {
      console.log('\n🚨 Critical Issues:');
      criticalIssues.forEach(issue => {
        console.log(`   ${issue.file}:${issue.line}:${issue.column} - ${issue.pattern}`);
        issue.issues.forEach(issueDetail => {
          console.log(`      • ${issueDetail}`);
        });
      });
    }
    
    // Determine if build should fail
    const shouldFail = report.risks.some(risk => 
      this.shouldFailBuild(risk.risk)
    );
    
    if (shouldFail) {
      console.log(`\n❌ Build failed: ${this.options.failOnRisk} risk patterns detected`);
      return false;
    }
    
    console.log('\n✅ Build passed: No disallowed risk patterns detected');
    return true;
  }
  
  private shouldFailBuild(risk: string): boolean {
    const riskLevels = ['critical', 'high', 'medium', 'low', 'none'];
    const optionLevel = riskLevels.indexOf(this.options.failOnRisk);
    const patternLevel = riskLevels.indexOf(risk);
    
    return patternLevel <= optionLevel && this.options.failOnRisk !== 'none';
  }
  
  async saveReport(report: TomlSecurityReport): Promise<void> {
    if (!this.options.outputReport) {
      return;
    }
    
    console.log(`💾 Saving security report to ${this.options.outputReport}`);
    await Bun.write(this.options.outputReport, JSON.stringify(report, null, 2));
  }
  
  close() {
    this.db.close();
  }
}

// Export the scanner class for direct usage
export { URLPatternTomlScanner };

// Plugin factory
export function urlPatternTomlPlugin(options: Partial<PluginOptions> = {}) {
  const defaultOptions: PluginOptions = {
    scanConfigFiles: ['config/**/*.toml'],
    failOnRisk: 'critical',
    autoInjectGuards: true,
    outputReport: './security-report.json'
  };
  
  const finalOptions = { ...defaultOptions, ...options };
  
  return {
    name: 'urlpattern-toml-security',
    setup(build: any) {
      console.log('🛡️  URLPattern TOML Security Plugin activated');
      
      build.onStart(async () => {
        const scanner = new URLPatternTomlScanner(finalOptions);
        
        try {
          const report = await scanner.scanAllConfigs();
          
          if (finalOptions.autoInjectGuards) {
            await scanner.injectGuards(report);
          }
          
          await scanner.saveReport(report);
          
          const shouldContinue = await scanner.validateBuild(report);
          
          if (!shouldContinue) {
            throw new Error('Build failed due to URLPattern security risks');
          }
          
        } catch (error) {
          console.error('❌ TOML security scan failed:', error);
          throw error;
        } finally {
          scanner.close();
        }
      });
    }
  };
}

// CLI tool for standalone usage
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
URLPattern TOML Security Scanner

Usage:
  bun run urlpattern-toml-plugin.ts [options]

Options:
  --pattern-glob <glob>     Pattern for TOML files (default: config/**/*.toml)
  --fail-on-risk <level>    Fail build on risk level (critical|high|medium|low|none)
  --inject-guards           Auto-inject security guards
  --output <file>           Output report file (default: security-report.json)
  --help                    Show this help

Examples:
  bun run urlpattern-toml-plugin.ts --pattern-glob "config/*.toml" --fail-on-risk high
  bun run urlpattern-toml-plugin.ts --inject-guards --output ci-report.json
    `);
    process.exit(0);
  }
  
  const options: PluginOptions = {
    scanConfigFiles: ['config/**/*.toml'],
    failOnRisk: 'critical',
    autoInjectGuards: false,
    outputReport: './security-report.json'
  };
  
  // Parse CLI args
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--pattern-glob':
        options.scanConfigFiles = [args[++i]];
        break;
      case '--fail-on-risk':
        options.failOnRisk = args[++i] as any;
        break;
      case '--inject-guards':
        options.autoInjectGuards = true;
        break;
      case '--output':
        options.outputReport = args[++i];
        break;
    }
  }
  
  const scanner = new URLPatternTomlScanner(options);
  
  try {
    const report = await scanner.scanAllConfigs();
    
    if (options.autoInjectGuards) {
      await scanner.injectGuards(report);
    }
    
    await scanner.saveReport(report);
    await scanner.validateBuild(report);
    
  } catch (error) {
    console.error('❌ Scan failed:', error);
    process.exit(1);
  } finally {
    scanner.close();
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
