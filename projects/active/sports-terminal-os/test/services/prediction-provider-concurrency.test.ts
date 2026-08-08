import { describe, expect, it } from 'bun:test';
import { fetchProvidersConcurrently } from '../../src/services/prediction-market-service';
import type { PredictionMarket, PredictionProvider } from '../../src/utils/types';

describe('prediction provider refresh concurrency', () => {
  it('starts all enabled provider fetches before any completes', async () => {
    const providers: PredictionProvider[] = ['kalshi', 'polymarket', 'predictit'];
    const started: PredictionProvider[] = [];
    const resolvers = new Map<PredictionProvider, (markets: PredictionMarket[]) => void>();

    const pending = fetchProvidersConcurrently(providers, provider => {
      started.push(provider);
      return new Promise<PredictionMarket[]>(resolve => resolvers.set(provider, resolve));
    });

    await Promise.resolve();
    expect(started).toEqual(providers);

    providers.forEach(provider => resolvers.get(provider)?.([]));
    expect(await pending).toEqual({ kalshi: [], polymarket: [], predictit: [] });
  });

  it('isolates a failed provider while preserving successful results', async () => {
    const kalshiMarket = { id: 'kalshi-1' } as PredictionMarket;
    const results = await fetchProvidersConcurrently(['kalshi', 'polymarket'], async provider => {
      if (provider === 'polymarket') throw new Error('provider unavailable');
      return [kalshiMarket];
    });

    expect(results.kalshi).toEqual([kalshiMarket]);
    expect(results.polymarket).toEqual([]);
  });
});
