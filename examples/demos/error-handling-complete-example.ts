// examples/error-handling-complete-example.ts
// Complete example of the error handling system

import {
  // Phase 1: Global error handling
  initializeGlobalErrorHandling,
  onShutdown,
  getGlobalErrorStatistics,
  
  // Phase 2: Circuit breaker
  withCircuitBreaker,
  getCircuitBreakerHealth,
  
  // Phase 3: Error metrics
  recordError,
  configureAlert,
  getErrorAggregation,
  AlertSeverity,
  AlertChannel,
  
  // Bun utilities
  safeSpawn,
  validateBinaryExists,
  ansiStringWidth,
  
  // Error creation
  createValidationError,
  createNetworkError,
  EnterpriseErrorCode,
  
  // Utilities
  safeAsync,
} from '../lib/core';

// ============================================================================
// 1. Initialize Global Error Handling
// ============================================================================

console.log('🚀 Starting Error Handling Example\n');

initializeGlobalErrorHandling({
  exitOnUncaughtException: true,
  exitOnUnhandledRejection: false,
  shutdownTimeout: 5000,
  onUncaughtException: (error) => {
    console.error('🚨 Critical error:', error.message);
  },
  onUnhandledRejection: (reason) => {
    console.error('⚠️ Unhandled rejection:', reason);
  },
});

// Register shutdown handler
onShutdown(async () => {
  console.log('\n🧹 Cleaning up resources...');
  // Close connections, flush logs, etc.
  await new Promise(resolve => setTimeout(resolve, 100));
  console.log('✅ Cleanup complete');
});

// ============================================================================
// 2. Configure Alerts
// ============================================================================

configureAlert({
  minSeverity: AlertSeverity.WARNING,
  channel: AlertChannel.CONSOLE,
  config: {},
  cooldownMs: 1000,
  rateLimit: { maxAlerts: 10, windowMs: 60000 },
});

// ============================================================================
// 3. Example: Process Data with Full Error Handling
// ============================================================================

interface User {
  id: string;
  email: string;
  name: string;
}

async function processUserData(userId: string): Promise<User | null> {
  // Step 1: Validate binary exists
  if (!validateBinaryExists('bun')) {
    throw createValidationError(
      EnterpriseErrorCode.SYSTEM_CONFIGURATION_INVALID,
      'Required binary not found: bun',
      'binary',
      'bun'
    );
  }

  // Step 2: Fetch user with circuit breaker
  const user = await withCircuitBreaker(
    'user-service',
    async () => {
      return safeAsync(
        async () => {
          // Simulate API call
          if (Math.random() > 0.8) {
            throw new Error('Network error');
          }
          
          return {
            id: userId,
            email: `user${userId}@example.com`,
            name: `User ${userId}`,
          };
        },
        'Fetching user data',
        null
      );
    },
    {
      failureThreshold: 3,
      resetTimeoutMs: 5000,
      successThreshold: 2,
    }
  );

  if (!user) {
    recordError(
      new Error(`Failed to fetch user: ${userId}`),
      { service: 'user-service', userId, operation: 'fetch_user' }
    );
    return null;
  }

  // Step 3: Validate email
  if (!user.email.includes('@')) {
    throw createValidationError(
      EnterpriseErrorCode.VALIDATION_INPUT_INVALID,
      'Invalid email format',
      'email',
      user.email
    );
  }

  return user;
}

// ============================================================================
// 4. Example: Spawn Process with Error Handling
// ============================================================================

async function runBuildProcess(): Promise<boolean> {
  console.log('🔨 Running version check...\n');

  const result = await safeSpawn(['bun', '--version'], {
    timeoutMs: 5000,
    validateBinary: true,
    serviceName: 'version-check',
    maxOutputSize: 1024,
  });

  if (!result.success) {
    recordError(
      new Error(`Version check failed: ${result.stderr}`),
      {
        service: 'version-check',
        exitCode: result.exitCode,
        durationMs: result.durationMs,
      }
    );
    return false;
  }

  console.log(`✅ Bun version: ${result.stdout.trim()}`);
  console.log(`⏱️ Completed in ${result.durationMs.toFixed(2)}ms\n`);
  return true;
}

// ============================================================================
// 5. Example: TUI with ANSI Handling
// ============================================================================

function renderStatusLine(status: string): void {
  const maxWidth = process.stdout.columns ?? 80;
  const colored = `\x1b[32m✓\x1b[0m ${status}`;
  const { width } = ansiStringWidth(colored);
  
  if (width > maxWidth) {
    // Truncate preserving ANSI codes
    const truncated = truncateAnsi(colored, maxWidth - 3) + '...';
    console.log(truncated);
  } else {
    console.log(colored);
  }
}

// ============================================================================
// 6. Run Examples
// ============================================================================

async function main(): Promise<void> {
  // Example 1: Process user data
  console.log('👤 Processing user data...');
  for (let i = 1; i <= 3; i++) {
    const user = await processUserData(`user-${i}`);
    if (user) {
      renderStatusLine(`Processed: ${user.name} (${user.email})`);
    }
  }

  // Example 2: Run build
  await runBuildProcess();

  // Example 3: Show error statistics
  console.log('\n📊 Error Statistics:');
  const aggregation = getErrorAggregation({
    start: Date.now() - 60000,
    end: Date.now(),
  });
  console.log(`  Total errors: ${aggregation.total}`);
  console.log(`  Error rate: ${aggregation.errorRate.toFixed(2)}/min`);
  console.log(`  Trend: ${aggregation.trend}`);

  // Example 4: Show circuit breaker health
  console.log('\n🔌 Circuit Breaker Health:');
  const health = getCircuitBreakerHealth();
  for (const service of health) {
    const icon = service.healthy ? '✅' : '❌';
    console.log(`  ${icon} ${service.service}: ${service.state}`);
  }

  // Example 5: Show global error stats
  console.log('\n🌍 Global Error Statistics:');
  console.log(getGlobalErrorStatistics());

  console.log('\n✅ Example complete!');
}

// Helper function (not exported from index)
function truncateAnsi(str: string, maxWidth: number): string {
  let result = '';
  let currentWidth = 0;
  let inAnsi = false;

  for (const char of str) {
    if (char === '\x1b') {
      inAnsi = true;
      result += char;
      continue;
    }
    if (inAnsi) {
      result += char;
      if (char === 'm') inAnsi = false;
      continue;
    }
    if (currentWidth >= maxWidth) break;
    result += char;
    currentWidth++;
  }
  return result + '\x1b[0m';
}

// Run main
main().catch(error => {
  console.error('💥 Fatal error:', error);
  process.exit(1);
});
