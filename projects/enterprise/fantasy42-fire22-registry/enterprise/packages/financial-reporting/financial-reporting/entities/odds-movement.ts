/**
 * Odds Movement Entity
 * Domain-Driven Design Implementation
 *
 * Tracks betting odds changes over time for financial impact analysis
 */

import { DomainEntity } from '../../shared/domain-entity';
import { DomainError } from '../../shared/domain-entity';

export enum OddsType {
  DECIMAL = 'decimal',
  AMERICAN = 'american',
  FRACTIONAL = 'fractional',
}

export enum MovementType {
  INCREASE = 'increase',
  DECREASE = 'decrease',
  NO_CHANGE = 'no_change',
}

export class OddsMovement extends DomainEntity {
  private readonly _id: string;
  private readonly _eventId: string;
  private readonly _marketId: string;
  private readonly _selectionId: string;
  private readonly _oddsType: OddsType;
  private readonly _previousOdds: number;
  private readonly _currentOdds: number;
  private readonly _movementType: MovementType;
  private readonly _movementPercentage: number;
  private readonly _timestamp: Date;
  private readonly _source: string;
  private readonly _metadata: Record<string, any>;

  constructor(params: OddsMovementParams) {
    super(params.id, new Date(), new Date());
    this.validateOddsMovement(params);

    this._id = params.id;
    this._eventId = params.eventId;
    this._marketId = params.marketId;
    this._selectionId = params.selectionId;
    this._oddsType = params.oddsType;
    this._previousOdds = params.previousOdds;
    this._currentOdds = params.currentOdds;
    this._movementType = this.calculateMovementType(params.previousOdds, params.currentOdds);
    this._movementPercentage = this.calculateMovementPercentage(
      params.previousOdds,
      params.currentOdds
    );
    this._timestamp = new Date(params.timestamp);
    this._source = params.source;
    this._metadata = { ...params.metadata };
  }

  static create(params: {
    eventId: string;
    marketId: string;
    selectionId: string;
    oddsType: OddsType;
    previousOdds: number;
    currentOdds: number;
    timestamp: Date;
    source: string;
    metadata?: Record<string, any>;
  }): OddsMovement {
    const id = `odds_movement_${params.eventId}_${params.marketId}_${params.selectionId}_${Date.now()}`;

    return new OddsMovement({
      id,
      ...params,
    });
  }

  // Getters
  getId(): string {
    return this._id;
  }
  getEventId(): string {
    return this._eventId;
  }
  getMarketId(): string {
    return this._marketId;
  }
  getSelectionId(): string {
    return this._selectionId;
  }
  getOddsType(): OddsType {
    return this._oddsType;
  }
  getPreviousOdds(): number {
    return this._previousOdds;
  }
  getCurrentOdds(): number {
    return this._currentOdds;
  }
  getMovementType(): MovementType {
    return this._movementType;
  }
  getMovementPercentage(): number {
    return this._movementPercentage;
  }
  getTimestamp(): Date {
    return new Date(this._timestamp);
  }
  getSource(): string {
    return this._source;
  }
  getMetadata(): Record<string, any> {
    return { ...this._metadata };
  }

  // Business Logic Methods
  isSignificantMovement(threshold: number = 5.0): boolean {
    return Math.abs(this._movementPercentage) >= threshold;
  }

  getMovementDirection(): 'up' | 'down' | 'stable' {
    if (this._movementType === MovementType.INCREASE) return 'up';
    if (this._movementType === MovementType.DECREASE) return 'down';
    return 'stable';
  }

  getMovementMagnitude(): 'small' | 'medium' | 'large' | 'extreme' {
    const absPercentage = Math.abs(this._movementPercentage);

    if (absPercentage < 2) return 'small';
    if (absPercentage < 5) return 'medium';
    if (absPercentage < 10) return 'large';
    return 'extreme';
  }

  toDecimalOdds(): { previous: number; current: number } {
    return {
      previous: this.convertToDecimal(this._previousOdds),
      current: this.convertToDecimal(this._currentOdds),
    };
  }

  toJSON(): any {
    return {
      id: this._id,
      eventId: this._eventId,
      marketId: this._marketId,
      selectionId: this._selectionId,
      oddsType: this._oddsType,
      previousOdds: this._previousOdds,
      currentOdds: this._currentOdds,
      movementType: this._movementType,
      movementPercentage: this._movementPercentage,
      timestamp: this._timestamp.toISOString(),
      source: this._source,
      metadata: this._metadata,
      isSignificantMovement: this.isSignificantMovement(),
      movementDirection: this.getMovementDirection(),
      movementMagnitude: this.getMovementMagnitude(),
      decimalOdds: this.toDecimalOdds(),
    };
  }

  private calculateMovementType(previous: number, current: number): MovementType {
    const decimalPrevious = this.convertToDecimal(previous);
    const decimalCurrent = this.convertToDecimal(current);

    if (decimalCurrent > decimalPrevious) return MovementType.INCREASE;
    if (decimalCurrent < decimalPrevious) return MovementType.DECREASE;
    return MovementType.NO_CHANGE;
  }

  private calculateMovementPercentage(previous: number, current: number): number {
    const decimalPrevious = this.convertToDecimal(previous);
    const decimalCurrent = this.convertToDecimal(current);

    if (decimalPrevious === 0) return 0;

    return ((decimalCurrent - decimalPrevious) / decimalPrevious) * 100;
  }

  private convertToDecimal(odds: number): number {
    switch (this._oddsType) {
      case OddsType.DECIMAL:
        return odds;
      case OddsType.AMERICAN:
        return odds > 0 ? odds / 100 + 1 : 100 / Math.abs(odds) + 1;
      case OddsType.FRACTIONAL:
        const [numerator, denominator] = odds.toString().split('/').map(Number);
        return numerator / denominator + 1;
      default:
        return odds;
    }
  }

  private validateOddsMovement(params: OddsMovementParams): void {
    if (!params.eventId || !params.marketId || !params.selectionId) {
      throw new DomainError(
        'Event ID, Market ID, and Selection ID are required',
        'INVALID_ODDS_MOVEMENT'
      );
    }

    if (params.previousOdds <= 0 || params.currentOdds <= 0) {
      throw new DomainError('Odds values must be positive', 'INVALID_ODDS_VALUE');
    }

    if (!Object.values(OddsType).includes(params.oddsType)) {
      throw new DomainError('Invalid odds type', 'INVALID_ODDS_TYPE');
    }

    if (!params.timestamp) {
      throw new DomainError('Timestamp is required', 'INVALID_TIMESTAMP');
    }
  }
}

export interface OddsMovementParams {
  id: string;
  eventId: string;
  marketId: string;
  selectionId: string;
  oddsType: OddsType;
  previousOdds: number;
  currentOdds: number;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}
