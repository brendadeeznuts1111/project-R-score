/**
 * Odds Data Ingestion Service
 * Domain-Driven Design Implementation
 *
 * Handles ingestion of odds movement data from various sources
 * and populates the financial reporting domain with real-time odds information
 */

import { DomainEvents } from '../../shared/events/domain-events';
import { DomainError } from '../../shared/domain-entity';
import { OddsMovement, OddsType } from '../entities/odds-movement';
import { OddsMovementAnalysisService } from './odds-movement-analysis-service';

export interface OddsDataSource {
  sourceId: string;
  sourceType: 'api' | 'feed' | 'manual' | 'fantasy402';
  endpoint?: string;
  credentials?: Record<string, any>;
  pollingInterval: number; // in milliseconds
  isActive: boolean;
}

export interface OddsUpdate {
  eventId: string;
  marketId: string;
  selectionId: string;
  odds: number;
  oddsType: OddsType;
  timestamp: Date;
  source: string;
  metadata?: Record<string, any>;
}

export interface IngestionResult {
  success: boolean;
  movementsCreated: number;
  errors: string[];
  processingTime: number;
  sourceId: string;
}

export class OddsDataIngestionService {
  private dataSources: Map<string, OddsDataSource> = new Map();
  private pollingTimers: Map<string, NodeJS.Timeout> = new Map();
  private isRunning: boolean = false;

  constructor(
    private db: any, // SQLite database connection
    private oddsAnalysisService: OddsMovementAnalysisService,
    private events: DomainEvents = DomainEvents.getInstance()
  ) {}

  /**
   * Register a new odds data source
   */
  registerDataSource(source: OddsDataSource): void {
    this.dataSources.set(source.sourceId, source);

    if (source.isActive) {
      this.startPolling(source.sourceId);
    }

    this.events.publish('OddsDataSourceRegistered', {
      sourceId: source.sourceId,
      sourceType: source.sourceType,
      isActive: source.isActive,
    });
  }

  /**
   * Start polling for a specific data source
   */
  startPolling(sourceId: string): void {
    const source = this.dataSources.get(sourceId);
    if (!source) {
      throw new DomainError(`Data source ${sourceId} not found`, 'SOURCE_NOT_FOUND');
    }

    if (this.pollingTimers.has(sourceId)) {
      this.stopPolling(sourceId);
    }

    const timer = setInterval(async () => {
      try {
        await this.pollDataSource(sourceId);
      } catch (error) {
        console.error(`Error polling data source ${sourceId}:`, error.message);
        this.events.publish('OddsDataSourcePollFailed', {
          sourceId,
          error: error.message,
        });
      }
    }, source.pollingInterval);

    this.pollingTimers.set(sourceId, timer);
    source.isActive = true;

    this.events.publish('OddsDataSourcePollingStarted', { sourceId });
  }

  /**
   * Stop polling for a specific data source
   */
  stopPolling(sourceId: string): void {
    const timer = this.pollingTimers.get(sourceId);
    if (timer) {
      clearInterval(timer);
      this.pollingTimers.delete(sourceId);
    }

    const source = this.dataSources.get(sourceId);
    if (source) {
      source.isActive = false;
    }

    this.events.publish('OddsDataSourcePollingStopped', { sourceId });
  }

  /**
   * Poll data from a specific source
   */
  private async pollDataSource(sourceId: string): Promise<void> {
    const source = this.dataSources.get(sourceId);
    if (!source || !source.isActive) return;

    let updates: OddsUpdate[] = [];

    try {
      switch (source.sourceType) {
        case 'api':
          updates = await this.pollApiSource(source);
          break;
        case 'feed':
          updates = await this.pollFeedSource(source);
          break;
        case 'fantasy402':
          updates = await this.pollFantasy402Source(source);
          break;
        case 'manual':
          // Manual sources don't poll automatically
          return;
        default:
          throw new Error(`Unsupported source type: ${source.sourceType}`);
      }

      if (updates.length > 0) {
        const result = await this.processOddsUpdates(updates, sourceId);
        this.events.publish('OddsDataProcessed', {
          sourceId,
          updatesCount: updates.length,
          movementsCreated: result.movementsCreated,
        });
      }
    } catch (error) {
      this.events.publish('OddsDataSourcePollError', {
        sourceId,
        error: error.message,
      });
      throw error;
    }
  }

  /**
   * Poll API-based odds source
   */
  private async pollApiSource(source: OddsDataSource): Promise<OddsUpdate[]> {
    if (!source.endpoint) {
      throw new Error('API endpoint not configured');
    }

    // Simulated API call - replace with actual implementation
    const response = await this.simulateApiCall(source.endpoint);

    return response.map((item: any) => ({
      eventId: item.eventId,
      marketId: item.marketId,
      selectionId: item.selectionId,
      odds: item.odds,
      oddsType: item.oddsType || OddsType.DECIMAL,
      timestamp: new Date(),
      source: source.sourceId,
      metadata: item.metadata,
    }));
  }

  /**
   * Poll feed-based odds source
   */
  private async pollFeedSource(source: OddsDataSource): Promise<OddsUpdate[]> {
    // Simulated feed polling - replace with actual implementation
    const updates = await this.simulateFeedPolling(source.sourceId);

    return updates.map((item: any) => ({
      eventId: item.eventId,
      marketId: item.marketId,
      selectionId: item.selectionId,
      odds: item.odds,
      oddsType: OddsType.DECIMAL,
      timestamp: new Date(),
      source: source.sourceId,
      metadata: item.metadata,
    }));
  }

  /**
   * Poll Fantasy402 integration for odds data
   */
  private async pollFantasy402Source(source: OddsDataSource): Promise<OddsUpdate[]> {
    // This would integrate with the Fantasy402 XPath integration
    // For now, return simulated data
    const updates: OddsUpdate[] = [];

    try {
      // Simulate extracting odds data from Fantasy402 interface
      const fantasyUpdates = await this.extractOddsFromFantasy402();

      for (const update of fantasyUpdates) {
        updates.push({
          eventId: update.eventId,
          marketId: update.marketId,
          selectionId: update.selectionId,
          odds: update.odds,
          oddsType: OddsType.DECIMAL,
          timestamp: new Date(),
          source: 'fantasy402',
          metadata: {
            extractedFrom: update.elementPath,
            confidence: update.confidence,
          },
        });
      }
    } catch (error) {
      console.warn('Failed to extract odds from Fantasy402:', error.message);
    }

    return updates;
  }

  /**
   * Process odds updates and create movements
   */
  async processOddsUpdates(updates: OddsUpdate[], sourceId: string): Promise<IngestionResult> {
    const startTime = Date.now();
    const errors: string[] = [];
    let movementsCreated = 0;

    for (const update of updates) {
      try {
        // Get the previous odds for this selection
        const previousMovement = await this.getLatestOddsMovement(
          update.eventId,
          update.marketId,
          update.selectionId
        );

        // Only create movement if odds have actually changed
        const previousOdds = previousMovement?.getCurrentOdds() || update.odds;
        const oddsChanged = Math.abs(previousOdds - update.odds) > 0.001; // Small threshold for floating point comparison

        if (oddsChanged) {
          // Create new odds movement
          const movement = OddsMovement.create({
            eventId: update.eventId,
            marketId: update.marketId,
            selectionId: update.selectionId,
            oddsType: update.oddsType,
            previousOdds: previousOdds,
            currentOdds: update.odds,
            timestamp: update.timestamp,
            source: update.source,
            metadata: update.metadata,
          });

          // Save to database
          await this.saveOddsMovement(movement);
          movementsCreated++;

          // Publish movement event
          this.events.publish('OddsMovementRecorded', {
            movementId: movement.getId(),
            eventId: update.eventId,
            marketId: update.marketId,
            previousOdds: previousOdds,
            currentOdds: update.odds,
            movementPercentage: movement.getMovementPercentage(),
          });
        }
      } catch (error) {
        errors.push(
          `Failed to process update for ${update.eventId}/${update.marketId}/${update.selectionId}: ${error.message}`
        );
      }
    }

    const processingTime = Date.now() - startTime;

    const result: IngestionResult = {
      success: errors.length === 0,
      movementsCreated,
      errors,
      processingTime,
      sourceId,
    };

    this.events.publish('OddsUpdatesProcessed', {
      sourceId,
      movementsCreated,
      errorsCount: errors.length,
      processingTime,
    });

    return result;
  }

  /**
   * Manually ingest odds data (for testing/backfilling)
   */
  async ingestManualOddsData(updates: OddsUpdate[]): Promise<IngestionResult> {
    return await this.processOddsUpdates(updates, 'manual');
  }

  /**
   * Generate sample odds data for testing
   */
  async generateSampleOddsData(
    eventCount: number = 5,
    daysBack: number = 7
  ): Promise<OddsUpdate[]> {
    const updates: OddsUpdate[] = [];
    const now = new Date();

    for (let eventIdx = 1; eventIdx <= eventCount; eventIdx++) {
      const eventId = `event_${eventIdx.toString().padStart(3, '0')}`;

      // Generate data for multiple markets per event
      const marketCount = Math.floor(Math.random() * 3) + 1;
      for (let marketIdx = 1; marketIdx <= marketCount; marketIdx++) {
        const marketId = `market_${marketIdx.toString().padStart(2, '0')}`;

        // Generate data for multiple selections per market
        const selectionCount = Math.floor(Math.random() * 3) + 2;
        for (let selectionIdx = 1; selectionIdx <= selectionCount; selectionIdx++) {
          const selectionId = `selection_${selectionIdx.toString().padStart(2, '0')}`;

          // Generate odds movements over time
          let currentOdds = 2.0 + Math.random() * 3; // Base odds between 2.0 and 5.0

          for (let day = daysBack; day >= 0; day--) {
            const timestamp = new Date(now);
            timestamp.setDate(timestamp.getDate() - day);

            // Add some random movements
            const movement = (Math.random() - 0.5) * 0.4; // -0.2 to +0.2 movement
            currentOdds = Math.max(1.1, currentOdds + movement); // Keep odds above 1.1

            // Add multiple updates per day
            const updatesPerDay = Math.floor(Math.random() * 4) + 1;
            for (let updateIdx = 0; updateIdx < updatesPerDay; updateIdx++) {
              const updateTime = new Date(timestamp);
              updateTime.setHours(
                9 + Math.floor(Math.random() * 12), // 9 AM to 9 PM
                Math.floor(Math.random() * 60),
                Math.floor(Math.random() * 60)
              );

              updates.push({
                eventId,
                marketId,
                selectionId,
                odds: currentOdds,
                oddsType: OddsType.DECIMAL,
                timestamp: updateTime,
                source: 'sample_data',
                metadata: {
                  isSample: true,
                  dayOfWeek: updateTime.getDay(),
                  hourOfDay: updateTime.getHours(),
                },
              });
            }
          }
        }
      }
    }

    return updates.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Private helper methods

  private async getLatestOddsMovement(
    eventId: string,
    marketId: string,
    selectionId: string
  ): Promise<OddsMovement | null> {
    const result = await this.db`
      SELECT * FROM odds_movements
      WHERE event_id = ${eventId} AND market_id = ${marketId} AND selection_id = ${selectionId}
      ORDER BY timestamp DESC
      LIMIT 1
    `;

    if (!result) return null;

    return new OddsMovement({
      id: result.id,
      eventId: result.event_id,
      marketId: result.market_id,
      selectionId: result.selection_id,
      oddsType: result.odds_type,
      previousOdds: result.previous_odds,
      currentOdds: result.current_odds,
      timestamp: new Date(result.timestamp),
      source: result.source,
      metadata: JSON.parse(result.metadata || '{}'),
    });
  }

  private async saveOddsMovement(movement: OddsMovement): Promise<void> {
    await this.db`
      INSERT INTO odds_movements (
        id, event_id, market_id, selection_id, odds_type,
        previous_odds, current_odds, movement_type, movement_percentage,
        timestamp, source, metadata
      ) VALUES (
        ${movement.getId()},
        ${movement.getEventId()},
        ${movement.getMarketId()},
        ${movement.getSelectionId()},
        ${movement.getOddsType()},
        ${movement.getPreviousOdds()},
        ${movement.getCurrentOdds()},
        ${movement.getMovementType()},
        ${movement.getMovementPercentage()},
        ${movement.getTimestamp().toISOString()},
        ${movement.getSource()},
        ${JSON.stringify(movement.getMetadata())}
      )
    `;
  }

  private async simulateApiCall(endpoint: string): Promise<any[]> {
    // Simulate API response with realistic odds data
    return [
      {
        eventId: 'event_001',
        marketId: 'market_01',
        selectionId: 'selection_01',
        odds: 2.1 + Math.random() * 0.4,
        metadata: { sport: 'football', league: 'NFL' },
      },
      {
        eventId: 'event_001',
        marketId: 'market_01',
        selectionId: 'selection_02',
        odds: 3.2 + Math.random() * 0.6,
        metadata: { sport: 'football', league: 'NFL' },
      },
    ];
  }

  private async simulateFeedPolling(sourceId: string): Promise<any[]> {
    // Simulate feed data
    return [
      {
        eventId: 'event_002',
        marketId: 'market_01',
        selectionId: 'selection_01',
        odds: 1.8 + Math.random() * 0.3,
        metadata: { feedSource: sourceId },
      },
    ];
  }

  private async extractOddsFromFantasy402(): Promise<any[]> {
    // This would integrate with the actual Fantasy402 XPath integration
    // For now, return empty array
    return [];
  }

  /**
   * Get ingestion service status
   */
  getStatus(): {
    isRunning: boolean;
    activeSources: string[];
    totalSources: number;
  } {
    return {
      isRunning: this.isRunning,
      activeSources: Array.from(this.dataSources.entries())
        .filter(([_, source]) => source.isActive)
        .map(([id, _]) => id),
      totalSources: this.dataSources.size,
    };
  }

  /**
   * Start all registered data sources
   */
  startAllSources(): void {
    this.isRunning = true;
    for (const [sourceId, source] of this.dataSources) {
      if (source.isActive) {
        this.startPolling(sourceId);
      }
    }
    this.events.publish('OddsIngestionStarted', {});
  }

  /**
   * Stop all data sources
   */
  stopAllSources(): void {
    this.isRunning = false;
    for (const sourceId of this.dataSources.keys()) {
      this.stopPolling(sourceId);
    }
    this.events.publish('OddsIngestionStopped', {});
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopAllSources();
    this.dataSources.clear();
    this.pollingTimers.clear();
  }
}

// Factory for creating ingestion services
export class OddsDataIngestionFactory {
  static create(
    db: any,
    oddsAnalysisService: OddsMovementAnalysisService
  ): OddsDataIngestionService {
    return new OddsDataIngestionService(db, oddsAnalysisService);
  }
}
