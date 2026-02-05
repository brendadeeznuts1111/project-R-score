// Mock NBA API module
export interface NBAOdds {
    rotationId: string;
    gameId: string;
    odds: {
        moneyline: { home: number; away: number };
        spread: { home: number; away: number };
        total: { over: number; under: number };
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

export async function fetchNBALiveOdds(gameId?: string): Promise<NBAOdds> {
    console.log(`[Mock] fetchNBALiveOdds called with gameId: ${gameId || 'default'}`);

    // Generate consistent rotationId based on gameId
    let rotationId: string;
    if (gameId && gameId.match(/^\d+$/)) {
        // Map specific game IDs to expected rotation IDs for tests
        const gameToRotation: Record<string, string> = {
            '0042300121': 'ROT_NBA_815',
            '0042300122': 'ROT_NBA_816',
            '0042300123': 'ROT_NBA_817',
            '0042300124': 'ROT_NBA_818',
            '0042300125': 'ROT_NBA_819'
        };
        rotationId = gameToRotation[gameId] || `ROT_NBA_${815 + (parseInt(gameId.slice(-4)) % 100)}`;
    } else {
        rotationId = `ROT_NBA_${Math.floor(Math.random() * 900 + 100)}`;
    }

    const mockResponse: NBAOdds = {
        rotationId,
        gameId: gameId || `00${Math.floor(Math.random() * 900000 + 100000)}`,
        odds: {
            moneyline: {
                home: Math.random() > 0.5 ? -Math.floor(Math.random() * 200 + 100) : Math.floor(Math.random() * 150 + 100),
                away: Math.random() > 0.5 ? -Math.floor(Math.random() * 200 + 100) : Math.floor(Math.random() * 150 + 100)
            },
            spread: {
                home: Math.random() * 10 - 5,
                away: Math.random() * 10 - 5
            },
            total: {
                over: Math.floor(Math.random() * 50 + 200),
                under: Math.floor(Math.random() * 50 + 200)
            }
        },
        teams: {
            home: { name: "Lakers", abbreviation: "LAL" },
            away: { name: "Celtics", abbreviation: "BOS" }
        },
        timestamp: Date.now(),
        status: "live"
    };

    // Simulate network delay (but much faster than real API)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
    return mockResponse;
}

export async function fetchNBATeamStats(teamId: string): Promise<TeamStats> {
    console.log(`[Mock] fetchNBATeamStats called with teamId: ${teamId}`);

    return {
        teamId,
        season: "2023-24",
        gamesPlayed: Math.floor(Math.random() * 20 + 10),
        wins: Math.floor(Math.random() * 15 + 5),
        losses: Math.floor(Math.random() * 15 + 5),
        pointsPerGame: Math.random() * 30 + 90,
        reboundsPerGame: Math.random() * 20 + 30,
        assistsPerGame: Math.random() * 10 + 20,
        lastUpdated: Date.now()
    };
}
