# T3-Lattice Sports Betting Libraries
# Domain-specific utilities and algorithms for sports analytics

import { StatisticalAnalyzer, TimeSeriesAnalyzer, SportsAnalytics } from "../analytics/statistics.ts";

// Sports Data Normalizers
export class SportsDataNormalizer {
  static normalizeOdds(odds: number, fromFormat: OddsFormat, toFormat: OddsFormat): number {
    // Convert to decimal first
    let decimalOdds: number;

    switch (fromFormat) {
      case 'decimal':
        decimalOdds = odds;
        break;
      case 'american':
        decimalOdds = odds > 0 ? (odds / 100) + 1 : (100 / Math.abs(odds)) + 1;
        break;
      case 'fractional':
        const [num, den] = odds.toString().split('/').map(Number);
        decimalOdds = (num / den) + 1;
        break;
      case 'hongkong':
        decimalOdds = odds + 1;
        break;
      case 'indonesian':
        decimalOdds = odds > 0 ? odds + 1 : (1 / Math.abs(odds)) + 1;
        break;
      default:
        throw new Error(`Unsupported odds format: ${fromFormat}`);
    }

    // Convert from decimal to target format
    switch (toFormat) {
      case 'decimal':
        return decimalOdds;
      case 'american':
        return decimalOdds >= 2 ? (decimalOdds - 1) * 100 : -100 / (decimalOdds - 1);
      case 'fractional':
        const fraction = decimalOdds - 1;
        return fraction;
      case 'hongkong':
        return decimalOdds - 1;
      case 'indonesian':
        return decimalOdds >= 2 ? decimalOdds - 1 : -1 / (decimalOdds - 1);
      default:
        throw new Error(`Unsupported target format: ${toFormat}`);
    }
  }

  static normalizeTeamNames(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^\w\s]/g, '') // Remove special characters
      .replace(/\s+/g, ' ')   // Normalize spaces
      .trim();
  }

  static normalizeGameTime(timeStr: string): Date {
    // Handle various time formats (EST, UTC, etc.)
    // This is a simplified implementation
    return new Date(timeStr);
  }

  static calculateGameImportance(league: string, teams: string[]): number {
    // Calculate game importance based on league and team rankings
    const leagueMultipliers: Record<string, number> = {
      'NBA': 1.0,
      'NFL': 1.2,
      'MLB': 0.8,
      'NHL': 0.9,
      'SOCCER_PREMIER_LEAGUE': 1.1,
      'SOCCER_CHAMPIONS_LEAGUE': 1.3
    };

    const baseImportance = leagueMultipliers[league] || 1.0;

    // Add team ranking factor (simplified)
    const topTeams = ['LAL', 'GSW', 'BOS', 'MIA', 'LIVERPOOL', 'MANCHESTER_CITY'];
    const teamFactor = teams.some(team =>
      topTeams.some(topTeam => team.toUpperCase().includes(topTeam))
    ) ? 1.2 : 1.0;

    return baseImportance * teamFactor;
  }
}

// Line Movement Analyzer
export class LineMovementAnalyzer {
  private historicalLines: Map<string, LineMovementData[]> = new Map();

  recordLineMovement(gameId: string, timestamp: number, line: number, odds: number): void {
    if (!this.historicalLines.has(gameId)) {
      this.historicalLines.set(gameId, []);
    }

    this.historicalLines.get(gameId)!.push({
      timestamp,
      line,
      odds,
      impliedProb: SportsAnalytics.calculateImpliedProbability(odds)
    });
  }

  analyzeLineMovement(gameId: string): LineMovementAnalysis {
    const movements = this.historicalLines.get(gameId) || [];
    if (movements.length < 2) {
      return {
        gameId,
        totalMovement: 0,
        direction: 'stable',
        volatility: 0,
        steamMoves: [],
        reverseLineMovement: false,
        confidence: 0
      };
    }

    // Calculate line changes
    const lineChanges = [];
    for (let i = 1; i < movements.length; i++) {
      lineChanges.push(movements[i].line - movements[i-1].line);
    }

    const totalMovement = Math.abs(lineChanges.reduce((sum, change) => sum + change, 0));
    const avgMovement = StatisticalAnalyzer.mean(lineChanges.map(Math.abs));

    // Determine movement direction
    const netMovement = lineChanges.reduce((sum, change) => sum + change, 0);
    let direction: LineDirection = 'stable';
    if (Math.abs(netMovement) > totalMovement * 0.3) {
      direction = netMovement > 0 ? 'up' : 'down';
    }

    // Detect steam moves (rapid line movement)
    const steamMoves = this.detectSteamMoves(movements);

    // Check for reverse line movement (RLM)
    const reverseLineMovement = this.detectReverseLineMovement(movements);

    // Calculate volatility
    const volatility = StatisticalAnalyzer.std(lineChanges);

    return {
      gameId,
      totalMovement,
      direction,
      volatility,
      steamMoves,
      reverseLineMovement,
      confidence: this.calculateConfidence(movements, steamMoves, reverseLineMovement)
    };
  }

  private detectSteamMoves(movements: LineMovementData[]): SteamMove[] {
    const steamMoves: SteamMove[] = [];

    for (let i = 2; i < movements.length; i++) {
      const recent = movements.slice(i - 2, i + 1);
      const changes = [];

      for (let j = 1; j < recent.length; j++) {
        changes.push(Math.abs(recent[j].line - recent[j-1].line));
      }

      const avgChange = StatisticalAnalyzer.mean(changes);
      const maxChange = Math.max(...changes);

      // Steam move criteria: large movement in short time
      if (maxChange > avgChange * 2 && maxChange > 0.5) {
        steamMoves.push({
          timestamp: recent[recent.length - 1].timestamp,
          lineChange: maxChange,
          direction: recent[recent.length - 1].line > recent[0].line ? 'up' : 'down',
          confidence: Math.min(1, maxChange / 2)
        });
      }
    }

    return steamMoves;
  }

  private detectReverseLineMovement(movements: LineMovementData[]): boolean {
    if (movements.length < 4) return false;

    // RLM occurs when line moves significantly in one direction then reverses
    const firstHalf = movements.slice(0, Math.floor(movements.length / 2));
    const secondHalf = movements.slice(Math.floor(movements.length / 2));

    const firstTrend = this.calculateTrend(firstHalf);
    const secondTrend = this.calculateTrend(secondHalf);

    // Opposite trends indicate RLM
    return (firstTrend > 0.1 && secondTrend < -0.1) || (firstTrend < -0.1 && secondTrend > 0.1);
  }

  private calculateTrend(movements: LineMovementData[]): number {
    if (movements.length < 2) return 0;

    const firstLine = movements[0].line;
    const lastLine = movements[movements.length - 1].line;

    return (lastLine - firstLine) / movements.length;
  }

  private calculateConfidence(
    movements: LineMovementData[],
    steamMoves: SteamMove[],
    reverseLineMovement: boolean
  ): number {
    let confidence = 0.5; // Base confidence

    // More data points increase confidence
    confidence += Math.min(0.2, movements.length / 100);

    // Steam moves indicate sharp market reactions
    confidence += Math.min(0.2, steamMoves.length * 0.1);

    // RLM is a strong signal
    if (reverseLineMovement) confidence += 0.2;

    // Recent activity increases confidence
    const recent = movements.slice(-10);
    if (recent.length > 0) {
      const recentVolatility = StatisticalAnalyzer.std(
        recent.slice(1).map((m, i) => m.line - recent[i].line)
      );
      confidence += Math.min(0.1, recentVolatility * 2);
    }

    return Math.min(1, confidence);
  }
}

// Public Betting Pressure Analyzer
export class PublicBettingAnalyzer {
  private publicMoneyIndicators: Map<string, PublicMoneyData> = new Map();

  analyzePublicPressure(gameId: string, handleData: HandleData[]): PublicPressureAnalysis {
    const totalHandle = handleData.reduce((sum, data) => sum + data.handle, 0);
    const totalSquare = handleData.reduce((sum, data) => sum + data.square, 0);

    // Calculate percentages
    const sides = handleData.map(data => ({
      side: data.side,
      handlePercent: data.handle / totalHandle,
      squarePercent: data.square / totalSquare,
      ratio: data.square > 0 ? data.handle / data.square : 0
    }));

    // Identify public favorite (highest handle)
    const publicFavorite = sides.reduce((max, side) =>
      side.handlePercent > max.handlePercent ? side : max
    );

    // Calculate public money edge
    const sharpMoneyEdge = this.calculateSharpMoneyEdge(sides);

    // Detect contrarian opportunities
    const contrarianOpportunities = sides.filter(side =>
      side.handlePercent > 0.6 && side.squarePercent < 0.4
    );

    return {
      gameId,
      totalHandle,
      publicFavorite: publicFavorite.side,
      publicConfidence: publicFavorite.handlePercent,
      sharpMoneyEdge,
      contrarianOpportunities: contrarianOpportunities.map(opp => opp.side),
      sides,
      analysis: this.generateAnalysis(sides, sharpMoneyEdge)
    };
  }

  private calculateSharpMoneyEdge(sides: any[]): number {
    // Sharp money often bets against heavy public money
    const publicSide = sides.reduce((max, side) =>
      side.handlePercent > max.handlePercent ? side : max
    );

    const sharpSide = sides.find(side => side !== publicSide);

    if (!sharpSide) return 0;

    // Edge is the difference in handle vs square ratio
    return sharpSide.ratio - publicSide.ratio;
  }

  private generateAnalysis(sides: any[], sharpMoneyEdge: number): string {
    const publicSide = sides.reduce((max, side) =>
      side.handlePercent > max.handlePercent ? side : max
    );

    let analysis = `Public money heavily favors ${publicSide.side} (${(publicSide.handlePercent * 100).toFixed(1)}% of handle). `;

    if (sharpMoneyEdge > 0.2) {
      analysis += `Strong sharp money edge detected (${sharpMoneyEdge.toFixed(2)}). Consider fading public favorite.`;
    } else if (sharpMoneyEdge < -0.2) {
      analysis += `Public sentiment aligns with sharp money. Confidence in ${publicSide.side} is high.`;
    } else {
      analysis += `Mixed signals between public and sharp money. Wait for more data.`;
    }

    return analysis;
  }

  trackPublicSentiment(gameId: string, sentimentData: SentimentData): void {
    // Track social media and news sentiment
    const existing = this.publicMoneyIndicators.get(gameId) || {
      gameId,
      sentiment: [],
      lastUpdated: 0
    };

    existing.sentiment.push({
      timestamp: sentimentData.timestamp,
      source: sentimentData.source,
      sentiment: sentimentData.sentiment,
      volume: sentimentData.volume
    });

    existing.lastUpdated = Date.now();
    this.publicMoneyIndicators.set(gameId, existing);
  }
}

// Injury and Suspension Impact Analyzer
export class InjuryImpactAnalyzer {
  private injuryDatabase: Map<string, InjuryRecord[]> = new Map();

  recordInjury(team: string, player: string, injury: InjuryData): void {
    if (!this.injuryDatabase.has(team)) {
      this.injuryDatabase.set(team, []);
    }

    this.injuryDatabase.get(team)!.push({
      player,
      ...injury,
      recordedAt: Date.now()
    });
  }

  calculateInjuryImpact(team: string, opponent: string, sport: string): InjuryImpactAnalysis {
    const teamInjuries = this.injuryDatabase.get(team) || [];
    const activeInjuries = teamInjuries.filter(injury =>
      injury.status === 'out' || injury.status === 'questionable'
    );

    let totalImpact = 0;
    const playerImpacts: PlayerImpact[] = [];

    for (const injury of activeInjuries) {
      const impact = this.calculatePlayerImpact(injury, sport);
      totalImpact += impact;
      playerImpacts.push({
        player: injury.player,
        position: injury.position,
        impact,
        reason: injury.description
      });
    }

    // Calculate game context impact
    const matchupImpact = this.calculateMatchupImpact(team, opponent, activeInjuries);

    return {
      team,
      opponent,
      totalImpact,
      playerImpacts,
      matchupImpact,
      confidence: Math.min(1, activeInjuries.length * 0.3 + 0.4),
      recommendation: this.generateInjuryRecommendation(totalImpact, matchupImpact)
    };
  }

  private calculatePlayerImpact(injury: InjuryRecord, sport: string): number {
    const positionMultipliers: Record<string, Record<string, number>> = {
      'NBA': {
        'PG': 1.2, 'SG': 1.1, 'SF': 1.0, 'PF': 1.1, 'C': 1.3,
        'star': 1.5, 'role': 0.8, 'bench': 0.3
      },
      'NFL': {
        'QB': 2.0, 'RB': 1.3, 'WR': 1.1, 'TE': 1.0, 'OL': 1.2, 'DL': 1.1, 'LB': 1.0, 'DB': 0.9
      }
    };

    const sportMultipliers = positionMultipliers[sport] || {};
    const positionMult = sportMultipliers[injury.position] || 1.0;
    const statusMult = injury.status === 'out' ? 1.0 : injury.status === 'questionable' ? 0.7 : 0.3;

    return positionMult * statusMult;
  }

  private calculateMatchupImpact(team: string, opponent: string, injuries: InjuryRecord[]): number {
    // Simplified matchup calculation
    // In a real implementation, this would consider defensive matchups
    return injuries.length * 0.1; // 10% impact per injury
  }

  private generateInjuryRecommendation(totalImpact: number, matchupImpact: number): string {
    const combinedImpact = totalImpact + matchupImpact;

    if (combinedImpact > 1.5) {
      return "Strong avoid - injuries significantly impact team performance";
    } else if (combinedImpact > 0.8) {
      return "Caution advised - monitor injury reports closely";
    } else if (combinedImpact > 0.3) {
      return "Minor concern - injuries present but not decisive";
    } else {
      return "No significant injury concerns";
    }
  }
}

// Weather Impact Analyzer (for outdoor sports)
export class WeatherImpactAnalyzer {
  private weatherDatabase: Map<string, WeatherData[]> = new Map();

  recordWeather(gameId: string, weather: WeatherData): void {
    if (!this.weatherDatabase.has(gameId)) {
      this.weatherDatabase.set(gameId, []);
    }

    this.weatherDatabase.get(gameId)!.push(weather);
  }

  calculateWeatherImpact(gameId: string, sport: string, teams: string[]): WeatherImpactAnalysis {
    const weatherHistory = this.weatherDatabase.get(gameId) || [];
    if (weatherHistory.length === 0) {
      return {
        gameId,
        impact: 0,
        affectedTeams: [],
        confidence: 0,
        analysis: "No weather data available"
      };
    }

    const currentWeather = weatherHistory[weatherHistory.length - 1];
    const sportImpacts = this.getSportWeatherImpacts(sport);

    let totalImpact = 0;
    const affectedTeams: string[] = [];

    // Calculate impact for each weather factor
    for (const [factor, value] of Object.entries(currentWeather)) {
      if (factor in sportImpacts) {
        const impact = sportImpacts[factor as keyof typeof sportImpacts](value);
        totalImpact += impact;

        if (impact > 0.2) {
          affectedTeams.push(...teams); // Both teams affected
        }
      }
    }

    return {
      gameId,
      impact: Math.min(1, totalImpact),
      affectedTeams: [...new Set(affectedTeams)],
      confidence: Math.min(1, weatherHistory.length * 0.2),
      analysis: this.generateWeatherAnalysis(currentWeather, totalImpact, sport)
    };
  }

  private getSportWeatherImpacts(sport: string): Record<string, (value: any) => number> {
    const impacts: Record<string, Record<string, (value: any) => number>> = {
      'NFL': {
        wind_speed: (speed: number) => speed > 15 ? Math.min(1, (speed - 15) / 20) : 0,
        temperature: (temp: number) => temp < 40 ? Math.max(0, (40 - temp) / 30) : 0,
        precipitation: (precip: number) => precip > 0.1 ? Math.min(1, precip * 5) : 0
      },
      'MLB': {
        wind_speed: (speed: number) => speed > 10 ? Math.min(1, (speed - 10) / 15) : 0,
        temperature: (temp: number) => temp < 60 || temp > 85 ? 0.3 : 0,
        precipitation: (precip: number) => precip > 0 ? 0.8 : 0
      },
      'SOCCER': {
        wind_speed: (speed: number) => speed > 20 ? Math.min(1, (speed - 20) / 20) : 0,
        temperature: (temp: number) => temp < 45 || temp > 80 ? 0.4 : 0,
        precipitation: (precip: number) => precip > 0.05 ? Math.min(1, precip * 10) : 0
      }
    };

    return impacts[sport] || {};
  }

  private generateWeatherAnalysis(weather: WeatherData, impact: number, sport: string): string {
    if (impact < 0.1) return "Weather conditions favorable for normal play";

    let analysis = `Weather impact detected (${(impact * 100).toFixed(0)}%): `;

    if (weather.wind_speed > 15) analysis += `High winds (${weather.wind_speed} mph) `;
    if (weather.temperature < 50) analysis += `Cold temperatures (${weather.temperature}°F) `;
    if (weather.precipitation > 0.1) analysis += `Precipitation (${weather.precipitation}" reported) `;

    analysis += `- ${sport} performance may be affected`;

    return analysis;
  }
}

// Type definitions
type OddsFormat = 'decimal' | 'american' | 'fractional' | 'hongkong' | 'indonesian';
type LineDirection = 'up' | 'down' | 'stable';

interface LineMovementData {
  timestamp: number;
  line: number;
  odds: number;
  impliedProb: number;
}

interface LineMovementAnalysis {
  gameId: string;
  totalMovement: number;
  direction: LineDirection;
  volatility: number;
  steamMoves: SteamMove[];
  reverseLineMovement: boolean;
  confidence: number;
}

interface SteamMove {
  timestamp: number;
  lineChange: number;
  direction: 'up' | 'down';
  confidence: number;
}

interface HandleData {
  side: string;
  handle: number;
  square: number;
}

interface PublicPressureAnalysis {
  gameId: string;
  totalHandle: number;
  publicFavorite: string;
  publicConfidence: number;
  sharpMoneyEdge: number;
  contrarianOpportunities: string[];
  sides: any[];
  analysis: string;
}

interface SentimentData {
  timestamp: number;
  source: string;
  sentiment: number;
  volume: number;
}

interface InjuryData {
  description: string;
  status: 'out' | 'questionable' | 'doubtful' | 'probable';
  position: string;
  expectedReturn?: Date;
}

interface InjuryRecord extends InjuryData {
  player: string;
  recordedAt: number;
}

interface InjuryImpactAnalysis {
  team: string;
  opponent: string;
  totalImpact: number;
  playerImpacts: PlayerImpact[];
  matchupImpact: number;
  confidence: number;
  recommendation: string;
}

interface PlayerImpact {
  player: string;
  position: string;
  impact: number;
  reason: string;
}

interface WeatherData {
  temperature: number;
  wind_speed: number;
  precipitation: number;
  humidity: number;
  timestamp: number;
}

interface WeatherImpactAnalysis {
  gameId: string;
  impact: number;
  affectedTeams: string[];
  confidence: number;
  analysis: string;
}