// routing-kitchen-sink.ts
import type { BunRequest, Serve } from "bun";

/* ---------- helpers ----------------------------------------------------- */
const log = (...a: any[]) => console.log(`[${new Date().toISOString()}]`, ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- state for hot reload ---------------------------------------- */
let apiVersion = "1.0.0";

/* ---------- route table ------------------------------------------------- */
const routes: any = {
  /* 1. exact > param > wildcard precedence */
  "/users/all": () => new Response("Exact: all users"),
  "/users/:id": (req: any) => Response.json({ userId: req.params.id }),
  "/users/*": () => new Response("Wildcard: users/*"),

  /* 2. type-safe multi-param */
  "/orgs/:orgId/repos/:repoId": (req: any) => {
    const { orgId, repoId } = req.params;
    return Response.json({ orgId, repoId });
  },

  /* 3. static response (zero alloc) */
  "/health": () => new Response("OK", { headers: { "X-Health": "1" } }),
  "/redirect": () => Response.redirect("https://bun.com"),

  /* 4. file vs static */
  "/logo.png": () => new Response("fake logo data", { headers: { "content-type": "image/png" } }),
  "/download.zip": () => new Response(Bun.file("./big.zip")),

  /* 5. async route */
  "/api/version": async () => {
    await sleep(10);
    return Response.json({ version: apiVersion });
  },
};

/* ---------- create server ------------------------------------------------ */
const server = Bun.serve({
  port: 0,
  development: true,
  routes,
  async fetch(req, server) {
    const url = new URL(req.url);

    /* ---- hot reload demo ------------------------------------------------ */
    if (url.pathname === "/reload") {
      apiVersion = "2.0.0";
      server.reload({ routes });
      return Response.json({ reloaded: true, version: apiVersion });
    }

    /* ---- streaming file with Range -------------------------------------- */
    if (url.pathname === "/video.mp4") {
      const file = Bun.file("./big-video.mp4");
      const range = req.headers.get("range");
      if (!range) return new Response(file);
      const [start = 0, end = Infinity] = range
        .split("=")[1]
        .split("-")
        .map(Number);
      return new Response(file.slice(start, end), {
        status: 206,
        headers: { "Content-Range": `bytes ${start}-${end}/${file.size}` },
      });
    }

    /* ---- fallback ------------------------------------------------------- */
    return new Response("Global 404", { status: 404 });
  },
});

/* ---------- CLI output --------------------------------------------------- */
log(`🚀 Server at ${server.url}`);
log("Try:");
log(`  curl ${server.url}users/all`);
log(`  curl ${server.url}users/42`);
log(`  curl ${server.url}users/xyz/abc`);
log(`  curl ${server.url}orgs/bun/repos/bun`);
log(`  curl ${server.url}reload`);
log(`  curl ${server.url}api/version`);
log(`  curl -H "Range: bytes=0-1000000" ${server.url}video.mp4`);
