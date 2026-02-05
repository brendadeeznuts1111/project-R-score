
import { Pattern } from '../../../utils/empire-patterns.js';
import { NumberPredictor } from '../number-predictor.js';
import { NumberHealthMonitor } from './number-health-monitor.js';
import { ComplianceManager } from '../compliance-manager.js';
import { ProductionR2Manager } from '../storage/production-r2-manager.js';

export interface Campaign {
  id: string;
  type: string;
  supportsRCS?: boolean;
  hasMedia?: boolean;
}

export interface RoutingDecision {
  phone: string;
  send: boolean;
  channel: string;
  provider: string;
  cost: number;
  expectedRoi: number;
  risk: number;
  reason?: string;
}

/**
 * §Workflow:99 - Predictive Campaign Router
 * Predictive routing based on value and risk factors.
 */
export class PredictiveCampaignRouter {
  private predictor: NumberPredictor;
  private monitor: NumberHealthMonitor;
  private compliance: ComplianceManager;
  private r2Manager: ProductionR2Manager;

  constructor(config: { campaignId: string }) {
    this.predictor = new NumberPredictor();
    this.monitor = new NumberHealthMonitor({ checkInterval: '1h', alertThreshold: 50 });
    this.compliance = new ComplianceManager();
    this.r2Manager = new ProductionR2Manager();
  }

  test(phone: string): boolean {
    return this.monitor.test(phone);
  }

  async exec(phone: string, campaign: Campaign): Promise<RoutingDecision> {
    const [prediction, health, consent] = await Promise.all([
      this.predictor.predictValue(phone),
      this.monitor.exec(phone),
      this.compliance.generateConsentFlow(phone, 'MARKETING')
    ]);

    const decision: RoutingDecision = {
      phone,
      send: prediction.roiPrediction > 1.5 && health.healthScore > 60,
      channel: this.optimizeChannel(prediction, campaign),
      provider: 'twilio',
      cost: 0.0075,
      expectedRoi: prediction.roiPrediction,
      risk: 1 - (prediction.confidence)
    };

    await this.r2Manager.saveIntelligence(phone, {
      type: 'campaign-decision',
      campaignId: campaign.id,
      decision,
      timestamp: Date.now()
    });

    return decision;
  }

  private optimizeChannel(prediction: any, campaign: Campaign): string {
    if (prediction.engagementScore > 80 && campaign.supportsRCS) return 'RCS';
    if (campaign.hasMedia) return 'MMS';
    return 'SMS';
  }
}
