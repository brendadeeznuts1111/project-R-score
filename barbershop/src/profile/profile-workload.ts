#!/usr/bin/env bun

function arg(name: string, fallback: string) {
  const key = `--${name}=`;
  const found = Bun.argv.find((a) => a.startsWith(key));
  return found ? found.slice(key.length) : fallback;
}

const target = arg('url', 'http://localhost:3001/ops/status');
const iterations = Number(arg('iterations', '250'));
const method = arg('method', 'GET').toUpperCase();

const started = performance.now();
let ok = 0;
let fail = 0;

for (let i = 0; i < iterations; i++) {
  try {
    const res = await fetch(target, { method, headers: { Accept: 'application/json' } });
    await res.text();
    if (res.ok) ok += 1;
    else fail += 1;
  } catch {
    fail += 1;
  }
}

const durationMs = Math.round((performance.now() - started) * 1000) / 1000;
console.log(`[profile-workload] target=${target}`);
console.log(`[profile-workload] method=${method} iterations=${iterations} ok=${ok} fail=${fail} durationMs=${durationMs}`);
