
import { describe, it, expect } from 'bun:test';
import { NumberAutomationPipeline } from '../../src/core/automation-pipeline.js';

describe('NumberAutomationPipeline', () => {
  const pipeline = new NumberAutomationPipeline();

  it('should process a valid mobile number with full enrichment', async () => {
    const result = await pipeline.process('+12125551234', {
      enrich: true
    });

    expect(result.isValid).toBe(true);
    expect(result.trustScore).toBeGreaterThan(50);
    
    expect(result.compliance.compliant).toBe(true);
    
    expect(result.enriched).toBeDefined();
    expect(result.enriched.fullName).toBe('John Doe');
    
    expect(result.provider).toBeDefined();
  });

  it('should block routing for invalid input', async () => {
    const result = await pipeline.process('invalid-phone');

    expect(result.isValid).toBe(false);
    expect(result.provider).toBeUndefined();
  });
});
