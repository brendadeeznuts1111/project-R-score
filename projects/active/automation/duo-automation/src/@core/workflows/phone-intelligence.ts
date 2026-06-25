
import { Gate, Path as R2Path } from '../../../utils/empire-patterns.js';
import { PhoneSanitizerV2 as PhoneSanitizer } from '../../filters/phone-sanitizer-v2.js';
import { NumberQualifier } from '../number-intelligence.js';
import { NumberEnricher } from '../number-enricher.js';
import { NumberRouter } from '../number-router.js';
import { ComplianceManager } from '../compliance-manager.js';
import { ProductionR2Manager } from '../storage/production-r2-manager.js';
import { CostAttributor } from '../economics/cost-attributor.js';

export interface WorkflowContext {
  rawPhone: string;
  phone?: any;
  intelligence?: any;
  enriched?: any;
  routing?: any;
  compliance?: any;
}

/**
 * Result object following the Empire Pro standardized format
 */
export interface PhoneIntelligenceResult {
  e164: string;
  isValid: boolean;
  trustScore: number;
  riskFactors: string[];
  suitability: string[];
  provider: string;
  cost: number;
  channel: string;
  compliant: boolean;
  jurisdiction: string;
  metadata: {
    carrier?: string;
    type?: string;
    region?: string;
    city?: string;
    fraudScore?: number;
    enrichment?: any;
  };
  performance: {
    totalMs: number;
    stages: Record<string, number>;
  };
  economics?: {
    cost: number;
    roi: number;
  };
}

export interface WorkflowStage {
  name: string;
  action: (ctx: WorkflowContext) => Promise<any> | any;
  condition?: (ctx: WorkflowContext) => boolean;
  budget: string;
}

export class Workflow {
  private stages: WorkflowStage[];
  private name: string;

  constructor(options: { name: string; stages: WorkflowStage[] }) {
    this.name = options.name;
    this.stages = options.stages;
  }

  async run(ctx: WorkflowContext): Promise<{ context: WorkflowContext; performance: Record<string, number> }> {
    const performanceLog: Record<string, number> = {};
    for (const stage of this.stages) {
      if (stage.condition && !stage.condition(ctx)) continue;
      
      const start = performance.now();
      await stage.action(ctx);
      performanceLog[stage.name] = performance.now() - start;
    }
    return { context: ctx, performance: performanceLog };
  }
}

// Stage 6 Production Manager
const r2Manager = new ProductionR2Manager();

export const phoneIntelligenceWorkflow = new Workflow({
  name: 'phone-intelligence-pipeline',
  stages: [
    // Stage 0: Pre-bench gate
    {
      name: 'setup-check',
      action: () => new Gate('54/56').test(),
      budget: '<10μs'
    },
    
    // Stage 1: Sanitize & validate
    {
      name: 'sanitize',
      action: async (ctx: WorkflowContext) => {
        const sanitizer = new PhoneSanitizer();
        ctx.phone = await sanitizer.exec(ctx.rawPhone);
        if (!ctx.phone.isValid) {
          throw new Error('Invalid phone format');
        }
      },
      budget: '<2ms'
    },
    
    // Stage 2: Qualify & score
    {
      name: 'qualify',
      action: async (ctx: WorkflowContext) => {
        const qualifier = new NumberQualifier();
        ctx.intelligence = await qualifier.qualify(ctx.phone.e164);
      },
      budget: '<0.1ms'
    },
    
    // Stage 3: Enrich if high-value
    {
      name: 'enrich',
      condition: (ctx: WorkflowContext) => ctx.intelligence.trustScore > 70,
      action: async (ctx: WorkflowContext) => {
        const enricher = new NumberEnricher();
        ctx.enriched = await enricher.enrich(ctx.phone.e164, 'DEEP');
      },
      budget: '<500ms' // External API calls
    },
    
    // Stage 4: Route to provider
    {
      name: 'route',
      action: async (ctx: WorkflowContext) => {
        const router = new NumberRouter();
        ctx.routing = await router.route(ctx.phone.e164, 'Empire Pro System Alert', { priority: 'NORMAL', useCase: 'AUTH' });
      },
      budget: '<0.3ms'
    },
    
    // Stage 5: Compliance check
    {
      name: 'compliance',
      action: async (ctx: WorkflowContext) => {
        const compliance = new ComplianceManager();
        ctx.compliance = await compliance.validateCompliance(
          ctx.phone.e164,
          'US'
        );
      },
      budget: '<50ms'
    },
    
    // Stage 6: R2 storage (Production Directory Integration)
    {
      name: 'store',
      action: async (ctx: WorkflowContext) => {
        await r2Manager.saveIntelligence(ctx.phone.e164, ctx);
      },
      budget: '<0.8ms' // UPLOAD_TIME from matrix
    }
  ]
});

/**
 * Fused execution for high-density standardized output
 */
export async function executeIntelligenceWorkflow(rawPhone: string): Promise<PhoneIntelligenceResult> {
  const startTotal = performance.now();
  const { context: ctx, performance: stages } = await phoneIntelligenceWorkflow.run({ rawPhone });
  const totalMs = performance.now() - startTotal;

  const economics = CostAttributor.calculate({
    ipqsHit: !!ctx.phone.fraudScore,
    stored: true
  });

  return {
    e164: ctx.phone.e164,
    isValid: ctx.phone.isValid,
    trustScore: ctx.intelligence.trustScore,
    riskFactors: ctx.intelligence.riskFactors,
    suitability: ctx.intelligence.suitability,
    provider: ctx.routing.provider,
    cost: ctx.routing.cost,
    channel: ctx.routing.channel,
    compliant: ctx.compliance.compliant,
    jurisdiction: ctx.compliance.jurisdiction,
    metadata: {
      carrier: ctx.phone.carrier,
      type: ctx.phone.type,
      region: ctx.phone.region,
      city: ctx.phone.city,
      fraudScore: ctx.phone.fraudScore,
      enrichment: ctx.enriched
    },
    performance: {
      totalMs,
      stages
    },
    economics: {
      cost: economics.total,
      roi: economics.roi
    }
  };
}
