#!/usr/bin/env bun

/**
 * Debug Agent View Tab Issues
 * Check if the tab is working and initializing properly
 */

async function debugAgentView() {
  console.log('🔍 Debugging Agent View Tab Issues');
  console.log('!==!==!==!==!==!====');

  const BASE_URL = 'http://localhost:3000';

  // 1. Check if dashboard loads
  console.log('\n1. Testing Dashboard Load');
  console.log('-------------------------');
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

      console.log('Dashboard Elements Check:');
      Object.entries(checks).forEach(([key, passed]) => {
        console.log(`  ${passed ? '✅' : '❌'} ${key}`);
      });

      const allPassed = Object.values(checks).every(Boolean);
      console.log(`\nOverall: ${allPassed ? '✅ All elements present' : '❌ Missing elements'}`);
    } else {
      console.log(`❌ Dashboard failed to load: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ Error loading dashboard: ${error.message}`);
  }

  // 2. Check API endpoint
  console.log('\n2. Testing API Endpoint');
  console.log('----------------------');
  try {
    const response = await fetch(`${BASE_URL}/api/fantasy402/agent-dashboard`);
    if (response.ok) {
      const data = await response.json();
      if (data.success) {
        console.log('✅ API working');
        console.log(`   Agent: ${data.data.agentProfile?.customerID}`);
        console.log(
          `   Weekly P&L: $${data.data.financialPerformance?.currentWeek?.profit?.toLocaleString()}`
        );
        console.log(`   Players: ${data.data.financialPerformance?.currentWeek?.activePlayers}`);
        console.log(`   Token Status: ${data.data.operationalStatus?.tokenStatus}`);
      } else {
        console.log(`❌ API returned error: ${data.error}`);
      }
    } else {
      console.log(`❌ API failed: ${response.status}`);
    }
  } catch (error) {
    console.log(`❌ API error: ${error.message}`);
  }

  // 3. Check for JavaScript syntax issues
  console.log('\n3. JavaScript Syntax Check');
  console.log('--------------------------');
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

      console.log('JavaScript Analysis:');
      Object.entries(issues).forEach(([key, hasIssue]) => {
        const status =
          key === 'Template Literals' || key === 'Unescaped Quotes' || key === 'Missing Semicolons'
            ? hasIssue
              ? '⚠️'
              : '✅'
            : hasIssue
              ? '✅'
              : '❌';
        console.log(`  ${status} ${key}`);
      });
    }
  } catch (error) {
    console.log(`❌ JS analysis error: ${error.message}`);
  }

  // 4. Recommend fixes
  console.log('\n4. Troubleshooting Steps');
  console.log('-----------------------');
  console.log('Try these steps in the browser:');
  console.log('1. Open Developer Tools (F12)');
  console.log('2. Go to Console tab');
  console.log('3. Click "🎯 Agent View" tab');
  console.log('4. Look for JavaScript errors');
  console.log('5. Check Network tab for failed API calls');
  console.log('');
  console.log('Common Issues:');
  console.log('• AlpineJS not loaded properly');
  console.log('• JavaScript syntax errors');
  console.log('• agentViewData() not initializing');
  console.log('• API endpoint not accessible');
  console.log('• Browser cache showing old version');
  console.log('');
  console.log('Quick Fixes:');
  console.log('• Hard refresh (Ctrl+Shift+R)');
  console.log('• Clear browser cache');
  console.log('• Check browser console for errors');
  console.log('• Verify AlpineJS is loaded');
}

debugAgentView().catch(console.error);
