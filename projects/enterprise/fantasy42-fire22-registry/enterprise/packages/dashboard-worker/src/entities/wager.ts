/**
 * 🎯 Fire22 Dashboard - Wager Entity Classes
 * Wager domain entity implementations with business logic
 */

import { AuditableEntityClass, ValidationRule } from './base';
import type { Wager, WagerLeg } from '../types/database/entities';
import { SPORTS, BUSINESS } from '../constants';

export class WagerEntity extends AuditableEntityClass implements Wager {
  // Basic wager information
  public wager_number: string;
  public customer_id: string;
  public agent_id: string;

  // Bet details
  public amount_wagered: number;
  public to_win_amount: number;
  public actual_win_amount?: number;
  public odds: number;
  public original_odds: number;

  // Event information
  public event_id?: string;
  public sport:
    | 'football'
    | 'basketball'
    | 'baseball'
    | 'hockey'
    | 'soccer'
    | 'tennis'
    | 'golf'
    | 'mma'
    | 'boxing'
    | 'other';
  public league: string;
  public teams: string;
  public event_datetime: string;

  // Bet specifics
  public bet_type:
    | 'spread'
    | 'moneyline'
    | 'total'
    | 'prop'
    | 'parlay'
    | 'teaser'
    | 'future'
    | 'live';
  public wager_type: string;
  public line?: number;
  public total?: number;
  public selection: string;

  // Status and processing
  public status: 'pending' | 'won' | 'lost' | 'push' | 'void' | 'cancelled';
  public result?: 'win' | 'loss' | 'push' | 'void';
  public graded_at?: string;
  public graded_by?: string;
  public settlement_datetime?: string;

  // Business rules
  public risk_level: 'low' | 'medium' | 'high' | 'critical';
  public max_payout: number;
  public commission_rate: number;
  public volume_amount: number;

  // Additional information
  public ticket_writer: string;
  public short_desc: string;
  public notes?: string;
  public vip: boolean;
  public live_bet: boolean;

  // Parlay information
  public is_parlay: boolean;
  public parlay_legs?: WagerLeg[];
  public parlay_odds?: number;

  // Metadata
  public external_bet_id?: string;
  public source: 'web' | 'mobile' | 'agent' | 'api';
  public device_info?: Record<string, any>;

  constructor(data: Partial<Wager>) {
    super(data);

    // Basic wager information
    this.wager_number = data.wager_number || this.generateWagerNumber();
    this.customer_id = data.customer_id || '';
    this.agent_id = data.agent_id || '';

    // Bet details
    this.amount_wagered = data.amount_wagered || 0;
    this.to_win_amount = data.to_win_amount || 0;
    this.actual_win_amount = data.actual_win_amount;
    this.odds = data.odds || 0;
    this.original_odds = data.original_odds || data.odds || 0;

    // Event information
    this.event_id = data.event_id;
    this.sport = data.sport || 'other';
    this.league = data.league || '';
    this.teams = data.teams || '';
    this.event_datetime = data.event_datetime || '';

    // Bet specifics
    this.bet_type = data.bet_type || 'moneyline';
    this.wager_type = data.wager_type || '';
    this.line = data.line;
    this.total = data.total;
    this.selection = data.selection || '';

    // Status and processing
    this.status = data.status || 'pending';
    this.result = data.result;
    this.graded_at = data.graded_at;
    this.graded_by = data.graded_by;
    this.settlement_datetime = data.settlement_datetime;

    // Business rules
    this.risk_level = data.risk_level || 'low';
    this.max_payout = data.max_payout || this.to_win_amount;
    this.commission_rate = data.commission_rate || 0;
    this.volume_amount = data.volume_amount || this.amount_wagered;

    // Additional information
    this.ticket_writer = data.ticket_writer || '';
    this.short_desc = data.short_desc || '';
    this.notes = data.notes;
    this.vip = data.vip || false;
    this.live_bet = data.live_bet || false;

    // Parlay information
    this.is_parlay = data.is_parlay || false;
    this.parlay_legs = data.parlay_legs || [];
    this.parlay_odds = data.parlay_odds;

    // Metadata
    this.external_bet_id = data.external_bet_id;
    this.source = data.source || 'web';
    this.device_info = data.device_info || {};
  }

  protected getEntityName(): string {
    return 'wager';
  }

  protected getValidationRules(): ValidationRule[] {
    return [
      {
        field: 'wager_number',
        required: true,
        type: 'string',
        minLength: 1,
        maxLength: 50,
      },
      {
        field: 'customer_id',
        required: true,
        type: 'string',
        minLength: 1,
      },
      {
        field: 'agent_id',
        required: true,
        type: 'string',
        minLength: 1,
      },
      {
        field: 'amount_wagered',
        required: true,
        type: 'number',
        min: BUSINESS.BETTING_LIMITS.MIN_BET,
        max: BUSINESS.BETTING_LIMITS.MAX_BET,
      },
      {
        field: 'to_win_amount',
        required: true,
        type: 'number',
        min: 0,
      },
      {
        field: 'odds',
        required: true,
        type: 'number',
        custom: (value: number) => {
          if (value === 0) return 'Odds cannot be zero';
          if (Math.abs(value) < 100) return 'American odds must be at least ±100';
          return true;
        },
      },
      {
        field: 'teams',
        required: true,
        type: 'string',
        minLength: 1,
      },
      {
        field: 'selection',
        required: true,
        type: 'string',
        minLength: 1,
      },
      {
        field: 'event_datetime',
        required: true,
        type: 'string',
        custom: (value: string) => {
          const date = new Date(value);
          return !isNaN(date.getTime()) || 'Invalid event datetime';
        },
      },
    ];
  }

  /**
   * Generate unique wager number
   */
  private generateWagerNumber(): string {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substr(2, 4).toUpperCase();
    return `W${timestamp}${random}`;
  }

  /**
   * Calculate implied probability from odds
   */
  public getImpliedProbability(): number {
    const odds = Math.abs(this.odds);

    if (this.odds > 0) {
      return 100 / (odds + 100);
    } else {
      return odds / (odds + 100);
    }
  }

  /**
   * Convert American odds to decimal
   */
  public getDecimalOdds(): number {
    if (this.odds > 0) {
      return this.odds / 100 + 1;
    } else {
      return 100 / Math.abs(this.odds) + 1;
    }
  }

  /**
   * Check if wager is settled
   */
  public isSettled(): boolean {
    return ['won', 'lost', 'push', 'void'].includes(this.status);
  }

  /**
   * Check if wager is active
   */
  public isActive(): boolean {
    return this.status === 'pending';
  }

  /**
   * Check if event has started
   */
  public hasEventStarted(): boolean {
    return new Date(this.event_datetime) <= new Date();
  }

  /**
   * Check if bet can be cancelled
   */
  public canBeCancelled(): boolean {
    return this.status === 'pending' && !this.hasEventStarted();
  }

  /**
   * Grade the wager as win
   */
  public gradeAsWin(gradedBy: string, actualWinAmount?: number): this {
    if (!this.isActive()) {
      throw new Error('Only active wagers can be graded');
    }

    this.status = 'won';
    this.result = 'win';
    this.actual_win_amount = actualWinAmount || this.to_win_amount;
    this.graded_at = new Date().toISOString();
    this.graded_by = gradedBy;
    this.settlement_datetime = new Date().toISOString();
    this.touch();

    return this;
  }

  /**
   * Grade the wager as loss
   */
  public gradeAsLoss(gradedBy: string): this {
    if (!this.isActive()) {
      throw new Error('Only active wagers can be graded');
    }

    this.status = 'lost';
    this.result = 'loss';
    this.actual_win_amount = 0;
    this.graded_at = new Date().toISOString();
    this.graded_by = gradedBy;
    this.settlement_datetime = new Date().toISOString();
    this.touch();

    return this;
  }

  /**
   * Grade the wager as push
   */
  public gradeAsPush(gradedBy: string): this {
    if (!this.isActive()) {
      throw new Error('Only active wagers can be graded');
    }

    this.status = 'push';
    this.result = 'push';
    this.actual_win_amount = 0; // Push returns original wager
    this.graded_at = new Date().toISOString();
    this.graded_by = gradedBy;
    this.settlement_datetime = new Date().toISOString();
    this.touch();

    return this;
  }

  /**
   * Void the wager
   */
  public void(gradedBy: string, reason?: string): this {
    if (!this.isActive()) {
      throw new Error('Only active wagers can be voided');
    }

    this.status = 'void';
    this.result = 'void';
    this.actual_win_amount = 0;
    this.graded_at = new Date().toISOString();
    this.graded_by = gradedBy;
    this.settlement_datetime = new Date().toISOString();

    if (reason) {
      this.notes = `${this.notes ? this.notes + ' | ' : ''}VOID: ${reason}`;
    }

    this.touch();
    return this;
  }

  /**
   * Cancel the wager
   */
  public cancel(reason?: string): this {
    if (!this.canBeCancelled()) {
      throw new Error('Wager cannot be cancelled');
    }

    this.status = 'cancelled';

    if (reason) {
      this.notes = `${this.notes ? this.notes + ' | ' : ''}CANCELLED: ${reason}`;
    }

    this.touch();
    return this;
  }

  /**
   * Calculate potential payout (wager + win amount)
   */
  public getPotentialPayout(): number {
    return this.amount_wagered + this.to_win_amount;
  }

  /**
   * Calculate actual payout
   */
  public getActualPayout(): number {
    if (!this.isSettled()) return 0;

    if (this.result === 'win') {
      return this.amount_wagered + (this.actual_win_amount || 0);
    } else if (this.result === 'push' || this.result === 'void') {
      return this.amount_wagered; // Return original wager
    }

    return 0; // Loss
  }

  /**
   * Calculate profit/loss
   */
  public getProfitLoss(): number {
    if (!this.isSettled()) return 0;
    return this.getActualPayout() - this.amount_wagered;
  }

  /**
   * Check if odds moved
   */
  public didOddsMove(): boolean {
    return this.odds !== this.original_odds;
  }

  /**
   * Get odds movement
   */
  public getOddsMovement(): number {
    return this.odds - this.original_odds;
  }

  /**
   * Add parlay leg
   */
  public addParlayLeg(leg: WagerLeg): this {
    if (!this.is_parlay) {
      this.is_parlay = true;
      this.parlay_legs = [];
    }

    this.parlay_legs = [...(this.parlay_legs || []), leg];
    this.touch();

    return this;
  }

  /**
   * Calculate parlay odds
   */
  public calculateParlayOdds(): number {
    if (!this.is_parlay || !this.parlay_legs?.length) {
      return this.odds;
    }

    let totalOdds = 1;

    for (const leg of this.parlay_legs) {
      const decimalOdds = leg.odds > 0 ? leg.odds / 100 + 1 : 100 / Math.abs(leg.odds) + 1;
      totalOdds *= decimalOdds;
    }

    // Convert back to American odds
    const americanOdds = totalOdds >= 2 ? (totalOdds - 1) * 100 : -100 / (totalOdds - 1);

    this.parlay_odds = Math.round(americanOdds);
    return this.parlay_odds;
  }

  /**
   * Get wager summary
   */
  public getSummary(): {
    number: string;
    customer: string;
    amount: number;
    toWin: number;
    sport: string;
    teams: string;
    selection: string;
    odds: number;
    status: string;
  } {
    return {
      number: this.wager_number,
      customer: this.customer_id,
      amount: this.amount_wagered,
      toWin: this.to_win_amount,
      sport: this.sport,
      teams: this.teams,
      selection: this.selection,
      odds: this.odds,
      status: this.status,
    };
  }

  /**
   * Check if high risk bet
   */
  public isHighRisk(): boolean {
    return (
      this.risk_level === 'high' ||
      this.risk_level === 'critical' ||
      this.amount_wagered >= BUSINESS.RISK_THRESHOLDS.HIGH_WAGER ||
      this.to_win_amount >= BUSINESS.RISK_THRESHOLDS.HIGH_PAYOUT
    );
  }

  /**
   * Get bet description
   */
  public getBetDescription(): string {
    let description = `${this.teams} - ${this.selection}`;

    if (this.line !== undefined) {
      description += ` ${this.line > 0 ? '+' : ''}${this.line}`;
    }

    if (this.total !== undefined) {
      description += ` (${this.bet_type.toUpperCase()} ${this.total})`;
    }

    return description;
  }

  /**
   * Calculate commission amount
   */
  public getCommissionAmount(): number {
    return this.amount_wagered * (this.commission_rate / 100);
  }

  /**
   * Check if bet is in-play
   */
  public isInPlay(): boolean {
    return this.live_bet && this.hasEventStarted() && this.isActive();
  }
}

export { WagerEntity as Wager };
