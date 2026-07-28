/**
 * Pure join: ops-summary.limitChanges.node_id ↔ TOC partnerCode / callSign / treeNodeId.
 */
import { describe, expect, test } from 'bun:test';
import {
  joinLimitChangesToPartners,
  partnerJoinKeysFromToc,
  raiseCountForCallSign,
  raiseCountForPartner,
  type LimitChangeJoinRow,
  type TocPartnerJoinKeys,
} from '../../lib/toc-ops/limit-raises-join.ts';

const demoPartners: TocPartnerJoinKeys[] = [
  {
    partnerCode: 'ASH',
    callSigns: ['ASH-001', 'ASH-002'],
    treeNodeIds: ['019f-ash-partner', '019f-ash-001'],
  },
  {
    partnerCode: 'PAT',
    callSigns: ['PAT-001'],
    treeNodeIds: ['019f-pat-partner'],
  },
  {
    partnerCode: 'NOV',
    callSigns: ['NOV-001'],
  },
];

describe('toc-ops · limit-raises-join', () => {
  test('exact partnerCode match (case-insensitive)', () => {
    const changes: LimitChangeJoinRow[] = [
      { node_id: 'ash', direction: 'up' },
      { node_id: 'ASH', direction: 'up' },
      { node_id: 'partner-42', direction: 'up' },
    ];
    const join = joinLimitChangesToPartners(changes, demoPartners);
    expect(join.totalRaises).toBe(3);
    expect(raiseCountForPartner(join, 'ASH')).toBe(2);
    expect(join.hasPerPartner).toBe(true);
    expect(join.unmatchedNodeIds.map(n => n.toLowerCase())).toContain('partner-42');
  });

  test('exact callSign match attributes partner + callSign badges', () => {
    const changes: LimitChangeJoinRow[] = [
      { node_id: 'ASH-001', direction: 'up' },
      { node_id: 'ash-002', direction: 'up' },
      { node_id: 'PAT-001', direction: 'up' },
    ];
    const join = joinLimitChangesToPartners(changes, demoPartners);
    expect(raiseCountForPartner(join, 'ASH')).toBe(2);
    expect(raiseCountForPartner(join, 'PAT')).toBe(1);
    expect(raiseCountForCallSign(join, 'ASH-001')).toBe(1);
    expect(raiseCountForCallSign(join, 'ASH-002')).toBe(1);
    expect(raiseCountForCallSign(join, 'PAT-001')).toBe(1);
  });

  test('identity treeNodeId exact match', () => {
    const changes: LimitChangeJoinRow[] = [
      { node_id: '019f-ash-partner', direction: 'up' },
      { node_id: '019f-ash-001', direction: 'up' },
    ];
    const join = joinLimitChangesToPartners(changes, demoPartners);
    expect(raiseCountForPartner(join, 'ASH')).toBe(2);
    // treeNodeId match is partner-level only (not callSign key)
    expect(raiseCountForCallSign(join, 'ASH-001')).toBe(0);
  });

  test('decreases do not count as raises but still in totalChanges', () => {
    const changes: LimitChangeJoinRow[] = [
      { node_id: 'ASH', direction: 'up' },
      { node_id: 'ASH', direction: 'down' },
      { node_id: 'limit-demo-atlantic', direction: 'down' },
    ];
    const join = joinLimitChangesToPartners(changes, demoPartners);
    expect(join.totalChanges).toBe(3);
    expect(join.totalRaises).toBe(1);
    expect(raiseCountForPartner(join, 'ASH')).toBe(1);
  });

  test('missing direction counts as raise (detectRaises default)', () => {
    const join = joinLimitChangesToPartners(
      [{ node_id: 'NOV' }],
      demoPartners
    );
    expect(join.totalRaises).toBe(1);
    expect(raiseCountForPartner(join, 'NOV')).toBe(1);
  });

  test('ambiguous node_id (same key on two partners) → aggregate only', () => {
    const partners: TocPartnerJoinKeys[] = [
      { partnerCode: 'A', callSigns: ['SHARED'] },
      { partnerCode: 'B', callSigns: ['SHARED'] },
    ];
    const join = joinLimitChangesToPartners(
      [
        { node_id: 'SHARED', direction: 'up' },
        { node_id: 'SHARED', direction: 'up' },
      ],
      partners
    );
    expect(join.totalRaises).toBe(2);
    expect(join.byPartnerCode).toEqual({});
    expect(join.hasPerPartner).toBe(false);
    expect(join.ambiguousNodeIds).toHaveLength(1);
  });

  test('limit-demo-* / partner-42 stay unmatched when TOC codes differ', () => {
    const changes: LimitChangeJoinRow[] = [
      { node_id: 'partner-42', direction: 'up' },
      { node_id: 'limit-demo-worcester-sub', direction: 'up' },
      { node_id: 'limit-demo-atlantic-sub', direction: 'up' },
    ];
    const join = joinLimitChangesToPartners(changes, demoPartners);
    expect(join.totalRaises).toBe(3);
    expect(join.hasPerPartner).toBe(false);
    expect(join.unmatchedNodeIds).toHaveLength(3);
  });

  test('partnerJoinKeysFromToc merges fixture + identity treeNodeIds', () => {
    const keys = partnerJoinKeysFromToc(
      [
        {
          partnerCode: 'ASH',
          accounts: [{ callSign: 'ASH-001' }, { callSign: 'ASH-002' }],
        },
      ],
      {
        partners: [
          {
            partnerCode: 'ASH',
            treeNodeId: 'uuid-partner-ash',
            accounts: [
              { callSign: 'ASH-001', treeNodeId: 'uuid-ash-001' },
              { callSign: 'ASH-099', treeNodeId: 'uuid-ash-099' },
            ],
          },
        ],
      }
    );
    expect(keys).toHaveLength(1);
    expect(keys[0]!.partnerCode).toBe('ASH');
    expect(keys[0]!.callSigns).toEqual(
      expect.arrayContaining(['ASH-001', 'ASH-002', 'ASH-099'])
    );
    expect(keys[0]!.treeNodeIds).toEqual(
      expect.arrayContaining(['uuid-partner-ash', 'uuid-ash-001', 'uuid-ash-099'])
    );

    const join = joinLimitChangesToPartners(
      [
        { node_id: 'uuid-partner-ash', direction: 'up' },
        { node_id: 'ASH-099', direction: 'up' },
      ],
      keys
    );
    expect(raiseCountForPartner(join, 'ASH')).toBe(2);
    expect(raiseCountForCallSign(join, 'ASH-099')).toBe(1);
  });

  test('whitespace-trimmed keys still join', () => {
    const join = joinLimitChangesToPartners(
      [{ node_id: '  PAT-001  ', direction: 'up' }],
      demoPartners
    );
    expect(raiseCountForPartner(join, 'PAT')).toBe(1);
    expect(raiseCountForCallSign(join, 'PAT-001')).toBe(1);
  });
});
