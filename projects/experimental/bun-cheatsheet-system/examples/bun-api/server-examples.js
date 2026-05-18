#!/usr/bin/env bun

export async function demoServerExamples() {
  console.info('🌐 Bun Server Examples');
  console.info('='.repeat(40));
  
  // Note: These are server examples that would normally run continuously
  // For demo purposes, we'll show the setup and then stop them
  
  // 1. Basic HTTP server
  console.info('\n1. 🚀 Basic HTTP Server:');
  const basicServerCode = `
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    return new Response('Hello from Bun server!');
  }
});

console.info('Server running on http://localhost:3000');
`;
  console.info('   Code:');
  console.info(basicServerCode);
  
  // 2. Server with routing
  console.info('\n2. 🛣️ Server with Routing:');
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
  console.info('   Code:');
  console.info(routingServerCode);
  
  // 3. WebSocket server
  console.info('\n3. 🔌 WebSocket Server:');
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
      console.info('Received:', message);
      ws.send('Echo: ' + message);
    },
    open(ws) {
      console.info('WebSocket connection opened');
      ws.send('Welcome to WebSocket!');
    },
    close(ws, code, message) {
      console.info('WebSocket closed:', code, message);
    }
  }
});
`;
  console.info('   Code:');
  console.info(websocketServerCode);
  
  // 4. Static file server
  console.info('\n4. 📁 Static File Server:');
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
    } catch {
    console.error('Unhandled error:', error);
  }
    
    return new Response('File not found', { status: 404 });
  }
});
`;
  console.info('   Code:');
  console.info(staticServerCode);
  
  // 5. API server with middleware
  console.info('\n5. 🔧 API Server with Middleware:');
  const apiServerCode = `
// Middleware for logging
const logger = (req) => {
  console.info(\`\\\${new Date().toISOString()} - \\\${req.method} \\\${req.url}\`);
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
  console.info('   Code:');
  console.info(apiServerCode);
  
  // 6. Demonstrate creating a temporary server
  console.info('\n6. 🧪 Temporary Server Demo:');
  try {
    const tempServer = Bun.serve({
      port: 0, // Random available port
      fetch(req) {
        return new Response('Temporary server is working!');
      }
    });
    
    console.info(`   ✅ Temporary server started on port ${tempServer.port}`);
    
    // Test the server
    const response = await fetch(`http://localhost:${tempServer.port}`);
    const text = await response.text();
    console.info(`   📡 Response: ${text}`);
    
    // Stop the server
    tempServer.stop();
    console.info('   🛑 Temporary server stopped');
    
  } catch (error) {
    console.info(`   ❌ Error: ${error.message}`);
  }
  
  console.info('\n✅ Server examples demonstrated!');
  console.info('\n💡 To run these servers:');
  console.info('   1. Copy the code into separate .js files');
  console.info('   2. Run with: bun <filename>.js');
  console.info('   3. Access in browser or with curl');
}

if (import.meta.main) {
  demoServerExamples();
}
