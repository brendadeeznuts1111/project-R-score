// Test server without development mode

console.log("Starting no-dev server...");
const server = Bun.serve({
  port: 5683,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path === "/") return new Response("No-dev server works!");
      if (path === "/favicon.ico") return new Response(null, { status: 204 });
      if (path === "/health") return new Response(JSON.stringify({ status: "healthy" }));

      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      console.error(`Error:`, err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  },
  // No development mode
});

console.log(`No-dev server running on http://localhost:${server.port}`);

export default server;
