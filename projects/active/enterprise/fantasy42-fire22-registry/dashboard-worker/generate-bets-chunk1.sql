-- Generate Betting Data - Chunk 1 
-- Creates bets for first 5,000 players

INSERT OR IGNORE INTO bets (
    bet_id, player_id, agent_id, game_id, bet_type, bet_category,
    selection, odds, stake, to_win, potential_payout, status,
    placed_at, accepted_at, settled_at
)
SELECT 
    'BET_' || p.customer_id || '_' || seq || '_' || (ABS(RANDOM() % 1000000)) as bet_id,
    p.player_id,
    p.agent_id,
    (CASE (seq % 4)
        WHEN 0 THEN 'NFL_2024_001'
        WHEN 1 THEN 'NBA_2024_001' 
        WHEN 2 THEN 'NFL_2024_002'
        ELSE 'NBA_2024_002'
    END) as game_id,
    (CASE (seq % 6)
        WHEN 0 THEN 'moneyline'
        WHEN 1 THEN 'spread'
        WHEN 2 THEN 'total'
        WHEN 3 THEN 'prop'
        WHEN 4 THEN 'parlay'
        ELSE 'moneyline'
    END) as bet_type,
    'pre_game' as bet_category,
    (CASE (seq % 8)
        WHEN 0 THEN 'Home Team -3.5'
        WHEN 1 THEN 'Away Team +3.5'
        WHEN 2 THEN 'Over 45.5'
        WHEN 3 THEN 'Under 45.5'
        WHEN 4 THEN 'Home Team Moneyline'
        WHEN 5 THEN 'Away Team Moneyline'
        WHEN 6 THEN 'Player Props Over'
        ELSE 'Player Props Under'
    END) as selection,
    ROUND(-110 + (RANDOM() * 40 - 20), 0) as odds,
    ROUND((RANDOM() % 2000 + 100) * (
        CASE 
            WHEN p.account_type = 'vip' THEN 2.0
            WHEN p.account_type = 'premium' THEN 1.5
            ELSE 1.0
        END
    ), 2) as stake,
    ROUND((RANDOM() % 2000 + 100) * (
        CASE 
            WHEN p.account_type = 'vip' THEN 2.0
            WHEN p.account_type = 'premium' THEN 1.5
            ELSE 1.0
        END
    ) * 0.91, 2) as to_win,
    ROUND((RANDOM() % 2000 + 100) * (
        CASE 
            WHEN p.account_type = 'vip' THEN 2.0
            WHEN p.account_type = 'premium' THEN 1.5
            ELSE 1.0
        END
    ) * 1.91, 2) as potential_payout,
    (CASE 
        WHEN seq % 15 < 6 THEN 'won'
        WHEN seq % 15 < 12 THEN 'lost'
        WHEN seq % 15 < 14 THEN 'pending'
        ELSE 'pushed'
    END) as status,
    datetime('now', '-' || (seq * 180 + ABS(RANDOM() % 4320)) || ' minutes') as placed_at,
    datetime('now', '-' || (seq * 180 + ABS(RANDOM() % 4320) - 5) || ' minutes') as accepted_at,
    CASE 
        WHEN seq % 15 < 12 THEN datetime('now', '-' || (seq * 120 + ABS(RANDOM() % 2880)) || ' minutes')
        ELSE NULL
    END as settled_at
FROM players p
CROSS JOIN (
    SELECT 1 as seq UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 
) seqs
WHERE 
    p.status = 'active' 
    AND (CAST(substr(p.customer_id, -2) AS INTEGER) % 5) != 4  -- ~80% of players
    AND CAST(substr(p.customer_id, -4) AS INTEGER) < 1250  -- First ~5,000 players
    AND seq <= (CASE 
        WHEN p.account_type = 'vip' THEN 8
        WHEN p.account_type = 'premium' THEN 6
        ELSE 4
    END);