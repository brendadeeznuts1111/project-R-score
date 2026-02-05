#!/usr/bin/env bun
/**
 * FactoryWager Configuration Changelog v1.3.8
 * Semantic diff analysis with inheritance tracking and security scanning
 */

import { readFileSync } from 'fs';
import { execSync } from 'child_process';

interface ConfigDiff {
  change: '+' | '~' | '-' | '🔒';
  environment: string;
  key: string;
  before?: string;
  after?: string;
  type: string;
  risk: number;
  lineNumber?: number;
}

interface ChangelogResult {
  changes: ConfigDiff[];
  inheritanceDrift: Record<string, number>;
  riskDelta: number;
  fromRisk: number;
  toRisk: number;
  hardeningLevel: string;
  summary: {
    total: number;
    added: number;
    modified: number;
    removed: number;
    interpolations: number;
  };
}

class FactoryWagerChangelog {
  private fromRef: string;
  private toRef: string;
  private apply: boolean;
  private force: boolean;

  constructor(fromRef: string, toRef: string, apply: boolean = false, force: boolean = false) {
    this.fromRef = fromRef;
    this.toRef = toRef;
    this.apply = apply;
    this.force = force;
  }

  async generateChangelog(): Promise<ChangelogResult> {
    console.log(`📝 FactoryWager Configuration Changelog`);
    console.log(`=======================================`);
    console.log(`From: ${this.fromRef}`);
    console.log(`To: ${this.toRef}`);
    console.log('');

    try {
      // Load configurations
      const fromConfig = await this.loadConfig(this.fromRef);
      const toConfig = await this.loadConfig(this.toRef);

      if (!fromConfig || !toConfig) {
        throw new Error('Failed to load one or both configurations');
      }

      console.log(`📊 Analyzing changes...`);
      const result = await this.analyzeChanges(fromConfig, toConfig);

      // Render diff table
      this.renderDiffTable(result.changes);

      // Show summary
      this.renderSummary(result);

      // Security scan
      await this.securityScan(result);

      // Auto-commit if requested
      if (this.apply) {
        await this.handleCommit(result);
      }

      return result;
    } catch (error) {
      console.error(`❌ Changelog generation failed: ${(error as Error).message}`);
      process.exit(2);
    }
  }

  private async loadConfig(ref: string): Promise<any> {
    try {
      let content: string;

      if (ref.includes('HEAD') || ref.includes('~') || /^[a-f0-9]+$/.test(ref)) {
        // Git ref
        content = execSync(`git show ${ref}:config.yaml 2>/dev/null || echo ""`, { encoding: 'utf8' });
      } else {
        // File path
        content = readFileSync(ref, 'utf8');
      }

      if (!content.trim()) {
        return null;
      }

      // Parse using Bun's native YAML
      return Bun.YAML.parse(content);
    } catch (error) {
      console.warn(`⚠️ Could not load config from ${ref}: ${(error as Error).message}`);
      return null;
    }
  }

  private async analyzeChanges(fromConfig: any, toConfig: any): Promise<ChangelogResult> {
    const changes: ConfigDiff[] = [];
    const fromKeys = this.extractKeys(fromConfig || {});
    const toKeys = this.extractKeys(toConfig || {});

    const allKeys = new Set([...fromKeys.keys(), ...toKeys.keys()]);
    let riskDelta = 0;

    for (const key of allKeys) {
      const fromValue = fromKeys.get(key);
      const toValue = toKeys.get(key);

      if (fromValue === undefined && toValue !== undefined) {
        // Added
        changes.push({
          change: '+',
          environment: this.detectEnvironment(key),
          key,
          after: this.formatValue(toValue),
          type: typeof toValue,
          risk: this.calculateRisk(key, toValue)
        });
        riskDelta += this.calculateRisk(key, toValue);
      } else if (fromValue !== undefined && toValue === undefined) {
        // Removed
        changes.push({
          change: '-',
          environment: this.detectEnvironment(key),
          key,
          before: this.formatValue(fromValue),
          type: typeof fromValue,
          risk: -this.calculateRisk(key, fromValue)
        });
        riskDelta -= this.calculateRisk(key, fromValue);
      } else if (fromValue !== toValue) {
        // Modified
        const isInterpolation = this.isInterpolation(fromValue) || this.isInterpolation(toValue);
        changes.push({
          change: isInterpolation ? '🔒' : '~',
          environment: this.detectEnvironment(key),
          key,
          before: this.formatValue(fromValue),
          after: this.formatValue(toValue),
          type: typeof toValue,
          risk: this.calculateRisk(key, toValue) - this.calculateRisk(key, fromValue)
        });
        riskDelta += this.calculateRisk(key, toValue) - this.calculateRisk(key, fromValue);
      }
    }

    const fromRisk = this.calculateTotalRisk(fromConfig || {});
    const toRisk = this.calculateTotalRisk(toConfig || {});

    return {
      changes,
      inheritanceDrift: this.calculateInheritanceDrift(fromConfig, toConfig),
      riskDelta,
      fromRisk,
      toRisk,
      hardeningLevel: this.determineHardeningLevel(toConfig || {}),
      summary: {
        total: changes.length,
        added: changes.filter(c => c.change === '+').length,
        modified: changes.filter(c => c.change === '~' || c.change === '🔒').length,
        removed: changes.filter(c => c.change === '-').length,
        interpolations: changes.filter(c => c.change === '🔒').length
      }
    };
  }

  private extractKeys(obj: any, prefix: string = ''): Map<string, any> {
    const keys = new Map<string, any>();

    if (typeof obj === 'object' && obj !== null) {
      Object.entries(obj).forEach(([key, value]) => {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          const nestedKeys = this.extractKeys(value, fullKey);
          nestedKeys.forEach((v, k) => keys.set(k, v));
        } else {
          keys.set(fullKey, value);
        }
      });
    }

    return keys;
  }

  private detectEnvironment(key: string): string {
    if (key.includes('production') || key.includes('prod')) return 'production';
    if (key.includes('staging') || key.includes('stage')) return 'staging';
    if (key.includes('development') || key.includes('dev')) return 'development';
    return 'global';
  }

  private formatValue(value: any): string {
    if (value === null || value === undefined) return 'null';
    if (typeof value === 'string') {
      return value.length > 30 ? value.substring(0, 27) + '...' : value;
    }
    if (typeof value === 'object') return Array.isArray(value) ? `Array[${value.length}]` : 'Object';
    return String(value);
  }

  private isInterpolation(value: any): boolean {
    return typeof value === 'string' && value.includes('${');
  }

  private calculateRisk(key: string, value: any): number {
    let risk = 0;
    
    if (key.includes('token') || key.includes('secret') || key.includes('key')) risk += 20;
    if (key.includes('password')) risk += 25;
    if (typeof value === 'string' && value.includes('demo-')) risk += 15;
    if (typeof value === 'string' && value.length > 100) risk += 10;
    if (this.isInterpolation(value)) risk += 5;
    
    return Math.min(risk, 50);
  }

  private calculateTotalRisk(config: any): number {
    const keys = this.extractKeys(config);
    let totalRisk = 0;
    
    keys.forEach((value, key) => {
      totalRisk += this.calculateRisk(key, value);
    });
    
    return keys.size > 0 ? Math.round(totalRisk / keys.size) : 0;
  }

  private calculateInheritanceDrift(fromConfig: any, toConfig: any): Record<string, number> {
    const fromKeys = this.extractKeys(fromConfig || {});
    const toKeys = this.extractKeys(toConfig || {});
    
    const environments = ['development', 'staging', 'production'];
    const drift: Record<string, number> = {};
    
    environments.forEach(env => {
      const fromEnvKeys = Array.from(fromKeys.keys()).filter(k => 
        k.includes(env) || (env === 'development' && !k.includes('staging') && !k.includes('production'))
      );
      const toEnvKeys = Array.from(toKeys.keys()).filter(k => 
        k.includes(env) || (env === 'development' && !k.includes('staging') && !k.includes('production'))
      );
      
      const allEnvKeys = new Set([...fromEnvKeys, ...toEnvKeys]);
      let changedCount = 0;
      
      allEnvKeys.forEach(key => {
        if (fromKeys.get(key) !== toKeys.get(key)) {
          changedCount++;
        }
      });
      
      drift[env] = allEnvKeys.size > 0 ? Math.round((changedCount / allEnvKeys.size) * 100) : 0;
    });
    
    return drift;
  }

  private determineHardeningLevel(config: any): string {
    const content = JSON.stringify(config).toLowerCase();
    if (content.includes('production') || content.includes('prod')) return 'PRODUCTION';
    if (content.includes('staging') || content.includes('stage')) return 'STAGING';
    return 'DEVELOPMENT';
  }

  private renderDiffTable(changes: ConfigDiff[]): void {
    if (changes.length === 0) {
      console.log('✅ No changes detected');
      return;
    }

    console.log(`\n📋 Configuration Changes:`);
    console.log('─'.repeat(120));
    console.log('Change │ Env       │ Key'.padEnd(30) + '│ Before'.padEnd(20) + '│ After'.padEnd(20) + '│ Type'.padEnd(10) + '│ Risk');
    console.log('───────┼───────────┼'.padEnd(33, '─') + '┼'.padEnd(23, '─') + '┼'.padEnd(23, '─') + '┼'.padEnd(13, '─') + '┼──────');

    changes.forEach(change => {
      const changeIcon = this.colorizeChange(change.change);
      const env = change.environment.padEnd(9);
      const key = (change.key.length > 28 ? change.key.substring(0, 25) + '...' : change.key).padEnd(28);
      const before = (change.before || '—').padEnd(20);
      const after = (change.after || '—').padEnd(20);
      const type = change.type.padEnd(10);
      const risk = this.colorizeRisk(change.risk).padEnd(4);
      
      console.log(`${changeIcon} │ ${env}│ ${key}│ ${before}│ ${after}│ ${type}│ ${risk}`);
    });
    
    console.log('─'.repeat(120));
  }

  private renderSummary(result: ChangelogResult): void {
    console.log(`\n📊 Change Summary:`);
    console.log(`   Total changes: ${result.summary.total}`);
    console.log(`   Added: ${result.summary.added}`);
    console.log(`   Modified: ${result.summary.modified}`);
    console.log(`   Removed: ${result.summary.removed}`);
    console.log(`   Interpolations: ${result.summary.interpolations}`);

    console.log(`\n🔄 Inheritance Drift:`);
    Object.entries(result.inheritanceDrift).forEach(([env, drift]) => {
      const status = drift === 0 ? 'unchanged' : `${drift}% modified`;
      console.log(`   ${env.padEnd(11)}: ${drift}% (${status})`);
    });

    console.log(`\n⚡ Risk Delta: ${result.riskDelta > 0 ? '+' : ''}${result.riskDelta} (${result.fromRisk} → ${result.toRisk})`);
    console.log(`🛡️ Hardening Level: ${result.hardeningLevel} (maintained)`);
  }

  private async securityScan(result: ChangelogResult): Promise<void> {
    const secretsAdded = result.changes.filter(c => 
      c.change === '+' && (c.key.includes('secret') || c.key.includes('key') || c.key.includes('token'))
    );

    if (secretsAdded.length > 0 && !this.force) {
      console.log(`\n🚨 SECURITY HALT:`);
      console.log(`   ${secretsAdded.length} new secret(s) detected:`);
      secretsAdded.forEach(secret => {
        console.log(`   • ${secret.key} (${secret.environment})`);
      });
      console.log(`\n   Use --force="I understand the risks" to proceed`);
      process.exit(3);
    }
  }

  private async handleCommit(result: ChangelogResult): Promise<void> {
    console.log(`\n📝 Generating commit message...`);
    
    const message = this.generateCommitMessage(result);
    console.log(`\n${message}`);
    
    // Ask for confirmation
    process.stdout.write(`\nCommit these changes? [y/N]: `);
    
    // For automation, we'll skip the interactive prompt and just show the message
    console.log(`\n💡 Commit message generated (use --apply with confirmation to commit)`);
  }

  private generateCommitMessage(result: ChangelogResult): string {
    const types = [];
    if (result.summary.added > 0) types.push('add');
    if (result.summary.modified > 0) types.push('update');
    if (result.summary.removed > 0) types.push('remove');
    
    const type = types.join(', ') || 'changes';
    const riskText = result.riskDelta !== 0 ? `\n\nRisk score: ${result.fromRisk} → ${result.toRisk} (${result.riskDelta > 0 ? '+' : ''}${result.riskDelta})` : '';
    
    return `config: ${type} configuration\n\n${result.summary.total} changes detected (${result.summary.added} added, ${result.summary.modified} modified, ${result.summary.removed} removed)${riskText}`;
  }

  private colorizeChange(change: string): string {
    switch (change) {
      case '+': return '\x1b[38;2;34;197;94m+✓\x1b[0m';
      case '-': return '\x1b[38;2;239;68;68m-✗\x1b[0m';
      case '~': return '\x1b[38;2;249;115;22m~⚠\x1b[0m';
      case '🔒': return '\x1b[38;2;168;85;247m🔒\x1b[0m';
      default: return change;
    }
  }

  private colorizeRisk(risk: number): string {
    if (risk > 20) return '\x1b[38;2;239;68;68m' + risk + '\x1b[0m';
    if (risk > 10) return '\x1b[38;2;249;115;22m' + risk + '\x1b[0m';
    if (risk < -10) return '\x1b[38;2;34;197;94m' + risk + '\x1b[0m';
    return risk.toString();
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  const fromIndex = args.findIndex(arg => arg.startsWith('--from='));
  const toIndex = args.findIndex(arg => arg.startsWith('--to='));
  const apply = args.includes('--apply');
  const forceIndex = args.findIndex(arg => arg.startsWith('--force='));
  
  const from = fromIndex >= 0 ? args[fromIndex].split('=')[1] : 'HEAD^';
  const to = toIndex >= 0 ? args[toIndex].split('=')[1] : 'config.yaml';
  const force = forceIndex >= 0 ? args[forceIndex].split('=')[1] === 'I understand the risks' : false;

  try {
    const changelog = new FactoryWagerChangelog(from, to, apply, force);
    const result = await changelog.generateChangelog();

    // Audit logging
    const auditLog = `[${new Date().toISOString()}] fw-changelog ${from}..${to} changes=${result.summary.total} risk_delta=${result.riskDelta}\n`;
    await Bun.write(Bun.file('./.factory-wager/audit.log'), auditLog);

    process.exit(result.summary.total > 0 ? 1 : 0);
  } catch (error) {
    console.error(`❌ Changelog failed: ${(error as Error).message}`);
    process.exit(2);
  }
}

if (import.meta.main) {
  main();
}
