import type {
  OddsTick,
  MarketData,
  ArbitrageOpportunity,
  SharpDetectionResult,
  WebSocketMessage
} from './schemas';
import {
  OddsTickSchema,
  MarketDataSchema,
  ArbitrageOpportunitySchema,
  SharpDetectionResultSchema,
  WebSocketMessageSchema
} from './schemas';

export class DataValidator {
  // Validate individual data types
  public validateOddsTick(data: unknown): ValidationResult<OddsTick> {
    return this.validate(data, OddsTickSchema, 'OddsTick');
  }

  public validateMarketData(data: unknown): ValidationResult<MarketData> {
    return this.validate(data, MarketDataSchema, 'MarketData');
  }

  public validateArbitrageOpportunity(data: unknown): ValidationResult<ArbitrageOpportunity> {
    return this.validate(data, ArbitrageOpportunitySchema, 'ArbitrageOpportunity');
  }

  public validateSharpDetectionResult(data: unknown): ValidationResult<SharpDetectionResult> {
    return this.validate(data, SharpDetectionResultSchema, 'SharpDetectionResult');
  }

  public validateWebSocketMessage(data: unknown): ValidationResult<WebSocketMessage> {
    return this.validate(data, WebSocketMessageSchema, 'WebSocketMessage');
  }

  // Batch validation
  public validateOddsTicks(data: unknown[]): ValidationResult<OddsTick[]> {
    const results: OddsTick[] = [];
    const errors: ValidationError[] = [];

    for (let i = 0; i < data.length; i++) {
      const result = this.validateOddsTick(data[i]);
      if (result.isValid) {
        results.push(result.data!);
      } else {
        errors.push(...result.errors.map(err => ({ ...err, index: i })));
      }
    }

    return {
      isValid: errors.length === 0,
      data: results,
      errors
    };
  }

  // Business logic validation
  public validateTickSequence(ticks: OddsTick[]): SequenceValidationResult {
    const issues: SequenceIssue[] = [];
    
    for (let i = 1; i < ticks.length; i++) {
      const current = ticks[i];
      const previous = ticks[i - 1];
      
      // Check timestamp ordering
      if (current.timestamp < previous.timestamp) {
        issues.push({
          type: 'timestamp_out_of_order',
          index: i,
          current: current.timestamp,
          expected: previous.timestamp + 1,
          message: `Timestamp at index ${i} is before previous timestamp`
        });
      }
      
      // Check sequence ordering if present
      if (current.sequence !== undefined && previous.sequence !== undefined) {
        if (current.sequence <= previous.sequence) {
          issues.push({
            type: 'sequence_out_of_order',
            index: i,
            current: current.sequence,
            expected: previous.sequence + 1,
            message: `Sequence at index ${i} is not greater than previous sequence`
          });
        }
      }
      
      // Check for duplicate timestamps (within 1ms tolerance)
      if (Math.abs(current.timestamp - previous.timestamp) < 1) {
        issues.push({
          type: 'duplicate_timestamp',
          index: i,
          current: current.timestamp,
          expected: previous.timestamp + 1,
          message: `Duplicate timestamp detected at index ${i}`
        });
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      totalTicks: ticks.length
    };
  }

  public validateMarketDataIntegrity(data: MarketData[]): MarketDataValidationResult {
    const issues: MarketDataIssue[] = [];
    
    for (const marketData of data) {
      // Check bid-ask spread
      if (marketData.bids.length > 0 && marketData.asks.length > 0) {
        const bestBid = marketData.bids[0][0];
        const bestAsk = marketData.asks[0][0];
        
        if (bestBid >= bestAsk) {
          issues.push({
            type: 'invalid_spread',
            symbol: marketData.symbol,
            bestBid,
            bestAsk,
            message: `Best bid (${bestBid}) is >= best ask (${bestAsk})`
          });
        }
      }
      
      // Check price ordering in bids (descending)
      for (let i = 1; i < marketData.bids.length; i++) {
        if (marketData.bids[i][0] >= marketData.bids[i - 1][0]) {
          issues.push({
            type: 'invalid_bid_ordering',
            symbol: marketData.symbol,
            level: i,
            message: `Bid price at level ${i} is not less than previous level`
          });
        }
      }
      
      // Check price ordering in asks (ascending)
      for (let i = 1; i < marketData.asks.length; i++) {
        if (marketData.asks[i][0] <= marketData.asks[i - 1][0]) {
          issues.push({
            type: 'invalid_ask_ordering',
            symbol: marketData.symbol,
            level: i,
            message: `Ask price at level ${i} is not greater than previous level`
          });
        }
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      totalMarkets: data.length
    };
  }

  public validateArbitrageBusinessLogic(opportunity: ArbitrageOpportunity): ArbitrageValidationResult {
    const issues: string[] = [];
    
    // Check if exchanges are different
    if (opportunity.exchange1 === opportunity.exchange2) {
      issues.push('Arbitrage must be between different exchanges');
    }
    
    // Check if profit is positive
    if (opportunity.profit <= 0) {
      issues.push('Arbitrage profit must be positive');
    }
    
    // Check confidence bounds
    if (opportunity.confidence < 0 || opportunity.confidence > 1) {
      issues.push('Confidence must be between 0 and 1');
    }
    
    // Check price difference
    const priceDiff = Math.abs(opportunity.price1 - opportunity.price2);
    if (priceDiff <= 0) {
      issues.push('Prices must be different for arbitrage');
    }

    return {
      isValid: issues.length === 0,
      issues,
      opportunity
    };
  }

  private validate<T>(
    data: unknown,
    schema: any,
    typeName: string
  ): ValidationResult<T> {
    const result = schema.safeParse(data);
    
    if (result.success) {
      return {
        isValid: true,
        data: result.data as T,
        errors: []
      };
    } else {
      return {
        isValid: false,
        data: undefined,
        errors: result.error.issues.map(issue => ({
          field: issue.path.join('.'),
          message: issue.message,
          code: issue.code,
          expected: issue.expected,
          received: issue.received
        }))
      };
    }
  }
}

// Type definitions
export interface ValidationResult<T> {
  isValid: boolean;
  data?: T;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
  expected?: any;
  received?: any;
  index?: number;
}

export interface SequenceIssue {
  type: 'timestamp_out_of_order' | 'sequence_out_of_order' | 'duplicate_timestamp';
  index: number;
  current: number;
  expected: number;
  message: string;
}

export interface SequenceValidationResult {
  isValid: boolean;
  issues: SequenceIssue[];
  totalTicks: number;
}

export interface MarketDataIssue {
  type: 'invalid_spread' | 'invalid_bid_ordering' | 'invalid_ask_ordering';
  symbol: string;
  bestBid?: number;
  bestAsk?: number;
  level?: number;
  message: string;
}

export interface MarketDataValidationResult {
  isValid: boolean;
  issues: MarketDataIssue[];
  totalMarkets: number;
}

export interface ArbitrageValidationResult {
  isValid: boolean;
  issues: string[];
  opportunity: ArbitrageOpportunity;
}
