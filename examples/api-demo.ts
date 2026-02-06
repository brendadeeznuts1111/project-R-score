#!/usr/bin/env bun
/**
 * API Demo - FactoryWager Enterprise Platform
 * 
 * Demonstrates various API endpoints and functionality
 */

const commands = ['urls', 'advanced', 'typedarray', 'advanced-demo'] as const;
type Command = typeof commands[number];

interface APIResponse {
  message: string;
  data?: any;
  timestamp: string;
  endpoint: string;
}

/**
 * Simulate API responses for demo purposes
 */
function simulateAPIResponse(endpoint: string, data?: any): APIResponse {
  return {
    message: `API response from ${endpoint}`,
    data: data || {
      status: 'success',
      features: [
        'High-performance Bun runtime',
        'TypeScript support',
        'Enterprise-grade architecture',
        'Comprehensive API suite'
      ],
      metrics: {
        responseTime: Math.random() * 100,
        uptime: '99.9%',
        requestsPerSecond: Math.floor(Math.random() * 10000)
      }
    },
    timestamp: new Date().toISOString(),
    endpoint
  };
}

/**
 * Display URLs endpoint data
 */
function showUrls(): void {
  console.log('🔗 API URLs Endpoint');
  console.log('═════════════════════════════════════════════════');
  
  const urls = [
    { path: '/api/typedarray/urls', method: 'GET', description: 'Get typed array URLs' },
    { path: '/api/advanced-demo', method: 'GET', description: 'Advanced API demonstration' },
    { path: '/api/fetch-demo', method: 'POST', description: 'Fetch API demonstration' },
    { path: '/api/content-types', method: 'GET', description: 'Content type examples' },
    { path: '/api/performance', method: 'GET', description: 'Performance metrics' }
  ];
  
  urls.forEach((url, index) => {
    console.log(`${index + 1}. ${url.method} ${url.path}`);
    console.log(`   ${url.description}`);
    console.log('');
  });
  
  const response = simulateAPIResponse('/api/typedarray/urls', { urls });
  console.log('📊 Sample Response:');
  console.log(JSON.stringify(response, null, 2));
}

/**
 * Display advanced demo endpoint
 */
function showAdvanced(): void {
  console.log('🚀 Advanced API Demo');
  console.log('═════════════════════════════════════════════════');
  
  const advancedFeatures = [
    'Real-time data streaming',
    'WebSocket connections',
    'Server-sent events',
    'Advanced caching strategies',
    'Load balancing',
    'Rate limiting',
    'Authentication & authorization',
    'Database integration'
  ];
  
  console.log('✨ Advanced Features:');
  advancedFeatures.forEach((feature, index) => {
    console.log(`   ${index + 1}. ${feature}`);
  });
  
  console.log('');
  
  const response = simulateAPIResponse('/api/advanced-demo', {
    features: advancedFeatures,
    configuration: {
      maxConnections: 1000,
      timeout: 30000,
      retries: 3,
      cacheSize: '100MB'
    }
  });
  
  console.log('📊 Sample Response:');
  console.log(JSON.stringify(response, null, 2));
}

/**
 * Display typed array demo
 */
function showTypedArray(): void {
  console.log('🔢 Typed Array API Demo');
  console.log('═════════════════════════════════════════════════');
  
  // Create various typed arrays
  const int8Array = new Int8Array([1, 2, 3, 4, 5]);
  const uint16Array = new Uint16Array([100, 200, 300, 400]);
  const float32Array = new Float32Array([1.1, 2.2, 3.3, 4.4]);
  const bigInt64Array = new BigInt64Array([1n, 2n, 3n, 4n]);
  
  console.log('📋 Typed Array Examples:');
  console.log(`   Int8Array: ${int8Array}`);
  console.log(`   Uint16Array: ${uint16Array}`);
  console.log(`   Float32Array: ${float32Array}`);
  console.log(`   BigInt64Array: ${bigInt64Array}`);
  
  console.log('');
  
  const response = simulateAPIResponse('/api/typedarray/urls', {
    arrays: {
      int8: Array.from(int8Array),
      uint16: Array.from(uint16Array),
      float32: Array.from(float32Array),
      bigInt64: Array.from(bigInt64Array)
    },
    metadata: {
      totalBytes: int8Array.byteLength + uint16Array.byteLength + float32Array.byteLength + bigInt64Array.byteLength,
      arrayTypes: ['Int8Array', 'Uint16Array', 'Float32Array', 'BigInt64Array']
    }
  });
  
  console.log('📊 Sample Response:');
  console.log(JSON.stringify(response, null, 2));
}

/**
 * Display help information
 */
function showHelp(): void {
  console.log('🎯 API Demo - FactoryWager Enterprise Platform');
  console.log('═════════════════════════════════════════════════');
  console.log('');
  console.log('USAGE:');
  console.log('  bun run examples/api-demo.ts <command>');
  console.log('');
  console.log('COMMANDS:');
  console.log('  urls         Show API URLs and endpoints');
  console.log('  advanced     Show advanced API features');
  console.log('  typedarray   Show typed array demonstrations');
  console.log('  help         Show this help message');
  console.log('');
  console.log('EXAMPLES:');
  console.log('  bun run examples/api-demo.ts urls');
  console.log('  bun run examples/api-demo.ts advanced');
  console.log('  bun run examples/api-demo.ts typedarray');
  console.log('');
}

/**
 * Main execution function
 */
async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0] as Command;
  
  if (!command || command === 'help') {
    showHelp();
    return;
  }
  
  if (!commands.includes(command as Command)) {
    console.error(`❌ Unknown command: ${command}`);
    console.error('Use "help" to see available commands');
    process.exit(1);
  }
  
  try {
    switch (command) {
      case 'urls':
        showUrls();
        break;
      case 'advanced':
        showAdvanced();
        break;
      case 'typedarray':
        showTypedArray();
        break;
      default:
        showHelp();
    }
  } catch (error) {
    console.error(`❌ Error executing ${command}:`, error);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.main) {
  main();
}

export { main, showUrls, showAdvanced, showTypedArray, showHelp };
