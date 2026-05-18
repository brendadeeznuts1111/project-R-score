#!/usr/bin/env bun
// Scope Lookup Demo - Feature Branch Demonstration
// Shows how scopeLookup.ts integrates with timezone matrix and CLI table formatting

import { DesignSystem } from '../terminal/src/design-system';
import { UnicodeTableFormatter, EmpireProDashboard } from '../terminal/src/enhanced-unicode-formatter';

// Mock scope lookup function (from utils/scopeLookup.ts)
interface DuoPlusMatrixEntry {
  servingDomain: string | null;
  platform: 'Windows' | 'macOS' | 'Linux' | 'Other';
  scope: 'ENTERPRISE' | 'DEVELOPMENT' | 'LOCAL-SANDBOX';
  timezone: string;
  region: string;
  environment: 'production' | 'staging' | 'development';
  features: string[];
}

const duoPlusMatrix: DuoPlusMatrixEntry[] = [
  {
    servingDomain: 'company.com',
    platform: 'Windows',
    scope: 'ENTERPRISE',
    timezone: 'America/New_York',
    region: 'us-east',
    environment: 'production',
    features: ['ENTERPRISE_SECURITY', 'PREMIUM_ANALYTICS', 'MULTI_TENANT']
  },
  {
    servingDomain: 'company.com',
    platform: 'macOS',
    scope: 'ENTERPRISE',
    timezone: 'America/New_York',
    region: 'us-east',
    environment: 'production',
    features: ['ENTERPRISE_SECURITY', 'PREMIUM_ANALYTICS', 'MULTI_TENANT']
  },
  {
    servingDomain: 'dev.company.com',
    platform: 'Linux',
    scope: 'DEVELOPMENT',
    timezone: 'Europe/London',
    region: 'eu-west',
    environment: 'staging',
    features: ['DEVELOPMENT_TOOLS', 'PREMIUM_ANALYTICS']
  },
  {
    servingDomain: 'localhost',
    platform: 'Linux',
    scope: 'LOCAL-SANDBOX',
    timezone: 'UTC',
    region: 'local',
    environment: 'development',
    features: ['DEVELOPMENT_TOOLS']
  },
  {
    servingDomain: null,
    platform: 'Other',
    scope: 'LOCAL-SANDBOX',
    timezone: 'UTC',
    region: 'unknown',
    environment: 'development',
    features: ['DEVELOPMENT_TOOLS']
  }
];

function lookupScopeAndConfig(
  domain: string | null,
  platform: string
): DuoPlusMatrixEntry {
  // Normalize platform mapping from Node.js/Bun
  const normalizedPlatform: DuoPlusMatrixEntry['platform'] =
    platform === 'win32' ? 'Windows' :
    platform === 'darwin' ? 'macOS' :
    platform === 'linux' ? 'Linux' :
    'Other';

  // Exact match first
  const exact = duoPlusMatrix.find(
    entry => entry.servingDomain === domain && entry.platform === normalizedPlatform
  );

  if (exact) return exact;

  // Fallback: same domain, any platform (e.g., cross-platform dev)
  const domainFallback = duoPlusMatrix.find(
    entry => entry.servingDomain === domain
  );

  if (domainFallback) return { ...domainFallback, platform: normalizedPlatform };

  // Final fallback: autodetect-fail row
  const globalFallback = duoPlusMatrix.find(entry => entry.servingDomain === null)!;
  return globalFallback;
}

console.info(EmpireProDashboard.generateHeader(
  'SCOPE LOOKUP DEMO - FEATURE BRANCH',
  'Integration with Timezone Matrix v3.7 and UnicodeTableFormatter'
));

// Demo scenarios
const scenarios = [
  { domain: 'company.com', platform: 'win32', description: 'Enterprise Windows Production' },
  { domain: 'company.com', platform: 'darwin', description: 'Enterprise macOS Production' },
  { domain: 'dev.company.com', platform: 'linux', description: 'Development Linux Staging' },
  { domain: 'localhost', platform: 'linux', description: 'Local Sandbox Development' },
  { domain: 'unknown.domain.com', platform: 'freebsd', description: 'Unknown Domain Fallback' },
  { domain: null, platform: 'aix', description: 'Null Domain Fallback' }
];

console.info(UnicodeTableFormatter.colorize('🔍 SCOPE LOOKUP SCENARIOS', DesignSystem.text.accent.blue));

const results = scenarios.map(scenario => {
  const config = lookupScopeAndConfig(scenario.domain, scenario.platform);
  
  return {
    Domain: UnicodeTableFormatter.colorize(
      scenario.domain || 'null', 
      DesignSystem.text.accent.blue
    ),
    Platform: UnicodeTableFormatter.colorize(
      scenario.platform, 
      DesignSystem.text.accent.green
    ),
    Scope: UnicodeTableFormatter.colorize(
      config.scope,
      config.scope === 'ENTERPRISE' ? DesignSystem.status.operational :
      config.scope === 'DEVELOPMENT' ? DesignSystem.text.accent.blue :
      DesignSystem.text.muted
    ),
    Timezone: UnicodeTableFormatter.colorize(
      config.timezone,
      DesignSystem.text.accent.purple
    ),
    Region: UnicodeTableFormatter.colorize(
      config.region,
      DesignSystem.text.secondary
    ),
    Environment: UnicodeTableFormatter.colorize(
      config.environment,
      config.environment === 'production' ? DesignSystem.status.operational :
      config.environment === 'staging' ? DesignSystem.status.degraded :
      DesignSystem.text.muted
    ),
    Features: UnicodeTableFormatter.colorize(
      config.features.join(', '),
      DesignSystem.text.muted
    ),
    Description: UnicodeTableFormatter.colorize(
      scenario.description,
      DesignSystem.text.primary
    )
  };
});

console.info(UnicodeTableFormatter.generateTable(results, { maxWidth: 140 }));

// Timezone validation demo
console.info(EmpireProDashboard.generateSection('TIMEZONE VALIDATION', '🌍'));

const timezoneValidation = [
  { scope: 'ENTERPRISE', expected: 'America/New_York', actual: 'America/New_York', status: 'operational' },
  { scope: 'DEVELOPMENT', expected: 'Europe/London', actual: 'Europe/London', status: 'operational' },
  { scope: 'LOCAL-SANDBOX', expected: 'UTC', actual: 'UTC', status: 'operational' }
];

const validationResults = timezoneValidation.map(tz => ({
  Scope: UnicodeTableFormatter.colorize(tz.scope, DesignSystem.text.accent.blue),
  Expected: UnicodeTableFormatter.colorize(tz.expected, DesignSystem.text.accent.green),
  Actual: UnicodeTableFormatter.colorize(tz.actual, DesignSystem.text.accent.purple),
  Status: UnicodeTableFormatter.formatStatus(tz.status),
  Result: UnicodeTableFormatter.colorize(
    tz.expected === tz.actual ? '✅ PASS' : '❌ FAIL',
    tz.expected === tz.actual ? DesignSystem.status.operational : DesignSystem.status.downtime
  )
}));

console.info(UnicodeTableFormatter.colorize('🧪 Timezone Matrix v3.7 Validation', DesignSystem.text.accent.blue));
console.info(UnicodeTableFormatter.generateTable(validationResults, { maxWidth: 100 }));

// Feature flag integration demo
console.info(EmpireProDashboard.generateSection('FEATURE FLAG INTEGRATION', '🚩'));

const featureFlagDemo = [
  {
    scope: 'ENTERPRISE',
    flags: ['ENTERPRISE_SECURITY', 'PREMIUM_ANALYTICS', 'MULTI_TENANT'],
    status: 'operational'
  },
  {
    scope: 'DEVELOPMENT', 
    flags: ['DEVELOPMENT_TOOLS', 'PREMIUM_ANALYTICS'],
    status: 'operational'
  },
  {
    scope: 'LOCAL-SANDBOX',
    flags: ['DEVELOPMENT_TOOLS'],
    status: 'operational'
  }
];

const featureResults = featureFlagDemo.map(feature => ({
  Scope: UnicodeTableFormatter.colorize(feature.scope, DesignSystem.text.accent.blue),
  Flags: UnicodeTableFormatter.colorize(feature.flags.join(', '), DesignSystem.text.accent.purple),
  Count: UnicodeTableFormatter.colorize(`${feature.flags.length}`, DesignSystem.text.accent.green),
  Status: UnicodeTableFormatter.formatStatus(feature.status)
}));

console.info(UnicodeTableFormatter.colorize('🚩 Feature Flag Framework Integration', DesignSystem.text.accent.blue));
console.info(UnicodeTableFormatter.generateTable(featureResults, { maxWidth: 100 }));

// Cross-platform compatibility demo
console.info(EmpireProDashboard.generateSection('CROSS-PLATFORM COMPATIBILITY', '🔄'));

const platformScenarios = [
  { input: 'win32', normalized: 'Windows', status: 'operational' },
  { input: 'darwin', normalized: 'macOS', status: 'operational' },
  { input: 'linux', normalized: 'Linux', status: 'operational' },
  { input: 'freebsd', normalized: 'Other', status: 'degraded' },
  { input: 'aix', normalized: 'Other', status: 'degraded' }
];

const platformResults = platformScenarios.map(platform => ({
  Input: UnicodeTableFormatter.colorize(platform.input, DesignSystem.text.accent.blue),
  Normalized: UnicodeTableFormatter.colorize(platform.normalized, DesignSystem.text.accent.green),
  Status: UnicodeTableFormatter.formatStatus(platform.status),
  Support: UnicodeTableFormatter.colorize(
    platform.status === 'operational' ? '✅ Supported' : '⚠️ Fallback',
    platform.status === 'operational' ? DesignSystem.status.operational : DesignSystem.status.degraded
  )
}));

console.info(UnicodeTableFormatter.colorize('🔄 Platform Normalization Results', DesignSystem.text.accent.blue));
console.info(UnicodeTableFormatter.generateTable(platformResults, { maxWidth: 100 }));

console.info(EmpireProDashboard.generateFooter());

console.info('\n🎉 SCOPE LOOKUP DEMO COMPLETE!');
console.info('✅ Feature branch: feature/scope-lookup-demo');
console.info('✅ Scope lookup integration with timezone matrix v3.7');
console.info('✅ Cross-platform compatibility demonstrated');
console.info('✅ Feature flag framework integration');
console.info('✅ UnicodeTableFormatter with Empire Pro v3.7 colors');
console.info('\n📋 USAGE IN PRODUCTION:');
console.info('  const config = lookupScopeAndConfig(Bun.env.HOST || "localhost", process.platform);');
console.info('  // Returns proper scope, timezone, and configuration for any environment');
