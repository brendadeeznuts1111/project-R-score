/**
 * Settlement Fees Value Object - Domain-Driven Design
 * Immutable value object representing settlement fee structure
 */

import {
  DomainError,
  ValidationError,
  DomainErrorFactory,
} from '../../../core/errors/domain-errors';
import { DomainLogger, LoggerFactory } from '../../../core/logging/domain-logger';

export interface FeeBreakdown {
  processingFee: number;
  networkFee: number;
  interchangeFee: number;
}

/**
 * SettlementFees Value Object
 * Represents the fee structure for a settlement (immutable)
 */
export class SettlementFees {
  public readonly processingFee: number;
  public readonly networkFee: number;
  public readonly interchangeFee: number;
  public readonly totalFees: number;

  private readonly logger = LoggerFactory.create('settlement-fees-vo');
  private readonly errorFactory = new DomainErrorFactory('settlement-fees');

  constructor(processingFee: number, networkFee: number, interchangeFee: number) {
    this.validateFees(processingFee, networkFee, interchangeFee);

    this.processingFee = processingFee;
    this.networkFee = networkFee;
    this.interchangeFee = interchangeFee;
    this.totalFees = processingFee + networkFee + interchangeFee;

    this.logger.business('Settlement fees value object created', {
      processingFee,
      networkFee,
      interchangeFee,
      totalFees: this.totalFees,
    });
  }

  /**
   * Create fees with percentage-based calculation
   */
  static fromPercentage(
    principalAmount: number,
    processingRate: number,
    networkRate: number,
    interchangeRate: number
  ): SettlementFees {
    const processingFee = principalAmount * processingRate;
    const networkFee = principalAmount * networkRate;
    const interchangeFee = principalAmount * interchangeRate;

    return new SettlementFees(processingFee, networkFee, interchangeFee);
  }

  /**
   * Create fees with fixed amounts
   */
  static fromFixedAmounts(fees: FeeBreakdown): SettlementFees {
    return new SettlementFees(fees.processingFee, fees.networkFee, fees.interchangeFee);
  }

  /**
   * Create zero fees for testing or special cases
   */
  static zero(): SettlementFees {
    return new SettlementFees(0, 0, 0);
  }

  /**
   * Add fees together
   */
  add(other: SettlementFees): SettlementFees {
    return new SettlementFees(
      this.processingFee + other.processingFee,
      this.networkFee + other.networkFee,
      this.interchangeFee + other.interchangeFee
    );
  }

  /**
   * Calculate fee percentage of principal amount
   */
  getFeePercentage(principalAmount: number): number {
    if (principalAmount <= 0) {
      return 0;
    }
    return (this.totalFees / principalAmount) * 100;
  }

  /**
   * Get fee breakdown as percentage
   */
  getPercentageBreakdown(principalAmount: number): {
    processingPercentage: number;
    networkPercentage: number;
    interchangePercentage: number;
    totalPercentage: number;
  } {
    if (principalAmount <= 0) {
      return {
        processingPercentage: 0,
        networkPercentage: 0,
        interchangePercentage: 0,
        totalPercentage: 0,
      };
    }

    return {
      processingPercentage: (this.processingFee / principalAmount) * 100,
      networkPercentage: (this.networkFee / principalAmount) * 100,
      interchangePercentage: (this.interchangeFee / principalAmount) * 100,
      totalPercentage: (this.totalFees / principalAmount) * 100,
    };
  }

  /**
   * Get fee breakdown for reporting
   */
  getBreakdown(): FeeBreakdown & { totalFees: number } {
    return {
      processingFee: this.processingFee,
      networkFee: this.networkFee,
      interchangeFee: this.interchangeFee,
      totalFees: this.totalFees,
    };
  }

  /**
   * Check if fees are zero
   */
  isZero(): boolean {
    return this.totalFees === 0;
  }

  /**
   * Validate fee amounts
   */
  private validateFees(processingFee: number, networkFee: number, interchangeFee: number): void {
    if (processingFee < 0) {
      throw this.errorFactory.validationError(
        'Processing fee cannot be negative',
        'processingFee',
        processingFee
      );
    }

    if (networkFee < 0) {
      throw this.errorFactory.validationError(
        'Network fee cannot be negative',
        'networkFee',
        networkFee
      );
    }

    if (interchangeFee < 0) {
      throw this.errorFactory.validationError(
        'Interchange fee cannot be negative',
        'interchangeFee',
        interchangeFee
      );
    }

    // Check for reasonable fee limits (optional business rule)
    const totalFees = processingFee + networkFee + interchangeFee;
    if (totalFees > 1000) {
      // Example: Max $1000 in fees
      this.logger.business('High fee amount detected', {
        totalFees,
        processingFee,
        networkFee,
        interchangeFee,
      });
    }
  }

  /**
   * Compare fees for equality
   */
  equals(other: SettlementFees): boolean {
    return (
      this.processingFee === other.processingFee &&
      this.networkFee === other.networkFee &&
      this.interchangeFee === other.interchangeFee
    );
  }

  /**
   * String representation for debugging
   */
  toString(): string {
    return `SettlementFees(processing: ${this.processingFee}, network: ${this.networkFee}, interchange: ${this.interchangeFee}, total: ${this.totalFees})`;
  }

  /**
   * JSON representation for serialization
   */
  toJSON(): FeeBreakdown & { totalFees: number } {
    return this.getBreakdown();
  }
}

/**
 * Fee Calculator Utility
 * Helper for common fee calculation patterns
 */
export class FeeCalculator {
  private static readonly STANDARD_RATES = {
    processing: 0.029, // 2.9%
    network: 0.001, // 0.1%
    interchange: 0.015, // 1.5%
  };

  /**
   * Calculate standard settlement fees
   */
  static calculateStandardFees(principalAmount: number): SettlementFees {
    return SettlementFees.fromPercentage(
      principalAmount,
      this.STANDARD_RATES.processing,
      this.STANDARD_RATES.network,
      this.STANDARD_RATES.interchange
    );
  }

  /**
   * Calculate premium settlement fees (higher rates)
   */
  static calculatePremiumFees(principalAmount: number): SettlementFees {
    return SettlementFees.fromPercentage(
      principalAmount,
      this.STANDARD_RATES.processing * 1.2, // 20% higher
      this.STANDARD_RATES.network,
      this.STANDARD_RATES.interchange * 1.1 // 10% higher
    );
  }

  /**
   * Calculate discount settlement fees (lower rates)
   */
  static calculateDiscountFees(principalAmount: number): SettlementFees {
    return SettlementFees.fromPercentage(
      principalAmount,
      this.STANDARD_RATES.processing * 0.8, // 20% lower
      this.STANDARD_RATES.network,
      this.STANDARD_RATES.interchange * 0.9 // 10% lower
    );
  }

  /**
   * Calculate fees for different currencies
   */
  static calculateCurrencyAdjustedFees(
    principalAmount: number,
    currency: string,
    baseFees: SettlementFees
  ): SettlementFees {
    let multiplier = 1.0;

    // Currency-specific adjustments
    switch (currency.toUpperCase()) {
      case 'EUR':
        multiplier = 0.95; // 5% discount for EUR
        break;
      case 'GBP':
        multiplier = 1.05; // 5% premium for GBP
        break;
      case 'CAD':
        multiplier = 1.02; // 2% premium for CAD
        break;
      case 'USD':
      default:
        multiplier = 1.0; // No adjustment for USD
        break;
    }

    return new SettlementFees(
      baseFees.processingFee * multiplier,
      baseFees.networkFee * multiplier,
      baseFees.interchangeFee * multiplier
    );
  }

  /**
   * Validate fee rates are within acceptable ranges
   */
  static validateFeeRates(
    processingRate: number,
    networkRate: number,
    interchangeRate: number
  ): boolean {
    const maxReasonableRate = 0.1; // 10%

    return (
      processingRate >= 0 &&
      processingRate <= maxReasonableRate &&
      networkRate >= 0 &&
      networkRate <= maxReasonableRate &&
      interchangeRate >= 0 &&
      interchangeRate <= maxReasonableRate
    );
  }
}
