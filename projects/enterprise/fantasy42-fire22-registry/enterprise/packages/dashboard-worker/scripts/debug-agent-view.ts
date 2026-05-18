#!/usr/bin/env bun

/**
 * Debug Agent View Tab Issues
 * Check if the tab is working and initializing properly
 */

async function debugAgentView() {
  console.info('🔍 Debugging Agent View Tab Issues');
  console.info('!==!==!==!==!==!====');

  const BASE_URL = 'http://localhost:3000';

  // 1. Check if dashboard loads
  console.info('\n1. Testing Dashboard Load');
  console.info('-------------------------');
  try {
    const response = await fetch(`${BASE_URL}/dashboard`);
    if (response.ok) {
      const html = await response.text();

      // Check key elements
      const checks = {
        'Agent View Tab Button': html.includes('🎯 Agent View'),
        'Agent View Content': html.includes('x-show="activeTab === \'agent-view\'"'),
        'agentViewData Function': html.includes('function agentViewData()'),
        'agentData Flag': html.includes('agentData: true'),
        'x-data Directive': html.includes('x-data="agentViewData()"'),
        'Auto-refresh Logic': html.includes('startAutoRefresh()'),
      };

      console.info('Dashboard Elements Check:');
      Object.entries(checks).forEach(([key, passed]) => {
        console.info(`  ${passed ? '✅' : '❌'} ${key}`);
      });

      const allPassed = Object.values(checks).every(Boolean);
      console.info(`\nOverall: ${allPassed ? '✅ All elements present' : '❌ Missing elements'}`);
    } else {
      console.info(`❌ Dashboard failed to load: ${response.status}`);
    }
  } catch (error) {
    console.info(`❌ Error loading dashboard: ${error.message}`);
  }

  // 2. Check API endpoint
  console.info('\n2. Testing API Endpoint');
  console.info('----------------------');
  try {
    const response = await fetch(`${BASE_URL}/api/fantasy402/agent-dashboard`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.info('✅ API working');
        console.info(`   Agent: ${data.data.agentProfile?.customerID}`);
        console.info(
          `   Weekly P&L: $${data.data.financialPerformance?.currentWeek?.profit?.toLocaleString()}`
        );
        console.info(`   Players: ${data.data.financialPerformance?.currentWeek?.activePlayers}`);
        console.info(`   Token Status: ${data.data.operationalStatus?.tokenStatus}`);
      } else {
        console.info(`❌ API returned error: ${data.error}`);
      }
    } else {
      console.info(`❌ API failed: ${response.status}`);
    }
  } catch (error) {
    console.info(`❌ API error: ${error.message}`);
  }

  // 3. Check for JavaScript syntax issues
  console.info('\n3. JavaScript Syntax Check');
  console.info('--------------------------');
  try {
    const response = await fetch(`${BASE_URL}/dashboard`);
    const html = await response.text();

    // Extract the JavaScript portion
    const scriptMatch = html.match(/<script>(.*?)<\/script>/s);
    if (scriptMatch) {
      const jsCode = scriptMatch[1];

      // Check for common issues
      const issues = {
        'Template Literals': /`[^`]*\$\{[^}]*\}[^`]*`/.test(jsCode),
        'Unescaped Quotes': /["'].*["'].*["']/.test(jsCode),
        'Missing Semicolons': /\n\s*[a-zA-Z].*[^;]\s*\n/.test(jsCode),
        'Function Definitions': jsCode.includes('function agentViewData()'),
        'Async Functions': jsCode.includes('async refreshData()'),
        'Event Handlers': jsCode.includes('@click="refreshData()"'),
      };

      console.info('JavaScript Analysis:');
      Object.entries(issues).forEach(([key, hasIssue]) => {
        const status =
          key === 'Template Literals' || key === 'Unescaped Quotes' || key === 'Missing Semicolons'
            ? hasIssue
              ? '⚠️'
              : '✅'
            : hasIssue
              ? '✅'
              : '❌';
        console.info(`  ${status} ${key}`);
      });
    }
  } catch (error) {
    console.info(`❌ JS analysis error: ${error.message}`);
  }

  // 4. Recommend fixes
  console.info('\n4. Troubleshooting Steps');
  console.info('-----------------------');
  console.info('Try these steps in the browser:');
  console.info('1. Open Developer Tools (F12)');
  console.info('2. Go to Console tab');
  console.info('3. Click "🎯 Agent View" tab');
  console.info('4. Look for JavaScript errors');
  console.info('5. Check Network tab for failed API calls');
  console.info('');
  console.info('Common Issues:');
  console.info('• AlpineJS not loaded properly');
  console.info('• JavaScript syntax errors');
  console.info('• agentViewData() not initializing');
  console.info('• API endpoint not accessible');
  console.info('• Browser cache showing old version');
  console.info('');
  console.info('Quick Fixes:');
  console.info('• Hard refresh (Ctrl+Shift+R)');
  console.info('• Clear browser cache');
  console.info('• Check browser console for errors');
  console.info('• Verify AlpineJS is loaded');
}

debugAgentView().catch(console.error);
