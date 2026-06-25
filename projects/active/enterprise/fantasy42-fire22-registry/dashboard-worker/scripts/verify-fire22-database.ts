#!/usr/bin/env bun
/**
 * 🏈 Fire22 Database Verification Script
 * Verifies Fire22 data structures and populates fresh cache data
 */

import { databaseService } from '../src/services/database/connection';
import { customerRepository, agentRepository } from '../src/repositories/fire22';
import { Fire22CustomerEntity } from '../src/entities/fire22/customer';
import { Fire22AgentEntity } from '../src/entities/fire22/agent';

interface DatabaseStatus {
  connected: boolean;
  schemaExists: boolean;
  tableCount: number;
  fire22TablesExist: boolean;
  dataPopulated: boolean;
  lastSync: string;
}

class Fire22DatabaseVerifier {
  async verifyDatabaseStatus(): Promise<DatabaseStatus> {
    console.info('🔍 Verifying Fire22 Database Status...\n');

    const status: DatabaseStatus = {
      connected: false,
      schemaExists: false,
      tableCount: 0,
      fire22TablesExist: false,
      dataPopulated: false,
      lastSync: new Date().toISOString(),
    };

    try {
      // 1. Test database connection
      console.info('📡 Testing database connection...');
      await databaseService.connect('./dashboard.db');

      const healthCheck = await databaseService.healthCheck();
      status.connected = healthCheck.connected;
      console.info(`   ${status.connected ? '✅' : '❌'} Database connected: ${status.connected}`);

      if (!status.connected) {
        return status;
      }

      // 2. Check schema info
      console.info('\n🗄️ Checking database schema...');
      const schemaInfo = await databaseService.getSchemaInfo();
      status.schemaExists = schemaInfo.tableCount > 0;
      status.tableCount = schemaInfo.tableCount;

      console.info(`   📊 Total tables: ${status.tableCount}`);
      console.info(`   📋 Tables found: ${schemaInfo.tables.join(', ')}`);

      // 3. Check Fire22 specific tables
      console.info('\n🏈 Checking Fire22 tables...');
      const requiredTables = [
        'fire22_customers',
        'fire22_agents',
        'fire22_transactions',
        'fire22_bets',
      ];

      const existingTables = schemaInfo.tables;
      const missingTables = requiredTables.filter(table => !existingTables.includes(table));

      if (missingTables.length === 0) {
        status.fire22TablesExist = true;
        console.info('   ✅ All Fire22 tables exist');
      } else {
        console.info(`   ⚠️ Missing tables: ${missingTables.join(', ')}`);
        // Create missing tables
        await this.createMissingTables(missingTables);
        status.fire22TablesExist = true;
      }

      // 4. Check data population
      console.info('\n📊 Checking data population...');
      const dataStats = await this.checkDataStats();
      status.dataPopulated = dataStats.totalRecords > 0;

      console.info(`   👥 Customers: ${dataStats.customers}`);
      console.info(`   🎯 Agents: ${dataStats.agents}`);
      console.info(`   💰 Transactions: ${dataStats.transactions}`);
      console.info(`   🎲 Bets: ${dataStats.bets}`);
      console.info(`   📈 Total Records: ${dataStats.totalRecords}`);

      // 5. Populate fresh test data if needed
      if (!status.dataPopulated) {
        console.info('\n🔄 Populating fresh test data...');
        await this.populateTestData();

        const newStats = await this.checkDataStats();
        console.info(`   ✅ Populated ${newStats.totalRecords} records`);
        status.dataPopulated = true;
      }

      return status;
    } catch (error) {
      console.error('❌ Database verification failed:', error);
      throw error;
    }
  }

  async createMissingTables(missingTables: string[]): Promise<void> {
    console.info('🔨 Creating missing Fire22 tables...');

    const db = databaseService.getDatabase();

    for (const table of missingTables) {
      console.info(`   Creating ${table}...`);

      switch (table) {
        case 'fire22_customers':
          await db.exec(`
            CREATE TABLE IF NOT EXISTS fire22_customers (
              id INTEGER PRIMARY KEY,
              fire22_customer_id TEXT UNIQUE NOT NULL,
              agent_id TEXT NOT NULL,
              parent_agent TEXT,
              master_agent TEXT,
              login TEXT UNIQUE NOT NULL,
              tier TEXT DEFAULT 'bronze',
              status TEXT DEFAULT 'active',
              vip_status BOOLEAN DEFAULT FALSE,
              balance REAL DEFAULT 0,
              casino_balance REAL DEFAULT 0,
              sports_balance REAL DEFAULT 0,
              freeplay_balance REAL DEFAULT 0,
              total_deposits REAL DEFAULT 0,
              total_withdrawals REAL DEFAULT 0,
              lifetime_volume REAL DEFAULT 0,
              net_loss REAL DEFAULT 0,
              total_bets_placed INTEGER DEFAULT 0,
              total_bets_won INTEGER DEFAULT 0,
              last_activity TEXT,
              last_login TEXT,
              login_count INTEGER DEFAULT 0,
              risk_score INTEGER DEFAULT 0,
              risk_level TEXT DEFAULT 'low',
              kyc_status TEXT DEFAULT 'pending',
              kyc_documents TEXT DEFAULT '[]',
              first_name TEXT,
              last_name TEXT,
              email TEXT,
              phone TEXT,
              preferences TEXT DEFAULT '{}',
              fire22_synced_at TEXT,
              sync_version INTEGER DEFAULT 1,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
              deleted_at TEXT
            );
          `);
          break;

        case 'fire22_agents':
          await db.exec(`
            CREATE TABLE IF NOT EXISTS fire22_agents (
              id INTEGER PRIMARY KEY,
              agent_id TEXT UNIQUE NOT NULL,
              agent_login TEXT UNIQUE NOT NULL,
              agent_name TEXT NOT NULL,
              agent_type TEXT DEFAULT 'agent',
              parent_agent TEXT,
              master_agent TEXT,
              level INTEGER DEFAULT 1,
              commission_rate REAL DEFAULT 0.05,
              total_customers INTEGER DEFAULT 0,
              active_customers INTEGER DEFAULT 0,
              total_volume REAL DEFAULT 0,
              total_commission REAL DEFAULT 0,
              performance_score INTEGER DEFAULT 0,
              permissions TEXT DEFAULT '{}',
              access_level INTEGER DEFAULT 1,
              allowed_sports TEXT DEFAULT '[]',
              max_bet_limit REAL DEFAULT 1000,
              max_payout_limit REAL DEFAULT 10000,
              contact_email TEXT,
              contact_phone TEXT,
              specializations TEXT DEFAULT '[]',
              languages_spoken TEXT DEFAULT '["en"]',
              last_login TEXT,
              login_count INTEGER DEFAULT 0,
              commission_balance REAL DEFAULT 0,
              pending_commission REAL DEFAULT 0,
              total_paid_commission REAL DEFAULT 0,
              status TEXT DEFAULT 'active',
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
              deleted_at TEXT
            );
          `);
          break;

        case 'fire22_transactions':
          await db.exec(`
            CREATE TABLE IF NOT EXISTS fire22_transactions (
              id INTEGER PRIMARY KEY,
              transaction_id TEXT UNIQUE NOT NULL,
              fire22_customer_id TEXT NOT NULL,
              agent_id TEXT NOT NULL,
              type TEXT NOT NULL,
              status TEXT DEFAULT 'pending',
              amount REAL NOT NULL,
              currency TEXT DEFAULT 'USD',
              balance_after REAL,
              payment_method TEXT,
              processed_by TEXT,
              transaction_datetime TEXT DEFAULT CURRENT_TIMESTAMP,
              processed_datetime TEXT,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);
          break;

        case 'fire22_bets':
          await db.exec(`
            CREATE TABLE IF NOT EXISTS fire22_bets (
              id INTEGER PRIMARY KEY,
              bet_id TEXT UNIQUE NOT NULL,
              ticket_number TEXT,
              fire22_customer_id TEXT NOT NULL,
              agent_id TEXT NOT NULL,
              type TEXT NOT NULL,
              status TEXT DEFAULT 'pending',
              sport TEXT NOT NULL,
              amount REAL NOT NULL,
              potential_payout REAL,
              actual_payout REAL,
              odds REAL NOT NULL,
              teams TEXT,
              outcome TEXT,
              placed_datetime TEXT DEFAULT CURRENT_TIMESTAMP,
              graded_datetime TEXT,
              is_live_bet BOOLEAN DEFAULT FALSE,
              created_at TEXT DEFAULT CURRENT_TIMESTAMP,
              updated_at TEXT DEFAULT CURRENT_TIMESTAMP
            );
          `);
          break;
      }
    }

    // Create indexes
    await db.exec(`
      CREATE INDEX IF NOT EXISTS idx_fire22_customers_agent ON fire22_customers(agent_id);
      CREATE INDEX IF NOT EXISTS idx_fire22_customers_login ON fire22_customers(login);
      CREATE INDEX IF NOT EXISTS idx_fire22_customers_status ON fire22_customers(status);
      
      CREATE INDEX IF NOT EXISTS idx_fire22_agents_parent ON fire22_agents(parent_agent);
      CREATE INDEX IF NOT EXISTS idx_fire22_agents_type ON fire22_agents(agent_type);
      
      CREATE INDEX IF NOT EXISTS idx_fire22_transactions_customer ON fire22_transactions(fire22_customer_id);
      CREATE INDEX IF NOT EXISTS idx_fire22_transactions_type ON fire22_transactions(type);
      
      CREATE INDEX IF NOT EXISTS idx_fire22_bets_customer ON fire22_bets(fire22_customer_id);
      CREATE INDEX IF NOT EXISTS idx_fire22_bets_status ON fire22_bets(status);
    `);

    console.info('   ✅ Fire22 tables created successfully');
  }

  async checkDataStats(): Promise<{
    customers: number;
    agents: number;
    transactions: number;
    bets: number;
    totalRecords: number;
  }> {
    const db = databaseService.getDatabase();

    try {
      const customerCount = await db
        .prepare('SELECT COUNT(*) as count FROM fire22_customers')
        .first();
      const agentCount = await db.prepare('SELECT COUNT(*) as count FROM fire22_agents').first();
      const transactionCount = await db
        .prepare('SELECT COUNT(*) as count FROM fire22_transactions')
        .first();
      const betCount = await db.prepare('SELECT COUNT(*) as count FROM fire22_bets').first();

      const customers = (customerCount as any)?.count || 0;
      const agents = (agentCount as any)?.count || 0;
      const transactions = (transactionCount as any)?.count || 0;
      const bets = (betCount as any)?.count || 0;

      return {
        customers,
        agents,
        transactions,
        bets,
        totalRecords: customers + agents + transactions + bets,
      };
    } catch (error) {
      console.warn('Warning: Could not check data stats, tables may not exist yet');
      return {
        customers: 0,
        agents: 0,
        transactions: 0,
        bets: 0,
        totalRecords: 0,
      };
    }
  }

  async populateTestData(): Promise<void> {
    console.info('🌱 Creating fresh Fire22 test data...');

    // Create test agents first
    const testAgents = [
      {
        agent_id: 'FIRE22_MASTER',
        agent_login: 'masteragent',
        agent_name: 'Master Agent',
        agent_type: 'master_agent' as const,
        level: 8,
        commission_rate: 0.1,
        max_bet_limit: 50000,
        max_payout_limit: 250000,
        contact_email: 'master@fire22.ag',
      },
      {
        agent_id: 'BLAKE_PPH',
        agent_login: 'blakepph',
        agent_name: 'Blake PPH',
        agent_type: 'agent' as const,
        parent_agent: 'FIRE22_MASTER',
        level: 3,
        commission_rate: 0.08,
        max_bet_limit: 25000,
        max_payout_limit: 125000,
        contact_email: 'blake@fire22.ag',
      },
      {
        agent_id: 'VIP_AGENT',
        agent_login: 'vipagent',
        agent_name: 'VIP Agent',
        agent_type: 'agent' as const,
        parent_agent: 'FIRE22_MASTER',
        level: 5,
        commission_rate: 0.12,
        max_bet_limit: 75000,
        max_payout_limit: 375000,
        specializations: '["vip_customers", "high_rollers"]',
        contact_email: 'vip@fire22.ag',
      },
    ];

    for (const agentData of testAgents) {
      const agent = Fire22AgentEntity.createNew(agentData);
      await agentRepository.create(agent.toJSON());
      console.info(`   👤 Created agent: ${agentData.agent_name} (${agentData.agent_id})`);
    }

    // Create test customers
    const testCustomers = [
      {
        fire22_customer_id: 'CUST_VIP_001',
        agent_id: 'VIP_AGENT',
        login: 'vip_whale_player',
        first_name: 'Marcus',
        last_name: 'Thompson',
        email: 'marcus.t@email.com',
        tier: 'vip' as const,
        balance: 75000,
        total_deposits: 500000,
        total_withdrawals: 425000,
        lifetime_volume: 2500000,
        vip_status: true,
        risk_score: 25,
      },
      {
        fire22_customer_id: 'CUST_GOLD_002',
        agent_id: 'BLAKE_PPH',
        login: 'golden_player',
        first_name: 'Sarah',
        last_name: 'Johnson',
        email: 'sarah.j@email.com',
        tier: 'gold' as const,
        balance: 12500,
        total_deposits: 85000,
        total_withdrawals: 72500,
        lifetime_volume: 175000,
        vip_status: false,
        risk_score: 35,
      },
      {
        fire22_customer_id: 'CUST_SILVER_003',
        agent_id: 'BLAKE_PPH',
        login: 'sports_fan_99',
        first_name: 'Mike',
        last_name: 'Rodriguez',
        email: 'mike.r@email.com',
        tier: 'silver' as const,
        balance: 2400,
        total_deposits: 15000,
        total_withdrawals: 12600,
        lifetime_volume: 45000,
        vip_status: false,
        risk_score: 15,
      },
      {
        fire22_customer_id: 'CUST_BRONZE_004',
        agent_id: 'BLAKE_PPH',
        login: 'casual_bettor',
        first_name: 'Jennifer',
        last_name: 'Davis',
        email: 'jen.davis@email.com',
        tier: 'bronze' as const,
        balance: 450,
        total_deposits: 2500,
        total_withdrawals: 2050,
        lifetime_volume: 8500,
        vip_status: false,
        risk_score: 10,
      },
    ];

    for (const customerData of testCustomers) {
      const customer = Fire22CustomerEntity.createNew(customerData);
      await customerRepository.create(customer.toJSON());
      console.info(
        `   👥 Created customer: ${customerData.first_name} ${customerData.last_name} (${customerData.tier})`
      );
    }

    // Create sample transactions
    const testTransactions = [
      {
        transaction_id: 'TXN_DEP_001',
        fire22_customer_id: 'CUST_VIP_001',
        agent_id: 'VIP_AGENT',
        type: 'deposit',
        status: 'completed',
        amount: 25000,
        currency: 'USD',
        balance_after: 75000,
        payment_method: 'bank_transfer',
      },
      {
        transaction_id: 'TXN_WD_002',
        fire22_customer_id: 'CUST_GOLD_002',
        agent_id: 'BLAKE_PPH',
        type: 'withdrawal',
        status: 'completed',
        amount: 5000,
        currency: 'USD',
        balance_after: 12500,
        payment_method: 'bank_transfer',
      },
    ];

    const db = databaseService.getDatabase();
    for (const txnData of testTransactions) {
      await db
        .prepare(
          `
        INSERT INTO fire22_transactions 
        (transaction_id, fire22_customer_id, agent_id, type, status, amount, currency, balance_after, payment_method)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          txnData.transaction_id,
          txnData.fire22_customer_id,
          txnData.agent_id,
          txnData.type,
          txnData.status,
          txnData.amount,
          txnData.currency,
          txnData.balance_after,
          txnData.payment_method
        )
        .run();

      console.info(
        `   💰 Created transaction: ${txnData.type} $${txnData.amount} (${txnData.transaction_id})`
      );
    }

    // Create sample bets
    const testBets = [
      {
        bet_id: 'BET_NFL_001',
        ticket_number: 'TKT_001',
        fire22_customer_id: 'CUST_VIP_001',
        agent_id: 'VIP_AGENT',
        type: 'straight',
        status: 'won',
        sport: 'football',
        amount: 5000,
        potential_payout: 9500,
        actual_payout: 9500,
        odds: -110,
        teams: '{"home": "Patriots", "away": "Bills"}',
        outcome: 'Patriots -3.5 WON',
      },
      {
        bet_id: 'BET_NBA_002',
        ticket_number: 'TKT_002',
        fire22_customer_id: 'CUST_GOLD_002',
        agent_id: 'BLAKE_PPH',
        type: 'parlay',
        status: 'pending',
        sport: 'basketball',
        amount: 500,
        potential_payout: 2800,
        odds: 460,
        teams: '{"leg1": "Lakers vs Warriors", "leg2": "Celtics vs Heat"}',
        is_live_bet: false,
      },
    ];

    for (const betData of testBets) {
      await db
        .prepare(
          `
        INSERT INTO fire22_bets 
        (bet_id, ticket_number, fire22_customer_id, agent_id, type, status, sport, amount, potential_payout, actual_payout, odds, teams, outcome, is_live_bet)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
        )
        .bind(
          betData.bet_id,
          betData.ticket_number,
          betData.fire22_customer_id,
          betData.agent_id,
          betData.type,
          betData.status,
          betData.sport,
          betData.amount,
          betData.potential_payout,
          betData.actual_payout || null,
          betData.odds,
          betData.teams,
          betData.outcome || null,
          betData.is_live_bet
        )
        .run();

      console.info(`   🎲 Created bet: ${betData.sport} $${betData.amount} (${betData.status})`);
    }

    console.info('   ✅ Fresh test data populated successfully');
  }

  async demonstrateRepositoryOperations(): Promise<void> {
    console.info('\n🔧 Demonstrating Fire22 Repository Operations...\n');

    // Test customer repository
    console.info('👥 Customer Repository Tests:');

    // Find VIP customers
    const vipCustomers = await customerRepository.findVipCustomers();
    console.info(`   ✨ VIP Customers: ${vipCustomers.data?.length || 0}`);

    if (vipCustomers.data && vipCustomers.data.length > 0) {
      const vip = vipCustomers.data[0];
      console.info(`   🎯 First VIP: ${vip.login} - Balance: $${vip.balance.toLocaleString()}`);
    }

    // Get customer metrics
    const customerMetrics = await customerRepository.getCustomerMetrics();
    if (customerMetrics.success && customerMetrics.data) {
      const metrics = customerMetrics.data;
      console.info(`   📊 Total Customers: ${metrics.total_customers}`);
      console.info(`   💰 Total Balance: $${metrics.total_balance.toLocaleString()}`);
      console.info(
        `   📈 Tier Distribution: Bronze:${metrics.by_tier.bronze}, Silver:${metrics.by_tier.silver}, Gold:${metrics.by_tier.gold}, VIP:${metrics.by_tier.vip}`
      );
    }

    // Test agent repository
    console.info('\n🎯 Agent Repository Tests:');

    // Get agent hierarchy
    const hierarchy = await agentRepository.getAgentHierarchy();
    console.info(`   🌳 Hierarchy Levels: ${hierarchy.data?.length || 0}`);

    // Get agent metrics
    const agentMetrics = await agentRepository.getAgentMetrics();
    if (agentMetrics.success && agentMetrics.data) {
      const metrics = agentMetrics.data;
      console.info(`   👤 Total Agents: ${metrics.total_agents}`);
      console.info(`   💼 Active Agents: ${metrics.active_agents}`);
      console.info(`   💰 Total Volume: $${metrics.total_volume.toLocaleString()}`);
      console.info(`   🏆 Avg Performance: ${metrics.average_performance_score.toFixed(1)}/100`);
    }
  }

  async generateStatusReport(): Promise<void> {
    console.info('\n📋 Fire22 Database Status Report');
    console.info('═'.repeat(50));

    const status = await this.verifyDatabaseStatus();

    console.info('\n🔍 Connection Status:');
    console.info(`   Database Connected: ${status.connected ? '✅' : '❌'}`);
    console.info(`   Schema Exists: ${status.schemaExists ? '✅' : '❌'}`);
    console.info(`   Fire22 Tables: ${status.fire22TablesExist ? '✅' : '❌'}`);
    console.info(`   Data Populated: ${status.dataPopulated ? '✅' : '❌'}`);

    console.info('\n📊 Cache Status:');
    console.info(`   Last Verification: ${new Date().toLocaleString()}`);
    console.info(`   Total Tables: ${status.tableCount}`);

    if (status.connected && status.dataPopulated) {
      await this.demonstrateRepositoryOperations();
    }

    console.info('\n✅ Fire22 database verification completed successfully!');
  }
}

// Run verification if script is executed directly
if (import.meta.main) {
  const verifier = new Fire22DatabaseVerifier();

  try {
    await verifier.generateStatusReport();
  } catch (error) {
    console.error('❌ Verification failed:', error);
    process.exit(1);
  }
}
