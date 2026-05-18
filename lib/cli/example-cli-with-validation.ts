// lib/cli/example-cli-with-validation.ts — Example CLI tool with self-validation integration

// Entry guard check
if (import.meta.path !== Bun.main) {
  process.exit(0);
}

import { validateAndReport, quickValidate, CLISelfValidator } from '../validation/cli-self-validation';


// ============================================================================
// EXAMPLE 1: Simple validation with convenience function
// ============================================================================

async function example1() {
  console.info('\n📋 Example 1: Simple Validation');
  console.info('=' .repeat(40));

  // Quick validation - just check if we can proceed
  const canProceed = await quickValidate('bun', ['--version'], true);

  if (canProceed) {
    console.info('✅ Can proceed with execution');
    // Execute your CLI logic here
    const result = await Bun.$`bun --version`.text();
    console.info(`📦 Bun version: ${result.trim()}`);
  } else {
    console.info('❌ Cannot proceed - validation failed');
  }
}

// ============================================================================
// EXAMPLE 2: Detailed validation with reporting
// ============================================================================

async function example2() {
  console.info('\n📋 Example 2: Detailed Validation with Reporting');
  console.info('=' .repeat(50));

  // Detailed validation with console output
  await validateAndReport('overseer-cli', ['--help'], true);

  // This will only execute if validation passes
  console.info('🚀 Executing CLI logic...');
  // Your CLI tool logic would go here
}

// ============================================================================
// EXAMPLE 3: Advanced validation with custom configuration
// ============================================================================

async function example3() {
  console.info('\n📋 Example 3: Advanced Validation');
  console.info('=' .repeat(35));

  const result = await CLISelfValidator.executeWithValidation(
    {
      toolName: 'bun',
      args: ['test'],
      env: { NODE_ENV: 'test' },
      autoHeal: true,
      requiredURLs: ['bun-official-docs'],
      requiredConstants: ['default-timeout'],
      onValidationError: (errors, fixes) => {
        console.info('🚨 Custom error handler:');
        console.info('   Errors:', errors.join(', '));
        console.info('   Suggested fixes:', fixes.join(', '));
      },
      onValidationSuccess: () => {
        console.info('🎉 Custom success handler!');
      }
    },
    async () => {
      // This is the actual execution function
      console.info('⚡ Executing main logic...');

      // Simulate some work
      await Bun.sleep(100);

      return { status: 'success', data: 'CLI execution completed' };
    }
  );

  if (result.success) {
    console.info('✅ Execution successful:', result.result);
  } else {
    console.info('❌ Execution failed:', result.errors);
  }

  if (result.healedIssues.length > 0) {
    console.info('🔧 Auto-healed issues:', result.healedIssues);
  }
}

// ============================================================================
// EXAMPLE 4: Error recovery and fallback strategies
// ============================================================================

async function example4() {
  console.info('\n📋 Example 4: Error Recovery and Fallbacks');
  console.info('=' .repeat(45));

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
      console.info('✅ Primary tool executed:', result.result);
    }
  } catch (error) {
    console.info('❌ Primary tool failed, trying fallback...');

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
      console.info('✅ Fallback executed:', fallbackResult.result);
    } else {
      console.info('❌ Even fallback failed:', fallbackResult.errors);
    }
  }
}

// ============================================================================
// EXAMPLE 5: Integration with existing CLI patterns
// ============================================================================

async function example5() {
  console.info('\n📋 Example 5: Integration with Existing CLI Patterns');
  console.info('=' .repeat(55));

  // Simulate existing CLI argument parsing
  const args = process.argv.slice(2);
  const command = args[0] || 'help';

  // Validate before processing command
  const validation = await CLISelfValidator.validateBeforeExecution({
    toolName: 'example-cli',
    args,
    autoHeal: true,
    onValidationError: (errors, fixes) => {
      console.info(`\n❌ Cannot execute '${command}' command:`);
      errors.forEach(error => console.info(`   • ${error}`));
      console.info('\n💡 Suggested fixes:');
      fixes.forEach(fix => console.info(`   • ${fix}`));
    }
  });

  if (validation.canProceed) {
    console.info(`✅ Executing '${command}' command...`);

    // Simulate command execution
    switch (command) {
      case 'status':
        console.info('📊 Status: All systems operational');
        break;
      case 'test':
        console.info('🧪 Running tests...');
        await Bun.sleep(500);
        console.info('✅ Tests completed');
        break;
      case 'help':
        console.info('📖 Available commands: status, test, help');
        break;
      default:
        console.info(`❌ Unknown command: ${command}`);
    }
  }
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================

async function main() {
  console.info('🚀 CLI Self-Validation Examples');
  console.info('=' .repeat(50));

  try {
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();

    console.info('\n🎉 All examples completed successfully!');

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
