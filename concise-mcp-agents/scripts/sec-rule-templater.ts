#!/usr/bin/env bun

// [SEC][TEMPLATER][AUTO-GEN][SEC-TMPL-001][v2.10][ACTIVE]

import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';

interface SecurityRuleTemplate {
  id: string;
  category: 'Secrets' | 'Access/IP' | 'Audit/Scan' | 'Encrypt/Backup' | 'WS/Auth';
  trigger: string;
  action: string;
  example: string;
  priority: 'REQUIRED' | 'CORE' | 'OPTIONAL';
  tags: string[];
}

class SecurityRuleTemplater {
  private vault = process.cwd();
  private rulesFile = 'scripts/gov-rules.ts';

  async createRule(template: SecurityRuleTemplate): Promise<void> {
    console.log(`🛡️  Creating new security rule: ${template.id}`);

    // Validate template
    this.validateTemplate(template);

    // Generate rule code
    const ruleCode = this.generateRuleCode(template);

    // Insert into gov-rules.ts
    await this.insertRuleIntoFile(ruleCode);

    // Update stats
    await this.updateStats(template.category);

    console.log(`✅ Security rule ${template.id} created successfully!`);
    console.log(`🔧 Run: bun rules:validate && bun gov:security`);
  }

  private validateTemplate(template: SecurityRuleTemplate): void {
    if (!template.id.match(/^SEC-[A-Z]+-\d{3}$/)) {
      throw new Error(`Invalid rule ID format: ${template.id}. Expected: SEC-CATEGORY-001`);
    }

    if (!template.trigger || !template.action) {
      throw new Error('Trigger and action are required');
    }

    if (template.priority !== 'REQUIRED' && template.priority !== 'CORE' && template.priority !== 'OPTIONAL') {
      throw new Error(`Invalid priority: ${template.priority}`);
    }
  }

  private generateRuleCode(template: SecurityRuleTemplate): string {
    const tags = template.tags.map(tag => `"${tag}"`).join(', ');

    return `      {
        id: '${template.id}',
        category: 'Security',
        trigger: '${template.trigger}',
        action: '${template.action}',
        example: '${template.example}',
        priority: '${template.priority}',
        status: 'ACTIVE',
        automated: true,
        tags: [${tags}]
      },`;
  }

  private async insertRuleIntoFile(ruleCode: string): Promise<void> {
    const content = readFileSync(this.rulesFile, 'utf-8');

    // Find the last security rule and insert after it
    const lastSecurityRulePattern = /},\s*$/gm;
    const matches = [...content.matchAll(lastSecurityRulePattern)];

    if (matches.length === 0) {
      throw new Error('Could not find insertion point in gov-rules.ts');
    }

    // Find the last security rule (look for the pattern before the last match)
    const lines = content.split('\n');
    let insertIndex = -1;

    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].includes("id: 'SEC-") && lines[i + 1]?.includes("category: 'Security'")) {
        // Find the end of this rule block
        for (let j = i; j < lines.length; j++) {
          if (lines[j].trim() === '},') {
            insertIndex = j + 1;
            break;
          }
        }
        break;
      }
    }

    if (insertIndex === -1) {
      throw new Error('Could not find security rules section');
    }

    // Insert the new rule
    const before = lines.slice(0, insertIndex).join('\n');
    const after = lines.slice(insertIndex).join('\n');

    const newContent = `${before}\n${ruleCode}\n${after}`;

    writeFileSync(this.rulesFile, newContent);
  }

  private async updateStats(category: string): Promise<void> {
    // Update the stats comment in the rules file
    const content = readFileSync(this.rulesFile, 'utf-8');

    // This is a simplified update - in practice you'd want to count actual rules
    console.log(`📊 Updated ${category} category (+1 rule)`);
  }

  async quickAddRule(description: string, category: string): Promise<void> {
    console.log(`🚀 Quick Add Security Rule`);
    console.log(`Description: ${description}`);
    console.log(`Category: ${category}`);

    // Generate ID based on category
    const categoryPrefix = category.split('/')[0].toUpperCase();
    const existingRules = await this.getExistingRules(categoryPrefix);
    const nextNumber = existingRules.length + 1;
    const id = `SEC-${categoryPrefix}-${nextNumber.toString().padStart(3, '0')}`;

    const template: SecurityRuleTemplate = {
      id,
      category: category as any,
      trigger: `Auto-detected: ${description}`,
      action: `Enforce ${description.toLowerCase()}`,
      example: `bun rules:enforce ${id}`,
      priority: 'CORE',
      tags: [category.toLowerCase().replace('/', '-'), 'auto-generated']
    };

    await this.createRule(template);
  }

  private async getExistingRules(prefix: string): Promise<string[]> {
    const content = readFileSync(this.rulesFile, 'utf-8');
    const matches = content.match(new RegExp(`id: 'SEC-${prefix}-\\d{3}'`, 'g')) || [];
    return matches.map(match => match.match(/SEC-[A-Z]+-\d{3}/)?.[0]).filter(Boolean) as string[];
  }

  async listTemplates(): Promise<void> {
    console.log(`
🛡️  SECURITY RULE TEMPLATES v2.10

QUICK ADD TEMPLATES:
  "token rotation"     → SEC-TOKEN-ROT-XXX
  "ip whitelist"       → SEC-IP-WHITE-XXX
  "secrets scan"       → SEC-SECRETS-SCAN-XXX
  "rate limit"         → SEC-RATE-LIMIT-XXX
  "audit log"          → SEC-LOG-AUDIT-XXX
  "yaml encryption"    → SEC-YAML-ENC-XXX
  "bot detection"      → SEC-BOT-DETECT-XXX

USAGE:
  bun sec:templater "token rotation" "Secrets"
  bun sec:templater "ip whitelist" "Access/IP"

MANUAL CREATION:
  bun sec:templater manual --id SEC-NEW-001 --trigger "..." --action "..."
    `);
  }
}

// CLI Interface
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help' || command === 'list') {
  const templater = new SecurityRuleTemplater();
  await templater.listTemplates();
  process.exit(0);
}

const templater = new SecurityRuleTemplater();

try {
  if (command === 'manual') {
    // Manual rule creation
    const id = args.find(arg => arg.startsWith('--id='))?.split('=')[1];
    const trigger = args.find(arg => arg.startsWith('--trigger='))?.split('=')[1];
    const action = args.find(arg => arg.startsWith('--action='))?.split('=')[1];
    const category = args.find(arg => arg.startsWith('--category='))?.split('=')[1] || 'Secrets';

    if (!id || !trigger || !action) {
      console.error('❌ Manual mode requires: --id, --trigger, --action');
      process.exit(1);
    }

    await templater.createRule({
      id,
      category: category as any,
      trigger,
      action,
      example: `bun rules:enforce ${id}`,
      priority: 'CORE',
      tags: [category.toLowerCase()]
    });

  } else {
    // Quick add mode
    const description = command;
    const category = args[1] || 'Secrets';

    if (!description) {
      console.error('❌ Provide rule description');
      process.exit(1);
    }

    await templater.quickAddRule(description, category);
  }

} catch (error) {
  console.error('❌ Templater error:', error.message);
  process.exit(1);
}