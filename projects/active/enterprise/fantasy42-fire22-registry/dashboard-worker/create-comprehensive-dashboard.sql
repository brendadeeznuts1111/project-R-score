-- Add simple sample bets to demonstrate the system
-- Insert a few sample bets to show the betting functionality

INSERT OR IGNORE INTO bets (
    bet_id, player_id, agent_id, game_id, bet_type, bet_category,
    selection, odds, stake, to_win, potential_payout, status,
    placed_at, accepted_at, settled_at
) 
SELECT 
    'BET_SAMPLE_' || CAST((ROWID % 1000) AS TEXT) as bet_id,
    player_id,
    agent_id,
    'NFL_2024_001' as game_id,
    'moneyline' as bet_type,
    'pre_game' as bet_category,
    'Home Team Moneyline' as selection,
    -110 as odds,
    ROUND(credit_limit * 0.1, 2) as stake,
    ROUND(credit_limit * 0.09, 2) as to_win,
    ROUND(credit_limit * 0.19, 2) as potential_payout,
    'won' as status,
    datetime('now', '-2 hours') as placed_at,
    datetime('now', '-2 hours', '+5 minutes') as accepted_at,
    datetime('now', '-1 hour') as settled_at
FROM players 
WHERE status = 'active' AND ROWID <= 100;

-- Insert bet credit transactions for sample winning bets
INSERT OR IGNORE INTO transactions (
    transaction_id, player_id, agent_id, transaction_type, category,
    amount, net_amount, balance_before, balance_after, status,
    bet_id, description, requested_at, completed_at, created_by
)
SELECT 
    'TXN_WIN_' || CAST((ROWID % 1000) AS TEXT) as transaction_id,
    player_id,
    agent_id,
    'bet_credit' as transaction_type,
    'betting' as category,
    potential_payout,
    potential_payout,
    0.00 as balance_before,
    potential_payout as balance_after,
    'completed' as status,
    bet_id,
    'Winning bet payout for ' || selection as description,
    settled_at,
    settled_at,
    'system' as created_by
FROM bets 
WHERE bet_id LIKE 'BET_SAMPLE_%' AND status = 'won';

-- Update bet commission information
UPDATE bets SET 
    actual_payout = potential_payout,
    commission_rate = 0.025,
    commission_amount = ROUND(stake * 0.025, 2)
WHERE bet_id LIKE 'BET_SAMPLE_%' AND status = 'won';