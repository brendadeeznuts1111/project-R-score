import { BUSINESS_CONFIG, TIME_CONSTANTS, ERROR_CODES } from '../../../core/src/constants';

export class ArbitrageRouter {
  static async handle(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    switch (request.method) {
      case 'GET':
        return await this.handleGet(request, url);
      case 'POST':
        return await this.handlePost(request, url);
      case 'DELETE':
        return await this.handleDelete(request, url);
      default:
        return new Response('Method not allowed', { status: 405 });
    }
  }

  private static async handleGet(request: Request, url: URL): Promise<Response> {
    const path = url.pathname;

    if (path === '/api/arbitrage/opportunities') {
      return await this.getOpportunities(url);
    }

    if (path === '/api/arbitrage/opportunities/:id') {
      const id = path.split('/').pop();
      return await this.getOpportunity(id!);
    }

    if (path === '/api/arbitrage/history') {
      return await this.getArbitrageHistory(url);
    }

    if (path === '/api/arbitrage/stats') {
      return await this.getArbitrageStats();
    }

    return new Response('Not found', { status: 404 });
  }

  private static async handlePost(request: Request, url: URL): Promise<Response> {
    const path = url.pathname;

    if (path === '/api/arbitrage/opportunities') {
      return await this.createOpportunity(request);
    }

    if (path === '/api/arbitrage/execute') {
      return await this.executeArbitrage(request);
    }

    return new Response('Not found', { status: 404 });
  }

  private static async handleDelete(request: Request, url: URL): Promise<Response> {
    const path = url.pathname;

    if (path.startsWith('/api/arbitrage/opportunities/')) {
      const id = path.split('/').pop();
      return await this.deleteOpportunity(id!);
    }

    return new Response('Not found', { status: 404 });
  }

  private static async getOpportunities(url: URL): Promise<Response> {
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const minEdge = parseFloat(url.searchParams.get('minEdge') || '0');
    const symbol = url.searchParams.get('symbol');
    const exchange = url.searchParams.get('exchange');

    // Simulate database query
    const opportunities = [
      {
        id: 'arb_001',
        symbol: 'AAPL',
        exchangeA: 'NYSE',
        exchangeB: 'NASDAQ',
        priceA: 150.25,
        priceB: 150.35,
        edge: 0.066,
        kellyFraction: 0.15,
        confidence: 0.85,
        timestamp: Date.now(),
        expiry: Date.now() + 30000
      },
      {
        id: 'arb_002',
        symbol: 'GOOGL',
        exchangeA: 'NASDAQ',
        exchangeB: 'LSE',
        priceA: 2800.50,
        priceB: 2801.20,
        edge: 0.025,
        kellyFraction: 0.08,
        confidence: 0.92,
        timestamp: Date.now() - BUSINESS_CONFIG.ARBITRAGE.DEFAULT_UPDATE_INTERVAL,
        expiry: Date.now() + 25000
      }
    ].filter(opp => {
      if (opp.edge < minEdge) return false;
      if (symbol && !opp.symbol.includes(symbol.toUpperCase())) return false;
      if (exchange && !opp.exchangeA.includes(exchange.toUpperCase()) && !opp.exchangeB.includes(exchange.toUpperCase())) return false;
      return true;
    });

    const paginated = opportunities.slice(offset, offset + limit);

    return new Response(JSON.stringify({
      opportunities: paginated,
      pagination: {
        total: opportunities.length,
        limit,
        offset,
        hasMore: offset + limit < opportunities.length
      }
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private static async getOpportunity(id: string): Promise<Response> {
    // Simulate database lookup
    const opportunity = {
      id: 'arb_001',
      symbol: 'AAPL',
      exchangeA: 'NYSE',
      exchangeB: 'NASDAQ',
      priceA: 150.25,
      priceB: 150.35,
      edge: 0.066,
      kellyFraction: 0.15,
      confidence: 0.85,
      timestamp: Date.now(),
      expiry: Date.now() + 30000,
      details: {
        volumeA: 10000,
        volumeB: 8000,
        spreadA: 0.01,
        spreadB: 0.02,
        liquidityScore: 0.9
      }
    };

    return new Response(JSON.stringify(opportunity), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private static async getArbitrageHistory(url: URL): Promise<Response> {
    const period = url.searchParams.get('period') || '24h';
    const symbol = url.searchParams.get('symbol');

    // Simulate historical data
    const history = [
      {
        id: 'arb_001',
        symbol: 'AAPL',
        edge: 0.066,
        profit: 0.10,
        executed: true,
        executionTime: Date.now() - TIME_CONSTANTS.INTERVALS.ONE_HOUR,
        status: 'completed'
      },
      {
        id: 'arb_002',
        symbol: 'GOOGL',
        edge: 0.025,
        profit: 0.70,
        executed: false,
        executionTime: null,
        status: 'expired'
      }
    ].filter(opp => !symbol || opp.symbol.includes(symbol.toUpperCase()));

    return new Response(JSON.stringify({
      history,
      period,
      total: history.length,
      executed: history.filter(h => h.executed).length,
      totalProfit: history.filter(h => h.executed).reduce((sum, h) => sum + h.profit, 0)
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private static async getArbitrageStats(): Promise<Response> {
    // Simulate statistics
    const stats = {
      totalOpportunities: 1250,
      executedOpportunities: 892,
      successRate: 0.714,
      averageEdge: 0.042,
      totalProfit: 15420.50,
      averageExecutionTime: 1250, // ms
      topExchanges: [
        { exchange: 'NYSE', opportunities: 456, successRate: 0.73 },
        { exchange: 'NASDAQ', opportunities: 398, successRate: 0.71 },
        { exchange: 'LSE', opportunities: 234, successRate: 0.69 }
      ],
      topSymbols: [
        { symbol: 'AAPL', opportunities: 234, averageEdge: 0.038 },
        { symbol: 'GOOGL', opportunities: 198, averageEdge: 0.041 },
        { symbol: 'MSFT', opportunities: 167, averageEdge: 0.045 }
      ]
    };

    return new Response(JSON.stringify(stats), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private static async createOpportunity(request: Request): Promise<Response> {
    try {
      const body = await request.json();

      // Validate request body
      if (!body.symbol || !body.exchangeA || !body.exchangeB) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: symbol, exchangeA, exchangeB'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Simulate creating opportunity
      const opportunity = {
        id: `arb_${Date.now()}`,
        ...body,
        timestamp: Date.now(),
        status: 'pending'
      };

      return new Response(JSON.stringify(opportunity), {
        status: 201,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private static async executeArbitrage(request: Request): Promise<Response> {
    try {
      const body = await request.json();

      if (!body.opportunityId || !body.size) {
        return new Response(JSON.stringify({
          error: 'Missing required fields: opportunityId, size'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Simulate arbitrage execution
      const execution = {
        id: `exec_${Date.now()}`,
        opportunityId: body.opportunityId,
        size: body.size,
        status: 'executed',
        executionTime: Date.now(),
        expectedProfit: body.size * 0.001, // Simulated profit
        transactions: [
          { exchange: body.exchangeA, side: 'buy', size: body.size / 2, price: 150.25 },
          { exchange: body.exchangeB, side: 'sell', size: body.size / 2, price: 150.35 }
        ]
      };

      return new Response(JSON.stringify(execution), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (error) {
      return new Response(JSON.stringify({
        error: 'Invalid JSON'
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  private static async deleteOpportunity(id: string): Promise<Response> {
    // Simulate deletion
    return new Response(JSON.stringify({
      id,
      deleted: true,
      timestamp: Date.now()
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

interface Env {
  DATABASE_URL?: string;
  API_KEY?: string;
  REDIS_URL?: string;
}
