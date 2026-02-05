// Polymarket Integration Client
// Cross-platform compatibility for prediction market data

export interface PolymarketEvent {
  id: string;
  question: string;
  description: string;
  outcomes: string[];
  prices: number[];
  volume: number;
  liquidity: number;
  end_date: string;
  categories: string[];
  active: boolean;
}

export interface PolymarketMarketData {
  eventId: string;
  question: string;
  outcomes: Array<{
    name: string;
    price: number;
    probability: number;
  }>;
  timestamp: number;
  volume24h: number;
  liquidity: number;
}

export class PolymarketClient {
  private baseUrl: string;
  private apiKey: string;
  private userAgent: string;

  constructor(apiKey?: string) {
    this.baseUrl = 'https://api.polymarket.com';
    this.apiKey = apiKey || process.env.POLYMARKET_API_KEY || '';
    this.userAgent = this.getUserAgent();
  }

  private getUserAgent(): string {
    const platform = process.platform;
    const arch = process.arch;
    const nodeVersion = process.version;
    
    return `HFT-13Byte/1.0 (${platform}; ${arch}) Node/${nodeVersion}`;
  }

  // Get active markets
  async getActiveMarkets(limit: number = 100): Promise<PolymarketEvent[]> {
    try {
      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/markets?active=true&limit=${limit}`, {
        headers,
      });
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });
      
      const result = await Promise.race([response, timeoutPromise]) as Response;

      if (!result.ok) {
        throw new Error(`Polymarket API error: ${result.status} ${result.statusText}`);
      }

      const data = await result.json();
      return data.map((event: any) => this.normalizePolymarketEvent(event));
      
    } catch (error) {
      console.error('Failed to fetch Polymarket markets:', error);
      throw new Error(`Polymarket integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get market data for specific event
  async getMarketData(eventId: string): Promise<PolymarketMarketData> {
    try {
      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/markets/${eventId}`, {
        headers,
      });
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000);
      });
      
      const result = await Promise.race([response, timeoutPromise]) as Response;

      if (!result.ok) {
        throw new Error(`Polymarket API error: ${result.status} ${result.statusText}`);
      }

      const data = await result.json();
      return this.normalizePolymarketData(data);
      
    } catch (error) {
      console.error(`Failed to fetch Polymarket data for ${eventId}:`, error);
      throw new Error(`Polymarket data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Normalize Polymarket event data
  private normalizePolymarketEvent(event: any): PolymarketEvent {
    return {
      id: event.id || event.token_id,
      question: event.question || event.title,
      description: event.description || '',
      outcomes: event.outcomes || [],
      prices: event.prices || [],
      volume: parseFloat(event.volume) || 0,
      liquidity: parseFloat(event.liquidity) || 0,
      end_date: event.end_date || event.expiration_time,
      categories: Array.isArray(event.categories) ? event.categories : [],
      active: event.active !== false
    };
  }

  // Normalize Polymarket market data
  private normalizePolymarketData(data: any): PolymarketMarketData {
    const outcomes = (data.outcomes || []).map((outcome: any) => ({
      name: outcome.name || outcome.outcome,
      price: parseFloat(outcome.price) || 0,
      probability: parseFloat(outcome.price) || 0 // Price = probability in 0-1 range
    }));

    return {
      eventId: data.id || data.token_id,
      question: data.question || data.title,
      outcomes,
      timestamp: Date.now(),
      volume24h: parseFloat(data.volume_24h) || 0,
      liquidity: parseFloat(data.liquidity) || 0
    };
  }

  // Convert Polymarket data to our trading format
  convertToTradingFormat(marketData: PolymarketMarketData): any {
    const sportType = this.inferSportType(marketData.question);
    const teams = this.extractTeams(marketData.question);
    
    const baseData: any = {
      eventId: `polymarket_${marketData.eventId}`,
      sportType,
      homeTeam: teams.home,
      awayTeam: teams.away,
      timestamp: marketData.timestamp,
      volume: marketData.volume24h,
      liquidity: marketData.liquidity,
      source: 'polymarket'
    };

    // Add odds based on outcomes
    if (marketData.outcomes.length >= 2) {
      const homeOutcome = marketData.outcomes[0];
      const awayOutcome = marketData.outcomes[1];
      
      // Convert probability to decimal odds (1/probability)
      baseData.homeOdds = homeOutcome.probability > 0 ? Math.round((1 / homeOutcome.probability) * 100) / 100 : 1.01;
      baseData.awayOdds = awayOutcome.probability > 0 ? Math.round((1 / awayOutcome.probability) * 100) / 100 : 1.01;
      
      // Add draw odds if applicable
      if (marketData.outcomes.length >= 3) {
        const drawOutcome = marketData.outcomes[2];
        baseData.drawOdds = drawOutcome.probability > 0 ? Math.round((1 / drawOutcome.probability) * 100) / 100 : 1.01;
      }
    }

    // Add totals if applicable
    if (marketData.question.toLowerCase().includes('over') || 
        marketData.question.toLowerCase().includes('under')) {
      const totalPoints = this.extractTotalPoints(marketData.question);
      if (totalPoints) {
        baseData.totalPoints = totalPoints;
        baseData.overOdds = baseData.homeOdds;
        baseData.underOdds = baseData.awayOdds;
      }
    }

    return baseData;
  }

  // Infer sport type from question
  private inferSportType(question: string): string {
    const q = question.toLowerCase();
    
    if (q.includes('soccer') || q.includes('football') || q.includes('premier league') || 
        q.includes('la liga') || q.includes('bundesliga') || q.includes('serie a')) {
      return 'soccer';
    } else if (q.includes('basketball') || q.includes('nba') || q.includes('ncaa')) {
      return 'basketball';
    } else if (q.includes('tennis') || q.includes('atp') || q.includes('wta')) {
      return 'tennis';
    } else if (q.includes('baseball') || q.includes('mlb')) {
      return 'baseball';
    } else if (q.includes('football') && q.includes('nfl') || q.includes('super bowl')) {
      return 'football';
    }
    
    return 'other';
  }

  // Extract team names from question
  private extractTeams(question: string): { home: string; away: string } {
    // Simple extraction - in production, use NLP or regex patterns
    const words = question.split(' ');
    const teams: string[] = [];
    
    // Look for proper nouns (capitalized words)
    for (let i = 0; i < words.length; i++) {
      const word = words[i].replace(/[^\w\s]/gi, '');
      if (word.length > 2 && word[0] === word[0].toUpperCase()) {
        teams.push(word);
      }
    }
    
    return {
      home: teams[0] || 'Team A',
      away: teams[1] || 'Team B'
    };
  }

  // Extract total points from question
  private extractTotalPoints(question: string): number | null {
    const match = question.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  // Health check for Polymarket API
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        headers: { 'User-Agent': this.userAgent },
      });
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000);
      });
      
      const result = await Promise.race([response, timeoutPromise]) as Response;
      return result.ok;
    } catch (error) {
      console.error('Polymarket health check failed:', error);
      return false;
    }
  }

  // Get rate limit information
  async getRateLimit(): Promise<{ limit: number; remaining: number; reset: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/rate-limit`, {
        headers: { 
          'User-Agent': this.userAgent,
          ...(this.apiKey && { 'Authorization': `Bearer ${this.apiKey}` })
        },
      });
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000);
      });
      
      const result = await Promise.race([response, timeoutPromise]) as Response;
      
      if (result.ok) {
        const data = await result.json();
        return {
          limit: data.limit || 100,
          remaining: data.remaining || 100,
          reset: data.reset || Date.now() + 60000
        };
      }
      
      return { limit: 100, remaining: 100, reset: Date.now() + 60000 };
    } catch (error) {
      return { limit: 100, remaining: 100, reset: Date.now() + 60000 };
    }
  }
}

// Singleton instance
export const polymarketClient = new PolymarketClient();
