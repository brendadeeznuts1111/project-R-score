#!/usr/bin/env bun

export async function demoAdvancedHTTP() {
  console.log('🚀 Advanced HTTP Features');
  console.log('='.repeat(40));
  
  // 1. Request interceptors
  console.log('\n1. 📡 Request Interceptors:');
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
    console.log(`   📤 Request: ${config.method || 'GET'} ${config.url}`);
    return config;
  });
  
  addResponseInterceptor((response) => {
    console.log(`   📥 Response: ${response.status} ${response.statusText}`);
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
    console.log(`   Error: ${error.message}`);
  }
  
  // 2. Request caching
  console.log('\n2. 💾 Request Caching:');
  const cache = new Map();
  
  async function cachedFetch(url, options = {}) {
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    
    if (cache.has(cacheKey)) {
      const cached = cache.get(cacheKey);
      if (Date.now() - cached.timestamp < 60000) { // 1 minute cache
        console.log('   📦 Serving from cache');
        return cached.response;
      }
    }
    
    console.log('   🌐 Fresh request');
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
    console.log(`   Error: ${error.message}`);
  }
  
  // 3. Concurrent requests
  console.log('\n3. ⚡ Concurrent Requests:');
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
    
    console.log(`   ✅ Completed ${responses.length} requests in ${endTime - startTime}ms`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // 4. Streaming response
  console.log('\n4. 🌊 Streaming Response:');
  try {
    const response = await fetch('https://httpbin.org/stream/5');
    
    console.log('   📡 Streaming data:');
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
          console.log(`   📨 Chunk ${count}: ${line.substring(0, 50)}...`);
        }
      }
    }
    
    console.log(`   ✅ Streamed ${count} chunks`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // 5. File upload
  console.log('\n5. 📁 File Upload:');
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
    console.log('   ✅ File uploaded successfully');
    console.log(`   File name: ${data.files.file}`);
    console.log(`   Description: ${data.form.description}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  console.log('\n✅ Advanced HTTP demo completed!');
}

if (import.meta.main) {
  demoAdvancedHTTP();
}
