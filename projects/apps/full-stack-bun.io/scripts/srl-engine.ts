#!/usr/bin/env bun
/**
 * SRL Engine - Semantic Rule Language Parser & Executor
 * SRL.*.RULE - IF/THEN + OBSERVE/REACT + versioned audit trail
 */

import { readFileSync, readdirSync, existsSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { spawn } from "bun";

interface SRLRule {
  id: string;
  name: string;
  version: string;
  category: string;
  conditions: SRLCondition[];
  actions: SRLAction[];
  observe: SRLObserve[];
  react: SRLReact[];
  auditTrail: SRLAuditEntry[];
  enabled: boolean;
  abTest?: SRLABTest;
}

interface SRLCondition {
  type: 'AND' | 'OR';
  conditions: string[];
  operator?: string;
  value?: any;
}

interface SRLAction {
  action: string;
  parameters?: Record<string, any>;
}

interface SRLObserve {
  pattern?: string;
  file_pattern?: string;
  exclude_pattern?: string;
  change_type?: string[];
  metric_baseline?: string;
  monitoring_window?: string;
}

interface SRLReact {
  action: string;
  alternative?: string;
  deadline?: string;
  approval?: string;
  monitoring?: string;
  alert?: string;
  rollback?: string;
}

interface SRLAuditEntry {
  version: string;
  date: string;
  changes: string;
  author?: string;
}

interface SRLABTest {
  enabled: boolean;
  variantA: string;
  variantB: string;
  trafficSplit: number; // percentage for variant A
  metrics: string[];
  duration: string;
}

class SRLEngine {
  private rulesPath: string;
  private activeRules: Map<string, SRLRule> = new Map();
  private abTests: Map<string, SRLABTest> = new Map();

  constructor() {
    this.rulesPath = join(process.cwd(), '.cursor', 'rules');
    this.loadRules();
  }

  // Parse SRL rule from markdown content
  private parseSRLRule(content: string, filename: string): SRLRule[] {
    const rules: SRLRule[] = [];
    const ruleBlocks = content.match(/```srl[\s\S]*?```/g) || [];

    for (const block of ruleBlocks) {
      const ruleContent = block.replace(/```\s*srl\s*/, '').replace(/```\s*$/, '');
      const rule = this.parseRuleBlock(ruleContent, filename);
      if (rule) {
        rules.push(rule);
      }
    }

    return rules;
  }

  private parseRuleBlock(content: string, filename: string): SRLRule | null {
    const lines = content.trim().split('\n');
    let currentSection = '';
    let rule: Partial<SRLRule> = {};

    for (const line of lines) {
      const trimmed = line.trim();

      if (trimmed.startsWith('RULE ')) {
        const match = trimmed.match(/RULE (\w+) v([\d.]+)/);
        if (match) {
          rule.id = match[1];
          rule.version = match[2];
          rule.name = match[1].replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
      } else if (trimmed === 'WHEN:') {
        currentSection = 'conditions';
        rule.conditions = [];
      } else if (trimmed === 'THEN:') {
        currentSection = 'actions';
        rule.actions = [];
      } else if (trimmed === 'OBSERVE:') {
        currentSection = 'observe';
        rule.observe = [];
      } else if (trimmed === 'REACT:') {
        currentSection = 'react';
        rule.react = [];
      } else if (trimmed === 'AUDIT_TRAIL:') {
        currentSection = 'audit';
        rule.auditTrail = [];
      } else if (currentSection && trimmed.startsWith('- ')) {
        const item = trimmed.substring(2);
        this.parseSectionItem(currentSection, item, rule);
      }
    }

    if (rule.id && rule.version) {
      const category = filename.replace('.srl.md', '').toUpperCase();
      return {
        ...rule,
        category,
        enabled: true
      } as SRLRule;
    }

    return null;
  }

  private parseSectionItem(section: string, item: string, rule: Partial<SRLRule>) {
    switch (section) {
      case 'conditions':
        if (rule.conditions) {
          rule.conditions.push(this.parseCondition(item));
        }
        break;
      case 'actions':
        if (rule.actions) {
          rule.actions.push(this.parseAction(item));
        }
        break;
      case 'observe':
        if (rule.observe) {
          rule.observe.push(this.parseObserve(item));
        }
        break;
      case 'react':
        if (rule.react) {
          rule.react.push(this.parseReact(item));
        }
        break;
      case 'audit':
        if (rule.auditTrail) {
          rule.auditTrail.push(this.parseAudit(item));
        }
        break;
    }
  }

  private parseCondition(item: string): SRLCondition {
    // Parse conditions like "code_change contains SQL_INJECTION"
    const match = item.match(/(\w+)\s+(\w+)\s+(.+)/);
    if (match) {
      return {
        type: 'AND',
        conditions: [item],
        operator: match[2],
        value: match[3]
      };
    }
    return { type: 'AND', conditions: [item] };
  }

  private parseAction(item: string): SRLAction {
    // Parse actions like "BLOCK_COMMIT \"message\"" or "NOTIFY_SECURITY_TEAM severity=critical"
    const match = item.match(/(\w+)(?:\s+"([^"]+)")?(?:\s+(.+))?/);
    if (match) {
      const [, action, message, params] = match;
      const parameters: Record<string, any> = {};

      if (message) parameters.message = message;
      if (params) {
        // Parse key=value pairs
        params.split(/\s+/).forEach(param => {
          const [key, value] = param.split('=');
          if (key && value) {
            parameters[key] = value;
          }
        });
      }

      return { action, parameters };
    }
    return { action: item };
  }

  private parseObserve(item: string): SRLObserve {
    const observe: SRLObserve = {};

    if (item.includes('file_pattern:')) {
      observe.file_pattern = item.split('file_pattern:')[1].trim();
    } else if (item.includes('exclude_pattern:')) {
      observe.exclude_pattern = item.split('exclude_pattern:')[1].trim();
    } else if (item.includes('change_type:')) {
      observe.change_type = item.split('change_type:')[1].trim().replace(/[\[\]]/g, '').split(',');
    }

    return observe;
  }

  private parseReact(item: string): SRLReact {
    const react: SRLReact = {};

    if (item.includes('action:')) {
      react.action = item.split('action:')[1].trim();
    } else if (item.includes('alternative:')) {
      react.alternative = item.split('alternative:')[1].trim();
    } else if (item.includes('deadline:')) {
      react.deadline = item.split('deadline:')[1].trim();
    }

    return react;
  }

  private parseAudit(item: string): SRLAuditEntry {
    // Parse audit entries like "- v2.1.0: Added new feature"
    const match = item.match(/- v([\d.]+):\s*(.+)/);
    if (match) {
      return {
        version: match[1],
        date: new Date().toISOString().split('T')[0],
        changes: match[2]
      };
    }
    return {
      version: 'unknown',
      date: new Date().toISOString().split('T')[0],
      changes: item
    };
  }

  // Load all SRL rules from markdown files
  loadRules(): void {
    if (!existsSync(this.rulesPath)) {
      console.warn('SRL rules directory not found:', this.rulesPath);
      return;
    }

    const files = readdirSync(this.rulesPath).filter(f => f.endsWith('.srl.md'));

    for (const file of files) {
      try {
        const content = readFileSync(join(this.rulesPath, file), 'utf-8');
        const rules = this.parseSRLRule(content, file);

        for (const rule of rules) {
          this.activeRules.set(rule.id, rule);
        }
      } catch (error) {
        console.warn(`Failed to load SRL rules from ${file}:`, error.message);
      }
    }

    console.log(`Loaded ${this.activeRules.size} SRL rules`);
  }

  // Execute rules against a context
  async executeRules(context: any): Promise<SRLAction[]> {
    const triggeredActions: SRLAction[] = [];

    for (const rule of this.activeRules.values()) {
      if (!rule.enabled) continue;

      // Check if rule conditions are met
      if (this.evaluateConditions(rule.conditions, context)) {
        // Apply A/B testing if enabled
        if (rule.abTest?.enabled) {
          const variant = this.selectABVariant(rule.id, rule.abTest);
          if (variant === 'B') {
            // Apply variant B logic
            triggeredActions.push(...this.getVariantBActions(rule));
            continue;
          }
        }

        // Execute rule actions
        triggeredActions.push(...rule.actions);
      }
    }

    return triggeredActions;
  }

  private evaluateConditions(conditions: SRLCondition[], context: any): boolean {
    // Simple condition evaluation - in practice this would be more sophisticated
    for (const condition of conditions) {
      for (const cond of condition.conditions) {
        if (cond.includes('contains') && context.content) {
          const [, pattern] = cond.split('contains');
          if (context.content.includes(pattern.trim())) {
            return true;
          }
        }
        // Add more condition types as needed
      }
    }
    return false;
  }

  private selectABVariant(ruleId: string, abTest: SRLABTest): 'A' | 'B' {
    // Simple random selection based on traffic split
    const random = Math.random() * 100;
    return random < abTest.trafficSplit ? 'A' : 'B';
  }

  private getVariantBActions(rule: SRLRule): SRLAction[] {
    // For A/B testing, variant B might have different actions
    return rule.actions.map(action => ({
      ...action,
      parameters: { ...action.parameters, variant: 'B' }
    }));
  }

  // Enable/disable rules with versioning
  async enableRule(ruleId: string, version?: string, abTest?: boolean): Promise<boolean> {
    const rule = this.activeRules.get(ruleId);
    if (!rule) return false;

    if (version && rule.version !== version) {
      // Rollback to specific version
      rule.version = version;
      rule.enabled = true;
    } else {
      rule.enabled = true;
    }

    if (abTest && rule.abTest) {
      rule.abTest.enabled = true;
    }

    this.saveRuleState(rule);
    return true;
  }

  async disableRule(ruleId: string): Promise<boolean> {
    const rule = this.activeRules.get(ruleId);
    if (!rule) return false;

    rule.enabled = false;
    this.saveRuleState(rule);
    return true;
  }

  private saveRuleState(rule: SRLRule): void {
    // In practice, this would save to a database or configuration file
    console.log(`Rule ${rule.id} ${rule.enabled ? 'enabled' : 'disabled'} (v${rule.version})`);
  }

  // Get rules by category or pattern
  getRules(category?: string): SRLRule[] {
    const rules = Array.from(this.activeRules.values());

    if (category) {
      return rules.filter(rule => rule.category === category.toUpperCase());
    }

    return rules;
  }

  // Generate audit report for rule changes
  generateAuditReport(): string {
    let report = '# SRL Rules Audit Report\n\n';

    for (const rule of this.activeRules.values()) {
      report += `## Rule: ${rule.name} (${rule.id})\n\n`;
      report += `- **Version**: ${rule.version}\n`;
      report += `- **Category**: ${rule.category}\n`;
      report += `- **Status**: ${rule.enabled ? 'Enabled' : 'Disabled'}\n`;
      report += `- **Conditions**: ${rule.conditions.length}\n`;
      report += `- **Actions**: ${rule.actions.length}\n\n`;

      if (rule.auditTrail && rule.auditTrail.length > 0) {
        report += '### Audit Trail\n\n';
        for (const entry of rule.auditTrail) {
          report += `- **v${entry.version}** (${entry.date}): ${entry.changes}\n`;
        }
        report += '\n';
      }

      if (rule.abTest) {
        report += '### A/B Test\n\n';
        report += `- **Enabled**: ${rule.abTest.enabled}\n`;
        report += `- **Traffic Split**: ${rule.abTest.trafficSplit}% / ${(100 - rule.abTest.trafficSplit)}%\n`;
        report += `- **Duration**: ${rule.abTest.duration}\n`;
        report += `- **Metrics**: ${rule.abTest.metrics.join(', ')}\n\n`;
      }
    }

    return report;
  }
}

// CLI interface
async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
SRL Engine - Semantic Rule Language v1.0.0

Usage:
  bun run scripts/srl-engine.ts <command> [options]

Commands:
  list                    List all SRL rules
  enable <rule-id>        Enable a rule
  disable <rule-id>       Disable a rule
  rollback <rule-id> <version>  Rollback rule to specific version
  ab-test <rule-id>       Enable A/B testing for rule
  audit                   Generate audit report
  execute <context>       Execute rules against context (JSON)

Examples:
  bun run scripts/srl-engine.ts list
  bun run scripts/srl-engine.ts enable critical_vulnerability_detection
  bun run scripts/srl-engine.ts rollback code_complexity_monitor v1.5.0
  bun run scripts/srl-engine.ts audit
`);
    return;
  }

  const engine = new SRLEngine();

  try {
    switch (command) {
      case 'list':
        const category = args[0];
        const rules = engine.getRules(category);
        console.log(`SRL Rules ${category ? `(${category})` : ''}:`);
        rules.forEach(rule => {
          console.log(`  ${rule.id} v${rule.version} - ${rule.name} [${rule.enabled ? 'ENABLED' : 'DISABLED'}]`);
        });
        break;

      case 'enable':
        const enableId = args[0];
        const enabled = await engine.enableRule(enableId);
        console.log(enabled ? `✅ Rule ${enableId} enabled` : `❌ Rule ${enableId} not found`);
        break;

      case 'disable':
        const disableId = args[0];
        const disabled = await engine.disableRule(disableId);
        console.log(disabled ? `✅ Rule ${disableId} disabled` : `❌ Rule ${disableId} not found`);
        break;

      case 'rollback':
        const rollbackId = args[0];
        const version = args[1];
        if (!version) {
          console.error('Usage: rollback <rule-id> <version>');
          process.exit(1);
        }
        const rolledBack = await engine.enableRule(rollbackId, version);
        console.log(rolledBack ? `✅ Rule ${rollbackId} rolled back to v${version}` : `❌ Rule rollback failed`);
        break;

      case 'ab-test':
        const abTestId = args[0];
        const abEnabled = await engine.enableRule(abTestId, undefined, true);
        console.log(abEnabled ? `✅ A/B testing enabled for ${abTestId}` : `❌ Rule not found or no A/B test configured`);
        break;

      case 'audit':
        console.log(engine.generateAuditReport());
        break;

      case 'execute':
        const contextJson = args[0];
        if (!contextJson) {
          console.error('Usage: execute <context-json>');
          process.exit(1);
        }
        const context = JSON.parse(contextJson);
        const actions = await engine.executeRules(context);
        console.log('Triggered Actions:');
        actions.forEach(action => {
          console.log(`  ${action.action}:`, action.parameters || {});
        });
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('SRL Engine error:', error.message);
    process.exit(1);
  }
}

export { SRLEngine };
export type { SRLRule, SRLCondition, SRLAction };

// Run CLI if called directly
if (import.meta.main) {
  main();
}
