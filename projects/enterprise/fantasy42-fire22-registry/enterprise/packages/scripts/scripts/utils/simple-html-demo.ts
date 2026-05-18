/**
 * Simple HTML Templates Demo
 * Domain-Driven Design Implementation
 *
 * Demonstrates Bun's HTML import functionality without server
 */

import dashboardHTML from './src/shared/templates/dashboard.html' with { type: 'text' };
import { htmlTemplateManager } from './src/shared/html-templates';
import { TimezoneUtils } from './src/shared/timezone-configuration';
import { envConfig } from './src/shared/environment-configuration';

async function demonstrateSimpleHTMLTemplates() {
  console.info('🌐 Simple HTML Templates Demo with Bun Import\n');

  // 1. Show raw HTML import
  console.info('📄 Raw HTML Import:');
  console.info(`   HTML content length: ${dashboardHTML.length} characters`);
  console.info(`   Contains DOCTYPE: ${dashboardHTML.includes('<!DOCTYPE html>')}`);
  console.info(`   Contains template variables: ${dashboardHTML.includes('{{timezone}}')}\n`);

  // 2. Show template rendering
  console.info('🎨 Template Rendering:');
  const templateData = {
    totalRevenue: '125000',
    totalCollections: '450',
    complianceRate: '98.5%',
    featureCount: '6',
    timezone: envConfig.timezone.default,
    currentTime: TimezoneUtils.createTimezoneAwareDate(envConfig.timezone.context).toLocaleString(),
    timezoneOffset: TimezoneUtils.getTimezoneInfo(envConfig.timezone.default).offset,
    lastUpdated: new Date().toLocaleString(),
    refreshInterval: '30000',
  };

  const renderedHTML = htmlTemplateManager.renderTemplate('dashboard', templateData);
  console.info(`   ✅ Template rendered successfully (${renderedHTML.length} characters)`);
  console.info(`   ✅ Variables replaced: ${renderedHTML.includes('America/Chicago')}`);
  console.info(`   ✅ Timezone info included: ${renderedHTML.includes('Current Time')}\n`);

  // 3. Show template features
  console.info('🔧 Template Features Demonstrated:');
  console.info(`   • Bun HTML import with type: "text"`);
  console.info(`   • Template variable replacement ({{variable}})`);
  console.info(`   • CSS styling and responsive design`);
  console.info(`   • JavaScript integration for auto-refresh`);
  console.info(`   • Domain-specific data rendering`);
  console.info(`   • Timezone-aware content generation\n`);

  // 4. Show available templates
  console.info('📋 Available Domain Templates:');
  const templates = htmlTemplateManager.getAllTemplateNames();
  templates.forEach((template, index) => {
    const icons = ['📊', '📈', '💳', '📋'];
    console.info(`   ${icons[index] || '📄'} ${template}`);
  });
  console.info('');

  console.info('🎉 Simple HTML Templates Demo Complete!');
  console.info('Key Benefits:');
  console.info('  • Hot reload support during development');
  console.info('  • Type-safe HTML imports');
  console.info('  • Template-based content generation');
  console.info('  • Domain-driven template organization');
  console.info('  • Integration with timezone and environment systems');
}

if (import.meta.main) {
  demonstrateSimpleHTMLTemplates().catch(console.error);
}
