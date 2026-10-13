import { expect, spyOn, test } from 'bun:test';
import { buildLiveIntegrationHealthDocument } from '../../src/api/partner-integration-health-routes';
import { partnerProfileService } from '../../src/zones/partner-profile/partner-profile-service';

test('integration health projects camelCase partner identities and never leaks display names', async () => {
  const fixture: ReturnType<typeof partnerProfileService.listPartners> = [
    'external-42',
    'ASH',
    'opaque',
  ].map((partnerId): ReturnType<typeof partnerProfileService.listPartners>[number] => ({
    partnerId,
    templateId: 'test',
    displayName: 'Private display name',
    email: 'private@example.invalid',
    status: 'active',
    kycStatus: 'verified',
    currentBalance: 0,
    dailyUsed: 0,
    currentLimit: 0,
    opsecScore: 0,
    riskLevel: 'low',
    createdAt: 0,
  }));
  const list = spyOn(partnerProfileService, 'listPartners').mockReturnValue(fixture);
  const gateway = spyOn(partnerProfileService, 'getGateway').mockReturnValue(undefined);
  try {
    const document = await buildLiveIntegrationHealthDocument({ 'external-42': 'BIL' });
    expect(
      document.partners.map(row => ({
        externalPartnerId: row.externalPartnerId,
        partnerCode: row.partnerCode,
        callSign: row.callSign,
        overall: row.overall,
      }))
    ).toEqual([
      { externalPartnerId: 'ASH', partnerCode: 'ASH', callSign: 'ASH-001', overall: 'unknown' },
      {
        externalPartnerId: 'external-42',
        partnerCode: 'BIL',
        callSign: 'BIL-001',
        overall: 'unknown',
      },
      { externalPartnerId: 'opaque', partnerCode: null, callSign: null, overall: 'unknown' },
    ]);
    expect(document.externalIdMap).toEqual({ 'external-42': 'BIL', ASH: 'ASH' });
    expect(
      gateway.mock.calls.every(
        ([partnerId]) =>
          partnerId === 'external-42' || partnerId === 'ASH' || partnerId === 'opaque'
      )
    ).toBe(true);
    expect(document.summary).toEqual({
      partnerCount: 3,
      healthy: 0,
      degraded: 0,
      unhealthy: 0,
      unknown: 3,
    });
    expect(JSON.stringify(document)).not.toContain('Private display name');
    expect(JSON.stringify(document)).not.toContain('private@example.invalid');
  } finally {
    gateway.mockRestore();
    list.mockRestore();
  }
});
