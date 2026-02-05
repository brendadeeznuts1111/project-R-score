#!/usr/bin/env bun

// scripts/validate-golden-rules.ts
import { GoldenRuleEnforcer } from '../packages/odds-core/src/standards/rule-enforcement.js';
import { writeFile, mkdir } from 'fs/promises';
import { join } from 'path';

async function main() {
  console.log('🎯 GOLDEN RULES ENFORCEMENT\n');
  
  const enforcer = new GoldenRuleEnforcer();
  const result = await enforcer.validateCodebase();

  // Generate report
  const report = enforcer.generateReport(result);
  
  // Ensure reports directory exists
  await mkdir('./reports', { recursive: true });
  
  // Save detailed report
  const reportPath = join('./reports', `golden-rules-${Date.now()}.md`);
  await writeFile(reportPath, report);
  
  // Save summary for CI
  const summary = {
    timestamp: new Date().toISOString(),
    passed: result.passed,
    summary: result.summary,
    hasErrors: result.violations.some(v => v.severity === 'error')
  };
  
  await writeFile('./reports/golden-rules-summary.json', JSON.stringify(summary, null, 2));
  
  // Output to console
  console.log(report);
  
  // Exit with appropriate code for CI
  if (!result.passed) {
    console.log('\n❌ Golden rules validation failed!');
    process.exit(1);
  } else {
    console.log('\n✅ All golden rules are being followed!');
    process.exit(0);
  }
}

// Run if called directly
if (import.meta.main) {
  await main().catch(error => {
    console.error('❌ Rule validation failed:', error);
    process.exit(1);
  });
}
