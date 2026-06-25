/**
 * 🧪 Fire22 Dashboard - Test Database Fixtures
 * Sample data for testing database operations
 */

export interface CustomerFixture {
  customer_id: string;
  username: string;
  first_name: string;
  last_name: string;
  login: string;
  created_at?: string;
}

export interface TransactionFixture {
  customer_id: string;
  amount: number;
  tran_type: string;
  short_desc: string;
  agent_id?: string;
  tran_code?: string;
  document_number?: string;
  entered_by?: string;
  freeplay_balance?: number;
  freeplay_pending_balance?: number;
  freeplay_pending_count?: number;
  grade_num?: number;
  login?: string;
  tran_datetime?: string;
}

export interface BetFixture {
  customer_id: number;
  amount: number;
  odds: number;
  type: string;
  status: string;
  outcome?: string;
  teams: string;
  created_at?: string;
}

/**
 * Sample customer data for testing
 */
export const sampleCustomers: CustomerFixture[] = [
  {
    customer_id: 'CUST001',
    username: 'johndoe',
    first_name: 'John',
    last_name: 'Doe',
    login: 'CUST001',
  },
  {
    customer_id: 'CUST002',
    username: 'janesmith',
    first_name: 'Jane',
    last_name: 'Smith',
    login: 'CUST002',
  },
  {
    customer_id: 'CUST003',
    username: 'bobjohnson',
    first_name: 'Bob',
    last_name: 'Johnson',
    login: 'CUST003',
  },
  {
    customer_id: 'CUST004',
    username: 'alicebrown',
    first_name: 'Alice',
    last_name: 'Brown',
    login: 'CUST004',
  },
  {
    customer_id: 'CUST005',
    username: 'charliewilson',
    first_name: 'Charlie',
    last_name: 'Wilson',
    login: 'CUST005',
  },
];

/**
 * Sample transaction data for testing
 */
export const sampleTransactions: TransactionFixture[] = [
  {
    customer_id: 'CUST001',
    amount: 1000,
    tran_type: 'deposit',
    short_desc: 'Initial deposit',
    agent_id: 'BLAKEPPH',
    tran_code: 'DEP',
    entered_by: 'SYSTEM',
  },
  {
    customer_id: 'CUST001',
    amount: -50,
    tran_type: 'wager',
    short_desc: 'Sports bet - Lakers vs Warriors',
    agent_id: 'BLAKEPPH',
    tran_code: 'BET',
    entered_by: 'SYSTEM',
  },
  {
    customer_id: 'CUST002',
    amount: 500,
    tran_type: 'deposit',
    short_desc: 'Credit card deposit',
    agent_id: 'BLAKEPPH',
    tran_code: 'DEP',
    entered_by: 'AGENT',
  },
  {
    customer_id: 'CUST002',
    amount: 100,
    tran_type: 'win',
    short_desc: 'Bet win - Cowboys vs Giants',
    agent_id: 'BLAKEPPH',
    tran_code: 'WIN',
    entered_by: 'SYSTEM',
  },
  {
    customer_id: 'CUST003',
    amount: 750,
    tran_type: 'deposit',
    short_desc: 'Bank transfer',
    agent_id: 'BLAKEPPH',
    tran_code: 'DEP',
    entered_by: 'SYSTEM',
  },
  {
    customer_id: 'CUST003',
    amount: -25,
    tran_type: 'wager',
    short_desc: 'Sports bet - Heat vs Celtics',
    agent_id: 'BLAKEPPH',
    tran_code: 'BET',
    entered_by: 'SYSTEM',
  },
  {
    customer_id: 'CUST004',
    amount: 300,
    tran_type: 'deposit',
    short_desc: 'Welcome bonus',
    agent_id: 'BLAKEPPH',
    tran_code: 'BON',
    entered_by: 'AGENT',
  },
  {
    customer_id: 'CUST005',
    amount: 200,
    tran_type: 'deposit',
    short_desc: 'Reload bonus',
    agent_id: 'BLAKEPPH',
    tran_code: 'BON',
    entered_by: 'AGENT',
  },
];

/**
 * Sample bet data for testing
 */
export const sampleBets: BetFixture[] = [
  {
    customer_id: 1, // CUST001
    amount: 50,
    odds: 1.85,
    type: 'moneyline',
    status: 'pending',
    teams: 'Lakers vs Warriors',
  },
  {
    customer_id: 2, // CUST002
    amount: 100,
    odds: 2.1,
    type: 'spread',
    status: 'won',
    outcome: 'win',
    teams: 'Cowboys vs Giants',
  },
  {
    customer_id: 3, // CUST003
    amount: 25,
    odds: 1.95,
    type: 'total',
    status: 'pending',
    teams: 'Heat vs Celtics',
  },
  {
    customer_id: 1, // CUST001
    amount: 75,
    odds: 2.25,
    type: 'moneyline',
    status: 'lost',
    outcome: 'loss',
    teams: 'Yankees vs Red Sox',
  },
  {
    customer_id: 4, // CUST004
    amount: 30,
    odds: 1.75,
    type: 'spread',
    status: 'pending',
    teams: 'Chiefs vs Bills',
  },
  {
    customer_id: 5, // CUST005
    amount: 40,
    odds: 2.5,
    type: 'total',
    status: 'won',
    outcome: 'win',
    teams: 'Dodgers vs Padres',
  },
];

/**
 * Large dataset for performance testing
 */
export const generateLargeCustomerDataset = (count: number): CustomerFixture[] => {
  const customers: CustomerFixture[] = [];

  for (let i = 1; i <= count; i++) {
    const paddedId = i.toString().padStart(6, '0');
    customers.push({
      customer_id: `PERF${paddedId}`,
      username: `perfuser${paddedId}`,
      first_name: `First${paddedId}`,
      last_name: `Last${paddedId}`,
      login: `PERF${paddedId}`,
    });
  }

  return customers;
};

/**
 * Generate large transaction dataset
 */
export const generateLargeTransactionDataset = (
  customerCount: number,
  transactionsPerCustomer: number
): TransactionFixture[] => {
  const transactions: TransactionFixture[] = [];
  const transactionTypes = ['deposit', 'wager', 'win', 'loss', 'bonus'];

  for (let i = 1; i <= customerCount; i++) {
    const paddedId = i.toString().padStart(6, '0');
    const customerId = `PERF${paddedId}`;

    for (let j = 1; j <= transactionsPerCustomer; j++) {
      const type = transactionTypes[Math.floor(Math.random() * transactionTypes.length)];
      const amount =
        type === 'wager' || type === 'loss'
          ? -(Math.floor(Math.random() * 500) + 10)
          : Math.floor(Math.random() * 1000) + 10;

      transactions.push({
        customer_id: customerId,
        amount,
        tran_type: type,
        short_desc: `Performance test ${type} ${j}`,
        agent_id: 'BLAKEPPH',
        tran_code: type.toUpperCase().substring(0, 3),
        entered_by: 'SYSTEM',
      });
    }
  }

  return transactions;
};

/**
 * Edge case data for testing validation and error handling
 */
export const edgeCaseCustomers: CustomerFixture[] = [
  {
    customer_id: '',
    username: 'emptyid',
    first_name: 'Empty',
    last_name: 'ID',
    login: '',
  },
  {
    customer_id: 'VERY_LONG_CUSTOMER_ID_THAT_EXCEEDS_NORMAL_LIMITS_123456789',
    username: 'longid',
    first_name: 'Long',
    last_name: 'ID',
    login: 'VERY_LONG_CUSTOMER_ID_THAT_EXCEEDS_NORMAL_LIMITS_123456789',
  },
  {
    customer_id: 'SPECIAL!@#$%',
    username: 'special',
    first_name: 'Special',
    last_name: 'Characters',
    login: 'SPECIAL!@#$%',
  },
];

/**
 * Invalid transaction data for testing validation
 */
export const invalidTransactions: Partial<TransactionFixture>[] = [
  {
    customer_id: 'NONEXISTENT',
    amount: 100,
    tran_type: 'deposit',
    short_desc: 'Invalid customer',
  },
  {
    customer_id: 'CUST001',
    amount: -999999999,
    tran_type: 'deposit',
    short_desc: 'Negative deposit',
  },
  {
    customer_id: 'CUST001',
    // Missing amount
    tran_type: 'deposit',
    short_desc: 'Missing amount',
  },
];

/**
 * Test data insertion helpers
 */
export class TestDataInserter {
  /**
   * Insert sample customers into database
   */
  static insertCustomers(db: any, customers: CustomerFixture[] = sampleCustomers): void {
    const insertQuery = db.query(`
      INSERT INTO customers (customer_id, username, first_name, last_name, login)
      VALUES (?, ?, ?, ?, ?)
    `);

    for (const customer of customers) {
      insertQuery.run(
        customer.customer_id,
        customer.username,
        customer.first_name,
        customer.last_name,
        customer.login
      );
    }
  }

  /**
   * Insert sample transactions into database
   */
  static insertTransactions(
    db: any,
    transactions: TransactionFixture[] = sampleTransactions
  ): void {
    const insertQuery = db.query(`
      INSERT INTO transactions (customer_id, amount, tran_type, short_desc, agent_id, tran_code, entered_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const transaction of transactions) {
      insertQuery.run(
        transaction.customer_id,
        transaction.amount,
        transaction.tran_type,
        transaction.short_desc,
        transaction.agent_id || 'BLAKEPPH',
        transaction.tran_code || 'TXN',
        transaction.entered_by || 'SYSTEM'
      );
    }
  }

  /**
   * Insert sample bets into database
   */
  static insertBets(db: any, bets: BetFixture[] = sampleBets): void {
    const insertQuery = db.query(`
      INSERT INTO bets (customer_id, amount, odds, type, status, outcome, teams)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    for (const bet of bets) {
      insertQuery.run(
        bet.customer_id,
        bet.amount,
        bet.odds,
        bet.type,
        bet.status,
        bet.outcome || null,
        bet.teams
      );
    }
  }

  /**
   * Insert complete test dataset
   */
  static insertCompleteDataset(db: any): void {
    this.insertCustomers(db);
    this.insertTransactions(db);
    this.insertBets(db);
  }
}

export default {
  sampleCustomers,
  sampleTransactions,
  sampleBets,
  edgeCaseCustomers,
  invalidTransactions,
  generateLargeCustomerDataset,
  generateLargeTransactionDataset,
  TestDataInserter,
};
