/**
 * URLPattern-based glossary hash router.
 * Extracts board + concept from #glossary:ops.view.account_net
 */
const GLOSSARY_PATTERN = new URLPattern({
  pathname: '/portal/:board(glossary|account|partners|partner-history|limits)',
  hash: 'glossary:([a-zA-Z0-9_.]+)',
});

const SECTION_PATTERN = new URLPattern({
  pathname: '/portal/:board(glossary|account|partners|partner-history|limits)',
  hash: 'section:([a-zA-Z0-9_.]+)',
});

export function parseGlossaryHash(url) {
  for (const pattern of [GLOSSARY_PATTERN, SECTION_PATTERN]) {
    const result = pattern.exec(url);
    if (result) {
      return {
        board: result.pathname.groups.board,
        concept: result.hash.groups[0],
        type: pattern === GLOSSARY_PATTERN ? 'glossary' : 'section',
      };
    }
  }
  return null;
}
