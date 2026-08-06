import { describe, expect, test } from 'bun:test';
import { parseLegacyPartnersOpsProjection } from '../packages/partners/src/index.ts';

const LEGACY_ARTIFACT = new URL('../public/registry/partners-ops.json', import.meta.url);

describe('legacy partners-ops compatibility adapter', () => {
  test('keeps all current partners visible without promoting legacy facts', async () => {
    const input: unknown = await Bun.file(LEGACY_ARTIFACT).json();
    const projection = parseLegacyPartnersOpsProjection(input);
    const generatedAt = (input as Record<string, unknown>).generatedAt;

    expect(projection.sourceSchema).toBe('factorywager.partners-ops.v2');
    expect(projection.connectorSnapshot).toEqual({
      dataStatus: 'ok',
      observedAt: generatedAt,
      inputRef: '/registry/partners-ops.json',
    });
    expect(projection.partners.map(partner => partner.partnerCode)).toEqual([
      'ASH',
      'BIL',
      'NOV',
      'SPEN',
    ]);
    expect(projection.partners.flatMap(partner => partner.outs)).toHaveLength(10);
    expect(projection.partners[0].baseCallSign).toBe('ASH-001');

    for (const partner of projection.partners) {
      expect(partner.source.sourceSystemId).toBe('factorywager-partners-ops');
      expect(partner.source.sourceRecordRef).toContain('#/partners/');
      for (const out of partner.outs) {
        expect(out.observedBookSlug.length).toBeGreaterThan(0);
        expect(out.observedStatus.length).toBeGreaterThan(0);
        expect(out.sourceRecordRef).toContain('/outs/');
      }
    }
    expect(projection.partners[1].outs[0].observedBookSlug).toBe('partner-book-tbd');
  });

  test('drops credentials, payment targets, money, Telegram IDs, and colors by construction', async () => {
    const input: unknown = await Bun.file(LEGACY_ARTIFACT).json();
    const encoded = JSON.stringify(parseLegacyPartnersOpsProjection(input));
    for (const forbidden of [
      'credentials',
      'username',
      'funding',
      'target',
      'maxBet',
      'chatId',
      'topicIds',
      'color',
      'hex',
      'css',
      'lifecycle',
      'operationalPhase',
      'sportsbookId',
      'operationalStatus',
      'fundingStatus',
      'accounting',
      'communication',
      'limits',
    ]) {
      expect(encoded).not.toContain(`"${forbidden}"`);
    }
  });

  test('rejects schema drift, duplicate identities, and cross-partner outs', async () => {
    const input = (await Bun.file(LEGACY_ARTIFACT).json()) as Record<string, unknown>;

    const wrongSchema = structuredClone(input);
    wrongSchema.schema = 'factorywager.partners-ops.v3';
    expect(() => parseLegacyPartnersOpsProjection(wrongSchema)).toThrow(
      'factorywager.partners-ops.v2'
    );

    const failedSourceValidation = structuredClone(input);
    const validation = failedSourceValidation.validation as Record<string, unknown>;
    validation.ok = false;
    expect(() => parseLegacyPartnersOpsProjection(failedSourceValidation)).toThrow(
      'validation.ok must be true'
    );

    const nestedSeat = structuredClone(input);
    const nestedSeatPartners = nestedSeat.partners as Array<Record<string, unknown>>;
    nestedSeatPartners[0].callSign = 'ASH-001-SUB02';
    const nestedProjection = parseLegacyPartnersOpsProjection(nestedSeat);
    expect(nestedProjection.partners[0].baseCallSign).toBeUndefined();
    expect(nestedProjection.partners[0].seatCallSign).toBe('ASH-001-SUB02');

    const duplicatePartner = structuredClone(input);
    const duplicatePartners = duplicatePartner.partners as unknown[];
    duplicatePartners.push(structuredClone(duplicatePartners[0]));
    expect(() => parseLegacyPartnersOpsProjection(duplicatePartner)).toThrow(
      'duplicate PartnerCode'
    );

    const crossPartnerOut = structuredClone(input);
    const crossPartnerRows = crossPartnerOut.partners as Array<Record<string, unknown>>;
    const crossPartnerOuts = crossPartnerRows[0].outs as Array<Record<string, unknown>>;
    crossPartnerOuts[0].id = 'out-BIL-99';
    expect(() => parseLegacyPartnersOpsProjection(crossPartnerOut)).toThrow(
      'must belong to ASH'
    );

    const unknownStatus = structuredClone(input);
    const unknownStatusPartners = unknownStatus.partners as Array<Record<string, unknown>>;
    const unknownStatusOuts = unknownStatusPartners[0].outs as Array<Record<string, unknown>>;
    unknownStatusOuts[0].status = 'mystery';
    expect(() => parseLegacyPartnersOpsProjection(unknownStatus)).toThrow(
      'recognized legacy out status'
    );
  });
});
