/**
 * Complete Integration App
 * Domain-Driven Design with Bun's Native Features
 *
 * Demonstrates end-to-end integration of:
 * - SQLite database with domain entities
 * - YAML configuration management
 * - Bun.secrets for secure credential storage
 * - HTML templates with automatic ETag caching
 * - Domain services and business logic
 * - Hot-reload development server
 */

import { SQL } from 'bun'; // Built-in SQLite
import { YAML } from 'bun'; // Built-in YAML
import { secrets } from 'bun'; // Built-in secrets
import dashboardHTML from './dashboard-integration.html'; // HTML template

// Domain imports
import { FantasyAccount } from './src/domains/external/fantasy402/entities/fantasy-account';
import { FantasyBet } from './src/domains/external/fantasy402/entities/fantasy-bet';
import { Money } from './src/domains/collections/entities/payment';
import { envConfig } from './src/shared/environment-configuration';

// 1. Load YAML configuration with domain-specific settings
const cfg = await import('./config-integration.yaml').then(m => m.default);
const dbPath = cfg.database?.sqlite ?? 'sqlite://domain-data.sqlite';

// 2. Initialize domain database
const db = new SQL(dbPath);

// 3. Create domain-specific tables
await db`
  CREATE TABLE IF NOT EXISTS domain_accounts (
    id TEXT PRIMARY KEY,
    agent_id TEXT NOT NULL,
    current_balance REAL NOT NULL,
    available_balance REAL NOT NULL,
    credit_limit REAL NOT NULL,
    is_active BOOLEAN NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

await db`
  CREATE TABLE IF NOT EXISTS domain_bets (
    id TEXT PRIMARY KEY,
    external_id TEXT NOT NULL,
    agent_id TEXT NOT NULL,
    amount REAL NOT NULL,
    odds REAL NOT NULL,
    status TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  )
`;

// 4. Secure secrets management for domain operations
const serviceName = 'domain-integration-app';
await secrets.set({
  service: serviceName,
  name: 'api-key',
  value: cfg.secrets?.apiKey ?? 'demo-api-key',
});

await secrets.set({
  service: serviceName,
  name: 'db-encryption-key',
  value: cfg.secrets?.dbEncryptionKey ?? 'demo-encryption-key',
});

const apiKey = await secrets.get({ service: serviceName, name: 'api-key' });
const dbKey = await secrets.get({
  service: serviceName,
  name: 'db-encryption-key',
});

// 5. Domain service functions
async function createDemoAccount(): Promise<FantasyAccount> {
  const now = new Date();
  const accountData = {
    customerID: 'DEMO-001',
    currentBalance: 1000.0,
    availableBalance: 950.0,
    pendingWagerBalance: 50.0,
    creditLimit: 5000.0,
    active: true,
    lastActivity: now.toISOString(),
    metadata: { source: 'integration-demo' },
  };

  const account = FantasyAccount.fromExternalData(accountData);

  // Persist to database
  await db`
    INSERT INTO domain_accounts (id, agent_id, current_balance, available_balance, credit_limit, is_active, created_at, updated_at)
    VALUES (${account.getId()}, ${account.getAgentId()}, ${account.getCurrentBalance().getAmount()},
            ${account.getAvailableBalance().getAmount()}, ${account.getCreditLimit().getAmount()},
            ${account.getIsActive()}, ${account.getCreatedAt().toISOString()}, ${account.getUpdatedAt().toISOString()})
  `;

  return account;
}

async function createDemoBet(accountId: string): Promise<FantasyBet> {
  const now = new Date();
  const betData = {
    betId: `DEMO-BET-${Date.now()}`,
    agentId: 'DEMO-001',
    eventId: 'EVENT-001',
    betType: 'moneyline',
    amount: 100.0,
    odds: 2.5,
    selection: 'Team A to win',
    status: 'accepted',
    customerId: 'CUSTOMER-001',
    placedAt: now.toISOString(),
    metadata: { demo: true },
  };

  const bet = FantasyBet.fromExternalData(betData);

  // Persist to database
  await db`
    INSERT INTO domain_bets (id, external_id, agent_id, amount, odds, status, created_at, updated_at)
    VALUES (${bet.getId()}, ${bet.getExternalId()}, ${bet.getAgentId()}, ${bet.getAmount().getAmount()},
            ${bet.getOdds()}, ${bet.getStatus()}, ${bet.getCreatedAt().toISOString()}, ${bet.getUpdatedAt().toISOString()})
  `;

  return bet;
}

async function getDomainStats() {
  const accounts = await db`SELECT COUNT(*) as count FROM domain_accounts`;
  const bets = await db`SELECT COUNT(*) as count FROM domain_bets`;
  const totalBalance = await db`SELECT SUM(current_balance) as total FROM domain_accounts`;

  return {
    accountsCount: accounts[0].count,
    betsCount: bets[0].count,
    totalBalance: totalBalance[0].total || 0,
    timezone: envConfig.timezone.default,
    lastUpdated: new Date().toISOString(),
  };
}

// 6. Initialize demo data
console.log('🏗️  Initializing domain data...');
const demoAccount = await createDemoAccount();
const demoBet = await createDemoBet(demoAccount.getId());
console.log('✅ Demo data created');

// 7. Domain server with Bun's native integrations
Bun.serve({
  port: cfg.server?.port ?? 3000,
  hostname: cfg.server?.host ?? 'localhost',
  development: true, // Hot-reload + console echo + HMR

  // HTML routes with automatic ETag generation
  routes: {
    '/': dashboardHTML,
    '/dashboard': dashboardHTML,
  },

  async fetch(req: Request) {
    const url = new URL(req.url);
    const pathname = url.pathname;

    // Domain API endpoints
    if (pathname === '/api/domain/stats') {
      const stats = await getDomainStats();
      return Response.json(stats);
    }

    if (pathname === '/api/domain/accounts') {
      const accounts = await db`SELECT * FROM domain_accounts ORDER BY created_at DESC LIMIT 10`;
      return Response.json(accounts);
    }

    if (pathname === '/api/domain/bets') {
      const bets = await db`SELECT * FROM domain_bets ORDER BY created_at DESC LIMIT 10`;
      return Response.json(bets);
    }

    if (pathname === '/api/domain/config') {
      // Return safe configuration (without secrets)
      return Response.json({
        database: cfg.database,
        server: cfg.server,
        timezone: envConfig.timezone.default,
        features: cfg.features,
        hasApiKey: !!apiKey,
        hasDbKey: !!dbKey,
      });
    }

    // Domain operations
    if (pathname === '/api/domain/operations/create-account' && req.method === 'POST') {
      try {
        const account = await createDemoAccount();
        return Response.json({
          success: true,
          account: account.toJSON(),
        });
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message,
          },
          { status: 500 }
        );
      }
    }

    if (pathname === '/api/domain/operations/create-bet' && req.method === 'POST') {
      try {
        const data = await req.json();
        const accountId = data.accountId || demoAccount.getId();
        const bet = await createDemoBet(accountId);
        return Response.json({
          success: true,
          bet: bet.toJSON(),
        });
      } catch (error) {
        return Response.json(
          {
            success: false,
            error: error.message,
          },
          { status: 500 }
        );
      }
    }

    return new Response('Not found', { status: 404 });
  },

  // Enhanced development features
  development: {
    hmr: true,
    console: true, // Echo browser console logs to terminal
  },
});

console.log('🚀 Domain Integration Server Started!');
console.log(`📍 Server: http://localhost:${cfg.server?.port ?? 3000}`);
console.log('🔧 Features:');
console.log('   ✅ SQLite database with domain entities');
console.log('   ✅ YAML configuration management');
console.log('   ✅ Bun.secrets for secure credentials');
console.log('   ✅ HTML templates with automatic ETags');
console.log('   ✅ Hot-reload development');
console.log('   ✅ Domain-driven API endpoints');
console.log('   ✅ Console log streaming from browser');
console.log('');
console.log('📊 Available endpoints:');
console.log('   🌐 / - Main dashboard');
console.log('   📈 /api/domain/stats - Domain statistics');
console.log('   💳 /api/domain/accounts - Account data');
console.log('   🎯 /api/domain/bets - Bet data');
console.log('   ⚙️  /api/domain/config - Safe configuration');
console.log('   🔧 /api/domain/operations/* - Domain operations');
console.log('');
console.log('🎯 Try these commands:');
console.log('   curl http://localhost:3000/api/domain/stats');
console.log('   curl -X POST http://localhost:3000/api/domain/operations/create-bet');
console.log('');
console.log('🔥 Hot-reload enabled - edit files and see changes instantly!');
