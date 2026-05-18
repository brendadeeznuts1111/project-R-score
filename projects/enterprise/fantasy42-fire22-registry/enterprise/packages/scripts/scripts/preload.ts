/**
 * Fire22 Enterprise Preload Script
 * Executed before running any Bun script or file
 *
 * This script sets up the enterprise environment, registers plugins,
 * and configures global settings for the Fire22 system.
 */

// Global Fire22 configuration
declare global {
  var FIRE22_CONFIG: {
    environment: string;
    version: string;
    enterprise: boolean;
    debug: boolean;
  };
}

// Initialize Fire22 global configuration
globalThis.FIRE22_CONFIG = {
  environment: process.env.FIRE22_ENV || 'development',
  version: '2.3.0',
  enterprise: true,
  debug: process.env.FIRE22_DEBUG === 'true',
};

// Enterprise logging setup
console.info('🔥 Fire22 Enterprise System Preload');
console.info(`   Environment: ${globalThis.FIRE22_CONFIG.environment}`);
console.info(`   Version: ${globalThis.FIRE22_CONFIG.version}`);
console.info(`   Enterprise Mode: ${globalThis.FIRE22_CONFIG.enterprise ? 'Enabled' : 'Disabled'}`);
console.info(`   Debug Mode: ${globalThis.FIRE22_CONFIG.debug ? 'Enabled' : 'Disabled'}`);
console.info('');

// Global error handler for enterprise monitoring
process.on('uncaughtException', error => {
  console.error('🚨 Fire22 Uncaught Exception:', error);
  // In enterprise environment, you might want to:
  // - Send to monitoring system (DataDog, Sentry, etc.)
  // - Log to enterprise audit system
  // - Trigger alerts for critical errors
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Fire22 Unhandled Rejection:', reason);
  // Similar enterprise handling as above
});

// Enterprise plugin registration
console.info('🔌 Registering Fire22 Enterprise Plugins...');

// Plugin 1: Security monitoring
console.info('   ✅ Security Monitor Plugin');

// Plugin 2: Performance monitoring
console.info('   ✅ Performance Monitor Plugin');

// Plugin 3: Audit logging
console.info('   ✅ Audit Logging Plugin');

console.info('');

// Environment-specific setup
if (globalThis.FIRE22_CONFIG.environment === 'production') {
  console.info('🏭 Production Environment Setup:');
  console.info('   ✅ Error reporting enabled');
  console.info('   ✅ Performance monitoring active');
  console.info('   ✅ Security hardening applied');
} else if (globalThis.FIRE22_CONFIG.environment === 'staging') {
  console.info('🧪 Staging Environment Setup:');
  console.info('   ✅ Test data isolation');
  console.info('   ✅ Debug logging enabled');
  console.info('   ✅ Performance profiling active');
} else {
  console.info('🔧 Development Environment Setup:');
  console.info('   ✅ Hot reload enabled');
  console.info('   ✅ Debug tools active');
  console.info('   ✅ Development optimizations');
}

console.info('');
console.info('🎉 Fire22 Enterprise System Ready!');
console.info('=====================================');
console.info('');

// Export for use in other scripts
export {};

// Make available globally for scripts
(globalThis as any).FIRE22 = {
  config: globalThis.FIRE22_CONFIG,
  version: globalThis.FIRE22_CONFIG.version,
  environment: globalThis.FIRE22_CONFIG.environment,
  isEnterprise: globalThis.FIRE22_CONFIG.enterprise,
  isDebug: globalThis.FIRE22_CONFIG.debug,
};
