# 🎯 Betting Domain

## 📋 Overview

The **Betting Domain** manages all aspects of sports betting and wagering within
Fantasy42-Fire22. This domain handles bet placement, odds calculation, market
management, and settlement processes while ensuring compliance with regulatory
requirements.

## 🎯 Responsibilities

- **Bet Placement & Management** - Handle bet creation and lifecycle
- **Odds Calculation** - Real-time odds computation and updates
- **Market Management** - Create and manage betting markets
- **Risk Assessment** - Evaluate betting risks and limits
- **Settlement Processing** - Handle bet settlement and payouts
- **Compliance Enforcement** - Ensure regulatory compliance

## 🔧 Key Components

### **Core Entities**

```typescript
// Bet aggregate root
export class Bet extends AggregateRoot {
  constructor(
    public readonly id: string,
    public readonly userId: string,
    public readonly marketId: string,
    public readonly stake: Money,
    public readonly odds: Odds,
    public readonly selection: Selection
  ) {
    super();
  }

  public settle(result: MarketResult): Result<Settlement, DomainError> {
    // Business logic for bet settlement
  }
}

// Market aggregate root
export class Market extends AggregateRoot {
  constructor(
    public readonly id: string,
    public readonly eventId: string,
    public readonly type: MarketType,
    public readonly selections: Selection[],
    public status: MarketStatus
  ) {
    super();
  }

  public updateOdds(selectionId: string, newOdds: Odds): void {
    // Update odds for a selection
  }

  public close(): void {
    // Close market for betting
  }
}
```

### **Value Objects**

```typescript
// Money value object
export class Money extends ValueObject {
  constructor(
    public readonly amount: number,
    public readonly currency: string
  ) {}

  public add(other: Money): Money {
    if (this.currency !== other.currency) {
      throw new CurrencyMismatchError();
    }
    return new Money(this.amount + other.amount, this.currency);
  }

  public multiply(factor: number): Money {
    return new Money(this.amount * factor, this.currency);
  }
}

// Odds value object
export class Odds extends ValueObject {
  constructor(
    public readonly decimal: number,
    public readonly fractional: string
  ) {}

  public static fromDecimal(decimal: number): Odds {
    const fractional = `${decimal - 1}/1`;
    return new Odds(decimal, fractional);
  }

  public toPayout(stake: Money): Money {
    return stake.multiply(this.decimal);
  }
}
```

## 📊 Bounded Contexts

### **1. Wagers Context**

**Purpose:** Handle bet placement and management **Responsibilities:**

- Bet creation and validation
- Stake verification and limits
- Bet cancellation and modification
- Bet history and tracking

**Key Concepts:**

- `Bet` - Individual bet entity
- `BetSlip` - Collection of bets
- `Stake` - Bet amount validation
- `BetStatus` - Bet lifecycle states

### **2. Odds Context**

**Purpose:** Manage odds calculation and distribution **Responsibilities:**

- Real-time odds computation
- Odds movement tracking
- Odds margin management
- Odds synchronization

**Key Concepts:**

- `Odds` - Betting odds representation
- `OddsMovement` - Odds change tracking
- `Margin` - Bookmaker margin calculation
- `Probability` - Implied probability

### **3. Markets Context**

**Purpose:** Create and manage betting markets **Responsibilities:**

- Market creation and configuration
- Market status management
- Market result processing
- Market analytics and reporting

**Key Concepts:**

- `Market` - Betting market entity
- `Selection` - Market option
- `MarketType` - Type of betting market
- `MarketStatus` - Market lifecycle

### **4. Risk Context**

**Purpose:** Assess and manage betting risks **Responsibilities:**

- Risk limit enforcement
- Liability calculation
- Exposure management
- Risk reporting

**Key Concepts:**

- `RiskLimit` - Betting limits
- `Liability` - Potential payout exposure
- `Exposure` - Current risk exposure
- `RiskAssessment` - Risk evaluation

## 🔗 Domain Events

### **Betting Events**

```typescript
export class BetPlaced extends DomainEvent {
  constructor(
    public readonly betId: string,
    public readonly userId: string,
    public readonly stake: Money,
    public readonly potentialPayout: Money
  ) {
    super(betId);
  }
}

export class MarketClosed extends DomainEvent {
  constructor(
    public readonly marketId: string,
    public readonly result: MarketResult
  ) {
    super(marketId);
  }
}

export class OddsChanged extends DomainEvent {
  constructor(
    public readonly marketId: string,
    public readonly selectionId: string,
    public readonly oldOdds: Odds,
    public readonly newOdds: Odds
  ) {
    super(marketId);
  }
}
```

## 📋 Business Rules

### **Betting Validation**

```typescript
export class BettingRules {
  // Minimum stake validation
  public static validateMinimumStake(stake: Money): boolean {
    return stake.amount >= MINIMUM_STAKE;
  }

  // Maximum stake validation
  public static validateMaximumStake(stake: Money, user: User): boolean {
    const maxStake = this.calculateMaxStake(user);
    return stake.amount <= maxStake;
  }

  // Odds validation
  public static validateOdds(odds: Odds): boolean {
    return odds.decimal >= MINIMUM_ODDS && odds.decimal <= MAXIMUM_ODDS;
  }

  // Market availability
  public static validateMarketStatus(market: Market): boolean {
    return market.status === MarketStatus.OPEN;
  }
}
```

### **Risk Management**

```typescript
export class RiskRules {
  // Daily limit validation
  public static validateDailyLimit(user: User, stake: Money): boolean {
    const dailyTotal = this.getUserDailyTotal(user);
    return dailyTotal + stake.amount <= DAILY_LIMIT;
  }

  // Liability calculation
  public static calculateLiability(bets: Bet[]): Money {
    return bets.reduce(
      (total, bet) => total.add(bet.potentialPayout),
      new Money(0, 'USD')
    );
  }

  // Exposure management
  public static assessExposure(market: Market): RiskLevel {
    const liability = this.calculateLiability(market.bets);
    if (liability.amount > HIGH_RISK_THRESHOLD) return RiskLevel.HIGH;
    if (liability.amount > MEDIUM_RISK_THRESHOLD) return RiskLevel.MEDIUM;
    return RiskLevel.LOW;
  }
}
```

## 🔗 Domain Relationships

### **Inbound Dependencies**

- **Users Domain** - User account validation and limits
- **Finance Domain** - Transaction processing and settlement
- **Analytics Domain** - Betting analytics and reporting

### **Outbound Dependencies**

- **Core Domain** - Business rule validation
- **Security Domain** - Fraud detection and compliance
- **Communication Domain** - Bet confirmations and results

## 📊 Domain Services

### **Betting Engine Service**

```typescript
export interface BettingEngine {
  calculateOdds(market: Market, selection: Selection): Odds;
  validateBet(bet: Bet): Result<void, DomainError>;
  processSettlement(bet: Bet, result: MarketResult): Settlement;
}

export class BettingEngineImpl implements BettingEngine {
  constructor(
    private readonly oddsCalculator: OddsCalculator,
    private readonly riskAssessor: RiskAssessor,
    private readonly settlementProcessor: SettlementProcessor
  ) {}

  async calculateOdds(market: Market, selection: Selection): Promise<Odds> {
    return await this.oddsCalculator.calculate(market, selection);
  }

  async validateBet(bet: Bet): Promise<Result<void, DomainError>> {
    // Validate stake limits
    // Check market status
    // Assess risk exposure
    // Return validation result
  }

  async processSettlement(bet: Bet, result: MarketResult): Promise<Settlement> {
    return await this.settlementProcessor.process(bet, result);
  }
}
```

## 🧪 Testing Strategy

### **Unit Tests**

```typescript
describe('Betting Domain', () => {
  describe('Bet Validation', () => {
    it('should validate minimum stake', () => {
      const stake = new Money(5, 'USD');
      expect(BettingRules.validateMinimumStake(stake)).toBe(true);
    });

    it('should reject stake below minimum', () => {
      const stake = new Money(0.5, 'USD');
      expect(BettingRules.validateMinimumStake(stake)).toBe(false);
    });
  });

  describe('Odds Calculation', () => {
    it('should calculate correct payout', () => {
      const odds = Odds.fromDecimal(2.5);
      const stake = new Money(100, 'USD');
      const payout = odds.toPayout(stake);
      expect(payout.amount).toBe(250);
    });
  });
});
```

### **Integration Tests**

```typescript
describe('Betting Integration', () => {
  it('should process complete bet lifecycle', async () => {
    // Create market
    // Place bet
    // Update odds
    // Close market
    // Settle bet
    // Verify payout
  });

  it('should handle concurrent bets on same market', async () => {
    // Test race conditions
    // Verify data consistency
    // Check liability calculations
  });
});
```

## 📈 Performance Considerations

### **Optimization Strategies**

- **Odds Caching** - Cache frequently accessed odds
- **Bet Processing** - Asynchronous bet processing
- **Market Updates** - Real-time market data updates
- **Settlement Batching** - Batch settlement processing

### **Scalability Features**

- **Horizontal Scaling** - Market partitioning
- **Load Balancing** - Distribute betting load
- **Database Sharding** - Bet data partitioning
- **Caching Layers** - Multi-level caching strategy

## 🔐 Compliance & Security

### **Regulatory Compliance**

- **Age Verification** - Ensure users are of legal betting age
- **Location Validation** - Restrict betting by jurisdiction
- **Responsible Gambling** - Implement betting limits and self-exclusion
- **AML Compliance** - Anti-money laundering checks
- **Audit Trail** - Complete betting transaction audit

### **Security Measures**

- **Bet Tampering Prevention** - Cryptographic bet validation
- **Fraud Detection** - Real-time fraud monitoring
- **Rate Limiting** - Prevent betting bots and abuse
- **Data Encryption** - Encrypt sensitive betting data
- **Access Control** - Role-based betting permissions

## 🎯 CODEOWNERS

- **@fire22/betting-team** - Betting domain experts
- **@fire22/compliance-team** - Regulatory compliance
- **@fire22/risk-team** - Risk management specialists
- **@fire22/analytics-team** - Betting analytics

## 📋 Related Domains

- **Users** - User account validation and limits
- **Finance** - Transaction processing and settlement
- **Analytics** - Betting analytics and reporting
- **Security** - Fraud detection and compliance
- **Communication** - Bet notifications and results

---

**🎯 Ready to place some bets? The Betting Domain handles all wagering
operations with enterprise-grade reliability and compliance!**

**Questions?** Contact the Betting Domain CODEOWNERS! 🚀
