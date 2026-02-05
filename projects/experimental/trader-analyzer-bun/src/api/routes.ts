import { Hono } from 'hono';
import { cors } from 'hono/cors';
import type { Timeframe, PredictionTrade, OrcaRawInput } from '../types';
import { initTradeStream, getTradeStream } from '../data/stream';
import * as store from '../data/store';
import { calculateStats, calculatePositionSessions } from '../analytics/stats';
import { analyzeTraderProfile } from '../analytics/profile';
import { calculateMMStats, buildMMSessions } from '../analytics/marketmaking';
import { calculatePredictionStats, analyzeEdge, analyzeSizing } from '../analytics/prediction';
import { CCXTProvider } from '../providers/ccxt';
import { PolymarketProvider } from '../providers/polymarket';
import { KalshiProvider } from '../providers/kalshi';
import { createOrcaNormalizer } from '../orca/normalizer';
import { listSports, getSportInfo } from '../orca/taxonomy/sport';
import { listMarketTypes, getMarketTypeInfo } from '../orca/taxonomy/market';
import { getOrcaStorage } from '../orca/storage';
import {
  ArbitrageScanner,
  ArbitrageAlertServer,
  getAlertServer,
  setAlertServer,
  CryptoMatcher,
  type MarketCategory,
  type CryptoArbitrageOpportunity,
} from '../arbitrage';
import {
  uuidv5,
  canonicalUUID,
  slugToUUID,
  parseSlug,
  isValidUUID,
  getRegisteredExchanges,
  EXCHANGE_NAMESPACES,
  type ExchangeName,
} from '../canonical';
import { getCache, createNamespacedCache } from '../cache';
import { DeribitProvider, type DeribitOption, type DeribitOptionTicker } from '../providers/deribit';

const api = new Hono();

// Global Deribit provider instance (public API, no auth needed)
let deribitProvider: DeribitProvider | null = null;

function getDeribit(): DeribitProvider {
  if (!deribitProvider) {
    deribitProvider = new DeribitProvider({ testnet: false });
  }
  return deribitProvider;
}

// Enable CORS
api.use('/*', cors());

// ============ Health ============

api.get('/health', (c) => {
  return c.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ Streams ============

// List all streams
api.get('/streams', async (c) => {
  const stream = await initTradeStream();
  const streams = stream.list();
  const range = stream.getDateRange();

  return c.json({
    streams,
    total: stream.getTotalCount(),
    dateRange: range,
  });
});

// Import trades from file
api.post('/streams/file', async (c) => {
  try {
    const body = await c.req.json<{ path: string; name?: string; symbol?: string }>();
    const { path, name, symbol = 'BTC/USD' } = body;

    if (!path) {
      return c.json({ error: 'path is required' }, 400);
    }

    // Load trades from file
    const trades = await store.loadTradesFromFile(path);

    if (trades.length === 0) {
      return c.json({ error: 'No trades found in file' }, 400);
    }

    // Add to stream
    const stream = await initTradeStream();
    const id = `file-${Date.now()}`;
    const meta = stream.add(id, name || path, 'file', symbol, trades);
    await stream.save();

    return c.json({
      success: true,
      stream: meta,
      message: `Imported ${trades.length} trades`,
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Import failed',
    }, 500);
  }
});

// Fetch trades from API
api.post('/streams/api', async (c) => {
  try {
    const body = await c.req.json<{
      exchange: string;
      apiKey: string;
      apiSecret: string;
      symbol?: string;
      testnet?: boolean;
    }>();

    const { exchange, apiKey, apiSecret, symbol = 'BTC/USD:BTC', testnet } = body;

    if (!exchange || !apiKey || !apiSecret) {
      return c.json({ error: 'exchange, apiKey, apiSecret required' }, 400);
    }

    // Save credentials
    await store.saveCredentials({ exchange, apiKey, apiSecret, testnet });

    // Connect and fetch
    const provider = new CCXTProvider({ exchange, apiKey, apiSecret, testnet });
    const connectResult = await provider.connect();

    if (!connectResult.ok) {
      return c.json({ error: connectResult.error.message }, 500);
    }

    const tradesResult = await provider.fetchAllTrades(symbol, (count) => {
      console.log(`Fetched ${count} trades...`);
    });

    if (!tradesResult.ok) {
      return c.json({ error: tradesResult.error.message }, 500);
    }

    // Add to stream
    const stream = await initTradeStream();
    const id = `api-${exchange}-${Date.now()}`;
    const meta = stream.add(id, `${exchange} API`, 'api', symbol, tradesResult.data);
    await stream.save();

    return c.json({
      success: true,
      stream: meta,
      message: `Fetched ${tradesResult.data.length} trades from ${exchange}`,
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Fetch failed',
    }, 500);
  }
});

// Sync: fetch latest trades from saved credentials
api.post('/sync', async (c) => {
  try {
    const creds = await store.loadCredentials();
    if (!creds) {
      return c.json({ error: 'No saved credentials. Use /streams/api first.' }, 401);
    }

    const body = await c.req.json<{ symbol?: string }>().catch(() => ({} as { symbol?: string }));
    const symbol = body.symbol || 'BTC/USD:BTC';

    // Get last trade timestamp from existing streams
    const stream = await initTradeStream();
    const range = stream.getDateRange();
    const since = range.to ? new Date(range.to).getTime() + 1 : undefined;

    // Fetch new trades
    const provider = new CCXTProvider(creds);
    await provider.connect();

    const tradesResult = await provider.fetchTrades(symbol, since, 500);
    if (!tradesResult.ok) {
      return c.json({ error: tradesResult.error.message }, 500);
    }

    if (tradesResult.data.length === 0) {
      return c.json({ success: true, message: 'No new trades', count: 0 });
    }

    // Find existing API stream or create new
    const existingStreams = stream.list().filter(s => s.source === 'api');
    const existingId = existingStreams[0]?.id;

    if (existingId) {
      stream.update(existingId, tradesResult.data);
    } else {
      stream.add(`api-${creds.exchange}-${Date.now()}`, `${creds.exchange} API`, 'api', symbol, tradesResult.data);
    }

    await stream.save();

    return c.json({
      success: true,
      count: tradesResult.data.length,
      message: `Synced ${tradesResult.data.length} new trades`,
    });
  } catch (error) {
    return c.json({
      error: error instanceof Error ? error.message : 'Sync failed',
    }, 500);
  }
});

// Delete a stream
api.delete('/streams/:id', async (c) => {
  const id = c.req.param('id');
  const stream = await initTradeStream();

  if (!stream.get(id)) {
    return c.json({ error: 'Stream not found' }, 404);
  }

  stream.remove(id);
  await stream.save();

  return c.json({ success: true });
});

// ============ Status ============

api.get('/status', async (c) => {
  const stream = await initTradeStream();
  const dataStatus = await store.getDataStatus();
  const range = stream.getDateRange();

  return c.json({
    ...dataStatus,
    streamCount: stream.list().length,
    tradeCount: stream.getTotalCount(),
    dateRange: range,
  });
});

// ============ Trades ============

api.get('/trades', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '50');
  const symbol = c.req.query('symbol');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const stream = await initTradeStream();
  let trades = stream.getRange(from, to);

  // Filter by symbol
  if (symbol) {
    const normalized = symbol.toUpperCase().replace('XBT', 'BTC').replace(/[/:_-]/g, '');
    trades = trades.filter(t => t.symbol.includes(normalized));
  }

  // Sort descending
  trades.sort((a, b) => new Date(b.datetime).getTime() - new Date(a.datetime).getTime());

  // Paginate
  const start = (page - 1) * limit;
  const paginated = trades.slice(start, start + limit);

  return c.json({
    trades: paginated,
    total: trades.length,
    page,
    limit,
  });
});

// ============ Analytics ============

api.get('/stats', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');

  const stream = await initTradeStream();
  const trades = stream.getRange(from, to);

  if (trades.length === 0) {
    return c.json({ error: 'No trades. Import data first.', stats: null });
  }

  const orders = await store.loadOrders();
  const wallet = await store.loadWallet();
  const stats = calculateStats(trades, orders, wallet);

  return c.json({ stats });
});

api.get('/sessions', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const from = c.req.query('from');
  const to = c.req.query('to');

  const stream = await initTradeStream();
  const trades = stream.getRange(from, to);
  const sessions = calculatePositionSessions(trades);

  // Paginate
  const start = (page - 1) * limit;
  const paginated = sessions.slice(start, start + limit);

  // Light response (no trades array)
  const light = paginated.map(s => ({ ...s, trades: [] }));

  return c.json({
    sessions: light,
    total: sessions.length,
    page,
    limit,
  });
});

api.get('/sessions/:id', async (c) => {
  const sessionId = c.req.param('id');

  const stream = await initTradeStream();
  const trades = stream.merge();
  const sessions = calculatePositionSessions(trades);
  const session = sessions.find(s => s.id === sessionId);

  if (!session) {
    return c.json({ error: 'Session not found' }, 404);
  }

  return c.json({ session });
});

api.get('/profile', async (c) => {
  const from = c.req.query('from');
  const to = c.req.query('to');

  const stream = await initTradeStream();
  const trades = stream.getRange(from, to);

  if (trades.length === 0) {
    return c.json({ error: 'No trades. Import data first.', profile: null });
  }

  const orders = await store.loadOrders();
  const wallet = await store.loadWallet();
  const stats = calculateStats(trades, orders, wallet);
  const sessions = calculatePositionSessions(trades);
  const profile = analyzeTraderProfile(stats, trades, orders, sessions);

  return c.json({ profile, stats });
});

// ============ OHLCV ============

api.get('/ohlcv', async (c) => {
  try {
    const symbol = c.req.query('symbol') || 'BTC/USD:BTC';
    const timeframe = (c.req.query('timeframe') || '1d') as Timeframe;
    const limit = parseInt(c.req.query('limit') || '500');

    // Try cache first
    let candles = await store.loadOHLCV(symbol, timeframe);

    // If no cache and we have credentials, fetch
    if (candles.length === 0) {
      const creds = await store.loadCredentials();
      if (creds) {
        const provider = new CCXTProvider(creds);
        const connectResult = await provider.connect();
        if (connectResult.ok) {
          const ohlcvResult = await provider.fetchOHLCV(symbol, timeframe, undefined, limit);
          if (ohlcvResult.ok) {
            candles = ohlcvResult.data;
            await store.saveOHLCV(symbol, timeframe, candles);
          }
        }
      }
    }

    return c.json({ candles });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// ============ Balance ============

api.get('/balance', async (c) => {
  try {
    const creds = await store.loadCredentials();
    if (!creds) {
      return c.json({ error: 'No credentials' }, 401);
    }

    const provider = new CCXTProvider(creds);
    const connectResult = await provider.connect();
    if (!connectResult.ok) {
      return c.json({ error: connectResult.error.message }, 500);
    }

    const balanceResult = await provider.fetchBalance();
    if (!balanceResult.ok) {
      return c.json({ error: balanceResult.error.message }, 500);
    }

    return c.json(balanceResult.data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// ============ Clear ============

api.post('/clear', async (c) => {
  const stream = await initTradeStream();
  await stream.clear();
  await store.clearAll();
  return c.json({ success: true });
});

// ============ Prediction Markets ============

// Connect to Polymarket
api.post('/polymarket/connect', async (c) => {
  try {
    const body = await c.req.json<{ funderAddress: string }>();
    const { funderAddress } = body;

    if (!funderAddress) {
      return c.json({ error: 'funderAddress required' }, 400);
    }

    const provider = new PolymarketProvider({ funderAddress });
    const result = await provider.connect();

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    // Save config
    await store.saveCredentials({
      exchange: 'polymarket',
      apiKey: funderAddress,
      apiSecret: '',
    });

    return c.json({ success: true, message: 'Connected to Polymarket' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Fetch Polymarket trades
api.post('/polymarket/fetch', async (c) => {
  try {
    const body = await c.req.json<{ funderAddress: string }>();
    const { funderAddress } = body;

    if (!funderAddress) {
      return c.json({ error: 'funderAddress required' }, 400);
    }

    const provider = new PolymarketProvider({ funderAddress });
    await provider.connect();

    const tradesResult = await provider.fetchAllTrades(undefined, (count) => {
      console.log(`Fetched ${count} Polymarket trades...`);
    });

    if (!tradesResult.ok) {
      return c.json({ error: tradesResult.error.message }, 500);
    }

    // Add to stream
    const stream = await initTradeStream();
    const id = `polymarket-${Date.now()}`;
    const meta = stream.add(id, 'Polymarket', 'api', 'PREDICTION', tradesResult.data);
    await stream.save();

    return c.json({
      success: true,
      stream: meta,
      message: `Fetched ${tradesResult.data.length} trades from Polymarket`,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// List Polymarket markets
api.get('/polymarket/markets', async (c) => {
  try {
    const limit = parseInt(c.req.query('limit') || '100');
    const provider = new PolymarketProvider({});
    await provider.connect();

    const result = await provider.fetchMarkets(limit);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    return c.json({ markets: result.data });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Connect to Kalshi
api.post('/kalshi/connect', async (c) => {
  try {
    const body = await c.req.json<{
      email?: string;
      password?: string;
      apiKey?: string;
      demo?: boolean;
    }>();

    const provider = new KalshiProvider(body);
    const result = await provider.connect();

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    // Save config
    await store.saveCredentials({
      exchange: 'kalshi',
      apiKey: body.email || body.apiKey || '',
      apiSecret: body.password || '',
      testnet: body.demo,
    });

    return c.json({ success: true, message: 'Connected to Kalshi' });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Fetch Kalshi trades
api.post('/kalshi/fetch', async (c) => {
  try {
    const creds = await store.loadCredentials();
    if (!creds || creds.exchange !== 'kalshi') {
      return c.json({ error: 'Connect to Kalshi first' }, 401);
    }

    const provider = new KalshiProvider({
      email: creds.apiKey,
      password: creds.apiSecret,
      demo: creds.testnet,
    });
    await provider.connect();

    const tradesResult = await provider.fetchAllTrades(undefined, (count) => {
      console.log(`Fetched ${count} Kalshi trades...`);
    });

    if (!tradesResult.ok) {
      return c.json({ error: tradesResult.error.message }, 500);
    }

    // Add to stream
    const stream = await initTradeStream();
    const id = `kalshi-${Date.now()}`;
    const meta = stream.add(id, 'Kalshi', 'api', 'PREDICTION', tradesResult.data);
    await stream.save();

    return c.json({
      success: true,
      stream: meta,
      message: `Fetched ${tradesResult.data.length} trades from Kalshi`,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// List Kalshi markets
api.get('/kalshi/markets', async (c) => {
  try {
    const status = (c.req.query('status') || 'open') as 'open' | 'closed' | 'settled';
    const limit = parseInt(c.req.query('limit') || '100');

    const provider = new KalshiProvider({});
    await provider.connect();

    const result = await provider.fetchMarkets(status, limit);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    return c.json({ markets: result.data });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Prediction market stats
api.get('/prediction/stats', async (c) => {
  try {
    const from = c.req.query('from');
    const to = c.req.query('to');

    const stream = await initTradeStream();
    const allTrades = stream.getRange(from, to);

    // Filter to prediction trades
    const trades = allTrades.filter(t =>
      t.symbol === 'PREDICTION' || (t as any).marketId
    ) as PredictionTrade[];

    if (trades.length === 0) {
      return c.json({ error: 'No prediction trades found', stats: null });
    }

    const stats = calculatePredictionStats(trades, [], []);
    const edge = analyzeEdge(trades, []);
    const sizing = analyzeSizing(trades, stats);

    return c.json({ stats, edge, sizing });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// ============ Market Making Analytics ============

api.get('/mm/stats', async (c) => {
  try {
    const from = c.req.query('from');
    const to = c.req.query('to');

    const stream = await initTradeStream();
    const trades = stream.getRange(from, to);
    const orders = await store.loadOrders();

    if (trades.length === 0) {
      return c.json({ error: 'No trades found', stats: null });
    }

    const stats = calculateMMStats(trades, orders, []);

    return c.json({ stats });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

api.get('/mm/sessions', async (c) => {
  try {
    const from = c.req.query('from');
    const to = c.req.query('to');
    const gapMinutes = parseInt(c.req.query('gap') || '30');

    const stream = await initTradeStream();
    const trades = stream.getRange(from, to);
    const orders = await store.loadOrders();

    if (trades.length === 0) {
      return c.json({ error: 'No trades found', sessions: [] });
    }

    const sessions = buildMMSessions(trades, orders, gapMinutes);

    // Return light version without full trade arrays
    const light = sessions.map(s => ({
      ...s,
      trades: [],
      quotes: [],
    }));

    return c.json({ sessions: light, total: sessions.length });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// ============ ORCA - Sports Betting Market Normalization ============

// Create singleton normalizer
const orcaNormalizer = createOrcaNormalizer();

// Normalize a single market input
api.post('/orca/normalize', async (c) => {
  try {
    const input = await c.req.json<OrcaRawInput>();

    if (!input.bookmaker || !input.sport || !input.homeTeam || !input.awayTeam) {
      return c.json({
        error: 'Required fields: bookmaker, sport, homeTeam, awayTeam, startTime, marketType, selection',
      }, 400);
    }

    const result = orcaNormalizer.normalize(input);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 400);
    }

    return c.json(result.data);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Batch normalize multiple inputs
api.post('/orca/normalize/batch', async (c) => {
  try {
    const inputs = await c.req.json<OrcaRawInput[]>();

    if (!Array.isArray(inputs) || inputs.length === 0) {
      return c.json({ error: 'Expected array of inputs' }, 400);
    }

    const results = orcaNormalizer.normalizeBatch(inputs);

    return c.json({
      results: results.map((r, i) => ({
        index: i,
        success: r.ok,
        data: r.ok ? r.data : null,
        error: !r.ok ? r.error.message : null,
      })),
      total: inputs.length,
      successful: results.filter(r => r.ok).length,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Look up a team by bookmaker
api.get('/orca/lookup/team', (c) => {
  const bookmaker = c.req.query('bookmaker');
  const name = c.req.query('name');

  if (!bookmaker || !name) {
    return c.json({ error: 'Required: bookmaker, name' }, 400);
  }

  const result = orcaNormalizer.lookupTeam(bookmaker as any, name);

  if (!result) {
    return c.json({ found: false, canonical: null, id: null });
  }

  return c.json({ found: true, ...result });
});

// Generate market ID from components
api.get('/orca/id/market', (c) => {
  const eventId = c.req.query('eventId');
  const type = c.req.query('type');
  const period = c.req.query('period') || 'full';
  const line = c.req.query('line');

  if (!eventId || !type) {
    return c.json({ error: 'Required: eventId, type' }, 400);
  }

  const marketId = orcaNormalizer.getMarketId(
    eventId,
    type as any,
    period as any,
    line ? parseFloat(line) : undefined
  );

  return c.json({ marketId });
});

// Generate event ID from components
api.get('/orca/id/event', (c) => {
  const sport = c.req.query('sport');
  const home = c.req.query('home');
  const away = c.req.query('away');
  const startTime = c.req.query('startTime');

  if (!sport || !home || !away || !startTime) {
    return c.json({ error: 'Required: sport, home, away, startTime' }, 400);
  }

  const eventId = orcaNormalizer.getEventId(sport as any, home, away, startTime);

  return c.json({ eventId });
});

// List supported bookmakers
api.get('/orca/bookmakers', (c) => {
  return c.json({
    us: ['draftkings', 'fanduel', 'betmgm', 'caesars', 'pointsbet'],
    sharp: ['pinnacle', 'ps3838', 'circa', 'bookmaker', 'betcris'],
    exchanges: ['betfair', 'smarkets', 'matchbook'],
  });
});

// List supported sports
api.get('/orca/sports', (c) => {
  const sports = listSports();
  const detailed = sports.map(sport => ({
    id: sport,
    ...getSportInfo(sport),
  }));

  return c.json({ sports: detailed });
});

// List market types
api.get('/orca/markets', (c) => {
  const types = listMarketTypes();
  const detailed = types.map(type => ({
    id: type,
    ...getMarketTypeInfo(type),
  }));

  return c.json({ marketTypes: detailed });
});

// Get normalizer stats
api.get('/orca/stats', (c) => {
  const stats = orcaNormalizer.getStats();

  return c.json({
    ...stats,
    status: 'initialized',
    streaming: orcaStreamServer?.getStatus() || { running: false },
  });
});

// ============ ORCA Streaming Control ============

import { OrcaStreamServer } from '../orca/streaming/server';

let orcaStreamServer: OrcaStreamServer | null = null;

// Start ORCA streaming server
api.post('/orca/stream/start', async (c) => {
  try {
    if (orcaStreamServer) {
      return c.json({ error: 'Streaming server already running' }, 400);
    }

    const body = await c.req.json<{
      port?: number;
      pollInterval?: number;
      bookmakers?: string[];
    }>().catch(() => ({} as { port?: number; pollInterval?: number; bookmakers?: string[] }));

    orcaStreamServer = new OrcaStreamServer({
      port: body.port || 3002,
      pollInterval: body.pollInterval || 5000,
      bookmakers: (body.bookmakers as any) || ['ps3838'],
    });

    await orcaStreamServer.start();

    return c.json({
      success: true,
      message: 'ORCA streaming server started',
      status: orcaStreamServer.getStatus(),
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Stop ORCA streaming server
api.post('/orca/stream/stop', async (c) => {
  try {
    if (!orcaStreamServer) {
      return c.json({ error: 'Streaming server not running' }, 400);
    }

    await orcaStreamServer.stop();
    orcaStreamServer = null;

    return c.json({
      success: true,
      message: 'ORCA streaming server stopped',
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Get streaming server status
api.get('/orca/stream/status', (c) => {
  if (!orcaStreamServer) {
    return c.json({
      running: false,
      message: 'Streaming server not started. Use POST /api/orca/stream/start',
    });
  }

  return c.json(orcaStreamServer.getStatus());
});

// ============ ORCA Storage ============

// Get storage statistics
api.get('/orca/storage/stats', (c) => {
  try {
    const storage = getOrcaStorage();
    const stats = storage.getStats();

    return c.json({
      ...stats,
      sqliteVersion: storage.getVersion(),
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Get odds history for a market
api.get('/orca/storage/odds/:marketId', (c) => {
  try {
    const marketId = c.req.param('marketId');
    const bookmaker = c.req.query('bookmaker') as any;
    const since = c.req.query('since');
    const limit = c.req.query('limit');

    const storage = getOrcaStorage();
    const history = storage.getOddsHistory(marketId, {
      bookmaker,
      since: since ? parseInt(since) : undefined,
      limit: limit ? parseInt(limit) : 100,
    });

    return c.json({
      marketId,
      history,
      count: history.length,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// ============ Debug Endpoints (Bun 1.3) ============

// Heap snapshot for memory debugging
api.post('/debug/heap-snapshot', async (c) => {
  try {
    const body = await c.req.json<{ path?: string }>().catch(() => ({} as { path?: string }));
    const path = body.path || `./data/heap-${Date.now()}.heapsnapshot`;

    // Use Bun's V8 heap snapshot feature (non-blocking)
    await Bun.write(path, JSON.stringify(Bun.generateHeapSnapshot()));

    return c.json({
      success: true,
      path,
      message: 'Heap snapshot saved. Open in Chrome DevTools Memory tab.',
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Memory usage stats
api.get('/debug/memory', (c) => {
  const usage = process.memoryUsage();
  return c.json({
    heapUsed: `${(usage.heapUsed / 1024 / 1024).toFixed(2)} MB`,
    heapTotal: `${(usage.heapTotal / 1024 / 1024).toFixed(2)} MB`,
    external: `${(usage.external / 1024 / 1024).toFixed(2)} MB`,
    rss: `${(usage.rss / 1024 / 1024).toFixed(2)} MB`,
    arrayBuffers: `${(usage.arrayBuffers / 1024 / 1024).toFixed(2)} MB`,
  });
});

// Runtime info
api.get('/debug/runtime', (c) => {
  return c.json({
    bunVersion: Bun.version,
    revision: Bun.revision,
    platform: process.platform,
    arch: process.arch,
    pid: process.pid,
    uptime: `${(process.uptime() / 60).toFixed(2)} minutes`,
    cwd: process.cwd(),
  });
});

// CPU profiling (Bun 1.3.2)
api.post('/debug/cpu-profile', async (c) => {
  try {
    const body = await c.req.json<{ duration?: number; outputDir?: string }>().catch(() => ({} as { duration?: number; outputDir?: string }));
    const duration = body.duration || 5000;
    const outputDir = body.outputDir || './data';

    return c.json({
      success: true,
      message: `CPU profiling available via CLI: bun --cpu-prof src/index.ts`,
      instructions: {
        cli: `bun --cpu-prof --cpu-prof-dir=${outputDir} --cpu-prof-name=profile-{ts}.cpuprofile src/index.ts`,
        duration: `${duration}ms suggested sampling time`,
        analyze: 'Open .cpuprofile in Chrome DevTools Performance tab or VS Code',
      },
      note: 'CPU profiling must be enabled at process startup with --cpu-prof flag',
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// WebSocket subscriptions (Bun 1.3.2) - for ORCA streaming debug
api.get('/debug/ws-subscriptions', (c) => {
  if (!orcaStreamServer) {
    return c.json({
      available: false,
      message: 'ORCA streaming server not running',
      hint: 'Start with POST /api/orca/stream/start',
    });
  }

  const status = orcaStreamServer.getStatus();
  return c.json({
    available: true,
    serverPort: status.port,
    connectedClients: status.clients,
    fetcher: status.fetcher,
    note: 'Use ServerWebSocket.subscriptions getter on individual connections for topic inspection',
  });
});

// ============ NEXUS Arbitrage Detection ============

let arbitrageScanner: ArbitrageScanner | null = null;
let arbitrageAlertServer: ArbitrageAlertServer | null = null;

// Start arbitrage alert WebSocket server
api.post('/arbitrage/alerts/start', async (c) => {
  try {
    if (arbitrageAlertServer) {
      return c.json({ error: 'Alert server already running' }, 400);
    }

    const body = await c.req.json<{ port?: number }>().catch(() => ({} as { port?: number }));
    const port = body.port || 3003;

    arbitrageAlertServer = new ArbitrageAlertServer(port);
    await arbitrageAlertServer.start();
    setAlertServer(arbitrageAlertServer);

    return c.json({
      success: true,
      message: `Arbitrage alert server started on ws://localhost:${port}`,
      status: arbitrageAlertServer.getStatus(),
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Stop arbitrage alert WebSocket server
api.post('/arbitrage/alerts/stop', async (c) => {
  try {
    if (!arbitrageAlertServer) {
      return c.json({ error: 'Alert server not running' }, 400);
    }

    await arbitrageAlertServer.stop();
    arbitrageAlertServer = null;
    setAlertServer(null);

    return c.json({
      success: true,
      message: 'Arbitrage alert server stopped',
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Get alert server status
api.get('/arbitrage/alerts/status', (c) => {
  if (!arbitrageAlertServer) {
    return c.json({
      running: false,
      message: 'Alert server not started. Use POST /api/arbitrage/alerts/start',
    });
  }

  return c.json(arbitrageAlertServer.getStatus());
});

// Start arbitrage scanner
api.post('/arbitrage/start', async (c) => {
  try {
    if (arbitrageScanner) {
      return c.json({ error: 'Scanner already running' }, 400);
    }

    const body = await c.req.json<{
      minSpread?: number;
      minLiquidity?: number;
      pollInterval?: number;
      categories?: MarketCategory[];
    }>().catch(() => ({} as {
      minSpread?: number;
      minLiquidity?: number;
      pollInterval?: number;
      categories?: MarketCategory[];
    }));

    arbitrageScanner = new ArbitrageScanner(
      {
        minSpread: body.minSpread,
        minLiquidity: body.minLiquidity,
        pollInterval: body.pollInterval,
        categories: body.categories,
      },
      {
        onOpportunity: (opp) => {
          console.log(
            `Arbitrage: ${opp.isArbitrage ? '🎯 TRUE ARB' : '📊 +EV'} | ` +
            `${opp.event.category} | ${opp.spreadPercent.toFixed(2)}% spread | ` +
            `${opp.event.description.slice(0, 50)}...`
          );
          // Broadcast via WebSocket if alert server is running
          if (arbitrageAlertServer) {
            arbitrageAlertServer.broadcastOpportunity(opp, true);
          }
          // Broadcast to dashboard WebSocket clients
          dashboardWSS.broadcastArbitrageOpportunity(opp);
        },
        onScanComplete: (result) => {
          // Broadcast scan completion via WebSocket
          if (arbitrageAlertServer) {
            arbitrageAlertServer.broadcastScanComplete(result);
          }
          // Broadcast to dashboard WebSocket clients
          dashboardWSS.broadcastScanComplete({
            eventsScanned: result.meta.eventsMatched,
            opportunitiesFound: result.meta.opportunitiesFound,
            trueArbs: result.opportunities.filter(o => o.isArbitrage).length,
            avgSpread: result.opportunities.length > 0
              ? result.opportunities.reduce((sum, o) => sum + o.spreadPercent, 0) / result.opportunities.length
              : 0,
          });
        },
        onError: (error, context) => {
          console.error(`Arbitrage Error [${context}]:`, error.message);
        },
      }
    );

    await arbitrageScanner.start();

    return c.json({
      success: true,
      message: 'Arbitrage scanner started',
      status: arbitrageScanner.getStatus(),
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Stop arbitrage scanner
api.post('/arbitrage/stop', async (c) => {
  try {
    if (!arbitrageScanner) {
      return c.json({ error: 'Scanner not running' }, 400);
    }

    await arbitrageScanner.stop();
    arbitrageScanner = null;

    return c.json({
      success: true,
      message: 'Arbitrage scanner stopped',
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Get scanner status
api.get('/arbitrage/status', (c) => {
  const alertStatus = arbitrageAlertServer?.getStatus() ?? { running: false, port: 0, clients: 0 };

  if (!arbitrageScanner) {
    return c.json({
      running: false,
      message: 'Scanner not started. Use POST /api/arbitrage/start',
      alerts: alertStatus,
    });
  }

  return c.json({
    ...arbitrageScanner.getStatus(),
    alerts: alertStatus,
  });
});

// Get all opportunities
api.get('/arbitrage/opportunities', (c) => {
  if (!arbitrageScanner) {
    return c.json({ error: 'Scanner not running' }, 400);
  }

  const minSpread = c.req.query('minSpread');
  const minEv = c.req.query('minEv');
  const category = c.req.query('category') as MarketCategory | undefined;
  const arbitrageOnly = c.req.query('arbitrageOnly') === 'true';

  const opportunities = arbitrageScanner.getFilteredOpportunities({
    minSpread: minSpread ? parseFloat(minSpread) : undefined,
    minExpectedValue: minEv ? parseFloat(minEv) : undefined,
    category,
    isArbitrage: arbitrageOnly ? true : undefined,
  });

  // Sort by spread descending
  opportunities.sort((a, b) => b.spreadPercent - a.spreadPercent);

  return c.json({
    opportunities,
    total: opportunities.length,
    arbitrage: opportunities.filter(o => o.isArbitrage).length,
  });
});

// Force an immediate scan
api.post('/arbitrage/scan', async (c) => {
  try {
    if (!arbitrageScanner) {
      return c.json({ error: 'Scanner not running' }, 400);
    }

    const result = await arbitrageScanner.forceScan();

    return c.json({
      success: true,
      ...result.meta,
      opportunities: result.opportunities.length,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Get detailed scanner stats
api.get('/arbitrage/stats', (c) => {
  if (!arbitrageScanner) {
    return c.json({ error: 'Scanner not running' }, 400);
  }

  return c.json(arbitrageScanner.getStats());
});

// Get last scan result
api.get('/arbitrage/last-scan', (c) => {
  if (!arbitrageScanner) {
    return c.json({ error: 'Scanner not running' }, 400);
  }

  const result = arbitrageScanner.getLastScanResult();
  if (!result) {
    return c.json({ error: 'No scan completed yet' }, 404);
  }

  return c.json(result);
});

// One-shot scan (without starting scanner)
api.post('/arbitrage/scan-once', async (c) => {
  try {
    const body = await c.req.json<{
      minSpread?: number;
      minLiquidity?: number;
      categories?: MarketCategory[];
    }>().catch(() => ({} as {
      minSpread?: number;
      minLiquidity?: number;
      categories?: MarketCategory[];
    }));

    // Create temporary scanner
    const scanner = new ArbitrageScanner({
      minSpread: body.minSpread ?? 0.01,
      minLiquidity: body.minLiquidity ?? 500,
      categories: body.categories,
    });

    // Run single scan
    const result = await scanner.forceScan();

    return c.json({
      success: true,
      matchedEvents: result.matchedEvents.length,
      opportunities: result.opportunities,
      meta: result.meta,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// ============ Crypto Arbitrage (Options vs Prediction Markets) ============

// Global crypto matcher instance
let cryptoMatcher: CryptoMatcher | null = null;

function getCryptoMatcher(): CryptoMatcher {
  if (!cryptoMatcher) {
    cryptoMatcher = new CryptoMatcher();
  }
  return cryptoMatcher;
}

// Scan for crypto prediction market arbitrage opportunities
api.post('/arbitrage/crypto/scan', async (c) => {
  try {
    const matcher = getCryptoMatcher();

    // Fetch markets from both Polymarket and Kalshi
    const polymarket = new PolymarketProvider({});
    const kalshi = new KalshiProvider({});

    await Promise.all([polymarket.connect(), kalshi.connect()]);

    const [polyResult, kalshiResult] = await Promise.all([
      polymarket.fetchMarkets(200),
      kalshi.fetchMarkets('open', 200),
    ]);

    const polymarketMarkets = polyResult.ok ? polyResult.data : [];
    const kalshiMarkets = kalshiResult.ok ? kalshiResult.data : [];

    // Detect crypto arbitrage opportunities
    const opportunities = await matcher.detectCryptoArbitrage(
      polymarketMarkets,
      kalshiMarkets
    );

    return c.json({
      success: true,
      opportunities,
      total: opportunities.length,
      stats: {
        polymarketMarkets: polymarketMarkets.length,
        kalshiMarkets: kalshiMarkets.length,
        ...matcher.getStats(),
      },
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Extract crypto target from a question
api.post('/arbitrage/crypto/extract', async (c) => {
  try {
    const body = await c.req.json<{ question: string }>();
    const { question } = body;

    if (!question) {
      return c.json({ error: 'question is required' }, 400);
    }

    const matcher = getCryptoMatcher();
    const target = matcher.extractCryptoTarget(question);

    if (!target) {
      return c.json({
        success: false,
        target: null,
        message: 'Could not extract crypto target from question',
      });
    }

    return c.json({
      success: true,
      target: {
        ...target,
        targetDate: target.targetDate.toISOString(),
      },
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Get Deribit implied probability for a crypto target
api.post('/arbitrage/crypto/deribit-quote', async (c) => {
  try {
    const body = await c.req.json<{
      currency: 'BTC' | 'ETH';
      direction: 'above' | 'below';
      targetPrice: number;
      targetDate: string;
    }>();

    const { currency, direction, targetPrice, targetDate } = body;

    if (!currency || !direction || !targetPrice || !targetDate) {
      return c.json({
        error: 'Required: currency, direction, targetPrice, targetDate',
      }, 400);
    }

    const matcher = getCryptoMatcher();
    const target = {
      currency,
      direction,
      targetPrice,
      targetDate: new Date(targetDate),
      extractionConfidence: 1.0,
      originalQuestion: `${currency} ${direction} $${targetPrice} by ${targetDate}`,
    };

    const quote = await matcher.findMatchingOption(target);

    if (!quote) {
      return c.json({
        success: false,
        quote: null,
        message: 'No matching Deribit option found',
      });
    }

    return c.json({
      success: true,
      quote: {
        venue: quote.venue,
        instrumentId: quote.instrumentId,
        instrumentName: quote.instrumentName,
        impliedProbability: quote.impliedProbability,
        impliedProbabilityPercent: `${(quote.impliedProbability * 100).toFixed(2)}%`,
        markIv: quote.markIv,
        spotPrice: quote.spotPrice,
        daysToExpiry: quote.daysToExpiry,
        option: {
          strike: quote.option.strike,
          expiration: quote.option.expiration.toISOString(),
          optionType: quote.option.optionType,
        },
        ticker: quote.ticker ? {
          markPrice: quote.ticker.markPrice,
          delta: quote.ticker.greeks.delta,
          gamma: quote.ticker.greeks.gamma,
          vega: quote.ticker.greeks.vega,
          theta: quote.ticker.greeks.theta,
        } : null,
      },
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Compare prediction market vs Deribit for a specific question
api.post('/arbitrage/crypto/compare', async (c) => {
  try {
    const body = await c.req.json<{ question: string; venue?: 'polymarket' | 'kalshi' }>();
    const { question, venue = 'polymarket' } = body;

    if (!question) {
      return c.json({ error: 'question is required' }, 400);
    }

    const matcher = getCryptoMatcher();
    const target = matcher.extractCryptoTarget(question);

    if (!target) {
      return c.json({
        success: false,
        message: 'Could not extract crypto target from question',
      });
    }

    // Get Deribit quote
    const deribitQuote = await matcher.findMatchingOption(target);

    if (!deribitQuote) {
      return c.json({
        success: true,
        target: {
          ...target,
          targetDate: target.targetDate.toISOString(),
        },
        deribit: null,
        message: 'No matching Deribit option found for comparison',
      });
    }

    return c.json({
      success: true,
      target: {
        ...target,
        targetDate: target.targetDate.toISOString(),
      },
      deribit: {
        instrumentName: deribitQuote.instrumentName,
        impliedProbability: deribitQuote.impliedProbability,
        impliedProbabilityPercent: `${(deribitQuote.impliedProbability * 100).toFixed(2)}%`,
        spotPrice: deribitQuote.spotPrice,
        strike: deribitQuote.option.strike,
        expiration: deribitQuote.option.expiration.toISOString(),
        markIv: deribitQuote.markIv,
        daysToExpiry: deribitQuote.daysToExpiry.toFixed(1),
      },
      interpretation: `Deribit options imply a ${(deribitQuote.impliedProbability * 100).toFixed(1)}% probability that ${target.currency} will be ${target.direction} $${target.targetPrice.toLocaleString()} by ${target.targetDate.toLocaleDateString()}`,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Get crypto matcher stats
api.get('/arbitrage/crypto/stats', (c) => {
  const matcher = getCryptoMatcher();
  return c.json(matcher.getStats());
});

// ============ Tick Processing ============

import {
  TickProcessor,
  TickProfiler,
  TickStorage,
  getTickStorage,
  createTickProcessor,
  createProfiler,
  benchmark,
  type RawTick,
} from '../ticks';

let tickProcessor: TickProcessor | null = null;
let tickProfiler: TickProfiler | null = null;
let tickStorage: TickStorage | null = null;

// Initialize tick processor
api.post('/ticks/init', async (c) => {
  try {
    if (tickProcessor) {
      return c.json({ error: 'Tick processor already initialized' }, 400);
    }

    const body = await c.req.json<{
      velocityWindowMs?: number;
      movementThresholdBps?: number;
      historySize?: number;
      enableProfiling?: boolean;
      enableStorage?: boolean;
    }>().catch(() => ({} as any));

    // Create storage if enabled
    if (body.enableStorage !== false) {
      tickStorage = getTickStorage();
    }

    // Create profiler if enabled
    if (body.enableProfiling) {
      tickProfiler = createProfiler();
      tickProfiler.start();
    }

    // Create processor with callbacks
    tickProcessor = createTickProcessor(
      {
        velocityWindowMs: body.velocityWindowMs,
        movementThresholdBps: body.movementThresholdBps,
        historySize: body.historySize,
      },
      {
        onMovement: (movement) => {
          if (tickStorage) {
            tickStorage.storeMovement(movement);
          }
        },
        onVelocityUpdate: (velocity) => {
          if (tickStorage) {
            tickStorage.storeVelocity(velocity);
          }
        },
        onAlert: (alert) => {
          console.log(`[TICK ALERT] ${alert.severity.toUpperCase()}: ${alert.message}`);
        },
      }
    );

    return c.json({
      success: true,
      message: 'Tick processor initialized',
      config: {
        profiling: !!tickProfiler,
        storage: !!tickStorage,
      },
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Process a tick
api.post('/ticks/process', async (c) => {
  try {
    if (!tickProcessor) {
      return c.json({ error: 'Tick processor not initialized' }, 400);
    }

    const body = await c.req.json<RawTick>();
    const receivedAt = Bun.nanoseconds();

    const processed = tickProcessor.processTick({
      ...body,
      receivedAt,
    });

    // Record in profiler
    if (tickProfiler) {
      tickProfiler.recordTick(Bun.nanoseconds() - receivedAt);
    }

    // Store if enabled
    if (tickStorage) {
      tickStorage.storeTick(processed);
    }

    return c.json({
      success: true,
      tick: processed,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Process batch of ticks
api.post('/ticks/batch', async (c) => {
  try {
    if (!tickProcessor) {
      return c.json({ error: 'Tick processor not initialized' }, 400);
    }

    const body = await c.req.json<RawTick[]>();
    const receivedAt = Bun.nanoseconds();

    const processed = tickProcessor.processBatch(
      body.map((t) => ({ ...t, receivedAt }))
    );

    // Record in profiler
    if (tickProfiler) {
      tickProfiler.recordTick((Bun.nanoseconds() - receivedAt) / body.length);
    }

    // Store if enabled
    if (tickStorage) {
      tickStorage.storeTicks(processed);
    }

    return c.json({
      success: true,
      count: processed.length,
      avgLatencyMs: processed.reduce((a, b) => a + b.latencyMs, 0) / processed.length,
    });
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : 'Failed' }, 500);
  }
});

// Get tick stats
api.get('/ticks/stats/:venue/:instrumentId', (c) => {
  if (!tickProcessor) {
    return c.json({ error: 'Tick processor not initialized' }, 400);
  }

  const venue = c.req.param('venue');
  const instrumentId = c.req.param('instrumentId');
  const windowMs = parseInt(c.req.query('window') || '60000');

  const stats = tickProcessor.getTickStats(venue, instrumentId, windowMs);
  if (!stats) {
    return c.json({ error: 'No data for instrument' }, 404);
  }

  return c.json(stats);
});

// Get velocity
api.get('/ticks/velocity/:venue/:instrumentId', (c) => {
  if (!tickProcessor) {
    return c.json({ error: 'Tick processor not initialized' }, 400);
  }

  const venue = c.req.param('venue');
  const instrumentId = c.req.param('instrumentId');

  const velocity = tickProcessor.getVelocity(venue, instrumentId);
  if (!velocity) {
    return c.json({ error: 'No velocity data' }, 404);
  }

  return c.json(velocity);
});

// Get all velocities
api.get('/ticks/velocities', (c) => {
  if (!tickProcessor) {
    return c.json({ error: 'Tick processor not initialized' }, 400);
  }

  return c.json({
    velocities: tickProcessor.getAllVelocities(),
  });
});

// Get latency stats
api.get('/ticks/latency/:venue', (c) => {
  if (!tickProcessor) {
    return c.json({ error: 'Tick processor not initialized' }, 400);
  }

  const venue = c.req.param('venue');
  const instrumentId = c.req.query('instrumentId');

  const stats = tickProcessor.getLatencyStats(venue, instrumentId);
  if (!stats) {
    return c.json({ error: 'No latency data' }, 404);
  }

  // Store latency stats if storage enabled
  if (tickStorage) {
    tickStorage.storeLatencyStats(stats);
  }

  return c.json(stats);
});

// Get recent ticks
api.get('/ticks/recent/:venue/:instrumentId', (c) => {
  if (!tickProcessor) {
    return c.json({ error: 'Tick processor not initialized' }, 400);
  }

  const venue = c.req.param('venue');
  const instrumentId = c.req.param('instrumentId');
  const count = parseInt(c.req.query('count') || '100');

  return c.json({
    ticks: tickProcessor.getRecentTicks(venue, instrumentId, count),
  });
});

// Get last movement
api.get('/ticks/movement/:venue/:instrumentId', (c) => {
  if (!tickProcessor) {
    return c.json({ error: 'Tick processor not initialized' }, 400);
  }

  const venue = c.req.param('venue');
  const instrumentId = c.req.param('instrumentId');

  const movement = tickProcessor.getLastMovement(venue, instrumentId);
  return c.json({ movement });
});

// Get movement history from storage
api.get('/ticks/movements/:venue/:instrumentId', (c) => {
  if (!tickStorage) {
    return c.json({ error: 'Tick storage not enabled' }, 400);
  }

  const venue = c.req.param('venue');
  const instrumentId = c.req.param('instrumentId');
  const since = c.req.query('since') ? parseInt(c.req.query('since')!) : undefined;
  const limit = parseInt(c.req.query('limit') || '100');
  const direction = c.req.query('direction') as 'up' | 'down' | undefined;

  return c.json({
    movements: tickStorage.getMovements(venue, instrumentId, { since, limit, direction }),
  });
});

// Get CLV analysis
api.get('/ticks/clv/:venue/:instrumentId', (c) => {
  if (!tickStorage) {
    return c.json({ error: 'Tick storage not enabled' }, 400);
  }

  const venue = c.req.param('venue');
  const instrumentId = c.req.param('instrumentId');
  const entryTime = parseInt(c.req.query('entry') || '0');
  const closeTime = parseInt(c.req.query('close') || Date.now().toString());

  if (!entryTime) {
    return c.json({ error: 'entry time required' }, 400);
  }

  return c.json(tickStorage.getClvAnalysis(venue, instrumentId, entryTime, closeTime));
});

// Get processor performance
api.get('/ticks/performance', (c) => {
  if (!tickProcessor) {
    return c.json({ error: 'Tick processor not initialized' }, 400);
  }

  return c.json(tickProcessor.getPerformanceMetrics());
});

// ============ Profiling ============

// Start profiler
api.post('/ticks/profiler/start', (c) => {
  if (tickProfiler?.getCurrentStats().isRunning) {
    return c.json({ error: 'Profiler already running' }, 400);
  }

  if (!tickProfiler) {
    tickProfiler = createProfiler();
  }

  tickProfiler.start();
  return c.json({ success: true, message: 'Profiler started' });
});

// Stop profiler and get report
api.post('/ticks/profiler/stop', (c) => {
  if (!tickProfiler) {
    return c.json({ error: 'Profiler not initialized' }, 400);
  }

  const report = tickProfiler.stop();
  return c.json({
    success: true,
    report: {
      duration: report.duration,
      avgCpuUsage: report.avgCpuUsage.toFixed(2) + '%',
      peakCpuUsage: report.peakCpuUsage.toFixed(2) + '%',
      avgHeapUsed: TickProfiler.formatBytes(report.avgHeapUsed),
      peakHeapUsed: TickProfiler.formatBytes(report.peakHeapUsed),
      totalTicksProcessed: report.totalTicksProcessed,
      avgTickProcessingNs: TickProfiler.formatNs(report.avgTickProcessingNs),
      throughput: report.throughput.toFixed(2) + ' ticks/s',
    },
  });
});

// Get profiler current stats
api.get('/ticks/profiler/stats', (c) => {
  if (!tickProfiler) {
    return c.json({ error: 'Profiler not initialized' }, 400);
  }

  const stats = tickProfiler.getCurrentStats();
  return c.json({
    ...stats,
    memoryUsage: {
      heapUsed: TickProfiler.formatBytes(stats.memoryUsage.heapUsed),
      heapTotal: TickProfiler.formatBytes(stats.memoryUsage.heapTotal),
      rss: TickProfiler.formatBytes(stats.memoryUsage.rss),
    },
  });
});

// Get recent profile samples
api.get('/ticks/profiler/samples', (c) => {
  if (!tickProfiler) {
    return c.json({ error: 'Profiler not initialized' }, 400);
  }

  const count = parseInt(c.req.query('count') || '100');
  return c.json({
    samples: tickProfiler.getRecentSamples(count),
  });
});

// Take heap snapshot
api.post('/ticks/profiler/heap-snapshot', async (c) => {
  if (!tickProfiler) {
    tickProfiler = createProfiler();
  }

  const body = await c.req.json<{ path?: string }>().catch(() => ({} as { path?: string }));
  const path = await tickProfiler.takeHeapSnapshot(body.path);

  return c.json({
    success: true,
    path,
    message: 'Heap snapshot saved. Open in Chrome DevTools.',
  });
});

// Force GC
api.post('/ticks/profiler/gc', (c) => {
  if (!tickProfiler) {
    tickProfiler = createProfiler();
  }

  tickProfiler.forceGc();
  return c.json({
    success: true,
    message: 'Garbage collection triggered',
    memory: process.memoryUsage(),
  });
});

// Run benchmark
api.post('/ticks/benchmark', async (c) => {
  const body = await c.req.json<{
    iterations?: number;
    ticksPerBatch?: number;
  }>().catch(() => ({} as any));

  const iterations = body.iterations || 1000;
  const ticksPerBatch = body.ticksPerBatch || 10;

  const processor = createTickProcessor();

  // Create sample tick
  const sampleTick: RawTick = {
    venue: 'benchmark',
    instrumentId: 'TEST',
    timestamp: Date.now(),
    receivedAt: Bun.nanoseconds(),
    bid: 100,
    ask: 100.01,
  };

  const result = await benchmark(
    'tick-processing',
    () => {
      for (let i = 0; i < ticksPerBatch; i++) {
        processor.processTick({
          ...sampleTick,
          timestamp: Date.now(),
          receivedAt: Bun.nanoseconds(),
          bid: 100 + Math.random() * 0.1,
          ask: 100.01 + Math.random() * 0.1,
        });
      }
    },
    iterations
  );

  return c.json({
    benchmark: result.name,
    iterations,
    ticksPerBatch,
    totalTicks: iterations * ticksPerBatch,
    avgNsPerBatch: TickProfiler.formatNs(result.avgNs),
    avgNsPerTick: TickProfiler.formatNs(result.avgNs / ticksPerBatch),
    opsPerSec: (result.opsPerSec * ticksPerBatch).toFixed(0) + ' ticks/s',
    minNs: TickProfiler.formatNs(result.minNs),
    maxNs: TickProfiler.formatNs(result.maxNs),
  });
});

// Get tick storage stats
api.get('/ticks/storage/stats', (c) => {
  if (!tickStorage) {
    return c.json({ error: 'Tick storage not enabled' }, 400);
  }

  const stats = tickStorage.getStats();
  return c.json({
    ...stats,
    dbSize: TickProfiler.formatBytes(stats.dbSizeBytes),
  });
});

// Get movement aggregate stats
api.get('/ticks/storage/movement-stats/:venue/:instrumentId', (c) => {
  if (!tickStorage) {
    return c.json({ error: 'Tick storage not enabled' }, 400);
  }

  const venue = c.req.param('venue');
  const instrumentId = c.req.param('instrumentId');
  const since = parseInt(c.req.query('since') || (Date.now() - 3600000).toString()); // Default 1 hour

  return c.json(tickStorage.getMovementStats(venue, instrumentId, since));
});

// Prune old data
api.post('/ticks/storage/prune', async (c) => {
  if (!tickStorage) {
    return c.json({ error: 'Tick storage not enabled' }, 400);
  }

  const body = await c.req.json<{ olderThanMs?: number }>().catch(() => ({} as any));
  const olderThan = Date.now() - (body.olderThanMs || 86400000); // Default 24 hours

  const result = tickStorage.prune(olderThan);
  tickStorage.vacuum();

  return c.json({
    success: true,
    ...result,
  });
});

// Shutdown tick processor
api.post('/ticks/shutdown', (c) => {
  if (tickProfiler) {
    tickProfiler.stop();
    tickProfiler = null;
  }

  if (tickStorage) {
    tickStorage.close();
    tickStorage = null;
  }

  tickProcessor = null;

  return c.json({ success: true, message: 'Tick processor shutdown' });
});

// ============ Canonical Identity ============

// Generate UUID from slug
api.get('/canonical/uuid/:slug', (c) => {
  try {
    const slug = c.req.param('slug');
    const uuid = slugToUUID(slug);
    const { exchange, marketId } = parseSlug(slug);

    return c.json({
      slug,
      uuid,
      exchange,
      marketId,
      namespace: EXCHANGE_NAMESPACES[exchange],
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

// Generate UUID from exchange + marketId
api.post('/canonical/uuid', async (c) => {
  try {
    const body = await c.req.json();
    const { exchange, marketId } = body as { exchange: ExchangeName; marketId: string };

    if (!exchange || !marketId) {
      return c.json({ error: 'exchange and marketId are required' }, 400);
    }

    const uuid = canonicalUUID(exchange, marketId);
    const namespace = EXCHANGE_NAMESPACES[exchange];

    if (!namespace) {
      return c.json({ error: `Unknown exchange: ${exchange}` }, 400);
    }

    return c.json({
      slug: `${exchange}:${marketId}`,
      uuid,
      exchange,
      marketId,
      namespace,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

// Batch generate UUIDs
api.post('/canonical/uuid/batch', async (c) => {
  try {
    const body = await c.req.json();
    const { slugs } = body as { slugs: string[] };

    if (!Array.isArray(slugs)) {
      return c.json({ error: 'slugs array is required' }, 400);
    }

    const results = slugs.map((slug) => {
      try {
        const uuid = slugToUUID(slug);
        const { exchange, marketId } = parseSlug(slug);
        return { slug, uuid, exchange, marketId, error: null };
      } catch (error) {
        return { slug, uuid: null, exchange: null, marketId: null, error: (error as Error).message };
      }
    });

    return c.json({
      results,
      total: slugs.length,
      successful: results.filter((r) => r.uuid).length,
      failed: results.filter((r) => r.error).length,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

// Get registered exchanges
api.get('/canonical/exchanges', (c) => {
  const exchanges = getRegisteredExchanges();
  const details = exchanges.map((name) => ({
    name,
    namespace: EXCHANGE_NAMESPACES[name],
    category: name.includes('market') || ['polymarket', 'kalshi', 'manifold', 'predictit'].includes(name)
      ? 'prediction'
      : ['bitmex', 'binance', 'bybit', 'okx', 'deribit', 'kraken'].includes(name)
        ? 'crypto'
        : ['pinnacle', 'draftkings', 'fanduel', 'betmgm', 'caesars', 'bet365'].includes(name)
          ? 'sportsbook'
          : 'other',
  }));

  return c.json({
    exchanges: details,
    total: exchanges.length,
    categories: {
      prediction: details.filter((e) => e.category === 'prediction').length,
      crypto: details.filter((e) => e.category === 'crypto').length,
      sportsbook: details.filter((e) => e.category === 'sportsbook').length,
      other: details.filter((e) => e.category === 'other').length,
    },
  });
});

// Validate UUID format
api.get('/canonical/validate/:uuid', (c) => {
  const uuid = c.req.param('uuid');
  const isValid = isValidUUID(uuid);

  return c.json({
    uuid,
    isValid,
    format: isValid ? 'RFC 4122 compliant' : 'Invalid UUID format',
  });
});

// Raw UUIDv5 generation (for custom namespaces)
api.post('/canonical/uuidv5', async (c) => {
  try {
    const body = await c.req.json();
    const { name, namespace } = body as { name: string; namespace: string };

    if (!name || !namespace) {
      return c.json({ error: 'name and namespace are required' }, 400);
    }

    if (!isValidUUID(namespace)) {
      return c.json({ error: 'namespace must be a valid UUID' }, 400);
    }

    const uuid = uuidv5(name, namespace);

    return c.json({
      name,
      namespace,
      uuid,
      version: 5,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 400);
  }
});

// ============ Cache Management ============

// Get cache stats
api.get('/cache/stats', (c) => {
  try {
    const cache = getCache();
    const stats = cache.stats();

    return c.json({
      ...stats,
      sizeFormatted: formatBytes(stats.sizeBytes),
      oldestAge: stats.oldestEntry ? Date.now() - stats.oldestEntry : null,
      newestAge: stats.newestEntry ? Date.now() - stats.newestEntry : null,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// List cache keys
api.get('/cache/keys', (c) => {
  try {
    const prefix = c.req.query('prefix');
    const cache = getCache();
    const keys = cache.keys(prefix);

    return c.json({
      keys,
      count: keys.length,
      prefix: prefix || null,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get cache entry
api.get('/cache/get/:key', (c) => {
  try {
    const key = c.req.param('key');
    const cache = getCache();
    const entry = cache.inspect(key);

    if (!entry) {
      return c.json({ error: 'Key not found or expired' }, 404);
    }

    return c.json({
      key: entry.key,
      value: entry.value,
      hits: entry.hits,
      expiresAt: entry.expiresAt,
      createdAt: entry.createdAt,
      ttlRemaining: entry.expiresAt - Date.now(),
      age: Date.now() - entry.createdAt,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Set cache entry
api.post('/cache/set', async (c) => {
  try {
    const body = await c.req.json();
    const { key, value, ttl } = body as { key: string; value: unknown; ttl?: number };

    if (!key) {
      return c.json({ error: 'key is required' }, 400);
    }

    const cache = getCache();
    cache.set(key, value, ttl);

    return c.json({
      success: true,
      key,
      ttl: ttl || 3600,
      expiresAt: Date.now() + (ttl || 3600) * 1000,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Delete cache entry
api.delete('/cache/delete/:key', (c) => {
  try {
    const key = c.req.param('key');
    const cache = getCache();
    const deleted = cache.delete(key);

    return c.json({
      success: deleted,
      key,
      message: deleted ? 'Key deleted' : 'Key not found',
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Invalidate by prefix
api.delete('/cache/invalidate/:prefix', (c) => {
  try {
    const prefix = c.req.param('prefix');
    const cache = getCache();
    const count = cache.invalidatePrefix(prefix);

    return c.json({
      success: true,
      prefix,
      deletedCount: count,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Cleanup expired entries
api.post('/cache/cleanup', (c) => {
  try {
    const cache = getCache();
    const cleaned = cache.cleanup();

    return c.json({
      success: true,
      expiredEntriesRemoved: cleaned,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Clear all cache
api.delete('/cache/clear', (c) => {
  try {
    const cache = getCache();
    cache.clear();

    return c.json({
      success: true,
      message: 'Cache cleared',
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Helper function for formatting bytes
function formatBytes(bytes: number): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(2)} GB`;
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(2)} MB`;
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(2)} KB`;
  return `${bytes} B`;
}

// ============ Deribit Crypto Options ============

// Get BTC or ETH index price
api.get('/deribit/index/:currency', async (c) => {
  try {
    const currency = c.req.param('currency').toLowerCase();
    const deribit = getDeribit();
    const result = await deribit.getIndex(`${currency}_usd`);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    return c.json(result.data);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get all options for a currency
api.get('/deribit/options/:currency', async (c) => {
  try {
    const currency = c.req.param('currency').toUpperCase() as 'BTC' | 'ETH';
    const deribit = getDeribit();
    const result = await deribit.fetchOptions(currency);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    // Group by expiration
    const byExpiration = new Map<string, DeribitOption[]>();
    for (const opt of result.data) {
      const key = opt.expiration.toISOString().split('T')[0];
      const existing = byExpiration.get(key) || [];
      existing.push(opt);
      byExpiration.set(key, existing);
    }

    return c.json({
      currency,
      total: result.data.length,
      expirations: Array.from(byExpiration.entries()).map(([date, options]) => ({
        date,
        count: options.length,
        calls: options.filter(o => o.optionType === 'call').length,
        puts: options.filter(o => o.optionType === 'put').length,
        strikes: [...new Set(options.map(o => o.strike))].sort((a, b) => a - b),
      })),
      options: result.data,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get option ticker with Greeks
api.get('/deribit/ticker/:instrument', async (c) => {
  try {
    const instrument = c.req.param('instrument');
    const deribit = getDeribit();
    const result = await deribit.getOptionTicker(instrument);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    return c.json(result.data);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get option orderbook
api.get('/deribit/orderbook/:instrument', async (c) => {
  try {
    const instrument = c.req.param('instrument');
    const depth = parseInt(c.req.query('depth') || '10');
    const deribit = getDeribit();
    const result = await deribit.getOrderbook(instrument, depth);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    return c.json(result.data);
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get available expirations
api.get('/deribit/expirations/:currency', async (c) => {
  try {
    const currency = c.req.param('currency').toUpperCase() as 'BTC' | 'ETH';
    const deribit = getDeribit();
    const result = await deribit.getExpirations(currency);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    return c.json({
      currency,
      expirations: result.data.map(exp => ({
        date: exp.date.toISOString(),
        daysToExpiry: Math.round(exp.daysToExpiry * 10) / 10,
        expirationType: exp.daysToExpiry <= 1 ? 'daily' :
                        exp.daysToExpiry <= 7 ? 'weekly' :
                        exp.daysToExpiry <= 31 ? 'monthly' : 'quarterly',
      })),
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get ATM option
api.get('/deribit/atm/:currency/:type', async (c) => {
  try {
    const currency = c.req.param('currency').toUpperCase() as 'BTC' | 'ETH';
    const optionType = c.req.param('type').toLowerCase() as 'call' | 'put';
    const expiration = c.req.query('expiration');
    const deribit = getDeribit();

    const expirationTs = expiration ? new Date(expiration).getTime() : undefined;
    const result = await deribit.getATMOption(currency, optionType, expirationTs);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    if (!result.data) {
      return c.json({ error: 'No ATM option found' }, 404);
    }

    // Also fetch the ticker for this option
    const tickerResult = await deribit.getOptionTicker(result.data.instrumentName);

    return c.json({
      option: result.data,
      ticker: tickerResult.ok ? tickerResult.data : null,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get volatility surface (expensive - cached)
api.get('/deribit/volatility-surface/:currency', async (c) => {
  try {
    const currency = c.req.param('currency').toUpperCase() as 'BTC' | 'ETH';
    const cache = getCache();
    const cacheKey = `deribit:vol-surface:${currency}`;

    // Check cache first (10 min TTL)
    const cached = cache.get<any>(cacheKey);
    if (cached) {
      return c.json({ ...cached, cached: true });
    }

    const deribit = getDeribit();
    const result = await deribit.getVolatilitySurface(currency);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    // Group by expiration
    const byExpiration = new Map<string, typeof result.data>();
    for (const point of result.data) {
      const key = point.expiration.toISOString().split('T')[0];
      const existing = byExpiration.get(key) || [];
      existing.push(point);
      byExpiration.set(key, existing);
    }

    const response = {
      currency,
      timestamp: Date.now(),
      totalPoints: result.data.length,
      expirations: Array.from(byExpiration.entries()).map(([date, points]) => ({
        date,
        points: points.sort((a, b) => a.strike - b.strike),
        avgIV: points.reduce((sum, p) => sum + p.iv, 0) / points.length,
        minIV: Math.min(...points.map(p => p.iv)),
        maxIV: Math.max(...points.map(p => p.iv)),
      })),
    };

    cache.set(cacheKey, response, 600); // 10 min cache
    return c.json({ ...response, cached: false });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Get implied probability from option
api.get('/deribit/implied-prob/:instrument', async (c) => {
  try {
    const instrument = c.req.param('instrument');
    const deribit = getDeribit();
    const result = await deribit.getImpliedProbability(instrument);

    if (!result.ok) {
      return c.json({ error: result.error.message }, 500);
    }

    // Also get ticker for context
    const tickerResult = await deribit.getOptionTicker(instrument);

    return c.json({
      instrument,
      impliedProbability: result.data,
      impliedProbabilityPercent: `${(result.data * 100).toFixed(2)}%`,
      ticker: tickerResult.ok ? {
        underlyingPrice: tickerResult.data.underlyingPrice,
        markPrice: tickerResult.data.markPrice,
        markIV: tickerResult.data.markIv,
        delta: tickerResult.data.greeks.delta,
      } : null,
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

// Options chain for specific expiration
api.get('/deribit/chain/:currency/:expiration', async (c) => {
  try {
    const currency = c.req.param('currency').toUpperCase() as 'BTC' | 'ETH';
    const expirationDate = c.req.param('expiration');
    const expirationTs = new Date(expirationDate).getTime();

    const deribit = getDeribit();
    const optionsResult = await deribit.getOptionsByExpiration(currency, expirationTs);

    if (!optionsResult.ok) {
      return c.json({ error: optionsResult.error.message }, 500);
    }

    // Get index price
    const indexResult = await deribit.getIndex(`${currency.toLowerCase()}_usd`);
    const spotPrice = indexResult.ok ? indexResult.data.price : 0;

    // Group by strike
    const strikes = new Map<number, { call?: DeribitOption; put?: DeribitOption }>();
    for (const opt of optionsResult.data) {
      const existing = strikes.get(opt.strike) || {};
      if (opt.optionType === 'call') existing.call = opt;
      else existing.put = opt;
      strikes.set(opt.strike, existing);
    }

    return c.json({
      currency,
      expiration: expirationDate,
      spotPrice,
      strikes: Array.from(strikes.entries())
        .sort(([a], [b]) => a - b)
        .map(([strike, options]) => ({
          strike,
          moneyness: spotPrice > 0 ? ((strike / spotPrice - 1) * 100).toFixed(2) + '%' : null,
          call: options.call?.instrumentName || null,
          put: options.put?.instrumentName || null,
        })),
    });
  } catch (error) {
    return c.json({ error: (error as Error).message }, 500);
  }
});

export default api;
