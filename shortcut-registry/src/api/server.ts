/**
 * HTTP API server for ShortcutRegistry
 */

import { ShortcutRegistry } from '../core/registry';
import { seed } from '../database/seeds';
import { logger } from '../utils/logger';
import type { ShortcutConfig, ShortcutProfile } from '../types';

const registry = new ShortcutRegistry();

/**
 * Middleware to handle seed initialization based on headers
 */
async function seedMiddleware(request: Request): Promise<Response | null> {
  const seedHeader = request.headers.get('X-Seed-Data');
  const seedMode = request.headers.get('X-Seed-Mode') || 'default';

  if (seedHeader === 'true' || seedHeader === '1') {
    try {
      logger.info('Seeding database from endpoint header', { mode: seedMode });
      
      const options: {
        clearShortcuts?: boolean;
        includeTestData?: boolean;
        userId?: string;
      } = {};

      if (seedMode === 'clear') {
        options.clearShortcuts = true;
      } else if (seedMode === 'test') {
        options.includeTestData = true;
      } else if (seedMode === 'full') {
        options.clearShortcuts = true;
        options.includeTestData = true;
      }

      const userId = request.headers.get('X-User-Id') || 'default';
      options.userId = userId;

      seed(options);
      
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Database seeded successfully',
          mode: seedMode 
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
            'X-Seeded': 'true'
          }
        }
      );
    } catch (error) {
      logger.error('Seed failed from endpoint', error as Error);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: (error as Error).message 
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }
  }

  return null; // Continue to next handler
}

/**
 * Handle shortcuts endpoints
 */
async function handleShortcuts(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split('/').filter(p => p);

  // GET /api/shortcuts - List all shortcuts
  if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'shortcuts') {
    const shortcuts = registry.getAllShortcuts();
    return new Response(JSON.stringify(shortcuts), {
      headers: {
        'Content-Type': 'application/json',
        'X-Total-Count': shortcuts.length.toString()
      }
    });
  }

  // GET /api/shortcuts/:id - Get specific shortcut
  if (method === 'GET' && pathParts.length === 3 && pathParts[1] === 'shortcuts') {
    const shortcutId = pathParts[2];
    const shortcuts = registry.getAllShortcuts();
    const shortcut = shortcuts.find(s => s.id === shortcutId);
    
    if (!shortcut) {
      return new Response(
        JSON.stringify({ error: 'Shortcut not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify(shortcut), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/shortcuts - Register new shortcut
  if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'shortcuts') {
    try {
      const body = await request.json() as ShortcutConfig;
      registry.register(body);
      
      return new Response(JSON.stringify({ success: true, shortcut: body }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // DELETE /api/shortcuts/:id - Unregister shortcut
  if (method === 'DELETE' && pathParts.length === 3 && pathParts[1] === 'shortcuts') {
    const shortcutId = pathParts[2];
    registry.unregister(shortcutId);
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  return new Response('Not Found', { status: 404 });
}

/**
 * Handle profiles endpoints
 */
async function handleProfiles(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split('/').filter(p => p);

  // GET /api/profiles - List all profiles
  if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'profiles') {
    const profiles = registry.getAllProfiles();
    return new Response(JSON.stringify(profiles), {
      headers: {
        'Content-Type': 'application/json',
        'X-Total-Count': profiles.length.toString()
      }
    });
  }

  // GET /api/profiles/active - Get active profile
  if (method === 'GET' && pathParts.length === 3 && pathParts[1] === 'profiles' && pathParts[2] === 'active') {
    const profile = registry.getActiveProfile();
    return new Response(JSON.stringify(profile), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  // POST /api/profiles - Create new profile
  if (method === 'POST' && pathParts.length === 2 && pathParts[1] === 'profiles') {
    try {
      const body = await request.json() as { name: string; description: string; basedOn?: string };
      const profile = registry.createProfile(body.name, body.description, body.basedOn);
      
      return new Response(JSON.stringify(profile), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  // PUT /api/profiles/:id/active - Set active profile
  if (method === 'PUT' && pathParts.length === 4 && pathParts[1] === 'profiles' && pathParts[3] === 'active') {
    const profileId = pathParts[2];
    try {
      registry.setActiveProfile(profileId);
      return new Response(JSON.stringify({ success: true, profileId }), {
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: (error as Error).message }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response('Not Found', { status: 404 });
}

/**
 * Handle conflicts endpoints
 */
async function handleConflicts(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split('/').filter(p => p);

  // GET /api/conflicts - Detect conflicts
  if (method === 'GET' && pathParts.length === 2 && pathParts[1] === 'conflicts') {
    const profileId = url.searchParams.get('profileId') || undefined;
    const conflicts = registry.detectConflicts(profileId);
    
    return new Response(JSON.stringify(conflicts), {
      headers: {
        'Content-Type': 'application/json',
        'X-Conflict-Count': conflicts.length.toString()
      }
    });
  }

  return new Response('Not Found', { status: 404 });
}

/**
 * Handle usage statistics endpoints
 */
async function handleStats(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const method = request.method;
  const pathParts = url.pathname.split('/').filter(p => p);

  // GET /api/stats/usage - Get usage statistics
  if (method === 'GET' && pathParts.length === 3 && pathParts[1] === 'stats' && pathParts[2] === 'usage') {
    const days = parseInt(url.searchParams.get('days') || '30', 10);
    const stats = registry.getUsageStatistics(days);
    
    return new Response(JSON.stringify(stats), {
      headers: {
        'Content-Type': 'application/json',
        'X-Days': days.toString()
      }
    });
  }

  return new Response('Not Found', { status: 404 });
}

/**
 * Main request handler
 */
export default {
  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const pathParts = url.pathname.split('/').filter(p => p);

    // Check for seed header first
    const seedResponse = await seedMiddleware(request);
    if (seedResponse) {
      return seedResponse;
    }

    // Add seed data to all response headers
    const responseHeaders: Record<string, string> = {
      'X-Seed-Available': 'true',
      'X-Seed-Header': 'X-Seed-Data',
      'X-Seed-Modes': 'default,clear,test,full'
    };

    // Route to appropriate handler
    let response: Response;

    if (pathParts[0] === 'api') {
      if (pathParts[1] === 'shortcuts') {
        response = await handleShortcuts(request);
      } else if (pathParts[1] === 'profiles') {
        response = await handleProfiles(request);
      } else if (pathParts[1] === 'conflicts') {
        response = await handleConflicts(request);
      } else if (pathParts[1] === 'stats') {
        response = await handleStats(request);
      } else {
        response = new Response('Not Found', { status: 404 });
      }
    } else {
      response = new Response('Not Found', { status: 404 });
    }

    // Merge seed headers into response
    const headers = new Headers(response.headers);
    Object.entries(responseHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  },

  port: parseInt(process.env.PORT || '3000', 10)
};
