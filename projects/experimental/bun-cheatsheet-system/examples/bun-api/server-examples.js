#!/usr/bin/env bun

export async function demoServerExamples() {
  console.log('🌐 Bun Server Examples');
  console.log('='.repeat(40));
  
  // Note: These are server examples that would normally run continuously
  // For demo purposes, we'll show the setup and then stop them
  
  // 1. Basic HTTP server
  console.log('\n1. 🚀 Basic HTTP Server:');
  const basicServerCode = `
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello from Bun server!');
  }
});

console.log('Server running on http://localhost:3000');
`;
  console.log('   Code:');
  console.log(basicServerCode);
  
  // 2. Server with routing
  console.log('\n2. 🛣️ Server with Routing:');
  const routingServerCode = `
const server = Bun.serve({
  port: 3001,
  fetch(req) {
    const url = new URL(req.url);
    
    switch (url.pathname) {
      case '/':
        return new Response('Home Page');
      case '/api':
        return Response.json({ message: 'API Endpoint' });
      case '/about':
        return new Response('About Page');
      default:
        return new Response('Not Found', { status: 404 });
    }
  }
});
`;
  console.log('   Code:');
  console.log(routingServerCode);
  
  // 3. WebSocket server
  console.log('\n3. 🔌 WebSocket Server:');
  const websocketServerCode = `
const server = Bun.serve({
  port: 3002,
  fetch(req, server) {
    // Upgrade to WebSocket
    if (server.upgrade(req)) {
      return; // WebSocket connection established
    }
    return new Response('Upgrade failed', { status: 500 });
  },
  websocket: {
    message(ws, message) {
      console.log('Received:', message);
      ws.send('Echo: ' + message);
    },
    open(ws) {
      console.log('WebSocket connection opened');
      ws.send('Welcome to WebSocket!');
    },
    close(ws, code, message) {
      console.log('WebSocket closed:', code, message);
    }
  }
});
`;
  console.log('   Code:');
  console.log(websocketServerCode);
  
  // 4. Static file server
  console.log('\n4. 📁 Static File Server:');
  const staticServerCode = `
const server = Bun.serve({
  port: 3003,
  fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname === '/' ? '/index.html' : url.pathname;
    
    try {
      const file = Bun.file('./public' + path);
      if (await file.exists()) {
        return new Response(file);
      }
    } catch {}
    
    return new Response('File not found', { status: 404 });
  }
});
`;
  console.log('   Code:');
  console.log(staticServerCode);
  
  // 5. API server with middleware
  console.log('\n5. 🔧 API Server with Middleware:');
  const apiServerCode = `
// Middleware for logging
const logger = (req) => {
  console.log(\`\\\${new Date().toISOString()} - \\\${req.method} \\\${req.url}\`);
};

// Middleware for CORS
const cors = (req) => {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type'
  };
};

const server = Bun.serve({
  port: 3004,
  fetch(req) {
    logger(req);
    
    const headers = cors(req);
    
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers });
    }
    
    const url = new URL(req.url);
    
    if (url.pathname === '/api/users' && req.method === 'GET') {
      return Response.json(
        [{ id: 1, name: 'Alice' }, { id: 2, name: 'Bob' }],
        { headers }
      );
    }
    
    if (url.pathname === '/api/users' && req.method === 'POST') {
      return Response.json(
        { message: 'User created', id: 3 },
        { status: 201, headers }
      );
    }
    
    return new Response('Not Found', { status: 404, headers });
  }
});
`;
  console.log('   Code:');
  console.log(apiServerCode);
  
  // 6. Demonstrate creating a temporary server
  console.log('\n6. 🧪 Temporary Server Demo:');
  try {
    const tempServer = Bun.serve({
      port: 0, // Random available port
      fetch(req) {
        return new Response('Temporary server is working!');
      }
    });
    
    console.log(`   ✅ Temporary server started on port ${tempServer.port}`);
    
    // Test the server
    const response = await fetch(`http://localhost:${tempServer.port}`);
    const text = await response.text();
    console.log(`   📡 Response: ${text}`);
    
    // Stop the server
    tempServer.stop();
    console.log('   🛑 Temporary server stopped');
    
  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
  }
  
  console.log('\n✅ Server examples demonstrated!');
  console.log('\n💡 To run these servers:');
  console.log('   1. Copy the code into separate .js files');
  console.log('   2. Run with: bun <filename>.js');
  console.log('   3. Access in browser or with curl');
}

if (import.meta.main) {
  demoServerExamples();
}
