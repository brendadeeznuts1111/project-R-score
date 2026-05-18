/**
 * Accounting Period Value Object
 * Domain-Driven Design Implementation
 *
 * Represents a financial accounting period with business rules
 */

import { ValueObject } from '../../shared/value-object';
import { DomainError } from '../../shared/domain-entity';

export enum AccountingPeriodType {
  MONTHLY = 'monthly',
  QUARTERLY = 'quarterly',
  ANNUAL = 'annual',
  CUSTOM = 'custom',
}

export class AccountingPeriod extends ValueObject {
  private readonly _startDate: Date;
  private readonly _endDate: Date;
  private readonly _periodType: AccountingPeriodType;
  private readonly _fiscalYear: number;
  private readonly _periodNumber: number;
  private readonly _isClosed: boolean;

  constructor(params: AccountingPeriodParams) {
    super();
    this.validatePeriod(params);

    this._startDate = new Date(params.startDate);
    this._endDate = new Date(params.endDate);
    this._periodType = params.periodType;
    this._fiscalYear = params.fiscalYear;
    this._periodNumber = params.periodNumber;
    this._isClosed = params.isClosed ?? false;
  }

  static create(params: {
    startDate: Date;
    endDate: Date;
    periodType: AccountingPeriodType;
    fiscalYear: number;
    periodNumber: number;
    isClosed?: boolean;
  }): AccountingPeriod {
    return new AccountingPeriod(params);
  }

  static fromDates(startDate: Date, endDate: Date, fiscalYear: number): AccountingPeriod {
    const periodType = this.determinePeriodType(startDate, endDate);
    const periodNumber = this.calculatePeriodNumber(startDate, periodType);

    return new AccountingPeriod({
      startDate,
      endDate,
      periodType,
      fiscalYear,
      periodNumber,
    });
  }

  // Getters
  getStartDate(): Date {
    return new Date(this._startDate);
  }
  getEndDate(): Date {
    return new Date(this._endDate);
  }
  getPeriodType(): AccountingPeriodType {
    return this._periodType;
  }
  getFiscalYear(): number {
    return this._fiscalYear;
  }
  getPeriodNumber(): number {
    return this._periodNumber;
  }
  getIsClosed(): boolean {
    return this._isClosed;
  }

  // Business Logic
  getPeriodLength(): number {
    return Math.ceil((this._endDate.getTime() - this._startDate.getTime()) / (1000 * 60 * 60 * 24));
  }

  contains(date: Date): boolean {
    return date >= this._startDate && date <= this._endDate;
  }

  overlaps(other: AccountingPeriod): boolean {
    return this._startDate <= other._endDate && this._endDate >= other._startDate;
  }

  isBefore(other: AccountingPeriod): boolean {
    return this._endDate < other._startDate;
  }

  isAfter(other: AccountingPeriod): boolean {
    return this._startDate > other._endDate;
  }

  canBeClosed(): boolean {
    const now = new Date();
    return !this._isClosed && now > this._endDate;
  }

  getDisplayName(): string {
    const monthNames = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];

    switch (this._periodType) {
      case AccountingPeriodType.MONTHLY:
        return `${monthNames[this._startDate.getMonth()]} ${this._fiscalYear}`;
      case AccountingPeriodType.QUARTERLY:
        return `Q${this._periodNumber} ${this._fiscalYear}`;
      case AccountingPeriodType.ANNUAL:
        return `FY ${this._fiscalYear}`;
      case AccountingPeriodType.CUSTOM:
        return `${this._startDate.toISOString().split('T')[0]} - ${this._endDate.toISOString().split('T')[0]}`;
      default:
        return `${this._periodType} ${this._periodNumber} ${this._fiscalYear}`;
    }
  }

  toJSON(): any {
    return {
      startDate: this._startDate.toISOString(),
      endDate: this._endDate.toISOString(),
      periodType: this._periodType,
      fiscalYear: this._fiscalYear,
      periodNumber: this._periodNumber,
      isClosed: this._isClosed,
      displayName: this.getDisplayName(),
      periodLength: this.getPeriodLength(),
    };
  }

  equals(other: ValueObject): boolean {
    if (!(other instanceof AccountingPeriod)) return false;
    return (
      this._startDate.getTime() === other._startDate.getTime() &&
      this._endDate.getTime() === other._endDate.getTime() &&
      this._periodType === other._periodType &&
      this._fiscalYear === other._fiscalYear &&
      this._periodNumber === other._periodNumber
    );
  }

  private validatePeriod(params: AccountingPeriodParams): void {
    if (params.startDate >= params.endDate) {
      throw new DomainError('Period start date must be before end date', 'INVALID_PERIOD_RANGE');
    }

    if (params.fiscalYear < 2000 || params.fiscalYear > 2100) {
      throw new DomainError('Fiscal year must be between 2000 and 2100', 'INVALID_FISCAL_YEAR');
    }

    if (params.periodNumber < 1) {
      throw new DomainError('Period number must be positive', 'INVALID_PERIOD_NUMBER');
    }

    // Validate period-specific constraints
    switch (params.periodType) {
      case AccountingPeriodType.MONTHLY:
        if (params.periodNumber > 12) {
          throw new DomainError('Monthly period number cannot exceed 12', 'INVALID_PERIOD_NUMBER');
        }
        break;
      case AccountingPeriodType.QUARTERLY:
        if (params.periodNumber > 4) {
          throw new DomainError('Quarterly period number cannot exceed 4', 'INVALID_PERIOD_NUMBER');
        }
        break;
      case AccountingPeriodType.ANNUAL:
        if (params.periodNumber !== 1) {
          throw new DomainError('Annual period number must be 1', 'INVALID_PERIOD_NUMBER');
        }
        break;
    }
  }

  private static determinePeriodType(startDate: Date, endDate: Date): AccountingPeriodType {
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    if (days <= 31) return AccountingPeriodType.MONTHLY;
    if (days <= 93) return AccountingPeriodType.QUARTERLY;
    if (days <= 366) return AccountingPeriodType.ANNUAL;
    return AccountingPeriodType.CUSTOM;
  }

  private static calculatePeriodNumber(startDate: Date, periodType: AccountingPeriodType): number {
    switch (periodType) {
      case AccountingPeriodType.MONTHLY:
        return startDate.getMonth() + 1; // 1-12
      case AccountingPeriodType.QUARTERLY:
        return Math.floor(startDate.getMonth() / 3) + 1; // 1-4
      case AccountingPeriodType.ANNUAL:
        return 1;
      default:
        return 1;
    }
  }
}

export interface AccountingPeriodParams {
  startDate: Date;
  endDate: Date;
  periodType: AccountingPeriodType;
  fiscalYear: number;
  periodNumber: number;
  isClosed?: boolean;
}
