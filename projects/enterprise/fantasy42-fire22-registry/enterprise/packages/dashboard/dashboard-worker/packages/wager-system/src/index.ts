// Fire22 Wager System - Comprehensive Production Sportsbook System
export interface Sport {
  id: string;
  name: string;
  code: string;
  active: boolean;
  icon?: string;
}

export interface League {
  id: string;
  name: string;
  sportId: string;
  country: string;
  active: boolean;
  priority: number;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  leagueId: string;
  homeCity: string;
  logo?: string;
}

export interface Event {
  id: string;
  sportId: string;
  leagueId: string;
  homeTeamId: string;
  awayTeamId: string;
  eventDate: string;
  status: 'upcoming' | 'live' | 'finished' | 'cancelled' | 'postponed';
  startTime: string;
  endTime?: string;
  venue?: string;
  broadcast?: string;
  weather?: string;
}

export interface BetType {
  id: string;
  name: string;
  description: string;
  category: 'pre_game' | 'live' | 'futures' | 'props' | 'parlays';
  minSelections: number;
  maxSelections: number;
  active: boolean;
}

export interface Selection {
  id: string;
  eventId: string;
  betTypeId: string;
  description: string;
  odds: {
    american: number;
    decimal: number;
    fractional: string;
  };
  line?: number; // For spreads, over/under
  side?: 'home' | 'away' | 'over' | 'under';
  status: 'active' | 'suspended' | 'settled';
  result?: 'win' | 'loss' | 'push' | 'void';
  settlementAmount?: number;
}

export interface Customer {
  id: string;
  login: string;
  name: string;
  email?: string;
  phone?: string;
  telegramId?: number;
  balance: number;
  creditLimit: number;
  vipLevel: 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond';
  status: 'active' | 'suspended' | 'closed';
  bettingLimits: {
    maxBet: number;
    maxDaily: number;
    maxWeekly: number;
    maxMonthly: number;
  };
  preferences: {
    favoriteSports: string[];
    favoriteTeams: string[];
    notificationSettings: Record<string, boolean>;
  };
  createdAt: string;
  lastActivity: string;
}

export interface Agent {
  id: string;
  login: string;
  name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'suspended';
  level: 'agent' | 'super_agent' | 'master_agent';
  commission: {
    baseRate: number;
    bonusRate: number;
    performanceMultiplier: number;
  };
  limits: {
    maxCustomerBet: number;
    maxTotalExposure: number;
    maxDailyVolume: number;
  };
  hierarchy: {
    parentAgentId?: string;
    childAgentIds: string[];
    superAgentId?: string;
  };
  performance: {
    totalVolume: number;
    totalCommission: number;
    customerCount: number;
    averageBet: number;
  };
}

export interface Wager {
  // !== CORE IDENTIFICATION !==
  wagerNumber: number;
  customerId: string;
  agentId: string;
  ticketWriter: string;

  // !== EVENT & SPORTS DETAILS !==
  eventId: string;
  sportId: string;
  leagueId: string;
  betTypeId: string;

  // !== BETTING DETAILS !==
  selections: Selection[];
  betType: 'straight' | 'parlay' | 'teaser' | 'if_bet' | 'reverse';
  amountWagered: number;
  toWinAmount: number;
  riskAmount: number;

  // !== ODDS & LINES !==
  odds: {
    american: number;
    decimal: number;
    fractional: string;
  };
  lineMovement: {
    openingOdds: number;
    currentOdds: number;
    lineChanges: Array<{
      timestamp: string;
      odds: number;
      reason: string;
    }>;
  };

  // !== TIMING !==
  insertDateTime: string;
  eventDate: string;
  betCloseTime: string;
  settlementDate?: string;

  // !== STATUS & RESULTS !==
  status: 'pending' | 'active' | 'settled' | 'cancelled' | 'void';
  result?: 'win' | 'loss' | 'push' | 'void' | 'partial';
  settlementAmount?: number;
  settlementMethod?: 'automatic' | 'manual' | 'partial';
  settlementNotes?: string;
  settledBy?: string;

  // !== FINANCIAL DETAILS !==
  volumeAmount: number;
  commission: {
    agentCommission: number;
    platformFee: number;
    totalCommission: number;
  };
  payout: {
    grossAmount: number;
    netAmount: number;
    taxAmount: number;
    fees: number;
  };

  // !== RISK MANAGEMENT !==
  riskMetrics: {
    exposure: number;
    liability: number;
    margin: number;
    riskScore: number;
  };
  limits: {
    customerBetLimit: number;
    agentExposureLimit: number;
    dailyLimit: number;
    weeklyLimit: number;
  };

  // !== VALIDATION & COMPLIANCE !==
  validation: {
    isValid: boolean;
    validationRules: string[];
    warnings: string[];
    errors: string[];
    approvalRequired: boolean;
    approvedBy?: string;
    approvalNotes?: string;
  };
  compliance: {
    kycVerified: boolean;
    amlCheck: boolean;
    responsibleGaming: boolean;
    regulatoryCompliance: boolean;
  };

  // !== INTEGRATION & REFERENCES !==
  externalReferences: {
    fire22Id?: string;
    stripePaymentId?: string;
    bankTransactionId?: string;
  };
  auditTrail: Array<{
    timestamp: string;
    action: string;
    performedBy: string;
    details: string;
    changes?: Record<string, any>;
  }>;

  // !== NOTIFICATIONS & ALERTS !==
  notifications: Array<{
    type: 'bet_placed' | 'odds_change' | 'settlement' | 'risk_alert';
    sentAt: string;
    recipient: string;
    method: 'email' | 'sms' | 'telegram' | 'push';
    content: string;
    status: 'sent' | 'delivered' | 'failed';
  }>;

  // !== PERFORMANCE METRICS !==
  performance: {
    timeToSettlement: number;
    customerSatisfaction?: number;
    agentPerformance: number;
    riskAdjustedReturn: number;
  };
}

export interface WagerRequest {
  customerId: string;
  agentId: string;
  eventId: string;
  betTypeId: string;
  selections: Array<{
    selectionId: string;
    odds: number;
    line?: number;
  }>;
  amountWagered: number;
  betType: 'straight' | 'parlay' | 'teaser';
  customerNotes?: string;
}

export interface WagerValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  riskScore: number;
  approvalRequired: boolean;
  limits: {
    customerLimit: number;
    agentLimit: number;
    dailyLimit: number;
    weeklyLimit: number;
  };
  recommendations: string[];
}

export interface SettlementRequest {
  wagerNumber: number;
  settlementType: 'win' | 'loss' | 'push' | 'void' | 'partial';
  settlementAmount?: number;
  settlementNotes?: string;
  settledBy: string;
  batchId?: string;
}

export interface SettlementResult {
  wagerNumber: number;
  success: boolean;
  settlementAmount: number;
  balanceBefore: number;
  balanceAfter: number;
  commission: number;
  payout: number;
  error?: string;
  timestamp: string;
}

export interface RiskMetrics {
  totalExposure: number;
  maxLiability: number;
  riskScore: number;
  concentrationRisk: number;
  correlationRisk: number;
  recommendations: string[];
}

export interface CommissionStructure {
  baseRate: number;
  volumeBonus: number;
  performanceBonus: number;
  riskAdjustment: number;
  totalRate: number;
  calculation: {
    baseCommission: number;
    volumeBonus: number;
    performanceBonus: number;
    riskAdjustment: number;
    totalCommission: number;
  };
}

export class WagerSystem {
  private wagers = new Map<number, Wager>();
  private customers = new Map<string, Customer>();
  private agents = new Map<string, Agent>();
  private events = new Map<string, Event>();
  private selections = new Map<string, Selection>();
  private wagerCounter = 1000000;

  // !== WAGER CREATION & VALIDATION !==

  async createWager(request: WagerRequest): Promise<Wager> {
    // Validate request
    const validation = await this.validateWager(request);
    if (!validation.isValid) {
      throw new Error(`Wager validation failed: ${validation.errors.join(', ')}`);
    }

    // Check limits
    await this.checkLimits(request);

    // Calculate once and reuse
    const commissionStructure = await this.calculateCommission(request);
    const riskMetricsData = await this.calculateRiskMetrics(request);

    // Create wager
    const wager: Wager = {
      wagerNumber: this.generateWagerNumber(),
      customerId: request.customerId,
      agentId: request.agentId,
      ticketWriter: request.agentId,
      eventId: request.eventId,
      sportId: await this.getSportId(request.eventId),
      leagueId: await this.getLeagueId(request.eventId),
      betTypeId: request.betTypeId,
      selections: await this.buildSelections(request.selections),
      betType: request.betType,
      amountWagered: request.amountWagered,
      toWinAmount: this.calculateToWinAmount(request),
      riskAmount: this.calculateRiskAmount(request),
      odds: this.calculateCombinedOdds(request),
      lineMovement: {
        openingOdds: 0,
        currentOdds: 0,
        lineChanges: [],
      },
      insertDateTime: new Date().toISOString(),
      eventDate: await this.getEventDate(request.eventId),
      betCloseTime: await this.getBetCloseTime(request.eventId),
      status: 'pending',
      volumeAmount: request.amountWagered,
      commission: {
        agentCommission: commissionStructure.calculation.baseCommission,
        platformFee: commissionStructure.calculation.riskAdjustment,
        totalCommission: commissionStructure.calculation.totalCommission,
      },
      payout: {
        grossAmount: 0,
        netAmount: 0,
        taxAmount: 0,
        fees: 0,
      },
      riskMetrics: {
        exposure: riskMetricsData.totalExposure,
        liability: riskMetricsData.maxLiability,
        margin: 0, // Simplified
        riskScore: riskMetricsData.riskScore,
      },
      limits: await this.getCustomerLimits(request.customerId),
      validation: {
        isValid: true,
        validationRules: validation.recommendations,
        warnings: validation.warnings,
        errors: [],
        approvalRequired: validation.approvalRequired,
        approvedBy: undefined,
        approvalNotes: undefined,
      },
      compliance: await this.checkCompliance(request),
      externalReferences: {},
      auditTrail: [
        {
          timestamp: new Date().toISOString(),
          action: 'wager_created',
          performedBy: request.agentId,
          details: 'Wager created successfully',
          changes: {},
        },
      ],
      notifications: [],
      performance: {
        timeToSettlement: 0,
        customerSatisfaction: undefined,
        agentPerformance: 0,
        riskAdjustedReturn: 0,
      },
    };

    // Store wager
    this.wagers.set(wager.wagerNumber, wager);

    // Update customer and agent metrics
    await this.updateMetrics(wager);

    // Send notifications
    await this.sendNotifications(wager, 'bet_placed');

    return wager;
  }

  // !== VALIDATION METHODS !==

  async validateWager(request: WagerRequest): Promise<WagerValidation> {
    const errors: string[] = [];
    const warnings: string[] = [];
    let riskScore = 0;

    // Basic validation
    if (!request.customerId || !request.agentId || !request.eventId) {
      errors.push('Missing required fields');
    }

    if (request.amountWagered <= 0) {
      errors.push('Invalid wager amount');
    }

    // Customer validation
    const customer = await this.getCustomer(request.customerId);
    if (!customer) {
      errors.push('Customer not found');
    } else if (customer.status !== 'active') {
      errors.push('Customer account is not active');
    }

    // Agent validation
    const agent = await this.getAgent(request.agentId);
    if (!agent) {
      errors.push('Agent not found');
    } else if (agent.status !== 'active') {
      errors.push('Agent account is not active');
    }

    // Event validation
    const event = await this.getEvent(request.eventId);
    if (!event) {
      errors.push('Event not found');
    } else if (event.status !== 'upcoming' && event.status !== 'live') {
      errors.push('Event is not available for betting');
    }

    // Selection validation
    for (const selection of request.selections) {
      const sel = await this.getSelection(selection.selectionId);
      if (!sel) {
        errors.push(`Selection ${selection.selectionId} not found`);
      } else if (sel.status !== 'active') {
        errors.push(`Selection ${selection.selectionId} is not active`);
      }
    }

    // Limit checks
    const limitCheck = await this.checkLimits(request);
    if (!limitCheck.withinLimits) {
      errors.push(...limitCheck.violations);
      riskScore += 50;
    }

    // Risk assessment
    riskScore += this.assessRisk(request);

    // Approval requirements
    const approvalRequired = riskScore > 75 || request.amountWagered > 10000;

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      riskScore,
      approvalRequired,
      limits: limitCheck.limits,
      recommendations: this.generateRecommendations(request, riskScore),
    };
  }

  // !== SETTLEMENT METHODS !==

  async settleWager(request: SettlementRequest): Promise<SettlementResult> {
    const wager = this.wagers.get(request.wagerNumber);
    if (!wager) {
      throw new Error('Wager not found');
    }

    if (wager.status === 'settled') {
      throw new Error('Wager already settled');
    }

    // Calculate settlement amount
    const settlementAmount = this.calculateSettlementAmount(wager, request.settlementType);

    // Get customer balance
    const customer = await this.getCustomer(wager.customerId);
    if (!customer) {
      throw new Error('Customer not found');
    }

    const balanceBefore = customer.balance;
    const balanceAfter = balanceBefore + settlementAmount;

    // Update wager
    wager.status = 'settled';
    wager.result = request.settlementType;
    wager.settlementAmount = settlementAmount;
    wager.settlementDate = new Date().toISOString();
    wager.settledBy = request.settledBy;
    wager.settlementNotes = request.settlementNotes;

    // Update customer balance
    customer.balance = balanceAfter;
    customer.lastActivity = new Date().toISOString();

    // Calculate commission and payout
    const commission = this.calculateFinalCommission(wager);
    const payout = settlementAmount - commission;

    // Update wager financials
    wager.payout = {
      grossAmount: settlementAmount,
      netAmount: payout,
      taxAmount: 0, // Tax calculation would go here
      fees: commission,
    };

    // Add to audit trail
    wager.auditTrail.push({
      timestamp: new Date().toISOString(),
      action: 'wager_settled',
      performedBy: request.settledBy,
      details: `Wager settled as ${request.settlementType}`,
      changes: {
        status: 'settled',
        result: request.settlementType,
        settlementAmount,
      },
    });

    // Send notifications
    await this.sendNotifications(wager, 'settlement');

    // Update metrics
    await this.updateMetrics(wager);

    return {
      wagerNumber: wager.wagerNumber,
      success: true,
      settlementAmount,
      balanceBefore,
      balanceAfter,
      commission,
      payout,
      timestamp: new Date().toISOString(),
    };
  }

  // !== RISK MANAGEMENT !==

  async calculateRiskMetrics(request: WagerRequest): Promise<RiskMetrics> {
    let totalExposure = 0;
    let maxLiability = 0;
    let riskScore = 0;

    // Calculate exposure
    if (request.betType === 'straight') {
      totalExposure = request.amountWagered;
      maxLiability = request.amountWagered;
    } else if (request.betType === 'parlay') {
      totalExposure = request.amountWagered;
      maxLiability = this.calculateParlayLiability(request);
    }

    // Assess risk factors
    const customer = await this.getCustomer(request.customerId);
    if (customer) {
      if (customer.vipLevel === 'diamond') riskScore += 10;
      if (customer.balance < request.amountWagered * 2) riskScore += 20;
    }

    const agent = await this.getAgent(request.agentId);
    if (agent) {
      if (agent.level === 'master_agent') riskScore -= 10;
      if (agent.performance.totalVolume < 10000) riskScore += 15;
    }

    // Event risk
    const event = await this.getEvent(request.eventId);
    if (event) {
      if (event.status === 'live') riskScore += 25;
      if (event.weather === 'severe') riskScore += 15;
    }

    // Selection risk
    for (const selection of request.selections) {
      const sel = await this.getSelection(selection.selectionId);
      if (sel) {
        if (sel.odds.american > 200) riskScore += 10;
        if (sel.status === 'suspended') riskScore += 30;
      }
    }

    return {
      totalExposure,
      maxLiability,
      riskScore: Math.min(riskScore, 100),
      concentrationRisk: this.calculateConcentrationRisk(request),
      correlationRisk: this.calculateCorrelationRisk(request),
      recommendations: this.generateRiskRecommendations(riskScore),
    };
  }

  // !== COMMISSION CALCULATION !==

  async calculateCommission(request: WagerRequest): Promise<CommissionStructure> {
    const agent = await this.getAgent(request.agentId);
    if (!agent) {
      throw new Error('Agent not found');
    }

    const baseCommission = request.amountWagered * agent.commission.baseRate;
    const volumeBonus = this.calculateVolumeBonus(agent, request.amountWagered);
    const performanceBonus = this.calculatePerformanceBonus(agent);
    const riskAdjustment = this.calculateRiskAdjustment(request);

    const totalCommission = baseCommission + volumeBonus + performanceBonus + riskAdjustment;
    const totalRate = totalCommission / request.amountWagered;

    return {
      baseRate: agent.commission.baseRate,
      volumeBonus: volumeBonus / request.amountWagered,
      performanceBonus: performanceBonus / request.amountWagered,
      riskAdjustment: riskAdjustment / request.amountWagered,
      totalRate,
      calculation: {
        baseCommission,
        volumeBonus,
        performanceBonus,
        riskAdjustment,
        totalCommission,
      },
    };
  }

  // !== UTILITY METHODS !==

  private async buildSelections(
    selectionRequests: Array<{ selectionId: string; odds: number; line?: number }>
  ): Promise<Selection[]> {
    const selections: Selection[] = [];

    for (const request of selectionRequests) {
      const selection = await this.getSelection(request.selectionId);
      if (selection) {
        // Create a copy with the specific odds and line from the request
        const wagerSelection: Selection = {
          ...selection,
          odds: {
            american: request.odds,
            decimal: this.americanToDecimal(request.odds),
            fractional: this.americanToFractional(request.odds),
          },
          line: request.line,
        };
        selections.push(wagerSelection);
      }
    }

    return selections;
  }

  private americanToDecimal(american: number): number {
    if (american > 0) {
      return american / 100 + 1;
    } else {
      return 100 / Math.abs(american) + 1;
    }
  }

  private americanToFractional(american: number): string {
    if (american > 0) {
      return `${american}/100`;
    } else {
      return `100/${Math.abs(american)}`;
    }
  }

  private generateWagerNumber(): number {
    return ++this.wagerCounter;
  }

  private calculateToWinAmount(request: WagerRequest): number {
    // For American odds calculation: -110 means bet $110 to win $100
    // So to win $90.91 on $100 bet: 100 / 1.10 = 90.91
    if (request.betType === 'straight' && request.selections.length > 0) {
      // Use first selection's odds for calculation
      const odds = request.selections[0].odds;
      if (odds < 0) {
        // Negative American odds: bet |odds| to win 100
        return request.amountWagered * (100 / Math.abs(odds));
      } else {
        // Positive American odds: bet 100 to win odds
        return request.amountWagered * (odds / 100);
      }
    }
    return request.amountWagered * 0.9; // Fallback for simplified calculation
  }

  private calculateRiskAmount(request: WagerRequest): number {
    return request.amountWagered;
  }

  private calculateCombinedOdds(request: WagerRequest): {
    american: number;
    decimal: number;
    fractional: string;
  } {
    // Implementation would calculate combined odds for parlays
    return { american: 100, decimal: 2.0, fractional: '1/1' };
  }

  private calculateSettlementAmount(wager: Wager, settlementType: string): number {
    switch (settlementType) {
      case 'win':
        return wager.toWinAmount;
      case 'loss':
        return -wager.amountWagered;
      case 'push':
        return 0;
      case 'void':
        return 0;
      case 'partial':
        return wager.toWinAmount * 0.5; // Simplified partial settlement
      default:
        return 0;
    }
  }

  private calculateFinalCommission(wager: Wager): number {
    return wager.commission.totalCommission;
  }

  private calculateParlayLiability(request: WagerRequest): number {
    // Implementation would calculate parlay liability
    return request.amountWagered * 2; // Simplified
  }

  private calculateConcentrationRisk(request: WagerRequest): number {
    // Implementation would calculate concentration risk
    return 0.1; // Simplified
  }

  private calculateCorrelationRisk(request: WagerRequest): number {
    // Implementation would calculate correlation risk
    return 0.05; // Simplified
  }

  private calculateVolumeBonus(agent: Agent, amount: number): number {
    // Implementation would calculate volume bonus
    return amount * 0.01; // Simplified
  }

  private calculatePerformanceBonus(agent: Agent): number {
    // Implementation would calculate performance bonus
    return 0; // Simplified
  }

  private calculateRiskAdjustment(request: WagerRequest): number {
    // Implementation would calculate risk adjustment
    return 0; // Simplified
  }

  private generateRiskRecommendations(riskScore: number): string[] {
    const recommendations: string[] = [];

    if (riskScore > 75) {
      recommendations.push('Require manual approval');
      recommendations.push('Consider reducing bet amount');
      recommendations.push('Monitor customer activity closely');
    } else if (riskScore > 50) {
      recommendations.push('Flag for review');
      recommendations.push('Verify customer identity');
    } else if (riskScore > 25) {
      recommendations.push('Standard processing');
    } else {
      recommendations.push('Low risk - fast track');
    }

    return recommendations;
  }

  private generateRecommendations(request: WagerRequest, riskScore: number): string[] {
    const recommendations: string[] = [];

    if (riskScore > 75) {
      recommendations.push('High risk wager - manual review required');
    }

    if (request.amountWagered > 5000) {
      recommendations.push('Large wager - verify customer funds');
    }

    if (request.betType === 'parlay' && request.selections.length > 3) {
      recommendations.push('Complex parlay - verify all selections');
    }

    return recommendations;
  }

  // !== DATA ACCESS METHODS !==

  async getCustomer(customerId: string): Promise<Customer | undefined> {
    return this.customers.get(customerId);
  }

  async getAgent(agentId: string): Promise<Agent | undefined> {
    return this.agents.get(agentId);
  }

  async getEvent(eventId: string): Promise<Event | undefined> {
    return this.events.get(eventId);
  }

  async getSelection(selectionId: string): Promise<Selection | undefined> {
    return this.selections.get(selectionId);
  }

  async getSportId(eventId: string): Promise<string> {
    const event = await this.getEvent(eventId);
    return event?.sportId || '';
  }

  async getLeagueId(eventId: string): Promise<string> {
    const event = await this.getEvent(eventId);
    return event?.leagueId || '';
  }

  async getEventDate(eventId: string): Promise<string> {
    const event = await this.getEvent(eventId);
    return event?.eventDate || '';
  }

  async getBetCloseTime(eventId: string): Promise<string> {
    const event = await this.getEvent(eventId);
    if (!event) return '';

    // Close betting 5 minutes before event starts
    const eventTime = new Date(event.startTime);
    const closeTime = new Date(eventTime.getTime() - 5 * 60 * 1000);
    return closeTime.toISOString();
  }

  async getCustomerLimits(customerId: string): Promise<any> {
    const customer = await this.getCustomer(customerId);
    return customer?.bettingLimits || {};
  }

  async checkCompliance(request: WagerRequest): Promise<any> {
    const customer = await this.getCustomer(request.customerId);
    return {
      kycVerified: true, // Simplified
      amlCheck: true, // Simplified
      responsibleGaming: true, // Simplified
      regulatoryCompliance: true, // Simplified
    };
  }

  async checkLimits(request: WagerRequest): Promise<any> {
    // Implementation would check all relevant limits
    return {
      withinLimits: true,
      violations: [],
      limits: {
        customerLimit: 10000,
        agentLimit: 50000,
        dailyLimit: 100000,
        weeklyLimit: 500000,
      },
    };
  }

  private assessRisk(request: WagerRequest): number {
    let risk = 0;

    if (request.amountWagered > 1000) risk += 10;
    if (request.betType === 'parlay') risk += 15;
    if (request.selections.length > 2) risk += 5;

    return risk;
  }

  // !== METRICS & NOTIFICATIONS !==

  async updateMetrics(wager: Wager): Promise<void> {
    // Update customer metrics
    const customer = await this.getCustomer(wager.customerId);
    if (customer) {
      customer.lastActivity = new Date().toISOString();
    }

    // Update agent metrics
    const agent = await this.getAgent(wager.agentId);
    if (agent) {
      agent.performance.totalVolume += wager.volumeAmount;
      agent.performance.averageBet =
        agent.performance.totalVolume / agent.performance.customerCount;
    }
  }

  async sendNotifications(wager: Wager, type: string): Promise<void> {
    // Implementation would send actual notifications
    const notification = {
      type: type as any,
      sentAt: new Date().toISOString(),
      recipient: wager.customerId,
      method: 'telegram' as any,
      content: `Your wager #${wager.wagerNumber} has been ${type}`,
      status: 'sent' as any,
    };

    wager.notifications.push(notification);
  }

  // !== QUERY METHODS !==

  async getWager(wagerNumber: number): Promise<Wager | undefined> {
    return this.wagers.get(wagerNumber);
  }

  async getWagersByCustomer(customerId: string): Promise<Wager[]> {
    return Array.from(this.wagers.values()).filter(w => w.customerId === customerId);
  }

  async getWagersByAgent(agentId: string): Promise<Wager[]> {
    return Array.from(this.wagers.values()).filter(w => w.agentId === agentId);
  }

  async getPendingWagers(): Promise<Wager[]> {
    return Array.from(this.wagers.values()).filter(w => w.status === 'pending');
  }

  async getActiveWagers(): Promise<Wager[]> {
    return Array.from(this.wagers.values()).filter(w => w.status === 'active');
  }

  async getSettledWagers(): Promise<Wager[]> {
    return Array.from(this.wagers.values()).filter(w => w.status === 'settled');
  }

  // !== SYSTEM STATISTICS !==

  async getSystemStats(): Promise<any> {
    const totalWagers = this.wagers.size;
    const totalVolume = Array.from(this.wagers.values()).reduce(
      (sum, w) => sum + w.volumeAmount,
      0
    );
    const totalExposure = Array.from(this.wagers.values()).reduce(
      (sum, w) => sum + w.riskMetrics.exposure,
      0
    );
    const pendingWagers = await this.getPendingWagers();
    const activeWagers = await this.getActiveWagers();

    return {
      totalWagers,
      totalVolume,
      totalExposure,
      pendingWagers: pendingWagers.length,
      activeWagers: activeWagers.length,
      averageWager: totalVolume / totalWagers || 0,
      riskScore: this.calculateSystemRiskScore(),
    };
  }

  private calculateSystemRiskScore(): number {
    const wagers = Array.from(this.wagers.values());
    if (wagers.length === 0) return 0;

    const totalRisk = wagers.reduce((sum, w) => sum + w.riskMetrics.riskScore, 0);
    return totalRisk / wagers.length;
  }
}

// Export default instance
export const wagerSystem = new WagerSystem();
