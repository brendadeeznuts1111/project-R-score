#!/usr/bin/env bun
/**
 * 🔍 Error Handling Demonstration
 *
 * Shows how errors are handled throughout our documentation system
 */

// Safe execution with error handling
async function demonstrateErrorHandling() {
  console.log('🔍 COMPREHENSIVE ERROR HANDLING DEMONSTRATION');
  console.log('='.repeat(60));

  // 1. IMPORT ERROR HANDLING
  console.log('\n📦 1. IMPORT ERROR HANDLING:');

  try {
    const docs = await import('./documentation');
    console.log('✅ Documentation module imported successfully');
  } catch (error) {
    console.log('❌ Import failed - handled gracefully');
    console.log('   Error type:', error.constructor.name);
    console.log('   Message:', error.message);

    // Fallback strategy
    console.log('🔄 Using fallback imports...');
    const cliConstants = await import('./documentation/constants/cli.ts');
    console.log('✅ CLI constants loaded via fallback');
  }

  // 2. VALIDATION ERROR HANDLING
  console.log('\n✅ 2. VALIDATION ERROR HANDLING:');

  try {
    const { EnhancedDocumentationURLValidator } = await import('./documentation');

    // Test invalid CLI command
    const invalidCommand = 'invalid-command';
    const validation = EnhancedDocumentationURLValidator.validateCLICommand(invalidCommand);

    if (!validation.isValid) {
      console.log('✅ Invalid command detected and handled');
      console.log('   Errors:', validation.errors);
    }

    // Test invalid URL
    const invalidURL = 'not-a-url';
    const urlValidation = EnhancedDocumentationURLValidator.validateBunDocumentationURL(invalidURL);

    if (!urlValidation.isValid) {
      console.log('✅ Invalid URL detected and handled');
    }
  } catch (error) {
    console.log('❌ Validation error - using fallback');

    // Simple fallback validation
    const simpleValidation = (command: string) => {
      return command.startsWith('bun')
        ? { isValid: true }
        : { isValid: false, errors: ['Must start with bun'] };
    };

    const result = simpleValidation('test');
    console.log('✅ Fallback validation working:', result);
  }

  // 3. ASYNC ERROR HANDLING
  console.log('\n⚡ 3. ASYNC ERROR HANDLING:');

  const asyncOperation = async (shouldFail: boolean) => {
    if (shouldFail) {
      throw new Error('Async operation failed');
    }
    return 'Success';
  };

  // Test failing async operation
  try {
    await asyncOperation(true);
  } catch (error) {
    console.log('✅ Async error caught and handled');
    console.log('   Error:', error.message);

    // Retry logic
    try {
      const result = await asyncOperation(false);
      console.log('✅ Retry successful:', result);
    } catch (retryError) {
      console.log('❌ Retry also failed');
    }
  }

  // 4. FILE OPERATION ERROR HANDLING
  console.log('\n📁 4. FILE OPERATION ERROR HANDLING:');

  try {
    const nonExistentFile = './non-existent-file.json';
    const file = Bun.file(nonExistentFile);

    if (await file.exists()) {
      const content = await file.text();
      console.log('✅ File read successfully');
    } else {
      console.log('✅ File not found - handled gracefully');
      console.log('   Creating fallback content...');

      // Create fallback
      await Bun.write(nonExistentFile, '{"fallback": true}');
      console.log('✅ Fallback file created');
    }
  } catch (error) {
    console.log('❌ File operation failed:', error.message);
  }

  // 5. NETWORK REQUEST ERROR HANDLING
  console.log('\n🌐 5. NETWORK REQUEST ERROR HANDLING:');

  try {
    const response = // 🚀 Prefetch hint: Consider preconnecting to 'https://bun.sh/docs/cli' domain
      await fetch('https://bun.sh/docs/cli', {
        method: 'HEAD',
        timeout: 5000,
      });

    if (response.ok) {
      console.log('✅ Network request successful');
    } else {
      console.log('⚠️ Network request returned:', response.status);
    }
  } catch (error) {
    console.log('✅ Network error handled gracefully');
    console.log('   Error:', error.message);

    // Fallback URL
    console.log('🔄 Using fallback documentation URL...');
    console.log('   Fallback: https://docs.bun.sh');
  }

  // 6. TYPE ERROR HANDLING
  console.log('\n🔷 6. TYPE ERROR HANDLING:');

  try {
    const processData = (data: unknown) => {
      if (typeof data === 'string') {
        return data.toUpperCase();
      }
      if (typeof data === 'number') {
        return data.toString();
      }
      throw new Error('Unsupported data type');
    };

    // Test with different types
    const testValues = ['hello', 42, null, undefined, { invalid: 'object' }];

    testValues.forEach((value, index) => {
      try {
        const result = processData(value);
        console.log(`✅ Test ${index + 1}: ${typeof value} → ${result}`);
      } catch (error) {
        console.log(`⚠️ Test ${index + 1}: ${typeof value} → ${error.message}`);
      }
    });
  } catch (error) {
    console.log('❌ Type error handling failed:', error.message);
  }

  // 7. GRACEFUL DEGRADATION
  console.log('\n🛡️ 7. GRACEFUL DEGRADATION:');

  const loadWithFallback = async () => {
    const strategies = [
      async () => {
        // Strategy 1: Try full documentation module
        const docs = await import('./documentation');
        return { source: 'full-module', data: docs };
      },
      async () => {
        // Strategy 2: Try constants only
        const cli = await import('./documentation/constants/cli.ts');
        const utils = await import('./documentation/constants/utils.ts');
        return { source: 'constants-only', data: { cli, utils } };
      },
      async () => {
        // Strategy 3: Minimal fallback
        return {
          source: 'minimal-fallback',
          data: {
            CLI_CATEGORIES: 8,
            UTILS_CATEGORIES: 10,
            STATUS: 'fallback-mode',
          },
        };
      },
    ];

    for (let i = 0; i < strategies.length; i++) {
      try {
        console.log(`🔄 Trying strategy ${i + 1}...`);
        const result = await strategies[i]();
        console.log(`✅ Strategy ${i + 1} successful:`, result.source);
        return result;
      } catch (error) {
        console.log(`❌ Strategy ${i + 1} failed:`, error.message);
        if (i === strategies.length - 1) {
          console.log('🚨 All strategies failed');
          throw error;
        }
      }
    }
  };

  try {
    const result = await loadWithFallback();
    console.log('🎯 Final result loaded from:', result.source);
  } catch (error) {
    console.log('💥 Complete failure:', error.message);
  }

  // 8. ERROR LOGGING AND REPORTING
  console.log('\n📊 8. ERROR LOGGING AND REPORTING:');

  const errorLogger = {
    log: (error: Error, context: string) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        context,
        message: error.message,
        stack: error.stack,
        type: error.constructor.name,
      };

      console.log('📝 Error logged:', {
        context: logEntry.context,
        message: logEntry.message,
        type: logEntry.type,
      });

      return logEntry;
    },
  };

  // Simulate various errors
  const testErrors = [
    new Error('Test validation error'),
    new Error('Test network error'),
    new Error('Test file error'),
  ];

  testErrors.forEach((error, index) => {
    errorLogger.log(error, `Test scenario ${index + 1}`);
  });

  // 9. RECOVERY MECHANISMS
  console.log('\n🔄 9. RECOVERY MECHANISMS:');

  const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔄 Attempt ${attempt}/${maxRetries}...`);
        return await operation();
      } catch (error) {
        console.log(`❌ Attempt ${attempt} failed:`, error.message);

        if (attempt === maxRetries) {
          throw error;
        }

        // Wait before retry
        await Bun.sleep(delay);
      }
    }

    throw new Error('All retries exhausted');
  };

  try {
    let attempts = 0;
    const flakyOperation = async () => {
      attempts++;
      if (attempts < 3) {
        throw new Error(`Flaky operation attempt ${attempts}`);
      }
      return 'Success after retries!';
    };

    const result = await withRetry(flakyOperation, 3, 100);
    console.log('✅ Retry mechanism successful:', result);
  } catch (error) {
    console.log('❌ Retry mechanism failed:', error.message);
  }

  // 10. SUMMARY
  console.log('\n📋 10. ERROR HANDLING SUMMARY:');
  console.log('✅ Import errors: Handled with fallbacks');
  console.log('✅ Validation errors: Graceful degradation');
  console.log('✅ Async errors: Try-catch with retries');
  console.log('✅ File errors: Existence checks + creation');
  console.log('✅ Network errors: Timeouts + fallbacks');
  console.log('✅ Type errors: Runtime type checking');
  console.log('✅ System failures: Multiple fallback strategies');
  console.log('✅ Error logging: Structured error reporting');
  console.log('✅ Recovery: Automatic retry mechanisms');

  console.log('\n🎯 Error handling is comprehensive and robust!');
}

// Safe execution
if (import.meta.main) {
  demonstrateErrorHandling().catch(error => {
    console.error('💥 Demonstration failed:', error);
    process.exit(1);
  });
} else {
  console.log('ℹ️ Error handling demo imported, not executed directly');
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
