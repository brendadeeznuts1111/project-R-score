#!/usr/bin/env bun

/**
 * Queue System Demo
 *
 * This script demonstrates the peer-to-peer matching queue system
 */

import { Database } from 'bun:sqlite';
import { WithdrawalQueueSystem } from '../src/queue-system';

class QueueDemo {
  private db: Database;
  private queueSystem: WithdrawalQueueSystem;

  constructor() {
    this.db = new Database(':memory:');
    this.setupDatabase();
    this.queueSystem = new WithdrawalQueueSystem({ DB: this.db });
  }

  private setupDatabase() {
    console.log('🔧 Setting up demo database...');

    // Create players table
    this.db.run(`
      CREATE TABLE players (
        customer_id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        balance REAL DEFAULT 0
      )
    `);

    // Create queue items table
    this.db.run(`
      CREATE TABLE queue_items (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL CHECK (type IN ('withdrawal', 'deposit')),
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        payment_type TEXT NOT NULL,
        payment_details TEXT,
        priority INTEGER DEFAULT 1,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        matched_with TEXT,
        notes TEXT
      )
    `);

    // Create queue matches table
    this.db.run(`
      CREATE TABLE queue_matches (
        id TEXT PRIMARY KEY,
        withdrawal_id TEXT NOT NULL,
        deposit_id TEXT NOT NULL,
        amount REAL NOT NULL,
        match_score INTEGER NOT NULL,
        processing_time INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        completed_at TEXT,
        notes TEXT
      )
    `);

    // Create transactions table
    this.db.run(`
      CREATE TABLE transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        transaction_type TEXT NOT NULL,
        notes TEXT,
        reference_id TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )
    `);

    // Create withdrawals table
    this.db.run(`
      CREATE TABLE withdrawals (
        id TEXT PRIMARY KEY,
        customer_id TEXT NOT NULL,
        amount REAL NOT NULL,
        method TEXT NOT NULL DEFAULT 'bank_transfer',
        payment_type TEXT NOT NULL DEFAULT 'bank_transfer',
        payment_details TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        requested_by TEXT NOT NULL,
        approved_by TEXT,
        notes TEXT,
        approval_notes TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        approved_at TEXT,
        completed_at TEXT
      )
    `);

    // Insert test customers
    this.db.run(
      `
      INSERT INTO players (customer_id, name, balance)
      VALUES (?, ?, ?)
    `,
      ['CUSTOMER_001', 'John Doe', 1000.0]
    );

    this.db.run(
      `
      INSERT INTO players (customer_id, name, balance)
      VALUES (?, ?, ?)
    `,
      ['CUSTOMER_002', 'Jane Smith', 500.0]
    );

    this.db.run(
      `
      INSERT INTO players (customer_id, name, balance)
      VALUES (?, ?, ?)
    `,
      ['CUSTOMER_003', 'Bob Johnson', 750.0]
    );

    console.log('✅ Demo database setup complete\n');
  }

  public async runDemo() {
    console.log('🚀 Starting Queue System Demo\n');

    // Step 1: Add withdrawal to queue
    console.log('📤 Step 1: Adding withdrawal to queue...');
    const withdrawalId = await this.queueSystem.addToQueue({
      type: 'withdrawal',
      customerId: 'CUSTOMER_001',
      amount: 200.0,
      paymentType: 'venmo',
      paymentDetails: '@johndoe',
      priority: 1,
      notes: 'Need money for weekend',
    });
    console.log(`   ✅ Withdrawal added with ID: ${withdrawalId}`);

    // Step 2: Add deposit to queue
    console.log('\n📥 Step 2: Adding deposit to queue...');
    const depositId = await this.queueSystem.addDepositToQueue({
      customerId: 'CUSTOMER_002',
      amount: 250.0,
      paymentType: 'venmo',
      paymentDetails: '@janesmith',
      priority: 1,
      notes: 'Deposit from bank transfer',
    });
    console.log(`   ✅ Deposit added with ID: ${depositId}`);

    // Step 3: Check queue status
    console.log('\n📊 Step 3: Checking queue status...');
    const stats = this.queueSystem.getQueueStats();
    console.log(`   📈 Queue Statistics:`);
    console.log(`      Total Items: ${stats.totalItems}`);
    console.log(`      Pending Withdrawals: ${stats.pendingWithdrawals}`);
    console.log(`      Pending Deposits: ${stats.pendingDeposits}`);
    console.log(`      Matched Pairs: ${stats.matchedPairs}`);

    // Step 4: Show queue items
    console.log('\n📋 Step 4: Queue items...');
    const allItems = this.queueSystem.getQueueItems();
    allItems.forEach(item => {
      console.log(
        `   ${item.type.toUpperCase()}: $${item.amount} (${item.paymentType}) - Status: ${item.status}`
      );
    });

    // Step 5: Show matches
    console.log('\n🔗 Step 5: Matches...');
    const matches = this.queueSystem.getAllMatches();
    if (matches.length > 0) {
      matches.forEach(match => {
        console.log(`   ✅ Match: Withdrawal ${match.withdrawalId} ↔ Deposit ${match.depositId}`);
        console.log(
          `      Amount: $${match.amount}, Score: ${match.matchScore}, Status: ${match.status}`
        );
      });
    } else {
      console.log('   ⏳ No matches found yet');
    }

    // Step 6: Add another withdrawal (different payment type)
    console.log('\n📤 Step 6: Adding PayPal withdrawal...');
    const paypalWithdrawalId = await this.queueSystem.addToQueue({
      type: 'withdrawal',
      customerId: 'CUSTOMER_003',
      amount: 150.0,
      paymentType: 'paypal',
      paymentDetails: 'bob@example.com',
      priority: 1,
      notes: 'PayPal withdrawal',
    });
    console.log(`   ✅ PayPal withdrawal added with ID: ${paypalWithdrawalId}`);

    // Step 7: Add matching PayPal deposit
    console.log('\n📥 Step 7: Adding PayPal deposit...');
    const paypalDepositId = await this.queueSystem.addDepositToQueue({
      customerId: 'CUSTOMER_001',
      amount: 180.0,
      paymentType: 'paypal',
      paymentDetails: 'john@example.com',
      priority: 1,
      notes: 'PayPal deposit',
    });
    console.log(`   ✅ PayPal deposit added with ID: ${paypalDepositId}`);

    // Step 8: Final queue status
    console.log('\n📊 Step 8: Final queue status...');
    const finalStats = this.queueSystem.getQueueStats();
    console.log(`   📈 Final Queue Statistics:`);
    console.log(`      Total Items: ${finalStats.totalItems}`);
    console.log(`      Pending Withdrawals: ${finalStats.pendingWithdrawals}`);
    console.log(`      Pending Deposits: ${finalStats.pendingDeposits}`);
    console.log(`      Matched Pairs: ${finalStats.matchedPairs}`);

    // Step 9: Show all matches
    console.log('\n🔗 Step 9: All matches...');
    const allMatches = this.queueSystem.getAllMatches();
    if (allMatches.length > 0) {
      allMatches.forEach(match => {
        console.log(`   ✅ Match: Withdrawal ${match.withdrawalId} ↔ Deposit ${match.depositId}`);
        console.log(
          `      Amount: $${match.amount}, Score: ${match.matchScore}, Status: ${match.status}`
        );
      });
    } else {
      console.log('   ⏳ No matches found');
    }

    // Step 10: Show matching opportunities
    console.log('\n🎯 Step 10: Matching opportunities...');
    const opportunities = this.db
      .prepare(
        `
      SELECT 
        w.id as withdrawal_id,
        w.customer_id as withdrawal_customer,
        w.amount as withdrawal_amount,
        w.payment_type as withdrawal_payment_type,
        d.id as deposit_id,
        d.customer_id as deposit_customer,
        d.amount as deposit_amount,
        d.payment_type as deposit_payment_type,
        CASE 
          WHEN w.payment_type = d.payment_type THEN 20
          ELSE 0
        END + 
        CASE 
          WHEN ABS(w.amount - d.amount) < 10 THEN 30
          WHEN ABS(w.amount - d.amount) < 50 THEN 20
          WHEN ABS(w.amount - d.amount) < 100 THEN 10
          ELSE 0
        END +
        CASE 
          WHEN w.amount <= d.amount THEN 25
          ELSE 0
        END as match_score
      FROM queue_items w
      CROSS JOIN queue_items d
      WHERE w.type = 'withdrawal' 
        AND d.type = 'deposit'
        AND w.status = 'pending'
        AND d.status = 'pending'
        AND w.amount <= d.amount
        AND w.payment_type = d.payment_type
      ORDER BY match_score DESC, w.created_at ASC
    `
      )
      .all();

    if (opportunities.length > 0) {
      console.log(`   🎯 Found ${opportunities.length} matching opportunities:`);
      opportunities.forEach((opp, index) => {
        console.log(
          `      ${index + 1}. Withdrawal $${opp.withdrawal_amount} (${opp.withdrawal_payment_type}) ↔ Deposit $${opp.deposit_amount} (${opp.deposit_payment_type})`
        );
        console.log(
          `         Score: ${opp.match_score}, Customer: ${opp.withdrawal_customer} ↔ ${opp.deposit_customer}`
        );
      });
    } else {
      console.log('   ⏳ No matching opportunities found');
    }

    console.log('\n🎉 Demo completed!');
    console.log('\n💡 Key Insights:');
    console.log('   • The queue system automatically attempts to match items when they are added');
    console.log('   • Payment types must match exactly for successful pairing');
    console.log('   • Amount compatibility is required (withdrawal ≤ deposit)');
    console.log('   • Higher match scores indicate better compatibility');
    console.log('   • The system prioritizes by payment type, amount difference, and wait time');
  }

  public cleanup() {
    this.db.close();
  }
}

// Run demo
async function main() {
  const demo = new QueueDemo();

  try {
    await demo.runDemo();
  } catch (error) {
    console.error('❌ Demo failed:', error);
  } finally {
    demo.cleanup();
  }
}

if (import.meta.main) {
  main();
}
