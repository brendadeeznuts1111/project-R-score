/**
 * Fantasy Bet Entity
 * Domain-Driven Design Implementation
 *
 * Represents a bet from the external Fantasy402 system
 * in our internal domain format.
 */

import { DomainEntity, DomainError } from '/Users/nolarose/ff/src/domains/shared/domain-entity';
import type { ExternalBet } from '../adapters/fantasy402-adapter';
import { Money } from '/Users/nolarose/ff/src/domains/collections/entities/payment';
import { v5 as uuidv5 } from 'uuid';

export type BetStatus =
  | 'pending'
  | 'accepted'
  | 'rejected'
  | 'won'
  | 'lost'
  | 'cancelled'
  | 'settled';
export type BetResult = 'won' | 'lost' | 'cancelled';
export type BetType = 'moneyline' | 'spread' | 'total' | 'parlay' | 'teaser' | 'prop';

export class FantasyBet extends DomainEntity {
  private constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    private readonly externalId: string,
    private readonly agentId: string,
    private readonly eventId: string,
    private betType: BetType,
    private amount: Money,
    private odds: number,
    private readonly selection: string,
    private status: BetStatus,
    private readonly customerId?: string,
    private result?: BetResult,
    private payout?: Money,
    private settledAt?: Date,
    private metadata: Record<string, any> = {}
  ) {
    super(id, createdAt, updatedAt);
  }

  static fromExternalData(data: ExternalBet): FantasyBet {
    const now = new Date();
    const currency = 'USD'; // Assuming USD as default

    // Generate deterministic ID based on external bet ID for idempotent imports
    const id = uuidv5(data.betId, uuidv5.URL);

    return new FantasyBet(
      id,
      new Date(data.placedAt),
      now,
      data.betId,
      data.agentId,
      data.eventId,
      this.mapExternalBetType(data.betType),
      Money.create(data.amount, currency),
      data.odds,
      data.selection,
      this.mapExternalStatus(data.status),
      data.customerId,
      data.result,
      data.payout ? Money.create(data.payout, currency) : undefined,
      data.settledAt ? new Date(data.settledAt) : undefined,
      data.metadata || {}
    );
  }

  private static mapExternalBetType(externalType: string): BetType {
    const typeMap: Record<string, BetType> = {
      moneyline: 'moneyline',
      spread: 'spread',
      total: 'total',
      parlay: 'parlay',
      teaser: 'teaser',
      prop: 'prop',
      proposition: 'prop',
    };

    return typeMap[externalType.toLowerCase()] || 'moneyline';
  }

  private static generateDeterministicId(externalId: string): string {
    // Use SHA-256 hash of external ID + namespace for deterministic UUID-like ID
    const namespace = 'fantasy-bet';
    const input = `${namespace}:${externalId}`;
    const hash = new Bun.CryptoHasher('sha256');
    hash.update(input);
    const hashBytes = hash.digest();

    // Convert first 16 bytes to UUID format
    const bytes = new Uint8Array(hashBytes.slice(0, 16));
    // Set version (4) and variant bits for UUID v4 format
    bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
    bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10

    // Format as UUID string
    const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0'));
    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10, 16).join('')}`;
  }

  private static mapExternalStatus(externalStatus: string): BetStatus {
    const statusMap: Record<string, BetStatus> = {
      pending: 'pending',
      accepted: 'accepted',
      rejected: 'rejected',
      won: 'won',
      lost: 'lost',
      cancelled: 'cancelled',
      settled: 'settled',
    };

    return statusMap[externalStatus.toLowerCase()] || 'pending';
  }

  // Business methods
  accept(): void {
    if (this.status !== 'pending') {
      throw new DomainError('Can only accept pending bets', 'INVALID_STATUS_TRANSITION');
    }

    this.status = 'accepted';
    this.markAsModified();
  }

  reject(reason?: string): void {
    if (this.status !== 'pending') {
      throw new DomainError('Can only reject pending bets', 'INVALID_STATUS_TRANSITION');
    }

    this.status = 'rejected';
    if (reason) {
      this.addMetadata('rejection_reason', reason);
    }
    this.markAsModified();
  }

  cancel(reason?: string): void {
    if (this.status === 'settled' || this.status === 'cancelled') {
      throw new DomainError(
        'Cannot cancel settled or already cancelled bets',
        'INVALID_STATUS_TRANSITION'
      );
    }

    this.status = 'cancelled';
    this.result = 'cancelled';
    this.settledAt = new Date();

    if (reason) {
      this.addMetadata('cancellation_reason', reason);
    }

    this.markAsModified();
  }

  settle(result: BetResult, payoutAmount?: number): void {
    if (this.status !== 'accepted') {
      throw new DomainError('Can only settle accepted bets', 'INVALID_STATUS_TRANSITION');
    }

    this.status = 'settled';
    this.result = result;
    this.settledAt = new Date();

    if (payoutAmount !== undefined) {
      const currency = this.amount.getCurrency();
      this.payout = Money.create(payoutAmount, currency);
    }

    this.markAsModified();
  }

  updateOdds(newOdds: number): void {
    if (this.status !== 'pending' && this.status !== 'accepted') {
      throw new DomainError('Cannot update odds for processed bets', 'INVALID_STATUS_UPDATE');
    }

    this.odds = newOdds;
    this.markAsModified();
  }

  addMetadata(key: string, value: any): void {
    this.metadata[key] = value;
    this.markAsModified();
  }

  // Getters
  getExternalId(): string {
    return this.externalId;
  }
  getAgentId(): string {
    return this.agentId;
  }
  getCustomerId(): string | undefined {
    return this.customerId;
  }
  getEventId(): string {
    return this.eventId;
  }
  getBetType(): BetType {
    return this.betType;
  }
  getAmount(): Money {
    return this.amount;
  }
  getOdds(): number {
    return this.odds;
  }
  getSelection(): string {
    return this.selection;
  }
  getStatus(): BetStatus {
    return this.status;
  }
  getResult(): BetResult | undefined {
    return this.result;
  }
  getPayout(): Money | undefined {
    return this.payout;
  }
  getSettledAt(): Date | undefined {
    return this.settledAt;
  }
  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  // Business rules
  isPending(): boolean {
    return this.status === 'pending';
  }

  isAccepted(): boolean {
    return this.status === 'accepted';
  }

  isSettled(): boolean {
    return this.status === 'settled';
  }

  isWon(): boolean {
    return this.result === 'won';
  }

  isLost(): boolean {
    return this.result === 'lost';
  }

  isCancelled(): boolean {
    return this.result === 'cancelled';
  }

  getPotentialPayout(): Money {
    // Guard against invalid odds values
    if (this.odds === 0) {
      throw new DomainError('Invalid odds: cannot calculate payout with zero odds', 'INVALID_ODDS');
    }

    // Handle European decimal odds (typically > 1.0)
    if (this.odds > 1 && this.odds < 2) {
      // Likely European decimal odds (1.5 = +150 American)
      const decimalOdds = this.odds;
      const payoutAmount = this.amount.getAmount() * (decimalOdds - 1);
      return Money.create(payoutAmount, this.amount.getCurrency());
    }

    // Handle American odds
    if (this.odds >= 100) {
      // American odds (positive) - +150 means $100 bet wins $150
      const payoutAmount = (this.amount.getAmount() * this.odds) / 100;
      return Money.create(payoutAmount, this.amount.getCurrency());
    } else if (this.odds > 0) {
      // American odds (negative) - -150 means bet $150 to win $100
      const payoutAmount = (this.amount.getAmount() * 100) / Math.abs(this.odds);
      return Money.create(payoutAmount, this.amount.getCurrency());
    } else {
      // Handle negative American odds properly
      const payoutAmount = (this.amount.getAmount() * 100) / Math.abs(this.odds);
      return Money.create(payoutAmount, this.amount.getCurrency());
    }
  }

  getTotalPayout(): Money {
    if (!this.payout) {
      return this.amount; // Return original stake if no payout
    }

    return this.payout.add(this.amount); // Stake + winnings
  }

  getProfit(): number {
    if (!this.payout) return 0;

    if (this.isWon()) {
      return this.payout.getAmount();
    } else if (this.isLost()) {
      return -this.amount.getAmount();
    }

    return 0;
  }

  canBeModified(): boolean {
    return this.status === 'pending';
  }

  requiresApproval(): boolean {
    // Business rule: large bets require approval
    return this.amount.getAmount() > 1000;
  }

  getBetSummary(): {
    betId: string;
    agentId: string;
    eventId: string;
    type: BetType;
    amount: number;
    odds: number;
    selection: string;
    status: BetStatus;
    potentialPayout: number;
    actualPayout?: number;
    profit?: number;
  } {
    return {
      betId: this.externalId,
      agentId: this.agentId,
      eventId: this.eventId,
      type: this.betType,
      amount: this.amount.getAmount(),
      odds: this.odds,
      selection: this.selection,
      status: this.status,
      potentialPayout: this.getPotentialPayout().getAmount(),
      actualPayout: this.payout?.getAmount(),
      profit: this.getProfit(),
    };
  }

  toJSON(): any {
    return {
      id: this.getId(),
      externalId: this.externalId,
      agentId: this.agentId,
      customerId: this.customerId,
      eventId: this.eventId,
      betType: this.betType,
      amount: {
        amount: this.amount.getAmount(),
        currency: this.amount.getCurrency(),
      },
      odds: this.odds,
      selection: this.selection,
      status: this.status,
      result: this.result,
      payout: this.payout
        ? {
            amount: this.payout.getAmount(),
            currency: this.payout.getCurrency(),
          }
        : undefined,
      settledAt: this.settledAt?.toISOString(),
      metadata: this.metadata,
      createdAt: this.getCreatedAt().toISOString(),
      updatedAt: this.getUpdatedAt().toISOString(),
    };
  }
}
