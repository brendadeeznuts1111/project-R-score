#!/usr/bin/env bun

// Simple Bun Fetch Debugging Demo
// Shows BUN_CONFIG_VERBOSE_FETCH in action

console.info('🔍 Bun Verbose Fetch Debugging Demo');
console.info('===================================\n');

// Enable verbose fetch logging to show curl commands
process.env.BUN_CONFIG_VERBOSE_FETCH = "curl";

console.info('✅ BUN_CONFIG_VERBOSE_FETCH = "curl"');
console.info('📡 All fetch requests will be logged as curl commands\n');

// Test different types of fetch requests
async function demonstrateFetchDebugging() {
  console.info('--- 1. Simple GET Request ---');
  try {
    const response = await fetch('https://httpbin.org/get');
    console.info('✅ GET request completed');
  } catch (error) {
    console.info('❌ GET request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.info('\n--- 2. POST Request with JSON ---');
  try {
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Bun-Fetch-Demo/1.0'
      },
      body: JSON.stringify({
        message: 'Hello from Bun!',
        timestamp: new Date().toISOString(),
        debug: true
      })
    });
    console.info('✅ POST request completed');
  } catch (error) {
    console.info('❌ POST request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.info('\n--- 3. PUT Request with Custom Headers ---');
  try {
    const response = await fetch('https://httpbin.org/put', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer demo-token',
        'X-Custom-Header': 'debug-value'
      },
      body: JSON.stringify({
        action: 'update',
        data: { id: 123, status: 'updated' }
      })
    });
    console.info('✅ PUT request completed');
  } catch (error) {
    console.info('❌ PUT request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.info('\n--- 4. DELETE Request ---');
  try {
    const response = await fetch('https://httpbin.org/delete', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer demo-token'
      }
    });
    console.info('✅ DELETE request completed');
  } catch (error) {
    console.info('❌ DELETE request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.info('\n--- 5. Form Data Upload ---');
  try {
    const formData = new FormData();
    formData.append('username', 'bundebug');
    formData.append('file', new Blob(['test file content'], { type: 'text/plain' }), 'test.txt');
    formData.append('description', 'Debug demonstration file');
    
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: formData
    });
    console.info('✅ Form upload completed');
  } catch (error) {
    console.info('❌ Form upload failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.info('\n--- 6. Request with Query Parameters ---');
  try {
    const response = await fetch('https://httpbin.org/get?debug=true&format=json&limit=10', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Debug-Mode': 'verbose'
      }
    });
    console.info('✅ Query parameter request completed');
  } catch (error) {
    console.info('❌ Query parameter request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.info('\n🎉 Fetch debugging demonstration complete!');
  console.info('📝 Above you should see curl commands for each request');
  console.info('🔧 You can copy-paste these curl commands to replicate requests');
}

// Run the demonstration
demonstrateFetchDebugging().catch(console.error);
