#!/usr/bin/env bun
/**
 * Routing Kitchen Sink Demo
 *
 * Exercises ALL Bun.serve() routing features in one file:
 * - Static vs param vs wildcard precedence
 * - Type-safe multi-params
 * - Static response optimization (zero alloc)
 * - File vs static responses
 * - Streaming with Range headers
 * - Hot reload with server.reload()
 * - Async routes
 */

import type { BunRequest, Serve } from "bun";

/* ---------- helpers ----------------------------------------------------- */
const log = (...a: any[]) => console.log(`[${new Date().toISOString()}]`, ...a);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/* ---------- state for hot reload ---------------------------------------- */
let apiVersion = "1.0.0";

/* ---------- prefetch static assets into RAM ---------------------------- */
const logoBytes = await Bun.file("./logo.png").bytes().catch(() => Buffer.from("fake"));
const healthResponse = new Response("OK", { headers: { "X-Health": "1" } });

/* ---------- route table ------------------------------------------------- */
const routes: Serve["routes"] = {
  /* 1. exact > param > wildcard precedence */
  "/users/all": () => new Response("Exact: all users"),
  "/users/:id": (req: BunRequest<"/users/:id">) => Response.json({ userId: req.params.id }),
  "/users/*": () => new Response("Wildcard: users/*"),

  /* 2. type-safe multi-param */
  "/orgs/:orgId/repos/:repoId": (req: BunRequest<"/orgs/:orgId/repos/:repoId">) => {
    const { orgId, repoId } = req.params; // typed
    return Response.json({ orgId, repoId });
  },

  /* 3. static response (zero alloc) */
  "/health": healthResponse,
  "/redirect": Response.redirect("https://bun.sh"),

  /* 4. file vs static */
  "/logo.png": new Response(logoBytes, { headers: { "content-type": "image/png" } }), // static
  "/download.zip": new Response(Bun.file("./big.zip")), // file (streaming, 404, range)

  /* 5. async route */
  "/api/version": async () => {
    await sleep(10); // fake db
    return Response.json({ version: apiVersion });
  },
};

/* ---------- create server ------------------------------------------------ */
const server = Bun.serve({
  port: Number(process.env.PORT || 0),
  development: true,
  routes,
  async fetch(req, server) {
    const url = new URL(req.url);

    /* ---- hot reload demo ------------------------------------------------ */
    if (url.pathname === "/reload") {
      apiVersion = "2.0.0";
      server.reload({ routes }); // push new routes
      return Response.json({ reloaded: true, version: apiVersion });
    }

    /* ---- streaming file with Range -------------------------------------- */
    if (url.pathname === "/video.mp4") {
      const file = Bun.file("./big-video.mp4");
      const range = req.headers.get("range");
      if (!range) return new Response(file); // full file
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
log(`Server at ${server.url}`);
log("Try:");
log(`  curl ${server.url}users/all`);
log(`  curl ${server.url}users/42`);
log(`  curl ${server.url}users/xyz/abc`);
log(`  curl ${server.url}orgs/bun/repos/bun`);
log(`  curl ${server.url}reload`);
log(`  curl ${server.url}api/version`);
log(`  curl -H "Range: bytes=0-1000000" ${server.url}video.mp4`);
