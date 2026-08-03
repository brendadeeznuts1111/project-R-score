#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/sqlite#load-via-es-module-import — bun:sqlite
// scripts/validate-partner-ledger-schema.ts — ledger data-integrity validation.
//
//   bun run validate:ledger
//
// Checks against the ops DB (data/operations.db):
//   1. every ledger `type` has a matching `accounting.<type>` glossary concept
//      (initial_capital is the onboarding seed — exempt);
//   2. every non-null `account_scope` matches
//      ^(global|rail:[a-z]+:.+|book:.+)$ and rail methods resolve to an
//      existing deposit.method.* glossary concept;
//   3. every non-null `proof` URL is from the registry proofs base;
//   4. (partner_code, account_scope, external_id) is unique for non-null
//      external_ids (guarded by the idx_partner_ledger_external index).
//
// Exits 1 with a per-issue list when any check fails.
//
// @see docs/design/settlement-feed.md — account scopes

import type { Database } from 'bun:sqlite';
import { openOperationsDb } from '../lib/operations/db';
import { PROOF_BASE_URL } from '../lib/partner-profile/proof-upload';
import { BOOK_KEY_RE } from '../lib/partner-profile/schema';
import { PARTNER_OPS_GLOSSARY_CONCEPT_IDS } from '../lib/telegram/partner-ops-glossary';

const ACCOUNT_SCOPE_RE = /^(global|rail:[a-z]+:.+|book:.+)$/;
const RAIL_METHOD_RE = /^rail:([a-z]+):/;
/** Onboarding seed — no accounting.* concept exists for it (it is a deposit). */
const TYPE_EXEMPTIONS = new Set(['initial_capital']);

/**
 * Allowed proof URL prefixes (comma-separated). Defaults to the real registry
 * proofs base; override via ALLOWED_PROOF_DOMAINS for staging mirrors.
 */
const ALLOWED_PROOF_DOMAINS = (Bun.env.ALLOWED_PROOF_DOMAINS ?? `${PROOF_BASE_URL}/`)
  .split(',')
  .map(d => d.trim())
  .filter(Boolean);

/** Pure validation over an injected DB — returns a list of issues ([] = valid). */
export function validateLedgerData(db: Database): string[] {
  const issues: string[] = [];
  const glossary = new Set(PARTNER_OPS_GLOSSARY_CONCEPT_IDS);

  // 1. types ↔ accounting.* glossary concepts
  const types = (
    db.query('SELECT DISTINCT type FROM partner_ledger').all() as {
      type: string;
    }[]
  ).map(r => r.type);
  for (const type of types) {
    if (TYPE_EXEMPTIONS.has(type)) continue;
    if (!glossary.has(`accounting.${type}`)) {
      issues.push(`ledger type "${type}" has no accounting.${type} glossary concept`);
    }
  }

  // 2. account scopes
  const scopes = (
    db
      .query('SELECT DISTINCT account_scope FROM partner_ledger WHERE account_scope IS NOT NULL')
      .all() as { account_scope: string }[]
  ).map(r => r.account_scope);
  for (const scope of scopes) {
    if (!ACCOUNT_SCOPE_RE.test(scope)) {
      issues.push(`account_scope "${scope}" does not match ${ACCOUNT_SCOPE_RE}`);
      continue;
    }
    if (scope === 'global') continue;
    const rail = scope.match(RAIL_METHOD_RE);
    if (rail) {
      if (!glossary.has(`deposit.method.${rail[1]}`)) {
        issues.push(`account_scope "${scope}" uses unknown rail method "${rail[1]}"`);
      }
      continue;
    }
    // book:<bookKey>
    const bookKey = scope.slice('book:'.length);
    if (!BOOK_KEY_RE.test(bookKey)) {
      issues.push(`account_scope "${scope}" has invalid book key "${bookKey}"`);
    }
  }

  // 3. proof URLs
  const proofs = (
    db.query('SELECT proof FROM partner_ledger WHERE proof IS NOT NULL').all() as {
      proof: string;
    }[]
  ).map(r => r.proof);
  for (const proof of proofs) {
    if (!ALLOWED_PROOF_DOMAINS.some(prefix => proof.startsWith(prefix))) {
      issues.push(`proof URL "${proof}" is not from ${ALLOWED_PROOF_DOMAINS.join(', ')}`);
    }
  }

  // 4. external_id uniqueness per (partner_code, account_scope)
  const dupes = db
    .query(
      `SELECT partner_code, account_scope, external_id, COUNT(*) n
       FROM partner_ledger
       WHERE external_id IS NOT NULL
       GROUP BY partner_code, account_scope, external_id
       HAVING COUNT(*) > 1`
    )
    .all() as {
    partner_code: string;
    account_scope: string | null;
    external_id: string; // brand-ok — opaque external reference
    n: number;
  }[];
  for (const d of dupes) {
    issues.push(
      `duplicate external_id "${d.external_id}" for ${d.partner_code}@${d.account_scope ?? 'global'} (${d.n} rows)`
    );
  }

  return issues;
}

async function main(): Promise<void> {
  const db = openOperationsDb(
    Bun.env.OPERATIONS_DB_PATH ? { path: Bun.env.OPERATIONS_DB_PATH } : undefined
  ); // migrates partner_ledger to the current schema
  try {
    const issues = validateLedgerData(db);
    if (issues.length === 0) {
      console.log('Ledger schema validation: PASS ✓');
      return;
    }
    console.log(`Ledger schema validation: FAIL ✗ (${issues.length})`);
    for (const issue of issues) console.error(`  ✗ ${issue}`);
    process.exit(1);
  } finally {
    db.close();
  }
}

if (import.meta.main) {
  main().catch(e => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
