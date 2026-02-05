/**
 * Dependency Injection Container
 * Domain-Driven Design Implementation
 *
 * Centralized dependency management for the betting platform
 */

import { SQL } from 'bun';

// Domain Services
import { BettingService } from '../../domains/betting/services/BettingService';

// Repositories
import { BetRepository } from '../../domains/betting/repositories/BetRepository';
import { LedgerRepository } from '../../domains/accounting/repositories/LedgerRepository';
import { BunSQLBetRepository } from './database/BunSQLBetRepository';
import { BunSQLLedgerRepository } from './database/BunSQLLedgerRepository';

// Use Cases
import { PlaceBetUseCase } from '../../application/use-cases/PlaceBetUseCase';
import { SettleBetUseCase } from '../../application/use-cases/SettleBetUseCase';

// Controllers
import { BetController } from '../../interfaces/http/controllers/BetController';

// Events
import { DomainEvents } from '../../domains/shared/events/domain-events';

export class Container {
  private static instance: Container;
  private services: Map<string, any> = new Map();

  private constructor() {}

  static getInstance(): Container {
    if (!Container.instance) {
      Container.instance = new Container();
    }
    return Container.instance;
  }

  /**
   * Initialize all dependencies
   */
  async initialize(): Promise<void> {
    console.log('🔧 Initializing dependency container...');

    // Initialize database
    const db = this.initializeDatabase();

    // Initialize repositories
    const betRepository = new BunSQLBetRepository(db);
    const ledgerRepository = new BunSQLLedgerRepository(db);

    // Register repositories
    this.register('BetRepository', betRepository);
    this.register('LedgerRepository', ledgerRepository);

    // Initialize domain services
    const bettingService = new BettingService(
      betRepository,
      ledgerRepository,
      DomainEvents.getInstance()
    );

    this.register('BettingService', bettingService);

    // Initialize use cases
    const placeBetUseCase = new PlaceBetUseCase(bettingService);
    const settleBetUseCase = new SettleBetUseCase(bettingService);

    this.register('PlaceBetUseCase', placeBetUseCase);
    this.register('SettleBetUseCase', settleBetUseCase);

    // Initialize controllers
    const betController = new BetController(placeBetUseCase, settleBetUseCase, bettingService);

    this.register('BetController', betController);

    console.log('✅ Dependency container initialized');
  }

  /**
   * Get a service by name
   */
  get<T>(name: string): T {
    const service = this.services.get(name);
    if (!service) {
      throw new Error(`Service ${name} not found in container`);
    }
    return service;
  }

  /**
   * Register a service
   */
  register<T>(name: string, service: T): void {
    this.services.set(name, service);
  }

  /**
   * Check if a service exists
   */
  has(name: string): boolean {
    return this.services.has(name);
  }

  /**
   * Initialize database connection and schema
   */
  private initializeDatabase(): SQL {
    const dbPath = process.env.DATABASE_URL || './betting_platform.db';
    console.log(`📁 Initializing database at: ${dbPath}`);

    const db = new SQL(dbPath);

    // Initialize schema
    this.initializeSchema(db);

    return db;
  }

  /**
   * Initialize database schema
   */
  private initializeSchema(db: SQL): void {
    console.log('📋 Initializing database schema...');

    // Create bets table
    db.run(`
      CREATE TABLE IF NOT EXISTS bets (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        stake REAL NOT NULL,
        potential_win REAL NOT NULL,
        odds_data TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'OPEN',
        outcome TEXT,
        actual_win REAL,
        market_result TEXT,
        placed_at TEXT NOT NULL,
        settled_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      )
    `);

    // Create ledger_entries table
    db.run(`
      CREATE TABLE IF NOT EXISTS ledger_entries (
        id TEXT PRIMARY KEY,
        account_id TEXT NOT NULL,
        amount REAL NOT NULL,
        entry_type TEXT NOT NULL,
        transaction_type TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        customer_id TEXT,
        bet_id TEXT,
        description TEXT,
        reference TEXT,
        balance_before REAL,
        balance_after REAL,
        effective_date TEXT NOT NULL,
        posted_at TEXT,
        reversed_at TEXT,
        reversal_entry_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        deleted_at TEXT
      )
    `);

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_bets_customer_id ON bets(customer_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_bets_status ON bets(status)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_bets_placed_at ON bets(placed_at)`);

    db.run(`CREATE INDEX IF NOT EXISTS idx_ledger_account_id ON ledger_entries(account_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_ledger_customer_id ON ledger_entries(customer_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_ledger_bet_id ON ledger_entries(bet_id)`);
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_ledger_transaction_type ON ledger_entries(transaction_type)`
    );
    db.run(
      `CREATE INDEX IF NOT EXISTS idx_ledger_effective_date ON ledger_entries(effective_date)`
    );
    db.run(`CREATE INDEX IF NOT EXISTS idx_ledger_posted_at ON ledger_entries(posted_at)`);

    console.log('✅ Database schema initialized');
  }

  /**
   * Get typed service instances
   */
  getBetRepository(): BetRepository {
    return this.get<BetRepository>('BetRepository');
  }

  getLedgerRepository(): LedgerRepository {
    return this.get<LedgerRepository>('LedgerRepository');
  }

  getBettingService(): BettingService {
    return this.get<BettingService>('BettingService');
  }

  getPlaceBetUseCase(): PlaceBetUseCase {
    return this.get<PlaceBetUseCase>('PlaceBetUseCase');
  }

  getSettleBetUseCase(): SettleBetUseCase {
    return this.get<SettleBetUseCase>('SettleBetUseCase');
  }

  getBetController(): BetController {
    return this.get<BetController>('BetController');
  }
}

// Export singleton instance
export const container = Container.getInstance();

// Export convenience functions
export const getBetRepository = () => container.getBetRepository();
export const getLedgerRepository = () => container.getLedgerRepository();
export const getBettingService = () => container.getBettingService();
export const getPlaceBetUseCase = () => container.getPlaceBetUseCase();
export const getSettleBetUseCase = () => container.getSettleBetUseCase();
export const getBetController = () => container.getBetController();
