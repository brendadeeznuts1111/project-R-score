/**
 * Domain Coordinator - Cloudflare Durable Object
 * Crystal Clear Architecture Integration
 *
 * Coordinates domain operations, manages domain health, and provides
 * centralized domain management for the Crystal Clear Architecture
 */

interface Env {
  COLLECTIONS_WORKER: Fetcher;
  DISTRIBUTIONS_WORKER: Fetcher;
  FREEPLAY_WORKER: Fetcher;
  BALANCE_WORKER: Fetcher;
  ADJUSTMENT_WORKER: Fetcher;
  DOMAIN_EVENT_BUS: DurableObjectNamespace;
  MONITORING_ENDPOINT?: string;
}

interface DomainStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  lastHealthCheck: string;
  responseTime?: number;
  error?: string;
  version?: string;
  metrics?: any;
}

interface CoordinationMessage {
  id: string;
  type: 'HEALTH_CHECK' | 'METRICS_REQUEST' | 'DOMAIN_SYNC' | 'COORDINATE_TRANSACTION';
  targetDomain?: string;
  payload: any;
  timestamp: string;
  correlationId: string;
}

interface TransactionCoordination {
  id: string;
  type: string;
  domains: string[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  steps: TransactionStep[];
  startTime: string;
  endTime?: string;
  correlationId: string;
}

interface TransactionStep {
  domain: string;
  operation: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  startTime: string;
  endTime?: string;
  result?: any;
  error?: string;
}

export class DomainCoordinator implements DurableObject {
  private state: DurableObjectState;
  private env: Env;
  private domainStatuses: Map<string, DomainStatus> = new Map();
  private activeTransactions: Map<string, TransactionCoordination> = new Map();
  private healthCheckInterval: number = 30000; // 30 seconds

  constructor(state: DurableObjectState, env: Env) {
    this.state = state;
    this.env = env;

    // Initialize domain statuses
    this.initializeDomainStatuses();

    // Start health monitoring
    this.startHealthMonitoring();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    try {
      switch (method) {
        case 'GET':
          if (url.pathname === '/health') {
            return await this.getDomainHealth();
          } else if (url.pathname === '/status') {
            return await this.getDomainStatuses();
          } else if (url.pathname === '/transactions') {
            return await this.getActiveTransactions();
          }
          break;

        case 'POST':
          if (url.pathname === '/coordinate') {
            return await this.coordinateTransaction(request);
          } else if (url.pathname === '/message') {
            return await this.sendCoordinationMessage(request);
          }
          break;

        case 'PUT':
          if (url.pathname === '/health-check') {
            return await this.triggerHealthCheck();
          }
          break;
      }

      return new Response('Not found', { status: 404 });
    } catch (error) {
      console.error('[DOMAIN_COORDINATOR] Error:', error);

      return new Response(
        JSON.stringify({
          error: 'Internal server error',
          message: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
  }

  private initializeDomainStatuses(): void {
    const domains = ['collections', 'distributions', 'free-play', 'balance', 'adjustment'];

    domains.forEach(domain => {
      this.domainStatuses.set(domain, {
        name: domain,
        status: 'unknown',
        lastHealthCheck: new Date().toISOString(),
      });
    });
  }

  private startHealthMonitoring(): void {
    // Perform initial health check
    this.performHealthChecks();

    // Set up periodic health checks
    setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);
  }

  private async performHealthChecks(): Promise<void> {
    const domains = Array.from(this.domainStatuses.keys());

    for (const domain of domains) {
      await this.checkDomainHealth(domain);
    }

    // Persist updated statuses
    await this.persistDomainStatuses();
  }

  private async checkDomainHealth(domain: string): Promise<void> {
    const startTime = Date.now();

    try {
      const worker = this.getDomainWorker(domain);
      if (!worker) {
        throw new Error(`Worker not found for domain: ${domain}`);
      }

      const response = await worker.fetch(new Request(`https://${domain}-worker/health`));
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const healthData = await response.json();
        this.domainStatuses.set(domain, {
          name: domain,
          status: 'healthy',
          lastHealthCheck: new Date().toISOString(),
          responseTime,
          version: healthData.version,
          metrics: healthData.metrics,
        });
      } else {
        throw new Error(`Health check failed with status: ${response.status}`);
      }
    } catch (error) {
      this.domainStatuses.set(domain, {
        name: domain,
        status: 'unhealthy',
        lastHealthCheck: new Date().toISOString(),
        responseTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  private getDomainWorker(domain: string): Fetcher | null {
    const workerMap: Record<string, keyof Env> = {
      collections: 'COLLECTIONS_WORKER',
      distributions: 'DISTRIBUTIONS_WORKER',
      'free-play': 'FREEPLAY_WORKER',
      balance: 'BALANCE_WORKER',
      adjustment: 'ADJUSTMENT_WORKER',
    };

    const workerKey = workerMap[domain];
    return workerKey ? (this.env[workerKey] as Fetcher) : null;
  }

  private async getDomainHealth(): Promise<Response> {
    const statuses = Array.from(this.domainStatuses.values());

    const overallHealth = this.calculateOverallHealth(statuses);

    const healthResponse = {
      status: overallHealth.status,
      timestamp: new Date().toISOString(),
      domains: statuses,
      summary: overallHealth.summary,
      activeTransactions: this.activeTransactions.size,
    };

    return new Response(JSON.stringify(healthResponse, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  }

  private async getDomainStatuses(): Promise<Response> {
    const statuses = Array.from(this.domainStatuses.values());

    return new Response(
      JSON.stringify({
        domains: statuses,
        timestamp: new Date().toISOString(),
        totalDomains: statuses.length,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async getActiveTransactions(): Promise<Response> {
    const transactions = Array.from(this.activeTransactions.values());

    return new Response(
      JSON.stringify({
        transactions,
        count: transactions.length,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async coordinateTransaction(request: Request): Promise<Response> {
    const coordination: Omit<
      TransactionCoordination,
      'id' | 'status' | 'steps' | 'startTime' | 'correlationId'
    > = await request.json();

    if (!coordination.type || !coordination.domains || coordination.domains.length === 0) {
      return new Response(
        JSON.stringify({
          error: 'Invalid coordination request',
          message: 'Must specify transaction type and target domains',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const transaction: TransactionCoordination = {
      ...coordination,
      id: crypto.randomUUID(),
      status: 'pending',
      steps: [],
      startTime: new Date().toISOString(),
      correlationId: crypto.randomUUID(),
    };

    // Store transaction
    this.activeTransactions.set(transaction.id, transaction);
    await this.persistTransactions();

    // Start transaction processing
    this.processTransaction(transaction);

    return new Response(
      JSON.stringify({
        success: true,
        transactionId: transaction.id,
        status: 'processing',
        domains: transaction.domains,
        correlationId: transaction.correlationId,
      }),
      {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async processTransaction(transaction: TransactionCoordination): Promise<void> {
    transaction.status = 'processing';
    await this.persistTransactions();

    try {
      // Process each domain in sequence
      for (const domain of transaction.domains) {
        const step: TransactionStep = {
          domain,
          operation: transaction.type,
          status: 'processing',
          startTime: new Date().toISOString(),
        };

        transaction.steps.push(step);
        await this.persistTransactions();

        try {
          // Execute operation on domain
          const result = await this.executeDomainOperation(
            domain,
            transaction.type,
            transaction.payload
          );

          step.status = 'completed';
          step.endTime = new Date().toISOString();
          step.result = result;
        } catch (error) {
          step.status = 'failed';
          step.endTime = new Date().toISOString();
          step.error = error instanceof Error ? error.message : 'Unknown error';

          // Mark transaction as failed
          transaction.status = 'failed';
          transaction.endTime = new Date().toISOString();
          await this.persistTransactions();

          // Emit failure event
          await this.emitTransactionEvent(transaction, 'TRANSACTION_FAILED');

          return;
        }
      }

      // All steps completed successfully
      transaction.status = 'completed';
      transaction.endTime = new Date().toISOString();
      await this.persistTransactions();

      // Emit success event
      await this.emitTransactionEvent(transaction, 'TRANSACTION_COMPLETED');
    } catch (error) {
      console.error(
        `[TRANSACTION_PROCESSING] Failed to process transaction ${transaction.id}:`,
        error
      );

      transaction.status = 'failed';
      transaction.endTime = new Date().toISOString();
      await this.persistTransactions();

      await this.emitTransactionEvent(transaction, 'TRANSACTION_FAILED');
    }
  }

  private async executeDomainOperation(
    domain: string,
    operation: string,
    payload: any
  ): Promise<any> {
    const worker = this.getDomainWorker(domain);
    if (!worker) {
      throw new Error(`Worker not found for domain: ${domain}`);
    }

    // Map operation to endpoint
    const endpointMap: Record<string, string> = {
      PROCESS_COLLECTION: '/collections',
      CALCULATE_COMMISSION: '/commissions',
      UPDATE_BALANCE: '/balance',
      CREATE_ADJUSTMENT: '/adjustments',
    };

    const endpoint = endpointMap[operation] || `/${operation.toLowerCase()}`;

    const response = await worker.fetch(
      new Request(`https://${domain}-worker${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    );

    if (!response.ok) {
      throw new Error(`Domain operation failed: ${response.status}`);
    }

    return await response.json();
  }

  private async sendCoordinationMessage(request: Request): Promise<Response> {
    const message: CoordinationMessage = await request.json();

    if (!message.type || !message.payload) {
      return new Response(
        JSON.stringify({
          error: 'Invalid message',
          message: 'Must specify message type and payload',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    message.id = message.id || crypto.randomUUID();
    message.timestamp = new Date().toISOString();
    message.correlationId = message.correlationId || crypto.randomUUID();

    // Route message to appropriate handler
    switch (message.type) {
      case 'HEALTH_CHECK':
        return await this.handleHealthCheckMessage(message);
      case 'METRICS_REQUEST':
        return await this.handleMetricsRequestMessage(message);
      case 'DOMAIN_SYNC':
        return await this.handleDomainSyncMessage(message);
      default:
        return await this.handleGenericMessage(message);
    }
  }

  private async handleHealthCheckMessage(message: CoordinationMessage): Promise<Response> {
    const targetDomain = message.targetDomain;

    if (targetDomain) {
      await this.checkDomainHealth(targetDomain);
      const status = this.domainStatuses.get(targetDomain);

      return new Response(
        JSON.stringify({
          success: true,
          domain: targetDomain,
          status: status?.status,
          lastHealthCheck: status?.lastHealthCheck,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    } else {
      await this.performHealthChecks();
      return await this.getDomainHealth();
    }
  }

  private async handleMetricsRequestMessage(message: CoordinationMessage): Promise<Response> {
    const targetDomain = message.targetDomain;

    if (targetDomain) {
      const worker = this.getDomainWorker(targetDomain);
      if (!worker) {
        return new Response(
          JSON.stringify({
            error: 'Domain not found',
            domain: targetDomain,
          }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }

      const response = await worker.fetch(new Request(`https://${targetDomain}-worker/metrics`));
      const metrics = await response.json();

      return new Response(
        JSON.stringify({
          success: true,
          domain: targetDomain,
          metrics,
        }),
        {
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get metrics from all domains
    const allMetrics: any[] = [];
    for (const domain of this.domainStatuses.keys()) {
      try {
        const worker = this.getDomainWorker(domain);
        if (worker) {
          const response = await worker.fetch(new Request(`https://${domain}-worker/metrics`));
          const metrics = await response.json();
          allMetrics.push({ domain, metrics });
        }
      } catch (error) {
        console.warn(`Failed to get metrics for ${domain}:`, error);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        metrics: allMetrics,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async handleDomainSyncMessage(message: CoordinationMessage): Promise<Response> {
    // Synchronize domain state across all domains
    const syncResults: any[] = [];

    for (const domain of this.domainStatuses.keys()) {
      try {
        const worker = this.getDomainWorker(domain);
        if (worker) {
          const response = await worker.fetch(
            new Request(`https://${domain}-worker/sync`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(message.payload),
            })
          );

          syncResults.push({
            domain,
            success: response.ok,
            status: response.status,
          });
        }
      } catch (error) {
        syncResults.push({
          domain,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        syncResults,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async handleGenericMessage(message: CoordinationMessage): Promise<Response> {
    // Forward message to event bus for domain-specific handling
    const eventBusId = this.env.DOMAIN_EVENT_BUS.idFromName('global-event-bus');
    const eventBus = this.env.DOMAIN_EVENT_BUS.get(eventBusId);

    await eventBus.fetch(
      new Request('https://internal/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(message),
      })
    );

    return new Response(
      JSON.stringify({
        success: true,
        messageId: message.id,
        forwarded: true,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private async triggerHealthCheck(): Promise<Response> {
    await this.performHealthChecks();

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Health check triggered',
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }

  private calculateOverallHealth(statuses: DomainStatus[]): { status: string; summary: any } {
    const healthy = statuses.filter(s => s.status === 'healthy').length;
    const degraded = statuses.filter(s => s.status === 'degraded').length;
    const unhealthy = statuses.filter(s => s.status === 'unhealthy').length;

    let overallStatus = 'healthy';
    if (unhealthy > 0) {
      overallStatus = 'unhealthy';
    } else if (degraded > 0) {
      overallStatus = 'degraded';
    }

    return {
      status: overallStatus,
      summary: {
        total: statuses.length,
        healthy,
        degraded,
        unhealthy,
        healthPercentage: Math.round((healthy / statuses.length) * 100),
      },
    };
  }

  private async emitTransactionEvent(
    transaction: TransactionCoordination,
    eventType: string
  ): Promise<void> {
    try {
      const eventBusId = this.env.DOMAIN_EVENT_BUS.idFromName('global-event-bus');
      const eventBus = this.env.DOMAIN_EVENT_BUS.get(eventBusId);

      await eventBus.fetch(
        new Request('https://internal/events', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: crypto.randomUUID(),
            type: eventType,
            domain: 'coordinator',
            data: {
              transactionId: transaction.id,
              type: transaction.type,
              domains: transaction.domains,
              status: transaction.status,
              correlationId: transaction.correlationId,
            },
            timestamp: new Date().toISOString(),
            correlationId: transaction.correlationId,
          }),
        })
      );
    } catch (error) {
      console.error('[TRANSACTION_EVENT] Failed to emit event:', error);
    }
  }

  private async persistDomainStatuses(): Promise<void> {
    const statusesObj = Object.fromEntries(this.domainStatuses);
    await this.state.storage.put('domain:statuses', statusesObj);
  }

  private async persistTransactions(): Promise<void> {
    const transactionsObj = Object.fromEntries(this.activeTransactions);
    await this.state.storage.put('transactions:active', transactionsObj);
  }
}

// Export for use in wrangler.toml
export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const id = env.DOMAIN_EVENT_BUS.idFromName('domain-coordinator');
    const durableObject = env.DOMAIN_EVENT_BUS.get(id);
    return durableObject.fetch(request);
  },
};
