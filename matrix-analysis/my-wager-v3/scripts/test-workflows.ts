#!/usr/bin/env bun
// Test Workflows Script
// Implements practical testing workflows for development

// Make this a module
export {};

import { $ } from 'bun';

const workflows = {
  // Bug fixing workflow
  bug: async () => {
    console.log('🐛 Running Bug Fix Workflow');
    console.log('========================\n');
    
    console.log('Command: bun test --test-name-pattern "bug|fix"');
    const result = await $`bun test --test-name-pattern "bug|fix"`.text();
    console.log(result);
    
    return result;
  },
  
  // Performance optimization workflow
  performance: async () => {
    console.log('⚡ Running Performance Workflow');
    console.log('==============================\n');
    
    console.log('Command: bun test --test-name-pattern "performance|perf"');
    const result = await $`bun test --test-name-pattern "performance|perf"`.text();
    console.log(result);
    
    return result;
  },
  
  // Feature development workflow
  feature: async () => {
    console.log('🚀 Running Feature Development Workflow');
    console.log('====================================\n');
    
    console.log('Command: bun test --test-name-pattern "feature|new"');
    const result = await $`bun test --test-name-pattern "feature|new"`.text();
    console.log(result);
    
    return result;
  },
  
  // Combined git + pattern workflow
  changedBugFixes: async () => {
    console.log('🔄 Running Changed Files + Bug Fix Workflow');
    console.log('========================================\n');
    
    // Get changed test files
    const changedFiles = await $`git diff --name-only HEAD~1 | grep "\.test\." || echo ""`.text();
    
    if (changedFiles.trim()) {
      console.log('Changed test files:');
      console.log(changedFiles);
      
      console.log('\nCommand: bun test $(git diff --name-only HEAD~1 | grep "\.test\.") --test-name-pattern "bug|fix"');
      const result = await $`bun test $(git diff --name-only HEAD~1 | grep "\.test\." || echo "") --test-name-pattern "bug|fix"`.text();
      console.log(result);
      
      return result;
    } else {
      console.log('No test files changed in last commit');
      return 'No changes';
    }
  },
  
  // Regression testing
  regression: async () => {
    console.log('📊 Running Regression Tests');
    console.log('==========================\n');
    
    console.log('Command: bun test --test-name-pattern "regression"');
    const result = await $`bun test --test-name-pattern "regression"`.text();
    console.log(result);
    
    return result;
  },
  
  // Integration tests
  integration: async () => {
    console.log('🔗 Running Integration Tests');
    console.log('===========================\n');
    
    console.log('Command: bun test --test-name-pattern "integration"');
    const result = await $`bun test --test-name-pattern "integration"`.text();
    console.log(result);
    
    return result;
  },
  
  // All tests with coverage
  coverage: async () => {
    console.log('📈 Running All Tests with Coverage');
    console.log('==================================\n');
    
    console.log('Command: bun test --coverage');
    const result = await $`bun test --coverage`.text();
    console.log(result);
    
    return result;
  },
  
  // Quick smoke test
  smoke: async () => {
    console.log('💨 Running Smoke Tests');
    console.log('======================\n');
    
    console.log('Command: bun test --reporter=dot');
    const result = await $`bun test --reporter=dot`.text();
    console.log(result);
    
    return result;
  }
};

// CLI interface
async function main() {
  const command = process.argv[2];
  
  if (!command) {
    console.log('🧪 Test Workflows CLI');
    console.log('====================\n');
    console.log('Available workflows:');
    console.log('  bug        - Run bug fix related tests');
    console.log('  performance- Run performance tests');
    console.log('  feature    - Run feature tests');
    console.log('  changed    - Run tests on changed files (bug/fix)');
    console.log('  regression - Run regression tests');
    console.log('  integration- Run integration tests');
    console.log('  coverage   - Run all tests with coverage');
    console.log('  smoke      - Quick smoke test');
    console.log('\nUsage: bun scripts/test-workflows.ts <workflow>');
    console.log('Example: bun scripts/test-workflows.ts bug');
    return;
  }
  
  const workflow = workflows[command as keyof typeof workflows];
  
  if (!workflow) {
    console.error(`❌ Unknown workflow: ${command}`);
    process.exit(1);
  }
  
  try {
    await workflow();
  } catch (error) {
    console.error(`❌ Workflow failed: ${error}`);
    process.exit(1);
  }
}

// Export for programmatic use
export { workflows };

// Run if called directly
if (import.meta.main) {
  main();
}
