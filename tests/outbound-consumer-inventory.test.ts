import { describe, expect, test } from 'bun:test';
import {
  compareOutboundInventory,
  type OutboundConsumerDiscovery,
  type OutboundConsumerManifest,
} from '../lib/http/outbound-consumer-inventory.ts';

const row: OutboundConsumerDiscovery = {
  id: 'lib/example.ts#fetch#abc#1',
  path: 'lib/example.ts',
  line: 1,
  column: 1,
  callee: 'fetch',
  fingerprint: 'abc',
};

describe('outbound consumer inventory', () => {
  test('detects both additions and removals by structural identity', () => {
    const manifest: OutboundConsumerManifest = {
      version: 1,
      rows: [
        {
          ...row,
          id: 'lib/removed.ts#fetch#old#1',
          classification: 'intentional-native-probe',
          owner: 'verification',
          reason: 'explicit live probe',
        },
      ],
    };
    expect(compareOutboundInventory([row], manifest)).toEqual({
      additions: [row.id],
      removals: ['lib/removed.ts#fetch#old#1'],
    });
  });

  test('line movement does not change structural identity', () => {
    const moved = { ...row, line: 99 };
    const manifest: OutboundConsumerManifest = {
      version: 1,
      rows: [
        {
          ...row,
          classification: 'owned-policy-boundary',
          owner: 'network-policy',
          reason: 'central executor',
        },
      ],
    };
    expect(compareOutboundInventory([moved], manifest)).toEqual({ additions: [], removals: [] });
  });
});
