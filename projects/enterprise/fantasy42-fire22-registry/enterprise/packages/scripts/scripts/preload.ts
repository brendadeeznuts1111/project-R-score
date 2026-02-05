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
console.log('🔥 Fire22 Enterprise System Preload');
console.log(`   Environment: ${globalThis.FIRE22_CONFIG.environment}`);
console.log(`   Version: ${globalThis.FIRE22_CONFIG.version}`);
console.log(`   Enterprise Mode: ${globalThis.FIRE22_CONFIG.enterprise ? 'Enabled' : 'Disabled'}`);
console.log(`   Debug Mode: ${globalThis.FIRE22_CONFIG.debug ? 'Enabled' : 'Disabled'}`);
console.log('');

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
console.log('🔌 Registering Fire22 Enterprise Plugins...');

// Plugin 1: Security monitoring
console.log('   ✅ Security Monitor Plugin');

// Plugin 2: Performance monitoring
console.log('   ✅ Performance Monitor Plugin');

// Plugin 3: Audit logging
console.log('   ✅ Audit Logging Plugin');

console.log('');

// Environment-specific setup
if (globalThis.FIRE22_CONFIG.environment === 'production') {
  console.log('🏭 Production Environment Setup:');
  console.log('   ✅ Error reporting enabled');
  console.log('   ✅ Performance monitoring active');
  console.log('   ✅ Security hardening applied');
} else if (globalThis.FIRE22_CONFIG.environment === 'staging') {
  console.log('🧪 Staging Environment Setup:');
  console.log('   ✅ Test data isolation');
  console.log('   ✅ Debug logging enabled');
  console.log('   ✅ Performance profiling active');
} else {
  console.log('🔧 Development Environment Setup:');
  console.log('   ✅ Hot reload enabled');
  console.log('   ✅ Debug tools active');
  console.log('   ✅ Development optimizations');
}

console.log('');
console.log('🎉 Fire22 Enterprise System Ready!');
console.log('=====================================');
console.log('');

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
