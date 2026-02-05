// Zero import test server

console.log("Starting zero-import server...");
const server = Bun.serve({
  port: 5682,
  async fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;

    try {
      if (path === "/") return new Response("Zero import server works!");
      if (path === "/favicon.ico") return new Response(null, { status: 204 });
      if (path === "/health") return new Response(JSON.stringify({ status: "healthy" }));

      return new Response("Not Found", { status: 404 });
    } catch (err: any) {
      console.error(`Error:`, err);
      return Response.json({ error: err.message }, { status: 500 });
    }
  },
  development: false,
});

console.log(`Zero import server running on http://localhost:${server.port}`);

export default server;
