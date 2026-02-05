// Bun server demonstrating hot route reloading
let routes = {
  "/api/version": () => Response.json({ version: "1.0.0", status: "initial" }),
  "/api/health": () => Response.json({ status: "ok", uptime: Date.now() }),
};

const server = Bun.serve({
  port: 4008,

  fetch(req) {
    const url = new URL(req.url);
    const handler = routes[url.pathname];
    if (handler) {
      return handler();
    }
    return new Response(`Route not found: ${url.pathname}`, { status: 404 });
  }
});

console.log("Server started with initial routes. Version: 1.0.0");

// Simulate hot reloading after 3 seconds
setTimeout(() => {
  console.log("Hot reloading routes...");

  routes = {
    "/api/version": () => Response.json({ version: "2.0.0", status: "updated" }),
    "/api/health": () => Response.json({ status: "ok", uptime: Date.now() }),
    "/api/new-feature": () => Response.json({ feature: "new", available: true }),
  };

  console.log("Routes reloaded! Version: 2.0.0");
}, 3000);

export default server;