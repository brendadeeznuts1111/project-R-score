#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-wrapansi — Bun.wrapAnsi
// tools/cookie-scanner.ts — Cookie scanner and R2 storage compressor

// @see https://bun.com/docs/runtime/utils#bun-randomuuidv7 — Bun.randomUUIDv7
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
const args = process.argv.slice(2);

// Get positional argument with fallback
const getPos = (i, fallback = '') => args[i] ?? fallback;

const projectId = getPos(0, Bun.env.PROJECT_ID || 'default');
const sessionId = getPos(1, Bun.randomUUIDv7());

// Compress cookies for R2 storage
const cookies = { projectId, sessionId };
const compressed = Bun.zstdCompressSync(JSON.stringify(cookies));
const prefixed = Buffer.concat([Buffer.from([0x01]), compressed]);

// Display with wrapping
const wrap = Bun.wrapAnsi;
const msg = `🆔 ${projectId} 📊 ${sessionId} 📦 ${prefixed.length}B R2: ${Bun.env.R2_BUCKET}`;
console.info(wrap(msg, 80));

// Summary
console.info({
  projectId,
  sessionId,
  bundle: `${prefixed.length}B`,
  bucket: Bun.env.R2_BUCKET,
  status: '✅ READY',
});
