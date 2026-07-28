// @see https://bun.com/docs/test — bun:test
// @see https://bun.com/docs/runtime/sqlite — bun:sqlite
import { afterEach, describe, expect, test } from 'bun:test';
import { Database } from 'bun:sqlite';
import {
  ensureAccountLimitsSchema,
  seedAccountLimitsDemo,
} from '../lib/account-limits-repo.ts';
import { handleLimitRaiseAgentRequest } from '../lib/operations/limit-raise-agent-api.ts';
import { PartnerAnalyticsRepository } from '../lib/operations/partner-analytics-repo.ts';
import { asTreeNodeId, type TreeNodeId } from '../lib/types/branded.ts';

const previousSigningSecret = Bun.env.REPORT_SIGNING_SECRET;

afterEach(() => {
  if (previousSigningSecret === undefined) delete Bun.env.REPORT_SIGNING_SECRET;
  else Bun.env.REPORT_SIGNING_SECRET = previousSigningSecret;
});

describe('limit raise agent API', () => {
  test('requires a scoped node identity', async () => {
    const db = new Database(':memory:');
    const response = handleLimitRaiseAgentRequest(
      new Request('http://local/api/agents/v1/limits/raises'),
      db
    );
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain('node_id');
    db.close();
  });

  test('returns enriched raises with a proofed envelope', async () => {
    Bun.env.REPORT_SIGNING_SECRET = 'test-limit-raise-signing-secret';
    const db = new Database(':memory:');
    ensureAccountLimitsSchema(db);
    const now = Math.floor(Date.now() / 1000);
    const { nodeId } = seedAccountLimitsDemo(db, { nowSec: now, force: true });
    const brandedNodeId = asTreeNodeId(nodeId);
    const raises = new PartnerAnalyticsRepository(db, brandedNodeId).detectRaises(now - 86400);
    const repository = new PartnerAnalyticsRepository(db, brandedNodeId);
    const metrics = repository.deriveContextMetrics(raises[0]!);
    repository.recordRaiseContext(raises[0]!.limit_id, metrics, raises[0]!.increased_at + 1);

    const response = handleLimitRaiseAgentRequest(
      new Request(
        `http://local/api/agents/v1/limits/raises?node_id=${encodeURIComponent(nodeId)}&hours=24`
      ),
      db
    );
    const body = (await response.json()) as {
      node_id: TreeNodeId;
      raises: Array<{
        multi_factor_score: number;
        top_contributing_factors: string[];
        context_proof: { valid: boolean; signed: boolean; hmacValid: boolean | null };
      }>;
      proof: { digest: string; hmac?: string };
      integrity: { hasHmac: boolean };
    };

    expect(response.status).toBe(200);
    expect(body.node_id).toBe(brandedNodeId);
    expect(body.raises.length).toBeGreaterThan(0);
    expect(body.raises[0]!.top_contributing_factors).toHaveLength(3);
    expect(body.raises[0]!.context_proof.valid).toBe(true);
    expect(body.raises[0]!.context_proof.signed).toBe(true);
    expect(body.raises[0]!.context_proof.hmacValid).toBe(true);
    expect(body.proof.digest).toMatch(/^[0-9a-f]{64}$/);
    expect(body.proof.hmac).toMatch(/^[0-9a-f]{64}$/);
    expect(body.integrity.hasHmac).toBe(true);
    db.close();
  });

  test('caps the lookback window at thirty days', async () => {
    const db = new Database(':memory:');
    const response = handleLimitRaiseAgentRequest(
      new Request('http://local/api/agents/v1/limits/raises?node_id=partner-42&hours=9999'),
      db
    );
    expect(response.status).toBe(200);
    expect((await response.json()).lookback_hours).toBe(720);
    db.close();
  });
});
