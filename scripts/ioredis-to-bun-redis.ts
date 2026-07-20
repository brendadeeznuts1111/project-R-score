#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/redis — RedisClient
// @see https://bun.com/docs/runtime/file-io — Bun.write
/**
 * Mechanical ioredis → Bun RedisClient conversion for listed files.
 * Usage: bun scripts/ioredis-to-bun-redis.ts [--dry-run]
 */
const DRY = Bun.argv.includes('--dry-run');
const SEE = `// @see https://bun.com/docs/runtime/redis — RedisClient\n`;

const FILES = [
  'packages/p2p/src/customer-notifier.ts',
  'packages/p2p/src/business-continuity.ts',
  'packages/p2p/src/migration-workflow.ts',
  'dashboard/business-registry.ts',
  'dashboard/p2p-dashboard.ts',
  'server/p2p-proxy-bun-native.ts',
  'server/p2p-proxy-server.ts',
  'server/payment-webhook-server.ts',
  'server/payment-webhook-server-v2.ts',
  'server/p2p-proxy-server-with-continuity.ts',
];

function convert(text: string): string {
  let t = text;
  if (!/from ['"]ioredis['"]/.test(t)) return t;

  t = t.replace(/import Redis from ['"]ioredis['"];?\n?/g, `import { RedisClient } from 'bun';\n`);

  t = t.replace(
    /new Redis\(\s*([^,)\n]+)(?:\s*,\s*\{[\s\S]*?\})?\s*\)/g,
    (_m, url) => `new RedisClient(${String(url).trim()})`
  );
  t = t.replace(/new Redis\(\s*\)/g, 'new RedisClient()');

  t = t.replace(
    /(\w+)\.on\(\s*['"]connect['"]\s*,\s*\(\)\s*=>\s*([^\n;]+);?\s*\)/g,
    '$1.onconnect = () => $2'
  );
  t = t.replace(
    /(\w+)\.on\(\s*['"]error['"]\s*,\s*(\w+)\s*=>\s*([^\n;]+);?\s*\)/g,
    '$1.onclose = $2 => $3'
  );

  t = t.replace(/(\w+)\.status\s*===\s*['"]ready['"]/g, '$1.connected');
  t = t.replace(/(\w+)\.status\s*!==\s*['"]ready['"]/g, '!$1.connected');

  t = t.replace(
    /await\s+(\w+)\.set\(\s*([^,]+)\s*,\s*([^,]+)\s*,\s*['"]EX['"]\s*,\s*([^)]+)\)/g,
    'await $1.set($2, $3);\n  await $1.expire($2, $4)'
  );

  // hmset(key, { a: b, c: d }) single-line-ish objects — convert to flat array
  t = t.replace(
    /await\s+(\w+)\.hmset\(\s*([^,]+)\s*,\s*\{([^}]+)\}\s*\)/g,
    (_m, client, key, body) => {
      const pairs: string[] = [];
      for (const part of body.split(',')) {
        const m = part.trim().match(/^(\w+)\s*:\s*(.+)$/);
        if (m) pairs.push(`'${m[1]}'`, m[2].trim());
      }
      if (pairs.length < 2) return _m;
      return `await ${client}.hmset(${key}, [${pairs.join(', ')}])`;
    }
  );

  if (!t.includes('runtime/redis')) {
    if (t.startsWith('#!')) {
      const nl = t.indexOf('\n');
      t = t.slice(0, nl + 1) + SEE + t.slice(nl + 1);
    } else {
      t = SEE + t;
    }
  }
  return t;
}

let n = 0;
for (const f of FILES) {
  if (!(await Bun.file(f).exists())) {
    console.info('skip', f);
    continue;
  }
  const orig = await Bun.file(f).text();
  const next = convert(orig);
  if (next === orig) {
    console.info('unchanged', f);
    continue;
  }
  if (!DRY) await Bun.write(f, next);
  n++;
  console.info(DRY ? 'would' : 'wrote', f);
}
console.info(`done ${n} files`);
