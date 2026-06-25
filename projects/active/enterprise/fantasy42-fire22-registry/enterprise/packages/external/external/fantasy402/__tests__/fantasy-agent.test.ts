import { describe, it, expect } from 'bun:test';
import { FantasyAgent } from '../entities/fantasy-agent';

describe('FantasyAgent', () => {
  it('maps external data without throwing', () => {
    const external = {
      customerID: 'CUST123',
      agentID: 'AGENT456',
      masterAgentID: 'MASTER789',
      office: 'East',
      store: 'Store-1',
      agentType: 'master',
      active: true,
      permissions: {
        canManageLines: true,
        canAddAccounts: true,
        canDeleteBets: false,
        canViewReports: true,
        canAccessBilling: false,
      },
    } as const;

    expect(() => FantasyAgent.fromExternalData(external)).not.toThrow();
  });
});
