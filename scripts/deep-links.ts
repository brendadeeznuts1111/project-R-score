#!/usr/bin/env bun

/**
 * 🔗 Generate Deep Links
 * 
 * Advanced deep link generation for API documentation with
 * AI-powered context awareness and intelligent routing.
 */

import { aiOperations } from '../lib/ai/ai-operations-manager.ts';
import { nanoseconds, color } from 'bun';
import { globalCaches } from '../lib/performance/cache-manager.ts';

interface DeepLinkConfig {
  apiName: string;
  baseUrl: string;
  version: string;
  includeExamples: boolean;
  securityLevel: 'public' | 'internal' | 'restricted';
}

interface DeepLink {
  url: string;
  title: string;
  description: string;
  method: string;
  category: string;
  examples?: string[];
  security?: string[];
}

interface APIEndpoint {
  path: string;
  method: string;
  title: string;
  description: string;
  parameters: any[];
  responses: any[];
  examples?: any[];
}

const API_REGISTRY: Record<string, APIEndpoint[]> = {
  'ai-operations': [
    {
      path: '/api/ai/commands',
      method: 'POST',
      title: 'Submit AI Command',
      description: 'Submit a command to the AI operations manager',
      parameters: [
        { name: 'type', type: 'string', required: true },
        { name: 'input', type: 'string', required: true },
        { name: 'priority', type: 'string', required: false }
      ],
      responses: [
        { code: 200, description: 'Command submitted successfully' },
        { code: 400, description: 'Invalid command parameters' }
      ],
      examples: [
        { type: 'optimize', input: 'Optimize cache performance', priority: 'high' }
      ]
    },
    {
      path: '/api/ai/insights',
      method: 'GET',
      title: 'Get AI Insights',
      description: 'Retrieve current insights and recommendations',
      parameters: [
        { name: 'type', type: 'string', required: false },
        { name: 'impact', type: 'string', required: false },
        { name: 'minConfidence', type: 'number', required: false }
      ],
      responses: [
        { code: 200, description: 'Insights retrieved successfully' }
      ]
    },
    {
      path: '/api/ai/predict',
      method: 'POST',
      title: 'Predict System Behavior',
      description: 'Get AI-powered predictions for system behavior',
      parameters: [
        { name: 'timeframe', type: 'string', required: true }
      ],
      responses: [
        { code: 200, description: 'Prediction generated successfully' }
      ]
    }
  ],
  'security': [
    {
      path: '/api/security/authenticate',
      method: 'POST',
      title: 'Authenticate Identity',
      description: 'Authenticate using zero-trust security principles',
      parameters: [
        { name: 'identityId', type: 'string', required: true },
        { name: 'credentials', type: 'object', required: true },
        { name: 'context', type: 'object', required: true }
      ],
      responses: [
        { code: 200, description: 'Authentication successful' },
        { code: 401, description: 'Authentication failed' }
      ]
    },
    {
      path: '/api/security/authorize',
      method: 'POST',
      title: 'Authorize Access',
      description: 'Authorize access based on policies and context',
      parameters: [
        { name: 'identityId', type: 'string', required: true },
        { name: 'resource', type: 'string', required: true },
        { name: 'action', type: 'string', required: true }
      ],
      responses: [
        { code: 200, description: 'Access granted' },
        { code: 403, description: 'Access denied' }
      ]
    }
  ],
  'cache': [
    {
      path: '/api/cache/get',
      method: 'GET',
      title: 'Get Cached Value',
      description: 'Retrieve value from intelligent cache',
      parameters: [
        { name: 'key', type: 'string', required: true },
        { name: 'namespace', type: 'string', required: false }
      ],
      responses: [
        { code: 200, description: 'Value retrieved successfully' },
        { code: 404, description: 'Key not found' }
      ]
    },
    {
      path: '/api/cache/set',
      method: 'POST',
      title: 'Set Cached Value',
      description: 'Store value in intelligent cache with AI optimization',
      parameters: [
        { name: 'key', type: 'string', required: true },
        { name: 'value', type: 'any', required: true },
        { name: 'ttl', type: 'number', required: false }
      ],
      responses: [
        { code: 200, description: 'Value stored successfully' }
      ]
    }
  ],
  'monitoring': [
    {
      path: '/api/monitoring/metrics',
      method: 'GET',
      title: 'Get System Metrics',
      description: 'Retrieve comprehensive system metrics and health',
      parameters: [
        { name: 'category', type: 'string', required: false },
        { name: 'timeframe', type: 'string', required: false }
      ],
      responses: [
        { code: 200, description: 'Metrics retrieved successfully' }
      ]
    },
    {
      path: '/api/monitoring/anomalies',
      method: 'GET',
      title: 'Get Anomalies',
      description: 'Retrieve detected anomalies and security events',
      parameters: [
        { name: 'severity', type: 'string', required: false },
        { name: 'type', type: 'string', required: false }
      ],
      responses: [
        { code: 200, description: 'Anomalies retrieved successfully' }
      ]
    }
  ]
};

async function generateDeepLinks(config: DeepLinkConfig): Promise<DeepLink[]> {
  const start = nanoseconds();
  
  // Get API endpoints for the specified API
  const endpoints = API_REGISTRY[config.apiName] || [];
  
  // Generate deep links with AI-enhanced context
  const deepLinks: DeepLink[] = [];
  
  for (const endpoint of endpoints) {
    const url = `${config.baseUrl}${config.version}${endpoint.path}`;
    
    // Generate AI-powered description enhancement
    const insight = await aiOperations.getInsights({
      type: 'performance',
      minConfidence: 0.6
    }).find(i => i.data?.endpoint === endpoint.path);
    
    const enhancedDescription = insight 
      ? `${endpoint.description} (AI Insight: ${insight.title})`
      : endpoint.description;
    
    const deepLink: DeepLink = {
      url,
      title: endpoint.title,
      description: enhancedDescription,
      method: endpoint.method,
      category: config.apiName,
      examples: config.includeExamples ? endpoint.examples?.map(ex => 
        `${config.baseUrl}${config.version}${endpoint.path} - Example: ${JSON.stringify(ex)}`
      ) : undefined,
      security: config.securityLevel !== 'public' ? [
        `Requires ${config.securityLevel} access`,
        'Zero-trust authentication required'
      ] : undefined
    };
    
    deepLinks.push(deepLink);
  }
  
  // Cache the generated links
  await globalCaches.apiResponses.set(
    `deep-links-${config.apiName}-${config.version}`,
    { links: deepLinks, generated: Date.now() },
    3600000 // 1 hour TTL
  );
  
  const elapsed = nanoseconds() - start;
  console.log(color(`Generated ${deepLinks.length} deep links in ${(elapsed / 1e6).toFixed(2)}ms`, 'gray'));
  
  return deepLinks;
}

function displayDeepLinks(links: DeepLink[], config: DeepLinkConfig) {
  console.log(color(`\n🔗 Deep Links for ${config.apiName}`, 'cyan', 'bold'));
  console.log(color('─'.repeat(80), 'gray'));
  
  console.log(color(`\n📋 API: ${color(config.apiName, 'green')} | Version: ${color(config.version, 'green')} | Security: ${color(config.securityLevel, 'yellow')}`, 'white'));
  
  if (links.length === 0) {
    console.log(color('\n❌ No endpoints found for this API', 'red'));
    return;
  }
  
  // Group by category
  const grouped = links.reduce((acc, link) => {
    if (!acc[link.category]) acc[link.category] = [];
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, DeepLink[]>);
  
  Object.entries(grouped).forEach(([category, categoryLinks]) => {
    console.log(color(`\n📂 ${category.toUpperCase()}`, 'yellow', 'bold'));
    console.log(color('─'.repeat(40), 'gray'));
    
    categoryLinks.forEach((link, index) => {
      const methodColor = link.method === 'GET' ? 'green' : link.method === 'POST' ? 'blue' : 'yellow';
      
      console.log(color(`\n${index + 1}. ${link.title}`, 'white', 'bold'));
      console.log(color(`   ${link.method}`, methodColor) + color(` ${link.url}`, 'cyan'));
      console.log(color(`   ${link.description}`, 'gray'));
      
      if (link.examples && link.examples.length > 0) {
        console.log(color('   📝 Examples:', 'yellow'));
        link.examples.forEach(example => {
          console.log(color(`     • ${example}`, 'gray'));
        });
      }
      
      if (link.security && link.security.length > 0) {
        console.log(color('   🔒 Security:', 'red'));
        link.security.forEach(sec => {
          console.log(color(`     • ${sec}`, 'gray'));
        });
      }
    });
  });
  
  // Generate summary
  console.log(color(`\n📊 Summary:`, 'yellow', 'bold'));
  console.log(`  Total Endpoints: ${color(links.length.toString(), 'cyan')}`);
  console.log(`  GET Methods: ${color(links.filter(l => l.method === 'GET').length.toString(), 'green')}`);
  console.log(`  POST Methods: ${color(links.filter(l => l.method === 'POST').length.toString(), 'blue')}`);
  console.log(`  Security Level: ${color(config.securityLevel, 'yellow')}`);
  
  // AI Enhancement Summary
  const enhancedLinks = links.filter(l => l.description.includes('AI Insight:'));
  if (enhancedLinks.length > 0) {
    console.log(`  AI-Enhanced: ${color(enhancedLinks.length.toString(), 'magenta')}`);
  }
}

function generateMarkdownLinks(links: DeepLink[], config: DeepLinkConfig): string {
  let markdown = `# ${config.apiName} API Deep Links\n\n`;
  markdown += `Generated: ${new Date().toISOString()}\n`;
  markdown += `Version: ${config.version}\n`;
  markdown += `Security Level: ${config.securityLevel}\n\n`;
  
  const grouped = links.reduce((acc, link) => {
    if (!acc[link.category]) acc[link.category] = [];
    acc[link.category].push(link);
    return acc;
  }, {} as Record<string, DeepLink[]>);
  
  Object.entries(grouped).forEach(([category, categoryLinks]) => {
    markdown += `## ${category.toUpperCase()}\n\n`;
    
    categoryLinks.forEach(link => {
      markdown += `### ${link.title}\n\n`;
      markdown += `**Method:** \`${link.method}\`\n\n`;
      markdown += `**URL:** \`${link.url}\`\n\n`;
      markdown += `**Description:** ${link.description}\n\n`;
      
      if (link.examples && link.examples.length > 0) {
        markdown += `**Examples:**\n`;
        link.examples.forEach(example => {
          markdown += `- \`${example}\`\n`;
        });
        markdown += `\n`;
      }
      
      if (link.security && link.security.length > 0) {
        markdown += `**Security Requirements:**\n`;
        link.security.forEach(sec => {
          markdown += `- ${sec}\n`;
        });
        markdown += `\n`;
      }
      
      markdown += `---\n\n`;
    });
  });
  
  return markdown;
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log(color('Usage: bun run deep-links "API_NAME" [options]', 'yellow'));
    console.log(color('\nAvailable APIs:', 'cyan'));
    console.log('  • ai-operations');
    console.log('  • security');
    console.log('  • cache');
    console.log('  • monitoring');
    console.log('  • Bun.file');
    console.log('  • Bun.secrets.get');
    console.log('  • Bun.nanoseconds');
    console.log('  • stringWidth');
    console.log(color('\nOptions:', 'cyan'));
    console.log('  --examples    Include usage examples');
    console.log('  --internal    Set security level to internal');
    console.log('  --restricted  Set security level to restricted');
    console.log('  --markdown    Output as markdown');
    console.log('  --short       Quick one-line output');
    process.exit(1);
  }
  
  const apiName = args[0];
  const includeExamples = args.includes('--examples');
  const securityLevel = args.includes('--restricted') ? 'restricted' : 
                        args.includes('--internal') ? 'internal' : 'public';
  const outputMarkdown = args.includes('--markdown');
  const shortMode = args.includes('--short');
  
  const config: DeepLinkConfig = {
    apiName,
    baseUrl: 'https://api.factorywager.com',
    version: '/v1',
    includeExamples,
    securityLevel: securityLevel as any
  };
  
  try {
    if (shortMode) {
      // Ultra-fast mode for one-liners
      console.log(color('🔗 Deep Links', 'cyan'));
      console.log(`  API: ${color(apiName, 'green')} | Security: ${color(securityLevel, 'yellow')} | Examples: ${color(includeExamples ? 'Yes' : 'No', 'cyan')}`);
      console.log(`  Docs: ${color(`https://bun.sh/docs/${apiName.toLowerCase().replace('bun.', '')}`, 'blue')}`);
      console.log(`  Source: ${color(`https://github.com/oven-sh/bun/blob/main/src/${apiName.replace('Bun.', '').toLowerCase()}.ts`, 'blue')}`);
      return;
    }
    
    console.log(color(`🔗 Generating deep links for ${apiName}...`, 'cyan'));
    
    const links = await generateDeepLinks(config);
    
    if (outputMarkdown) {
      const markdown = generateMarkdownLinks(links, config);
      console.log(markdown);
    } else {
      displayDeepLinks(links, config);
    }
    
  } catch (error) {
    console.error(color('❌ Deep link generation failed:', 'red'), error?.message || String(error));
    process.exit(1);
  }
}

if (import.meta.main) {
  main();
}
