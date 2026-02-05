-- Generate Comprehensive Transaction and Betting Data
-- Creates realistic transaction history and betting records for all players

-- ====================
-- TRANSACTION GENERATION
-- ====================

-- Generate deposits for active players (approximately 60% of players make deposits)
INSERT OR IGNORE INTO transactions (
    transaction_id, player_id, agent_id, transaction_type, category,
    amount, net_amount, balance_before, balance_after, status,
    payment_method, description, requested_at, completed_at, created_by
)
SELECT 
    'TXN_DEP_' || p.customer_id || '_' || seq as transaction_id,
    p.player_id,
    p.agent_id,
    'deposit' as transaction_type,
    'financial' as category,
    ROUND((RANDOM() % 10000 + 500) * (seq * 0.3 + 1), 2) as amount,
    ROUND((RANDOM() % 10000 + 500) * (seq * 0.3 + 1), 2) as net_amount,
    ROUND(RANDOM() * 1000, 2) as balance_before,
    ROUND(RANDOM() * 1000, 2) + ROUND((RANDOM() % 10000 + 500) * (seq * 0.3 + 1), 2) as balance_after,
    'completed' as status,
    (CASE (seq % 4)
        WHEN 0 THEN 'credit_card'
        WHEN 1 THEN 'bank_transfer'
        WHEN 2 THEN 'crypto'
        ELSE 'check'
    END) as payment_method,
    'Player deposit transaction' as description,
    datetime('now', '-' || (seq * 15 + ABS(RANDOM() % 1440)) || ' minutes') as requested_at,
    datetime('now', '-' || (seq * 15 + ABS(RANDOM() % 1440) - 60) || ' minutes') as completed_at,
    'player' as created_by
FROM players p
CROSS JOIN (
    SELECT 1 as seq UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
) seqs
WHERE 
    p.status = 'active' 
    AND (CAST(substr(p.customer_id, -2) AS INTEGER) % 5) != 0  -- ~60% of players
    AND seq <= (CASE 
        WHEN p.account_type = 'vip' THEN 10
        WHEN p.account_type = 'premium' THEN 7  
        ELSE 4
    END);

-- Generate withdrawal transactions (approximately 40% of depositors make withdrawals)
INSERT OR IGNORE INTO transactions (
    transaction_id, player_id, agent_id, transaction_type, category,
    amount, net_amount, balance_before, balance_after, status,
    payment_method, description, requested_at, completed_at, created_by
)
SELECT 
    'TXN_WD_' || p.customer_id || '_' || seq as transaction_id,
    p.player_id,
    p.agent_id,
    'withdrawal' as transaction_type,
    'financial' as category,
    ROUND((RANDOM() % 5000 + 200) * seq * 0.8, 2) as amount,
    ROUND((RANDOM() % 5000 + 200) * seq * 0.8 * 0.98, 2) as net_amount, -- 2% fee
    ROUND(RANDOM() * 5000 + 1000, 2) as balance_before,
    ROUND(RANDOM() * 5000 + 1000, 2) - ROUND((RANDOM() % 5000 + 200) * seq * 0.8, 2) as balance_after,
    (CASE (seq % 8)
        WHEN 0 THEN 'pending'
        WHEN 7 THEN 'failed'
        ELSE 'completed'
    END) as status,
    (CASE (seq % 3)
        WHEN 0 THEN 'bank_transfer'
        WHEN 1 THEN 'check'
        ELSE 'crypto'
    END) as payment_method,
    'Player withdrawal request' as description,
    datetime('now', '-' || (seq * 25 + ABS(RANDOM() % 2160)) || ' minutes') as requested_at,
    datetime('now', '-' || (seq * 25 + ABS(RANDOM() % 2160) - 90) || ' minutes') as completed_at,
    'player' as created_by
FROM players p
CROSS JOIN (
    SELECT 1 as seq UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5
) seqs
WHERE 
    p.status = 'active' 
    AND (CAST(substr(p.customer_id, -3) AS INTEGER) % 7) < 3  -- ~40% of players
    AND seq <= (CASE 
        WHEN p.account_type = 'vip' THEN 5
        WHEN p.account_type = 'premium' THEN 3  
        ELSE 2
    END);

-- ====================
-- BETTING DATA GENERATION
-- ====================

-- Generate bet transactions for active players (approximately 80% of players place bets)
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
    ROUND(-110 + (RANDOM() * 40 - 20), 0) as odds, -- Odds between -130 and -90
    ROUND((RANDOM() % 2000 + 100) * (
        CASE 
            WHEN p.account_type = 'vip' THEN 3.0
            WHEN p.account_type = 'premium' THEN 2.0
            ELSE 1.0
        END
    ), 2) as stake,
    ROUND((RANDOM() % 2000 + 100) * (
        CASE 
            WHEN p.account_type = 'vip' THEN 3.0
            WHEN p.account_type = 'premium' THEN 2.0
            ELSE 1.0
        END
    ) * 0.91, 2) as to_win, -- Approximately -110 odds
    ROUND((RANDOM() % 2000 + 100) * (
        CASE 
            WHEN p.account_type = 'vip' THEN 3.0
            WHEN p.account_type = 'premium' THEN 2.0
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
    UNION SELECT 6 UNION SELECT 7 UNION SELECT 8 UNION SELECT 9 UNION SELECT 10
    UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14 UNION SELECT 15
    UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20
) seqs
WHERE 
    p.status = 'active' 
    AND (CAST(substr(p.customer_id, -2) AS INTEGER) % 5) != 4  -- ~80% of players
    AND seq <= (CASE 
        WHEN p.account_type = 'vip' THEN 20
        WHEN p.account_type = 'premium' THEN 15  
        ELSE 8
    END);

-- Generate corresponding bet debit transactions
INSERT OR IGNORE INTO transactions (
    transaction_id, player_id, agent_id, transaction_type, category,
    amount, net_amount, balance_before, balance_after, status,
    bet_id, description, requested_at, completed_at, created_by
)
SELECT 
    'TXN_BD_' || substr(b.bet_id, 5) as transaction_id,
    b.player_id,
    b.agent_id,
    'bet_debit' as transaction_type,
    'betting' as category,
    b.stake,
    b.stake,
    ROUND(RANDOM() * 5000 + b.stake, 2) as balance_before,
    ROUND(RANDOM() * 5000, 2) as balance_after,
    'completed' as status,
    b.bet_id,
    'Bet stake deduction for ' || b.selection as description,
    b.placed_at,
    b.accepted_at,
    'system' as created_by
FROM bets b
WHERE b.bet_id IS NOT NULL;

-- Generate bet credit transactions for winning bets
INSERT OR IGNORE INTO transactions (
    transaction_id, player_id, agent_id, transaction_type, category,
    amount, net_amount, balance_before, balance_after, status,
    bet_id, description, requested_at, completed_at, created_by
)
SELECT 
    'TXN_BC_' || substr(b.bet_id, 5) as transaction_id,
    b.player_id,
    b.agent_id,
    'bet_credit' as transaction_type,
    'betting' as category,
    b.potential_payout,
    b.potential_payout,
    ROUND(RANDOM() * 3000, 2) as balance_before,
    ROUND(RANDOM() * 3000 + b.potential_payout, 2) as balance_after,
    'completed' as status,
    b.bet_id,
    'Winning bet payout for ' || b.selection as description,
    b.settled_at,
    b.settled_at,
    'system' as created_by
FROM bets b
WHERE b.status = 'won' AND b.settled_at IS NOT NULL;

-- Update bet payouts for winning bets
UPDATE bets SET 
    actual_payout = potential_payout,
    commission_rate = (
        CASE 
            WHEN stake < 500 THEN 0.02
            WHEN stake < 2000 THEN 0.025
            ELSE 0.03
        END
    )
WHERE status = 'won';

UPDATE bets SET 
    commission_amount = ROUND(stake * commission_rate, 2)
WHERE status = 'won';

-- ====================
-- DAILY STATISTICS GENERATION
-- ====================

-- Generate daily player statistics for the past 30 days
INSERT OR IGNORE INTO daily_player_stats (
    player_id, agent_id, stat_date,
    total_bets, total_stake, total_winnings, net_result,
    total_deposits, total_withdrawals, net_deposits,
    win_rate, avg_bet_size, end_of_day_balance
)
SELECT 
    p.player_id,
    p.agent_id,
    date('now', '-' || day_offset || ' days') as stat_date,
    COALESCE(bet_stats.bet_count, 0) as total_bets,
    COALESCE(bet_stats.total_stake, 0.00) as total_stake,
    COALESCE(bet_stats.total_winnings, 0.00) as total_winnings,
    COALESCE(bet_stats.total_winnings - bet_stats.total_stake, 0.00) as net_result,
    COALESCE(txn_stats.deposits, 0.00) as total_deposits,
    COALESCE(txn_stats.withdrawals, 0.00) as total_withdrawals,
    COALESCE(txn_stats.deposits - txn_stats.withdrawals, 0.00) as net_deposits,
    CASE 
        WHEN bet_stats.bet_count > 0 THEN ROUND(CAST(bet_stats.won_count AS FLOAT) / bet_stats.bet_count, 4)
        ELSE 0.0000
    END as win_rate,
    CASE 
        WHEN bet_stats.bet_count > 0 THEN ROUND(bet_stats.total_stake / bet_stats.bet_count, 2)
        ELSE 0.00
    END as avg_bet_size,
    ROUND(RANDOM() * p.credit_limit * 0.3, 2) as end_of_day_balance
FROM players p
CROSS JOIN (
    SELECT 0 as day_offset UNION SELECT 1 UNION SELECT 2 UNION SELECT 3 UNION SELECT 4 UNION SELECT 5 UNION SELECT 6 UNION SELECT 7
    UNION SELECT 8 UNION SELECT 9 UNION SELECT 10 UNION SELECT 11 UNION SELECT 12 UNION SELECT 13 UNION SELECT 14
    UNION SELECT 15 UNION SELECT 16 UNION SELECT 17 UNION SELECT 18 UNION SELECT 19 UNION SELECT 20 UNION SELECT 21
    UNION SELECT 22 UNION SELECT 23 UNION SELECT 24 UNION SELECT 25 UNION SELECT 26 UNION SELECT 27 UNION SELECT 28
    UNION SELECT 29
) days
LEFT JOIN (
    SELECT 
        b.player_id,
        date(b.placed_at) as bet_date,
        COUNT(*) as bet_count,
        SUM(b.stake) as total_stake,
        SUM(CASE WHEN b.status = 'won' THEN b.actual_payout ELSE 0 END) as total_winnings,
        SUM(CASE WHEN b.status = 'won' THEN 1 ELSE 0 END) as won_count
    FROM bets b
    WHERE b.placed_at >= date('now', '-30 days')
    GROUP BY b.player_id, date(b.placed_at)
) bet_stats ON p.player_id = bet_stats.player_id AND bet_stats.bet_date = date('now', '-' || day_offset || ' days')
LEFT JOIN (
    SELECT 
        t.player_id,
        date(t.completed_at) as txn_date,
        SUM(CASE WHEN t.transaction_type = 'deposit' THEN t.amount ELSE 0 END) as deposits,
        SUM(CASE WHEN t.transaction_type = 'withdrawal' THEN t.amount ELSE 0 END) as withdrawals
    FROM transactions t
    WHERE t.completed_at >= date('now', '-30 days') 
      AND t.status = 'completed'
      AND t.transaction_type IN ('deposit', 'withdrawal')
    GROUP BY t.player_id, date(t.completed_at)
) txn_stats ON p.player_id = txn_stats.player_id AND txn_stats.txn_date = date('now', '-' || day_offset || ' days')
WHERE p.status = 'active' AND (CAST(substr(p.customer_id, -3) AS INTEGER) % 10) < 7;  -- Generate stats for ~70% of players

-- ====================
-- DATA SUMMARY
-- ====================

-- This script generates:
-- 1. DEPOSITS: ~60% of active players, 1-10 deposits each (based on account type)
-- 2. WITHDRAWALS: ~40% of players, 1-5 withdrawals each  
-- 3. BETS: ~80% of active players, 1-20 bets each (based on account type)
-- 4. TRANSACTIONS: Corresponding debit/credit transactions for all bets
-- 5. DAILY STATS: 30 days of statistics for ~70% of players
--
-- Expected totals:
-- - Players: 20,000 total
-- - Transactions: ~200,000+ (deposits + withdrawals + bet transactions)
-- - Bets: ~150,000+ individual bets
-- - Daily Stats: ~420,000 statistical records (30 days × 14,000 players)
--
-- Total database records: ~800,000+