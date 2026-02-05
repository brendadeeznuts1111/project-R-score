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
  console.log('🔍 SCOPE RESOLUTION DEMONSTRATION\n');
  
  // Demo 1: Enterprise scope resolution
  console.log('📋 Demo 1: Enterprise Scope Resolution');
  console.log('─'.repeat(50));
  
  const enterpriseRequest = new Request('http://apple.factory-wager.com', {
    headers: {
      'host': 'apple.factory-wager.com',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  const enterpriseContext = resolveScopeFromRequest(enterpriseRequest);
  console.log(`Domain: ${enterpriseContext.domain}`);
  console.log(`Platform: ${enterpriseContext.platform}`);
  console.log(`Scope: ${enterpriseContext.scope.detectedScope}`);
  console.log(`Overridden: ${enterpriseContext.overridden}`);
  console.log(`Features: ${enterpriseContext.scope.featureFlags.join(', ')}`);
  console.log(`Security Level: ${enterpriseContext.scope.security.level}`);
  console.log(`Max Connections: ${enterpriseContext.scope.connectionConfig.maxConnections}`);
  console.log('');
  
  // Demo 2: Local development scope
  console.log('📋 Demo 2: Local Development Scope');
  console.log('─'.repeat(50));
  
  const localRequest = new Request('http://localhost', {
    headers: {
      'host': 'localhost',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  const localContext = resolveScopeFromRequest(localRequest);
  console.log(`Domain: ${localContext.domain}`);
  console.log(`Platform: ${localContext.platform}`);
  console.log(`Scope: ${localContext.scope.detectedScope}`);
  console.log(`Features: ${localContext.scope.featureFlags.join(', ')}`);
  console.log(`Security Level: ${localContext.scope.security.level}`);
  console.log('');
  
  // Demo 3: Scope override cookie
  console.log('📋 Demo 3: Scope Override Cookie');
  console.log('─'.repeat(50));
  
  const overrideCookie = createScopeOverrideCookie('dev.factory-wager.com', 'macOS', 'DEVELOPMENT');
  console.log('Override Cookie:');
  console.log(overrideCookie);
  console.log('');
  
  const overrideRequest = new Request('http://localhost', {
    headers: {
      'cookie': overrideCookie,
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  const overrideContext = resolveScopeFromRequest(overrideRequest);
  console.log(`Override Domain: ${overrideContext.domain}`);
  console.log(`Override Platform: ${overrideContext.platform}`);
  console.log(`Override Scope: ${overrideContext.scope.detectedScope}`);
  console.log(`Overridden: ${overrideContext.overridden}`);
  console.log('');
}

function demonstrateScopeValidation() {
  console.log('✅ SCOPE VALIDATION DEMONSTRATION\n');
  
  // Create a valid scope context
  const validContext: ScopeContext = {
    domain: 'apple.factory-wager.com',
    platform: 'macOS',
    scope: SCOPING_MATRIX.find(s => s.detectedScope === 'ENTERPRISE')!,
    overridden: false,
    resolvedAt: new Date()
  };
  
  const validationResult = validateScopeContext(validContext);
  
  console.log('📊 Validation Results:');
  console.log(`Valid: ${validationResult.valid}`);
  console.log(`Errors: ${validationResult.errors.length}`);
  console.log(`Warnings: ${validationResult.warnings.length}`);
  
  if (validationResult.warnings.length > 0) {
    console.log('Warnings:');
    validationResult.warnings.forEach(warning => console.log(`  ⚠️  ${warning}`));
  }
  console.log('');
}

function demonstrateScopeMigration() {
  console.log('🔄 SCOPE MIGRATION DEMONSTRATION\n');
  
  const fromScope = SCOPING_MATRIX.find(s => s.detectedScope === 'LOCAL_SANDBOX')!;
  const toScope = SCOPING_MATRIX.find(s => s.detectedScope === 'ENTERPRISE')!;
  
  const migrationPlan = migrateScope(fromScope, toScope);
  
  console.log('📋 Migration Plan:');
  console.log(`From: ${migrationPlan.from}`);
  console.log(`To: ${migrationPlan.to}`);
  console.log(`Estimated Time: ${migrationPlan.estimatedTime} minutes`);
  console.log('');
  
  console.log('🔧 Steps Required:');
  migrationPlan.steps.forEach((step, index) => {
    console.log(`  ${index + 1}. ${step}`);
  });
  console.log('');
  
  if (migrationPlan.risks.length > 0) {
    console.log('⚠️  Risks:');
    migrationPlan.risks.forEach(risk => console.log(`  - ${risk}`));
    console.log('');
  }
}

function demonstrateScopeAnalytics() {
  console.log('📊 SCOPE ANALYTICS DEMONSTRATION\n');
  
  const report = generateScopeReport();
  
  console.log('📈 Scope Analytics Report:');
  console.log(`Generated: ${report.generatedAt.toLocaleString()}`);
  console.log(`Total Scopes: ${report.totalScopes}`);
  console.log('');
  
  console.log('🔐 Scopes by Security Level:');
  Object.entries(report.scopesByLevel).forEach(([level, count]) => {
    console.log(`  ${level}: ${count}`);
  });
  console.log('');
  
  console.log('🌐 Scopes by Domain:');
  Object.entries(report.scopesByDomain).forEach(([domain, count]) => {
    console.log(`  ${domain}: ${count}`);
  });
  console.log('');
  
  console.log('🚀 Top Features:');
  Object.entries(report.featureUsage)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 5)
    .forEach(([feature, count]) => {
      console.log(`  ${feature}: ${count} scopes`);
    });
  console.log('');
  
  console.log('🛡️ Compliance Coverage:');
  Object.entries(report.complianceCoverage).forEach(([framework, count]) => {
    console.log(`  ${framework}: ${count} scopes`);
  });
  console.log('');
}

function demonstrateEnvironmentDetection() {
  console.log('🌍 ENVIRONMENT DETECTION DEMONSTRATION\n');
  
  console.log('🔍 Current Environment:');
  console.log(`Environment: ${detectEnvironment()}`);
  console.log(`Is Production: ${isProductionEnvironment()}`);
  console.log(`Is Development: ${isDevelopmentEnvironment()}`);
  console.log(`Is Testing: ${isTestingEnvironment()}`);
  console.log('');
  
  // Simulate different environments
  const originalNodeEnv = process.env.NODE_ENV;
  
  console.log('🧪 Environment Simulation:');
  
  process.env.NODE_ENV = 'production';
  console.log(`Production Mode: ${detectEnvironment()} → ${isProductionEnvironment()}`);
  
  process.env.NODE_ENV = 'development';
  console.log(`Development Mode: ${detectEnvironment()} → ${isDevelopmentEnvironment()}`);
  
  process.env.NODE_ENV = 'testing';
  console.log(`Testing Mode: ${detectEnvironment()} → ${isTestingEnvironment()}`);
  
  // Restore original
  if (originalNodeEnv) {
    process.env.NODE_ENV = originalNodeEnv;
  } else {
    delete process.env.NODE_ENV;
  }
  
  console.log('');
}

function demonstrateScopeUtilities() {
  console.log('🛠️ SCOPE UTILITIES DEMONSTRATION\n');
  
  console.log('📋 All Available Scopes:');
  const allScopes = getAllScopes();
  allScopes.forEach(scope => {
    console.log(`  ${scope.detectedScope} - ${scope.servingDomain} (${scope.platform})`);
  });
  console.log('');
  
  console.log('🔐 Enterprise-Level Scopes:');
  const enterpriseScopes = getScopesByLevel('ENTERPRISE');
  enterpriseScopes.forEach(scope => {
    console.log(`  ${scope.detectedScope}: ${scope.servingDomain}`);
  });
  console.log('');
  
  console.log('🚀 Scopes with PREMIUM Feature:');
  const premiumScopes = getScopesWithFeature('PREMIUM');
  premiumScopes.forEach(scope => {
    console.log(`  ${scope.detectedScope}: ${scope.featureFlags.length} features`);
  });
  console.log('');
  
  console.log('🌐 Localhost Scopes:');
  const localScopes = getScopesByDomain('localhost');
  localScopes.forEach(scope => {
    console.log(`  ${scope.detectedScope}: ${scope.security.level} security`);
  });
  console.log('');
}

function demonstrateCookieManagement() {
  console.log('🍪 COOKIE MANAGEMENT DEMONSTRATION\n');
  
  // Create different types of cookies
  console.log('🔧 Creating Scope Override Cookies:');
  
  const basicCookie = createScopeOverrideCookie('test.com', 'macOS', 'DEVELOPMENT');
  console.log('Basic Cookie:');
  console.log(`  ${basicCookie}`);
  console.log('');
  
  const parsed = parseScopeOverrideCookie(`duoplus-scope-override=${basicCookie.split('=')[1]}`);
  console.log('📖 Parsed Cookie:');
  console.log(`  Domain: ${parsed?.domain}`);
  console.log(`  Platform: ${parsed?.platform}`);
  console.log(`  Scope ID: ${parsed?.scopeId}`);
  console.log('');
  
  const clearCookie = clearScopeOverrideCookie();
  console.log('🗑️  Clear Cookie:');
  console.log(`  ${clearCookie}`);
  console.log('');
}

function demonstrateSecurityLevels() {
  console.log('🔒 SECURITY LEVELS DEMONSTRATION\n');
  
  const securityLevels = ['BASIC', 'STANDARD', 'ENTERPRISE'];
  
  securityLevels.forEach(level => {
    console.log(`🛡️ ${level} Security Level:`);
    const scopes = getScopesByLevel(level);
    
    scopes.forEach(scope => {
      console.log(`  ${scope.detectedScope}:`);
      console.log(`    MFA Required: ${scope.security.mfaRequired}`);
      console.log(`    Audit Logging: ${scope.security.auditLogging}`);
      console.log(`    Max Connections: ${scope.connectionConfig.maxConnections}`);
      console.log(`    Compliance Frameworks: ${scope.compliance.frameworks.join(', ') || 'None'}`);
    });
    console.log('');
  });
}

function demonstratePerformance() {
  console.log('⚡ PERFORMANCE DEMONSTRATION\n');
  
  const iterations = 1000;
  const request = new Request('http://apple.factory-wager.com', {
    headers: {
      'host': 'apple.factory-wager.com',
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
  });
  
  console.log(`🏃 Running ${iterations} scope resolutions...`);
  
  const start = performance.now();
  
  for (let i = 0; i < iterations; i++) {
    resolveScopeFromRequest(request);
  }
  
  const end = performance.now();
  const totalTime = end - start;
  const avgTime = totalTime / iterations;
  
  console.log('⏱️ Performance Results:');
  console.log(`  Total time: ${totalTime.toFixed(2)}ms`);
  console.log(`  Average per resolution: ${avgTime.toFixed(4)}ms`);
  console.log(`  Resolutions per second: ${(1000 / avgTime).toFixed(0)}`);
  console.log('');
  
  // Test report generation performance
  console.log('📊 Testing report generation performance...');
  
  const reportStart = performance.now();
  for (let i = 0; i < 100; i++) {
    generateScopeReport();
  }
  const reportEnd = performance.now();
  
  console.log(`  Report generation: ${((reportEnd - reportStart) / 100).toFixed(2)}ms average`);
  console.log('');
}

// Main demo execution
function runScopeConfigDemo() {
  console.log('🎯 DuoPlus Scope Configuration System Demo');
  console.log('='.repeat(60));
  console.log('');
  
  demonstrateScopeResolution();
  demonstrateScopeValidation();
  demonstrateScopeMigration();
  demonstrateScopeAnalytics();
  demonstrateEnvironmentDetection();
  demonstrateScopeUtilities();
  demonstrateCookieManagement();
  demonstrateSecurityLevels();
  demonstratePerformance();
  
  console.log('✅ Scope configuration demonstration completed successfully!');
  console.log('');
  console.log('🎉 Key Features Demonstrated:');
  console.log('  • Dynamic scope resolution from requests');
  console.log('  • Cookie-based scope overrides');
  console.log('  • Comprehensive validation system');
  console.log('  • Migration planning and analytics');
  console.log('  • Environment detection and utilities');
  console.log('  • High-performance operations');
  console.log('  • Security level management');
  console.log('  • Compliance tracking');
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
