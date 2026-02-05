
// Bun Native Server - Replaces express
import { serve } from 'bun';
import { file } from 'bun';

export class BunServer {
  private routes: Map<string, Function> = new Map();
  private middleware: Function[] = [];
  
  get(path: string, handler: Function) {
    this.routes.set(`GET ${path}`, handler);
  }
  
  post(path: string, handler: Function) {
    this.routes.set(`POST ${path}`, handler);
  }
  
  use(middleware: Function) {
    this.middleware.push(middleware);
  }
  
  listen(port: number, callback?: Function) {
    const server = serve({
      port,
      async fetch(request) {
        const url = new URL(request.url);
        const key = `${request.method} ${url.pathname}`;
        
        // Run middleware
        for (const mw of this.middleware) {
          const result = await mw(request);
          if (result) return result;
        }
        
        // Route handler
        const handler = this.routes.get(key);
        if (handler) {
          return await handler(request);
        }
        
        // Static files
        try {
          const staticFile = file(`./public${url.pathname}`);
          return new Response(staticFile);
        } catch {
          return new Response('Not Found', { status: 404 });
        }
      }
    });
    
    if (callback) callback();
    return server;
  }
}

export const createServer = () => new BunServer();
