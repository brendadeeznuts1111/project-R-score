#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
// @see https://bun.com/reference/bun/argv — Bun.argv
/**
 * Bake static portal event-code → event.* map from TS glossary SSOT.
 *
 *   bun run partners:event-concepts:bake
 *   bun run partners:event-concepts:check
 *
 * @see lib/telegram/partner-ops-events.ts
 * @see public/portal/components/partner-ops-event-concepts.js
 */
import { joinPath } from '../lib/path-bun.ts';
import {
  PARTNER_OPS_EVENT_CODES,
  PARTNER_OPS_EVENT_GLOSSARY,
} from '../lib/telegram/partner-ops-events.ts';

export const PARTNER_OPS_EVENT_CONCEPTS_REL =
  'public/portal/components/partner-ops-event-concepts.js';

const root = joinPath(import.meta.dir, '..');
const outPath = joinPath(root, PARTNER_OPS_EVENT_CONCEPTS_REL);

/** Render the committed portal module (stable key order = PARTNER_OPS_EVENT_CODES). */
export function renderPartnerOpsEventConceptsModule(): string {
  const entries = PARTNER_OPS_EVENT_CODES.map(
    code => `  ${code}: '${PARTNER_OPS_EVENT_GLOSSARY[code]}',`
  ).join('\n');

  return `/**
 * GENERATED — bun run partners:event-concepts:bake
 * Do not edit by hand. Source: lib/telegram/partner-ops-events.ts (PARTNER_OPS_EVENT_GLOSSARY).
 *
 * Partners-ops ledger code → Kalshi \`event.*\` leaf (static portal SSOT).
 *
 * @see lib/telegram/partner-ops-events.ts
 * @see public/portal/account/glossary-map.js
 */

export const PARTNER_OPS_EVENT_CODE_CONCEPTS = Object.freeze({
${entries}
});

/** Map a partners-ops event code onto its Kalshi event.* leaf when known. */
export function conceptIdForPartnerOpsEventCode(code) {
  const key = String(code || '').trim();
  return PARTNER_OPS_EVENT_CODE_CONCEPTS[key] || 'partner.ops.event';
}
`;
}

export async function bakePartnerOpsEventConcepts(
  options: {
    check?: boolean;
  } = {}
): Promise<{ wrote: boolean; path: string; codes: number }> {
  const next = renderPartnerOpsEventConceptsModule();
  const check = options.check === true;
  const existing = (await Bun.file(outPath).exists()) ? await Bun.file(outPath).text() : '';

  if (check) {
    if (existing !== next) {
      throw new Error(
        `${PARTNER_OPS_EVENT_CONCEPTS_REL} is stale; run bun run partners:event-concepts:bake`
      );
    }
    return {
      wrote: false,
      path: PARTNER_OPS_EVENT_CONCEPTS_REL,
      codes: PARTNER_OPS_EVENT_CODES.length,
    };
  }

  if (existing !== next) {
    await Bun.write(outPath, next);
    return {
      wrote: true,
      path: PARTNER_OPS_EVENT_CONCEPTS_REL,
      codes: PARTNER_OPS_EVENT_CODES.length,
    };
  }
  return {
    wrote: false,
    path: PARTNER_OPS_EVENT_CONCEPTS_REL,
    codes: PARTNER_OPS_EVENT_CODES.length,
  };
}

if (import.meta.main) {
  const check = Bun.argv.includes('--check');
  try {
    const result = await bakePartnerOpsEventConcepts({ check });
    if (check) {
      console.info(
        `✅ partner-ops event concepts current (${result.codes} codes · ${result.path})`
      );
    } else if (result.wrote) {
      console.info(`✅ wrote ${result.path} (${result.codes} codes)`);
    } else {
      console.info(`✅ ${result.path} already current (${result.codes} codes)`);
    }
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}
