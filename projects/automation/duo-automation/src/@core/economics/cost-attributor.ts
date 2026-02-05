
/**
 * §Economics - Per-number cost tracking & ROI calculation.
 * Standardized cost matrix for Empire Pro infrastructure.
 */
export const MONETARY_MATRIX = {
  sanitize: 0.00,          // CPU only
  validate: 0.00,          // CPU only
  ipqs: 0.01,              // $0.01 per API call (cached: 0)
  routing: 0.001,          // Decision logic
  r2Storage: 0.000023      // $0.023/GB/month (per-record allocation)
};

export interface CostBreakdown {
  total: number;
  stages: typeof MONETARY_MATRIX;
  roi: number;
}

export class CostAttributor {
  /**
   * Calculate per-number cost and ROI based on stage hits.
   * Target: $11 per 1,000 numbers (0.011 total cost).
   */
  static calculate(meta: { ipqsHit: boolean; stored: boolean; businessValue?: number }): CostBreakdown {
    const stages = { ...MONETARY_MATRIX };
    
    // Adjust costs based on cache hits
    if (!meta.ipqsHit) stages.ipqs = 0.01;
    else stages.ipqs = 0.00;
    
    if (!meta.stored) stages.r2Storage = 0.00;
    
    const total = Object.values(stages).reduce((a, b) => a + b, 0);
    
    // ROI: (Value - Cost) / Cost
    const value = meta.businessValue || 2.50; // $2.50 target business value per lead
    const roi = (value - total) / (total || 0.0001);

    return {
      total: parseFloat(total.toFixed(6)),
      stages,
      roi: Math.round(roi)
    };
  }
}
