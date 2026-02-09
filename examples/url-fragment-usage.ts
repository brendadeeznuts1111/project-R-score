#!/usr/bin/env bun

/**
 * 🔗 URL Fragment Usage Examples
 * 
 * Comprehensive examples demonstrating proper URL and fragment handling
 * in the FactoryWager R2 integration system
 */

import { 
  URLHandler, 
  URLFragmentUtils, 
  FactoryWagerURLUtils,
  EnhancedURL 
} from '../lib/core/url-handler.ts';
import { R2MCPIntegration } from '../lib/mcp/r2-integration-fixed.ts';

/**
 * Example 1: Basic URL Fragment Operations
 */
async function basicFragmentExamples() {
  console.log('🔗 Basic URL Fragment Examples');
  console.log('='.repeat(50));

  // Create URLs with fragments
  const dashboardURL = FactoryWagerURLUtils.createDashboardURL('analytics', {
    tab: 'overview',
    period: '7d',
    filter: 'errors'
  });

  console.log('📊 Dashboard URL with fragment:');
  console.log(`   ${dashboardURL}`);

  // Parse the fragment
  const fragment = URLHandler.getFragment(dashboardURL);
  const parsedFragment = URLFragmentUtils.parseFragment(fragment);
  
  console.log('\n🔍 Parsed fragment:');
  console.log(`   Tab: ${parsedFragment.tab}`);
  console.log(`   Period: ${parsedFragment.period}`);
  console.log(`   Filter: ${parsedFragment.filter}`);

  // Modify fragment
  const modifiedURL = URLFragmentUtils.setFragmentParam(dashboardURL, 'period', '30d');
  console.log('\n✏️ Modified URL (30d period):');
  console.log(`   ${modifiedURL}`);

  // Remove fragment parameter
  const cleanedURL = URLFragmentUtils.removeFragmentParam(modifiedURL, 'filter');
  console.log('\n🧹 Cleaned URL (filter removed):');
  console.log(`   ${cleanedURL}`);
}

/**
 * Example 2: R2 Browser URL with Object Navigation
 */
async function r2BrowserNavigation() {
  console.log('\n🌐 R2 Browser URL Navigation');
  console.log('='.repeat(50));

  // Initialize R2 integration
  const r2 = new R2MCPIntegration();
  await r2.initialize();

  // Create R2 browser URLs for different objects
  const diagnosesURL = r2.getR2BrowserURL('diagnoses', 'mcp/diagnoses/issue-123.json');
  const auditsURL = r2.getR2BrowserURL('audits', 'mcp/audits/session-456.json');
  const metricsURL = r2.getR2BrowserURL('metrics');

  console.log('📂 R2 Browser URLs:');
  console.log(`   Diagnoses: ${diagnosesURL}`);
  console.log(`   Audits: ${auditsURL}`);
  console.log(`   Metrics: ${metricsURL}`);

  // Parse R2 browser URL
  const parsedDiagnoses = r2.parseFactoryWagerURL(diagnosesURL);
  if (parsedDiagnoses.valid) {
    console.log('\n🔍 Parsed Diagnoses URL:');
    console.log(`   Service: ${parsedDiagnoses.service}`);
    console.log(`   Fragment: ${JSON.stringify(parsedDiagnoses.fragment, null, 2)}`);
  }

  // Generate shareable URL
  const shareableURL = await r2.createShareableURL('mcp/diagnoses/issue-123.json', 3600);
  console.log('\n🔗 Shareable URL (1 hour expiry):');
  console.log(`   ${shareableURL}`);
}

/**
 * Example 3: Dashboard Navigation with State
 */
async function dashboardNavigation() {
  console.log('\n📊 Dashboard Navigation with State');
  console.log('='.repeat(50));

  // Create dashboard URLs with different states
  const overviewURL = FactoryWagerURLUtils.createDashboardURL('overview', {
    refresh: 'auto',
    interval: '30s'
  });

  const analyticsURL = FactoryWagerURLUtils.createDashboardURL('analytics', {
    tab: 'performance',
    metric: 'response-time',
    period: '24h',
    compare: 'previous'
  });

  const settingsURL = FactoryWagerURLUtils.createDashboardURL('settings', {
    section: 'security',
    tab: 'api-keys'
  });

  console.log('🎛️ Dashboard Navigation URLs:');
  console.log(`   Overview: ${overviewURL}`);
  console.log(`   Analytics: ${analyticsURL}`);
  console.log(`   Settings: ${settingsURL}`);

  // Simulate navigation state restoration
  function restoreNavigationState(url: string) {
    const parsed = URLHandler.parse(url);
    const fragment = parsed.hasFragment() ? URLFragmentUtils.parseFragment(parsed.fragment) : {};
    
    return {
      section: parsed.pathname.replace(/^\//, ''),
      state: fragment
    };
  }

  const restoredState = restoreNavigationState(analyticsURL);
  console.log('\n🔄 Restored Navigation State:');
  console.log(`   Section: ${restoredState.section}`);
  console.log(`   State: ${JSON.stringify(restoredState.state, null, 2)}`);
}

/**
 * Example 4: API URL Generation with Parameters
 */
async function apiURLGeneration() {
  console.log('\n🔌 API URL Generation with Parameters');
  console.log('='.repeat(50));

  // Generate API URLs with various parameters
  const diagnosesAPI = FactoryWagerURLUtils.createAPIURL('/diagnoses', {
    limit: '50',
    offset: '0',
    severity: 'high',
    resolved: 'false'
  });

  const metricsAPI = FactoryWagerURLUtils.createAPIURL('/metrics', {
    start: '2026-02-04T00:00:00Z',
    end: '2026-02-05T00:00:00Z',
    granularity: '1h'
  });

  const searchAPI = FactoryWagerURLUtils.createAPIURL('/search', {
    query: 'error rate',
    category: 'diagnoses',
    sort: 'timestamp',
    order: 'desc'
  });

  console.log('🔌 Generated API URLs:');
  console.log(`   Diagnoses: ${diagnosesAPI}`);
  console.log(`   Metrics: ${metricsAPI}`);
  console.log(`   Search: ${searchAPI}`);

  // Parse API URLs
  function parseAPIURL(url: string) {
    const parsed = URLHandler.parse(url);
    return {
      endpoint: parsed.pathname,
      params: Object.fromEntries(parsed.searchParams.entries())
    };
  }

  const parsedDiagnosesAPI = parseAPIURL(diagnosesAPI);
  console.log('\n🔍 Parsed Diagnoses API:');
  console.log(`   Endpoint: ${parsedDiagnosesAPI.endpoint}`);
  console.log(`   Parameters: ${JSON.stringify(parsedDiagnosesAPI.params, null, 2)}`);
}

/**
 * Example 5: URL Validation and Security
 */
async function urlValidationSecurity() {
  console.log('\n🔒 URL Validation and Security');
  console.log('='.repeat(50));

  const testURLs = [
    'https://docs.factory-wager.com/analytics#tab=overview&period=7d',
    'https://r2.factory-wager.com/diagnoses#key=test.json&view=object',
    'https://api.factory-wager.com/diagnoses?severity=high',
    'https://malicious-site.com/fake-dashboard',
    'javascript:alert("xss")',
    'not-a-url'
  ];

  console.log('🔍 URL Validation Results:');
  for (const url of testURLs) {
    try {
      const isValid = FactoryWagerURLUtils.validateFactoryWagerURL(url);
      const service = isValid ? FactoryWagerURLUtils.extractService(url) : 'invalid';
      
      console.log(`   ${url}`);
      console.log(`     Valid: ${isValid ? '✅' : '❌'}`);
      console.log(`     Service: ${service}`);
    } catch (error) {
      console.log(`   ${url}`);
      console.log(`     Valid: ❌ (Error: ${error instanceof Error ? error.message : 'Unknown'})`);
    }
    console.log('');
  }

  // Demonstrate secure URL parsing
  const userProvidedURL = 'https://docs.factory-wager.com/analytics#tab=overview&period=7d';
  
  if (FactoryWagerURLUtils.validateFactoryWagerURL(userProvidedURL)) {
    const parsed = URLHandler.parse(userProvidedURL);
    const fragment = parsed.hasFragment() ? URLFragmentUtils.parseFragment(parsed.fragment) : {};
    
    console.log('🔒 Securely parsed user URL:');
    console.log(`   Hostname: ${parsed.hostname}`);
    console.log(`   Path: ${parsed.pathname}`);
    console.log(`   Fragment: ${JSON.stringify(fragment, null, 2)}`);
  }
}

/**
 * Example 6: Complex Fragment Operations
 */
async function complexFragmentOperations() {
  console.log('\n🔧 Complex Fragment Operations');
  console.log('='.repeat(50));

  // Create a complex URL with multiple fragment parameters
  let url = 'https://docs.factory-wager.com/analytics';
  
  // Add multiple parameters
  url = URLFragmentUtils.setFragmentParam(url, 'tab', 'performance');
  url = URLFragmentUtils.setFragmentParam(url, 'metric', 'response-time');
  url = URLFragmentUtils.setFragmentParam(url, 'period', '24h');
  url = URLFragmentUtils.setFragmentParam(url, 'compare', 'previous');
  url = URLFragmentUtils.setFragmentParam(url, 'debug', 'true');

  console.log('🔧 Built complex URL:');
  console.log(`   ${url}`);

  // Parse and manipulate
  const fragment = URLHandler.getFragment(url);
  const params = URLFragmentUtils.parseFragment(fragment);

  console.log('\n🔍 Parsed parameters:');
  Object.entries(params).forEach(([key, value]) => {
    console.log(`   ${key}: ${value}`);
  });

  // Update specific parameters
  url = URLFragmentUtils.setFragmentParam(url, 'period', '7d');
  url = URLFragmentUtils.removeFragmentParam(url, 'debug');

  console.log('\n✏️ After updates:');
  console.log(`   ${url}`);

  // Check for specific parameters
  const hasCompare = URLFragmentUtils.getFragmentParam(url, 'compare') !== null;
  const hasDebug = URLFragmentUtils.getFragmentParam(url, 'debug') !== null;

  console.log('\n🔍 Parameter checks:');
  console.log(`   Has compare: ${hasCompare ? '✅' : '❌'}`);
  console.log(`   Has debug: ${hasDebug ? '✅' : '❌'}`);

  // Demonstrate fragment comparison
  const url1 = URLFragmentUtils.setFragmentParam('https://example.com', 'a', '1');
  const url2 = URLFragmentUtils.setFragmentParam('https://example.com', 'b', '2');
  const url3 = URLFragmentUtils.setFragmentParam('https://example.com#other', 'a', '1');

  console.log('\n🔍 URL comparison (ignoring fragments):');
  console.log(`   url1 vs url2: ${URLHandler.compareWithoutFragment(url1, url2) ? '✅ Same' : '❌ Different'}`);
  console.log(`   url1 vs url3: ${URLHandler.compareWithoutFragment(url1, url3) ? '✅ Same' : '❌ Different'}`);
}

/**
 * Example 7: Real-world Dashboard Integration
 */
async function realWorldDashboardIntegration() {
  console.log('\n🌍 Real-world Dashboard Integration');
  console.log('='.repeat(50));

  // Simulate dashboard initialization
  class DashboardApp {
    private currentURL: string = 'https://docs.factory-wager.com';
    private r2: R2MCPIntegration;

    constructor() {
      this.r2 = new R2MCPIntegration();
    }

    async initialize() {
      await this.r2.initialize();
      console.log('🚀 Dashboard initialized');
    }

    // Navigate to specific section with state
    navigate(section: string, state: Record<string, string> = {}) {
      this.currentURL = FactoryWagerURLUtils.createDashboardURL(section, state);
      console.log(`📍 Navigated to: ${this.currentURL}`);
      return this.currentURL;
    }

    // Get current navigation state
    getCurrentState() {
      const parsed = URLHandler.parse(this.currentURL);
      return {
        section: parsed.pathname.replace(/^\//, '') || 'overview',
        fragment: parsed.hasFragment() ? URLFragmentUtils.parseFragment(parsed.fragment) : {}
      };
    }

    // Generate shareable link for R2 object
    async shareR2Object(objectKey: string, expiresIn: number = 3600) {
      const shareableURL = await this.r2.createShareableURL(objectKey, expiresIn);
      console.log(`🔗 Shareable URL created: ${shareableURL}`);
      return shareableURL;
    }

    // Handle deep linking
    handleDeepLink(url: string) {
      if (!FactoryWagerURLUtils.validateFactoryWagerURL(url)) {
        console.log('❌ Invalid FactoryWager URL');
        return false;
      }

      const parsed = this.r2.parseFactoryWagerURL(url);
      if (!parsed.valid) {
        console.log('❌ Failed to parse URL');
        return false;
      }

      this.currentURL = url;
      console.log(`🔗 Deep link handled: ${url}`);
      console.log(`   Service: ${parsed.service}`);
      console.log(`   Fragment: ${JSON.stringify(parsed.fragment, null, 2)}`);
      
      return true;
    }
  }

  // Demonstrate dashboard usage
  const dashboard = new DashboardApp();
  await dashboard.initialize();

  // Navigate with different states
  dashboard.navigate('analytics', { tab: 'performance', period: '24h' });
  dashboard.navigate('diagnoses', { severity: 'high', resolved: 'false' });

  // Get current state
  const currentState = dashboard.getCurrentState();
  console.log('\n📍 Current state:');
  console.log(`   Section: ${currentState.section}`);
  console.log(`   Fragment: ${JSON.stringify(currentState.fragment, null, 2)}`);

  // Create shareable link
  await dashboard.shareR2Object('mcp/diagnoses/critical-issue.json', 7200);

  // Handle deep linking
  const deepLinkURL = 'https://docs.factory-wager.com/analytics#tab=errors&period=7d&filter=severity:high';
  dashboard.handleDeepLink(deepLinkURL);
}

/**
 * Main demonstration function
 */
async function main() {
  console.log('🔗 URL Fragment Usage Examples for FactoryWager R2 Integration');
  console.log('='.repeat(70));
  console.log('');

  try {
    await basicFragmentExamples();
    await r2BrowserNavigation();
    await dashboardNavigation();
    await apiURLGeneration();
    await urlValidationSecurity();
    await complexFragmentOperations();
    await realWorldDashboardIntegration();

    console.log('\n✅ All URL fragment examples completed successfully!');
    console.log('');
    console.log('📋 Key Takeaways:');
    console.log('   • Use fragments for client-side navigation state');
    console.log('   • Validate all URLs before processing');
    console.log('   • Sanitize user-provided URL fragments');
    console.log('   • Use FactoryWagerURLUtils for consistent URL generation');
    console.log('   • Leverage URLFragmentUtils for complex fragment operations');
    console.log('   • Always check URL validity before parsing fragments');

  } catch (error) {
    console.error('❌ Error in URL fragment examples:', error);
  }
}

// Run examples if this file is executed directly
if (import.meta.main) {
  main();
}

export {
  basicFragmentExamples,
  r2BrowserNavigation,
  dashboardNavigation,
  apiURLGeneration,
  urlValidationSecurity,
  complexFragmentOperations,
  realWorldDashboardIntegration
};
