// API Integration - Types

export interface ApiConfig {
  sportradar: {
    url: string;
    apiKey: string;
    sports: string[];
  };
  odds: {
    url: string;
    apiKey: string;
  };
}

export interface GameEvent {
  id: string;
  sport: "NBA" | "WNBA" | string;
  teams: [string, string];
  timestamp: number;
  status: "scheduled" | "live" | "final" | "postponed";
  score?: [number, number];
}

export interface OddsData {
  gameId: string;
  market: string;
  homeOdds: number;
  awayOdds: number;
  spread?: number;
  overUnder?: number;
  timestamp: number;
}

export interface ConnectionStatus {
  sportradar: "connected" | "disconnected" | "error";
  odds: "connected" | "disconnected" | "error";
  lastUpdate: number;
}

export type EventHandler<T> = (data: T) => void;
