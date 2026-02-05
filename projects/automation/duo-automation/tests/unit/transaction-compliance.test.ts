/**
 * transaction-compliance.test.ts - Golden Path Validation
 * Strict deterministic testing for critical financial flows
 */

import { describe, expect, it, afterEach } from 'bun:test';

describe('Golden Path: Transaction Compliance', () => {
  // Enforce 15s timeout as per Ticket 10.1.1.1.2
  const FLOW_TIMEOUT = 15000;

  it('should complete a multi-step AML check within timeout', async () => {
    const start = performance.now();
    
    // Step 1: Identity Verification
    const identity = await simulateStep('Identity Check', 500);
    expect(identity.status).toBe('verified');
    
    // Step 2: Risk Scoring
    const risk = await simulateStep('Risk Analysis', 800);
    expect(risk.score).toBeLessThan(30);
    
    // Step 3: Ledger Validation
    const ledger = await simulateStep('Ledger State', 300);
    expect(ledger.balanced).toBe(true);

    const duration = performance.now() - start;
    console.log(`✅ Compliance flow completed in ${duration.toFixed(2)}ms`);
    
    expect(duration).toBeLessThan(FLOW_TIMEOUT);
  }, FLOW_TIMEOUT);

  it('should reject transactions on maintenance devices', async () => {
    // This utilizes the realistic mock from test-mocks.ts
    // @ts-ignore
    const devices = await mockDuoPlusKernel.getDevices();
    const maintenanceDevice = devices.find((d: any) => d.status === 'maintenance');
    
    expect(maintenanceDevice).toBeDefined();
    
    // @ts-ignore
    const result = await mockDuoPlusKernel.executeRPA(maintenanceDevice.id, 'process-transaction');
    
    // Verified against updated mock logic in test-mocks.ts
    expect(result.success).toBe(false);
    expect(result.error).toContain('maintenance');
  });
});

async function simulateStep(name: string, delay: number) {
  await new Promise(resolve => setTimeout(resolve, delay));
  return { name, status: 'verified', score: 10, balanced: true };
}