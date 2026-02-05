#!/usr/bin/env bun

// Bun Server Lifecycle Methods Demo
// Demonstrates all server lifecycle methods in one comprehensive example

const lifecycleServer = Bun.serve({
  port: 0,
  development: true,
  async fetch(req: Request, server: any) {
    const url = new URL(req.url);
    switch (url.pathname) {

      case '/ip': {
        const ip = server.requestIP(req);
        return Response.json(ip || { error: 'no ip' });
      }

      case '/slow': {
        server.timeout(req, 2);          // 2 s idle timeout
        await Bun.sleep(3_000);          // longer than timeout
        return new Response('you should not see this');
      }

      case '/reload': {
        server.reload({
          fetch(req: Request, server: any) {
            return new Response('handler swapped via reload()\n');
          }
        });
        return new Response('reload scheduled\n');
      }

      case '/stop': {
        const force = url.searchParams.has('force');
        await server.stop(force);        // graceful or force
        return Response.json({ stopped: true, force });
      }

      default:
        return new Response('OK\n');
    }
  }
});

console.log(`Server ${lifecycleServer.id} at ${lifecycleServer.url}`);
console.log('Try:');
console.log('  curl ' + lifecycleServer.url + 'ip');
console.log('  curl ' + lifecycleServer.url + 'slow        # will timeout');
console.log('  curl ' + lifecycleServer.url + 'reload');
console.log('  curl ' + lifecycleServer.url + 'stop?force  # kills server');

/* demo ref/unref */
lifecycleServer.unref();               // allow exit if nothing else running
setTimeout(() => lifecycleServer.ref(), 5_000); // restore keep-alive after 5 s

// Keep server alive for testing
setTimeout(() => {
  console.log('Server demo completed - shutting down...');
  lifecycleServer.stop(true);
}, 30000);
