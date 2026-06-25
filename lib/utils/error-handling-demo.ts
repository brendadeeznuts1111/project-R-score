// lib/utils/error-handling-demo.ts — Error handling demonstration

// Safe execution with error handling
async function demonstrateErrorHandling() {
  console.info('🔍 COMPREHENSIVE ERROR HANDLING DEMONSTRATION');
  console.info('='.repeat(60));

  // 1. IMPORT ERROR HANDLING
  console.info('\n📦 1. IMPORT ERROR HANDLING:');

  try {
    const docs = await import('./documentation');
    console.info('✅ Documentation module imported successfully');
  } catch (error) {
    console.info('❌ Import failed - handled gracefully');
    console.info('   Error type:', error.constructor.name);
    console.info('   Message:', error.message);

    // Fallback strategy
    console.info('🔄 Using fallback imports...');
    const cliConstants = await import('./documentation/constants/cli.ts');
    console.info('✅ CLI constants loaded via fallback');
  }

  // 2. VALIDATION ERROR HANDLING
  console.info('\n✅ 2. VALIDATION ERROR HANDLING:');

  try {
    const { EnhancedDocumentationURLValidator } = await import('./documentation');

    // Test invalid CLI command
    const invalidCommand = 'invalid-command';
    const validation = EnhancedDocumentationURLValidator.validateCLICommand(invalidCommand);

    if (!validation.isValid) {
      console.info('✅ Invalid command detected and handled');
      console.info('   Errors:', validation.errors);
    }

    // Test invalid URL
    const invalidURL = 'not-a-url';
    const urlValidation = EnhancedDocumentationURLValidator.validateBunDocumentationURL(invalidURL);

    if (!urlValidation.isValid) {
      console.info('✅ Invalid URL detected and handled');
    }
  } catch (error) {
    console.info('❌ Validation error - using fallback');

    // Simple fallback validation
    const simpleValidation = (command: string) => {
      return command.startsWith('bun')
        ? { isValid: true }
        : { isValid: false, errors: ['Must start with bun'] };
    };

    const result = simpleValidation('test');
    console.info('✅ Fallback validation working:', result);
  }

  // 3. ASYNC ERROR HANDLING
  console.info('\n⚡ 3. ASYNC ERROR HANDLING:');

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
    console.info('✅ Async error caught and handled');
    console.info('   Error:', error.message);

    // Retry logic
    try {
      const result = await asyncOperation(false);
      console.info('✅ Retry successful:', result);
    } catch (retryError) {
      console.info('❌ Retry also failed');
    }
  }

  // 4. FILE OPERATION ERROR HANDLING
  console.info('\n📁 4. FILE OPERATION ERROR HANDLING:');

  try {
    const nonExistentFile = './non-existent-file.json';
    const file = Bun.file(nonExistentFile);

    if (await file.exists()) {
      const content = await file.text();
      console.info('✅ File read successfully');
    } else {
      console.info('✅ File not found - handled gracefully');
      console.info('   Creating fallback content...');

      // Create fallback
      await Bun.write(nonExistentFile, '{"fallback": true}');
      console.info('✅ Fallback file created');
    }
  } catch (error) {
    console.info('❌ File operation failed:', error.message);
  }

  // 5. NETWORK REQUEST ERROR HANDLING
  console.info('\n🌐 5. NETWORK REQUEST ERROR HANDLING:');

  try {
    const response = // 🚀 Prefetch hint: Consider preconnecting to 'https://bun.sh/docs/cli' domain
      await fetch('https://bun.sh/docs/cli', {
        method: 'HEAD',
        timeout: 5000,
      });

    if (response.ok) {
      console.info('✅ Network request successful');
    } else {
      console.info('⚠️ Network request returned:', response.status);
    }
  } catch (error) {
    console.info('✅ Network error handled gracefully');
    console.info('   Error:', error.message);

    // Fallback URL
    console.info('🔄 Using fallback documentation URL...');
    console.info('   Fallback: https://bun.sh/docs');
  }

  // 6. TYPE ERROR HANDLING
  console.info('\n🔷 6. TYPE ERROR HANDLING:');

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
        console.info(`✅ Test ${index + 1}: ${typeof value} → ${result}`);
      } catch (error) {
        console.info(`⚠️ Test ${index + 1}: ${typeof value} → ${error.message}`);
      }
    });
  } catch (error) {
    console.info('❌ Type error handling failed:', error.message);
  }

  // 7. GRACEFUL DEGRADATION
  console.info('\n🛡️ 7. GRACEFUL DEGRADATION:');

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
        console.info(`🔄 Trying strategy ${i + 1}...`);
        const result = await strategies[i]();
        console.info(`✅ Strategy ${i + 1} successful:`, result.source);
        return result;
      } catch (error) {
        console.info(`❌ Strategy ${i + 1} failed:`, error.message);
        if (i === strategies.length - 1) {
          console.info('🚨 All strategies failed');
          throw error;
        }
      }
    }
  };

  try {
    const result = await loadWithFallback();
    console.info('🎯 Final result loaded from:', result.source);
  } catch (error) {
    console.info('💥 Complete failure:', error.message);
  }

  // 8. ERROR LOGGING AND REPORTING
  console.info('\n📊 8. ERROR LOGGING AND REPORTING:');

  const errorLogger = {
    log: (error: Error, context: string) => {
      const logEntry = {
        timestamp: new Date().toISOString(),
        context,
        message: error.message,
        stack: error.stack,
        type: error.constructor.name,
      };

      console.info('📝 Error logged:', {
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
  console.info('\n🔄 9. RECOVERY MECHANISMS:');

  const withRetry = async <T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.info(`🔄 Attempt ${attempt}/${maxRetries}...`);
        return await operation();
      } catch (error) {
        console.info(`❌ Attempt ${attempt} failed:`, error.message);

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
    console.info('✅ Retry mechanism successful:', result);
  } catch (error) {
    console.info('❌ Retry mechanism failed:', error.message);
  }

  // 10. SUMMARY
  console.info('\n📋 10. ERROR HANDLING SUMMARY:');
  console.info('✅ Import errors: Handled with fallbacks');
  console.info('✅ Validation errors: Graceful degradation');
  console.info('✅ Async errors: Try-catch with retries');
  console.info('✅ File errors: Existence checks + creation');
  console.info('✅ Network errors: Timeouts + fallbacks');
  console.info('✅ Type errors: Runtime type checking');
  console.info('✅ System failures: Multiple fallback strategies');
  console.info('✅ Error logging: Structured error reporting');
  console.info('✅ Recovery: Automatic retry mechanisms');

  console.info('\n🎯 Error handling is comprehensive and robust!');
}

// Safe execution
if (import.meta.main) {
  demonstrateErrorHandling().catch(error => {
    console.error('💥 Demonstration failed:', error);
    process.exit(1);
  });
} else {
  console.info('ℹ️ Error handling demo imported, not executed directly');
}

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */
