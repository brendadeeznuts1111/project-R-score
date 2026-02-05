#!/usr/bin/env bun

// Runtime Security Guard Generator
export {};

// Import Database type from bun:sqlite
interface Database {
  run(sql: string, ...args: any[]): void;
  query(sql: string): {
    all(): any[];
    get(): any;
  };
  close(): void;
}

interface SecurityGuard {
  beforeExec?: (url: string, groups: Record<string, string>) => void;
  timeout?: number;
  afterExec?: (result: URLPatternResult | null) => void;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

interface GuardConfig {
  pattern: string;
  guard: SecurityGuard;
  analysis: {
    security_score: number;
    redos_score: number;
    vulnerabilities: string[];
  };
}

class RuntimeSecurityGuardGenerator {
  private guards: Map<string, SecurityGuard> = new Map();
  private db: Database;

  constructor(cacheDb: string) {
    const { Database } = require('bun:sqlite');
    this.db = new Database(cacheDb);
  }

  async generateGuards(): Promise<void> {
    console.log('🛡️ Generating Runtime Security Guards');
    console.log('===================================');

    const patterns = this.db.query('SELECT * FROM cached_results').all() as any[];
    
    for (const patternData of patterns) {
      const guard = this.createGuard(patternData);
      this.guards.set(patternData.pattern_text, guard);
    }

    await this.writeGuardsFile();
    console.log(`✅ Generated ${this.guards.size} runtime guards`);
  }

  private createGuard(patternData: any): SecurityGuard {
    const vulnerabilities = this.analyzeVulnerabilities(patternData);
    const riskLevel = this.calculateRiskLevel(patternData, vulnerabilities);

    const guard: SecurityGuard = {
      riskLevel,
      ...this.createBeforeExec(patternData, vulnerabilities),
      ...this.createAfterExec(patternData, vulnerabilities),
      timeout: this.calculateTimeout(patternData.redos_score)
    };

    return guard;
  }

  private analyzeVulnerabilities(patternData: any): string[] {
    const vulnerabilities: string[] = [];
    const pattern = patternData.pattern_text;

    if (pattern.includes('..')) vulnerabilities.push('path_traversal');
    if (pattern.includes('169.254.169.254')) vulnerabilities.push('ssrf');
    if (pattern.includes('${USER}')) vulnerabilities.push('env_injection');
    if (pattern.includes('localhost')) vulnerabilities.push('ssrf_localhost');
    if (pattern.includes('file://')) vulnerabilities.push('file_scheme');
    if (pattern.includes('..')) vulnerabilities.push('directory_traversal');

    return vulnerabilities;
  }

  private calculateRiskLevel(patternData: any, vulnerabilities: string[]): 'low' | 'medium' | 'high' | 'critical' {
    if (patternData.security_score < 3 || vulnerabilities.length > 3) return 'critical';
    if (patternData.security_score < 5 || vulnerabilities.length > 1) return 'high';
    if (patternData.security_score < 7 || vulnerabilities.length > 0) return 'medium';
    return 'low';
  }

  private createBeforeExec(patternData: any, vulnerabilities: string[]): Partial<SecurityGuard> {
    const checks: string[] = [];

    if (vulnerabilities.includes('path_traversal')) {
      checks.push(`
    if (groups.pkg?.includes('..')) throw new Error('Path traversal blocked');
    if (url.includes('../')) throw new Error('Directory traversal blocked');`);
    }

    if (vulnerabilities.includes('ssrf')) {
      checks.push(`
    if (url.includes('169.254.169.254')) throw new Error('SSRF blocked - metadata service');
    if (url.includes('127.0.0.1') || url.includes('localhost')) throw new Error('SSRF blocked - localhost');`);
    }

    if (vulnerabilities.includes('env_injection')) {
      checks.push(`
    const user = process.env.USER;
    if (!user || /[@%]/.test(user)) throw new Error('Invalid USER env var');
    if (groups.user && /[^a-zA-Z0-9._-]/.test(groups.user)) throw new Error('Invalid user parameter');`);
    }

    if (vulnerabilities.includes('file_scheme')) {
      checks.push(`
    if (url.startsWith('file://')) throw new Error('File scheme blocked');
    if (url.includes('etc/passwd')) throw new Error('System file access blocked');`);
    }

    return {
      beforeExec: new Function('url', 'groups', `
        ${checks.join('\n')}
      `) as any
    };
  }

  private createAfterExec(patternData: any, vulnerabilities: string[]): Partial<SecurityGuard> {
    return {
      afterExec: (result: URLPatternResult | null) => {
        if (!result) return;
        
        console.warn('[URLPattern Security Audit]', {
          pattern: 'enterprise-pattern',
          risk: this.calculateRiskLevel(patternData, vulnerabilities),
          groups: this.sanitizePII((result as any).groups || {}),
          timestamp: new Date().toISOString()
        });
      }
    };
  }

  private calculateTimeout(redosScore: number): number {
    if (redosScore > 0.8) return 1; // Very aggressive ReDoS protection
    if (redosScore > 0.6) return 3; // Moderate protection
    if (redosScore > 0.4) return 5; // Light protection
    return 10; // Default timeout
  }

  private sanitizePII(groups: Record<string, string>): Record<string, string> {
    const sanitized: Record<string, string> = {};
    for (const [key, value] of Object.entries(groups)) {
      if (key.toLowerCase().includes('user') || key.toLowerCase().includes('email')) {
        sanitized[key] = value ? value.substring(0, 3) + '***' : '';
      } else {
        sanitized[key] = value;
      }
    }
    return sanitized;
  }

  private async writeGuardsFile(): Promise<void> {
    const guardCode = this.generateGuardCode();
    await Bun.write('./runtime-guards.ts', guardCode);
  }

  private generateGuardCode(): string {
    let code = `// Auto-generated Runtime Security Guards
// Generated on: ${new Date().toISOString()}
// WARNING: Do not edit manually - regenerate with security analysis

export const runtimeGuards = {\n`;

    // Convert Map to array for iteration
    const guardEntries = Array.from(this.guards.entries());
    for (const [pattern, guard] of guardEntries) {
      const safePattern = pattern.replace(/[^a-zA-Z0-9_]/g, '_');
      code += `  '${safePattern}': {\n`;
      code += `    riskLevel: '${guard.riskLevel}',\n`;
      
      if (guard.timeout) {
        code += `    timeout: ${guard.timeout},\n`;
      }

      if (guard.beforeExec) {
        code += `    beforeExec: (url: string, groups: Record<string, string>) => {\n`;
        code += `      try {\n`;
        code += `        ${guard.beforeExec.toString().replace(/^function\s*\(\)\s*{/, '').replace(/}$/, '')}\n`;
        code += `      } catch (error) {\n`;
        code += `        throw new Error(\`Security guard blocked request: \${error.message}\`);\n`;
        code += `      }\n`;
        code += `    },\n`;
      }

      if (guard.afterExec) {
        code += `    afterExec: (result: URLPatternResult | null) => {\n`;
        code += `      ${guard.afterExec.toString()}\n`;
        code += `    },\n`;
      }

      code += `  },\n`;
    }

    code += `};\n\n`;
    code += `// Usage example:\n`;
    code += `// import { runtimeGuards } from './runtime-guards';\n`;
    code += `// const pattern = new URLPattern({ pathname: '/api/:service/*' });\n`;
    code += `// const guard = runtimeGuards[pattern.pathname];\n`;
    code += `// if (guard?.beforeExec) guard.beforeExec(url.href, groups);\n`;
    code += `// const result = pattern.exec(url);\n`;
    code += `// if (guard?.afterExec) guard.afterExec(result);\n`;

    return code;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const cacheDb = args.find(arg => arg.startsWith('--cache-db='))?.split('=')[1] || 'results.sqlite';

  console.log('🛡️ Runtime Security Guard Generator');
  console.log('===================================');

  const generator = new RuntimeSecurityGuardGenerator(cacheDb);
  
  try {
    await generator.generateGuards();
    console.log('✅ Runtime guards generated successfully');
    console.log('📁 Output: ./runtime-guards.ts');
    console.log('');
    console.log('🔧 Integration:');
    console.log('import { runtimeGuards } from "./runtime-guards";');
    console.log('const guard = runtimeGuards[patternKey];');
    console.log('guard.beforeExec(url, groups);');
  } catch (error) {
    console.error('❌ Error generating guards:', error);
    process.exit(1);
  }
}

export { RuntimeSecurityGuardGenerator };

// Check if this file is being run directly
if (require.main === module) {
  main().catch(console.error);
}
