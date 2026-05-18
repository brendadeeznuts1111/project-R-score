// Minimal server to isolate the stack overflow issue
import { DomainContext } from "./contexts/DomainContext";
import * as config from "./config/scope.config";

console.info("Starting minimal server...");

const domainCtx = new DomainContext(config.DOMAIN);

const server = Bun.serve({
  port: 5678,
  routes: {
    "/": () => new Response("Minimal server is running!"),
    "/health": () => new Response(JSON.stringify({ status: "ok" })),
    "/debug-simple": () => {
      return new Response(Bun.inspect(domainCtx, { depth: 2 }));
    }
  }
});

console.info(`🚀 Minimal server running on http://localhost:${server.port}`);
