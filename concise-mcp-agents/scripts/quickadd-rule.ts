#!/usr/bin/env bun

// [RULES][QUICKADD][AUTO][QA-RULE-001][v2.9][ACTIVE]

import { readFileSync, writeFileSync, appendFileSync } from 'fs';
import { join } from 'path';
import { spawn } from 'child_process';

interface QuickAddRule {
  id: string;
  category: 'Security' | 'Ops' | 'Alerts' | 'Git/Deploy' | 'Data' | 'WS/Live' | 'Telegram' | 'Agent' | 'Compliance' | 'Access';
  trigger: string;
  action: string;
  example: string;
  priority: 'REQUIRED' | 'CORE' | 'OPTIONAL';
  automated: boolean;
  tags: string[];
}

class RuleQuickAdd {
  private vault = process.cwd();
  private rulesFile = 'scripts/gov-rules.ts';
  private templatesDir = 'templates';

  async createRuleFromTemplate(templateType: string = 'basic'): Promise<void> {
    console.log(`🛡️  QuickAdd Rule - Template: ${templateType}`);
    console.log('========================================');

    // Get user input for rule details
    const rule = await this.promptRuleDetails();

    // Validate and generate ID
    rule.id = this.generateRuleId(rule.category, rule.trigger);

    // Create rule code
    const ruleCode = this.generateRuleCode(rule);

    // Insert into gov-rules.ts
    await this.insertRuleIntoFile(ruleCode);

    // Create branch and PR
    await this.createBranchAndPR(rule.id, rule.trigger);

    console.log(`✅ Rule ${rule.id} created successfully!`);
    console.log(`🔧 Test: bun rules:enforce ${rule.id}`);
    console.log(`📋 PR: Check GitHub for ${rule.id} branch`);
  }

  private async promptRuleDetails(): Promise<Omit<QuickAddRule, 'id'>> {
    const readline = await import('readline');

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });

    const ask = (question: string): Promise<string> => {
      return new Promise(resolve => rl.question(question, resolve));
    };

    try {
      const category = await ask('Category (Security/Ops/Alerts/Git/Deploy/Data/WS/Live/Telegram/Agent/Compliance/Access): ') as any;
      const trigger = await ask('Trigger (what activates this rule?): ');
      const action = await ask('Action (what should happen?): ');
      const example = await ask('Example (concrete scenario): ');
      const priorityInput = await ask('Priority (REQUIRED/CORE/OPTIONAL): ');
      const automatedInput = await ask('Automated (true/false): ');

      const priority = priorityInput.toUpperCase() as 'REQUIRED' | 'CORE' | 'OPTIONAL';
      const automated = automatedInput.toLowerCase() === 'true';

      // Generate tags based on content
      const tags = this.generateTags(trigger, action, category);

      rl.close();

      return {
        category,
        trigger,
        action,
        example,
        priority,
        automated,
        tags
      };

    } finally {
      rl.close();
    }
  }

  private generateRuleId(category: string, trigger: string): string {
    // Generate ID based on category and trigger keywords
    const categoryPrefix = category.split('/')[0].toUpperCase().substring(0, 3);
    const triggerWords = trigger.toLowerCase().split(' ').slice(0, 2);
    const keyword = triggerWords.map(word => word.substring(0, 3)).join('').toUpperCase();

    // Get next number for this category
    const existingIds = this.getExistingIdsForCategory(categoryPrefix);
    const nextNumber = existingIds.length + 1;

    return `${categoryPrefix}-${keyword}-${nextNumber.toString().padStart(3, '0')}`;
  }

  private getExistingIdsForCategory(prefix: string): string[] {
    try {
      const content = readFileSync(this.rulesFile, 'utf-8');
      const matches = content.match(new RegExp(`id: '${prefix}-[A-Z]+-\\d{3}'`, 'g')) || [];
      return matches.map(match => match.match(new RegExp(`${prefix}-[A-Z]+-\\d{3}`))?.[0]).filter(Boolean) as string[];
    } catch {
      return [];
    }
  }

  private generateTags(trigger: string, action: string, category: string): string[] {
    const tags: string[] = [category.toLowerCase().replace('/', '-')];

    // Add tags based on keywords
    const content = (trigger + ' ' + action).toLowerCase();

    if (content.includes('profit') || content.includes('alert')) tags.push('profit');
    if (content.includes('security') || content.includes('secret')) tags.push('security');
    if (content.includes('git') || content.includes('deploy')) tags.push('git');
    if (content.includes('telegram') || content.includes('tg')) tags.push('telegram');
    if (content.includes('agent')) tags.push('agent');
    if (content.includes('data') || content.includes('etl')) tags.push('data');

    return [...new Set(tags)]; // Remove duplicates
  }

  private generateRuleCode(rule: QuickAddRule): string {
    const tags = rule.tags.map(tag => `"${tag}"`).join(', ');

    return `      {
        id: '${rule.id}',
        category: '${rule.category}',
        trigger: '${rule.trigger}',
        action: '${rule.action}',
        example: '${rule.example}',
        priority: '${rule.priority}',
        status: 'ACTIVE',
        automated: ${rule.automated},
        tags: [${tags}]
      },`;
  }

  private async insertRuleIntoFile(ruleCode: string): Promise<void> {
    const content = readFileSync(this.rulesFile, 'utf-8');

    // Find insertion point in the appropriate category section
    const categorySections = {
      'Security': /Security Rules/,
      'Ops': /Ops Rules/,
      'Alerts': /Alerts Rules/,
      'Git/Deploy': /Git\/Deploy Rules/,
      'Data': /Data Rules/,
      'WS/Live': /WS\/Live Rules/,
      'Telegram': /Telegram Rules/,
      'Agent': /Agent Rules/,
      'Compliance': /Compliance Rules/,
      'Access': /Access Rules/
    };

    let insertIndex = -1;
    const categoryPattern = categorySections[ruleCode.match(/category: '([^']+)'/)?.[1] as keyof typeof categorySections];

    if (categoryPattern) {
      const match = content.match(categoryPattern);
      if (match) {
        // Find the end of this category's rules
        const startIndex = match.index!;
        const nextCategoryMatch = content.slice(startIndex + match[0].length).match(/^[A-Z][a-z]+ Rules/);
        const endIndex = nextCategoryMatch ? startIndex + match[0].length + nextCategoryMatch.index! : content.length;

        // Find last rule in this category
        const categoryContent = content.slice(startIndex, endIndex);
        const lastRuleMatch = categoryContent.match(/},\s*$/gm);
        if (lastRuleMatch) {
          const lastRuleIndex = startIndex + categoryContent.lastIndexOf(lastRuleMatch[lastRuleMatch.length - 1]);
          insertIndex = lastRuleIndex + 1;
        }
      }
    }

    if (insertIndex === -1) {
      // Fallback: insert at end of rules array
      const match = content.match(/}(\s*];)/);
      insertIndex = match ? match.index : content.length - 1;
    }

    // Insert the new rule
    const before = content.slice(0, insertIndex);
    const after = content.slice(insertIndex);
    const newContent = `${before}\n${ruleCode}\n${after}`;

    writeFileSync(this.rulesFile, newContent);
  }

  private async createBranchAndPR(ruleId: string, description: string): Promise<void> {
    const branchName = `feat/${ruleId.toLowerCase()}`;
    const prTitle = `Add rule ${ruleId}: ${description.substring(0, 50)}...`;

    console.log(`🌿 Creating branch: ${branchName}`);

    try {
      // Create and switch to new branch
      await this.runCommand(`git checkout -b ${branchName}`);

      // Stage changes
      await this.runCommand('git add scripts/gov-rules.ts');

      // Commit
      await this.runCommand(`git commit -m "feat: add rule ${ruleId}

${description}

Rule ID: ${ruleId}
Category: Governance
Priority: New Rule Implementation"`);

      console.log(`✅ Branch created and committed: ${branchName}`);
      console.log(`📋 PR Title: ${prTitle}`);
      console.log(`🔗 Push with: git push origin ${branchName}`);

    } catch (error) {
      console.error('❌ Git operations failed:', error.message);
      console.log('📋 Manual steps:');
      console.log(`   git checkout -b ${branchName}`);
      console.log('   git add scripts/gov-rules.ts');
      console.log(`   git commit -m "feat: add rule ${ruleId}"`);
      console.log(`   git push origin ${branchName}`);
    }
  }

  private async runCommand(cmd: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const [command, ...args] = cmd.split(' ');
      const child = spawn(command, args, {
        cwd: this.vault,
        stdio: 'pipe'
      });

      child.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`Command failed with code ${code}`));
      });

      child.on('error', reject);
    });
  }

  async validateNewRule(ruleId: string): Promise<void> {
    console.log(`🔍 Validating rule: ${ruleId}`);

    try {
      await this.runCommand('bun run rules:validate');
      console.log(`✅ Rule ${ruleId} validation passed`);
    } catch (error) {
      console.error(`❌ Rule ${ruleId} validation failed:`, error.message);
    }
  }
}

// CLI Interface
const args = process.argv.slice(2);
const command = args[0];

if (!command || command === '--help') {
  console.log(`
🛡️  SYNDICATE RULE QUICKADD v2.9

USAGE:
  bun quickadd:rule              # Interactive rule creation
  bun quickadd:rule validate ID  # Validate specific rule

FEATURES:
  ✅ Interactive prompts for all rule fields
  ✅ Auto-generate rule ID (SEC-XXX-001 format)
  ✅ Auto-create git branch + commit
  ✅ Tag-based categorization
  ✅ Template-based creation

CATEGORIES:
  Security, Ops, Alerts, Git/Deploy, Data, WS/Live, Telegram, Agent, Compliance, Access

EXAMPLES:
  bun quickadd:rule                    # Create new rule interactively
  bun quickadd:rule validate SEC-001  # Validate rule

WORKFLOW:
  1. Run quickadd command
  2. Answer prompts
  3. Auto-create branch + commit
  4. Push branch for PR
  5. Validate rule

TEMPLATES:
  📁 templates/new-rule.md (Obsidian template)
  🛡️  QuickAdd button in Obsidian
  `);
  process.exit(0);
}

const quickAdd = new RuleQuickAdd();

try {
  if (command === 'validate' && args[1]) {
    await quickAdd.validateNewRule(args[1]);
  } else {
    await quickAdd.createRuleFromTemplate();
  }
} catch (error) {
  console.error('❌ QuickAdd error:', error.message);
  process.exit(1);
}