/**
 * Integration Layer Usage Example
 * Domain-Driven Design Implementation
 *
 * This file demonstrates how to use the Fantasy402 Integration Layer
 * to connect external systems with internal domains.
 */

import {
  Fantasy402Gateway,
  FantasySportEvent,
  FantasyAgent,
  FantasyAccount,
  ExternalEventMapper,
  DomainEvents,
} from './index';

// Example: Setting up the Fantasy402 Gateway
async function setupFantasy402Integration() {
  console.log('🚀 Setting up Fantasy402 Integration...');

  // Configure the gateway
  const gateway = new Fantasy402Gateway({
    baseUrl: 'https://fantasy402.com',
    apiUrl: 'https://fantasy402.com/cloud/api',
    username: process.env.FANTASY402_USERNAME || '',
    password: process.env.FANTASY402_PASSWORD || '',
    requestTimeout: 30000,
    retryAttempts: 3,
  });

  // Initialize the gateway
  await gateway.initialize();

  // Set up event mapper for external events
  const eventMapper = new ExternalEventMapper(DomainEvents.getInstance());

  return { gateway, eventMapper };
}

// Example: Fetching live sports events
async function fetchLiveEvents(gateway: Fantasy402Gateway) {
  console.log('📊 Fetching live sports events...');

  const events = await gateway.getLiveSportEvents({
    sport: 'football',
    status: 'in_progress',
    limit: 10,
  });

  console.log(`Found ${events.length} live events:`);
  events.forEach(event => {
    console.log(`- ${event.getDisplayName()} (${event.getSport()})`);
    console.log(`  Status: ${event.getStatus()}`);
    console.log(
      `  Score: ${event.getScore() ? `${event.getScore()?.home} - ${event.getScore()?.away}` : 'Not started'}`
    );
  });

  return events;
}

// Example: Getting agent information
async function getAgentDetails(gateway: Fantasy402Gateway, agentId: string) {
  console.log(`👤 Getting agent details for: ${agentId}`);

  const agent = await gateway.getAgent(agentId);
  if (!agent) {
    console.log('Agent not found');
    return null;
  }

  const account = await gateway.getAgentAccount(agentId);

  console.log(`Agent: ${agent.getOffice()} - ${agent.getStore()}`);
  console.log(`Type: ${agent.getAgentType()}`);
  console.log(`Status: ${agent.getStatus()}`);
  console.log(`Permissions:`, agent.getPermissions());

  if (account) {
    console.log(`Balance: $${account.getCurrentBalance().getAmount()}`);
    console.log(`Available: $${account.getAvailableBalance().getAmount()}`);
  }

  return { agent, account };
}

// Example: Placing a bet
async function placeBetExample(gateway: Fantasy402Gateway) {
  console.log('🎯 Placing a bet...');

  try {
    const bet = await gateway.placeBet({
      agentId: 'AGENT001',
      eventId: 'EVENT123',
      betType: 'moneyline',
      amount: 100,
      odds: 150, // +150 odds
      selection: 'home',
    });

    console.log(`Bet placed successfully:`);
    console.log(`- Bet ID: ${bet.getExternalId()}`);
    console.log(`- Amount: $${bet.getAmount().getAmount()}`);
    console.log(`- Odds: ${bet.getOdds()}`);
    console.log(`- Potential Payout: $${bet.getPotentialPayout().getAmount()}`);

    return bet;
  } catch (error) {
    console.error('Failed to place bet:', error instanceof Error ? error.message : String(error));
    return null;
  }
}

// Example: Processing external events
async function processExternalEventExample(eventMapper: ExternalEventMapper) {
  console.log('📡 Processing external event...');

  // Simulate receiving an external event
  const externalEvent = {
    eventType: 'fantasy402.sport_event.started',
    eventId: 'ext-123',
    source: 'fantasy402',
    timestamp: new Date(),
    payload: {
      eventId: 'EVENT456',
      sport: 'basketball',
      league: 'NBA',
      home_team: 'Lakers',
      away_team: 'Warriors',
      start_time: new Date().toISOString(),
    },
  };

  // Process the external event (this will publish internal domain events)
  await eventMapper.processExternalEvent(externalEvent);

  console.log('External event processed and internal events published');
}

// Example: Setting up event handlers for domain communication
function setupEventHandlers() {
  const events = DomainEvents.getInstance();

  // Handle new sport events discovered
  events.subscribe('fantasy.sport_event.discovered', async event => {
    console.log('🎉 New sport event discovered:', event.payload);

    // Here you could notify other domains (e.g., Collections domain)
    // about new betting opportunities
  });

  // Handle bet placements
  events.subscribe('fantasy.bet.placed', async event => {
    console.log('💰 Bet placed:', event.payload);

    // Here you could update balance in Balance domain
    // or send notifications via Communications domain
  });

  // Handle agent balance updates
  events.subscribe('fantasy.account.balance_updated', async event => {
    console.log('💵 Agent balance updated:', event.payload);

    // Here you could trigger balance alerts or update
    // internal balance tracking
  });

  console.log('Event handlers set up successfully');
}

// Main integration example
async function runIntegrationExample() {
  try {
    console.log('🎯 Starting Fantasy402 Integration Example...\n');

    // Step 1: Set up integration
    const { gateway, eventMapper } = await setupFantasy402Integration();

    // Step 2: Set up event handlers
    setupEventHandlers();

    // Step 3: Demonstrate functionality
    console.log('\n=== FETCHING LIVE EVENTS ===');
    await fetchLiveEvents(gateway);

    console.log('\n=== GETTING AGENT DETAILS ===');
    await getAgentDetails(gateway, 'AGENT001');

    console.log('\n=== PLACING BET EXAMPLE ===');
    await placeBetExample(gateway);

    console.log('\n=== PROCESSING EXTERNAL EVENT ===');
    await processExternalEventExample(eventMapper);

    // Step 4: Health check
    console.log('\n=== HEALTH CHECK ===');
    const health = await gateway.healthCheck();
    console.log(`Gateway Health: ${health.status} (${health.latency}ms)`);

    console.log('\n✅ Integration example completed successfully!');
  } catch (error) {
    console.error('❌ Integration example failed:', error);
  }
}

// Export for use in other modules
export {
  setupFantasy402Integration,
  fetchLiveEvents,
  getAgentDetails,
  placeBetExample,
  processExternalEventExample,
  setupEventHandlers,
  runIntegrationExample,
};

// Run example if this file is executed directly
if (import.meta.main) {
  runIntegrationExample();
}
