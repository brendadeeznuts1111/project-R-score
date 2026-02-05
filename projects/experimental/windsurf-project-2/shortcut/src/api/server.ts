import { ShortcutRegistry } from '../core/registry';
import { detectPlatform } from '../utils/platform';

interface ServerConfig {
  port: number;
  hostname: string;
  enableWebSocket: boolean;
}

export function createServer(registry: ShortcutRegistry, config: ServerConfig) {
  const platform = detectPlatform();
  
  const server = Bun.serve({
    port: config.port,
    hostname: config.hostname,
    development: true,
    
    async fetch(req) {
      const url = new URL(req.url);
      const path = url.pathname;
      const method = req.method;
      
      // CORS headers
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      };
      
      // Handle CORS preflight
      if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }
      
      try {
        // API routes
        if (path.startsWith('/api/')) {
          return handleApiRoute(path, method, req, registry, corsHeaders);
        }
        
        // Static files and frontend
        if (path === '/' || path === '/index.html') {
          const html = await Bun.file('./src/index.html').text();
          return new Response(html, {
            headers: { 'Content-Type': 'text/html', ...corsHeaders }
          });
        }
        
        // Serve app files
        if (path === '/app.js') {
          const js = await Bun.file('./src/app.js').text();
          return new Response(js, {
            headers: { 'Content-Type': 'application/javascript', ...corsHeaders }
          });
        }
        
        if (path === '/app.css') {
          const css = await Bun.file('./src/app.css').text();
          return new Response(css, {
            headers: { 'Content-Type': 'text/css', ...corsHeaders }
          });
        }
        
        if (path === '/logo.svg') {
          const svg = await Bun.file('./src/logo.svg').text();
          return new Response(svg, {
            headers: { 'Content-Type': 'image/svg+xml', ...corsHeaders }
          });
        }
        
        // 404
        return new Response('Not Found', { 
          status: 404,
          headers: corsHeaders 
        });
        
      } catch (error) {
        console.error('Server error:', error);
        return new Response(JSON.stringify({ error: 'Internal server error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    },
    
    websocket: {
      message(ws, message) {
        // Handle WebSocket messages for real-time updates
        handleWebSocketMessage(ws, message, registry);
      },
      open(ws) {
        console.log('WebSocket connection opened');
        // Send initial state
        ws.send(JSON.stringify({
          type: 'initial_state',
          data: {
            shortcuts: Array.from(registry['shortcuts'].values()),
            profiles: Array.from(registry['profiles'].values()),
            activeProfile: registry.getActiveProfile()
          }
        }));
      },
      close(ws) {
        console.log('WebSocket connection closed');
      }
    },
    
    error(error) {
      console.error('Server error:', error);
    }
  });
  
  // Set up event listeners for real-time updates
  if (config.enableWebSocket) {
    registry.on('shortcut:registered', (data) => {
      broadcastToClients({
        type: 'shortcut_registered',
        data
      });
    });
    
    registry.on('shortcut:unregistered', (shortcutId) => {
      broadcastToClients({
        type: 'shortcut_unregistered',
        data: { shortcutId }
      });
    });
    
    registry.on('profile:changed', (data) => {
      broadcastToClients({
        type: 'profile_changed',
        data
      });
    });
  }
  
  const clients = new Set<any>();
  
  function broadcastToClients(message: any) {
    const messageStr = JSON.stringify(message);
    for (const client of clients) {
      client.send(messageStr);
    }
  }
  
  function handleWebSocketMessage(ws: any, message: string | Buffer, registry: ShortcutRegistry) {
    try {
      const data = JSON.parse(message.toString());
      
      switch (data.type) {
        case 'subscribe':
          clients.add(ws);
          ws.send(JSON.stringify({ type: 'subscribed' }));
          break;
          
        case 'unsubscribe':
          clients.delete(ws);
          break;
          
        case 'trigger_shortcut':
          const success = registry.trigger(data.shortcutId, data.context);
          ws.send(JSON.stringify({
            type: 'shortcut_triggered',
            data: { success, shortcutId: data.shortcutId }
          }));
          break;
          
        default:
          ws.send(JSON.stringify({
            type: 'error',
            data: { message: 'Unknown message type' }
          }));
      }
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'error',
        data: { message: 'Invalid message format' }
      }));
    }
  }
  
  return {
    stop: () => {
      server.stop();
    },
    getPort: () => server.port,
    getHostname: () => server.hostname
  };
}

async function handleApiRoute(
  path: string, 
  method: string, 
  req: Request, 
  registry: ShortcutRegistry,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const segments = path.split('/').filter(Boolean);
  
  // /api/shortcuts
  if (segments[1] === 'shortcuts') {
    return handleShortcutsApi(segments.slice(2), method, req, registry, corsHeaders);
  }
  
  // /api/profiles
  if (segments[1] === 'profiles') {
    return handleProfilesApi(segments.slice(2), method, req, registry, corsHeaders);
  }
  
  // /api/analytics
  if (segments[1] === 'analytics') {
    return handleAnalyticsApi(segments.slice(2), method, req, registry, corsHeaders);
  }
  
  // /api/system
  if (segments[1] === 'system') {
    return handleSystemApi(segments.slice(2), method, req, registry, corsHeaders);
  }
  
  return new Response('API endpoint not found', { 
    status: 404,
    headers: corsHeaders 
  });
}

async function handleShortcutsApi(
  segments: string[], 
  method: string, 
  req: Request, 
  registry: ShortcutRegistry,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const shortcuts = Array.from(registry['shortcuts'].values());
  
  if (method === 'GET') {
    // GET /api/shortcuts
    if (segments.length === 0) {
      return new Response(JSON.stringify(shortcuts), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    // GET /api/shortcuts/:id
    const shortcut = shortcuts.find(s => s.id === segments[0]);
    if (shortcut) {
      return new Response(JSON.stringify(shortcut), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    return new Response('Shortcut not found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
  
  if (method === 'POST') {
    const body = await req.json();
    registry.register(body);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  if (method === 'PUT') {
    const body = await req.json();
    registry.register(body); // Register will update existing
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  if (method === 'DELETE') {
    const shortcutId = segments[0];
    if (shortcutId) {
      registry.unregister(shortcutId);
      return new Response(JSON.stringify({ success: true }), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    return new Response('Shortcut ID required', { 
      status: 400,
      headers: corsHeaders 
    });
  }
  
  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders 
  });
}

async function handleProfilesApi(
  segments: string[], 
  method: string, 
  req: Request, 
  registry: ShortcutRegistry,
  corsHeaders: Record<string, string>
): Promise<Response> {
  const profiles = Array.from(registry['profiles'].values());
  
  if (method === 'GET') {
    if (segments.length === 0) {
      return new Response(JSON.stringify(profiles), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    const profile = profiles.find(p => p.id === segments[0]);
    if (profile) {
      return new Response(JSON.stringify(profile), {
        headers: { 'Content-Type': 'application/json', ...corsHeaders }
      });
    }
    
    return new Response('Profile not found', { 
      status: 404,
      headers: corsHeaders 
    });
  }
  
  if (method === 'POST') {
    const body = await req.json();
    const newProfile = registry.createProfile(body.name, body.description, body.basedOn);
    
    return new Response(JSON.stringify(newProfile), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders 
  });
}

async function handleAnalyticsApi(
  segments: string[], 
  method: string, 
  req: Request, 
  registry: ShortcutRegistry,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (method === 'GET') {
    const url = new URL(req.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    
    // Get usage stats from database
    const stats = registry.getDbUtils().getUsageStats(days);
    
    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders 
  });
}

async function handleSystemApi(
  segments: string[], 
  method: string, 
  req: Request, 
  registry: ShortcutRegistry,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (method === 'GET') {
    const platform = detectPlatform();
    const conflicts = registry.detectConflicts();
    
    return new Response(JSON.stringify({
      platform,
      activeProfile: registry.getActiveProfile(),
      shortcutCount: registry.getShortcutCount(),
      conflicts,
      uptime: process.uptime()
    }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders }
    });
  }
  
  if (method === 'POST') {
    const body = await req.json();
    
    switch (body.action) {
      case 'set_active_profile':
        registry.setActiveProfile(body.profileId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
      case 'reload':
        await registry.loadFromDatabase();
        return new Response(JSON.stringify({ success: true }), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
        
      default:
        return new Response('Unknown action', { 
          status: 400,
          headers: corsHeaders 
        });
    }
  }
  
  return new Response('Method not allowed', { 
    status: 405,
    headers: corsHeaders 
  });
}

// Handle WebSocket messages for real-time updates
function handleWebSocketMessage(ws: any, message: any, registry: ShortcutRegistry) {
  try {
    const data = JSON.parse(message.toString());
    
    switch (data.type) {
      case 'subscribe':
        // Client is subscribing to updates - already handled in open event
        break;
        
      case 'ping':
        ws.send(JSON.stringify({ type: 'pong' }));
        break;
        
      default:
        console.log('Unknown WebSocket message type:', data.type);
    }
  } catch (error) {
    console.error('Error handling WebSocket message:', error);
  }
}
