-- Generate Transactions and Bets - Chunk 1 (Deposits only)
-- This creates deposits for approximately 60% of players

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
) seqs
WHERE 
    p.status = 'active' 
    AND (CAST(substr(p.customer_id, -2) AS INTEGER) % 5) != 0  -- ~60% of players
    AND seq <= (CASE 
        WHEN p.account_type = 'vip' THEN 5
        WHEN p.account_type = 'premium' THEN 3  
        ELSE 2
    END);