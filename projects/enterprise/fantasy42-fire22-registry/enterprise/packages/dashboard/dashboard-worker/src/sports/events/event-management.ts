/**
 * Event Management Module
 * Handles sports events lifecycle, scheduling, and status management
 */

import type {
  SportsEvent,
  SportsEventCreate,
  SportsEventUpdate,
  EventFilter,
  SportType,
  LeagueType,
  EventStatus,
  VIPTier,
  RiskLevel,
  BaseEntity,
} from '../core/sports-types';

export class EventManagement {
  private events: Map<string, SportsEvent> = new Map();
  private eventIndex: Map<string, Set<string>> = new Map(); // For efficient filtering

  constructor() {
    this.initializeEventIndex();
  }

  /**
   * Create a new sports event
   */
  createEvent(eventData: SportsEventCreate): SportsEvent {
    const event: SportsEvent = {
      ...eventData,
      id: this.generateEventId(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      createdBy: 'system',
      updatedBy: 'system',
    };

    this.events.set(event.id, event);
    this.updateEventIndex(event);

    console.log(`🏈 Created sports event: ${event.name} (${event.id})`);
    return event;
  }

  /**
   * Update an existing sports event
   */
  updateEvent(eventId: string, updates: SportsEventUpdate): SportsEvent | null {
    const event = this.events.get(eventId);
    if (!event) {
      console.warn(`⚠️ Event not found: ${eventId}`);
      return null;
    }

    // Remove from old index
    this.removeFromEventIndex(event);

    const updatedEvent: SportsEvent = {
      ...event,
      ...updates,
      updatedAt: new Date(),
      updatedBy: 'system',
    };

    this.events.set(eventId, updatedEvent);
    this.updateEventIndex(updatedEvent);

    console.log(`📝 Updated sports event: ${updatedEvent.name} (${eventId})`);
    return updatedEvent;
  }

  /**
   * Delete a sports event
   */
  deleteEvent(eventId: string): boolean {
    const event = this.events.get(eventId);
    if (!event) {
      console.warn(`⚠️ Event not found: ${eventId}`);
      return false;
    }

    this.removeFromEventIndex(event);
    this.events.delete(eventId);

    console.log(`🗑️ Deleted sports event: ${event.name} (${eventId})`);
    return true;
  }

  /**
   * Get event by ID
   */
  getEvent(eventId: string): SportsEvent | null {
    return this.events.get(eventId) || null;
  }

  /**
   * Get all events
   */
  getAllEvents(): SportsEvent[] {
    return Array.from(this.events.values());
  }

  /**
   * Get events by filter criteria
   */
  getEventsByFilter(filter: EventFilter): SportsEvent[] {
    let events = Array.from(this.events.values());

    if (filter.sport) {
      events = events.filter(e => e.sport === filter.sport);
    }

    if (filter.league) {
      events = events.filter(e => e.league === filter.league);
    }

    if (filter.status) {
      events = events.filter(e => e.status === filter.status);
    }

    if (filter.vipTier) {
      events = events.filter(e => e.vipAccess.includes(filter.vipTier!));
    }

    if (filter.riskLevel) {
      events = events.filter(e => e.riskLevel === filter.riskLevel);
    }

    if (filter.dateRange) {
      events = events.filter(
        e => e.startTime >= filter.dateRange!.start && e.startTime <= filter.dateRange!.end
      );
    }

    return events.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  }

  /**
   * Get events by sport
   */
  getEventsBySport(sport: SportType): SportsEvent[] {
    return this.getEventsByFilter({ sport });
  }

  /**
   * Get events accessible to specific VIP tier
   */
  getEventsByVIP(vipTier: VIPTier): SportsEvent[] {
    return this.getEventsByFilter({ vipTier });
  }

  /**
   * Get live events
   */
  getLiveEvents(): SportsEvent[] {
    return this.getEventsByFilter({ status: 'live' });
  }

  /**
   * Get upcoming events
   */
  getUpcomingEvents(hours: number = 24): SportsEvent[] {
    const now = new Date();
    const future = new Date(now.getTime() + hours * 60 * 60 * 1000);

    return this.getEventsByFilter({
      status: 'scheduled',
      dateRange: { start: now, end: future },
    });
  }

  /**
   * Update event status
   */
  updateEventStatus(eventId: string, status: EventStatus, notes?: string): SportsEvent | null {
    return this.updateEvent(eventId, {
      status,
      metadata: {
        ...this.events.get(eventId)?.metadata,
        statusChangeNotes: notes,
        statusChangedAt: new Date(),
      },
    });
  }

  /**
   * Start live event
   */
  startLiveEvent(eventId: string): SportsEvent | null {
    const event = this.events.get(eventId);
    if (!event || event.status !== 'scheduled') {
      console.warn(`⚠️ Cannot start live event: ${eventId} (status: ${event?.status})`);
      return null;
    }

    return this.updateEventStatus(eventId, 'live', 'Event started live');
  }

  /**
   * Complete event
   */
  completeEvent(eventId: string, finalScore?: { home: number; away: number }): SportsEvent | null {
    const event = this.events.get(eventId);
    if (!event || !['live', 'scheduled'].includes(event.status)) {
      console.warn(`⚠️ Cannot complete event: ${eventId} (status: ${event?.status})`);
      return null;
    }

    return this.updateEvent(eventId, {
      status: 'completed',
      endTime: new Date(),
      score: finalScore
        ? {
            homeScore: finalScore.home,
            awayScore: finalScore.away,
            homePeriods: [],
            awayPeriods: [],
            isFinal: true,
            winner:
              finalScore.home > finalScore.away
                ? 'home'
                : finalScore.away > finalScore.home
                  ? 'away'
                  : 'tie',
          }
        : undefined,
      metadata: {
        ...event.metadata,
        completionNotes: 'Event completed successfully',
        completedAt: new Date(),
      },
    });
  }

  /**
   * Cancel event
   */
  cancelEvent(eventId: string, reason: string): SportsEvent | null {
    return this.updateEventStatus(eventId, 'cancelled', `Cancelled: ${reason}`);
  }

  /**
   * Get event statistics
   */
  getEventStats(): {
    total: number;
    bySport: Record<SportType, number>;
    byStatus: Record<EventStatus, number>;
    byLeague: Record<LeagueType, number>;
    liveCount: number;
    upcomingCount: number;
  } {
    const events = this.getAllEvents();

    const stats = {
      total: events.length,
      bySport: {} as Record<SportType, number>,
      byStatus: {} as Record<EventStatus, number>,
      byLeague: {} as Record<LeagueType, number>,
      liveCount: 0,
      upcomingCount: 0,
    };

    events.forEach(event => {
      // Count by sport
      stats.bySport[event.sport] = (stats.bySport[event.sport] || 0) + 1;

      // Count by status
      stats.byStatus[event.status] = (stats.byStatus[event.status] || 0) + 1;

      // Count by league
      stats.byLeague[event.league] = (stats.byLeague[event.league] || 0) + 1;

      // Count live and upcoming
      if (event.status === 'live') stats.liveCount++;
      if (event.status === 'scheduled' && event.startTime > new Date()) stats.upcomingCount++;
    });

    return stats;
  }

  /**
   * Search events by name or team
   */
  searchEvents(query: string): SportsEvent[] {
    const lowercaseQuery = query.toLowerCase();
    return this.getAllEvents().filter(
      event =>
        event.name.toLowerCase().includes(lowercaseQuery) ||
        event.homeTeam.toLowerCase().includes(lowercaseQuery) ||
        event.awayTeam.toLowerCase().includes(lowercaseQuery) ||
        event.league.toLowerCase().includes(lowercaseQuery)
    );
  }

  /**
   * Initialize default events for demonstration
   */
  initializeDefaultEvents(): void {
    const defaultEvents: SportsEventCreate[] = [
      {
        name: 'NFL Championship',
        sport: 'football',
        league: 'NFL',
        homeTeam: 'Kansas City Chiefs',
        awayTeam: 'San Francisco 49ers',
        startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
        status: 'scheduled',
        odds: {
          id: 'odds-nfl-001',
          eventId: 'will-be-set',
          moneyline: { homeWin: 2.1, awayWin: 1.85 },
          spread: { homeSpread: -3.5, homeOdds: 1.95, awaySpread: 3.5, awayOdds: 1.95 },
          overUnder: { total: 48.5, overOdds: 1.9, underOdds: 1.9 },
          specialBets: [
            {
              id: 'sb1',
              name: 'First Touchdown',
              description: 'First TD scorer',
              category: 'player_props',
              odds: 8.5,
              riskLevel: 'medium',
              maxBet: 1000,
              minBet: 10,
              isLive: false,
            },
          ],
          lastUpdated: new Date(),
          source: 'internal',
          confidence: 85,
          movement: [],
        },
        riskLevel: 'medium',
        vipAccess: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      },
      {
        name: 'NBA Finals',
        sport: 'basketball',
        league: 'NBA',
        homeTeam: 'Los Angeles Lakers',
        awayTeam: 'Boston Celtics',
        startTime: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        status: 'scheduled',
        odds: {
          id: 'odds-nba-001',
          eventId: 'will-be-set',
          moneyline: { homeWin: 1.95, awayWin: 2.05 },
          spread: { homeSpread: -2.0, homeOdds: 1.9, awaySpread: 2.0, awayOdds: 1.9 },
          overUnder: { total: 220.5, overOdds: 1.9, underOdds: 1.9 },
          specialBets: [
            {
              id: 'sb2',
              name: 'Player Points',
              description: 'LeBron 30+ points',
              category: 'player_props',
              odds: 4.5,
              riskLevel: 'medium',
              maxBet: 1500,
              minBet: 20,
              isLive: false,
            },
          ],
          lastUpdated: new Date(),
          source: 'internal',
          confidence: 78,
          movement: [],
        },
        riskLevel: 'low',
        vipAccess: ['bronze', 'silver', 'gold', 'platinum', 'diamond'],
      },
    ];

    defaultEvents.forEach(eventData => {
      const event = this.createEvent(eventData);
      // Update odds with correct event ID
      if (event.odds) {
        event.odds.eventId = event.id;
        this.updateEvent(event.id, { odds: event.odds });
      }
    });

    console.log(`✅ Initialized ${defaultEvents.length} default sports events`);
  }

  // Private helper methods

  private generateEventId(): string {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeEventIndex(): void {
    // Initialize index maps for efficient filtering
    const sports = [
      'football',
      'basketball',
      'baseball',
      'soccer',
      'tennis',
      'golf',
      'racing',
      'esports',
    ];
    const statuses: EventStatus[] = [
      'scheduled',
      'live',
      'completed',
      'cancelled',
      'postponed',
      'suspended',
    ];

    sports.forEach(sport => this.eventIndex.set(`sport_${sport}`, new Set()));
    statuses.forEach(status => this.eventIndex.set(`status_${status}`, new Set()));
  }

  private updateEventIndex(event: SportsEvent): void {
    // Add event to relevant index sets
    this.addToIndexSet(`sport_${event.sport}`, event.id);
    this.addToIndexSet(`status_${event.status}`, event.id);
  }

  private removeFromEventIndex(event: SportsEvent): void {
    // Remove event from all index sets
    this.removeFromIndexSet(`sport_${event.sport}`, event.id);
    this.removeFromIndexSet(`status_${event.status}`, event.id);
  }

  private addToIndexSet(indexKey: string, eventId: string): void {
    if (!this.eventIndex.has(indexKey)) {
      this.eventIndex.set(indexKey, new Set());
    }
    this.eventIndex.get(indexKey)!.add(eventId);
  }

  private removeFromIndexSet(indexKey: string, eventId: string): void {
    const indexSet = this.eventIndex.get(indexKey);
    if (indexSet) {
      indexSet.delete(eventId);
    }
  }
}
