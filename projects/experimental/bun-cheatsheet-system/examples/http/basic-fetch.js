#!/usr/bin/env bun

export async function demoBasicFetch() {
  console.info('🌐 Basic Fetch Examples');
  console.info('='.repeat(40));
  
  // Example 1: Simple GET
  console.info('\n1. 📥 Simple GET Request:');
  try {
    const response = await fetch('https://httpbin.org/get');
    const data = await response.json();
    console.info(`   Status: ${response.status}`);
    console.info(`   URL: ${data.url}`);
  } catch (error) {
    console.info(`   Error: ${error.message}`);
  }
  
  // Example 2: POST with JSON
  console.info('\n2. 📤 POST Request with JSON:');
  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello from Bun!' }),
    });
    const data = await response.json();
    console.info(`   Status: ${response.status}`);
    console.info(`   Method: ${data.method}`);
    console.info(`   Data: ${JSON.stringify(data.json, null, 2)}`);
  } catch (error) {
    console.info(`   Error: ${error.message}`);
  }
  
  // Example 3: Headers
  console.info('\n3. 📋 Custom Headers:');
  try {
    const response = await fetch('https://httpbin.org/headers', {
      headers: {
        'X-Custom-Header': 'BunPlayground',
        'User-Agent': 'Bun-Cheatsheet-System/1.0',
      },
    });
    const data = await response.json();
    console.info(`   Headers sent:`, data.headers);
  } catch (error) {
    console.info(`   Error: ${error.message}`);
  }
  
  // Example 4: Error handling
  console.info('\n4. 🚨 Error Handling:');
  try {
    const response = await fetch('https://httpbin.org/status/404');
    if (!response.ok) {
      console.info(`   Request failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.info(`   Network error: ${error.message}`);
  }
  
  console.info('\n✅ Fetch examples completed!');
}

// Run if executed directly
if (import.meta.main) {
  demoBasicFetch();
}
