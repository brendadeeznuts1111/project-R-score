#!/usr/bin/env bun

/**
 * 🚀 Precise Mathematical Operations for Enterprise Financial Calculations
 *
 * Bun 1.1.x+ optimized implementation of precise mathematical operations
 * specifically designed for financial calculations to avoid floating-point errors
 *
 * Features:
 * - Precise sum operations (Math.sumPrecise equivalent)
 * - Decimal precision handling
 * - Financial rounding rules
 * - Currency conversion precision
 * - Statistical calculations with precision
 */

export interface PrecisionConfig {
  decimalPlaces: number;
  roundingMode: 'round' | 'ceil' | 'floor' | 'trunc';
  currencyCode?: string;
  scaleFactor?: number;
}

export interface CalculationResult {
  value: number;
  precision: number;
  originalValues: number[];
  calculationMetadata: {
    method: string;
    precisionConfig: PrecisionConfig;
    calculationTime: number;
    errorMargin: number;
  };
}

export class PreciseMath {
  private static readonly DEFAULT_PRECISION: PrecisionConfig = {
    decimalPlaces: 2,
    roundingMode: 'round',
    scaleFactor: 100, // For currency calculations (cents)
  };

  private static readonly MAX_PRECISION = 15; // Maximum decimal places for precision

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Precise sum calculation (Math.sumPrecise equivalent)
   * Handles floating-point precision issues in financial calculations
   */
  static sumPrecise(values: number[], config: Partial<PrecisionConfig> = {}): CalculationResult {
    const startTime = performance.now();
    const precisionConfig = { ...PreciseMath.DEFAULT_PRECISION, ...config };
    const scaleFactor = precisionConfig.scaleFactor || Math.pow(10, precisionConfig.decimalPlaces);

    // Convert to integers for precise calculation
    const scaledValues = values.map(value => Math.round(value * scaleFactor));
    const scaledSum = scaledValues.reduce((sum, value) => sum + value, 0);

    // Convert back to decimal with proper precision
    const preciseSum = scaledSum / scaleFactor;
    const roundedSum = PreciseMath.roundToPrecision(preciseSum, precisionConfig);

    // Calculate error margin
    const expectedSum = values.reduce((sum, value) => sum + value, 0);
    const errorMargin = Math.abs(roundedSum - expectedSum);

    const calculationTime = performance.now() - startTime;

    return {
      value: roundedSum,
      precision: precisionConfig.decimalPlaces,
      originalValues: [...values],
      calculationMetadata: {
        method: 'sumPrecise',
        precisionConfig,
        calculationTime,
        errorMargin,
      },
    };
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Precise sum with adaptive precision
   * Automatically adjusts precision based on input values
   */
  static sumAdaptive(values: number[]): CalculationResult {
    if (values.length === 0) {
      return PreciseMath.sumPrecise([], { decimalPlaces: 2 });
    }

    // Analyze decimal precision of input values
    const decimalPrecisions = values.map(value => PreciseMath.getDecimalPrecision(value));
    const maxPrecision = Math.max(...decimalPrecisions);
    const adaptivePrecision = Math.min(maxPrecision + 1, PreciseMath.MAX_PRECISION);

    return PreciseMath.sumPrecise(values, {
      decimalPlaces: adaptivePrecision,
      roundingMode: 'round',
    });
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Financial sum with currency precision
   * Specialized for currency calculations with proper rounding
   */
  static sumCurrency(values: number[], currencyCode: string = 'USD'): CalculationResult {
    const currencyConfig: PrecisionConfig = {
      decimalPlaces: PreciseMath.getCurrencyPrecision(currencyCode),
      roundingMode: 'round',
      currencyCode,
      scaleFactor: Math.pow(10, PreciseMath.getCurrencyPrecision(currencyCode)),
    };

    return PreciseMath.sumPrecise(values, currencyConfig);
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Precise average calculation
   */
  static averagePrecise(values: number[], config: Partial<PrecisionConfig> = {}): CalculationResult {
    if (values.length === 0) {
      throw new Error('Cannot calculate average of empty array');
    }

    const sumResult = PreciseMath.sumPrecise(values, config);
    const average = sumResult.value / values.length;

    return {
      value: PreciseMath.roundToPrecision(average, { ...PreciseMath.DEFAULT_PRECISION, ...config }),
      precision: config.decimalPlaces || PreciseMath.DEFAULT_PRECISION.decimalPlaces,
      originalValues: values,
      calculationMetadata: {
        method: 'averagePrecise',
        precisionConfig: { ...PreciseMath.DEFAULT_PRECISION, ...config },
        calculationTime: sumResult.calculationMetadata.calculationTime,
        errorMargin: sumResult.calculationMetadata.errorMargin / values.length,
      },
    };
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Precise percentage calculation
   */
  static percentagePrecise(value: number, total: number, config: Partial<PrecisionConfig> = {}): CalculationResult {
    if (total === 0) {
      throw new Error('Cannot calculate percentage with zero total');
    }

    const percentage = (value / total) * 100;
    const roundedPercentage = PreciseMath.roundToPrecision(percentage, { ...PreciseMath.DEFAULT_PRECISION, ...config });

    return {
      value: roundedPercentage,
      precision: config.decimalPlaces || PreciseMath.DEFAULT_PRECISION.decimalPlaces,
      originalValues: [value, total],
      calculationMetadata: {
        method: 'percentagePrecise',
        precisionConfig: { ...PreciseMath.DEFAULT_PRECISION, ...config },
        calculationTime: performance.now(),
        errorMargin: Math.abs(roundedPercentage - percentage),
      },
    };
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Precise multiplication for financial calculations
   */
  static multiplyPrecise(a: number, b: number, config: Partial<PrecisionConfig> = {}): CalculationResult {
    const startTime = performance.now();
    const precisionConfig = { ...PreciseMath.DEFAULT_PRECISION, ...config };
    const scaleFactor = precisionConfig.scaleFactor || Math.pow(10, precisionConfig.decimalPlaces);

    // Scale up for precise calculation
    const scaledA = Math.round(a * scaleFactor);
    const scaledB = Math.round(b * scaleFactor);
    const scaledProduct = scaledA * scaledB;

    // Scale down with proper precision
    const preciseProduct = scaledProduct / (scaleFactor * scaleFactor);
    const roundedProduct = PreciseMath.roundToPrecision(preciseProduct, precisionConfig);

    const calculationTime = performance.now() - startTime;
    const expectedProduct = a * b;
    const errorMargin = Math.abs(roundedProduct - expectedProduct);

    return {
      value: roundedProduct,
      precision: precisionConfig.decimalPlaces,
      originalValues: [a, b],
      calculationMetadata: {
        method: 'multiplyPrecise',
        precisionConfig,
        calculationTime,
        errorMargin,
      },
    };
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Precise division for financial calculations
   */
  static dividePrecise(a: number, b: number, config: Partial<PrecisionConfig> = {}): CalculationResult {
    if (b === 0) {
      throw new Error('Division by zero');
    }

    const startTime = performance.now();
    const precisionConfig = { ...PreciseMath.DEFAULT_PRECISION, ...config };
    const scaleFactor = precisionConfig.scaleFactor || Math.pow(10, precisionConfig.decimalPlaces);

    // Scale up for precise calculation
    const scaledA = Math.round(a * scaleFactor);
    const preciseQuotient = scaledA / b;
    const roundedQuotient = PreciseMath.roundToPrecision(preciseQuotient, precisionConfig);

    const calculationTime = performance.now() - startTime;
    const expectedQuotient = a / b;
    const errorMargin = Math.abs(roundedQuotient - expectedQuotient);

    return {
      value: roundedQuotient,
      precision: precisionConfig.decimalPlaces,
      originalValues: [a, b],
      calculationMetadata: {
        method: 'dividePrecise',
        precisionConfig,
        calculationTime,
        errorMargin,
      },
    };
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Precise compound interest calculation
   */
  static compoundInterestPrecise(
    principal: number,
    rate: number,
    periods: number,
    config: Partial<PrecisionConfig> = {}
  ): CalculationResult {
    const startTime = performance.now();

    // Use precise multiplication and exponentiation
    const factor = Math.pow(1 + rate, periods);
    const compoundResult = PreciseMath.multiplyPrecise(principal, factor, config);

    const calculationTime = performance.now() - startTime;

    return {
      value: compoundResult.value,
      precision: compoundResult.precision,
      originalValues: [principal, rate, periods],
      calculationMetadata: {
        method: 'compoundInterestPrecise',
        precisionConfig: { ...PreciseMath.DEFAULT_PRECISION, ...config },
        calculationTime,
        errorMargin: compoundResult.calculationMetadata.errorMargin,
      },
    };
  }

  /**
   * 🚀 BUN 1.1.X OPTIMIZATION: Precise weighted average
   */
  static weightedAveragePrecise(
    values: number[],
    weights: number[],
    config: Partial<PrecisionConfig> = {}
  ): CalculationResult {
    if (values.length !== weights.length) {
      throw new Error('Values and weights arrays must have the same length');
    }

    const startTime = performance.now();

    // Calculate weighted sum
    const weightedProducts = values.map((value, index) =>
      PreciseMath.multiplyPrecise(value, weights[index], config)
    );

    const weightedSumResult = PreciseMath.sumPrecise(
      weightedProducts.map(result => result.value),
      config
    );

    // Calculate sum of weights
    const weightsSumResult = PreciseMath.sumPrecise(weights, { decimalPlaces: 6 });

    // Calculate weighted average
    const weightedAverageResult = PreciseMath.dividePrecise(
      weightedSumResult.value,
      weightsSumResult.value,
      config
    );

    const calculationTime = performance.now() - startTime;

    return {
      value: weightedAverageResult.value,
      precision: weightedAverageResult.precision,
      originalValues: [...values, ...weights],
      calculationMetadata: {
        method: 'weightedAveragePrecise',
        precisionConfig: { ...PreciseMath.DEFAULT_PRECISION, ...config },
        calculationTime,
        errorMargin: weightedAverageResult.calculationMetadata.errorMargin,
      },
    };
  }

  // Helper methods

  /**
   * Get decimal precision of a number
   */
  private static getDecimalPrecision(value: number): number {
    if (!isFinite(value)) return 0;

    const stringValue = value.toString();
    const decimalIndex = stringValue.indexOf('.');

    if (decimalIndex === -1) return 0;

    // Handle scientific notation
    const scientificIndex = stringValue.indexOf('e');
    if (scientificIndex !== -1) {
      const exponent = parseInt(stringValue.slice(scientificIndex + 1));
      return Math.max(0, decimalIndex - scientificIndex + exponent);
    }

    return stringValue.length - decimalIndex - 1;
  }

  /**
   * Get currency precision for common currencies
   */
  private static getCurrencyPrecision(currencyCode: string): number {
    const currencyPrecisions: Record<string, number> = {
      'BHD': 3, // Bahraini Dinar
      'BIF': 0, // Burundian Franc
      'CLF': 4, // Chilean Unit of Account
      'CLP': 0, // Chilean Peso
      'DJF': 0, // Djiboutian Franc
      'GNF': 0, // Guinean Franc
      'ISK': 0, // Icelandic Krona
      'JOD': 3, // Jordanian Dinar
      'JPY': 0, // Japanese Yen
      'KMF': 0, // Comorian Franc
      'KRW': 0, // South Korean Won
      'KWD': 3, // Kuwaiti Dinar
      'LYD': 3, // Libyan Dinar
      'OMR': 3, // Omani Rial
      'PYG': 0, // Paraguayan Guarani
      'RWF': 0, // Rwandan Franc
      'TND': 3, // Tunisian Dinar
      'UGX': 0, // Ugandan Shilling
      'UYI': 0, // Uruguayan Peso in Indexed Units
      'VND': 0, // Vietnamese Dong
      'VUV': 0, // Vanuatu Vatu
      'XAF': 0, // Central African CFA Franc
      'XOF': 0, // West African CFA Franc
      'XPF': 0, // CFP Franc
    };

    return currencyPrecisions[currencyCode] ?? 2; // Default to 2 decimal places
  }

  /**
   * Round to specified precision
   */
  private static roundToPrecision(value: number, config: PrecisionConfig): number {
    const factor = Math.pow(10, config.decimalPlaces);

    switch (config.roundingMode) {
      case 'ceil':
        return Math.ceil(value * factor) / factor;
      case 'floor':
        return Math.floor(value * factor) / factor;
      case 'trunc':
        return Math.trunc(value * factor) / factor;
      case 'round':
      default:
        return Math.round(value * factor) / factor;
    }
  }
}

// 🚀 BUN 1.1.X OPTIMIZATION: Extend Math object with precise methods
declare global {
  interface Math {
    sumPrecise(values: number[], config?: Partial<PrecisionConfig>): CalculationResult;
    sumAdaptive(values: number[]): CalculationResult;
    sumCurrency(values: number[], currencyCode?: string): CalculationResult;
  }
}

// Add precise methods to Math object
Math.sumPrecise = PreciseMath.sumPrecise;
Math.sumAdaptive = PreciseMath.sumAdaptive;
Math.sumCurrency = PreciseMath.sumCurrency;

export { PrecisionConfig, CalculationResult };
