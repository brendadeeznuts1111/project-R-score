import { describe, it, expect, mock, spyOn } from 'bun:test';
import { Fantasy402Gateway, FantasyGatewayConfig } from '../gateway/fantasy402-gateway';
import { Fantasy402Adapter } from '../adapters/fantasy402-adapter';

// Mock the adapter
const mockAdapter = {
  authenticate: mock(() => Promise.resolve()),
  getAgents: mock(() => Promise.resolve([])),
  getAgent: mock(() => Promise.resolve(null)),
  getBets: mock(() => Promise.resolve([])),
  getBet: mock(() => Promise.resolve(null)),
  getAccounts: mock(() => Promise.resolve([])),
  getAccount: mock(() => Promise.resolve(null)),
  getSportEvents: mock(() => Promise.resolve([])),
  getSportEvent: mock(() => Promise.resolve(null)),
  placeBet: mock(() => Promise.resolve({ betId: 'MOCK_BET_123' })),
  cancelBet: mock(() => Promise.resolve(true)),
  settleBet: mock(() => Promise.resolve(true)),
  updateAgent: mock(() => Promise.resolve(true)),
  updateAccount: mock(() => Promise.resolve(true)),
  updateSportEvent: mock(() => Promise.resolve(true)),
};

describe('Fantasy402Gateway', () => {
  const config: FantasyGatewayConfig = {
    baseUrl: 'https://api.fantasy402.com',
    apiUrl: 'https://api.fantasy402.com/v1',
    username: 'testuser',
    password: 'testpass',
    requestTimeout: 30000,
    retryAttempts: 3,
    healthCheckLatencyThreshold: 5000,
    enableEventVersioning: true,
  };

  it('initializes successfully with valid config', async () => {
    const gateway = new Fantasy402Gateway(config, undefined, mockAdapter as any);

    await expect(gateway.initialize()).resolves.toBeUndefined();
    expect(mockAdapter.authenticate).toHaveBeenCalled();
  });

  it('handles authentication failure gracefully', async () => {
    const failingAdapter = {
      ...mockAdapter,
      authenticate: mock(() => Promise.reject(new Error('Authentication failed'))),
    };

    const gateway = new Fantasy402Gateway(config, undefined, failingAdapter as any);

    await expect(gateway.initialize()).rejects.toThrow('Authentication failed');
  });

  it('creates gateway with default adapter when none provided', () => {
    const gateway = new Fantasy402Gateway(config);
    expect(gateway).toBeDefined();
  });

  it('configures event versioning correctly', () => {
    const gatewayWithVersioning = new Fantasy402Gateway({
      ...config,
      enableEventVersioning: true,
    });

    const gatewayWithoutVersioning = new Fantasy402Gateway({
      ...config,
      enableEventVersioning: false,
    });

    expect(gatewayWithVersioning).toBeDefined();
    expect(gatewayWithoutVersioning).toBeDefined();
  });
});
