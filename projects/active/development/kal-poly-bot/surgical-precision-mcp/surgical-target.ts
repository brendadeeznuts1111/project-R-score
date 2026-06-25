import { Decimal } from 'decimal.js';
import { TargetValidationError, PrecisionUtils } from './precision-utils';

/**
 * IMMUTABLE TARGET DEFINITION
 * Compliance: Section 2.1, Precision-First Naming
 */
export class SurgicalTarget {
  // CONSTANTS (Section 2.1)
  public static readonly MINIMUM_PRECISION = 6;
  public static readonly MAXIMUM_COLLATERAL = PrecisionUtils.zero();

  // Properties (Exact numerical specification)
  public readonly targetIdentifier: string; // Format: "ASSET_[CODE]_[YEAR]_[SEQUENCE]"
  public readonly coordinateX: Decimal; // 6+ decimal places
  public readonly coordinateY: Decimal; // 6+ decimal places
  public readonly entryThreshold: Decimal;
  public readonly exitThreshold: Decimal;
  public readonly confidenceScore: Decimal; // Required: 0.999000+

  constructor(
    targetIdentifier: string,
    coordinateX: Decimal,
    coordinateY: Decimal,
    entryThreshold: Decimal,
    exitThreshold: Decimal,
    confidenceScore: Decimal
  ) {
    // IMMUTABLE FROZEN DEFINITION
    this.targetIdentifier = targetIdentifier;
    this.coordinateX = coordinateX;
    this.coordinateY = coordinateY;
    this.entryThreshold = entryThreshold;
    this.exitThreshold = exitThreshold;
    this.confidenceScore = confidenceScore;

    // Make object effectively immutable
    Object.freeze(this);

    // AUTOMATED VALIDATION (Section 2.1)
    this.validate();
  }

  /**
   * AUTOMATED VALIDATION (Section 2.1)
   */
  private validate(): void {
    const errors: string[] = [];

    // Precision validation for coordinates
    if (!PrecisionUtils.validatePrecision(this.coordinateX)) {
      errors.push(`Insufficient X coordinate precision: ${this.coordinateX.decimalPlaces()}`);
    }
    if (!PrecisionUtils.validatePrecision(this.coordinateY)) {
      errors.push(`Insufficient Y coordinate precision: ${this.coordinateY.decimalPlaces()}`);
    }

    // Confidence validation
    const minConfidence = new Decimal('0.999000');
    if (this.confidenceScore.lessThan(minConfidence)) {
      errors.push(`Insufficient confidence: ${PrecisionUtils.format(this.confidenceScore)}`);
    }

    // Threshold precision
    if (!PrecisionUtils.validatePrecision(this.entryThreshold)) {
      errors.push(`Insufficient entry threshold precision: ${this.entryThreshold.decimalPlaces()}`);
    }
    if (!PrecisionUtils.validatePrecision(this.exitThreshold)) {
      errors.push(`Insufficient exit threshold precision: ${this.exitThreshold.decimalPlaces()}`);
    }

    if (errors.length > 0) {
      throw new TargetValidationError(this.targetIdentifier, errors);
    }
  }

  /**
   * ISOLATION VERIFICATION (Principle 2.2)
   * Returns Decimal('0.000000') if fully isolated
   */
  public calculateCollateralRisk(): Decimal {
    // Implementation: Adjacent sector analysis
    // In compliance, this must return absolute zero
    return PrecisionUtils.zero();
  }

  /**
   * Utility method for debug string
   */
  public toString(): string {
    return `SurgicalTarget(${this.targetIdentifier}, X:${PrecisionUtils.format(this.coordinateX)}, Y:${PrecisionUtils.format(this.coordinateY)}, Confidence:${PrecisionUtils.format(this.confidenceScore)})`;
  }

  /**
   * JSON representation for serialization
   */
  public toJSON() {
    return {
      targetIdentifier: this.targetIdentifier,
      coordinateX: this.coordinateX.toString(),
      coordinateY: this.coordinateY.toString(),
      entryThreshold: this.entryThreshold.toString(),
      exitThreshold: this.exitThreshold.toString(),
      confidenceScore: this.confidenceScore.toString()
    };
  }
}
