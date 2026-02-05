// Type declarations for @citadel/nba-api mock module
declare module '@citadel/nba-api' {
    export interface NBAOdds {
        rotationId: string;
        gameId: string;
        odds: {
            moneyline: {
                home: number;
                away: number;
            };
            spread: {
                home: number;
                away: number;
            };
            total: {
                over: number;
                under: number;
            };
        };
        teams: {
            home: { name: string; abbreviation: string };
            away: { name: string; abbreviation: string };
        };
        timestamp: number;
        status: string;
    }

    export interface TeamStats {
        teamId: string;
        season: string;
        gamesPlayed: number;
        wins: number;
        losses: number;
        pointsPerGame: number;
        reboundsPerGame: number;
        assistsPerGame: number;
        lastUpdated: number;
    }

    export function fetchNBALiveOdds(gameId?: string): Promise<NBAOdds>;
    export function fetchNBATeamStats(teamId: string): Promise<TeamStats>;
}
