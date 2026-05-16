#!/usr/bin/env bun

export async function demoBasicFetch() {
  console.log('🌐 Basic Fetch Examples');
  console.log('='.repeat(40));
  
  // Example 1: Simple GET
  console.log('\n1. 📥 Simple GET Request:');
  try {
    const response = await fetch('https://httpbin.org/get');
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   URL: ${data.url}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Example 2: POST with JSON
  console.log('\n2. 📤 POST Request with JSON:');
  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: 'Hello from Bun!' }),
    });
    const data = await response.json();
    console.log(`   Status: ${response.status}`);
    console.log(`   Method: ${data.method}`);
    console.log(`   Data: ${JSON.stringify(data.json, null, 2)}`);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Example 3: Headers
  console.log('\n3. 📋 Custom Headers:');
  try {
    const response = await fetch('https://httpbin.org/headers', {
      headers: {
        'X-Custom-Header': 'BunPlayground',
        'User-Agent': 'Bun-Cheatsheet-System/1.0',
      },
    });
    const data = await response.json();
    console.log(`   Headers sent:`, data.headers);
  } catch (error) {
    console.log(`   Error: ${error.message}`);
  }
  
  // Example 4: Error handling
  console.log('\n4. 🚨 Error Handling:');
  try {
    const response = await fetch('https://httpbin.org/status/404');
    if (!response.ok) {
      console.log(`   Request failed: ${response.status} ${response.statusText}`);
    }
  } catch (error) {
    console.log(`   Network error: ${error.message}`);
  }
  
  console.log('\n✅ Fetch examples completed!');
}

// Run if executed directly
if (import.meta.main) {
  demoBasicFetch();
}
