// Fanduel Sportsbook Integration Client
// Cross-platform compatibility for sports betting data

export interface FanduelEvent {
  id: string;
  name: string;
  sport: string;
  league: string;
  startTime: number;
  participants: Array<{
    name: string;
    type: 'team' | 'player';
  }>;
  markets: Array<{
    name: string;
    selections: Array<{
      name: string;
      price: number;
      odds: number;
    }>;
  }>;
  isActive: boolean;
}

export interface FanduelMarketData {
  eventId: string;
  eventName: string;
  sport: string;
  homeTeam: string;
  awayTeam: string;
  homeOdds: number;
  awayOdds: number;
  drawOdds?: number;
  totalPoints?: number;
  overOdds?: number;
  underOdds?: number;
  timestamp: number;
  volume: number;
  liquidity: number;
}

export class FanduelClient {
  private baseUrl: string;
  private apiKey: string;
  private userAgent: string;
  private region: string;

  constructor(apiKey?: string, region: string = 'us') {
    this.baseUrl = region === 'uk' ? 'https://api.fanduel.co.uk' : 'https://api.fanduel.com';
    this.apiKey = apiKey || process.env.FANDUEL_API_KEY || '';
    this.region = region;
    this.userAgent = this.getUserAgent();
  }

  private getUserAgent(): string {
    const platform = process.platform;
    const arch = process.arch;
    const nodeVersion = process.version;
    
    return `HFT-13Byte/1.0 (${platform}; ${arch}; ${this.region.toUpperCase()}) Node/${nodeVersion}`;
  }

  // Get active sports events
  async getActiveEvents(sport?: string, limit: number = 100): Promise<FanduelEvent[]> {
    try {
      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const sportFilter = sport ? `&sport=${sport}` : '';
      const response = await fetch(`${this.baseUrl}/sports/events?active=true${sportFilter}&limit=${limit}`, {
        headers,
      });
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 10000);
      });
      
      const result = await Promise.race([response, timeoutPromise]) as Response;

      if (!result.ok) {
        throw new Error(`Fanduel API error: ${result.status} ${result.statusText}`);
      }

      const data = await result.json();
      return data.map((event: any) => this.normalizeFanduelEvent(event));
      
    } catch (error) {
      console.error('Failed to fetch Fanduel events:', error);
      throw new Error(`Fanduel integration failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Get market data for specific event
  async getMarketData(eventId: string): Promise<FanduelMarketData> {
    try {
      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/sports/events/${eventId}/markets`, {
        headers,
      });
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000);
      });
      
      const result = await Promise.race([response, timeoutPromise]) as Response;

      if (!result.ok) {
        throw new Error(`Fanduel API error: ${result.status} ${result.statusText}`);
      }

      const data = await result.json();
      return this.normalizeFanduelMarketData(data);
      
    } catch (error) {
      console.error(`Failed to fetch Fanduel data for ${eventId}:`, error);
      throw new Error(`Fanduel data fetch failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Normalize Fanduel event data
  private normalizeFanduelEvent(event: any): FanduelEvent {
    return {
      id: event.id || event.event_id,
      name: event.name || event.event_name,
      sport: event.sport || this.normalizeSport(event.category),
      league: event.league || event.competition,
      startTime: new Date(event.start_time || event.startTime).getTime(),
      participants: (event.participants || []).map((p: any) => ({
        name: p.name || p.participant_name,
        type: p.type || 'team'
      })),
      markets: (event.markets || []).map((m: any) => ({
        name: m.name || m.market_name,
        selections: (m.selections || m.outcomes || []).map((s: any) => ({
          name: s.name || s.selection_name,
          price: parseFloat(s.price) || s.odds || 0,
          odds: parseFloat(s.odds) || s.price || 0
        }))
      })),
      isActive: event.is_active !== false
    };
  }

  // Normalize Fanduel market data
  private normalizeFanduelMarketData(data: any): FanduelMarketData {
    const event = data.event || data;
    const markets = data.markets || [];
    
    // Extract teams
    const participants = event.participants || [];
    const homeTeam = participants[0]?.name || 'Team A';
    const awayTeam = participants[1]?.name || 'Team B';

    const baseData: FanduelMarketData = {
      eventId: event.id || event.event_id,
      eventName: event.name || event.event_name,
      sport: this.normalizeSport(event.sport || event.category),
      homeTeam,
      awayTeam,
      homeOdds: 0,
      awayOdds: 0,
      timestamp: Date.now(),
      volume: parseFloat(event.volume) || 0,
      liquidity: parseFloat(event.liquidity) || 0
    };

    // Extract odds from markets
    for (const market of markets) {
      const marketName = (market.name || '').toLowerCase();
      
      if (marketName.includes('moneyline') || marketName.includes('match result')) {
        const selections = market.selections || [];
        if (selections.length >= 2) {
          baseData.homeOdds = this.convertToDecimalOdds(selections[0].price || selections[0].odds);
          baseData.awayOdds = this.convertToDecimalOdds(selections[1].price || selections[1].odds);
          
          if (selections.length >= 3) {
            baseData.drawOdds = this.convertToDecimalOdds(selections[2].price || selections[2].odds);
          }
        }
      }
      
      if (marketName.includes('total points') || marketName.includes('over/under')) {
        const selections = market.selections || [];
        for (const selection of selections) {
          const name = (selection.name || '').toLowerCase();
          if (name.includes('over')) {
            const totalPoints = this.extractTotalPoints(selection.name);
            if (totalPoints) {
              baseData.totalPoints = totalPoints;
              baseData.overOdds = this.convertToDecimalOdds(selection.price || selection.odds);
            }
          } else if (name.includes('under')) {
            baseData.underOdds = this.convertToDecimalOdds(selection.price || selection.odds);
          }
        }
      }
    }

    return baseData;
  }

  // Convert American odds to decimal odds
  private convertToDecimalOdds(price: number): number {
    if (price > 0) {
      return Math.round((price / 100 + 1) * 100) / 100;
    } else {
      return Math.round((100 / Math.abs(price) + 1) * 100) / 100;
    }
  }

  // Normalize sport names
  private normalizeSport(sport: string): string {
    const normalized = (sport || '').toLowerCase();
    
    if (normalized.includes('soccer') || normalized.includes('football')) {
      return 'soccer';
    } else if (normalized.includes('basketball')) {
      return 'basketball';
    } else if (normalized.includes('tennis')) {
      return 'tennis';
    } else if (normalized.includes('baseball')) {
      return 'baseball';
    } else if (normalized.includes('american football') || normalized.includes('nfl')) {
      return 'football';
    }
    
    return sport;
  }

  // Extract total points from selection name
  private extractTotalPoints(selectionName: string): number | null {
    const match = selectionName.match(/(\d+(?:\.\d+)?)/);
    return match ? parseFloat(match[1]) : null;
  }

  // Convert Fanduel data to our trading format
  convertToTradingFormat(marketData: FanduelMarketData): any {
    return {
      eventId: `fanduel_${marketData.eventId}`,
      sportType: marketData.sport,
      homeTeam: marketData.homeTeam,
      awayTeam: marketData.awayTeam,
      homeOdds: marketData.homeOdds,
      awayOdds: marketData.awayOdds,
      ...(marketData.drawOdds && { drawOdds: marketData.drawOdds }),
      ...(marketData.totalPoints && { totalPoints: marketData.totalPoints }),
      ...(marketData.overOdds && { overOdds: marketData.overOdds }),
      ...(marketData.underOdds && { underOdds: marketData.underOdds }),
      timestamp: marketData.timestamp,
      volume: marketData.volume,
      liquidity: marketData.liquidity,
      source: 'fanduel',
      region: this.region
    };
  }

  // Get available sports
  async getAvailableSports(): Promise<string[]> {
    try {
      const headers: Record<string, string> = {
        'User-Agent': this.userAgent,
        'Accept': 'application/json'
      };

      if (this.apiKey) {
        headers['Authorization'] = `Bearer ${this.apiKey}`;
      }

      const response = await fetch(`${this.baseUrl}/sports`, {
        headers,
      });
      
      // Add timeout handling
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Request timeout')), 5000);
      });
      
      const result = await Promise.race([response, timeoutPromise]) as Response;

      if (result.ok) {
        const data = await result.json();
        return (data.sports || []).map((s: any) => this.normalizeSport(s.name || s.sport));
      }
      
      return ['soccer', 'basketball', 'tennis', 'baseball', 'football'];
    } catch (error) {
      console.error('Failed to fetch available sports:', error);
      return ['soccer', 'basketball', 'tennis', 'baseball', 'football'];
    }
  }

  // Health check for Fanduel API
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
      console.error('Fanduel health check failed:', error);
      return false;
    }
  }

  // Get region-specific configuration
  getRegion(): string {
    return this.region;
  }

  // Set region (for cross-region support)
  setRegion(region: string): void {
    this.region = region;
    this.baseUrl = region === 'uk' ? 'https://api.fanduel.co.uk' : 'https://api.fanduel.com';
    this.userAgent = this.getUserAgent();
  }
}

// Create instances for different regions
export const fanduelUSClient = new FanduelClient(undefined, 'us');
export const fanduelUKClient = new FanduelClient(undefined, 'uk');
