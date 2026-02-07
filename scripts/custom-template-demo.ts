#!/usr/bin/env bun

/**
 * Demonstration of Custom Wiki Template System
 * 
 * This script shows how to:
 * 1. Register custom templates programmatically
 * 2. Load templates from configuration files
 * 3. Generate wikis using custom templates
 * 4. Export template configurations
 */

import { MCPWikiGenerator, WikiTemplate } from '../lib/mcp/wiki-generator-mcp.js';

async function demonstrateCustomTemplates() {
  console.log('🎯 Custom Wiki Template System Demo');
  console.log('━'.repeat(50));

  // 1. Register a custom template programmatically
  console.log('\n📝 1. Registering custom template programmatically...');
  
  const customTemplate: WikiTemplate = {
    name: 'Internal CRM Wiki',
    description: 'JSON format for internal CRM documentation',
    baseUrl: 'https://crm.company.com/wiki',
    workspace: 'engineering/api-integrations/bun-utilities',
    format: 'json',
    includeExamples: true,
    customSections: [
      '## Integration Steps',
      '## Data Mapping',
      '## Error Handling',
      '## Support Contacts'
    ]
  };

  MCPWikiGenerator.registerCustomTemplate(customTemplate);

  // 2. Load templates from configuration file
  console.log('\n📁 2. Loading templates from configuration file...');
  await MCPWikiGenerator.loadTemplatesFromFile('./wiki-templates.json');

  // 3. List all available templates
  console.log('\n📋 3. Available Templates:');
  console.log('━'.repeat(80));
  
  const allTemplates = MCPWikiGenerator.getWikiTemplates();
  allTemplates.forEach((template, index) => {
    console.log(`${(index + 1).toString().padStart(2)}. ${template.name}`);
    console.log(`   Description: ${template.description}`);
    console.log(`   Format: ${template.format} | Workspace: ${template.workspace}`);
    console.log(`   Base URL: ${template.baseUrl}`);
    if (template.customSections && template.customSections.length > 0) {
      console.log(`   Custom Sections: ${template.customSections.join(', ')}`);
    }
    console.log('');
  });

  // 4. Generate wiki using a custom template
  console.log('🚀 4. Generating wiki using custom template...');
  
  const result = await MCPWikiGenerator.generateFromTemplate('Internal CRM Wiki', {
    includeValidation: true,
    context: 'crm-integration-demo'
  });

  if (result.success) {
    console.log('✅ Wiki generated successfully!');
    console.log(`   Files generated: ${Object.keys(result.files).length}`);
    console.log(`   Total utilities: ${result.metadata.total}`);
    console.log(`   Output format: ${result.metadata.generated}`);
    
    // Show generated files
    Object.entries(result.files).forEach(([filename, content]) => {
      console.log(`   📄 ${filename} (${content.length} characters)`);
    });
  } else {
    console.error(`❌ Generation failed: ${result.error}`);
  }

  // 5. Generate wiki using loaded template
  console.log('\n🚀 5. Generating wiki using loaded template...');
  
  const slackResult = await MCPWikiGenerator.generateFromTemplate('Slack Knowledge Base', {
    includeValidation: true,
    context: 'slack-knowledge-demo'
  });

  if (slackResult.success) {
    console.log('✅ Slack wiki generated successfully!');
    console.log(`   Files: ${Object.keys(slackResult.files).length} | Utilities: ${slackResult.metadata.total}`);
  }

  // 6. Export all templates to a new configuration file
  console.log('\n💾 6. Exporting all templates to configuration file...');
  await MCPWikiGenerator.exportTemplatesToFile('./wiki-templates-complete.json');

  console.log('\n🎉 Custom template system demonstration complete!');
  console.log('━'.repeat(50));
}

// CLI interface
if (import.meta.main) {
  demonstrateCustomTemplates().catch(console.error);
}

export { demonstrateCustomTemplates };
