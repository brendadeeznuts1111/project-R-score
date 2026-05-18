#!/usr/bin/env bun
// scripts/demo-timezone-dashboard.ts
// Demo script to showcase the production-grade timezone dashboard integration

import { validateAndSetTimezone, initializeScopeTimezone } from '../bootstrap-timezone';
import { injectDashboardConfig, getDashboardConfig } from '../server/dashboard-config-injection';

console.info('🎯 DuoPlus v3.7 Timezone Dashboard Demo\n');

// Demo 1: Enterprise scope initialization
console.info('📊 Demo 1: Enterprise Scope');
console.info('-'.repeat(40));

const enterpriseConfig = initializeScopeTimezone('ENTERPRISE');
console.info(`Scope: ${enterpriseConfig.scopeTimezone}`);
console.info(`Display: ${enterpriseConfig.displayName}`);
console.info(`Offset: ${enterpriseConfig.standardOffset}`);
console.info(`DST: ${enterpriseConfig.observesDst ? 'Yes' : 'No'}`);
console.info(`UTC: ${enterpriseConfig.isUtc ? 'Yes' : 'No'}`);

console.info('\n📱 Dashboard Configuration:');
const dashboardConfig = getDashboardConfig();
console.info(`DASHBOARD_SCOPE: ${dashboardConfig.DASHBOARD_SCOPE}`);
console.info(`TIMEZONE: ${dashboardConfig.TIMEZONE}`);
console.info(`TIMEZONE_DISPLAY: ${dashboardConfig.TIMEZONE_DISPLAY}`);
console.info(`PLATFORM: ${dashboardConfig.PLATFORM}`);

console.info('\n' + '='.repeat(50));

// Demo 2: Development scope
console.info('\n📊 Demo 2: Development Scope');
console.info('-'.repeat(40));

const devConfig = initializeScopeTimezone('DEVELOPMENT');
console.info(`Scope: ${devConfig.scopeTimezone}`);
console.info(`Display: ${devConfig.displayName}`);
console.info(`Offset: ${devConfig.standardOffset}`);
console.info(`DST: ${devConfig.observesDst ? 'Yes' : 'No'}`);

console.info('\n' + '='.repeat(50));

// Demo 3: Local sandbox scope
console.info('\n📊 Demo 3: Local Sandbox Scope');
console.info('-'.repeat(40));

const localConfig = initializeScopeTimezone('LOCAL-SANDBOX');
console.info(`Scope: ${localConfig.scopeTimezone}`);
console.info(`Display: ${localConfig.displayName}`);
console.info(`Offset: ${localConfig.standardOffset}`);
console.info(`DST: ${localConfig.observesDst ? 'Yes' : 'No'}`);
console.info(`UTC: ${localConfig.isUtc ? 'Yes' : 'No'}`);

console.info('\n' + '='.repeat(50));

// Demo 4: HTML injection example
console.info('\n🌐 Demo 4: HTML Configuration Injection');
console.info('-'.repeat(40));

const sampleHtml = `
<!DOCTYPE html>
<html>
<head>
    <title>DuoPlus Dashboard</title>
</head>
<body>
    <header class="dashboard-header">
        <span id="timezone-display">Loading...</span>
    </header>
    <footer class="dashboard-footer">
        <span id="footer-timezone">Loading...</span>
        <span id="footer-current-time">Loading...</span>
    </footer>
</body>
</html>`;

const injectedHtml = injectDashboardConfig(sampleHtml);
console.info('✅ Configuration injected into HTML template');
console.info('📋 Client-side JavaScript will display:');
console.info(`   Header: ${dashboardConfig.TIMEZONE_DISPLAY}`);
console.info(`   Footer: ${dashboardConfig.TIMEZONE_DISPLAY}`);

console.info('\n🎉 Demo completed successfully!');
console.info('🚀 Production-grade timezone system ready for deployment.');
