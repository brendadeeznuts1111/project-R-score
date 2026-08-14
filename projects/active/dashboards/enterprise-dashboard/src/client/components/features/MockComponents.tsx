/**
 * Mock Cash App Integration
 * Mock responses for Cash App in development/CI
 */
export function createMockCashAppIntegration() {
  return {
    balance: 4250.0,
    pending: 125.5,
    async getBalance() {
      await Bun.sleep(10);
      return {
        balance: this.balance,
        pending: this.pending,
        currency: "USD",
      };
    },
    async createPayment(amount: number, note: string) {
      await Bun.sleep(10);
      return {
        id: `tx_${Date.now()}`,
        amount,
        note,
        status: "completed" as const,
        createdAt: new Date().toISOString(),
      };
    },
  };
}

/**
 * Mock Analytics Data
 * Generate realistic mock analytics for development
 */
export function createMockAnalyticsData() {
  const generateTimeSeries = (points: number, base: number, variance: number) => {
    return Array.from({ length: points }, (_, i) => ({
      timestamp: Date.now() - (points - i) * 3600000,
      value: base + (Math.random() - 0.5) * variance,
    }));
  };

  return {
    visitors: generateTimeSeries(24, 1250, 300),
    revenue: generateTimeSeries(24, 4500, 1500),
    async getSummary() {
      await Bun.sleep(10);
      return {
        totalVisitors: 30250,
        totalRevenue: 108450,
        totalConversions: 3012,
        avgBounceRate: 32.5,
        growth: {
          visitors: 12.5,
          revenue: 18.3,
          conversions: 8.7,
        },
      };
    },
  };
}

/**
 * Mock Network Probe
 * Instant success responses for network probes in MOCK_API builds
 */
export function createMockNetworkProbe() {
  const mockHosts = {
    "api.github.com": { latency: 45, online: true },
    "registry.npmjs.org": { latency: 38, online: true },
    "bun.sh": { latency: 22, online: true },
  };

  async function probe(host: string) {
    await Bun.sleep(5);
    const result = mockHosts[host as keyof typeof mockHosts];
    if (result) {
      return result;
    }
    return { latency: Math.floor(Math.random() * 100) + 20, online: true };
  }

  async function probeAll(hosts: string[]) {
    const results = await Promise.all(hosts.map((h) => probe(h)));
    return hosts.reduce((acc, host, i) => {
      acc[host] = results[i];
      return acc;
    }, {} as Record<string, { latency: number; online: boolean }>);
  }

  return { probe, probeAll, mockHosts };
}
