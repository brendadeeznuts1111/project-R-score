// Mock database module
export interface QueryResult<T = any> {
    rows: T[];
    rowCount: number;
}

// Store to simulate cache behavior
const cacheStore = new Map<string, any>();

export async function query<T = any>(
    sql: string,
    params?: any[]
): Promise<QueryResult<T>> {
    console.log(`[Mock] Database query: ${sql.substring(0, 50)}...`);

    if (sql.includes('SELECT') && sql.includes('odds')) {
        return {
            rows: [
                {
                    id: 1,
                    rotation_id: 'ROT_NBA_815',
                    home_team: 'Lakers',
                    away_team: 'Celtics',
                    home_odds: -150,
                    away_odds: 130,
                    created_at: new Date().toISOString()
                }
            ] as T[],
            rowCount: 1
        };
    }

    if (sql.includes('INSERT') && sql.includes('odds_cache')) {
        const id = Math.floor(Math.random() * 1000 + 1);
        const rotationId = params[0];
        const oddsData = params[1];
        // Store the data for later retrieval
        cacheStore.set(rotationId, { id, rotation_id: rotationId, odds_data: oddsData });
        return {
            rows: [{ id }] as T[],
            rowCount: 1
        };
    }

    if (sql.includes('SELECT') && sql.includes('odds_cache')) {
        const rotationId = params[0];
        const cached = cacheStore.get(rotationId);
        if (cached) {
            return {
                rows: [cached] as T[],
                rowCount: 1
            };
        }
        return { rows: [], rowCount: 0 };
    }

    if (sql.includes('INSERT')) {
        return {
            rows: [{ id: Math.floor(Math.random() * 1000 + 1) }] as T[],
            rowCount: 1
        };
    }

    return { rows: [], rowCount: 0 };
}

export async function transaction<T = any>(
    callback: (client: any) => Promise<T>
): Promise<T> {
    console.log('[Mock] Database transaction started');
    const mockClient = {
        query: async (sql: string, params?: any[]) => {
            console.log(`[Mock] Transaction query: ${sql.substring(0, 50)}...`);

            if (sql.includes('SELECT') && sql.includes('odds')) {
                return {
                    rows: [
                        {
                            id: 1,
                            rotation_id: 'ROT_NBA_815',
                            home_team: 'Lakers',
                            away_team: 'Celtics',
                            home_odds: -150,
                            away_odds: 130,
                            created_at: new Date().toISOString()
                        }
                    ],
                    rowCount: 1
                };
            }

            if (sql.includes('INSERT') && sql.includes('audit_log')) {
                return {
                    rows: [{ id: Math.floor(Math.random() * 1000 + 1) }],
                    rowCount: 1
                };
            }

            return { rows: [], rowCount: 0 };
        }
    };

    const result = await callback(mockClient);
    console.log('[Mock] Database transaction completed');
    return result;
}
