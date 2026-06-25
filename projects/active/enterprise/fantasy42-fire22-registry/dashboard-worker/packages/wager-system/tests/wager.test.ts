import { describe, test, expect, beforeEach } from 'bun:test';
import {
  WagerSystem,
  WagerRequest,
  Wager,
  Customer,
  Agent,
  Event,
  Selection,
} from '../src/index.ts';

describe('WagerSystem', () => {
  let wagerSystem: WagerSystem;
  let testCustomer: Customer;
  let testAgent: Agent;
  let testEvent: Event;
  let testSelection: Selection;

  beforeEach(() => {
    wagerSystem = new WagerSystem();

    // Setup test data
    testCustomer = {
      id: 'cust-001',
      login: 'testuser',
      name: 'Test Customer',
      email: 'test@example.com',
      balance: 1000,
      creditLimit: 500,
      vipLevel: 'bronze',
      status: 'active',
      bettingLimits: {
        maxBet: 100,
        maxDaily: 500,
        maxWeekly: 2000,
        maxMonthly: 5000,
      },
      preferences: {
        favoriteSports: ['football'],
        favoriteTeams: ['team-001'],
        notificationSettings: { email: true, sms: false },
      },
      createdAt: new Date().toISOString(),
      lastActivity: new Date().toISOString(),
    };

    testAgent = {
      id: 'agent-001',
      login: 'testagent',
      name: 'Test Agent',
      email: 'agent@example.com',
      phone: '+1234567890',
      status: 'active',
      level: 'agent',
      commission: {
        baseRate: 0.05,
        bonusRate: 0.02,
        performanceMultiplier: 1.0,
      },
      limits: {
        maxCustomerBet: 1000,
        maxTotalExposure: 10000,
        maxDailyVolume: 50000,
      },
      hierarchy: {
        childAgentIds: [],
      },
      performance: {
        totalVolume: 0,
        totalCommission: 0,
        customerCount: 1,
        averageBet: 0,
      },
    };

    testEvent = {
      id: 'event-001',
      sportId: 'sport-001',
      leagueId: 'league-001',
      homeTeamId: 'team-001',
      awayTeamId: 'team-002',
      eventDate: new Date().toISOString(),
      status: 'upcoming',
      startTime: new Date().toISOString(),
      venue: 'Test Stadium',
    };

    testSelection = {
      id: 'sel-001',
      eventId: 'event-001',
      betTypeId: 'bet-001',
      description: 'Home team to win',
      odds: {
        american: -110,
        decimal: 1.91,
        fractional: '10/11',
      },
      status: 'active',
    };

    // Add test data to system
    (wagerSystem as any).customers.set(testCustomer.id, testCustomer);
    (wagerSystem as any).agents.set(testAgent.id, testAgent);
    (wagerSystem as any).events.set(testEvent.id, testEvent);
    (wagerSystem as any).selections.set(testSelection.id, testSelection);
  });

  describe('Wager Creation', () => {
    test('should create a valid wager', async () => {
      const wagerRequest: WagerRequest = {
        customerId: 'cust-001',
        agentId: 'agent-001',
        eventId: 'event-001',
        betTypeId: 'bet-001',
        selections: [
          {
            selectionId: 'sel-001',
            odds: -110,
          },
        ],
        amountWagered: 50,
        betType: 'straight',
      };

      const wager = await wagerSystem.createWager(wagerRequest);

      expect(wager).toBeDefined();
      expect(wager.wagerNumber).toBeGreaterThan(0);
      expect(wager.customerId).toBe('cust-001');
      expect(wager.agentId).toBe('agent-001');
      expect(wager.status).toBe('pending');
      expect(wager.amountWagered).toBe(50);
    });

    test('should calculate correct financial amounts', async () => {
      const wagerRequest: WagerRequest = {
        customerId: 'cust-001',
        agentId: 'agent-001',
        eventId: 'event-001',
        betTypeId: 'bet-001',
        selections: [
          {
            selectionId: 'sel-001',
            odds: -110,
          },
        ],
        amountWagered: 100,
        betType: 'straight',
      };

      const wager = await wagerSystem.createWager(wagerRequest);

      expect(wager.amountWagered).toBe(100);
      expect(wager.toWinAmount).toBeCloseTo(90.91, 2); // -110 odds on $100
      expect(wager.riskAmount).toBe(100);
      expect(wager.volumeAmount).toBe(100);
    });

    test('should validate wager before creation', async () => {
      const wagerRequest: WagerRequest = {
        customerId: 'cust-001',
        agentId: 'agent-001',
        eventId: 'event-001',
        betTypeId: 'bet-001',
        selections: [
          {
            selectionId: 'sel-001',
            odds: -110,
          },
        ],
        amountWagered: 0, // Invalid amount
        betType: 'straight',
      };

      await expect(wagerSystem.createWager(wagerRequest)).rejects.toThrow();
    });
  });

  describe('Wager Retrieval', () => {
    test('should retrieve wager by number', async () => {
      const wagerRequest: WagerRequest = {
        customerId: 'cust-001',
        agentId: 'agent-001',
        eventId: 'event-001',
        betTypeId: 'bet-001',
        selections: [
          {
            selectionId: 'sel-001',
            odds: -110,
          },
        ],
        amountWagered: 50,
        betType: 'straight',
      };

      const createdWager = await wagerSystem.createWager(wagerRequest);
      const retrievedWager = await wagerSystem.getWager(createdWager.wagerNumber);

      expect(retrievedWager).toBeDefined();
      expect(retrievedWager?.wagerNumber).toBe(createdWager.wagerNumber);
    });

    test('should return undefined for non-existent wager', async () => {
      const wager = await wagerSystem.getWager(999999);
      expect(wager).toBeUndefined();
    });
  });

  describe('Customer and Agent Management', () => {
    test('should retrieve customer by ID', async () => {
      const customer = await wagerSystem.getCustomer('cust-001');
      expect(customer).toBeDefined();
      expect(customer?.id).toBe('cust-001');
      expect(customer?.name).toBe('Test Customer');
    });

    test('should retrieve agent by ID', async () => {
      const agent = await wagerSystem.getAgent('agent-001');
      expect(agent).toBeDefined();
      expect(agent?.id).toBe('agent-001');
      expect(agent?.name).toBe('Test Agent');
    });

    test('should update customer metrics after wager creation', async () => {
      const wagerRequest: WagerRequest = {
        customerId: 'cust-001',
        agentId: 'agent-001',
        eventId: 'event-001',
        betTypeId: 'bet-001',
        selections: [
          {
            selectionId: 'sel-001',
            odds: -110,
          },
        ],
        amountWagered: 50,
        betType: 'straight',
      };

      await wagerSystem.createWager(wagerRequest);
      const customer = await wagerSystem.getCustomer('cust-001');

      expect(customer?.lastActivity).toBeDefined();
      expect(new Date(customer!.lastActivity).getTime()).toBeGreaterThan(Date.now() - 1000);
    });
  });

  describe('System Statistics', () => {
    test('should return correct system statistics', async () => {
      const stats = await wagerSystem.getSystemStats();

      expect(stats.totalWagers).toBe(0);
      expect(stats.totalVolume).toBe(0);
      expect(stats.totalExposure).toBe(0);
      expect(stats.pendingWagers).toBe(0);
      expect(stats.activeWagers).toBe(0);
    });

    test('should update statistics after wager creation', async () => {
      const wagerRequest: WagerRequest = {
        customerId: 'cust-001',
        agentId: 'agent-001',
        eventId: 'event-001',
        betTypeId: 'bet-001',
        selections: [
          {
            selectionId: 'sel-001',
            odds: -110,
          },
        ],
        amountWagered: 50,
        betType: 'straight',
      };

      await wagerSystem.createWager(wagerRequest);
      const stats = await wagerSystem.getSystemStats();

      expect(stats.totalWagers).toBe(1);
      expect(stats.totalVolume).toBe(50);
      expect(stats.pendingWagers).toBe(1);
    });
  });

  describe('Wager Queries', () => {
    test('should get wagers by customer', async () => {
      const wagerRequest: WagerRequest = {
        customerId: 'cust-001',
        agentId: 'agent-001',
        eventId: 'event-001',
        betTypeId: 'bet-001',
        selections: [
          {
            selectionId: 'sel-001',
            odds: -110,
          },
        ],
        amountWagered: 50,
        betType: 'straight',
      };

      await wagerSystem.createWager(wagerRequest);
      const customerWagers = await wagerSystem.getWagersByCustomer('cust-001');

      expect(customerWagers).toHaveLength(1);
      expect(customerWagers[0].customerId).toBe('cust-001');
    });

    test('should get wagers by agent', async () => {
      const wagerRequest: WagerRequest = {
        customerId: 'cust-001',
        agentId: 'agent-001',
        eventId: 'event-001',
        betTypeId: 'bet-001',
        selections: [
          {
            selectionId: 'sel-001',
            odds: -110,
          },
        ],
        amountWagered: 50,
        betType: 'straight',
      };

      await wagerSystem.createWager(wagerRequest);
      const agentWagers = await wagerSystem.getWagersByAgent('agent-001');

      expect(agentWagers).toHaveLength(1);
      expect(agentWagers[0].agentId).toBe('agent-001');
    });
  });
});
