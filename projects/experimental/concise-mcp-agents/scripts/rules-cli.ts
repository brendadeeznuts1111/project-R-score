#!/usr/bin/env bun

// [RULES][CLI][GOV][RULES-CLI-001][v3.0.0][ACTIVE]

// [AI][HEADERS][AI-HE-463][v3.0.0][ACTIVE]

import { govEngine, type SyndicateRule, type ValidationResult } from "./gov-rules.ts";

async function main() {
  const command = process.argv[2];
  const args = process.argv.slice(3);

  switch (command) {
    case "list":
      const category = args[0];
      let rules: SyndicateRule[];

      if (category) {
        rules = govEngine.getRulesByCategory(category as any);
        console.info(`\n📋 GOV Rules - ${category} (${rules.length})\n`);
      } else {
        rules = govEngine.getAllRules();
        console.info(`\n🚀 SYNDICATE GOV RULES – ENFORCED *PR-gated. Auto-validate. ${rules.length} Rules (active). Profit/Compliance = 100%.*\n`);
      }

      console.info(formatRulesTable(rules.slice(0, 20)));

      if (rules.length > 20) {
        console.info(`\n... and ${rules.length - 20} more rules. Use 'bun rules:list <category>' to filter.`);
      }
      break;

    case "validate":
      console.info(`🔍 Validating all active rules...\n`);

      const results = await govEngine.validateAllRules();
      const summary = govEngine.getValidationSummary();

      console.info(`📊 GOV Validation Summary:`);
      console.info(`   ✅ Passed: ${summary.passed}/${summary.total}`);
      console.info(`   ❌ Failed: ${summary.failed}/${summary.total}`);
      console.info(`   ⚠️  Warnings: ${summary.warnings}/${summary.total}`);
      console.info(`   📊 Compliance: ${summary.compliance}%`);

      if (summary.failed > 0) {
        console.info(`\n❌ Critical Failures:`);
        summary.criticalFailures.forEach(failure => {
          const result = results.find(r => r.ruleId === failure && r.status === 'FAIL');
          if (result) {
            console.info(`   ${failure}: ${result.message}`);
          }
        });
      }

      if (summary.compliance === 100) {
        console.info(`\n🎉 All rules compliant! GOV GREEN ✅`);
      }
      break;

    case "enforce":
      const ruleId = args[0];
      if (!ruleId) {
        console.info('Usage: bun rules:enforce <rule-id>');
        console.info('Example: bun rules:enforce SEC-ENV-001');
        break;
      }

      console.info(`🔧 Enforcing rule: ${ruleId}\n`);

      const enforcement = await govEngine.enforceRule(ruleId);
      if (enforcement.success) {
        console.info(`✅ ${enforcement.message}`);
        if (enforcement.actions) {
          console.info('\n📋 Actions taken:');
          enforcement.actions.forEach(action => console.info(`   • ${action}`));
        }
      } else {
        console.info(`❌ ${enforcement.message}`);
        process.exit(1);
      }
      break;

    case "stats":
      const stats = govEngine.generateRuleStats();

      console.info(`\n📊 GOV Rules Statistics:`);
      console.info(`   📈 Total Rules: ${stats.total}`);
      console.info(`   🤖 Automated: ${stats.automated}`);
      console.info(`   👤 Manual: ${stats.manual}`);
      console.info(`   📊 Automation Rate: ${Math.round((stats.automated / stats.total) * 100)}%`);

      console.info(`\n📂 By Category:`);
      Object.entries(stats.byCategory).forEach(([cat, count]) => {
        console.info(`   ${cat}: ${count}`);
      });

      console.info(`\n🎯 By Priority:`);
      Object.entries(stats.byPriority).forEach(([pri, count]) => {
        console.info(`   ${pri}: ${count}`);
      });

      console.info(`\n📊 By Status:`);
      Object.entries(stats.byStatus).forEach(([status, count]) => {
        console.info(`   ${status}: ${count}`);
      });
      break;

    case "pr":
      const ruleToModify = args[0];
      if (!ruleToModify) {
        console.info('Usage: bun rules:pr <rule-id> [description]');
        console.info('Example: bun rules:pr NEW-RULE-001 "New security rule"');
        break;
      }

      // This would create a PR branch for rule changes
      const description = args.slice(1).join(' ') || `Update rule ${ruleToModify}`;

      try {
        // Create feature branch
        const branchName = `feat/rule-${ruleToModify.toLowerCase()}`;
        await $`git checkout -b ${branchName}`;

        // Create PR template
        const prTemplate = `# Rule Update: ${ruleToModify}

## Description
${description}

## Rule Details
- **ID**: ${ruleToModify}
- **Type**: Rule modification
- **Impact**: Governed by GOV-ENG-001

## Validation
- [ ] Rule syntax valid
- [ ] No breaking changes
- [ ] Tests pass
- [ ] GOV compliance maintained

## Checklist
- [ ] Rule documented
- [ ] Tests updated
- [ ] Documentation updated
- [ ] GOV validation passes
`;

        await Bun.write(`pr-template-${ruleToModify}.md`, prTemplate);

        console.info(`✅ PR Branch Created:`);
        console.info(`   Branch: ${branchName}`);
        console.info(`   Template: pr-template-${ruleToModify}.md`);
        console.info(`   Ready for: git add . && git commit -m "feat: ${description}"`);

      } catch (error) {
        console.info(`❌ PR creation failed: ${error.message}`);
      }
      break;

    case "search":
      const query = args.join(' ');
      if (!query) {
        console.info('Usage: bun rules:search <query>');
        console.info('Example: bun rules:search security');
        break;
      }

      const allRules = govEngine.getAllRules();
      const matches = allRules.filter(rule =>
        rule.id.toLowerCase().includes(query.toLowerCase()) ||
        rule.category.toLowerCase().includes(query.toLowerCase()) ||
        rule.trigger.toLowerCase().includes(query.toLowerCase()) ||
        rule.action.toLowerCase().includes(query.toLowerCase()) ||
        rule.tags.some(tag => tag.toLowerCase().includes(query.toLowerCase()))
      );

      console.info(`🔍 Rules matching "${query}": ${matches.length}\n`);

      matches.forEach(rule => {
        console.info(`${rule.id} (${rule.category})`);
        console.info(`   ${rule.trigger}`);
        console.info(`   → ${rule.action}`);
        console.info('');
      });
      break;

    case "audit":
      console.info(`🔬 Running comprehensive GOV audit...\n`);

      // Run all validations
      const auditResults = await govEngine.validateAllRules();
      const auditSummary = govEngine.getValidationSummary();

      // Generate audit report
      const auditReport = {
        timestamp: new Date().toISOString(),
        summary: auditSummary,
        details: auditResults,
        recommendations: generateAuditRecommendations(auditResults)
      };

      await Bun.write('audit-report.json', JSON.stringify(auditReport, null, 2));

      console.info(`📋 Audit Report Generated:`);
      console.info(`   File: audit-report.json`);
      console.info(`   Compliance: ${auditSummary.compliance}%`);
      console.info(`   Issues: ${auditSummary.failed + auditSummary.warnings}`);

      if (auditSummary.compliance < 100) {
        console.info(`\n⚠️  Recommendations:`);
        auditReport.recommendations.forEach(rec => console.info(`   • ${rec}`));
      }
      break;

    default:
      console.info(`🚀 GOV Rules CLI v3.0.0

USAGE:
  bun rules:list [category]     # List rules (filter by category)
  bun rules:validate           # Validate all rules
  bun rules:enforce <rule-id>  # Enforce specific rule
  bun rules:stats              # Show rule statistics
  bun rules:pr <rule-id>       # Create PR branch for rule change
  bun rules:search <query>     # Search rules by content
  bun rules:audit              # Comprehensive audit report

CATEGORIES:
  Security, Ops, Alerts, Git/Deploy, Data, WS/Live, Telegram, Agent, Compliance

EXAMPLES:
  bun rules:list Security       # Show security rules
  bun rules:validate           # Check all rules
  bun rules:enforce SEC-ENV-001 # Enforce env file rule
  bun rules:search profit      # Find profit-related rules
  bun rules:audit              # Generate audit report
`);
  }
}

function formatRulesTable(rules: SyndicateRule[]): string {
  const header = '| ID | Category | Trigger | Action | Priority | Status |\n|--------|----------|-------------|------------|--------------|------------|';

  const rows = rules.map(rule =>
    `| **${rule.id}** | ${rule.category} | ${rule.trigger.substring(0, 30)}${rule.trigger.length > 30 ? '...' : ''} | ${rule.action.substring(0, 30)}${rule.action.length > 30 ? '...' : ''} | ${rule.priority} | ${rule.status} |`
  );

  return `${header}\n${rows.join('\n')}`;
}

function generateAuditRecommendations(results: ValidationResult[]): string[] {
  const recommendations: string[] = [];

  const failedRules = results.filter(r => r.status === 'FAIL');
  const warnRules = results.filter(r => r.status === 'WARN');

  if (failedRules.length > 0) {
    recommendations.push(`${failedRules.length} critical rule failures require immediate attention`);
  }

  if (warnRules.length > 0) {
    recommendations.push(`${warnRules.length} rule warnings should be addressed`);
  }

  // Category-specific recommendations
  const securityFails = failedRules.filter(r => r.ruleId.startsWith('SEC-'));
  if (securityFails.length > 0) {
    recommendations.push('Security rule failures detected - review immediately');
  }

  const complianceFails = failedRules.filter(r => r.ruleId.startsWith('COMPLIANCE-'));
  if (complianceFails.length > 0) {
    recommendations.push('Compliance violations detected - may impact regulatory status');
  }

  return recommendations;
}

// CLI execution
if (import.meta.main) {
  main().catch(console.error);
}