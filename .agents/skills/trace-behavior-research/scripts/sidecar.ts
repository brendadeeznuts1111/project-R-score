#!/usr/bin/env bun

import { watch } from 'node:fs';

// @see https://bun.com/docs/runtime/http/websockets
// @see https://bun.com/docs/runtime/nodejs-compat#fs
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port
// @see https://bun.com/reference/bun/argv
// @see https://bun.com/docs/runtime/http/server#basic-setup

const args = Bun.argv.slice(2);
const valueOf = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const root = valueOf('--root') ?? './trace-behavior-report';
const port = Number(valueOf('--port') ?? '4174');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid --port');
const clients = new Set<ServerWebSocket<undefined>>();
const server = Bun.serve<undefined>({
  port,
  fetch(request, serverInstance) {
    if (new URL(request.url).pathname !== '/events')
      return new Response('Not found', { status: 404 });
    if (serverInstance.upgrade(request)) return;
    return new Response('WebSocket upgrade required', { status: 426 });
  },
  websocket: {
    open(socket) {
      clients.add(socket);
    },
    close(socket) {
      clients.delete(socket);
    },
    message() {},
  },
});
const watcher = watch(root, { recursive: true }, (eventType, filename) => {
  const event = JSON.stringify({
    eventType,
    filename: filename?.toString() ?? null,
    timestamp: new Date().toISOString(),
  });
  for (const client of clients) client.send(event);
});
process.once('SIGINT', () => {
  watcher.close();
  server.stop();
});
console.log(`Trace sidecar: ${server.url}events`);
