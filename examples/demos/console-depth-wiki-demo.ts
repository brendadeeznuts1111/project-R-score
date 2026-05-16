#!/usr/bin/env bun

/**
 * 🎯 Wiki Matrix Console Depth Demo
 * 
 * Demonstrates --console-depth with wiki template data
 */

import { MCPWikiGenerator } from '../lib/mcp/wiki-generator-mcp.ts';

const templates = MCPWikiGenerator.getWikiTemplates();

console.log('🎯 Wiki Templates with Console Depth Control');
console.log('==========================================');
console.log('');

console.log('📊 All Templates (current console depth):');
console.log(templates);
console.log('');

console.log('💡 Try different depths:');
console.log('   bun --console-depth 1 examples/console-depth-wiki-demo.ts');
console.log('   bun --console-depth 3 examples/console-depth-wiki-demo.ts');
console.log('   bun --console-depth 5 examples/console-depth-wiki-demo.ts');
console.log('');

// Show a deeply nested object
const nestedExample = {
  wikiSystem: {
    templates: templates.map(t => ({
      name: t.name,
      metadata: {
        config: {
          baseUrl: t.baseUrl,
          workspace: t.workspace,
          format: t.format,
          options: {
            includeExamples: t.includeExamples,
            includeValidation: true,
            customSections: t.customSections || []
          }
        },
        features: {
          security: {
            encryption: true,
            authentication: {
              type: 'OAuth2',
              tokens: ['read', 'write', 'admin']
            }
          },
          performance: {
            caching: true,
            optimization: {
              minification: true,
              compression: true
            },
            metrics: {
              responseTime: 150,
              throughput: 1000,
              details: {
                average: 145,
                median: 140,
                p95: 180
              }
            }
          }
        }
      }
    })),
    statistics: {
      total: templates.length,
      formats: {
        markdown: templates.filter(t => t.format === 'markdown').length,
        html: templates.filter(t => t.format === 'html').length,
        json: templates.filter(t => t.format === 'json').length
      }
    }
  }
};

console.log('🔍 Deep Nested Wiki System Structure:');
console.log(nestedExample);
