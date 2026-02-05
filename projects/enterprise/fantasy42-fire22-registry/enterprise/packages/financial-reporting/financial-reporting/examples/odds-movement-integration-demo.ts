/**
 * Odds Movement Integration Demo
 * Complete example demonstrating the odds movement analysis system
 *
 * This demo shows how to:
 * 1. Set up odds data ingestion
 * 2. Generate sample odds data
 * 3. Analyze bet timing and odds movements
 * 4. Generate enhanced financial reports
 * 5. Monitor market efficiency
 */

// import { databaseManager } from '../database/database-manager';
// import { initializeDatabaseSchema } from '../database/schema-initializer';
import { OddsMovementAnalysisService } from '../services/odds-movement-analysis-service';
import {
  OddsDataIngestionService,
  OddsDataIngestionFactory,
} from '../services/odds-data-ingestion-service';
import { ReportGeneratorService } from '../services/report-generator-service';
import { AccountingPeriod } from '../value-objects/accounting-period';
import { OddsMovement, OddsType } from '../entities/odds-movement';
import { DomainEvents } from '../../shared/events/domain-events';

class OddsMovementDemo {
  private db: SQL;
  private oddsAnalysisService: OddsMovementAnalysisService;
  private dataIngestionService: OddsDataIngestionService;
  private reportGenerator: ReportGeneratorService;
  private events: DomainEvents;

  constructor() {
    // Database connection will be initialized in initializeDatabase
    this.db = null as any;

    // Initialize domain events
    this.events = DomainEvents.getInstance();

    // Services will be initialized after database setup
    this.oddsAnalysisService = null as any;
    this.dataIngestionService = null as any;
    this.reportGenerator = null as any;

    // Set up event listeners for demo
    this.setupEventListeners();
  }

  /**
   * Setup event listeners to demonstrate system activity
   */
  private setupEventListeners(): void {
    this.events.subscribe('OddsMovementRecorded', event => {
      console.log(
        `📊 Odds Movement Recorded: ${event.eventId}/${event.marketId} - ${event.movementPercentage.toFixed(2)}%`
      );
    });

    this.events.subscribe('BetTimingAnalyzed', event => {
      console.log(
        `🎯 Bet Timing Analyzed: ${event.betId} - ${event.timingCategory} (${event.oddsPosition})`
      );
    });

    this.events.subscribe('OddsDataProcessed', event => {
      console.log(
        `🔄 Odds Data Processed: ${event.updatesCount} updates, ${event.movementsCreated} movements created`
      );
    });

    this.events.subscribe('DailyTransactionReportGenerated', event => {
      console.log(
        `📋 DTR Generated: ${event.transactionCount} transactions, $${event.totalAmount.toLocaleString()} total`
      );
    });
  }

  /**
   * Initialize the demo database schema
   */
  async initializeDatabase(): Promise<void> {
    console.log('🏗️ Initializing demo database schema...');

    try {
      // For demo purposes, use direct SQLite connection to avoid configuration issues
      const { SQL } = await import('bun');
      this.db = new SQL('./odds_movement_demo.sqlite');

      // Test the connection
      await this.db`SELECT 1 as test`;

      // Initialize services with the database connection
      this.oddsAnalysisService = new OddsMovementAnalysisService(this.db, this.events);
      this.dataIngestionService = OddsDataIngestionFactory.create(
        this.db,
        this.oddsAnalysisService
      );
      this.reportGenerator = new ReportGeneratorService(
        this.db,
        this.oddsAnalysisService,
        this.events
      );

      // Create basic schema manually for demo
      await this.createBasicSchema();

      console.log('✅ Database schema and services initialized successfully');
    } catch (error) {
      console.error('❌ Failed to initialize database schema:', error);
      throw error;
    }
  }

  /**
   * Create basic schema for demo
   */
  private async createBasicSchema(): Promise<void> {
    // Create tables
    await this.db`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        event_name TEXT NOT NULL,
        start_time DATETIME NOT NULL,
        sport TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.db`
      CREATE TABLE IF NOT EXISTS odds_movements (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL,
        market_id TEXT NOT NULL,
        selection_id TEXT NOT NULL,
        odds_type TEXT NOT NULL,
        previous_odds REAL NOT NULL,
        current_odds REAL NOT NULL,
        movement_type TEXT NOT NULL,
        movement_percentage REAL NOT NULL,
        timestamp DATETIME NOT NULL,
        source TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.db`
      CREATE TABLE IF NOT EXISTS bet_timing_analysis (
        id TEXT PRIMARY KEY,
        bet_id TEXT NOT NULL UNIQUE,
        customer_id TEXT NOT NULL,
        event_id TEXT NOT NULL,
        market_id TEXT NOT NULL,
        selection_id TEXT NOT NULL,
        bet_amount REAL NOT NULL,
        bet_odds REAL NOT NULL,
        bet_timestamp DATETIME NOT NULL,
        timing_category TEXT NOT NULL,
        odds_position TEXT NOT NULL,
        potential_savings REAL DEFAULT 0,
        risk_assessment TEXT NOT NULL,
        odds_movements_count INTEGER DEFAULT 0,
        analysis_timestamp DATETIME,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.db`
      CREATE TABLE IF NOT EXISTS customers (
        id TEXT PRIMARY KEY,
        username TEXT NOT NULL UNIQUE,
        email TEXT NOT NULL UNIQUE,
        status TEXT DEFAULT 'ACTIVE',
        currency TEXT DEFAULT 'USD',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.db`
      CREATE TABLE IF NOT EXISTS accounts (
        id TEXT PRIMARY KEY,
        account_type TEXT NOT NULL,
        customer_id TEXT,
        current_balance REAL DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    await this.db`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        currency TEXT DEFAULT 'USD',
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        reference_id TEXT,
        status TEXT DEFAULT 'posted',
        entry_date DATE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `;

    // Insert sample event data for demo
    await this.db`
      INSERT OR IGNORE INTO events (id, event_name, start_time, sport) VALUES
      ('event_001', 'Football Match - Team A vs Team B', ${new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString()}, 'football'),
      ('event_002', 'Basketball Game - Team C vs Team D', ${new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString()}, 'basketball'),
      ('event_003', 'Soccer Match - Team E vs Team F', ${new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString()}, 'soccer')
    `;

    // Insert sample customer data
    await this.db`
      INSERT OR IGNORE INTO customers (id, username, email, status, currency) VALUES
      ('customer_123', 'user123', 'user123@example.com', 'ACTIVE', 'USD'),
      ('customer_456', 'user456', 'user456@example.com', 'ACTIVE', 'USD')
    `;

    console.log('✅ Basic schema created for demo');
  }

  /**
   * Run the complete odds movement integration demo
   */
  async runDemo(): Promise<void> {
    try {
      console.log('🎲 Starting Odds Movement Integration Demo...\n');

      // Step 1: Generate and ingest sample odds data
      await this.step1_GenerateSampleData();

      // Step 2: Analyze bet timing patterns
      await this.step2_AnalyzeBetTiming();

      // Step 3: Generate odds movement reports
      await this.step3_GenerateOddsReports();

      // Step 4: Demonstrate market impact analysis
      await this.step4_MarketImpactAnalysis();

      // Step 5: Show enhanced financial reporting
      await this.step5_EnhancedFinancialReports();

      console.log('\n🎉 Odds Movement Integration Demo completed successfully!');
      console.log('💡 The system is now ready for production use with real odds data feeds.');
    } catch (error) {
      console.error('❌ Demo failed:', error.message);
      throw error;
    }
  }

  /**
   * Step 1: Generate and ingest sample odds data
   */
  private async step1_GenerateSampleData(): Promise<void> {
    console.log('📊 Step 1: Generating Sample Odds Data');

    // Generate sample odds data
    const sampleData = await this.dataIngestionService.generateSampleOddsData(3, 5);
    console.log(`   Generated ${sampleData.length} sample odds updates`);

    // Register a sample data source
    this.dataIngestionService.registerDataSource({
      sourceId: 'demo_feed',
      sourceType: 'feed',
      pollingInterval: 30000, // 30 seconds
      isActive: false,
    });

    // Ingest the sample data manually
    const result = await this.dataIngestionService.ingestManualOddsData(sampleData);
    console.log(`   ✅ Ingested data: ${result.movementsCreated} odds movements created`);
    console.log(`   📈 Processing time: ${result.processingTime}ms\n`);
  }

  /**
   * Step 2: Analyze bet timing patterns
   */
  private async step2_AnalyzeBetTiming(): Promise<void> {
    console.log('🎯 Step 2: Analyzing Bet Timing Patterns');

    // First, create some sample bet data
    await this.createSampleBetData();

    // Analyze timing for a sample bet
    const sampleBet = {
      betId: 'bet_sample_001',
      customerId: 'customer_123',
      eventId: 'event_001',
      marketId: 'market_01',
      selectionId: 'selection_01',
      betAmount: 100,
      betOdds: 2.2,
      betTimestamp: new Date(),
    };

    console.log(
      `   Analyzing bet: ${sampleBet.betId} (${sampleBet.betAmount} @ ${sampleBet.betOdds})`
    );

    const timingAnalysis = await this.oddsAnalysisService.analyzeBetTiming(
      sampleBet.betId,
      sampleBet.customerId,
      sampleBet.eventId,
      sampleBet.marketId,
      sampleBet.selectionId,
      sampleBet.betAmount,
      sampleBet.betOdds,
      sampleBet.betTimestamp
    );

    console.log(`   📊 Timing Analysis Results:`);
    console.log(`      • Timing Category: ${timingAnalysis.timingCategory}`);
    console.log(`      • Odds Position: ${timingAnalysis.oddsPosition}`);
    console.log(`      • Potential Savings: $${timingAnalysis.potentialSavings.toFixed(2)}`);
    console.log(`      • Risk Assessment: ${timingAnalysis.riskAssessment}`);
    console.log(`      • Historical Movements: ${timingAnalysis.oddsMovements.length}\n`);
  }

  /**
   * Step 3: Generate odds movement reports
   */
  private async step3_GenerateOddsReports(): Promise<void> {
    console.log('📈 Step 3: Generating Odds Movement Reports');

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 7);

    console.log(
      `   Generating odds movement report for period: ${startDate.toDateString()} to ${endDate.toDateString()}`
    );

    const oddsReport = await this.oddsAnalysisService.generateOddsMovementReport(
      startDate,
      endDate,
      2.0 // 2% movement threshold
    );

    console.log(`   📊 Odds Movement Report Summary:`);
    console.log(`      • Total Movements: ${oddsReport.summary.totalMovements}`);
    console.log(`      • Significant Movements: ${oddsReport.summary.significantMovements}`);
    console.log(`      • Affected Bets: ${oddsReport.summary.affectedBets}`);
    console.log(
      `      • Potential Revenue Impact: $${oddsReport.summary.potentialRevenueImpact.toLocaleString()}`
    );

    console.log(`   📊 Movements by Type:`);
    Object.entries(oddsReport.movementsByType).forEach(([type, count]) => {
      console.log(`      • ${type}: ${count}`);
    });

    console.log(`   📊 Timing Analysis:`);
    console.log(`      • Early Bets: ${oddsReport.timingAnalysis.earlyBets}`);
    console.log(`      • Mid Bets: ${oddsReport.timingAnalysis.midBets}`);
    console.log(`      • Late Bets: ${oddsReport.timingAnalysis.lateBets}`);
    console.log(`      • Peak Bets: ${oddsReport.timingAnalysis.peakBets}`);
    console.log(
      `      • Average Timing Score: ${oddsReport.timingAnalysis.averageTimingScore.toFixed(2)}`
    );

    console.log(`   💡 Recommendations:`);
    oddsReport.recommendations.forEach((rec, index) => {
      console.log(`      ${index + 1}. ${rec}`);
    });

    console.log('');
  }

  /**
   * Step 4: Demonstrate market impact analysis
   */
  private async step4_MarketImpactAnalysis(): Promise<void> {
    console.log('🎪 Step 4: Market Impact Analysis');

    const endDate = new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 3);

    console.log(`   Analyzing market impact for event_001/market_01`);

    const marketImpact = await this.oddsAnalysisService.analyzeMarketImpact(
      'event_001',
      'market_01',
      startDate,
      endDate
    );

    console.log(`   📊 Market Impact Analysis:`);
    console.log(
      `      • Period: ${marketImpact.period.start.toDateString()} to ${marketImpact.period.end.toDateString()}`
    );
    console.log(`      • Total Odds Movements: ${marketImpact.oddsMovements.length}`);
    console.log(`      • Total Bet Volume: $${marketImpact.betVolume.total.toLocaleString()}`);

    console.log(`   💰 Financial Impact:`);
    console.log(
      `      • Potential Revenue: $${marketImpact.financialImpact.potentialRevenue.toLocaleString()}`
    );
    console.log(
      `      • Actual Revenue: $${marketImpact.financialImpact.actualRevenue.toLocaleString()}`
    );
    console.log(
      `      • Opportunity Cost: $${marketImpact.financialImpact.opportunityCost.toLocaleString()}`
    );
    console.log(
      `      • Risk-Adjusted Revenue: $${marketImpact.financialImpact.riskAdjustedRevenue.toLocaleString()}`
    );

    console.log(`   📈 Market Efficiency:`);
    console.log(`      • Efficiency Score: ${marketImpact.marketEfficiency.score}/100`);
    console.log(
      `      • Movement Frequency: ${marketImpact.marketEfficiency.factors.movementFrequency}`
    );
    console.log(
      `      • Odds Accuracy: ${marketImpact.marketEfficiency.factors.oddsAccuracy.toFixed(1)}%\n`
    );
  }

  /**
   * Step 5: Show enhanced financial reporting
   */
  private async step5_EnhancedFinancialReports(): Promise<void> {
    console.log('💼 Step 5: Enhanced Financial Reporting');

    // Create sample transaction data
    await this.createSampleTransactionData();

    const reportDate = new Date();

    console.log(`   Generating enhanced Daily Transaction Report for ${reportDate.toDateString()}`);

    const dtr = await this.reportGenerator.generateDailyTransactionReport(
      reportDate,
      50, // $50 threshold
      true // include odds analysis
    );

    console.log(`   📋 Daily Transaction Report:`);
    console.log(`      • Report Date: ${dtr.reportDate}`);
    console.log(`      • Total Transactions: ${dtr.totalTransactions}`);
    console.log(`      • Total Amount: $${dtr.totalAmount.toLocaleString()}`);
    console.log(`      • Threshold: $${dtr.threshold}`);

    if (dtr.oddsMovementInsights) {
      console.log(`   📊 Odds Movement Insights:`);
      console.log(`      • Total Movements: ${dtr.oddsMovementInsights.totalMovements}`);
      console.log(
        `      • Significant Movements: ${dtr.oddsMovementInsights.significantMovements}`
      );
      console.log(
        `      • Average Movement: ${dtr.oddsMovementInsights.avgMovementPercentage.toFixed(2)}%`
      );
      console.log(
        `      • Top Moving Markets: ${dtr.oddsMovementInsights.topMovingMarkets.length}`
      );
    }

    if (dtr.betTimingAnalysis) {
      console.log(`   🎯 Bet Timing Analysis:`);
      console.log(`      • Total Bets Analyzed: ${dtr.betTimingAnalysis.totalBets}`);
      console.log(`      • Favorable Timing: ${dtr.betTimingAnalysis.favorableTiming}`);
      console.log(`      • Unfavorable Timing: ${dtr.betTimingAnalysis.unfavorableTiming}`);
      console.log(
        `      • Potential Savings: $${dtr.betTimingAnalysis.potentialSavings.toFixed(2)}`
      );

      console.log(`   ⚠️ Risk Distribution:`);
      Object.entries(dtr.betTimingAnalysis.riskDistribution).forEach(([level, count]) => {
        console.log(`      • ${level}: ${count} bets`);
      });
    }

    console.log('');
  }

  /**
   * Create sample bet data for analysis
   */
  private async createSampleBetData(): Promise<void> {
    const sampleBets = [
      {
        id: 'bet_sample_001',
        bet_id: 'bet_sample_001',
        customer_id: 'customer_123',
        event_id: 'event_001',
        market_id: 'market_01',
        selection_id: 'selection_01',
        bet_amount: 100,
        bet_odds: 2.2,
        bet_timestamp: new Date().toISOString(),
        timing_category: 'early',
        odds_position: 'favorable',
        potential_savings: 15.5,
        risk_assessment: 'low',
        odds_movements_count: 3,
        analysis_timestamp: new Date().toISOString(),
      },
      {
        id: 'bet_sample_002',
        bet_id: 'bet_sample_002',
        customer_id: 'customer_456',
        event_id: 'event_001',
        market_id: 'market_01',
        selection_id: 'selection_02',
        bet_amount: 250,
        bet_odds: 1.95,
        bet_timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
        timing_category: 'late',
        odds_position: 'unfavorable',
        potential_savings: 32.75,
        risk_assessment: 'medium',
        odds_movements_count: 5,
        analysis_timestamp: new Date().toISOString(),
      },
    ];

    for (const bet of sampleBets) {
      await this.db`
        INSERT OR REPLACE INTO bet_timing_analysis (
          id, bet_id, customer_id, event_id, market_id, selection_id,
          bet_amount, bet_odds, bet_timestamp, timing_category,
          odds_position, potential_savings, risk_assessment,
          odds_movements_count, analysis_timestamp
        ) VALUES (
          ${bet.id}, ${bet.bet_id}, ${bet.customer_id}, ${bet.event_id}, ${bet.market_id}, ${bet.selection_id},
          ${bet.bet_amount}, ${bet.bet_odds}, ${bet.bet_timestamp}, ${bet.timing_category},
          ${bet.odds_position}, ${bet.potential_savings}, ${bet.risk_assessment},
          ${bet.odds_movements_count}, ${bet.analysis_timestamp}
        )
      `;
    }
  }

  /**
   * Create sample transaction data for reporting
   */
  private async createSampleTransactionData(): Promise<void> {
    const transactions = [
      {
        id: 'tx_001',
        entry_date: new Date().toISOString(),
        account_id: 'acc_001',
        account_type: 'customer',
        customer_id: 'customer_123',
        amount: 150,
        currency_code: 'USD',
        description: 'Bet placement - Football Match',
        reference_id: 'bet_sample_001',
        status: 'posted',
      },
      {
        id: 'tx_002',
        entry_date: new Date().toISOString(),
        account_id: 'acc_002',
        account_type: 'customer',
        customer_id: 'customer_456',
        amount: 250,
        currency_code: 'USD',
        description: 'Bet placement - Basketball Game',
        reference_id: 'bet_sample_002',
        status: 'posted',
      },
      {
        id: 'tx_003',
        entry_date: new Date().toISOString(),
        account_id: 'acc_revenue',
        account_type: 'revenue',
        amount: -400,
        currency_code: 'USD',
        description: 'Revenue from bets',
        reference_id: null,
        status: 'posted',
      },
    ];

    for (const tx of transactions) {
      await this.db`
        INSERT OR REPLACE INTO ledger_entries (
          id, entry_date, account_id, account_type, customer_id,
          amount, currency_code, description, reference_id, status
        ) VALUES (
          ${tx.id}, ${tx.entry_date}, ${tx.account_id}, ${tx.account_type}, ${tx.customer_id},
          ${tx.amount}, ${tx.currency_code}, ${tx.description}, ${tx.reference_id}, ${tx.status}
        )
      `;
    }

    // Create corresponding accounts
    const accounts = [
      {
        id: 'acc_001',
        account_type: 'customer',
        customer_id: 'customer_123',
        current_balance: 1000,
      },
      {
        id: 'acc_002',
        account_type: 'customer',
        customer_id: 'customer_456',
        current_balance: 750,
      },
      {
        id: 'acc_revenue',
        account_type: 'revenue',
        customer_id: null,
        current_balance: 50000,
      },
    ];

    for (const acc of accounts) {
      await this.db`
        INSERT OR REPLACE INTO accounts (
          id, account_type, customer_id, current_balance, is_active
        ) VALUES (
          ${acc.id}, ${acc.account_type}, ${acc.customer_id}, ${acc.current_balance}, 1
        )
      `;
    }
  }

  /**
   * Show system status and cleanup
   */
  async showStatusAndCleanup(): Promise<void> {
    console.log('📊 System Status:');

    const ingestionStatus = this.dataIngestionService.getStatus();
    console.log(`   • Ingestion Service: ${ingestionStatus.isRunning ? 'Running' : 'Stopped'}`);
    console.log(`   • Active Sources: ${ingestionStatus.activeSources.length}`);
    console.log(`   • Total Sources: ${ingestionStatus.totalSources}`);

    // Get some stats from the database
    const movementStats = await this.db`
      SELECT
        COUNT(*) as total_movements,
        AVG(movement_percentage) as avg_movement,
        MAX(ABS(movement_percentage)) as max_movement
      FROM odds_movements
    `;

    if (movementStats) {
      console.log(`   • Total Odds Movements: ${movementStats.total_movements}`);
      console.log(`   • Average Movement: ${movementStats.avg_movement?.toFixed(2)}%`);
      console.log(`   • Max Movement: ${movementStats.max_movement?.toFixed(2)}%`);
    }

    const betStats = await this.db`
      SELECT
        COUNT(*) as total_bets,
        SUM(potential_savings) as total_savings
      FROM bet_timing_analysis
    `;

    if (betStats) {
      console.log(`   • Total Bets Analyzed: ${betStats.total_bets}`);
      console.log(`   • Total Potential Savings: $${betStats.total_savings?.toFixed(2) || '0.00'}`);
    }

    console.log('\n🧹 Cleaning up demo resources...');
    this.dataIngestionService.cleanup();
    // Close all database connections through the manager
    await databaseManager.close();
    console.log('✅ Demo cleanup completed');
  }
}

/**
 * Main execution function
 */
async function runOddsMovementDemo(): Promise<void> {
  const demo = new OddsMovementDemo();

  try {
    await demo.initializeDatabase();
    await demo.runDemo();
    await demo.showStatusAndCleanup();
  } catch (error) {
    console.error('❌ Demo execution failed:', error);
    demo.dataIngestionService.cleanup();
    demo.db.close();
    process.exit(1);
  }
}

// Export for use in other modules
export { OddsMovementDemo, runOddsMovementDemo };

// Run enhanced demo if this file is executed directly
if (import.meta.main) {
  console.log('🎲 Enhanced Odds Movement Integration Demo');
  console.log('!==!==!==!==!==!==!==!===\n');

  console.log('New Features:');
  console.log('• Multi-database support (SQLite/MySQL/PostgreSQL)');
  console.log('• YAML configuration management');
  console.log('• Enhanced regulatory compliance');
  console.log('• Multi-format export (CSV/XML/JSON)');
  console.log('• Transaction support and audit trails\n');

  // Display current database configuration
  console.log('📊 Current Configuration:');
  const config = databaseManager.getConfig();
  console.log(`   • Adapter: ${config.main.adapter}`);
  console.log(`   • Database: ${config.main.database}`);
  console.log(`   • Environment: ${Bun.env.NODE_ENV || 'development'}\n`);

  runOddsMovementDemo().catch(error => {
    console.error('Demo failed:', error);
    process.exit(1);
  });
}
