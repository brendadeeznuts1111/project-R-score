#!/usr/bin/env bun

// Simple Bun Fetch Debugging Demo
// Shows BUN_CONFIG_VERBOSE_FETCH in action

console.log('🔍 Bun Verbose Fetch Debugging Demo');
console.log('===================================\n');

// Enable verbose fetch logging to show curl commands
process.env.BUN_CONFIG_VERBOSE_FETCH = "curl";

console.log('✅ BUN_CONFIG_VERBOSE_FETCH = "curl"');
console.log('📡 All fetch requests will be logged as curl commands\n');

// Test different types of fetch requests
async function demonstrateFetchDebugging() {
  console.log('--- 1. Simple GET Request ---');
  try {
    const response = await fetch('https://httpbin.org/get');
    console.log('✅ GET request completed');
  } catch (error) {
    console.log('❌ GET request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 2. POST Request with JSON ---');
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
    console.log('✅ POST request completed');
  } catch (error) {
    console.log('❌ POST request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 3. PUT Request with Custom Headers ---');
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
    console.log('✅ PUT request completed');
  } catch (error) {
    console.log('❌ PUT request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 4. DELETE Request ---');
  try {
    const response = await fetch('https://httpbin.org/delete', {
      method: 'DELETE',
      headers: {
        'Authorization': 'Bearer demo-token'
      }
    });
    console.log('✅ DELETE request completed');
  } catch (error) {
    console.log('❌ DELETE request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 5. Form Data Upload ---');
  try {
    const formData = new FormData();
    formData.append('username', 'bundebug');
    formData.append('file', new Blob(['test file content'], { type: 'text/plain' }), 'test.txt');
    formData.append('description', 'Debug demonstration file');
    
    const response = await fetch('https://httpbin.org/post', {
      method: 'POST',
      body: formData
    });
    console.log('✅ Form upload completed');
  } catch (error) {
    console.log('❌ Form upload failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n--- 6. Request with Query Parameters ---');
  try {
    const response = await fetch('https://httpbin.org/get?debug=true&format=json&limit=10', {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-Debug-Mode': 'verbose'
      }
    });
    console.log('✅ Query parameter request completed');
  } catch (error) {
    console.log('❌ Query parameter request failed:', error instanceof Error ? error.message : 'Unknown error');
  }

  console.log('\n🎉 Fetch debugging demonstration complete!');
  console.log('📝 Above you should see curl commands for each request');
  console.log('🔧 You can copy-paste these curl commands to replicate requests');
}

// Run the demonstration
demonstrateFetchDebugging().catch(console.error);
