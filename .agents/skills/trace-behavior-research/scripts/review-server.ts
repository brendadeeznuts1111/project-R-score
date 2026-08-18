#!/usr/bin/env bun

import { appendFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';

// @see https://bun.com/docs/runtime/http/server#basic-setup
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write
// @see https://bun.com/docs/runtime/http/server#configuring-a-default-port
// @see https://bun.com/reference/bun/argv

const args = Bun.argv.slice(2);
const valueOf = (name: string): string | undefined => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const reportDir = valueOf('--report-dir') ?? './trace-behavior-report';
const port = Number(valueOf('--port') ?? '4173');
const actionsPath = valueOf('--actions') ?? join(reportDir, 'review-actions.jsonl');
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error('Invalid --port');

const dashboard = `<!doctype html><meta charset="utf-8"><title>Trace skill review</title><style>body{font:15px system-ui;max-width:960px;margin:2rem auto;padding:0 1rem}button{margin:.25rem;padding:.4rem .7rem}article{border:1px solid #ddd;border-radius:8px;padding:1rem;margin:1rem 0}</style><h1>Trace skill review</h1><p>Actions are recorded for human review. No skill is promoted automatically.</p><main id="app">Loading…</main><script>fetch('/api/report').then(r=>r.json()).then(report=>{document.querySelector('#app').innerHTML=report.clusters.map(c=>'<article><h2>'+c.label+'</h2><p>'+c.count+' observations · '+Math.round(c.confidence*100)+'% confidence · '+c.promotion+'</p><button data-action="approve" data-name="'+c.label+'">Record approve</button><button data-action="reject" data-name="'+c.label+'">Record reject</button></article>').join('');document.querySelectorAll('button').forEach(b=>b.onclick=()=>fetch('/api/review',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({action:b.dataset.action,name:b.dataset.name})}).then(()=>b.textContent='Recorded'))})</script>`;
const jsonResponse = (value: unknown, status = 200): Response =>
  Response.json(value, { status, headers: { 'cache-control': 'no-store' } });
const server = Bun.serve({
  port,
  async fetch(request) {
    const url = new URL(request.url);
    if (request.method === 'GET' && url.pathname === '/')
      return new Response(dashboard, { headers: { 'content-type': 'text/html; charset=utf-8' } });
    if (request.method === 'GET' && url.pathname === '/api/report') {
      const report = await Bun.file(join(reportDir, 'behavior-research.json')).json();
      return jsonResponse(report);
    }
    if (request.method === 'POST' && url.pathname === '/api/review') {
      const body = await request.json();
      if (
        typeof body !== 'object' ||
        body === null ||
        !('action' in body) ||
        !('name' in body) ||
        !['approve', 'reject'].includes(String(body.action)) ||
        typeof body.name !== 'string' ||
        !/^[a-z0-9-]+$/.test(body.name)
      )
        return jsonResponse({ error: 'Invalid review action' }, 400);
      await mkdir(reportDir, { recursive: true });
      await appendFile(
        actionsPath,
        `${JSON.stringify({ action: body.action, name: body.name, timestamp: new Date().toISOString() })}\n`
      );
      return jsonResponse({ recorded: true });
    }
    return new Response('Not found', { status: 404 });
  },
});
console.log(`Trace review dashboard: ${server.url}`);
