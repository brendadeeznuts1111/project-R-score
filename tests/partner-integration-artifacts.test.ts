import { describe, expect, test } from 'bun:test';
import {
  LIMIT_RAISE_SPORTSBOOK_ALIASES,
  bookRefMapFromCatalog,
  parseTreeNodePartnerCodesFromLimitRaises,
  parseBookmakerCatalogArtifact,
  parseLimitChangesArtifact,
  parseTelegramHandshakeArtifact,
  parseTennisCapacityArtifact,
  registeredSportsbookIdsFromCatalog,
} from '../packages/partners/src/index.ts';

describe('checked-in partner integration artifacts', () => {
  test('remain parseable without promoting unresolved identities', async () => {
    const registry = `${import.meta.dir}/../public/registry`;
    const [telegram, tennis, limits, bookmakers] = await Promise.all([
      Bun.file(`${registry}/telegram-handshake.json`).json(),
      Bun.file(`${registry}/tennis/partner-contracts.json`).json(),
      Bun.file(`${registry}/limit-raises.json`).json(),
      Bun.file(`${registry}/bookmakers.json`).json(),
    ]);

    const communication = parseTelegramHandshakeArtifact(telegram);
    expect(communication.length).toBeGreaterThan(0);
    expect(communication.every(row => !('inviteLink' in row))).toBe(true);

    const catalog = parseBookmakerCatalogArtifact(bookmakers);
    const bookRefMap = bookRefMapFromCatalog(catalog);
    const capacity = parseTennisCapacityArtifact(tennis, { bookRefMap });
    expect(capacity.source).toBe('live');
    expect(capacity.observations.length).toBeGreaterThan(0);
    expect(capacity.unresolvedBookRefs).toContain('book-partner-book-tbd');

    const treeNodePartnerCodes = parseTreeNodePartnerCodesFromLimitRaises(limits);
    const changes = parseLimitChangesArtifact(limits, {
      treeNodePartnerCodes,
      registeredSportsbookIds: registeredSportsbookIdsFromCatalog(catalog),
      sportsbookAliases: LIMIT_RAISE_SPORTSBOOK_ALIASES,
    });
    // Mapped CODEs produce observations; demo/unmapped nodes remain unresolved.
    expect(changes.observations.length).toBeGreaterThan(0);
    expect(changes.observations.every(row => !row.currentExecutionCeiling)).toBe(true);
    expect(changes.unresolvedTreeNodeIds.length).toBeGreaterThan(0);
    expect(changes.unresolvedTreeNodeIds).toContain('partner-42');
    expect(
      changes.unresolvedTreeNodeIds.every(id => id.startsWith('limit-demo-') || id === 'partner-42')
    ).toBe(true);
  });
});
