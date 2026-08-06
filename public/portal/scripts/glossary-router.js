/**
 * Browser deep-link parser for glossary/section hashes.
 *
 * Semantic SSOT: `lib/portal/url-planes.ts` → `parsePortalGlossaryUrl`
 * + `PORTAL_GLOSSARY_BOARD_PATHNAME_INIT` / section / glossary hash inits.
 *
 * This file is the static-Pages mirror (cannot import `lib/` on Pages).
 * Drift-guard: `tests/glossary-router.test.ts` asserts parity with the SSOT.
 *
 * The literal colon must be escaped (`\\:`) — a bare `:` starts a named
 * parameter and Bun's URLPattern parser throws. Trailing `/*` tolerates
 * canonical trailing-slash board URLs.
 *
 * @see lib/portal/url-planes.ts
 * @see https://bun.com/blog/bun-v1.3.4#urlpattern-api
 * @see https://bun.com/blog/bun-v1.3.12#urlpattern-is-up-to-2-3x-faster
 */

/** Keep in lockstep with PORTAL_GLOSSARY_BOARD_PATHNAME_INIT.pathname */
const BOARD_PATHNAME = '/portal/:board(glossary|account|partners|partner-history|limits)/*';

const GLOSSARY_PATTERN = new URLPattern({
  pathname: BOARD_PATHNAME,
  hash: 'glossary\\::concept',
});

const SECTION_PATTERN = new URLPattern({
  pathname: BOARD_PATHNAME,
  hash: 'section\\::section',
});

export function parseGlossaryHash(url) {
  const glossary = GLOSSARY_PATTERN.exec(url);
  if (glossary) {
    return {
      board: glossary.pathname.groups.board,
      concept: glossary.hash.groups.concept,
      type: 'glossary',
    };
  }
  const section = SECTION_PATTERN.exec(url);
  if (section) {
    return {
      board: section.pathname.groups.board,
      concept: section.hash.groups.section,
      type: 'section',
    };
  }
  return null;
}
