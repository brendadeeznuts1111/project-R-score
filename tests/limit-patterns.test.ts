// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { describe, expect, test } from 'bun:test';
import { handleLimitRaiseAgentRequest } from '../lib/operations/limit-raise-agent-api.ts';
import {
  queryLimitPatternSnapshot,
  scopeLimitPatternSnapshot,
  seedLimitPatternDemo,
} from '../lib/operations/limit-patterns.ts';
import { openOperationsDb } from '../lib/operations/db.ts';
import { asTreeNodeId } from '../lib/types/branded.ts';

describe('connected limit patterns', () => {
  test('seeds multiple partners, downlines, books, states, and ZIP prefixes', () => {
    const db = openOperationsDb({ path: ':memory:' });
    const seeded = seedLimitPatternDemo(db, {
      force: true,
      nowSec: Math.floor(Date.now() / 1000),
    });
    const patterns = queryLimitPatternSnapshot(db, 48);

    expect(seeded.seeded).toBe(true);
    expect(seeded.partners).toBe(3);
    expect(seeded.downlineNodes).toBe(5);
    expect(seeded.raises).toBeGreaterThanOrEqual(8);
    expect(patterns.partners).toBe(3);
    expect(patterns.nodes).toBe(8);
    expect(patterns.downlineNodes).toBe(5);
    expect(patterns.books.map(row => row.key).sort()).toEqual([
      'betmgm',
      'caesars',
      'draftkings',
      'fanduel',
      'hardrock',
    ]);
    expect(patterns.states.map(row => row.key).sort()).toEqual(['MA', 'NJ']);
    expect(patterns.zips.map(row => row.key).sort()).toEqual([
      '016',
      '021',
      '071',
      '073',
      '084',
    ]);
    expect(patterns.audit.hierarchyLinked).toBe(8);
    expect(patterns.audit.geoLinked).toBe(8);
    expect(patterns.audit.licensed).toBe(8);
    const profileBindings = db
      .query(
        `SELECT COUNT(*) AS n
         FROM partner_profile_bindings
         WHERE tree_node_id LIKE 'limit-demo-%'`
      )
      .get() as { n: number };
    expect(profileBindings.n).toBe(patterns.nodes);
    db.close();
  });

  test('scopes a partner pattern to its downline and exposes it through the agent API', async () => {
    const db = openOperationsDb({ path: ':memory:' });
    seedLimitPatternDemo(db, { force: true });
    const partnerNodeId = asTreeNodeId('limit-demo-atlantic');
    const scoped = scopeLimitPatternSnapshot(
      queryLimitPatternSnapshot(db, 48),
      partnerNodeId
    );

    expect(scoped.nodes).toBe(3);
    expect(scoped.downlineNodes).toBe(2);
    expect(scoped.nodePatterns.every(row => row.partner_node_id === partnerNodeId)).toBe(true);

    const response = handleLimitRaiseAgentRequest(
      new Request(
        `http://local/api/agents/v1/limits/raises?node_id=${partnerNodeId}&hours=48`
      ),
      db
    );
    const body = (await response.json()) as {
      patterns: {
        nodes: number;
        downlineNodes: number;
        books: Array<{ key: string }>;
        audit: { hierarchyLinked: number; geoLinked: number };
      };
      proof: { digest: string };
    };
    expect(response.status).toBe(200);
    expect(body.patterns.nodes).toBe(3);
    expect(body.patterns.downlineNodes).toBe(2);
    expect(body.patterns.books.length).toBeGreaterThanOrEqual(2);
    expect(body.patterns.audit.hierarchyLinked).toBe(3);
    expect(body.patterns.audit.geoLinked).toBe(3);
    expect(body.proof.digest).toMatch(/^[0-9a-f]{64}$/);
    db.close();
  });
});
