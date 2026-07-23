#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-env — Bun.env
// @see https://bun.com/docs/runtime/utils — Bun.inspect.table
/**
 * Print secret-safe env checklist as a table.
 *
 *   bun run env:check
 *   bun tools/env-check.ts --json
 *   bun tools/env-check.ts --strict   # exit 1 if required missing
 */
import { checkEnv } from '../lib/env-check.ts';

const args = Bun.argv.slice(2);
const json = args.includes('--json');
const strict = args.includes('--strict');

// Optional: load ~/.reasonix/.env into process without printing
if (args.includes('--reasonix') || args.includes('--load-reasonix')) {
  try {
    const p = `${Bun.env.HOME}/.reasonix/.env`;
    const text = await Bun.file(p).text();
    for (const line of text.split('\n')) {
      const t = line.trim();
      if (!t || t.startsWith('#')) continue;
      const i = t.indexOf('=');
      if (i < 1) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith('"') && v.endsWith('"')) ||
        (v.startsWith("'") && v.endsWith("'"))
      ) {
        v = v.slice(1, -1);
      }
      if (!Bun.env[k]) Bun.env[k] = v;
    }
    console.error(`Loaded ${p} (missing keys only filled)`);
  } catch (e) {
    console.error('Could not load ~/.reasonix/.env:', e instanceof Error ? e.message : e);
  }
}

const report = checkEnv();

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log('Environment checklist (secrets redacted)');
  console.log(
    `${report.summary.ok}/${report.summary.total} ok · missing ${report.summary.missing} · placeholder ${report.summary.placeholder} · required gaps ${report.summary.requiredMissing}`
  );
  console.log(
    Bun.inspect.table(report.table, ['Key', 'Group', 'Severity', 'Status', 'Detail'], {
      colors: true,
    })
  );
  if (report.summary.requiredMissing > 0) {
    const keys = report.rows.filter(r => r.severity === 'required' && !r.ok).map(r => r.key);
    console.log('\nRequired missing:', keys.join(', '));
    console.log('Tip: bun run env:check --reasonix   # merge ~/.reasonix/.env');
  }
}

if (strict && report.summary.requiredMissing > 0) process.exit(1);
