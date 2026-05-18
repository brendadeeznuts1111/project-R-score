/**
 * HTML Templates Demo
 * Domain-Driven Design Implementation
 *
 * Demonstrates Bun's HTML import functionality with domain-specific templates
 */

import {
  htmlTemplateManager,
  htmlReportGenerator,
  htmlExportService,
} from './src/shared/html-templates';
import { TimezoneUtils } from './src/shared/timezone-configuration';
import { envConfig } from './src/shared/environment-configuration';

async function demonstrateHTMLTemplates() {
  console.info('🌐 HTML Templates Demo with Bun Import\n');

  // 1. Show available templates
  console.info('📋 Available Templates:');
  const templates = htmlTemplateManager.getAllTemplateNames();
  templates.forEach(template => {
    console.info(`   • ${template}`);
  });
  console.info('');

  // 2. Demonstrate template rendering
  console.info('🎨 Template Rendering:');

  // Dashboard template
  const dashboardData = {
    totalRevenue: '125000',
    totalCollections: '450',
    complianceRate: '98.5%',
    featureCount: '6',
    timezone: envConfig.timezone.default,
    currentTime: TimezoneUtils.createTimezoneAwareDate(envConfig.timezone.context).toLocaleString(),
    timezoneOffset: TimezoneUtils.getTimezoneInfo(envConfig.timezone.default).offset,
    lastUpdated: new Date().toLocaleString(),
    refreshInterval: '30000',
    collections: {
      transactions: [
        {
          id: 'TXN-001',
          customerId: 'CUST-123',
          amount: 500,
          currency: 'USD',
          status: 'completed',
          timestamp: new Date().toISOString(),
        },
        {
          id: 'TXN-002',
          customerId: 'CUST-456',
          amount: 250,
          currency: 'USD',
          status: 'pending',
          timestamp: new Date().toISOString(),
        },
      ],
    },
  };

  console.info('   📊 Rendering dashboard template...');
  const dashboardHTML = htmlTemplateManager.renderTemplate('dashboard', dashboardData);
  console.info(`   ✅ Dashboard HTML generated (${dashboardHTML.length} characters)\n`);

  // Financial report template
  const reportData = {
    periodStart: 'January 1, 2024',
    periodEnd: 'January 31, 2024',
    generatedAt: new Date().toISOString(),
    totalRevenue: '125000',
    totalCollections: '450',
    netProfit: '98000',
    complianceRate: '98.5%',
  };

  console.info('   📈 Rendering financial report template...');
  const reportHTML = htmlTemplateManager.renderTemplate('financial-report', reportData);
  console.info(`   ✅ Financial report HTML generated (${reportHTML.length} characters)\n`);

  // 3. Demonstrate HTML export functionality
  console.info('💾 HTML Export Functionality:');

  // Export dashboard to file
  const dashboardPath = await htmlExportService.exportDashboard(
    dashboardData,
    './demo-dashboard.html'
  );
  console.info(`   📄 Dashboard exported to: ${dashboardPath}`);

  // Export financial report
  const reportPath = await htmlExportService.exportFinancialReport(
    reportData,
    './demo-financial-report.html'
  );
  console.info(`   📄 Financial report exported to: ${reportPath}`);

  // Export collections summary
  const collectionsData = {
    transactions: [
      {
        id: 'TXN-001',
        customerId: 'CUST-123',
        amount: 500,
        currency: 'USD',
        status: 'completed',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'TXN-002',
        customerId: 'CUST-456',
        amount: 250,
        currency: 'USD',
        status: 'pending',
        timestamp: new Date().toISOString(),
      },
      {
        id: 'TXN-003',
        customerId: 'CUST-789',
        amount: 1000,
        currency: 'USD',
        status: 'failed',
        timestamp: new Date().toISOString(),
      },
    ],
    summary: {
      totalAmount: 1750,
      successfulCount: 1,
      failedCount: 1,
      pendingCount: 1,
    },
  };

  const collectionsPath = await htmlExportService.exportCollectionsSummary(
    collectionsData,
    './demo-collections.html'
  );
  console.info(`   📄 Collections summary exported to: ${collectionsPath}\n`);

  // 4. Demonstrate HTTP server with HTML templates
  console.info('🌐 HTTP Server with HTML Templates:');
  console.info('   🚀 Starting demo server on http://localhost:3001');
  console.info('   📊 Dashboard: http://localhost:3001/dashboard');
  console.info('   📈 Report: http://localhost:3001/report');
  console.info('   💳 Collections: http://localhost:3001/collections');
  console.info('   (Press Ctrl+C to stop)\n');

  // Start HTTP server
  Bun.serve({
    port: 3001,
    async fetch(req) {
      const url = new URL(req.url);

      switch (url.pathname) {
        case '/':
          return new Response(dashboardHTML, {
            headers: { 'Content-Type': 'text/html' },
          });

        case '/dashboard':
          return new Response(dashboardHTML, {
            headers: { 'Content-Type': 'text/html' },
          });

        case '/report':
          return new Response(reportHTML, {
            headers: { 'Content-Type': 'text/html' },
          });

        case '/collections':
          const collectionsHTML = htmlTemplateManager.renderTemplate('collections-summary', {
            ...collectionsData,
            generatedAt: new Date().toISOString(),
          });
          return new Response(collectionsHTML, {
            headers: { 'Content-Type': 'text/html' },
          });

        case '/api/templates':
          return Response.json({
            templates: htmlTemplateManager.getAllTemplateNames(),
            timezone: envConfig.timezone.default,
            features: Object.keys(envConfig.featureFlags).filter(
              key => envConfig.featureFlags[key]
            ),
          });

        default:
          return new Response('Not Found', { status: 404 });
      }
    },
  });

  // Keep the server running for demo
  console.info('🎉 HTML Templates Demo Complete!');
  console.info("Bun's HTML import feature allows you to:");
  console.info('  • Import HTML files as strings with type: "text"');
  console.info('  • Use templates for dynamic content generation');
  console.info('  • Export HTML reports for regulatory compliance');
  console.info('  • Serve HTML content via HTTP servers');
  console.info('  • Hot reload templates during development');
}

if (import.meta.main) {
  demonstrateHTMLTemplates().catch(console.error);
}
