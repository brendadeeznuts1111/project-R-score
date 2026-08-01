/**
 * URLPattern-based glossary hash router.
 * Extracts board + concept from #glossary:ops.view.account_net
 *
 * The literal colon must be escaped (`\\:`) — a bare `:` starts a named
 * parameter and Bun's URLPattern parser throws "Name position … is less
 * than name start …". Same dialect as components/glossary-ux.js.
 * Trailing `/*` tolerates the canonical trailing-slash board URLs.
 */
const GLOSSARY_PATTERN = new URLPattern({
  pathname: '/portal/:board(glossary|account|partners|partner-history|limits)/*',
  hash: 'glossary\\::concept',
});

const SECTION_PATTERN = new URLPattern({
  pathname: '/portal/:board(glossary|account|partners|partner-history|limits)/*',
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
