#!/usr/bin/env bun
/**
 * FactoryWager Configuration Changelog with Reality Integration
 * Semantic diff analysis enhanced with infrastructure reality awareness
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { join } from 'path';
import { RealityCheck } from './config/reality-config';

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

interface RealityAwareChangelog {
  changelog: ChangelogResult;
  reality: {
    mode: "LIVE" | "MIXED" | "SIMULATED";
    r2: string;
    mcp: { installed: number; total: number };
    secrets: { real: number; total: number };
  };
  deployment: {
    safe_to_apply: boolean;
    reality_warnings: string[];
    recommendations: string[];
  };
  security: {
    secrets_detected: boolean;
    interpolations_added: number;
    requires_force: boolean;
  };
}

class RealityAwareChangelog {
  private fromRef: string;
  private toRef: string;
  private apply: boolean;
  private force: boolean;
  private reportsDir = "./.factory-wager/reports";

  constructor(fromRef: string, toRef: string, apply: boolean = false, force: boolean = false) {
    this.fromRef = fromRef;
    this.toRef = toRef;
    this.apply = apply;
    this.force = force;
    
    // Ensure reports directory exists
    if (!existsSync(this.reportsDir)) {
      execSync(`mkdir -p ${this.reportsDir}`, { stdio: 'inherit' });
    }
  }

  async generateChangelog(): Promise<RealityAwareChangelog> {
    console.log("📋 FactoryWager Reality-Aware Configuration Changelog");
    console.log("=" .repeat(60));
    console.log(`From: ${this.fromRef}`);
    console.log(`To: ${this.toRef}`);
    console.log(`Time: ${new Date().toISOString()}`);
    console.log("");

    // Phase 1: Reality Check
    console.log("🌐 Phase 1: Infrastructure Reality Assessment");
    console.log("============================================");

    const realityStatus = await RealityCheck.overall.getRealityStatus();
    
    console.log(`📊 Reality Mode: ${realityStatus.overall}`);
    console.log(`   R2 Storage: ${realityStatus.r2.mode}`);
    console.log(`   MCP Servers: ${realityStatus.mcp.installed}/${realityStatus.mcp.total}`);
    console.log(`   Secrets: ${realityStatus.secrets.real}/${realityStatus.secrets.total}`);
    console.log("");

    // Phase 2: Load Configurations
    console.log("📂 Phase 2: Configuration Loading");
    console.log("===============================");

    const fromConfig = this.loadConfiguration(this.fromRef);
    const toConfig = this.loadConfiguration(this.toRef);
    
    console.log(`✅ From configuration loaded: ${this.fromRef}`);
    console.log(`✅ To configuration loaded: ${this.toRef}`);
    console.log("");

    // Phase 3: Generate Semantic Diff
    console.log("🔍 Phase 3: Semantic Diff Analysis");
    console.log("=================================");

    const changelog = this.generateSemanticDiff(fromConfig, toConfig);
    
    this.displayChangelogTable(changelog);
    this.displayInheritanceDrift(changelog);
    console.log("");

    // Phase 4: Security Scan
    console.log("🔒 Phase 4: Security Analysis");
    console.log("===========================");

    const securityAnalysis = this.performSecurityScan(changelog);
    
    if (securityAnalysis.secrets_detected && !this.force) {
      console.log("🚨 SECURITY HALT: Secrets detected in changes!");
      console.log("   Use --force to proceed (requires explicit acknowledgment)");
      console.log("   Or review changes before applying");
      process.exit(3);
    }

    console.log(`🔐 Secrets detected: ${securityAnalysis.secrets_detected ? 'YES' : 'NO'}`);
    console.log(`🔑 New interpolations: ${securityAnalysis.interpolations_added}`);
    console.log("");

    // Phase 5: Reality-Integrated Assessment
    console.log("🌐 Phase 5: Reality-Integrated Assessment");
    console.log("=======================================");

    const deploymentAssessment = this.assessDeploymentSafety(changelog, realityStatus, securityAnalysis);
    
    console.log(`🚀 Safe to apply: ${deploymentAssessment.safe_to_apply ? '✅ YES' : '❌ NO'}`);
    
    if (deploymentAssessment.reality_warnings.length > 0) {
      console.log("⚠️  Reality warnings:");
      deploymentAssessment.reality_warnings.forEach(warning => console.log(`      • ${warning}`));
    }
    
    if (deploymentAssessment.recommendations.length > 0) {
      console.log("💡 Recommendations:");
      deploymentAssessment.recommendations.forEach(rec => console.log(`      • ${rec}`));
    }
    console.log("");

    // Phase 6: Apply Changes (if requested)
    if (this.apply) {
      await this.applyChanges(changelog, deploymentAssessment);
    }

    // Phase 7: Generate Report
    const realityAwareChangelog: RealityAwareChangelog = {
      changelog,
      reality: {
        mode: realityStatus.overall,
        r2: realityStatus.r2.mode,
        mcp: {
          installed: realityStatus.mcp.installed,
          total: realityStatus.mcp.total
        },
        secrets: {
          real: realityStatus.secrets.real,
          total: realityStatus.secrets.total
        }
      },
      deployment: deploymentAssessment,
      security: securityAnalysis
    };

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportFile = join(this.reportsDir, `fw-changelog-reality-${timestamp}.json`);
    
    writeFileSync(reportFile, JSON.stringify(realityAwareChangelog, null, 2));
    console.log(`📄 Reality-aware changelog saved: ${reportFile}`);

    return realityAwareChangelog;
  }

  private loadConfiguration(ref: string): string {
    try {
      if (ref.includes('/') || ref.endsWith('.yaml') || ref.endsWith('.yml')) {
        // Load from file path
        return readFileSync(ref, 'utf8');
      } else {
        // Load from git ref
        return execSync(`git show ${ref}:config.yaml`, { encoding: 'utf8' });
      }
    } catch (error) {
      console.error(`❌ Failed to load configuration from ${ref}:`);
      console.error(`   ${(error as Error).message}`);
      process.exit(2);
    }
  }

  private generateSemanticDiff(fromConfig: string, toConfig: string): ChangelogResult {
    // Mock implementation - in real system this would use the parser-v45
    const changes: ConfigDiff[] = [
      {
        change: '~',
        environment: 'production',
        key: 'api.timeout',
        before: '30s',
        after: '45s',
        type: 'string',
        risk: 5
      },
      {
        change: '+',
        environment: 'staging',
        key: 'debug.enabled',
        after: 'true',
        type: 'boolean',
        risk: 10
      },
      {
        change: '🔒',
        environment: 'production',
        key: 'database.password',
        before: '${OLD_DB_PASSWORD}',
        after: '${NEW_DB_PASSWORD}',
        type: 'interpolation',
        risk: 0
      }
    ];

    return {
      changes,
      inheritanceDrift: {
        development: 0,
        staging: 15,
        production: 22
      },
      riskDelta: 5,
      fromRisk: 45,
      toRisk: 50,
      hardeningLevel: 'PRODUCTION',
      summary: {
        total: 3,
        added: 1,
        modified: 1,
        removed: 0,
        interpolations: 1
      }
    };
  }

  private displayChangelogTable(changelog: ChangelogResult): void {
    console.log("📊 Configuration Changes:");
    console.log("┌──────┬───────────┬──────────────────┬──────────────┬──────────────┬─────────┬──────┐");
    console.log("│Change│ Env       │ Key              │ Before       │ After        │ Type    │ Risk │");
    console.log("├──────┼───────────┼──────────────────┼──────────────┼──────────────┼─────────┼──────┤");
    
    changelog.changes.forEach(change => {
      const changeIcon = this.getChangeIcon(change.change);
      const before = change.before || '—';
      const after = change.after || '—';
      
      console.log(`│ ${changeIcon}    │ ${change.environment.padEnd(9)} │ ${change.key.padEnd(16)} │ ${before.padEnd(12)} │ ${after.padEnd(12)} │ ${change.type.padEnd(7)} │ ${change.risk.toString().padEnd(4)} │`);
    });
    
    console.log("└──────┴───────────┴──────────────────┴──────────────┴──────────────┴─────────┴──────┘");
  }

  private getChangeIcon(change: string): string {
    const icons = {
      '+': '\x1b[92m+\x1b[0m',    // Green
      '~': '\x1b[93m~\x1b[0m',    // Yellow
      '-': '\x1b[91m-\x1b[0m',    // Red
      '🔒': '\x1b[95m🔒\x1b[0m'   // Magenta
    };
    return icons[change as keyof typeof icons] || change;
  }

  private displayInheritanceDrift(changelog: ChangelogResult): void {
    console.log("\n📈 Inheritance Drift:");
    Object.entries(changelog.inheritanceDrift).forEach(([env, drift]) => {
      const driftIcon = drift === 0 ? '✅' : drift > 20 ? '🔴' : '🟡';
      console.log(`   ${driftIcon} ${env.padEnd(11)}: ${drift}% (changed)`);
    });
    
    console.log(`\n📊 Risk Delta: ${changelog.riskDelta > 0 ? '+' : ''}${changelog.riskDelta} (${changelog.fromRisk} → ${changelog.toRisk})`);
    console.log(`🛡️  Hardening Level: ${changelog.hardeningLevel}`);
  }

  private performSecurityScan(changelog: ChangelogResult) {
    const secrets_detected = changelog.changes.some(change => change.change === '🔒');
    const interpolations_added = changelog.changes.filter(change => 
      change.type === 'interpolation' && change.change === '+'
    ).length;
    
    return {
      secrets_detected,
      interpolations_added,
      requires_force: secrets_detected && !this.force
    };
  }

  private assessDeploymentSafety(changelog: ChangelogResult, reality: any, security: any) {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    let safeToApply = true;

    // Reality-based safety checks
    if (reality.overall === "SIMULATED") {
      if (changelog.changes.some(c => c.environment === 'production')) {
        warnings.push("Applying production changes in simulation mode");
        recommendations.push("Configure real infrastructure before production changes");
        safeToApply = false;
      }
    }

    if (reality.overall === "MIXED") {
      warnings.push("Mixed reality infrastructure - partial simulation");
      recommendations.push("Complete infrastructure configuration for production");
    }

    // Security-based safety checks
    if (security.secrets_detected && !this.force) {
      safeToApply = false;
    }

    // Risk-based safety checks
    if (changelog.riskDelta > 20) {
      warnings.push(`High risk increase: +${changelog.riskDelta}`);
      safeToApply = false;
    }

    // Configuration-based checks
    const productionChanges = changelog.changes.filter(c => c.environment === 'production');
    if (productionChanges.length > 5) {
      warnings.push(`Many production changes: ${productionChanges.length}`);
      recommendations.push("Consider breaking into smaller commits");
    }

    return {
      safe_to_apply: safeToApply,
      reality_warnings: warnings,
      recommendations
    };
  }

  private async applyChanges(changelog: ChangelogResult, assessment: any): Promise<void> {
    if (!assessment.safe_to_apply) {
      console.log("❌ Cannot apply changes - safety checks failed");
      return;
    }

    console.log("🚀 Phase 6: Apply Changes");
    console.log("========================");

    // Generate semantic commit message
    const commitMessage = this.generateCommitMessage(changelog);
    
    console.log(`📝 Commit message: ${commitMessage}`);
    
    if (!this.apply) {
      return;
    }

    // Interactive confirmation
    if (this.apply) {
      console.log("\nCommit these changes? [y/N]");
      process.stdin.resume();
      process.stdin.setEncoding('utf8');
      
      for await (const chunk of process.stdin) {
        const response = chunk.toString().trim().toLowerCase();
        if (response === 'y' || response === 'yes') {
          try {
            execSync(`git add config.yaml`, { stdio: 'inherit' });
            execSync(`git commit -m "${commitMessage}" --signoff`, { stdio: 'inherit' });
            console.log("✅ Changes committed successfully");
          } catch (error) {
            console.error("❌ Failed to commit changes:", (error as Error).message);
          }
          break;
        } else {
          console.log("❌ Changes reviewed but not committed");
          break;
        }
      }
      
      process.stdin.pause();
    }
  }

  private generateCommitMessage(changelog: ChangelogResult): string {
    const types = {
      'api': 'api',
      'security': 'security', 
      'database': 'db',
      'cache': 'perf',
      'debug': 'chore'
    };

    // Determine primary change type
    const primaryEnv = changelog.changes[0]?.environment || 'unknown';
    let scope = 'config';
    
    // Simple heuristic for scope
    if (changelog.changes.some(c => c.key.includes('api'))) scope = 'api';
    else if (changelog.changes.some(c => c.key.includes('security') || c.key.includes('auth'))) scope = 'security';
    else if (changelog.changes.some(c => c.key.includes('database') || c.key.includes('db'))) scope = 'db';

    const type = changelog.summary.added > 0 ? 'feat' : 'fix';
    const description = `update ${primaryEnv} configuration`;
    
    return `${type}(${scope}): ${description}\n\nRisk score: ${changelog.fromRisk} → ${changelog.toRisk} (${changelog.riskDelta > 0 ? '+' : ''}${changelog.riskDelta})`;
  }
}

// CLI execution
if (import.meta.main) {
  const args = process.argv.slice(2);
  
  let fromRef = 'HEAD^';
  let toRef = 'HEAD';
  let apply = false;
  let force = false;
  
  // Parse arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--from') {
      fromRef = args[++i];
    } else if (arg === '--to') {
      toRef = args[++i];
    } else if (arg === '--apply') {
      apply = true;
    } else if (arg === '--force') {
      force = true;
    } else if (!arg.startsWith('--')) {
      // Positional arguments
      if (fromRef === 'HEAD^') fromRef = arg;
      else if (toRef === 'HEAD') toRef = arg;
    }
  }

  const changelog = new RealityAwareChangelog(fromRef, toRef, apply, force);
  changelog.generateChangelog().catch(error => {
    console.error("❌ Reality-aware changelog failed:", error.message);
    process.exit(1);
  });
}

export { RealityAwareChangelog };
