#!/usr/bin/env bun
/**
 * Example CLI Tool with Self-Validation Integration
 * 
 * Demonstrates how to integrate validation and error handling
 * into existing CLI tools using the validation system.
 * 
 * Usage:
 *   bun run lib/example-cli-with-validation.ts
 *   bun run lib/example-cli-with-validation.ts --heal
 */

// Entry guard check
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

import { validateAndReport, quickValidate, CLISelfValidator } from './cli-self-validation';

// ============================================================================
// EXAMPLE 1: Simple validation with convenience function
// ============================================================================

async function example1() {
  console.log('\n📋 Example 1: Simple Validation');
  console.log('=' .repeat(40));
  
  // Quick validation - just check if we can proceed
  const canProceed = await quickValidate('bun', ['--version'], true);
  
  if (canProceed) {
    console.log('✅ Can proceed with execution');
    // Execute your CLI logic here
    const result = await Bun.$`bun --version`.text();
    console.log(`📦 Bun version: ${result.trim()}`);
  } else {
    console.log('❌ Cannot proceed - validation failed');
  }
}

// ============================================================================
// EXAMPLE 2: Detailed validation with reporting
// ============================================================================

async function example2() {
  console.log('\n📋 Example 2: Detailed Validation with Reporting');
  console.log('=' .repeat(50));
  
  // Detailed validation with console output
  await validateAndReport('overseer-cli', ['--help'], true);
  
  // This will only execute if validation passes
  console.log('🚀 Executing CLI logic...');
  // Your CLI tool logic would go here
}

// ============================================================================
// EXAMPLE 3: Advanced validation with custom configuration
// ============================================================================

async function example3() {
  console.log('\n📋 Example 3: Advanced Validation');
  console.log('=' .repeat(35));
  
  const result = await CLISelfValidator.executeWithValidation(
    {
      toolName: 'bun',
      args: ['test'],
      env: { NODE_ENV: 'test' },
      autoHeal: true,
      requiredURLs: ['bun-official-docs'],
      requiredConstants: ['default-timeout'],
      onValidationError: (errors, fixes) => {
        console.log('🚨 Custom error handler:');
        console.log('   Errors:', errors.join(', '));
        console.log('   Suggested fixes:', fixes.join(', '));
      },
      onValidationSuccess: () => {
        console.log('🎉 Custom success handler!');
      }
    },
    async () => {
      // This is the actual execution function
      console.log('⚡ Executing main logic...');
      
      // Simulate some work
      await new Promise(resolve => setTimeout(resolve, 100));
      
      return { status: 'success', data: 'CLI execution completed' };
    }
  );
  
  if (result.success) {
    console.log('✅ Execution successful:', result.result);
  } else {
    console.log('❌ Execution failed:', result.errors);
  }
  
  if (result.healedIssues.length > 0) {
    console.log('🔧 Auto-healed issues:', result.healedIssues);
  }
}

// ============================================================================
// EXAMPLE 4: Error recovery and fallback strategies
// ============================================================================

async function example4() {
  console.log('\n📋 Example 4: Error Recovery and Fallbacks');
  console.log('=' .repeat(45));
  
  try {
    // Try to validate and execute with primary tool
    const result = await CLISelfValidator.executeWithValidation(
      {
        toolName: 'nonexistent-tool',
        args: ['--help'],
        autoHeal: true
      },
      async () => {
        return { status: 'success', tool: 'primary' };
      }
    );
    
    if (result.success) {
      console.log('✅ Primary tool executed:', result.result);
    }
  } catch (error) {
    console.log('❌ Primary tool failed, trying fallback...');
    
    // Fallback strategy
    const fallbackResult = await CLISelfValidator.executeWithValidation(
      {
        toolName: 'bun',
        args: ['--version'],
        autoHeal: true
      },
      async () => {
        return { status: 'success', tool: 'fallback' };
      }
    );
    
    if (fallbackResult.success) {
      console.log('✅ Fallback executed:', fallbackResult.result);
    } else {
      console.log('❌ Even fallback failed:', fallbackResult.errors);
    }
  }
}

// ============================================================================
// EXAMPLE 5: Integration with existing CLI patterns
// ============================================================================

async function example5() {
  console.log('\n📋 Example 5: Integration with Existing CLI Patterns');
  console.log('=' .repeat(55));
  
  // Simulate existing CLI argument parsing
  const args = process.argv.slice(2);
  const command = args[0] || 'help';
  
  // Validate before processing command
  const validation = await CLISelfValidator.validateBeforeExecution({
    toolName: 'example-cli',
    args,
    autoHeal: true,
    onValidationError: (errors, fixes) => {
      console.log(`\n❌ Cannot execute '${command}' command:`);
      errors.forEach(error => console.log(`   • ${error}`));
      console.log('\n💡 Suggested fixes:');
      fixes.forEach(fix => console.log(`   • ${fix}`));
    }
  });
  
  if (validation.canProceed) {
    console.log(`✅ Executing '${command}' command...`);
    
    // Simulate command execution
    switch (command) {
      case 'status':
        console.log('📊 Status: All systems operational');
        break;
      case 'test':
        console.log('🧪 Running tests...');
        await new Promise(resolve => setTimeout(resolve, 500));
        console.log('✅ Tests completed');
        break;
      case 'help':
        console.log('📖 Available commands: status, test, help');
        break;
      default:
        console.log(`❌ Unknown command: ${command}`);
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.log('🚀 CLI Self-Validation Examples');
  console.log('=' .repeat(50));
  
  try {
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();
    
    console.log('\n🎉 All examples completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Example execution failed:', error);
    process.exit(1);
  }
}

// Run examples
main().catch(error => {
  console.error('❌ Unhandled error:', error);
  process.exit(1);
});
