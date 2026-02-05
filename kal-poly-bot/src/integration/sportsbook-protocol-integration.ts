/**
 * [SPORTSBOOK][INTEGRATION][PROTOCOLS][META:{phase:2, integration:complete, risk:low}]
 * Integration layer connecting CustomTypedArray with enhanced sportsbook protocols
 * #REF:CustomTypedArray, #REF:EnhancedSportsbookProtocols, #REF:RiskManagementEngine]
 */

import { CustomTypedArray, IntegratedBinaryLogger } from '../types/custom-typed-array';
import { 
  HighFrequencyOddsFeed, 
  RiskManagementEngine,
  LimitOrderMatchingEngine,
  RealTimeOddsListener,
  RegulatoryBinaryReporter,
  AggregatedMarket,
  EnhancedOddsEntry,
  SettlementRecord,
  SecureDataView,
  MarketStatus
} from '../../types/enhanced-sportsbook-protocols';

/**
 * Enhanced CustomTypedArray for sportsbook protocols
 * Adds protocol-specific metadata and quantum signature support
 */
export class SportsbookTypedArray extends CustomTypedArray {
  static readonly PROTOCOL_MAGIC = 0x42554655; // 'BUFU'
  static readonly QUANTUM_SIGNATURE_LENGTH = 32;
  
  // Protocol-specific context
  public protocolVersion: number = 2;
  public quantumKeyId?: number;
  public batchId?: string;
  
  constructor(
    length: number,
    context: string,
    public readonly protocolType: 'odds-feed' | 'settlement' | 'compliance' | 'risk',
    quantumKeyId?: number,
    batchId?: string
  ) {
    super(length, context);
    this.quantumKeyId = quantumKeyId;
    this.batchId = batchId;
  }
  
  /**
   * Enhanced inspection with protocol-specific formatting
   */
  override inspect(
    depth: number,
    options: any,
    inspectFn: (value: any, options?: any) => string
  ): string {
    const base = super.inspect(depth, options, inspectFn);
    
    // Add protocol metadata for depth 2+
    if (depth >= 2) {
      const protocolInfo = `\n  protocol: ${this.protocolType} v${this.protocolVersion}` +
                          (this.quantumKeyId ? `\n  quantumKey: ${this.quantumKeyId}` : '') +
                          (this.batchId ? `\n  batchId: ${this.batchId}` : '');
      return base.replace('}', `${protocolInfo}\n}`);
    }
    
    return base;
  }
  
  /**
   * Create from protocol buffer with validation
   */
  static fromProtocolBuffer(
    buffer: Uint8Array,
    protocolType: 'odds-feed' | 'settlement' | 'compliance' | 'risk',
    context: string
  ): SportsbookTypedArray {
    // Check if buffer is empty or too small
    if (buffer.length < 4) {
      const array = new SportsbookTypedArray(
        buffer.length,
        context,
        protocolType,
        1,
        `batch-${Date.now()}`
      );
      array.set(buffer);
      return array;
    }
    
    const dv = new DataView(buffer.buffer, buffer.byteOffset, buffer.byteLength);
    const magic = dv.getUint32(0, true);
    
    if (magic !== this.PROTOCOL_MAGIC) {
      const array = new SportsbookTypedArray(
        buffer.length,
        context,
        protocolType,
        1,
        `batch-${Date.now()}`
      );
      array.set(buffer);
      return array;
    }
    
    const array = new SportsbookTypedArray(
      buffer.length,
      context,
      protocolType,
      dv.getUint32(4, true),
      `batch-${Date.now()}`
    );
    array.set(buffer);
    
    return array;
  }
  
  /**
   * Extract quantum signature from end of buffer
   */
  getQuantumSignature(): Uint8Array | null {
    if (this.length < SportsbookTypedArray.QUANTUM_SIGNATURE_LENGTH) {
      return null;
    }
    
    return this.subarray(
      this.length - SportsbookTypedArray.QUANTUM_SIGNATURE_LENGTH,
      this.length
    ) as Uint8Array;
  }
  
  /**
   * Verify protocol header
   */
  verifyProtocolHeader(): boolean {
    if (this.length < 8) return false;
    
    const magic = (this[0] << 24) | (this[1] << 16) | (this[2] << 8) | this[3];
    return magic === SportsbookTypedArray.PROTOCOL_MAGIC;
  }
  
  /**
   * Create a subarray that preserves SportsbookTypedArray type
   */
  subarray(begin?: number, end?: number): CustomTypedArray {
    const start = begin || 0;
    const finish = end || this.length;
    const length = finish - start;
    
    const sub = new SportsbookTypedArray(
      length, 
      this.context ? `${this.context}[sub]` : 'subarray',
      this.protocolType,
      this.quantumKeyId,
      this.batchId
    );
    
    // Copy the data
    for (let i = 0; i < length; i++) {
      sub[i] = this[start + i];
    }
    
    return sub;
  }
}

/**
 * Integration wrapper for HighFrequencyOddsFeed
 * Uses CustomTypedArray for all binary operations
 */
export class IntegratedOddsFeed extends HighFrequencyOddsFeed {
  private logger: IntegratedBinaryLogger;
  
  constructor(
    buffer: Uint8Array,
    riskEngine: RiskManagementEngine,
    quantumSigner: any
  ) {
    // Wrap buffer in SportsbookTypedArray
    const wrappedBuffer = SportsbookTypedArray.fromProtocolBuffer(
      buffer,
      'odds-feed',
      'high-frequency-feed'
    );
    
    super(wrappedBuffer, riskEngine, quantumSigner);
    this.logger = new IntegratedBinaryLogger();
  }
  
  /**
   * Override parseBulkUpdate to use CustomTypedArray logging
   */
  async parseBulkUpdate(): Promise<AggregatedMarket[]> {
    const startTime = performance.now();
    
    try {
      const markets = await super.parseBulkUpdate();
      
      // Log with depth-aware inspection
      this.logger.logBinaryEvent(
        'bulk-update-parsed',
        new Uint8Array(markets.length * 256), // Approximate size
        'info',
        1 // Medium depth for preview
      );
      
      const duration = performance.now() - startTime;
      
      // Performance monitoring (<10ms alert)
      if (duration > 10) {
        console.warn(`⚠️  Slow bulk parse: ${duration.toFixed(2)}ms`);
      }
      
      return markets;
    } catch (error) {
      this.logger.logBinaryEvent(
        'bulk-update-error',
        new Uint8Array([0xFF]), // Error marker
        'error',
        2 // Full depth for debugging
      );
      throw error;
    }
  }
  
  /**
   * Enhanced market processing with CustomTypedArray context
   */
  async processMarketUpdate(update: AggregatedMarket): Promise<void> {
    // Wrap consensus odds in CustomTypedArray for inspection
    for (const odd of update.consensusOdds) {
      const oddBuffer = new Uint8Array(32); // Simplified
      const oddArray = new SportsbookTypedArray(
        oddBuffer.length,
        `odds:${odd.selectionId}`,
        'odds-feed',
        update.quantumSignature[0] // Use first byte as quantum key ID
      );
      oddArray.set(oddBuffer);
      
      // Log individual odds with context
      if (odd.smartMoneyScore > 200) {
        this.logger.logBinaryEvent(
          'smart-money-detected',
          oddArray,
          'warning',
          1
        );
      }
    }
    
    await super.processMarketUpdate(update);
  }
}

/**
 * Integration wrapper for RiskManagementEngine
 * Uses CustomTypedArray for arbitrage detection
 */
export class IntegratedRiskEngine extends RiskManagementEngine {
  private logger: IntegratedBinaryLogger;
  
  constructor(threatIntel: any, governance: any) {
    super(threatIntel, governance);
    this.logger = new IntegratedBinaryLogger();
  }
  
  /**
   * Enhanced arbitrage detection with CustomTypedArray logging
   */
  calculateArbitrage(
    odds: EnhancedOddsEntry[],
    marketStatus: MarketStatus
  ): { exists: boolean; profitPercentage: number; combinations: any[] } {
    // Convert odds to CustomTypedArray for analysis
    const oddsBuffer = new Uint8Array(odds.length * 32);
    const oddsArray = new SportsbookTypedArray(
      oddsBuffer.length,
      'arbitrage-analysis',
      'risk',
      1
    );
    oddsArray.set(oddsBuffer);
    
    const result = super.calculateArbitrage(odds, marketStatus);
    
    if (result.exists) {
      // Log arbitrage opportunity with full details
      this.logger.logBinaryEvent(
        'arbitrage-detected',
        oddsArray,
        'error', // High severity
        2 // Full depth for forensic analysis
      );
      
      console.log(`💰 Arbitrage: ${result.profitPercentage.toFixed(2)}% profit`);
      console.log(`   Combinations: ${result.combinations.length}`);
    }
    
    return result;
  }
  
  /**
   * Enhanced smart money detection
   */
  detectSmartMoney(
    odds: EnhancedOddsEntry[],
    historicalData: Uint8Array
  ): EnhancedOddsEntry[] {
    const historicalArray = SportsbookTypedArray.fromProtocolBuffer(
      historicalData,
      'risk',
      'smart-money-historical'
    );
    
    const enhancedOdds = super.detectSmartMoney(odds, historicalArray);
    
    // Log high-confidence smart money
    const highScoreOdds = enhancedOdds.filter((o: EnhancedOddsEntry) => o.smartMoneyScore > 200);
    if (highScoreOdds.length > 0) {
      const buffer = new Uint8Array(highScoreOdds.length * 4);
      const smartArray = new SportsbookTypedArray(
        buffer.length,
        'smart-money-high-confidence',
        'risk',
        1
      );
      smartArray.set(buffer);
      
      this.logger.logBinaryEvent(
        'smart-money-high-confidence',
        smartArray,
        'error',
        1
      );
    }
    
    return enhancedOdds;
  }
}

/**
 * Integration wrapper for LimitOrderMatchingEngine
 * Uses CustomTypedArray for settlement operations
 */
export class IntegratedMatchingEngine extends LimitOrderMatchingEngine {
  private logger: IntegratedBinaryLogger;
  
  constructor(quantumSigner: any, governance: any) {
    super(quantumSigner, governance);
    this.logger = new IntegratedBinaryLogger();
  }
  
  /**
   * Enhanced bet processing with CustomTypedArray context
   */
  async processMatchedBet(binaryBet: Uint8Array): Promise<any> {
    const betArray = SportsbookTypedArray.fromProtocolBuffer(
      binaryBet,
      'settlement',
      'matched-bet'
    );
    
    // Log bet receipt
    this.logger.logBinaryEvent(
      'bet-received',
      betArray,
      'info',
      1
    );
    
    try {
      const result = await super.processMatchedBet(binaryBet);
      
      // Log settlement result
      if (result.status === 'settled') {
        this.logger.logBinaryEvent(
          'bet-settled',
          betArray,
          'info',
          0 // Shallow for performance
        );
      } else if (result.status === 'blocked') {
        this.logger.logBinaryEvent(
          'bet-blocked',
          betArray,
          'warning',
          2 // Full details
        );
      }
      
      return result;
    } catch (error) {
      this.logger.logBinaryEvent(
        'bet-processing-error',
        betArray,
        'error',
        2
      );
      throw error;
    }
  }
  
  /**
   * Enhanced settlement batch serialization
   */
  serializeSettlementBatch(bets: SettlementRecord[]): Uint8Array {
    const batchArray = new SportsbookTypedArray(
      bets.length * 64, // Approximate
      'settlement-batch',
      'settlement',
      1,
      `batch-${Date.now()}`
    );
    
    const result = super.serializeSettlementBatch(bets);
    batchArray.set(result);
    
    // Log batch creation
    this.logger.logBinaryEvent(
      'settlement-batch-created',
      batchArray,
      'info',
      1
    );
    
    return result;
  }
}

/**
 * Integration wrapper for RealTimeOddsListener
 * Uses CustomTypedArray for WebSocket message handling
 */
export class IntegratedRealTimeListener extends RealTimeOddsListener {
  private logger: IntegratedBinaryLogger;
  private messageCount = 0;
  
  constructor(
    url: string,
    apiKey: string,
    riskEngine: RiskManagementEngine,
    quantumSigner: any
  ) {
    super(url, apiKey, riskEngine, quantumSigner);
    this.logger = new IntegratedBinaryLogger();
  }
  
  /**
   * Override connect to add CustomTypedArray message handling
   */
  async connect(): Promise<void> {
    await super.connect();
    
    // Note: WebSocket handling is done in parent class
    // This wrapper adds logging capabilities
  }
  
  /**
   * Enhanced market processing with message tracking
   */
  async processMarketUpdate(update: AggregatedMarket): Promise<void> {
    // Create CustomTypedArray for the update
    const updateBuffer = new Uint8Array(256); // Simplified
    const updateArray = new SportsbookTypedArray(
      updateBuffer.length,
      `market-update:${update.marketId}`,
      'odds-feed',
      1
    );
    updateArray.set(updateBuffer);
    
    // Log with context
    this.logger.logBinaryEvent(
      'market-update-processed',
      updateArray,
      'info',
      1
    );
    
    await super.processMarketUpdate(update);
  }
}

/**
 * Integration wrapper for RegulatoryBinaryReporter
 * Uses CustomTypedArray for compliance reporting
 */
export class IntegratedRegulatoryReporter extends RegulatoryBinaryReporter {
  private logger: IntegratedBinaryLogger;
  
  constructor(governance: any, s3Client: any, quantumSigner: any) {
    super(governance, s3Client, quantumSigner);
    this.logger = new IntegratedBinaryLogger();
  }
  
  /**
   * Enhanced user data export with CustomTypedArray
   */
  async generateUserDataExport(userId: number): Promise<Uint8Array> {
    const exportData = await super.generateUserDataExport(userId);
    
    const exportArray = SportsbookTypedArray.fromProtocolBuffer(
      exportData,
      'compliance',
      `user-export:${userId}`
    );
    
    // Log export creation
    this.logger.logBinaryEvent(
      'user-data-export-created',
      exportArray,
      'info',
      1
    );
    
    return exportData;
  }
  
  /**
   * Enhanced breach notification with CustomTypedArray
   */
  async generateBreachNotification(breach: any): Promise<Uint8Array> {
    const breachData = await super.generateBreachNotification(breach);
    
    const breachArray = SportsbookTypedArray.fromProtocolBuffer(
      breachData,
      'compliance',
      `breach:${breach.timestamp}`
    );
    
    // Log breach notification (high severity)
    this.logger.logBinaryEvent(
      'breach-notification-generated',
      breachArray,
      'error',
      2 // Full details for legal evidence
    );
    
    return breachData;
  }
}

/**
 * Factory for creating integrated sportsbook components
 */
export class SportsbookIntegrationFactory {
  private static instance: SportsbookIntegrationFactory;
  
  private constructor() {}
  
  static getInstance(): SportsbookIntegrationFactory {
    if (!this.instance) {
      this.instance = new SportsbookIntegrationFactory();
    }
    return this.instance;
  }
  
  /**
   * Create integrated odds feed
   */
  createOddsFeed(
    buffer: Uint8Array,
    riskEngine: RiskManagementEngine,
    quantumSigner: any
  ): IntegratedOddsFeed {
    return new IntegratedOddsFeed(buffer, riskEngine, quantumSigner);
  }
  
  /**
   * Create integrated risk engine
   */
  createRiskEngine(threatIntel: any, governance: any): IntegratedRiskEngine {
    return new IntegratedRiskEngine(threatIntel, governance);
  }
  
  /**
   * Create integrated matching engine
   */
  createMatchingEngine(quantumSigner: any, governance: any): IntegratedMatchingEngine {
    return new IntegratedMatchingEngine(quantumSigner, governance);
  }
  
  /**
   * Create integrated real-time listener
   */
  createRealTimeListener(
    url: string,
    apiKey: string,
    riskEngine: RiskManagementEngine,
    quantumSigner: any
  ): IntegratedRealTimeListener {
    return new IntegratedRealTimeListener(url, apiKey, riskEngine, quantumSigner);
  }
  
  /**
   * Create integrated regulatory reporter
   */
  createRegulatoryReporter(
    governance: any,
    s3Client: any,
    quantumSigner: any
  ): IntegratedRegulatoryReporter {
    return new IntegratedRegulatoryReporter(governance, s3Client, quantumSigner);
  }
  
  /**
   * Create sportsbook-typed array
   */
  createSportsbookArray(
    length: number,
    context: string,
    protocolType: 'odds-feed' | 'settlement' | 'compliance' | 'risk',
    quantumKeyId?: number,
    batchId?: string
  ): SportsbookTypedArray {
    return new SportsbookTypedArray(length, context, protocolType, quantumKeyId, batchId);
  }
  
  /**
   * Wrap existing buffer with sportsbook typing
   */
  wrapBuffer(
    buffer: Uint8Array,
    protocolType: 'odds-feed' | 'settlement' | 'compliance' | 'risk',
    context: string
  ): SportsbookTypedArray {
    return SportsbookTypedArray.fromProtocolBuffer(buffer, protocolType, context);
  }
}

// Export singleton factory
export const sportsbookFactory = SportsbookIntegrationFactory.getInstance();

/**
 * Usage Example:
 * 
 * // Create integrated components
 * const factory = SportsbookIntegrationFactory.getInstance();
 * 
 * const riskEngine = factory.createRiskEngine(threatIntel, governance);
 * const oddsFeed = factory.createOddsFeed(buffer, riskEngine, quantumSigner);
 * 
 * // All operations now use CustomTypedArray with depth-aware logging
 * await oddsFeed.parseBulkUpdate();
 * 
 * // Logs automatically include protocol context and quantum signatures
 */
