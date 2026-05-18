#!/usr/bin/env bun

export async function demoStrongDefaultsClient() {
  console.info('🛡️ Strong Defaults HTTP Client');
  console.info('='.repeat(40));
  
  // Strong defaults configuration
  const defaultConfig = {
    timeout: 10000,
    retries: 3,
    headers: {
      'User-Agent': 'Bun-Cheatsheet-System/1.0',
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  };
  
  // Enhanced fetch with strong defaults
  async function strongFetch(url, options = {}) {
    const config = {
      ...defaultConfig,
      ...options,
      headers: {
        ...defaultConfig.headers,
        ...options.headers
      }
    };
    
    let lastError;
    for (let attempt = 1; attempt <= config.retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), config.timeout);
        
        const response = await fetch(url, {
          ...config,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return response;
      } catch (error) {
        lastError = error;
        console.info(`   Attempt ${attempt} failed: ${error.message}`);
        
        if (attempt === config.retries) {
          throw lastError;
        }
        
        // Exponential backoff
        await new Promise(resolve => 
          setTimeout(resolve, Math.pow(2, attempt) * 1000)
        );
      }
    }
  }
  
  // Example 1: Secure API call
  console.info('\n1. 🔒 Secure API call with defaults:');
  try {
    const response = await strongFetch('https://httpbin.org/json');
    const data = await response.json();
    console.info('   ✅ Secure call successful');
    console.info(`   Response type: ${response.headers.get('content-type')}`);
  } catch (error) {
    console.info(`   ❌ Error: ${error.message}`);
  }
  
  // Example 2: Override defaults
  console.info('\n2. ⚙️ Override defaults:');
  try {
    const response = await strongFetch('https://httpbin.org/anything', {
      method: 'POST',
      headers: {
        'X-Custom-Header': 'Overridden'
      },
      body: JSON.stringify({ custom: true })
    });
    
    const data = await response.json();
    console.info('   ✅ Override successful');
    console.info(`   Custom header: ${data.headers['x-custom-header']}`);
  } catch (error) {
    console.info(`   ❌ Error: ${error.message}`);
  }
  
  // Example 3: Retry demonstration
  console.info('\n3. 🔄 Retry mechanism:');
  try {
    // This will fail and retry
    const response = await strongFetch('https://httpbin.org/status/500');
    console.info('   ✅ Unexpected success');
  } catch (error) {
    console.info(`   ✅ Retry mechanism working: ${error.message}`);
  }
  
  console.info('\n✅ Strong defaults demo completed!');
}

if (import.meta.main) {
  demoStrongDefaultsClient();
}
