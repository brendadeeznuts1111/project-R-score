#!/usr/bin/env bun
// @see https://bun.com/reference/bun/argv — Bun.argv
// @see https://bun.com/docs/runtime/utils#bun-inspect-table-tabulardata-properties-options — Bun.inspect.table
// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling — Content-Type
/**
 * Deep Content-Type matrix:
 *   defaultValue | ourValue | wireValue | expected | status | severity
 *
 *   bun tools/content-type-table.ts
 *   bun tools/content-type-table.ts --json
 *   bun tools/content-type-table.ts --live=http://127.0.0.1:3000
 *   bun tools/content-type-table.ts --fail   # exit 1 if any severity=fail (excl demos)
 */
import {
  contentTypePolicyCatalog,
  contentTypePolicyTableRows,
  probeLiveContentTypes,
  summarizeContentTypeMatrix,
  type ContentTypeDecision,
} from '../lib/http/content-type.ts';
import { jsonOut } from '../lib/console-depth.ts';

function flag(name: string): string | undefined {
  const hit = Bun.argv.find(a => a.startsWith(`--${name}=`));
  return hit?.slice(name.length + 3);
}

const liveBase = flag('live');
const asJson = Bun.argv.includes('--json');
const failMode = Bun.argv.includes('--fail');
const demoIds = new Set([
  'formdata-manual-ct-override',
  'formdata-wrong-ct-override',
  'json-string-missing-ct',
]);

let rows: ContentTypeDecision[] = contentTypePolicyCatalog();

if (liveBase) {
  console.error(`Probing live Content-Types @ ${liveBase} …`);
  const live = await probeLiveContentTypes(liveBase);
  rows = [...rows, ...live];
}

const summary = summarizeContentTypeMatrix(rows);
const table = contentTypePolicyTableRows(rows);

// Intentional demo failures don't count for --fail
const realFails = rows.filter(r => r.severity === 'fail' && !demoIds.has(r.id));

if (asJson) {
  jsonOut({
    summary: {
      total: summary.total,
      pass: summary.pass,
      warn: summary.warn,
      fail: summary.fail,
      byStatus: summary.byStatus,
      realFails: realFails.length,
    },
    rows: table,
  });
} else {
  console.log(
    'Content-Type matrix\n  columns: defaultValue | ourValue | wireValue | expected | status | severity\n'
  );
  const display = table.map(r => ({
    id: r.id.length > 28 ? r.id.slice(0, 25) + '…' : r.id,
    side: r.side,
    default: clip(r.defaultValue, 28),
    our: clip(r.ourValue, 28),
    wire: clip(r.wireValue, 28),
    expected: clip(r.expected, 28),
    status: r.status,
    sev: r.severity,
  }));
  console.log(
    Bun.inspect.table(
      display,
      ['id', 'side', 'default', 'our', 'wire', 'expected', 'status', 'sev'],
      {
        colors: true,
      }
    )
  );
  console.log(
    `\nsummary: total=${summary.total} pass=${summary.pass} warn=${summary.warn} fail=${summary.fail}` +
      ` · byStatus ${JSON.stringify(summary.byStatus)}`
  );
  if (realFails.length) {
    console.log(`real fails (non-demo): ${realFails.map(f => f.id).join(', ')}`);
  } else {
    console.log('real fails: none (demo override/missing rows excluded)');
  }
}

if (failMode && realFails.length > 0) process.exit(1);

function clip(s: string, n: number): string {
  return s.length > n ? s.slice(0, n - 1) + '…' : s;
}
