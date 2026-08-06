import { describe, expect, test } from 'bun:test';
import {
  parseLimitChangesArtifact,
  parseTelegramHandshakeArtifact,
  parseTennisCapacityArtifact,
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

    const registeredIds = Object.keys(bookmakers.bookmakers ?? {});
    const bookRefMap = Object.fromEntries(registeredIds.map(id => [`book-${id}`, id]));
    const capacity = parseTennisCapacityArtifact(tennis, { bookRefMap });
    expect(capacity.source).toBe('live');
    expect(capacity.observations.length).toBeGreaterThan(0);
    expect(capacity.unresolvedBookRefs).toContain('book-partner-book-tbd');

    const changes = parseLimitChangesArtifact(limits, {
      treeNodePartnerCodes: {},
      registeredSportsbookIds: registeredIds,
    });
    expect(changes.observations).toEqual([]);
    expect(changes.unresolvedTreeNodeIds.length).toBeGreaterThan(0);
  });
});
