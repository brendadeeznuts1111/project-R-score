/**
 * Lightning Network Integration Tests
 * 
 * Comprehensive test suite for Lightning Network payment system
 * including routing, savings optimization, and API endpoints.
 */

import { describe, test, expect, beforeEach, afterEach } from 'bun:test';
import LightningNetworkIntegration from '../src/@payment/lightning-network-integration.js';
import LightningNetworkRouter from '../src/@payment/lightning-network-router.js';
import LightningNetworkAPIServer from '../src/@payment/lightning-network-api.js';

// Mock fetch for testing
global.fetch = async (url: string, options?: any) => {
  // Mock LND API responses
  if (url.includes('/v1/getinfo')) {
    return {
      ok: true,
      json: async () => ({
        identity_pubkey: 'test-pubkey',
        alias: 'test-node',
        version: '0.15.0-beta'
      })
    };
  }
  
  if (url.includes('/v1/invoices')) {
    return {
      ok: true,
      json: async () => ({
        payment_request: 'lnbc1test-invoice',
        r_hash: 'test-rhash',
        add_index: 1,
        payment_addr: 'test-addr',
        description: 'Test invoice',
        expiry: 1800,
        timestamp: Date.now().toString()
      })
    };
  }
  
  if (url.includes('/v1/invoice/')) {
    return {
      ok: true,
      json: async () => ({
        settled: false,
        amt_paid_sat: '0',
        settle_date: '0'
      })
    };
  }
  
  if (url.includes('/v1/balance/blockchain')) {
    return {
      ok: true,
      json: async () => ({
        confirmed_balance: '1000000',
        unconfirmed_balance: '0',
        total_balance: '1000000'
      })
    };
  }
  
  if (url.includes('/v1/balance/channels')) {
    return {
      ok: true,
      json: async () => ({
        local_balance: { sat: '500000' },
        remote_balance: { sat: '500000' },
        pending_open_local_balance: { sat: '0' }
      })
    };
  }
  
  // Mock price API
  if (url.includes('coindesk.com')) {
    return {
      ok: true,
      json: async () => ({
        bpi: {
          USD: { rate_float: 50000 }
        }
      })
    };
  }
  
  // Mock exchange rate API
  if (url.includes('exchangerate-api.com')) {
    return {
      ok: true,
      json: async () => ({
        rates: {
          EUR: 0.85,
          GBP: 0.73
        }
      })
    };
  }
  
  return {
    ok: false,
    status: 404,
    statusText: 'Not Found'
  };
};

describe('Lightning Network Integration', () => {
  let lightning: LightningNetworkIntegration;
  
  beforeEach(() => {
    lightning = new LightningNetworkIntegration(
      {
        url: 'https://localhost:8080',
        macaroon: 'test-macaroon',
        maxChannelBalance: 100000000,
        minChannelBalance: 1000000,
        autoRebalance: true
      },
      {
        enabled: true,
        provider: 'cashapp_green',
        apy: 0.0325,
        minConsolidationAmount: 500000,
        autoConvertToFiat: true,
        targetCurrency: 'USD'
      }
    );
  });

  test('should initialize Lightning Network connection', async () => {
    expect(lightning.isNodeConnected()).toBe(true);
  });

  test('should generate Lightning payment QR code', async () => {
    const payload = {
      amount: 0.001, // 0.001 BTC = 100,000 sats
      currency: 'BTC',
      memo: 'Test payment',
      metadata: {
        questId: 'test-quest',
        userId: 'test-user',
        savingsOptIn: true
      }
    };

    const result = await lightning.generateLightningPayment(payload);
    
    expect(result).toBeDefined();
    expect(result.invoice.paymentRequest).toBe('lnbc1test-invoice');
    expect(result.deepLink).toBe('lightning:lnbc1test-invoice');
    expect(result.estimatedFee).toBeGreaterThan(0);
    expect(result.savingsProjection).toBeDefined();
    expect(result.savingsProjection?.daily).toBeGreaterThan(0);
  });

  test('should reject amounts below minimum', async () => {
    const payload = {
      amount: 0.00000001, // 1 satoshi in BTC
      currency: 'BTC'
    };

    await expect(lightning.generateLightningPayment(payload)).rejects.toThrow('Amount too small');
  });

  test('should reject amounts above maximum', async () => {
    const payload = {
      amount: 2, // 2 BTC = 200,000,000 sats
      currency: 'BTC'
    };

    await expect(lightning.generateLightningPayment(payload)).rejects.toThrow('Amount too large');
  });

  test('should check invoice status', async () => {
    const status = await lightning.checkInvoiceStatus('test-rhash');
    
    expect(status).toBeDefined();
    expect(status.settled).toBe(false);
    expect(status.amount).toBe(0);
  });

  test('should get node balance', async () => {
    const balance = await lightning.getNodeBalance();
    
    expect(balance).toBeDefined();
    expect(balance.confirmed).toBe(1000000);
    expect(balance.unconfirmed).toBe(0);
    expect(balance.total).toBe(1000000);
    expect(balance.channels.local).toBe(500000);
    expect(balance.channels.remote).toBe(500000);
  });

  test('should calculate savings projection', () => {
    const projection = lightning.calculateSavingsProjection(100); // $100
    
    expect(projection).toBeDefined();
    expect(projection.daily).toBeCloseTo(0.0089, 2); // $100 * 3.25% / 365
    expect(projection.monthly).toBeCloseTo(3.30, 2); // Compound monthly
    expect(projection.annual).toBe(3.25); // $100 * 3.25%
  });

  test('should auto-consolidate to savings', async () => {
    const result = await lightning.autoConsolidateToSavings();
    
    expect(result).toBeDefined();
    expect(result.consolidated).toBe(true);
    expect(result.amount).toBeGreaterThan(0);
    expect(result.destination).toBe('Cash App Green Savings');
  });
});

describe('Lightning Network Router', () => {
  let lightning: LightningNetworkIntegration;
  let router: LightningNetworkRouter;
  
  beforeEach(() => {
    lightning = new LightningNetworkIntegration(
      {
        url: 'https://localhost:8080',
        macaroon: 'test-macaroon',
        maxChannelBalance: 100000000,
        minChannelBalance: 1000000,
        autoRebalance: true
      },
      {
        enabled: true,
        provider: 'cashapp_green',
        apy: 0.0325,
        minConsolidationAmount: 500000,
        autoConvertToFiat: true,
        targetCurrency: 'USD'
      }
    );
    
    router = new LightningNetworkRouter(lightning, {
      enabled: true,
      provider: 'cashapp_green',
      targetApy: 0.0325,
      rebalanceThreshold: 500000,
      autoCompound: true
    });
  });

  test('should route micro-payments to Lightning keep strategy', async () => {
    const result = await router.routePayment(25, {
      questId: 'test-quest',
      userId: 'test-user'
    });
    
    expect(result).toBeDefined();
    expect(result.routing.strategy).toBe('micro_lightning_keep');
    expect(result.routing.destination).toBe('Lightning Network');
    expect(result.routing.estimatedYield).toBe(0);
    expect(result.optimization.enabled).toBe(true);
  });

  test('should route medium payments to Cash App Green', async () => {
    const result = await router.routePayment(100, {
      questId: 'test-quest',
      userId: 'test-user',
      savingsOptIn: true
    });
    
    expect(result).toBeDefined();
    expect(result.routing.strategy).toBe('cashapp_green_maximize');
    expect(result.routing.destination).toBe('Cash App Green Savings');
    expect(result.routing.estimatedYield).toBeGreaterThan(0);
    expect(result.optimization.enabled).toBe(true);
  });

  test('should route large payments to yield maximizer', async () => {
    // Change provider to yield_maximizer for this test
    const yieldRouter = new LightningNetworkRouter(lightning, {
      enabled: true,
      provider: 'yield_maximizer',
      targetApy: 0.072,
      rebalanceThreshold: 500000,
      autoCompound: true
    });
    
    const result = await yieldRouter.routePayment(1000, {
      questId: 'test-quest',
      userId: 'test-user'
    });
    
    expect(result).toBeDefined();
    expect(result.routing.strategy).toBe('yield_maximizer');
    expect(result.routing.destination).toBe('Yearn Finance');
    expect(result.routing.estimatedYield).toBeGreaterThan(0);
  });

  test('should get routing recommendations', async () => {
    const recommendations = await router.getRoutingRecommendations(100);
    
    expect(recommendations).toBeDefined();
    expect(recommendations.recommended).toBeDefined();
    expect(recommendations.alternatives).toBeDefined();
    expect(recommendations.analysis).toBeDefined();
    expect(recommendations.analysis.bestYield).toBeGreaterThan(0);
    expect(recommendations.analysis.lowestRisk).toBeDefined();
    expect(recommendations.analysis.fastest).toBeDefined();
  });

  test('should auto-rebalance when beneficial', async () => {
    const result = await router.autoRebalance();
    
    expect(result).toBeDefined();
    expect(typeof result.rebalanced).toBe('boolean');
    expect(typeof result.amount).toBe('number');
    expect(typeof result.estimatedGain).toBe('number');
  });

  test('should get comprehensive metrics', async () => {
    const metrics = await router.getMetrics();
    
    expect(metrics).toBeDefined();
    expect(metrics.totalVolume).toBeGreaterThanOrEqual(0);
    expect(metrics.totalFees).toBeGreaterThanOrEqual(0);
    expect(metrics.successRate).toBeGreaterThanOrEqual(0);
    expect(metrics.channelUtilization).toBeGreaterThanOrEqual(0);
    expect(metrics.savingsYield).toBeGreaterThanOrEqual(0);
  });
});

describe('Lightning Network API', () => {
  let api: LightningNetworkAPIServer;
  
  beforeEach(() => {
    // Set environment variables for testing
    process.env.LND_REST_URL = 'https://localhost:8080';
    process.env.LND_MACAROON = 'test-macaroon';
    process.env.LIGHTNING_API_KEY = 'test-api-key';
    process.env.SAVINGS_ENABLED = 'true';
    process.env.SAVINGS_PROVIDER = 'cashapp_green';
    process.env.SAVINGS_APY = '0.0325';
    process.env.LIGHTNING_WEBHOOK_SECRET = 'test-webhook-secret';
    
    api = new LightningNetworkAPIServer();
  });

  test('should create Lightning payment', async () => {
    const request = {
      amount: 0.001,
      currency: 'BTC',
      memo: 'Test payment',
      metadata: {
        questId: 'test-quest',
        userId: 'test-user',
        savingsOptIn: true
      }
    };

    // Mock the app.handle method for testing
    const response = await api.app.handle(
      new Request('http://localhost:3001/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify(request)
      })
    );

    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.paymentId).toBeDefined();
    expect(result.invoice.paymentRequest).toBeDefined();
    expect(result.invoice.qrCode).toBeDefined();
    expect(result.invoice.deepLink).toBeDefined();
    expect(result.routing.strategy).toBeDefined();
    expect(result.optimization.enabled).toBe(true);
  });

  test('should validate payment creation request', async () => {
    const request = {
      amount: -1,
      currency: 'BTC'
    };

    const response = await api.app.handle(
      new Request('http://localhost:3001/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify(request)
      })
    );

    const result = await response.json();
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Invalid amount');
    expect(response.status).toBe(400);
  });

  test('should get payment status', async () => {
    // First create a payment
    const createRequest = {
      amount: 0.001,
      currency: 'BTC',
      metadata: { questId: 'test-quest' }
    };

    const createResponse = await api.app.handle(
      new Request('http://localhost:3001/payment/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'test-api-key'
        },
        body: JSON.stringify(createRequest)
      })
    );

    const createResult = await createResponse.json();
    const paymentId = createResult.paymentId;

    // Then get status
    const statusResponse = await api.app.handle(
      new Request(`http://localhost:3001/payment/${paymentId}/status`, {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key'
        }
      })
    );

    const statusResult = await statusResponse.json();
    
    expect(statusResult.success).toBe(true);
    expect(statusResult.paymentId).toBe(paymentId);
    expect(statusResult.status).toBe('pending');
    expect(statusResult.invoice.settled).toBe(false);
  });

  test('should get system status', async () => {
    const response = await api.app.handle(
      new Request('http://localhost:3001/status', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key'
        }
      })
    );

    const result = await response.json();
    
    expect(result.nodeConnected).toBe(true);
    expect(result.balance).toBeDefined();
    expect(result.metrics).toBeDefined();
    expect(result.balance.confirmed).toBe(1000000);
    expect(result.balance.total).toBe(1000000);
  });

  test('should get savings projection', async () => {
    const response = await api.app.handle(
      new Request('http://localhost:3001/savings/projection/100', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key'
        }
      })
    );

    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.amount).toBe(100);
    expect(result.projections).toBeDefined();
    expect(result.projections.cashAppGreen).toBeDefined();
    expect(result.projections.compoundFinance).toBeDefined();
    expect(result.projections.yieldMaximizer).toBeDefined();
    expect(result.projections.cashAppGreen.apy).toBe(0.0325);
    expect(result.projections.cashAppGreen.annual).toBe(3.25);
  });

  test('should handle rebalancing', async () => {
    const response = await api.app.handle(
      new Request('http://localhost:3001/rebalance', {
        method: 'POST',
        headers: {
          'X-API-Key': 'test-api-key'
        }
      })
    );

    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(typeof result.rebalanced).toBe('boolean');
    expect(typeof result.amount).toBe('number');
  });

  test('should get routing recommendations', async () => {
    const response = await api.app.handle(
      new Request('http://localhost:3001/routing/recommendations/100', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key'
        }
      })
    );

    const result = await response.json();
    
    expect(result.success).toBe(true);
    expect(result.amount).toBe(100);
    expect(result.recommendations).toBeDefined();
    expect(result.recommendations.recommended).toBeDefined();
    expect(result.recommendations.alternatives).toBeDefined();
    expect(result.recommendations.analysis).toBeDefined();
  });

  test('should handle webhook events', async () => {
    const webhookEvent = {
      type: 'payment.settled',
      data: {
        paymentRequest: 'lnbc1test-invoice',
        amount: 100000
      }
    };

    const response = await api.app.handle(
      new Request('http://localhost:3001/webhook/payment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Lightning-Signature': 'test-signature'
        },
        body: JSON.stringify(webhookEvent)
      })
    );

    // Should fail signature verification
    expect(response.status).toBe(401);
  });

  test('should get metrics in Prometheus format', async () => {
    const response = await api.app.handle(
      new Request('http://localhost:3001/metrics/prometheus', {
        method: 'GET',
        headers: {
          'X-API-Key': 'test-api-key'
        }
      })
    );

    const result = await response.text();
    
    expect(result).toContain('lightning_total_volume');
    expect(result).toContain('lightning_total_fees');
    expect(result).toContain('lightning_success_rate');
    expect(result).toContain('lightning_channel_utilization');
    expect(result).toContain('lightning_savings_yield');
  });
});

describe('Lightning Network Error Handling', () => {
  test('should handle connection failure', async () => {
    // Mock connection failure
    global.fetch = async (url: string, options?: any) => {
      if (url.includes('/v1/getinfo')) {
        return {
          ok: false,
          status: 500,
          statusText: 'Connection failed'
        };
      }
      return {
        ok: false,
        status: 404,
        statusText: 'Not Found'
      };
    };

    const lightning = new LightningNetworkIntegration(
      {
        url: 'https://localhost:8080',
        macaroon: 'test-macaroon',
        maxChannelBalance: 100000000,
        minChannelBalance: 1000000,
        autoRebalance: true
      },
      {
        enabled: true,
        provider: 'cashapp_green',
        apy: 0.0325,
        minConsolidationAmount: 500000,
        autoConvertToFiat: true,
        targetCurrency: 'USD'
      }
    );

    expect(lightning.isNodeConnected()).toBe(false);
    
    await expect(lightning.generateLightningPayment({
      amount: 0.001,
      currency: 'BTC'
    })).rejects.toThrow('Lightning Network not connected');
  });

  test('should handle invalid payment requests', async () => {
    const lightning = new LightningNetworkIntegration(
      {
        url: 'https://localhost:8080',
        macaroon: 'test-macaroon',
        maxChannelBalance: 100000000,
        minChannelBalance: 1000000,
        autoRebalance: true
      },
      {
        enabled: true,
        provider: 'cashapp_green',
        apy: 0.0325,
        minConsolidationAmount: 500000,
        autoConvertToFiat: true,
        targetCurrency: 'USD'
      }
    );

    // Test various invalid requests
    await expect(lightning.generateLightningPayment({
      amount: 0,
      currency: 'BTC'
    })).rejects.toThrow('Amount too small');

    await expect(lightning.generateLightningPayment({
      amount: -1,
      currency: 'BTC'
    })).rejects.toThrow('Amount too small');

    await expect(lightning.generateLightningPayment({
      amount: 0.00000001,
      currency: 'BTC'
    })).rejects.toThrow('Amount too small');

    await expect(lightning.generateLightningPayment({
      amount: 2,
      currency: 'BTC'
    })).rejects.toThrow('Amount too large');
  });
});

describe('Lightning Network Performance', () => {
  test('should handle concurrent payment generation', async () => {
    const lightning = new LightningNetworkIntegration(
      {
        url: 'https://localhost:8080',
        macaroon: 'test-macaroon',
        maxChannelBalance: 100000000,
        minChannelBalance: 1000000,
        autoRebalance: true
      },
      {
        enabled: true,
        provider: 'cashapp_green',
        apy: 0.0325,
        minConsolidationAmount: 500000,
        autoConvertToFiat: true,
        targetCurrency: 'USD'
      }
    );

    const startTime = Date.now();
    
    // Generate 10 payments concurrently
    const promises = Array.from({ length: 10 }, (_, i) => 
      lightning.generateLightningPayment({
        amount: 0.001,
        currency: 'BTC',
        memo: `Test payment ${i}`,
        metadata: { questId: `test-quest-${i}` }
      })
    );

    const results = await Promise.all(promises);
    const endTime = Date.now();
    
    expect(results).toHaveLength(10);
    results.forEach((result, i) => {
      expect(result.invoice.paymentRequest).toBeDefined();
      expect(result.deepLink).toContain('lightning:');
      expect(result.savingsProjection).toBeDefined();
    });
    
    // Should complete within reasonable time (less than 5 seconds)
    expect(endTime - startTime).toBeLessThan(5000);
  });

  test('should handle large payment amounts efficiently', async () => {
    const lightning = new LightningNetworkIntegration(
      {
        url: 'https://localhost:8080',
        macaroon: 'test-macaroon',
        maxChannelBalance: 100000000,
        minChannelBalance: 1000000,
        autoRebalance: true
      },
      {
        enabled: true,
        provider: 'cashapp_green',
        apy: 0.0325,
        minConsolidationAmount: 500000,
        autoConvertToFiat: true,
        targetCurrency: 'USD'
      }
    );

    const startTime = Date.now();
    
    const result = await lightning.generateLightningPayment({
      amount: 0.5, // 0.5 BTC = 50,000,000 sats
      currency: 'BTC',
      memo: 'Large test payment',
      metadata: { questId: 'large-test-quest' }
    });
    
    const endTime = Date.now();
    
    expect(result).toBeDefined();
    expect(result.invoice.paymentRequest).toBeDefined();
    expect(result.savingsProjection).toBeDefined();
    expect(result.savingsProjection?.annual).toBeCloseTo(16250, 0); // 0.5 BTC * $50,000 * 3.25%
    
    // Should complete within reasonable time (less than 3 seconds)
    expect(endTime - startTime).toBeLessThan(3000);
  });
});
