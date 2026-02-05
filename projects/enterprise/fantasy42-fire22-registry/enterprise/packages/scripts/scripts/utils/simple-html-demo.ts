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
  console.log('🌐 Simple HTML Templates Demo with Bun Import\n');

  // 1. Show raw HTML import
  console.log('📄 Raw HTML Import:');
  console.log(`   HTML content length: ${dashboardHTML.length} characters`);
  console.log(`   Contains DOCTYPE: ${dashboardHTML.includes('<!DOCTYPE html>')}`);
  console.log(`   Contains template variables: ${dashboardHTML.includes('{{timezone}}')}\n`);

  // 2. Show template rendering
  console.log('🎨 Template Rendering:');
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
  console.log(`   ✅ Template rendered successfully (${renderedHTML.length} characters)`);
  console.log(`   ✅ Variables replaced: ${renderedHTML.includes('America/Chicago')}`);
  console.log(`   ✅ Timezone info included: ${renderedHTML.includes('Current Time')}\n`);

  // 3. Show template features
  console.log('🔧 Template Features Demonstrated:');
  console.log(`   • Bun HTML import with type: "text"`);
  console.log(`   • Template variable replacement ({{variable}})`);
  console.log(`   • CSS styling and responsive design`);
  console.log(`   • JavaScript integration for auto-refresh`);
  console.log(`   • Domain-specific data rendering`);
  console.log(`   • Timezone-aware content generation\n`);

  // 4. Show available templates
  console.log('📋 Available Domain Templates:');
  const templates = htmlTemplateManager.getAllTemplateNames();
  templates.forEach((template, index) => {
    const icons = ['📊', '📈', '💳', '📋'];
    console.log(`   ${icons[index] || '📄'} ${template}`);
  });
  console.log('');

  console.log('🎉 Simple HTML Templates Demo Complete!');
  console.log('Key Benefits:');
  console.log('  • Hot reload support during development');
  console.log('  • Type-safe HTML imports');
  console.log('  • Template-based content generation');
  console.log('  • Domain-driven template organization');
  console.log('  • Integration with timezone and environment systems');
}

if (import.meta.main) {
  demonstrateSimpleHTMLTemplates().catch(console.error);
}
