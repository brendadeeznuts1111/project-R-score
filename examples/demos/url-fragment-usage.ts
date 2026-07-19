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
} from '../../lib/core/url-handler.ts';
import { R2MCPIntegration } from '../../lib/mcp/r2-integration-fixed.ts';

/**
 * Example 1: Basic URL Fragment Operations
 */
async function basicFragmentExamples() {
  console.info('🔗 Basic URL Fragment Examples');
  console.info('='.repeat(50));

  // Create URLs with fragments
  const dashboardURL = FactoryWagerURLUtils.createDashboardURL('analytics', {
    tab: 'overview',
    period: '7d',
    filter: 'errors'
  });

  console.info('📊 Dashboard URL with fragment:');
  console.info(`   ${dashboardURL}`);

  // Parse the fragment
  const fragment = URLHandler.getFragment(dashboardURL);
  const parsedFragment = URLFragmentUtils.parseFragment(fragment);
  
  console.info('\n🔍 Parsed fragment:');
  console.info(`   Tab: ${parsedFragment.tab}`);
  console.info(`   Period: ${parsedFragment.period}`);
  console.info(`   Filter: ${parsedFragment.filter}`);

  // Modify fragment
  const modifiedURL = URLFragmentUtils.setFragmentParam(dashboardURL, 'period', '30d');
  console.info('\n✏️ Modified URL (30d period):');
  console.info(`   ${modifiedURL}`);

  // Remove fragment parameter
  const cleanedURL = URLFragmentUtils.removeFragmentParam(modifiedURL, 'filter');
  console.info('\n🧹 Cleaned URL (filter removed):');
  console.info(`   ${cleanedURL}`);
}

/**
 * Example 2: R2 Browser URL with Object Navigation
 */
async function r2BrowserNavigation() {
  console.info('\n🌐 R2 Browser URL Navigation');
  console.info('='.repeat(50));

  // Initialize R2 integration
  const r2 = new R2MCPIntegration();
  await r2.initialize();

  // Create R2 browser URLs for different objects
  const diagnosesURL = r2.getR2BrowserURL('diagnoses', 'mcp/diagnoses/issue-123.json');
  const auditsURL = r2.getR2BrowserURL('audits', 'mcp/audits/session-456.json');
  const metricsURL = r2.getR2BrowserURL('metrics');

  console.info('📂 R2 Browser URLs:');
  console.info(`   Diagnoses: ${diagnosesURL}`);
  console.info(`   Audits: ${auditsURL}`);
  console.info(`   Metrics: ${metricsURL}`);

  // Parse R2 browser URL
  const parsedDiagnoses = r2.parseFactoryWagerURL(diagnosesURL);
  if (parsedDiagnoses.valid) {
    console.info('\n🔍 Parsed Diagnoses URL:');
    console.info(`   Service: ${parsedDiagnoses.service}`);
    console.info(`   Fragment: ${JSON.stringify(parsedDiagnoses.fragment, null, 2)}`);
  }

  // Generate shareable URL
  const shareableURL = await r2.createShareableURL('mcp/diagnoses/issue-123.json', 3600);
  console.info('\n🔗 Shareable URL (1 hour expiry):');
  console.info(`   ${shareableURL}`);
}

/**
 * Example 3: Dashboard Navigation with State
 */
async function dashboardNavigation() {
  console.info('\n📊 Dashboard Navigation with State');
  console.info('='.repeat(50));

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

  console.info('🎛️ Dashboard Navigation URLs:');
  console.info(`   Overview: ${overviewURL}`);
  console.info(`   Analytics: ${analyticsURL}`);
  console.info(`   Settings: ${settingsURL}`);

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
  console.info('\n🔄 Restored Navigation State:');
  console.info(`   Section: ${restoredState.section}`);
  console.info(`   State: ${JSON.stringify(restoredState.state, null, 2)}`);
}

/**
 * Example 4: API URL Generation with Parameters
 */
async function apiURLGeneration() {
  console.info('\n🔌 API URL Generation with Parameters');
  console.info('='.repeat(50));

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

  console.info('🔌 Generated API URLs:');
  console.info(`   Diagnoses: ${diagnosesAPI}`);
  console.info(`   Metrics: ${metricsAPI}`);
  console.info(`   Search: ${searchAPI}`);

  // Parse API URLs
  function parseAPIURL(url: string) {
    const parsed = URLHandler.parse(url);
    return {
      endpoint: parsed.pathname,
      params: Object.fromEntries(parsed.searchParams.entries())
    };
  }

  const parsedDiagnosesAPI = parseAPIURL(diagnosesAPI);
  console.info('\n🔍 Parsed Diagnoses API:');
  console.info(`   Endpoint: ${parsedDiagnosesAPI.endpoint}`);
  console.info(`   Parameters: ${JSON.stringify(parsedDiagnosesAPI.params, null, 2)}`);
}

/**
 * Example 5: URL Validation and Security
 */
async function urlValidationSecurity() {
  console.info('\n🔒 URL Validation and Security');
  console.info('='.repeat(50));

  const testURLs = [
    'https://docs.factory-wager.com/analytics#tab=overview&period=7d',
    'https://r2.factory-wager.com/diagnoses#key=test.json&view=object',
    'https://api.factory-wager.com/diagnoses?severity=high',
    'https://malicious-site.com/fake-dashboard',
    'javascript:alert("xss")',
    'not-a-url'
  ];

  console.info('🔍 URL Validation Results:');
  for (const url of testURLs) {
    try {
      const isValid = FactoryWagerURLUtils.validateFactoryWagerURL(url);
      const service = isValid ? FactoryWagerURLUtils.extractService(url) : 'invalid';
      
      console.info(`   ${url}`);
      console.info(`     Valid: ${isValid ? '✅' : '❌'}`);
      console.info(`     Service: ${service}`);
    } catch (error) {
      console.info(`   ${url}`);
      console.info(`     Valid: ❌ (Error: ${error instanceof Error ? error.message : 'Unknown'})`);
    }
    console.info('');
  }

  // Demonstrate secure URL parsing
  const userProvidedURL = 'https://docs.factory-wager.com/analytics#tab=overview&period=7d';
  
  if (FactoryWagerURLUtils.validateFactoryWagerURL(userProvidedURL)) {
    const parsed = URLHandler.parse(userProvidedURL);
    const fragment = parsed.hasFragment() ? URLFragmentUtils.parseFragment(parsed.fragment) : {};
    
    console.info('🔒 Securely parsed user URL:');
    console.info(`   Hostname: ${parsed.hostname}`);
    console.info(`   Path: ${parsed.pathname}`);
    console.info(`   Fragment: ${JSON.stringify(fragment, null, 2)}`);
  }
}

/**
 * Example 6: Complex Fragment Operations
 */
async function complexFragmentOperations() {
  console.info('\n🔧 Complex Fragment Operations');
  console.info('='.repeat(50));

  // Create a complex URL with multiple fragment parameters
  let url = 'https://docs.factory-wager.com/analytics';
  
  // Add multiple parameters
  url = URLFragmentUtils.setFragmentParam(url, 'tab', 'performance');
  url = URLFragmentUtils.setFragmentParam(url, 'metric', 'response-time');
  url = URLFragmentUtils.setFragmentParam(url, 'period', '24h');
  url = URLFragmentUtils.setFragmentParam(url, 'compare', 'previous');
  url = URLFragmentUtils.setFragmentParam(url, 'debug', 'true');

  console.info('🔧 Built complex URL:');
  console.info(`   ${url}`);

  // Parse and manipulate
  const fragment = URLHandler.getFragment(url);
  const params = URLFragmentUtils.parseFragment(fragment);

  console.info('\n🔍 Parsed parameters:');
  Object.entries(params).forEach(([key, value]) => {
    console.info(`   ${key}: ${value}`);
  });

  // Update specific parameters
  url = URLFragmentUtils.setFragmentParam(url, 'period', '7d');
  url = URLFragmentUtils.removeFragmentParam(url, 'debug');

  console.info('\n✏️ After updates:');
  console.info(`   ${url}`);

  // Check for specific parameters
  const hasCompare = URLFragmentUtils.getFragmentParam(url, 'compare') !== null;
  const hasDebug = URLFragmentUtils.getFragmentParam(url, 'debug') !== null;

  console.info('\n🔍 Parameter checks:');
  console.info(`   Has compare: ${hasCompare ? '✅' : '❌'}`);
  console.info(`   Has debug: ${hasDebug ? '✅' : '❌'}`);

  // Demonstrate fragment comparison
  const url1 = URLFragmentUtils.setFragmentParam('https://example.com', 'a', '1');
  const url2 = URLFragmentUtils.setFragmentParam('https://example.com', 'b', '2');
  const url3 = URLFragmentUtils.setFragmentParam('https://example.com#other', 'a', '1');

  console.info('\n🔍 URL comparison (ignoring fragments):');
  console.info(`   url1 vs url2: ${URLHandler.compareWithoutFragment(url1, url2) ? '✅ Same' : '❌ Different'}`);
  console.info(`   url1 vs url3: ${URLHandler.compareWithoutFragment(url1, url3) ? '✅ Same' : '❌ Different'}`);
}

/**
 * Example 7: Real-world Dashboard Integration
 */
async function realWorldDashboardIntegration() {
  console.info('\n🌍 Real-world Dashboard Integration');
  console.info('='.repeat(50));

  // Simulate dashboard initialization
  class DashboardApp {
    private currentURL: string = 'https://docs.factory-wager.com';
    private r2: R2MCPIntegration;

    constructor() {
      this.r2 = new R2MCPIntegration();
    }

    async initialize() {
      await this.r2.initialize();
      console.info('🚀 Dashboard initialized');
    }

    // Navigate to specific section with state
    navigate(section: string, state: Record<string, string> = {}) {
      this.currentURL = FactoryWagerURLUtils.createDashboardURL(section, state);
      console.info(`📍 Navigated to: ${this.currentURL}`);
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
      console.info(`🔗 Shareable URL created: ${shareableURL}`);
      return shareableURL;
    }

    // Handle deep linking
    handleDeepLink(url: string) {
      if (!FactoryWagerURLUtils.validateFactoryWagerURL(url)) {
        console.info('❌ Invalid FactoryWager URL');
        return false;
      }

      const parsed = this.r2.parseFactoryWagerURL(url);
      if (!parsed.valid) {
        console.info('❌ Failed to parse URL');
        return false;
      }

      this.currentURL = url;
      console.info(`🔗 Deep link handled: ${url}`);
      console.info(`   Service: ${parsed.service}`);
      console.info(`   Fragment: ${JSON.stringify(parsed.fragment, null, 2)}`);
      
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
  console.info('\n📍 Current state:');
  console.info(`   Section: ${currentState.section}`);
  console.info(`   Fragment: ${JSON.stringify(currentState.fragment, null, 2)}`);

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
  console.info('🔗 URL Fragment Usage Examples for FactoryWager R2 Integration');
  console.info('='.repeat(70));
  console.info('');

  try {
    await basicFragmentExamples();
    await r2BrowserNavigation();
    await dashboardNavigation();
    await apiURLGeneration();
    await urlValidationSecurity();
    await complexFragmentOperations();
    await realWorldDashboardIntegration();

    console.info('\n✅ All URL fragment examples completed successfully!');
    console.info('');
    console.info('📋 Key Takeaways:');
    console.info('   • Use fragments for client-side navigation state');
    console.info('   • Validate all URLs before processing');
    console.info('   • Sanitize user-provided URL fragments');
    console.info('   • Use FactoryWagerURLUtils for consistent URL generation');
    console.info('   • Leverage URLFragmentUtils for complex fragment operations');
    console.info('   • Always check URL validity before parsing fragments');

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
