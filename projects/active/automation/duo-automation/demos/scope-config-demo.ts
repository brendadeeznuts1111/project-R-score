// Scope Configuration System Demo
// This demonstrates the comprehensive scope configuration and management system

import {
  resolveScopeFromRequest,
  createScopeOverrideCookie,
  parseScopeOverrideCookie,
  clearScopeOverrideCookie,
  validateScopeContext,
  migrateScope,
  generateScopeReport,
  detectEnvironment,
  isProductionEnvironment,
  isDevelopmentEnvironment,
  isTestingEnvironment,
  getAllScopes,
  getScopesByLevel,
  getScopesWithFeature,
  getScopesByDomain,
  SCOPING_MATRIX,
  type ScopeContext,
  type ScopingRule
} from '../config/scope.config';

// Demo Functions
function demonstrateScopeResolution() {
  console.info('🔍 SCOPE RESOLUTION DEMONSTRATION\n');
  
  // Demo 1: Enterprise scope resolution
  console.info('📋 Demo 1: Enterprise Scope Resolution');
  console.info('─'.repeat(50));
  
  const enterpriseRequest = new Request('http://apple.factory-wager.com', {
    headers: {
      'host': 'apple.factory-wager.com',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  const enterpriseContext = resolveScopeFromRequest(enterpriseRequest);
  console.info(`Domain: ${enterpriseContext.domain}`);
  console.info(`Platform: ${enterpriseContext.platform}`);
  console.info(`Scope: ${enterpriseContext.scope.detectedScope}`);
  console.info(`Overridden: ${enterpriseContext.overridden}`);
  console.info(`Features: ${enterpriseContext.scope.featureFlags.join(', ')}`);
  console.info(`Security Level: ${enterpriseContext.scope.security.level}`);
  console.info(`Max Connections: ${enterpriseContext.scope.connectionConfig.maxConnections}`);
  console.info('');
  
  // Demo 2: Local development scope
  console.info('📋 Demo 2: Local Development Scope');
  console.info('─'.repeat(50));
  
  const localRequest = new Request('http://localhost', {
    headers: {
      'host': 'localhost',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  const localContext = resolveScopeFromRequest(localRequest);
  console.info(`Domain: ${localContext.domain}`);
  console.info(`Platform: ${localContext.platform}`);
  console.info(`Scope: ${localContext.scope.detectedScope}`);
  console.info(`Features: ${localContext.scope.featureFlags.join(', ')}`);
  console.info(`Security Level: ${localContext.scope.security.level}`);
  console.info('');
  
  // Demo 3: Scope override cookie
  console.info('📋 Demo 3: Scope Override Cookie');
  console.info('─'.repeat(50));
  
  const overrideCookie = createScopeOverrideCookie('dev.factory-wager.com', 'macOS', 'DEVELOPMENT');
  console.info('Override Cookie:');
  console.info(overrideCookie);
  console.info('');
  
  const overrideRequest = new Request('http://localhost', {
    headers: {
      'cookie': overrideCookie,
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  const overrideContext = resolveScopeFromRequest(overrideRequest);
  console.info(`Override Domain: ${overrideContext.domain}`);
  console.info(`Override Platform: ${overrideContext.platform}`);
  console.info(`Override Scope: ${overrideContext.scope.detectedScope}`);
  console.info(`Overridden: ${overrideContext.overridden}`);
  console.info('');
}

function demonstrateScopeValidation() {
  console.info('✅ SCOPE VALIDATION DEMONSTRATION\n');
  
  // Create a valid scope context
  const validContext: ScopeContext = {
    domain: 'apple.factory-wager.com',
    platform: 'macOS',
    scope: SCOPING_MATRIX.find(s => s.detectedScope === 'ENTERPRISE')!,
    overridden: false,
    resolvedAt: new Date()
  };
  
  const validationResult = validateScopeContext(validContext);
  
  console.info('📊 Validation Results:');
  console.info(`Valid: ${validationResult.valid}`);
  console.info(`Errors: ${validationResult.errors.length}`);
  console.info(`Warnings: ${validationResult.warnings.length}`);
  
  if (validationResult.warnings.length > 0) {
    console.info('Warnings:');
    validationResult.warnings.forEach(warning => console.info(`  ⚠️  ${warning}`));
  }
  console.info('');
}

function demonstrateScopeMigration() {
  console.info('🔄 SCOPE MIGRATION DEMONSTRATION\n');
  
  const fromScope = SCOPING_MATRIX.find(s => s.detectedScope === 'LOCAL_SANDBOX')!;
  const toScope = SCOPING_MATRIX.find(s => s.detectedScope === 'ENTERPRISE')!;
  
  const migrationPlan = migrateScope(fromScope, toScope);
  
  console.info('📋 Migration Plan:');
  console.info(`From: ${migrationPlan.from}`);
  console.info(`To: ${migrationPlan.to}`);
  console.info(`Estimated Time: ${migrationPlan.estimatedTime} minutes`);
  console.info('');
  
  console.info('🔧 Steps Required:');
  migrationPlan.steps.forEach((step, index) => {
    console.info(`  ${index + 1}. ${step}`);
  });
  console.info('');
  
  if (migrationPlan.risks.length > 0) {
    console.info('⚠️  Risks:');
    migrationPlan.risks.forEach(risk => console.info(`  - ${risk}`));
    console.info('');
  }
}

function demonstrateScopeAnalytics() {
  console.info('📊 SCOPE ANALYTICS DEMONSTRATION\n');
  
  const report = generateScopeReport();
  
  console.info('📈 Scope Analytics Report:');
  console.info(`Generated: ${report.generatedAt.toLocaleString()}`);
  console.info(`Total Scopes: ${report.totalScopes}`);
  console.info('');
  
  console.info('🔐 Scopes by Security Level:');
  Object.entries(report.scopesByLevel).forEach(([level, count]) => {
    console.info(`  ${level}: ${count}`);
  });
  console.info('');
  
  console.info('🌐 Scopes by Domain:');
  Object.entries(report.scopesByDomain).forEach(([domain, count]) => {
    console.info(`  ${domain}: ${count}`);
  });
  console.info('');
  
  console.info('🚀 Top Features:');
  Object.entries(report.featureUsage)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([feature, count]) => {
      console.info(`  ${feature}: ${count} scopes`);
    });
  console.info('');
  
  console.info('🛡️ Compliance Coverage:');
  Object.entries(report.complianceCoverage).forEach(([framework, count]) => {
    console.info(`  ${framework}: ${count} scopes`);
  });
  console.info('');
}

function demonstrateEnvironmentDetection() {
  console.info('🌍 ENVIRONMENT DETECTION DEMONSTRATION\n');
  
  console.info('🔍 Current Environment:');
  console.info(`Environment: ${detectEnvironment()}`);
  console.info(`Is Production: ${isProductionEnvironment()}`);
  console.info(`Is Development: ${isDevelopmentEnvironment()}`);
  console.info(`Is Testing: ${isTestingEnvironment()}`);
  console.info('');
  
  // Simulate different environments
  const originalNodeEnv = process.env.NODE_ENV;
  
  console.info('🧪 Environment Simulation:');
  
  process.env.NODE_ENV = 'production';
  console.info(`Production Mode: ${detectEnvironment()} → ${isProductionEnvironment()}`);
  
  process.env.NODE_ENV = 'development';
  console.info(`Development Mode: ${detectEnvironment()} → ${isDevelopmentEnvironment()}`);
  
  process.env.NODE_ENV = 'testing';
  console.info(`Testing Mode: ${detectEnvironment()} → ${isTestingEnvironment()}`);
  
  // Restore original
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv;
  } else {
    delete process.env.NODE_ENV;
  }
  
  console.info('');
}

function demonstrateScopeUtilities() {
  console.info('🛠️ SCOPE UTILITIES DEMONSTRATION\n');
  
  console.info('📋 All Available Scopes:');
  const allScopes = getAllScopes();
  allScopes.forEach(scope => {
    console.info(`  ${scope.detectedScope} - ${scope.servingDomain} (${scope.platform})`);
  });
  console.info('');
  
  console.info('🔐 Enterprise-Level Scopes:');
  const enterpriseScopes = getScopesByLevel('ENTERPRISE');
  enterpriseScopes.forEach(scope => {
    console.info(`  ${scope.detectedScope}: ${scope.servingDomain}`);
  });
  console.info('');
  
  console.info('🚀 Scopes with PREMIUM Feature:');
  const premiumScopes = getScopesWithFeature('PREMIUM');
  premiumScopes.forEach(scope => {
    console.info(`  ${scope.detectedScope}: ${scope.featureFlags.length} features`);
  });
  console.info('');
  
  console.info('🌐 Localhost Scopes:');
  const localScopes = getScopesByDomain('localhost');
  localScopes.forEach(scope => {
    console.info(`  ${scope.detectedScope}: ${scope.security.level} security`);
  });
  console.info('');
}

function demonstrateCookieManagement() {
  console.info('🍪 COOKIE MANAGEMENT DEMONSTRATION\n');
  
  // Create different types of cookies
  console.info('🔧 Creating Scope Override Cookies:');
  
  const basicCookie = createScopeOverrideCookie('test.com', 'macOS', 'DEVELOPMENT');
  console.info('Basic Cookie:');
  console.info(`  ${basicCookie}`);
  console.info('');
  
  const parsed = parseScopeOverrideCookie(`duoplus-scope-override=${basicCookie.split('=')[1]}`);
  console.info('📖 Parsed Cookie:');
  console.info(`  Domain: ${parsed?.domain}`);
  console.info(`  Platform: ${parsed?.platform}`);
  console.info(`  Scope ID: ${parsed?.scopeId}`);
  console.info('');
  
  const clearCookie = clearScopeOverrideCookie();
  console.info('🗑️  Clear Cookie:');
  console.info(`  ${clearCookie}`);
  console.info('');
}

function demonstrateSecurityLevels() {
  console.info('🔒 SECURITY LEVELS DEMONSTRATION\n');
  
  const securityLevels = ['BASIC', 'STANDARD', 'ENTERPRISE'];
  
  securityLevels.forEach(level => {
    console.info(`🛡️ ${level} Security Level:`);
    const scopes = getScopesByLevel(level);
    
    scopes.forEach(scope => {
      console.info(`  ${scope.detectedScope}:`);
      console.info(`    MFA Required: ${scope.security.mfaRequired}`);
      console.info(`    Audit Logging: ${scope.security.auditLogging}`);
      console.info(`    Max Connections: ${scope.connectionConfig.maxConnections}`);
      console.info(`    Compliance Frameworks: ${scope.compliance.frameworks.join(', ') || 'None'}`);
    });
    console.info('');
  });
}

function demonstratePerformance() {
  console.info('⚡ PERFORMANCE DEMONSTRATION\n');
  
  const iterations = 1000;
  const request = new Request('http://apple.factory-wager.com', {
    headers: {
      'host': 'apple.factory-wager.com',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  console.info(`🏃 Running ${iterations} scope resolutions...`);
  
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    resolveScopeFromRequest(request);
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  
  console.info('⏱️ Performance Results:');
  console.info(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.info(`  Average per resolution: ${avgTime.toFixed(4)}ms`);
  console.info(`  Resolutions per second: ${(1000 / avgTime).toFixed(0)}`);
  console.info('');
  
  // Test report generation performance
  console.info('📊 Testing report generation performance...');
  
  const reportStart = performance.now();
  for (let i = 0; i < 100; i++) {
    generateScopeReport();
  }
  const reportEnd = performance.now();
  
  console.info(`  Report generation: ${((reportEnd - reportStart) / 100).toFixed(2)}ms average`);
  console.info('');
}

// Main demo execution
function runScopeConfigDemo() {
  console.info('🎯 DuoPlus Scope Configuration System Demo');
  console.info('='.repeat(60));
  console.info('');
  
  demonstrateScopeResolution();
  demonstrateScopeValidation();
  demonstrateScopeMigration();
  demonstrateScopeAnalytics();
  demonstrateEnvironmentDetection();
  demonstrateScopeUtilities();
  demonstrateCookieManagement();
  demonstrateSecurityLevels();
  demonstratePerformance();
  
  console.info('✅ Scope configuration demonstration completed successfully!');
  console.info('');
  console.info('🎉 Key Features Demonstrated:');
  console.info('  • Dynamic scope resolution from requests');
  console.info('  • Cookie-based scope overrides');
  console.info('  • Comprehensive validation system');
  console.info('  • Migration planning and analytics');
  console.info('  • Environment detection and utilities');
  console.info('  • High-performance operations');
  console.info('  • Security level management');
  console.info('  • Compliance tracking');
}

// Execute demo if run directly
if (import.meta.main) {
  runScopeConfigDemo();
}

export {
  runScopeConfigDemo,
  demonstrateScopeResolution,
  demonstrateScopeValidation,
  demonstrateScopeMigration,
  demonstrateScopeAnalytics
};
