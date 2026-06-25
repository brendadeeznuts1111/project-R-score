/**
 * Fantasy Sport Event Entity
 * Domain-Driven Design Implementation
 *
 * Represents a sports event from the external Fantasy402 system
 * in our internal domain format.
 */

import { DomainEntity, DomainError } from '/Users/nolarose/ff/src/domains/shared/domain-entity';
import type { ExternalSportEvent } from '../adapters/fantasy402-adapter';
import { v5 as uuidv5 } from 'uuid';

export type EventStatus = 'scheduled' | 'in_progress' | 'completed' | 'cancelled' | 'postponed';
export type SportType =
  | 'football'
  | 'basketball'
  | 'baseball'
  | 'soccer'
  | 'tennis'
  | 'golf'
  | 'other';

export class FantasySportEvent extends DomainEntity {
  private constructor(
    id: string,
    createdAt: Date,
    updatedAt: Date,
    private readonly externalId: string,
    private readonly sport: SportType,
    private readonly league: string,
    private readonly homeTeam: string,
    private readonly awayTeam: string,
    private readonly startTime: Date,
    private status: EventStatus,
    private odds?: {
      home: number;
      away: number;
      draw?: number;
    },
    private score?: {
      home: number;
      away: number;
    },
    private metadata: Record<string, any> = {}
  ) {
    super(id, createdAt, updatedAt);
  }

  static fromExternalData(data: ExternalSportEvent): FantasySportEvent {
    const now = new Date();
    const startTime = new Date(data.start_time);

    // Map external status to internal status
    const status = this.mapExternalStatus(data.status);

    return new FantasySportEvent(
      uuidv5(data.id, uuidv5.URL),
      now,
      now,
      data.id,
      this.mapExternalSport(data.sport),
      data.league,
      data.home_team,
      data.away_team,
      startTime,
      status,
      data.odds,
      data.score,
      data.metadata || {}
    );
  }

  private static mapExternalStatus(externalStatus: string): EventStatus {
    const statusMap: Record<string, EventStatus> = {
      scheduled: 'scheduled',
      in_progress: 'in_progress',
      live: 'in_progress',
      completed: 'completed',
      finished: 'completed',
      cancelled: 'cancelled',
      postponed: 'postponed',
    };

    return statusMap[externalStatus.toLowerCase()] || 'scheduled';
  }

  private static mapExternalSport(externalSport: string): SportType {
    const sportMap: Record<string, SportType> = {
      football: 'football',
      basketball: 'basketball',
      baseball: 'baseball',
      soccer: 'soccer',
      tennis: 'tennis',
      golf: 'golf',
    };

    return sportMap[externalSport.toLowerCase()] || 'other';
  }

  // Business methods
  updateStatus(newStatus: EventStatus): void {
    if (this.status === 'completed' && newStatus !== 'completed') {
      throw new DomainError('Cannot change status of completed event', 'EVENT_ALREADY_COMPLETED');
    }

    this.status = newStatus;
    this.markAsModified();
  }

  updateScore(homeScore: number, awayScore: number): void {
    if (this.status !== 'in_progress' && this.status !== 'completed') {
      throw new DomainError(
        'Can only update score for in-progress or completed events',
        'INVALID_EVENT_STATUS'
      );
    }

    this.score = { home: homeScore, away: awayScore };
    this.markAsModified();
  }

  updateOdds(home: number, away: number, draw?: number): void {
    this.odds = { home, away, draw };
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
  getSport(): SportType {
    return this.sport;
  }
  getLeague(): string {
    return this.league;
  }
  getHomeTeam(): string {
    return this.homeTeam;
  }
  getAwayTeam(): string {
    return this.awayTeam;
  }
  getStartTime(): Date {
    return this.startTime;
  }
  getEventDate(): Date {
    return this.startTime;
  }
  getStatus(): EventStatus {
    return this.status;
  }
  getOdds(): { home: number; away: number; draw?: number } | undefined {
    return this.odds;
  }
  getScore(): { home: number; away: number } | undefined {
    return this.score;
  }
  getMetadata(): Record<string, any> {
    return { ...this.metadata };
  }

  // Business rules
  isLive(): boolean {
    return this.status === 'in_progress';
  }

  isUpcoming(): boolean {
    return this.status === 'scheduled' && this.startTime > new Date();
  }

  isCompleted(): boolean {
    return this.status === 'completed';
  }

  canAcceptBets(): boolean {
    return this.status === 'scheduled' || this.status === 'in_progress';
  }

  getWinner(): 'home' | 'away' | 'draw' | null {
    if (!this.score || this.status !== 'completed') {
      return null;
    }

    if (this.score.home > this.score.away) return 'home';
    if (this.score.away > this.score.home) return 'away';
    return 'draw';
  }

  getDisplayName(): string {
    return `${this.homeTeam} vs ${this.awayTeam}`;
  }

  getTimeUntilStart(): number {
    return Math.max(0, this.startTime.getTime() - Date.now());
  }

  isStartingSoon(minutes: number = 60): boolean {
    const timeUntilStart = this.getTimeUntilStart();
    return timeUntilStart > 0 && timeUntilStart <= minutes * 60 * 1000;
  }

  toJSON(): any {
    return {
      id: this.getId(),
      externalId: this.externalId,
      sport: this.sport,
      league: this.league,
      homeTeam: this.homeTeam,
      awayTeam: this.awayTeam,
      startTime: this.startTime.toISOString(),
      status: this.status,
      odds: this.odds,
      score: this.score,
      metadata: this.metadata,
      createdAt: this.getCreatedAt().toISOString(),
      updatedAt: this.getUpdatedAt().toISOString(),
    };
  }
}
