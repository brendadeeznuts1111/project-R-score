/**
 * Multi-Layer Risk Management for T3-Lattice v4.0
 * Parallel assessment across multiple risk layers with adaptive thresholds
 */

export interface ProposedTrade {
  id: string;
  eventId: string;
  sport: string;
  marketType: string;
  selection: string;
  odds: number;
  stake: number;
  currency: string;
  venue: string;
  timestamp: number;
  expectedValue: number;
  traderId: string;
  confidence: number;
  liquidity: number;
}

export interface RiskAssessment {
  approved: boolean;
  riskScore: number;
  layerBreakdown: LayerAssessment[];
  recommendations: RiskRecommendation[];
  requiredAdjustments: TradeAdjustment[];
  overallRiskLevel: "low" | "medium" | "high" | "critical";
  confidence: number;
  mitigationStrategies: string[];
}

export interface LayerAssessment {
  layerName: string;
  riskScore: number;
  approved: boolean;
  factors: RiskFactor[];
  weight: number;
  assessmentTime: number;
  details: Record<string, any>;
}

export interface RiskFactor {
  name: string;
  value: number;
  threshold: number;
  status: "normal" | "warning" | "critical";
  impact: number;
  description: string;
}

export interface RiskRecommendation {
  type:
    | "reduce_stake"
    | "increase_confidence"
    | "diversify"
    | "hedge"
    | "avoid";
  priority: "low" | "medium" | "high" | "urgent";
  description: string;
  expectedImpact: number;
  implementation: string;
}

export interface TradeAdjustment {
  field: string;
  currentValue: any;
  recommendedValue: any;
  reason: string;
  impact: string;
}

export interface DynamicThresholds {
  maxRiskScore: number;
  maxSingleStake: number;
  maxDailyLoss: number;
  maxCorrelation: number;
  minConfidence: number;
  liquidityRequirement: number;
  volatilityLimit: number;
}

export interface MarketConditions {
  volatility: number;
  volume: number;
  sentiment: "bullish" | "bearish" | "neutral";
  liquidityScore: number;
  competitionLevel: number;
  eventSignificance: "low" | "medium" | "high";
}

export interface RiskMetrics {
  var95: number;
  var99: number;
  expectedShortfall: number;
  maximumDrawdown: number;
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  beta: number;
  alpha: number;
  informationRatio: number;
}

export abstract class RiskLayer {
  protected name: string;
  protected weight: number;
  protected enabled: boolean;

  constructor(name: string, weight: number) {
    this.name = name;
    this.weight = weight;
    this.enabled = true;
  }

  abstract assessRisk(
    trade: ProposedTrade,
    context: RiskContext
  ): Promise<LayerAssessment>;

  getName(): string {
    return this.name;
  }

  getWeight(): number {
    return this.weight;
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}

export interface RiskContext {
  currentBankroll: number;
  dailyPnL: number;
  openPositions: ProposedTrade[];
  marketConditions: MarketConditions;
  traderProfile: TraderProfile;
  recentPerformance: number[];
  complianceStatus: ComplianceStatus;
}

export interface TraderProfile {
  riskTolerance: "conservative" | "moderate" | "aggressive";
  experienceLevel: "novice" | "intermediate" | "expert" | "institutional";
  preferredSports: string[];
  averageStake: number;
  winRate: number;
  maxDrawdown: number;
}

export interface ComplianceStatus {
  kycVerified: boolean;
  jurisdiction: string;
  restrictions: string[];
  lastComplianceCheck: number;
  approved: boolean;
}

/**
 * Pre-Trade Risk Layer
 */
export class PreTradeRiskLayer extends RiskLayer {
  constructor() {
    super("Pre-Trade Risk", 0.25);
  }

  async assessRisk(
    trade: ProposedTrade,
    context: RiskContext
  ): Promise<LayerAssessment> {
    const factors: RiskFactor[] = [];
    const startTime = performance.now();

    // Stake size risk
    const stakeRatio = trade.stake / context.currentBankroll;
    factors.push({
      name: "Stake Size",
      value: stakeRatio,
      threshold: 0.05,
      status:
        stakeRatio > 0.05
          ? "critical"
          : stakeRatio > 0.02
          ? "warning"
          : "normal",
      impact: Math.min(1.0, stakeRatio * 10),
      description: `Stake represents ${(stakeRatio * 100).toFixed(
        2
      )}% of bankroll`,
    });

    // Odds risk
    const oddsRisk = trade.odds > 50 ? 0.8 : trade.odds > 10 ? 0.5 : 0.2;
    factors.push({
      name: "Odds Risk",
      value: trade.odds,
      threshold: 10,
      status:
        trade.odds > 50 ? "critical" : trade.odds > 10 ? "warning" : "normal",
      impact: oddsRisk,
      description: `High odds (${trade.odds}) indicate lower probability`,
    });

    // Confidence risk
    const confidenceRisk = 1 - trade.confidence;
    factors.push({
      name: "Confidence",
      value: trade.confidence,
      threshold: 0.7,
      status:
        trade.confidence < 0.5
          ? "critical"
          : trade.confidence < 0.7
          ? "warning"
          : "normal",
      impact: confidenceRisk,
      description: `Trade confidence is ${(trade.confidence * 100).toFixed(
        1
      )}%`,
    });

    // Expected value risk
    const evRisk =
      trade.expectedValue < 0 ? 1.0 : trade.expectedValue < 0.02 ? 0.6 : 0.2;
    factors.push({
      name: "Expected Value",
      value: trade.expectedValue,
      threshold: 0.02,
      status:
        trade.expectedValue < 0
          ? "critical"
          : trade.expectedValue < 0.02
          ? "warning"
          : "normal",
      impact: evRisk,
      description: `Expected value is ${(trade.expectedValue * 100).toFixed(
        2
      )}%`,
    });

    const riskScore =
      factors.reduce((sum, factor) => sum + factor.impact * factor.impact, 0) /
      factors.length;
    const approved =
      riskScore < 0.4 && factors.every((f) => f.status !== "critical");

    return {
      layerName: this.name,
      riskScore,
      approved,
      factors,
      weight: this.weight,
      assessmentTime: performance.now() - startTime,
      details: {
        stakeRatio,
        oddsRisk,
        confidenceRisk,
        evRisk,
      },
    };
  }
}

/**
 * Execution Risk Layer
 */
export class ExecutionRiskLayer extends RiskLayer {
  constructor() {
    super("Execution Risk", 0.2);
  }

  async assessRisk(
    trade: ProposedTrade,
    context: RiskContext
  ): Promise<LayerAssessment> {
    const factors: RiskFactor[] = [];
    const startTime = performance.now();

    // Liquidity risk
    const liquidityRatio = trade.stake / trade.liquidity;
    factors.push({
      name: "Liquidity",
      value: liquidityRatio,
      threshold: 0.1,
      status:
        liquidityRatio > 0.2
          ? "critical"
          : liquidityRatio > 0.1
          ? "warning"
          : "normal",
      impact: Math.min(1.0, liquidityRatio * 5),
      description: `Stake is ${(liquidityRatio * 100).toFixed(
        2
      )}% of available liquidity`,
    });

    // Venue reliability
    const venueReliability = this.getVenueReliability(trade.venue);
    factors.push({
      name: "Venue Reliability",
      value: venueReliability,
      threshold: 0.9,
      status:
        venueReliability < 0.8
          ? "critical"
          : venueReliability < 0.9
          ? "warning"
          : "normal",
      impact: 1 - venueReliability,
      description: `Venue reliability score is ${(
        venueReliability * 100
      ).toFixed(1)}%`,
    });

    // Market volatility impact
    const volatilityRisk = context.marketConditions.volatility * 0.5;
    factors.push({
      name: "Market Volatility",
      value: context.marketConditions.volatility,
      threshold: 0.3,
      status:
        context.marketConditions.volatility > 0.5
          ? "critical"
          : context.marketConditions.volatility > 0.3
          ? "warning"
          : "normal",
      impact: volatilityRisk,
      description: `Market volatility is ${(
        context.marketConditions.volatility * 100
      ).toFixed(1)}%`,
    });

    // Time to execution
    const timeToEvent = (trade.timestamp - Date.now()) / (1000 * 60); // minutes
    const timeRisk = timeToEvent < 5 ? 0.8 : timeToEvent < 15 ? 0.4 : 0.1;
    factors.push({
      name: "Execution Time",
      value: timeToEvent,
      threshold: 5,
      status:
        timeToEvent < 5 ? "critical" : timeToEvent < 15 ? "warning" : "normal",
      impact: timeRisk,
      description: `${timeToEvent.toFixed(1)} minutes until event`,
    });

    const riskScore =
      factors.reduce((sum, factor) => sum + factor.impact * factor.impact, 0) /
      factors.length;
    const approved =
      riskScore < 0.5 && factors.every((f) => f.status !== "critical");

    return {
      layerName: this.name,
      riskScore,
      approved,
      factors,
      weight: this.weight,
      assessmentTime: performance.now() - startTime,
      details: {
        liquidityRatio,
        venueReliability,
        volatilityRisk,
        timeRisk,
      },
    };
  }

  private getVenueReliability(venue: string): number {
    const reliabilityMap: Record<string, number> = {
      Bet365: 0.95,
      DraftKings: 0.93,
      FanDuel: 0.94,
      Pinnacle: 0.98,
      Betfair: 0.92,
      WilliamHill: 0.91,
      BetMGM: 0.9,
      Caesars: 0.89,
    };
    return reliabilityMap[venue] || 0.85;
  }
}

/**
 * Post-Trade Risk Layer
 */
export class PostTradeRiskLayer extends RiskLayer {
  constructor() {
    super("Post-Trade Risk", 0.2);
  }

  async assessRisk(
    trade: ProposedTrade,
    context: RiskContext
  ): Promise<LayerAssessment> {
    const factors: RiskFactor[] = [];
    const startTime = performance.now();

    // Portfolio correlation
    const correlationRisk = this.calculatePortfolioCorrelation(
      trade,
      context.openPositions
    );
    factors.push({
      name: "Portfolio Correlation",
      value: correlationRisk,
      threshold: 0.5,
      status:
        correlationRisk > 0.7
          ? "critical"
          : correlationRisk > 0.5
          ? "warning"
          : "normal",
      impact: correlationRisk,
      description: `High correlation with existing positions`,
    });

    // Concentration risk
    const sportConcentration = this.calculateSportConcentration(
      trade,
      context.openPositions
    );
    factors.push({
      name: "Sport Concentration",
      value: sportConcentration,
      threshold: 0.3,
      status:
        sportConcentration > 0.5
          ? "critical"
          : sportConcentration > 0.3
          ? "warning"
          : "normal",
      impact: sportConcentration,
      description: `${(sportConcentration * 100).toFixed(1)}% exposure to ${
        trade.sport
      }`,
    });

    // Daily loss potential
    const dailyLossRisk = Math.max(
      0,
      (context.dailyPnL - trade.stake) / context.currentBankroll
    );
    factors.push({
      name: "Daily Loss Risk",
      value: dailyLossRisk,
      threshold: 0.05,
      status:
        dailyLossRisk > 0.1
          ? "critical"
          : dailyLossRisk > 0.05
          ? "warning"
          : "normal",
      impact: Math.min(1.0, dailyLossRisk * 10),
      description: `Potential daily loss of ${(dailyLossRisk * 100).toFixed(
        2
      )}%`,
    });

    // Drawdown risk
    const drawdownRisk = this.calculateDrawdownRisk(trade, context);
    factors.push({
      name: "Drawdown Risk",
      value: drawdownRisk,
      threshold: 0.1,
      status:
        drawdownRisk > 0.2
          ? "critical"
          : drawdownRisk > 0.1
          ? "warning"
          : "normal",
      impact: drawdownRisk,
      description: `Risk of ${(drawdownRisk * 100).toFixed(1)}% drawdown`,
    });

    const riskScore =
      factors.reduce((sum, factor) => sum + factor.impact * factor.impact, 0) /
      factors.length;
    const approved =
      riskScore < 0.4 && factors.every((f) => f.status !== "critical");

    return {
      layerName: this.name,
      riskScore,
      approved,
      factors,
      weight: this.weight,
      assessmentTime: performance.now() - startTime,
      details: {
        correlationRisk,
        sportConcentration,
        dailyLossRisk,
        drawdownRisk,
      },
    };
  }

  private calculatePortfolioCorrelation(
    trade: ProposedTrade,
    positions: ProposedTrade[]
  ): number {
    if (positions.length === 0) return 0;

    let totalCorrelation = 0;
    for (const position of positions) {
      const correlation = this.calculateCorrelation(trade, position);
      totalCorrelation += correlation;
    }

    return totalCorrelation / positions.length;
  }

  private calculateCorrelation(
    trade1: ProposedTrade,
    trade2: ProposedTrade
  ): number {
    let correlation = 0;

    // Same sport correlation
    if (trade1.sport === trade2.sport) {
      correlation += 0.4;
    }

    // Same venue correlation
    if (trade1.venue === trade2.venue) {
      correlation += 0.2;
    }

    // Similar odds correlation
    const oddsDiff =
      Math.abs(trade1.odds - trade2.odds) / Math.max(trade1.odds, trade2.odds);
    correlation += (1 - oddsDiff) * 0.2;

    // Time correlation
    const timeDiff =
      Math.abs(trade1.timestamp - trade2.timestamp) / (1000 * 60 * 60); // hours
    correlation += Math.exp(-timeDiff / 24) * 0.2;

    return Math.min(1.0, correlation);
  }

  private calculateSportConcentration(
    trade: ProposedTrade,
    positions: ProposedTrade[]
  ): number {
    const sportPositions = positions.filter((p) => p.sport === trade.sport);
    const sportExposure =
      sportPositions.reduce((sum, p) => sum + p.stake, 0) + trade.stake;
    const totalExposure =
      positions.reduce((sum, p) => sum + p.stake, 0) + trade.stake;

    return totalExposure > 0 ? sportExposure / totalExposure : 0;
  }

  private calculateDrawdownRisk(
    trade: ProposedTrade,
    context: RiskContext
  ): number {
    // Simplified drawdown risk based on recent performance
    const recentLosses = context.recentPerformance.filter((p) => p < 0);
    if (recentLosses.length === 0) return 0;

    const avgLoss =
      recentLosses.reduce((sum, loss) => sum + loss, 0) / recentLosses.length;
    const lossStreak = recentLosses.length;

    return Math.min(1.0, Math.abs(avgLoss) * lossStreak * 0.1);
  }
}

/**
 * Portfolio Risk Layer
 */
export class PortfolioRiskLayer extends RiskLayer {
  constructor() {
    super("Portfolio Risk", 0.2);
  }

  async assessRisk(
    trade: ProposedTrade,
    context: RiskContext
  ): Promise<LayerAssessment> {
    const factors: RiskFactor[] = [];
    const startTime = performance.now();

    // Portfolio VaR impact
    const varImpact = this.calculateVaRImpact(trade, context);
    factors.push({
      name: "VaR Impact",
      value: varImpact,
      threshold: 0.02,
      status:
        varImpact > 0.05 ? "critical" : varImpact > 0.02 ? "warning" : "normal",
      impact: Math.min(1.0, varImpact * 10),
      description: `Trade adds ${(varImpact * 100).toFixed(
        2
      )}% to portfolio VaR`,
    });

    // Sharpe ratio impact
    const sharpeImpact = this.calculateSharpeImpact(trade, context);
    factors.push({
      name: "Sharpe Ratio Impact",
      value: sharpeImpact,
      threshold: -0.1,
      status:
        sharpeImpact < -0.2
          ? "critical"
          : sharpeImpact < -0.1
          ? "warning"
          : "normal",
      impact: Math.max(0, -sharpeImpact * 2),
      description: `Sharpe ratio impact: ${sharpeImpact.toFixed(3)}`,
    });

    // Beta exposure
    const betaExposure = this.calculateBetaExposure(trade, context);
    factors.push({
      name: "Beta Exposure",
      value: betaExposure,
      threshold: 1.5,
      status:
        betaExposure > 2.0
          ? "critical"
          : betaExposure > 1.5
          ? "warning"
          : "normal",
      impact: Math.min(1.0, (betaExposure - 1) / 2),
      description: `Portfolio beta exposure: ${betaExposure.toFixed(2)}`,
    });

    // Diversification benefit
    const diversificationScore = this.calculateDiversificationBenefit(
      trade,
      context
    );
    factors.push({
      name: "Diversification Benefit",
      value: diversificationScore,
      threshold: 0.1,
      status:
        diversificationScore < 0
          ? "critical"
          : diversificationScore < 0.1
          ? "warning"
          : "normal",
      impact: Math.max(0, -diversificationScore * 5),
      description: `Diversification score: ${diversificationScore.toFixed(3)}`,
    });

    const riskScore =
      factors.reduce((sum, factor) => sum + factor.impact * factor.impact, 0) /
      factors.length;
    const approved =
      riskScore < 0.4 && factors.every((f) => f.status !== "critical");

    return {
      layerName: this.name,
      riskScore,
      approved,
      factors,
      weight: this.weight,
      assessmentTime: performance.now() - startTime,
      details: {
        varImpact,
        sharpeImpact,
        betaExposure,
        diversificationScore,
      },
    };
  }

  private calculateVaRImpact(
    trade: ProposedTrade,
    context: RiskContext
  ): number {
    // Simplified VaR calculation
    const tradeVolatility = 1 / Math.sqrt(trade.odds); // Approximate volatility from odds
    const positionValue = trade.stake;
    const varContribution = positionValue * tradeVolatility * 1.645; // 95% VaR

    return varContribution / context.currentBankroll;
  }

  private calculateSharpeImpact(
    trade: ProposedTrade,
    context: RiskContext
  ): number {
    const expectedReturn = trade.expectedValue;
    const volatility = 1 / Math.sqrt(trade.odds);

    return expectedReturn / volatility - 0.02; // Risk-adjusted return minus risk-free rate
  }

  private calculateBetaExposure(
    trade: ProposedTrade,
    context: RiskContext
  ): number {
    // Simplified beta calculation based on market conditions
    const marketBeta = context.marketConditions.volatility * 2;
    const tradeBeta =
      trade.sport === "Basketball"
        ? 1.2
        : trade.sport === "Football"
        ? 1.0
        : 0.8;

    return marketBeta * tradeBeta;
  }

  private calculateDiversificationBenefit(
    trade: ProposedTrade,
    context: RiskContext
  ): number {
    if (context.openPositions.length === 0) return 1.0;

    const uniqueSports = new Set(context.openPositions.map((p) => p.sport))
      .size;
    const uniqueVenues = new Set(context.openPositions.map((p) => p.venue))
      .size;

    const sportBenefit = !context.openPositions.some(
      (p) => p.sport === trade.sport
    )
      ? 0.3
      : 0;
    const venueBenefit = !context.openPositions.some(
      (p) => p.venue === trade.venue
    )
      ? 0.2
      : 0;

    return sportBenefit + venueBenefit + uniqueSports / 10 + uniqueVenues / 15;
  }
}

/**
 * Regulatory Risk Layer
 */
export class RegulatoryRiskLayer extends RiskLayer {
  constructor() {
    super("Regulatory Risk", 0.15);
  }

  async assessRisk(
    trade: ProposedTrade,
    context: RiskContext
  ): Promise<LayerAssessment> {
    const factors: RiskFactor[] = [];
    const startTime = performance.now();

    // Compliance status
    const complianceRisk = context.complianceStatus.approved ? 0 : 1.0;
    factors.push({
      name: "Compliance Status",
      value: context.complianceStatus.approved ? 1 : 0,
      threshold: 1,
      status: !context.complianceStatus.approved ? "critical" : "normal",
      impact: complianceRisk,
      description: `Compliance status: ${
        context.complianceStatus.approved ? "Approved" : "Pending"
      }`,
    });

    // Jurisdictional restrictions
    const jurisdictionRisk = this.checkJurisdictionalRestrictions(
      trade,
      context
    );
    factors.push({
      name: "Jurisdictional Risk",
      value: jurisdictionRisk,
      threshold: 0.5,
      status:
        jurisdictionRisk > 0.8
          ? "critical"
          : jurisdictionRisk > 0.5
          ? "warning"
          : "normal",
      impact: jurisdictionRisk,
      description: `Jurisdictional risk level: ${(
        jurisdictionRisk * 100
      ).toFixed(1)}%`,
    });

    // Trading limits
    const limitsRisk = this.checkTradingLimits(trade, context);
    factors.push({
      name: "Trading Limits",
      value: limitsRisk,
      threshold: 0.8,
      status:
        limitsRisk > 1.0 ? "critical" : limitsRisk > 0.8 ? "warning" : "normal",
      impact: Math.min(1.0, limitsRisk),
      description: `Trading limits utilization: ${(limitsRisk * 100).toFixed(
        1
      )}%`,
    });

    // Regulatory reporting
    const reportingRisk = this.checkReportingRequirements(trade, context);
    factors.push({
      name: "Reporting Requirements",
      value: reportingRisk,
      threshold: 0.5,
      status:
        reportingRisk > 0.8
          ? "critical"
          : reportingRisk > 0.5
          ? "warning"
          : "normal",
      impact: reportingRisk,
      description: `Reporting risk level: ${(reportingRisk * 100).toFixed(1)}%`,
    });

    const riskScore =
      factors.reduce((sum, factor) => sum + factor.impact * factor.impact, 0) /
      factors.length;
    const approved =
      riskScore < 0.3 && factors.every((f) => f.status !== "critical");

    return {
      layerName: this.name,
      riskScore,
      approved,
      factors,
      weight: this.weight,
      assessmentTime: performance.now() - startTime,
      details: {
        complianceRisk,
        jurisdictionRisk,
        limitsRisk,
        reportingRisk,
      },
    };
  }

  private checkJurisdictionalRestrictions(
    trade: ProposedTrade,
    context: RiskContext
  ): number {
    const restrictedJurisdictions = ["IR", "KP", "SY", "CU"];
    const restrictedSports = {
      US: ["Horse Racing"],
      UK: ["Football"],
      EU: ["Tennis"],
    };

    let risk = 0;

    if (
      restrictedJurisdictions.includes(context.complianceStatus.jurisdiction)
    ) {
      risk += 1.0;
    }

    const restrictedForJurisdiction =
      restrictedSports[
        context.complianceStatus.jurisdiction as keyof typeof restrictedSports
      ];
    if (restrictedForJurisdiction?.includes(trade.sport)) {
      risk += 0.8;
    }

    return Math.min(1.0, risk);
  }

  private checkTradingLimits(
    trade: ProposedTrade,
    context: RiskContext
  ): number {
    const dailyLimit = context.currentBankroll * 0.1; // 10% daily limit
    const currentDailyExposure = context.openPositions.reduce(
      (sum, p) => sum + p.stake,
      0
    );
    const newDailyExposure = currentDailyExposure + trade.stake;

    return newDailyExposure / dailyLimit;
  }

  private checkReportingRequirements(
    trade: ProposedTrade,
    context: RiskContext
  ): number {
    // Large trades require reporting
    const reportingThreshold = context.currentBankroll * 0.05;
    if (trade.stake > reportingThreshold) {
      return 0.8;
    }

    // Time since last compliance check
    const timeSinceLastCheck =
      Date.now() - context.complianceStatus.lastComplianceCheck;
    const daysSinceLastCheck = timeSinceLastCheck / (1000 * 60 * 60 * 24);

    if (daysSinceLastCheck > 30) {
      return 0.6;
    }

    return 0.1;
  }
}

/**
 * Multi-Layer Risk Manager
 */
export class MultiLayerRiskManager {
  private layers: RiskLayer[];
  private dynamicThresholds: DynamicThresholds;
  private assessmentHistory: RiskAssessment[] = [];
  private marketConditionAnalyzer: MarketConditionAnalyzer;

  constructor() {
    this.layers = [
      new PreTradeRiskLayer(),
      new ExecutionRiskLayer(),
      new PostTradeRiskLayer(),
      new PortfolioRiskLayer(),
      new RegulatoryRiskLayer(),
    ];

    this.dynamicThresholds = this.initializeDefaultThresholds();
    this.marketConditionAnalyzer = new MarketConditionAnalyzer();
  }

  /**
   * Evaluate trade with all risk layers
   */
  async evaluateTradeWithAllLayers(
    trade: ProposedTrade,
    context: RiskContext
  ): Promise<RiskAssessment> {
    console.log(
      `🛡️ Evaluating trade ${trade.id} across ${this.layers.length} risk layers`
    );

    try {
      // Update dynamic thresholds based on market conditions
      this.updateDynamicThresholds(context.marketConditions);

      // Parallel risk assessment across all layers
      const layerAssessments = await Promise.all(
        this.layers.map((layer) =>
          layer.isEnabled()
            ? layer.assessRisk(trade, context)
            : this.createSkippedAssessment(layer)
        )
      );

      // Calculate weighted risk score
      const compositeRiskScore = this.calculateCompositeRisk(layerAssessments);

      // Generate recommendations
      const recommendations = this.generateRiskMitigations(
        layerAssessments,
        trade
      );

      // Calculate required adjustments
      const requiredAdjustments = this.calculateRequiredAdjustments(
        trade,
        layerAssessments
      );

      // Determine overall risk level
      const overallRiskLevel = this.determineRiskLevel(compositeRiskScore);

      // Generate mitigation strategies
      const mitigationStrategies = this.generateMitigationStrategies(
        layerAssessments,
        trade
      );

      const assessment: RiskAssessment = {
        approved: this.isTradeApproved(layerAssessments, compositeRiskScore),
        riskScore: compositeRiskScore,
        layerBreakdown: layerAssessments,
        recommendations,
        requiredAdjustments,
        overallRiskLevel,
        confidence: this.calculateOverallConfidence(layerAssessments),
        mitigationStrategies,
      };

      // Store in history
      this.assessmentHistory.push(assessment);

      console.log(
        `✅ Risk assessment completed. Approved: ${
          assessment.approved
        }, Risk Score: ${compositeRiskScore.toFixed(3)}`
      );
      return assessment;
    } catch (error) {
      console.error("❌ Risk assessment failed:", error);
      return this.createFailedAssessment();
    }
  }

  /**
   * Update dynamic thresholds based on market conditions
   */
  private updateDynamicThresholds(marketConditions: MarketConditions): void {
    // Adjust thresholds based on volatility
    const volatilityMultiplier = 1 + marketConditions.volatility;

    this.dynamicThresholds.maxRiskScore = Math.min(
      0.8,
      0.5 * volatilityMultiplier
    );
    this.dynamicThresholds.maxSingleStake =
      this.dynamicThresholds.maxSingleStake / volatilityMultiplier;
    this.dynamicThresholds.volatilityLimit = marketConditions.volatility * 1.5;

    // Adjust confidence requirements based on competition
    const confidenceAdjustment = marketConditions.competitionLevel * 0.1;
    this.dynamicThresholds.minConfidence = Math.min(
      0.9,
      0.7 + confidenceAdjustment
    );
  }

  /**
   * Calculate composite risk score from layer assessments
   */
  private calculateCompositeRisk(layerAssessments: LayerAssessment[]): number {
    let weightedSum = 0;
    let totalWeight = 0;

    for (const assessment of layerAssessments) {
      weightedSum += assessment.riskScore * assessment.weight;
      totalWeight += assessment.weight;
    }

    return totalWeight > 0 ? weightedSum / totalWeight : 0;
  }

  /**
   * Generate risk mitigation recommendations
   */
  private generateRiskMitigations(
    layerAssessments: LayerAssessment[],
    trade: ProposedTrade
  ): RiskRecommendation[] {
    const recommendations: RiskRecommendation[] = [];

    for (const assessment of layerAssessments) {
      for (const factor of assessment.factors) {
        if (factor.status === "critical" || factor.status === "warning") {
          recommendations.push(this.createRecommendation(factor, trade));
        }
      }
    }

    // Sort by priority and impact
    return recommendations
      .sort((a, b) => {
        const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      })
      .slice(0, 5); // Top 5 recommendations
  }

  /**
   * Create recommendation for a risk factor
   */
  private createRecommendation(
    factor: RiskFactor,
    trade: ProposedTrade
  ): RiskRecommendation {
    const recommendationMap: Record<string, Partial<RiskRecommendation>> = {
      "Stake Size": {
        type: "reduce_stake",
        description: "Reduce stake size to lower portfolio risk",
        implementation: "Reduce stake by 50%",
      },
      "Odds Risk": {
        type: "avoid",
        description: "Avoid high odds trades with low probability",
        implementation: "Skip this trade",
      },
      Confidence: {
        type: "increase_confidence",
        description: "Wait for higher confidence before executing",
        implementation: "Wait for additional market data",
      },
      Liquidity: {
        type: "reduce_stake",
        description: "Reduce stake to match available liquidity",
        implementation: "Reduce stake to 10% of available liquidity",
      },
    };

    const base = recommendationMap[factor.name] || {
      type: "diversify",
      description: `Address ${factor.name} risk factor`,
      implementation: "Review and adjust trade parameters",
    };

    return {
      type: base.type as any,
      priority: factor.status === "critical" ? "urgent" : "high",
      description: base.description || "",
      expectedImpact: factor.impact,
      implementation: base.implementation || "",
    };
  }

  /**
   * Calculate required trade adjustments
   */
  private calculateRequiredAdjustments(
    trade: ProposedTrade,
    layerAssessments: LayerAssessment[]
  ): TradeAdjustment[] {
    const adjustments: TradeAdjustment[] = [];

    for (const assessment of layerAssessments) {
      for (const factor of assessment.factors) {
        if (factor.status === "critical") {
          const adjustment = this.createAdjustment(factor, trade);
          if (adjustment) {
            adjustments.push(adjustment);
          }
        }
      }
    }

    return adjustments;
  }

  /**
   * Create adjustment for a risk factor
   */
  private createAdjustment(
    factor: RiskFactor,
    trade: ProposedTrade
  ): TradeAdjustment | null {
    switch (factor.name) {
      case "Stake Size":
        return {
          field: "stake",
          currentValue: trade.stake,
          recommendedValue: trade.stake * 0.5,
          reason: "Reduce stake size to manage risk",
          impact: "Lowers potential loss and portfolio risk",
        };
      case "Odds Risk":
        return {
          field: "odds",
          currentValue: trade.odds,
          recommendedValue: Math.min(trade.odds, 10),
          reason: "Avoid extremely high odds",
          impact: "Reduces risk of low-probability outcomes",
        };
      default:
        return null;
    }
  }

  /**
   * Determine overall risk level
   */
  private determineRiskLevel(
    riskScore: number
  ): "low" | "medium" | "high" | "critical" {
    if (riskScore < 0.2) return "low";
    if (riskScore < 0.4) return "medium";
    if (riskScore < 0.7) return "high";
    return "critical";
  }

  /**
   * Calculate overall confidence
   */
  private calculateOverallConfidence(
    layerAssessments: LayerAssessment[]
  ): number {
    if (layerAssessments.length === 0) return 0;

    const totalConfidence = layerAssessments.reduce((sum, assessment) => {
      const layerConfidence = assessment.approved
        ? 1 - assessment.riskScore
        : 0;
      return sum + layerConfidence * assessment.weight;
    }, 0);

    const totalWeight = layerAssessments.reduce(
      (sum, assessment) => sum + assessment.weight,
      0
    );
    return totalWeight > 0 ? totalConfidence / totalWeight : 0;
  }

  /**
   * Generate mitigation strategies
   */
  private generateMitigationStrategies(
    layerAssessments: LayerAssessment[],
    trade: ProposedTrade
  ): string[] {
    const strategies: string[] = [];

    // Add strategies based on risk factors
    for (const assessment of layerAssessments) {
      for (const factor of assessment.factors) {
        if (factor.status === "critical" || factor.status === "warning") {
          strategies.push(this.getMitigationStrategy(factor.name));
        }
      }
    }

    // Remove duplicates
    return [...new Set(strategies)].slice(0, 3);
  }

  /**
   * Get mitigation strategy for risk factor
   */
  private getMitigationStrategy(factorName: string): string {
    const strategyMap: Record<string, string> = {
      "Stake Size": "Implement position sizing limits and use fractional Kelly",
      "Odds Risk": "Focus on value bets with odds between 1.5 and 5.0",
      Confidence: "Wait for additional confirmation signals before entry",
      Liquidity: "Scale into positions gradually or use limit orders",
      "Portfolio Correlation": "Diversify across different sports and venues",
      "Market Volatility": "Reduce exposure during high volatility periods",
    };

    return (
      strategyMap[factorName] || "Review and adjust risk management parameters"
    );
  }

  /**
   * Check if trade is approved
   */
  private isTradeApproved(
    layerAssessments: LayerAssessment[],
    compositeRiskScore: number
  ): boolean {
    // All layers must approve
    const allLayersApproved = layerAssessments.every(
      (assessment) => assessment.approved
    );

    // Composite risk must be below threshold
    const riskWithinThreshold =
      compositeRiskScore < this.dynamicThresholds.maxRiskScore;

    // No critical risk factors
    const noCriticalFactors = layerAssessments.every((assessment) =>
      assessment.factors.every((factor) => factor.status !== "critical")
    );

    return allLayersApproved && riskWithinThreshold && noCriticalFactors;
  }

  /**
   * Initialize default thresholds
   */
  private initializeDefaultThresholds(): DynamicThresholds {
    return {
      maxRiskScore: 0.5,
      maxSingleStake: 0.02,
      maxDailyLoss: 0.05,
      maxCorrelation: 0.3,
      minConfidence: 0.7,
      liquidityRequirement: 1000,
      volatilityLimit: 0.3,
    };
  }

  /**
   * Create skipped assessment for disabled layers
   */
  private createSkippedAssessment(layer: RiskLayer): LayerAssessment {
    return {
      layerName: layer.getName(),
      riskScore: 0,
      approved: true,
      factors: [],
      weight: layer.getWeight(),
      assessmentTime: 0,
      details: { skipped: true },
    };
  }

  /**
   * Create failed assessment
   */
  private createFailedAssessment(): RiskAssessment {
    return {
      approved: false,
      riskScore: 1.0,
      layerBreakdown: [],
      recommendations: [],
      requiredAdjustments: [],
      overallRiskLevel: "critical",
      confidence: 0,
      mitigationStrategies: [
        "Risk assessment system error - manual review required",
      ],
    };
  }

  /**
   * Get risk statistics
   */
  getRiskStatistics(): {
    totalAssessments: number;
    approvalRate: number;
    averageRiskScore: number;
    riskLevelDistribution: Record<string, number>;
    commonRiskFactors: Record<string, number>;
  } {
    const totalAssessments = this.assessmentHistory.length;
    const approvedAssessments = this.assessmentHistory.filter(
      (a) => a.approved
    ).length;
    const approvalRate =
      totalAssessments > 0 ? approvedAssessments / totalAssessments : 0;

    const averageRiskScore =
      totalAssessments > 0
        ? this.assessmentHistory.reduce((sum, a) => sum + a.riskScore, 0) /
          totalAssessments
        : 0;

    const riskLevelDistribution: Record<string, number> = {
      low: 0,
      medium: 0,
      high: 0,
      critical: 0,
    };

    const commonRiskFactors: Record<string, number> = {};

    for (const assessment of this.assessmentHistory) {
      riskLevelDistribution[assessment.overallRiskLevel]++;

      for (const layer of assessment.layerBreakdown) {
        for (const factor of layer.factors) {
          if (factor.status === "critical" || factor.status === "warning") {
            commonRiskFactors[factor.name] =
              (commonRiskFactors[factor.name] || 0) + 1;
          }
        }
      }
    }

    return {
      totalAssessments,
      approvalRate,
      averageRiskScore,
      riskLevelDistribution,
      commonRiskFactors,
    };
  }

  /**
   * Enable/disable risk layers
   */
  setLayerEnabled(layerName: string, enabled: boolean): void {
    const layer = this.layers.find((l) => l.getName() === layerName);
    if (layer) {
      layer.setEnabled(enabled);
      console.log(
        `🔧 Risk layer '${layerName}' ${enabled ? "enabled" : "disabled"}`
      );
    }
  }

  /**
   * Update layer weights
   */
  updateLayerWeights(weights: Record<string, number>): void {
    for (const [layerName, weight] of Object.entries(weights)) {
      const layer = this.layers.find((l) => l.getName() === layerName);
      if (layer) {
        (layer as any).weight = weight;
      }
    }
    console.log("🔧 Layer weights updated");
  }
}

/**
 * Market Condition Analyzer
 */
class MarketConditionAnalyzer {
  analyze(marketData: any): MarketConditions {
    // Mock implementation - would analyze real market data
    return {
      volatility: 0.2 + Math.random() * 0.3,
      volume: 1000000 + Math.random() * 5000000,
      sentiment: ["bullish", "bearish", "neutral"][
        Math.floor(Math.random() * 3)
      ] as any,
      liquidityScore: 0.7 + Math.random() * 0.3,
      competitionLevel: 0.5 + Math.random() * 0.5,
      eventSignificance: ["low", "medium", "high"][
        Math.floor(Math.random() * 3)
      ] as any,
    };
  }
}
