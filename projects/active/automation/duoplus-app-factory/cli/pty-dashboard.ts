/**
 * PTYNebulaDashboard - Security-Focused Terminal Dashboard
 * 
 * Real-time security monitoring and automated guard generation for Nebula-Flow
 * 
 * @version 3.6.0
 * @author DuoPlus Team
 * @license MIT
 */

import { SecurityAuditor, UnguardedSecretReport, GuardTemplate } from '../src/services/security-auditor';
import { NebulaFlowOrchestrator } from '../src/nebula/orchestrator';
import { GuardRecord } from '../src/nebula/orchestrator';
import { stdin } from 'process';

export class PTYNebulaDashboard {
  private terminal: Bun.Terminal;
  private auditor: SecurityAuditor;
  private orchestrator: NebulaFlowOrchestrator;

  constructor(terminal: Bun.Terminal) {
    this.terminal = terminal;
    this.auditor = new SecurityAuditor();
    this.orchestrator = new NebulaFlowOrchestrator();
  }

  /**
   * Render real-time security alerts for unguarded critical patterns
   */
  async renderRealTimeAlerts() {
    const auditor = new SecurityAuditor();
    const unguarded = await auditor.findUnguardedCritical();
    
    if (unguarded.length > 0) {
      this.terminal.write('\n\x1b[41m🚨 CRITICAL SECURITY ALERTS 🚨\x1b[0m\n');
      
      unguarded.forEach((report, index) => {
        const { secret, patterns, riskScore } = report;
        
        this.terminal.write(
          `\n\x1b[1;31m${index + 1}. ${secret.name}\x1b[0m ` +
          `(Risk: ${riskScore}/10)\n` +
          `  Used in ${patterns.length} unguarded critical patterns:\n`
        );
        
        patterns.forEach(p => {
          this.terminal.write(`  • ${p.group}: \x1b[33m${p.pattern.slice(0, 60)}...\x1b[0m\n`);
        });
      });
      
      this.terminal.write('\n\x1b[33mRun "g" to generate guards\x1b[0m\n');
    } else {
      this.terminal.write('\n\x1b[32m✓ No critical security alerts found\x1b[0m\n');
    }
  }

  /**
   * Handle guard generation command with interactive PTY interface
   */
  async handleGuardCommand() {
    this.terminal.write('\x1b[36mGenerating runtime guards...\x1b[0m\n');
    
    const auditor = new SecurityAuditor();
    const unguarded = await auditor.findUnguardedCritical();
    
    if (unguarded.length === 0) {
      this.terminal.write('\x1b[32m✓ No unguarded critical patterns found\x1b[0m\n');
      return;
    }
    
    // Generate guard templates
    const guards = auditor.generateGuardsForUnguarded(unguarded);
    
    // Create guard files
    await this.writeGuardFiles(guards);
    
    // Update policies
    await this.updateGroupPolicies(guards);
    
    this.terminal.write(`\x1b[32m✓ Generated ${guards.length} guards for ${unguarded.length} secrets\x1b[0m\n`);
    
    // Show auto-fix report
    this.showAutoFixReport(unguarded, guards);
  }

  /**
   * Write guard template files to the nebula configuration
   */
  private async writeGuardFiles(guards: GuardTemplate[]): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const guardDir = `nebula/guards/${timestamp}`;
    
    // Create directory
    await Bun.write(`${guardDir}/.gitkeep`, '');
    
    for (const guard of guards) {
      const filename = `${guardDir}/guard_${guard.id}.ts`;
      const content = `/**
 * Auto-generated guard for ${guard.metadata.secretNames.join(', ')}
 * Risk Level: ${guard.metadata.riskLevel}
 * Created: ${guard.metadata.createdAt}
 * Group: ${guard.group}
 * Priority: ${guard.priority}
 */

${guard.implementation}

// Guard metadata
export const guardMetadata = {
  id: '${guard.id}',
  patternHash: '${guard.patternHash}',
  pattern: '${guard.pattern}',
  bunFeatures: ${JSON.stringify(guard.bunFeatures, null, 2)},
  metadata: ${JSON.stringify(guard.metadata, null, 2)}
};
`;
      
      await Bun.write(filename, content);
      this.terminal.write(`  \x1b[36m→ Created\x1b[0m ${filename}\n`);
    }
  }

  /**
   * Update group policies with new guard references
   */
  private async updateGroupPolicies(guards: GuardTemplate[]): Promise<void> {
    const policyUpdates: Record<string, string[]> = {};
    
    // Group guards by their target group
    guards.forEach(guard => {
      if (!policyUpdates[guard.group]) {
        policyUpdates[guard.group] = [];
      }
      policyUpdates[guard.group].push(guard.id);
    });
    
    // Update each group's policy configuration
    for (const [group, guardIds] of Object.entries(policyUpdates)) {
      const policyFile = `nebula/groups/${group}/policy.toml`;
      
      try {
        const existingContent = await Bun.file(policyFile).text();
        const updatedContent = this.appendGuardReferences(existingContent, guardIds);
        await Bun.write(policyFile, updatedContent);
        this.terminal.write(`  \x1b[32m→ Updated\x1b[0m ${group} policy\n`);
      } catch (error) {
        // Create new policy file if it doesn't exist
        const newContent = this.generateNewPolicy(guardIds, group);
        await Bun.write(policyFile, newContent);
        this.terminal.write(`  \x1b[32m→ Created\x1b[0m ${group} policy\n`);
      }
    }
  }

  /**
   * Append guard references to existing policy file
   */
  private appendGuardReferences(content: string, guardIds: string[]): string {
    const guardSection = `\n# Auto-generated guards ${new Date().toISOString()}
[guards]
references = ${JSON.stringify(guardIds, null, 2)}
auto_generated = true
`;
    
    // Check if guards section already exists
    if (content.includes('[guards]')) {
      return content.replace(
        /\[guards\][\s\S]*?(?=\n\[|\n#|$)/,
        guardSection.trim()
      );
    }
    
    return content + guardSection;
  }

  /**
   * Generate a new policy file for a group
   */
  private generateNewPolicy(guardIds: string[], group: string): string {
    return `# Nebula-Flow Policy for ${group}
# Auto-generated by PTYNebulaDashboard

[group]
name = "${group}"
risk_level = "critical"

[guards]
references = ${JSON.stringify(guardIds, null, 2)}
auto_generated = true
enforcement = "strict"

[security]
audit_frequency = "realtime"
alert_threshold = 8.5
auto_remediate = false

# Created: ${new Date().toISOString()}
`;
  }

  /**
   * Show detailed auto-fix report after guard generation
   */
  private showAutoFixReport(unguarded: UnguardedSecretReport[], guards: GuardTemplate[]): void {
    this.terminal.write('\n\x1b[44m📋 AUTO-FIX REPORT\x1b[0m\n');
    
    // Summary
    const totalPatterns = unguarded.reduce((sum, r) => sum + r.patterns.length, 0);
    this.terminal.write(`\n\x1b[1mSummary:\x1b[0m\n`);
    this.terminal.write(`  Secrets protected: ${unguarded.length}\n`);
    this.terminal.write(`  Patterns guarded: ${totalPatterns}\n`);
    this.terminal.write(`  Guard files created: ${guards.length}\n`);
    
    // Detailed breakdown
    this.terminal.write(`\n\x1b[1mDetailed Breakdown:\x1b[0m\n`);
    
    unguarded.forEach((report, index) => {
      this.terminal.write(`\n${index + 1}. \x1b[1m${report.secret.name}\x1b[0m (Risk: ${report.riskScore}/10)\n`);
      
      report.patterns.forEach(pattern => {
        const guard = guards.find(g => g.patternHash === pattern.hash);
        if (guard) {
          this.terminal.write(`   ✓ \x1b[32m${pattern.group}\x1b[0m: Guard ${guard.id} created\n`);
          this.terminal.write(`     Pattern: \x1b[90m${pattern.pattern.slice(0, 50)}...\x1b[0m\n`);
        }
      });
      
      // Recommendations
      if (report.recommendations.length > 0) {
        this.terminal.write(`   \x1b[33mRecommendations:\x1b[0m\n`);
        report.recommendations.forEach(rec => {
          this.terminal.write(`     • ${rec}\n`);
        });
      }
    });
    
    // Next steps
    this.terminal.write(`\n\x1b[1mNext Steps:\x1b[0m\n`);
    this.terminal.write(`  1. Review generated guards in nebula/guards/\n`);
    this.terminal.write(`  2. Update group policies as needed\n`);
    this.terminal.write(`  3. Run \x1b[36mnebula verify\x1b[0m to validate guards\n`);
    this.terminal.write(`  4. Deploy with \x1b[36mnebula deploy\x1b[0m\n`);
    
    this.terminal.write(`\n\x1b[32m✓ Security hardening complete!\x1b[0m\n`);
  }

  /**
   * Main dashboard loop with security monitoring
   */
  async start(): Promise<void> {
    this.terminal.write('\n\x1b[44m🛡️  PTYNebula Security Dashboard\x1b[0m\n');
    this.terminal.write('Real-time security monitoring and guard generation\n\n');
    
    // Initial security scan
    await this.renderRealTimeAlerts();
    
    // Setup command handler
    this.setupCommandHandler();
  }

  /**
   * Setup input handler for interactive commands
   */
  private setupCommandHandler(): void {
    if (stdin.isTTY) {
      stdin.setRawMode(true);
      stdin.resume();
      stdin.setEncoding('utf8');
    }
    
    stdin.on('data', async (key: string) => {
      // Handle Ctrl+C
      if (key === '\u0003') {
        this.terminal.write('\n👋 Exiting security dashboard...\n');
        process.exit(0);
        return;
      }
      
      const command = key.trim();
      
      switch (command) {
        case 'g':
        case 'G':
          await this.handleGuardCommand();
          break;
          
        case 's':
        case 'S':
          await this.renderRealTimeAlerts();
          break;
          
        case 'c':
        case 'C':
          this.terminal.write('\x1b[2J\x1b[H');
          break;
          
        case 'h':
        case 'H':
          this.showHelp();
          break;
          
        case 'q':
        case 'Q':
          this.terminal.write('\n👋 Exiting security dashboard...\n');
          process.exit(0);
          break;
      }
    });
  }

  /**
   * Show help menu
   */
  private showHelp(): void {
    this.terminal.write('\n\x1b[1mAvailable Commands:\x1b[0m\n');
    this.terminal.write('  \x1b[36mg\x1b[0m  - Generate guards for unguarded patterns\n');
    this.terminal.write('  \x1b[36ms\x1b[0m  - Run real-time security scan\n');
    this.terminal.write('  \x1b[36mc\x1b[0m  - Clear screen\n');
    this.terminal.write('  \x1b[36mh\x1b[0m  - Show this help\n');
    this.terminal.write('  \x1b[36mq\x1b[0m  - Exit dashboard\n');
  }
}

/**
 * CLI entry point for PTYNebulaDashboard
 */
if (import.meta.main) {
  const proc = Bun.spawn(["bash"], {
    terminal: {
      cols: process.stdout.columns,
      rows: process.stdout.rows,
      data: (terminal, data) => {
        process.stdout.write(data);
      },
    },
    env: process.env,
  });

  // Ensure terminal is defined
  if (!proc.terminal) {
    console.error("Failed to create terminal");
    process.exit(1);
  }

  const dashboard = new PTYNebulaDashboard(proc.terminal);
  dashboard.start().catch(console.error);
}