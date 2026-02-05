import { NETWORK_CONFIG, TIME_CONSTANTS, BUSINESS_CONFIG } from '../../../core/src/constants';
import { OddsWebSocketServer } from 'odds-websocket';
import { SharpDetector } from 'odds-ml';
import { ArbitrageDetector } from 'odds-arbitrage';
import { TickSequencer } from 'odds-temporal';
import { DataValidator } from 'odds-validation';
import { MarketDataProcessor } from './processors/market-data';
import { SharpDetectionHandler } from './handlers/sharp-detection';
import { ArbitrageHandler } from './handlers/arbitrage';
import { WebSocketHandler } from './handlers/websocket';

class StreamProcessor {
  private wsServer: OddsWebSocketServer;
  private sharpDetector: SharpDetector;
  private arbitrageDetector: ArbitrageDetector;
  private tickSequencer: TickSequencer;
  private validator: DataValidator;
  private marketDataProcessor: MarketDataProcessor;
  private sharpDetectionHandler: SharpDetectionHandler;
  private arbitrageHandler: ArbitrageHandler;
  private webSocketHandler: WebSocketHandler;

  constructor() {
    // Initialize components
    this.wsServer = new OddsWebSocketServer(NETWORK_CONFIG.DEFAULT_PORTS.STREAM_PROCESSOR);
    this.sharpDetector = new SharpDetector(0.85, 100);
    this.arbitrageDetector = new ArbitrageDetector(0.001);
    this.tickSequencer = new TickSequencer();
    this.validator = new DataValidator();

    // Initialize processors and handlers
    this.marketDataProcessor = new MarketDataProcessor();
    this.sharpDetectionHandler = new SharpDetectionHandler(this.sharpDetector);
    this.arbitrageHandler = new ArbitrageHandler(this.arbitrageDetector);
    this.webSocketHandler = new WebSocketHandler(this.wsServer);
  }

  public async start(): Promise<void> {
    console.log('Starting Stream Processor...');

    try {
      // Start WebSocket server
      this.wsServer.start();

      // Setup event handlers
      this.setupEventHandlers();

      // Start processing loops
      this.startProcessingLoops();

      console.log('Stream Processor started successfully');
    } catch (error) {
      console.error('Failed to start Stream Processor:', error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    // WebSocket message handling
    this.wsServer.on('message', async (message) => {
      await this.handleWebSocketMessage(message);
    });

    // Sharp detection events
    this.sharpDetector.on('sharp-detected', async (result) => {
      await this.sharpDetectionHandler.handle(result);
    });

    // Arbitrage detection events
    this.arbitrageDetector.on('opportunity-found', async (opportunity) => {
      await this.arbitrageHandler.handle(opportunity);
    });
  }

  private async handleWebSocketMessage(message: any): Promise<void> {
    try {
      // Validate message
      const validation = this.validator.validateWebSocketMessage(message);
      if (!validation.isValid) {
        console.error('Invalid message:', validation.errors);
        return;
      }

      // Process based on message type
      switch (message.type) {
        case 'tick':
          await this.processTick(message.data);
          break;
        case 'market-data':
          await this.processMarketData(message.data);
          break;
        case 'subscribe':
          await this.handleSubscription(message.data);
          break;
        case 'unsubscribe':
          await this.handleUnsubscription(message.data);
          break;
        default:
          console.log(`Unknown message type: ${message.type}`);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private async processTick(tickData: any): Promise<void> {
    // Validate tick
    const validation = this.validator.validateOddsTick(tickData);
    if (!validation.isValid) {
      console.error('Invalid tick:', validation.errors);
      return;
    }

    // Sequence the tick
    const sequencedTick = this.tickSequencer.assignSequence(validation.data!);

    // Process for sharp detection
    const sharpResult = this.sharpDetector.detectSharp(sequencedTick);

    // Broadcast to WebSocket clients
    this.wsServer.broadcast({
      type: 'tick',
      data: sequencedTick,
      timestamp: Date.now(),
      sequence: sequencedTick.sequence || 0
    });

    // If sharp detected, broadcast alert
    if (sharpResult.isSharp) {
      this.wsServer.broadcast({
        type: 'sharp-alert',
        data: sharpResult,
        timestamp: Date.now(),
        sequence: 0
      });
    }
  }

  private async processMarketData(marketData: any): Promise<void> {
    // Validate market data
    const validation = this.validator.validateMarketData(marketData);
    if (!validation.isValid) {
      console.error('Invalid market data:', validation.errors);
      return;
    }

    // Process market data
    const processedData = await this.marketDataProcessor.process(validation.data!);

    // Detect arbitrage opportunities
    const opportunities = this.arbitrageDetector.detectOpportunities(
      processedData.ticks
    );

    // Broadcast market data
    this.wsServer.broadcast({
      type: 'market-data',
      data: processedData,
      timestamp: Date.now(),
      sequence: processedData.sequence
    });

    // Broadcast arbitrage opportunities
    if (opportunities.length > 0) {
      this.wsServer.broadcast({
        type: 'arbitrage-opportunities',
        data: opportunities,
        timestamp: Date.now(),
        sequence: 0
      });
    }
  }

  private async handleSubscription(subscriptionData: any): Promise<void> {
    // Handle subscription logic
    console.log('Subscription received:', subscriptionData);

    this.wsServer.broadcast({
      type: 'subscription-confirmed',
      data: subscriptionData,
      timestamp: Date.now(),
      sequence: 0
    });
  }

  private async handleUnsubscription(unsubscriptionData: any): Promise<void> {
    // Handle unsubscription logic
    console.log('Unsubscription received:', unsubscriptionData);

    this.wsServer.broadcast({
      type: 'unsubscription-confirmed',
      data: unsubscriptionData,
      timestamp: Date.now(),
      sequence: 0
    });
  }

  private startProcessingLoops(): void {
    // Start periodic tasks
    setInterval(() => {
      this.performPeriodicTasks();
    }, TIME_CONSTANTS.INTERVALS.ONE_SECOND);

    setInterval(() => {
      this.cleanupOldData();
    }, TIME_CONSTANTS.INTERVALS.ONE_MINUTE);
  }

  private performPeriodicTasks(): void {
    // Perform periodic maintenance tasks
    // e.g., health checks, metrics collection, etc.
  }

  private cleanupOldData(): void {
    // Clean up old data to prevent memory leaks
    this.sharpDetector.clearHistory();
    this.arbitrageDetector.clearOpportunities();
  }

  public async stop(): Promise<void> {
    console.log('Stopping Stream Processor...');

    this.wsServer.stop();

    console.log('Stream Processor stopped');
  }
}

// Start the processor
const processor = new StreamProcessor();

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('Received SIGINT, shutting down gracefully...');
  await processor.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('Received SIGTERM, shutting down gracefully...');
  await processor.stop();
  process.exit(0);
});

// Start the processor if this file is run directly
if (import.meta.main) {
  processor.start().catch(error => {
    console.error('Failed to start Stream Processor:', error);
    process.exit(1);
  });
}

export { StreamProcessor };
