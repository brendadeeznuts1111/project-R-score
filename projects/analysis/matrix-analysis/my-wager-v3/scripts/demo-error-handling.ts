#!/usr/bin/env bun
// Error Handling Demo
// [TENSION-DEMO-001] [TENSION-ERROR-DEMO-002]

import { errorHandler, TensionErrorCode, BunErrorUtils } from '../src/tension-field/error-handler';

console.info('🛡️ Tension Field Error Handling Demo');
console.info('=====================================\n');

// Demo 1: Create and handle errors
console.info('1. Creating structured errors...');
const error1 = errorHandler.createError(
  TensionErrorCode.PROPAGATION_FAILED,
  'Graph propagation failed on node network',
  'high',
  { nodeId: 'node-42', iterations: 150, maxDelta: 0.8 },
  true,
  3
);

console.info('   Error created:', {
  code: error1.code,
  severity: error1.severity,
  recoverable: error1.recoverable,
  context: error1.context
});

// Demo 2: Handle errors with logging
console.info('\n2. Handling errors with logging...');
await errorHandler.handleError(error1);

// Demo 3: Timed operations
console.info('\n3. Timed error tracking...');
try {
  await BunErrorUtils.createTimedError(
    TENSIONErrorCode.TIMEOUT_EXCEEDED,
    async () => {
      // Simulate a slow operation
      await Bun.sleep(100);
      return 'Operation completed';
    },
    { operation: 'data-processing' }
  );
  console.info('   ✅ Operation completed successfully');
} catch (e) {
  console.info('   ❌ Operation failed:', (e as Error).message);
}

// Demo 4: Error wrapping
console.info('\n4. Function wrapping with error handling...');
const safeDivision = BunErrorUtils.withErrorHandling(
  async (a: number, b: number) => {
    if (b === 0) {
      throw new Error('Division by zero');
    }
    return a / b;
  },
  TensionErrorCode.DATA_VALIDATION_FAILED
);

try {
  const result = await safeDivision(10, 0);
  console.info('   Result:', result);
} catch (e) {
  console.info('   ❌ Caught error:', (e as Error).message);
}

// Demo 5: Batch error processing
console.info('\n5. Batch error processing...');
const errors = [
  errorHandler.createError(TensionErrorCode.NODE_NOT_FOUND, 'Missing node'),
  errorHandler.createError(TensionErrorCode.MEMORY_LIMIT_EXCEEDED, 'High memory usage', 'medium'),
  errorHandler.createError(TensionErrorCode.WEBSOCKET_CONNECTION_FAILED, 'WS dropped', 'low')
];

await BunErrorUtils.processErrors(errors);
console.info('   Processed', errors.length, 'errors');

// Demo 6: Error statistics
console.info('\n6. Error statistics...');
const stats = errorHandler.getErrorStats();
console.info('   Error summary:');
stats.forEach((stat: any) => {
  console.info(`   - ${stat.code}: ${stat.count} occurrences (${stat.severity})`);
});

// Demo 7: Circuit breaker
console.info('\n7. Circuit breaker pattern...');
// Simulate multiple failures for the same service
for (let i = 0; i < 6; i++) {
  await errorHandler.handleError(
    errorHandler.createError(
      TensionErrorCode.EXTERNAL_API_ERROR,
      `API call failed (attempt ${i + 1})`,
      'medium',
      { service: 'external-api', endpoint: '/tension' }
    )
  );
}

console.info('   Service available:', errorHandler.isServiceAvailable('external-api'));

// Demo 8: Critical error handling
console.info('\n8. Critical error notification...');
const criticalError = errorHandler.createError(
  TensionErrorCode.SECURITY_VIOLATION,
  'Unauthorized access attempt detected',
  'critical',
  { ip: '192.168.1.100', endpoint: '/admin' }
);

await errorHandler.handleError(criticalError);
console.info('   🚨 Critical error logged and notified');

// Demo 9: Cleanup old errors
console.info('\n9. Cleanup old errors...');
await errorHandler.cleanupOldLogs(0); // Clean all errors for demo
console.info('   ✅ Old errors cleaned up');

console.info('\n✅ Error handling demo complete!');
console.info('\n📊 Check the following files for error logs:');
console.info('   - ./tension-errors.db (SQLite database)');
console.info('   - ./tension-errors.log (Text log)');
console.info('   - ./critical-errors.json (Critical errors)');
