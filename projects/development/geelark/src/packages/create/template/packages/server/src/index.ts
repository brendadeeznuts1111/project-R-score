#!/usr/bin/env bun

import { helloCore } from "@dev-hq/core";

const server = Bun.serve({
  port: process.env.PORT ? Number(process.env.PORT) : 3000,
  fetch(req) {
    const url = new URL(req.url);
    if (url.pathname === "/health") return Response.json({ ok: true });
    return new Response(helloCore("world"), { status: 200 });
  },
});

console.log(`@dev-hq/server running at ${server.url.href}`);



