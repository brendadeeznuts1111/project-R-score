#!/usr/bin/env bun

// Debug Network Requests Demo
// Demonstrates BUN_CONFIG_VERBOSE_FETCH for debugging fetch requests

import { serve } from 'bun';

console.info('🔍 Bun Network Request Debugging Demo');
console.info('=====================================\n');

// Enable verbose fetch logging
process.env.BUN_CONFIG_VERBOSE_FETCH = "curl";

console.info('✅ BUN_CONFIG_VERBOSE_FETCH set to "curl"');
console.info('📡 All fetch requests will be logged as curl commands\n');

// Test server that makes various fetch requests
const testServer = serve({
  port: 3001,
  async fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === '/') {
      return new Response(`
<!DOCTYPE html>
<html>
<head>
    <title>Bun Fetch Debugging Demo</title>
    <style>
        body { font-family: system-ui; max-width: 800px; margin: 40px auto; }
        .demo { background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0; }
        .curl { background: #2d3748; color: #e2e8f0; padding: 15px; border-radius: 6px; font-family: monospace; white-space: pre-wrap; }
        button { background: #4299e1; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer; }
        button:hover { background: #3182ce; }
    </style>
</head>
<body>
    <h1>🔍 Bun Network Request Debugging</h1>
    
    <div class="demo">
        <h2>📡 Test Different Request Types</h2>
        <button onclick="testGetRequest()">GET Request</button>
        <button onclick="testPostRequest()">POST Request</button>
        <button onclick="testPutRequest()">PUT Request</button>
        <button onclick="testDeleteRequest()">DELETE Request</button>
        <button onclick="testFileUpload()">File Upload</button>
    </div>

    <div class="demo">
        <h2>🐳 Curl Commands</h2>
        <p>Check your terminal - each request will be printed as a curl command!</p>
        <div class="curl" id="curlOutput">Click a button above to see curl commands...</div>
    </div>

    <div class="demo">
        <h2>📊 Request/Response Details</h2>
        <div id="requestDetails">Request details will appear here...</div>
    </div>

    <script>
        async function testGetRequest() {
            console.info('🔍 Testing GET request...');
            const response = await fetch('/api/test-get');
            const data = await response.json();
            updateDisplay('GET', data);
        }

        async function testPostRequest() {
            console.info('🔍 Testing POST request...');
            const response = await fetch('/api/test-post', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: 'Hello from client!', timestamp: Date.now() })
            });
            const data = await response.json();
            updateDisplay('POST', data);
        }

        async function testPutRequest() {
            console.info('🔍 Testing PUT request...');
            const response = await fetch('/api/test-put', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: 123, updated: true })
            });
            const data = await response.json();
            updateDisplay('PUT', data);
        }

        async function testDeleteRequest() {
            console.info('🔍 Testing DELETE request...');
            const response = await fetch('/api/test-delete/123', {
                method: 'DELETE'
            });
            const data = await response.json();
            updateDisplay('DELETE', data);
        }

        async function testFileUpload() {
            console.info('🔍 Testing file upload...');
            const formData = new FormData();
            formData.append('file', new Blob(['test file content'], { type: 'text/plain' }), 'test.txt');
            formData.append('description', 'Test file upload');
            
            const response = await fetch('/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await response.json();
            updateDisplay('UPLOAD', data);
        }

        function updateDisplay(method, data) {
            document.getElementById('curlOutput').textContent = 
                'Check your terminal for the curl command!\\n\\nResponse: ' + JSON.stringify(data, null, 2);
            
            document.getElementById('requestDetails').innerHTML = 
                '<h3>' + method + ' Request Details:</h3><pre>' + JSON.stringify(data, null, 2) + '</pre>';
        }
    </script>
</body>
</html>
      `, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    if (url.pathname === '/api/test-get') {
      console.info('📡 Processing GET request...');
      return Response.json({
        method: 'GET',
        timestamp: new Date().toISOString(),
        message: 'GET request successful',
        headers: Object.fromEntries(req.headers.entries())
      });
    }

    if (url.pathname === '/api/test-post') {
      const body = await req.json();
      console.info('📡 Processing POST request with body:', body);
      return Response.json({
        method: 'POST',
        timestamp: new Date().toISOString(),
        received: body,
        message: 'POST request processed',
        headers: Object.fromEntries(req.headers.entries())
      });
    }

    if (url.pathname === '/api/test-put') {
      const body = await req.json();
      console.info('📡 Processing PUT request with body:', body);
      return Response.json({
        method: 'PUT',
        timestamp: new Date().toISOString(),
        updated: body,
        message: 'PUT request processed',
        headers: Object.fromEntries(req.headers.entries())
      });
    }

    if (url.pathname === '/api/test-delete/123') {
      console.info('📡 Processing DELETE request...');
      return Response.json({
        method: 'DELETE',
        timestamp: new Date().toISOString(),
        deletedId: 123,
        message: 'DELETE request processed',
        headers: Object.fromEntries(req.headers.entries())
      });
    }

    if (url.pathname === '/api/upload') {
      const formData = await req.formData();
      console.info('📡 Processing file upload...');
      const file = formData.get('file');
      const description = formData.get('description');
      
      return Response.json({
        method: 'POST',
        type: 'UPLOAD',
        timestamp: new Date().toISOString(),
        fileName: file instanceof File ? file.name : (typeof file === 'string' ? 'unknown' : 'unknown'),
        fileSize: file instanceof File ? file.size : (typeof file === 'string' ? 0 : 0),
        description: typeof description === 'string' ? description : 'unknown',
        message: 'File upload processed',
        headers: Object.fromEntries(req.headers.entries())
      });
    }

    return new Response('Not Found', { status: 404 });
  }
});

console.info('🚀 Debug server started on http://localhost:3001');
console.info('');
console.info('📋 Available endpoints:');
console.info('  GET  /api/test-get');
console.info('  POST /api/test-post');
console.info('  PUT  /api/test-put');
console.info('  DELETE /api/test-delete/123');
console.info('  POST /api/upload (multipart)');
console.info('');
console.info('🌐 Open http://localhost:3001 to test different request types');
console.info('🐳 Watch your terminal for curl commands!');
console.info('');

// Demonstrate programmatic fetch requests
console.info('🔍 Demonstrating programmatic fetch requests...\n');

async function demonstrateFetchRequests() {
  console.info('--- GET Request ---');
  await fetch('http://localhost:3001/api/test-get');
  
  console.info('\n--- POST Request ---');
  await fetch('http://localhost:3001/api/test-post', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ demo: 'data', timestamp: Date.now() })
  });
  
  console.info('\n--- PUT Request ---');
  await fetch('http://localhost:3001/api/test-put', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: 456, status: 'updated' })
  });
  
  console.info('\n--- DELETE Request ---');
  await fetch('http://localhost:3001/api/test-delete/456', {
    method: 'DELETE'
  });
  
  console.info('\n--- File Upload ---');
  const formData = new FormData();
  formData.append('file', new Blob(['demo content'], { type: 'text/plain' }), 'demo.txt');
  formData.append('description', 'Demo file upload');
  
  await fetch('http://localhost:3001/api/upload', {
    method: 'POST',
    body: formData
  });
  
  console.info('\n✅ All fetch requests demonstrated!');
  console.info('🌐 Check http://localhost:3001 for interactive testing');
}

// Wait a moment for server to start, then demonstrate
setTimeout(demonstrateFetchRequests, 1000);
