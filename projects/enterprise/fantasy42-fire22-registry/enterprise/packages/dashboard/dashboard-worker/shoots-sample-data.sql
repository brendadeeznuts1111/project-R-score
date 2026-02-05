-- Sample SHOOTS Agent Customer Data
-- Based on real Fire22 data you provided

-- Insert SHOOTS customers with real data patterns
INSERT INTO customers (
    customer_id, name, phone, agent_id, master_agent, 
    actual_balance, settle_figure, last_ticket, username, 
    password, last_verification, suspected_bot, created_at
) VALUES
-- High settlement customers ($10,000)
('BB2209', 'j Tran', '+1 (832) 287 77 93', 'SHOOTS', '/ CSCALVIN / CSMIYUKI / CSMARIANA / CSMARCUS / BLAKEPPH2', 
 0.76, 10000, '2025-05-25 21:27:26', 'BB2209', 'WOAH121', '2025-08-16 16:36:28', false, NOW() - INTERVAL '6 months'),

('BB2251', 'Santi', '(857) 383-1654', 'SHOOTS', '/ CSCALVIN / CSMIYUKI / CSMARIANA / CSMARCUS / BLAKEPPH2', 
 0, 10000, NULL, 'BB2251', 'SANTI', '2025-04-02 20:06:54', false, NOW() - INTERVAL '4 months'),

('BB2326', 'Lee Jones', '(713) 902-7055', 'SHOOTS', '/ CSCALVIN / CSMIYUKI / CSMARIANA / CSMARCUS / BLAKEPPH2', 
 0.44, 10000, '2025-08-08 07:32:47', 'BB2326', 'STEAM', '2025-08-25 16:46:59', false, NOW() - INTERVAL '3 months'),

-- Low settlement customer ($200)
('BB2147', 'Taj', '', 'SHOOTS', '/ CSCALVIN / CSMIYUKI / CSMARIANA / CSMARCUS / BLAKEPPH2', 
 0.88, 200, '2024-09-29 21:21:47', 'BB2147', 'FILE123', '2024-09-30 00:47:29', false, NOW() - INTERVAL '8 months'),

-- Zero settlement customers ($0) - including negative balances
('BB2155', 'Chicago', '(312) 718-5278', 'SHOOTS', '/ CSCALVIN / CSMIYUKI / CSMARIANA / CSMARCUS / BLAKEPPH2', 
 -1449.51, 0, '2024-06-07 23:23:37', 'BB2155', 'CRAFT', '2024-06-07 23:57:04', false, NOW() - INTERVAL '10 months'),

('BB2322', 'Roberty Gypsy', '(832) 829-9200', 'SHOOTS', '/ CSCALVIN / CSMIYUKI / CSMARIANA / CSMARCUS / BLAKEPPH2', 
 -1097.20, 0, '2025-08-25 18:14:13', 'BB2322', 'ROMA', '2025-08-25 20:26:32', false, NOW() - INTERVAL '2 months'),

('BB2198', 'ever', '(713) 498-7292', 'SHOOTS', '/ CSCALVIN / CSMIYUKI / CSMARIANA / CSMARCUS / BLAKEPPH2', 
 0, 0, '2025-03-08 22:08:38', 'BB2198', 'BAGELB', '2025-03-09 00:12:34', false, NOW() - INTERVAL '5 months'),

('BB2299', 'TJJ', '(832) 366-4517', 'SHOOTS', '/ CSCALVIN / CSMIYUKI / CSMARIANA / CSMARCUS / BLAKEPPH2', 
 0.45, 0, '2025-04-06 20:35:37', 'BB2299', 'FRAMED', '2025-04-09 23:41:18', false, NOW() - INTERVAL '4 months'),

('BB2307', 'Treetop', '(281) 755-0293', 'SHOOTS', '/ CSCALVIN / CSMIYUKI / CSMARIANA / CSMARCUS / BLAKEPPH2', 
 0, 0, '2024-11-03 17:46:51', 'BB2307', 'EAST', '2025-06-06 20:17:09', false, NOW() - INTERVAL '7 months'),

('BB2321', 'Nick Waters', '(281) 627-1008', 'SHOOTS', '/ CSCALVIN / CSMIYUKI / CSMARIANA / CSMARCUS / BLAKEPPH2', 
 0, 0, '2024-11-10 03:04:45', 'BB2321', 'MOMENTS', '2024-11-10 04:14:10', false, NOW() - INTERVAL '9 months')

ON CONFLICT (customer_id) DO UPDATE SET
    name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    agent_id = EXCLUDED.agent_id,
    master_agent = EXCLUDED.master_agent,
    actual_balance = EXCLUDED.actual_balance,
    settle_figure = EXCLUDED.settle_figure,
    last_ticket = EXCLUDED.last_ticket,
    username = EXCLUDED.username,
    last_verification = EXCLUDED.last_verification,
    updated_at = NOW();

-- Insert sample wagers for SHOOTS customers
INSERT INTO wagers (
    customer_id, wager_number, agent_id, amount_wagered, 
    to_win_amount, description, status, sport, teams, 
    game_date, odds, wager_type, created_at
) VALUES
-- Recent wagers for active customers
('BB2322', 1001, 'SHOOTS', 250.00, 225.00, 'Houston Texans -3.5', 'pending', 'NFL', 'Houston Texans vs Dallas Cowboys', '2025-08-26', -110, 'spread', '2025-08-25 18:14:13'),
('BB2326', 1002, 'SHOOTS', 100.00, 180.00, 'Over 47.5 Total Points', 'win', 'NFL', 'Chiefs vs Bills', '2025-08-08', 180, 'total', '2025-08-08 07:32:47'),
('BB2209', 1003, 'SHOOTS', 50.00, 95.00, 'Lakers Moneyline', 'loss', 'NBA', 'Lakers vs Warriors', '2025-05-25', 190, 'moneyline', '2025-05-25 21:27:26'),

-- Historical wagers
('BB2299', 1004, 'SHOOTS', 75.00, 68.18, 'Under 8.5 Runs', 'win', 'MLB', 'Astros vs Rangers', '2025-04-06', -110, 'total', '2025-04-06 20:35:37'),
('BB2198', 1005, 'SHOOTS', 25.00, 22.73, 'Rockets +7', 'loss', 'NBA', 'Rockets vs Spurs', '2025-03-08', -110, 'spread', '2025-03-08 22:08:38'),
('BB2147', 1006, 'SHOOTS', 30.00, 57.00, 'Cowboys Moneyline', 'win', 'NFL', 'Cowboys vs Giants', '2024-09-29', 190, 'moneyline', '2024-09-29 21:21:47'),

-- Large losing wagers for negative balance customers
('BB2155', 1007, 'SHOOTS', 1500.00, 1363.64, 'Bears -3', 'loss', 'NFL', 'Bears vs Packers', '2024-06-07', -110, 'spread', '2024-06-07 23:23:37'),
('BB2322', 1008, 'SHOOTS', 800.00, 1600.00, 'Parlay: 3 Teams', 'loss', 'NFL', 'Multi-game parlay', '2025-08-20', 200, 'parlay', '2025-08-20 15:30:00')

ON CONFLICT (wager_number) DO NOTHING;

-- Insert sample transactions for SHOOTS customers
INSERT INTO transactions (
    customer_id, transaction_type, amount, description, 
    created_at, tran_code
) VALUES
-- Deposits
('BB2209', 'deposit', 1000.00, 'Initial deposit', NOW() - INTERVAL '6 months', 'C'),
('BB2251', 'deposit', 500.00, 'Cash deposit', NOW() - INTERVAL '4 months', 'C'),
('BB2326', 'deposit', 750.00, 'Bank transfer', NOW() - INTERVAL '3 months', 'C'),
('BB2147', 'deposit', 200.00, 'Credit deposit', NOW() - INTERVAL '8 months', 'C'),

-- Withdrawals
('BB2326', 'withdrawal', 300.00, 'Payout request', NOW() - INTERVAL '1 month', 'W'),
('BB2209', 'withdrawal', 150.00, 'Winnings withdrawal', NOW() - INTERVAL '2 months', 'W'),

-- Wager settlements
('BB2322', 'wager_loss', 250.00, 'Wager settlement - loss', '2025-08-25 20:00:00', 'W'),
('BB2326', 'wager_win', 180.00, 'Wager settlement - win', '2025-08-08 10:00:00', 'C'),
('BB2209', 'wager_loss', 50.00, 'Wager settlement - loss', '2025-05-25 23:00:00', 'W'),
('BB2299', 'wager_win', 68.18, 'Wager settlement - win', '2025-04-06 22:00:00', 'C'),

-- Large losses for negative balance customers
('BB2155', 'wager_loss', 1500.00, 'Large wager loss', '2024-06-08 01:00:00', 'W'),
('BB2322', 'wager_loss', 800.00, 'Parlay loss', '2025-08-20 18:00:00', 'W')

ON CONFLICT DO NOTHING;

-- Update customer balances based on transactions
UPDATE customers SET actual_balance = (
    SELECT COALESCE(
        SUM(CASE WHEN t.tran_code = 'C' THEN t.amount ELSE -t.amount END), 0
    )
    FROM transactions t 
    WHERE t.customer_id = customers.customer_id
) WHERE agent_id = 'SHOOTS';

COMMIT;

-- Verify the data
SELECT 
    'SHOOTS Agent Summary' as summary,
    COUNT(*) as total_customers,
    SUM(settle_figure) as total_settlement,
    SUM(actual_balance) as total_balance,
    COUNT(*) FILTER (WHERE actual_balance > 0) as positive_balance,
    COUNT(*) FILTER (WHERE actual_balance < 0) as negative_balance,
    COUNT(*) FILTER (WHERE settle_figure > 1000) as high_credit
FROM customers 
WHERE agent_id = 'SHOOTS';
