#!/usr/bin/env bun

// Script to discover plive.sportswidgets.pro API endpoints

async function discoverAPI() {
  console.log('🔍 Discovering plive.sportswidgets.pro API endpoints...\n');

  const baseUrl = 'https://plive.sportswidgets.pro';
  const commonPaths = [
    '/api',
    '/api/v1',
    '/api/docs',
    '/api/health',
    '/api/live',
    '/api/events',
    '/api/odds',
    '/api/analytics',
    '/graphql',
    '/v1/api'
  ];

  console.log('Testing common API paths...\n');

  for (const path of commonPaths) {
    try {
      const response = await fetch(`${baseUrl}${path}`, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; API Discovery)',
          'Accept': 'application/json, text/html, */*'
        },
        signal: AbortSignal.timeout(5000)
      });

      if (response.ok) {
        console.log(`✅ ${response.status} ${path}`);
      } else if (response.status === 401 || response.status === 403) {
        console.log(`🔒 ${response.status} ${path} (Requires auth)`);
      } else if (response.status !== 404) {
        console.log(`⚠️  ${response.status} ${path}`);
      }

    } catch (error) {
      // Ignore most errors, only 404s are expected
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  console.log('\n💡 To get real API endpoints, you need to:');
  console.log('1. Contact plive support for API documentation');
  console.log('2. Use browser dev tools when accessing their web interface');
  console.log('3. Check for authentication requirements');
}

// Run discovery
discoverAPI().catch(console.error);
