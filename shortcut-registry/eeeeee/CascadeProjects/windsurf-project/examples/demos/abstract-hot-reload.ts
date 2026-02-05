import type { Serve } from 'bun';

let routeVersion = '1.0.0';

// 1. export default → Bun.serve under the hood
export default {
  unix: '\0my-abstract-socket', // abstract namespace socket
  fetch(req, server) {
    const u = new URL(req.url);
    if (u.pathname === '/reload') {
      routeVersion = '2.0.0';
      server.reload({                // 2. hot route reload
        routes: {
          '/api/version': () => Response.json({ version: routeVersion }),
        },
        fetch(req, server) {
          return new Response('Fallback after reload\n');
        }
      });
      return Response.json({ reloaded: true, version: routeVersion });
    }
    return Response.json({ version: routeVersion });
  },
  routes: {
    '/api/version': () => Response.json({ version: routeVersion }),
  },
} satisfies Serve.Options<undefined>
