#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/utils#bun-inspect-table — Bun.inspect.table
// @see https://bun.com/docs/runtime/networking/fetch#content-type-handling — Content-Type
/**
 * Print Content-Type policy table:
 *   defaultValue | ourValue | expected | status
 *
 *   bun tools/content-type-table.ts
 *   bun tools/content-type-table.ts --json
 */
import { contentTypePolicyCatalog, contentTypePolicyTableRows } from '../lib/http/content-type.ts';

const rows = contentTypePolicyTableRows();
const catalog = contentTypePolicyCatalog();
const fail = catalog.filter(r => r.status !== 'ok');

if (Bun.argv.includes('--json')) {
  console.log(JSON.stringify({ rows, fail: fail.length }, null, 2));
} else {
  console.log('Content-Type policy (defaultValue | ourValue | expected | status)\n');
  console.log(
    Bun.inspect.table(
      rows.map(r => ({
        id: r.id,
        side: r.side,
        defaultValue:
          r.defaultValue.length > 40 ? r.defaultValue.slice(0, 37) + '…' : r.defaultValue,
        ourValue: r.ourValue.length > 40 ? r.ourValue.slice(0, 37) + '…' : r.ourValue,
        expected: r.expected.length > 40 ? r.expected.slice(0, 37) + '…' : r.expected,
        status: r.status,
      })),
      ['id', 'side', 'defaultValue', 'ourValue', 'expected', 'status'],
      { colors: true }
    )
  );
  console.log(
    fail.length === 0
      ? `\n✅ ${rows.length} rows · all ok`
      : `\n⚠️ ${fail.length}/${rows.length} non-ok (override/mismatch rows are intentional demos)`
  );
}
