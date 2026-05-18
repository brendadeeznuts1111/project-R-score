#!/usr/bin/env bun

export async function demoAdvancedHTTP() {
  console.info('🚀 Advanced HTTP Features');
  console.info('='.repeat(40));
  
  // 1. Request interceptors
  console.info('\n1. 📡 Request Interceptors:');
  const interceptors = {
    request: [],
    response: []
  };
  
  function addRequestInterceptor(interceptor) {
    interceptors.request.push(interceptor);
  }
  
  function addResponseInterceptor(interceptor) {
    interceptors.response.push(interceptor);
  }
  
  // Add logging interceptor
  addRequestInterceptor((config) => {
    console.info(`   📤 Request: ${config.method || 'GET'} ${config.url}`);
    return config;
  });
  
  addResponseInterceptor((response) => {
    console.info(`   📥 Response: ${response.status} ${response.statusText}`);
    return response;
  });
  
  // Enhanced fetch with interceptors
  async function enhancedFetch(url, options = {}) {
    let config = { url, ...options };
    
    // Apply request interceptors
    for (const interceptor of interceptors.request) {
      config = interceptor(config) || config;
    }
    
    const response = await fetch(config.url, config);
    
    // Apply response interceptors
    let processedResponse = response;
    for (const interceptor of interceptors.response) {
      processedResponse = interceptor(processedResponse) || processedResponse;
    }
    
    return processedResponse;
  }
  
  try {
    await enhancedFetch('https://httpbin.org/get');
  } catch (error) {
    console.info(`   Error: ${error.message}`);
  }
  
  // 2. Request caching
  console.info('\n2. 💾 Request Caching:');
  const cache = new Map();
  
  async function cachedFetch(url, options = {}) {
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        console.info('   📦 Serving from cache');
        return cached.response;
      }
    }
    
    console.info('   🌐 Fresh request');
    const response = await fetch(url, options);
    
    cache.set(cacheKey, {
      response: response.clone(),
      timestamp: Date.now()
    });
    
    return response;
  }
  
  try {
    // First request
    await cachedFetch('https://httpbin.org/json');
    // Second request (cached)
    await cachedFetch('https://httpbin.org/json');
  } catch (error) {
    console.info(`   Error: ${error.message}`);
  }
  
  // 3. Concurrent requests
  console.info('\n3. ⚡ Concurrent Requests:');
  const urls = [
    'https://httpbin.org/delay/1',
    'https://httpbin.org/delay/1',
    'https://httpbin.org/delay/1'
  ];
  
  try {
    const startTime = Date.now();
    const responses = await Promise.all(
      urls.map(url => fetch(url))
    );
    const endTime = Date.now();
    
    console.info(`   ✅ Completed ${responses.length} requests in ${endTime - startTime}ms`);
  } catch (error) {
    console.info(`   Error: ${error.message}`);
  }
  
  // 4. Streaming response
  console.info('\n4. 🌊 Streaming Response:');
  try {
    const response = await fetch('https://httpbin.org/stream/5');
    
    console.info('   📡 Streaming data:');
    let count = 0;
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value);
      const lines = chunk.trim().split('\n');
      
      for (const line of lines) {
        if (line) {
          count++;
          console.info(`   📨 Chunk ${count}: ${line.substring(0, 50)}...`);
        }
      }
    }
    
    console.info(`   ✅ Streamed ${count} chunks`);
  } catch (error) {
    console.info(`   Error: ${error.message}`);
  }
  
  // 5. File upload
  console.info('\n5. 📁 File Upload:');
  try {
    const fileContent = 'Hello from Bun!\nThis is a test file upload.';
    const blob = new Blob([fileContent], { type: 'text/plain' });
    
    const formData = new FormData();
    formData.append('file', blob, 'test.txt');
    formData.append('description', 'Test upload from Bun');
    
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: formData
    });
    
    const data = await response.json();
    console.info('   ✅ File uploaded successfully');
    console.info(`   File name: ${data.files.file}`);
    console.info(`   Description: ${data.form.description}`);
  } catch (error) {
    console.info(`   Error: ${error.message}`);
  }
  
  console.info('\n✅ Advanced HTTP demo completed!');
}

if (import.meta.main) {
  demoAdvancedHTTP();
}
