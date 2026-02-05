-- Generate 20,000+ Players and Sample Data
-- This script creates realistic player data for Fire22

-- ====================
-- PLAYER GENERATION SCRIPT
-- ====================

-- First, let's create a more comprehensive set of sample players
-- We'll create players in batches and distribute them across agents

-- Players for BLAKEPPH (Agent 1) - 6,000 players
-- Customer IDs: AL1000 - AL6999

INSERT OR IGNORE INTO players (player_id, customer_id, agent_id, username, email, first_name, last_name, status, credit_limit, account_type)
SELECT 
    'PLR_AL' || (1000 + seq) as player_id,
    'AL' || (1000 + seq) as customer_id,
    'BLAKEPPH' as agent_id,
    'user_al' || (1000 + seq) as username,
    'al' || (1000 + seq) || '@fire22demo.com' as email,
    (CASE (seq % 20)
        WHEN 0 THEN 'James' WHEN 1 THEN 'John' WHEN 2 THEN 'Robert' WHEN 3 THEN 'Michael' WHEN 4 THEN 'William'
        WHEN 5 THEN 'David' WHEN 6 THEN 'Richard' WHEN 7 THEN 'Joseph' WHEN 8 THEN 'Thomas' WHEN 9 THEN 'Christopher'
        WHEN 10 THEN 'Charles' WHEN 11 THEN 'Daniel' WHEN 12 THEN 'Matthew' WHEN 13 THEN 'Anthony' WHEN 14 THEN 'Mark'
        WHEN 15 THEN 'Donald' WHEN 16 THEN 'Steven' WHEN 17 THEN 'Paul' WHEN 18 THEN 'Andrew' WHEN 19 THEN 'Joshua'
        ELSE 'Player'
    END) as first_name,
    (CASE ((seq * 7) % 15)
        WHEN 0 THEN 'Smith' WHEN 1 THEN 'Johnson' WHEN 2 THEN 'Williams' WHEN 3 THEN 'Brown' WHEN 4 THEN 'Jones'
        WHEN 5 THEN 'Garcia' WHEN 6 THEN 'Miller' WHEN 7 THEN 'Davis' WHEN 8 THEN 'Rodriguez' WHEN 9 THEN 'Martinez'
        WHEN 10 THEN 'Hernandez' WHEN 11 THEN 'Lopez' WHEN 12 THEN 'Gonzalez' WHEN 13 THEN 'Wilson' WHEN 14 THEN 'Anderson'
        ELSE 'Player'
    END) as last_name,
    (CASE (seq % 20)
        WHEN 0 THEN 'suspended'
        WHEN 1 THEN 'pending'
        ELSE 'active'
    END) as status,
    (CASE (seq % 10)
        WHEN 0 THEN 1000.00 WHEN 1 THEN 2500.00 WHEN 2 THEN 5000.00 WHEN 3 THEN 7500.00 WHEN 4 THEN 10000.00
        WHEN 5 THEN 15000.00 WHEN 6 THEN 20000.00 WHEN 7 THEN 30000.00 WHEN 8 THEN 50000.00 WHEN 9 THEN 100000.00
        ELSE 5000.00
    END) as credit_limit,
    (CASE (seq % 15)
        WHEN 0 THEN 'vip'
        WHEN 1 THEN 'premium'
        ELSE 'regular'
    END) as account_type
FROM (
    WITH RECURSIVE seq_gen(seq) AS (
        SELECT 0
        UNION ALL
        SELECT seq + 1 FROM seq_gen WHERE seq < 5999
    )
    SELECT seq FROM seq_gen
);

-- Players for DAKOMA (Agent 2) - 4,500 players  
-- Customer IDs: DK1000 - DK5499

INSERT OR IGNORE INTO players (player_id, customer_id, agent_id, username, email, first_name, last_name, status, credit_limit, account_type)
SELECT 
    'PLR_DK' || (1000 + seq) as player_id,
    'DK' || (1000 + seq) as customer_id,
    'DAKOMA' as agent_id,
    'user_dk' || (1000 + seq) as username,
    'dk' || (1000 + seq) || '@fire22demo.com' as email,
    (CASE (seq % 15)
        WHEN 0 THEN 'Michael' WHEN 1 THEN 'Sarah' WHEN 2 THEN 'Jessica' WHEN 3 THEN 'Ashley' WHEN 4 THEN 'Emily'
        WHEN 5 THEN 'Samantha' WHEN 6 THEN 'Amanda' WHEN 7 THEN 'Brittany' WHEN 8 THEN 'Megan' WHEN 9 THEN 'Jennifer'
        WHEN 10 THEN 'Nicole' WHEN 11 THEN 'Rachel' WHEN 12 THEN 'Stephanie' WHEN 13 THEN 'Catherine' WHEN 14 THEN 'Deborah'
        ELSE 'User'
    END) as first_name,
    (CASE ((seq * 3) % 12)
        WHEN 0 THEN 'Thompson' WHEN 1 THEN 'White' WHEN 2 THEN 'Harris' WHEN 3 THEN 'Martin' WHEN 4 THEN 'Jackson'
        WHEN 5 THEN 'Clark' WHEN 6 THEN 'Lewis' WHEN 7 THEN 'Lee' WHEN 8 THEN 'Walker' WHEN 9 THEN 'Hall'
        WHEN 10 THEN 'Allen' WHEN 11 THEN 'Young'
        ELSE 'User'
    END) as last_name,
    (CASE (seq % 25)
        WHEN 0 THEN 'suspended'
        WHEN 1 THEN 'closed'
        ELSE 'active'
    END) as status,
    (CASE (seq % 8)
        WHEN 0 THEN 2000.00 WHEN 1 THEN 5000.00 WHEN 2 THEN 7500.00 WHEN 3 THEN 12500.00
        WHEN 4 THEN 20000.00 WHEN 5 THEN 35000.00 WHEN 6 THEN 75000.00 WHEN 7 THEN 150000.00
        ELSE 10000.00
    END) as credit_limit,
    (CASE (seq % 12)
        WHEN 0 THEN 'vip'
        WHEN 1 THEN 'premium'
        ELSE 'regular'
    END) as account_type
FROM (
    WITH RECURSIVE seq_gen(seq) AS (
        SELECT 0
        UNION ALL
        SELECT seq + 1 FROM seq_gen WHERE seq < 4499
    )
    SELECT seq FROM seq_gen
);

-- Players for SCRAMPOST (Agent 3) - 5,500 players
-- Customer IDs: SP1000 - SP6499

INSERT OR IGNORE INTO players (player_id, customer_id, agent_id, username, email, first_name, last_name, status, credit_limit, account_type)
SELECT 
    'PLR_SP' || (1000 + seq) as player_id,
    'SP' || (1000 + seq) as customer_id,
    'SCRAMPOST' as agent_id,
    'user_sp' || (1000 + seq) as username,
    'sp' || (1000 + seq) || '@fire22demo.com' as email,
    (CASE (seq % 18)
        WHEN 0 THEN 'Carlos' WHEN 1 THEN 'Maria' WHEN 2 THEN 'Jose' WHEN 3 THEN 'Luis' WHEN 4 THEN 'Ana'
        WHEN 5 THEN 'Antonio' WHEN 6 THEN 'Francisco' WHEN 7 THEN 'Miguel' WHEN 8 THEN 'Pedro' WHEN 9 THEN 'Juan'
        WHEN 10 THEN 'Fernando' WHEN 11 THEN 'Ricardo' WHEN 12 THEN 'Eduardo' WHEN 13 THEN 'Roberto' WHEN 14 THEN 'Diego'
        WHEN 15 THEN 'Alejandro' WHEN 16 THEN 'Marco' WHEN 17 THEN 'Sergio'
        ELSE 'Player'
    END) as first_name,
    (CASE ((seq * 5) % 14)
        WHEN 0 THEN 'Rodriguez' WHEN 1 THEN 'Martinez' WHEN 2 THEN 'Garcia' WHEN 3 THEN 'Fernandez' WHEN 4 THEN 'Lopez'
        WHEN 5 THEN 'Gonzalez' WHEN 6 THEN 'Perez' WHEN 7 THEN 'Sanchez' WHEN 8 THEN 'Ramirez' WHEN 9 THEN 'Torres'
        WHEN 10 THEN 'Rivera' WHEN 11 THEN 'Flores' WHEN 12 THEN 'Gomez' WHEN 13 THEN 'Diaz'
        ELSE 'Surname'
    END) as last_name,
    (CASE (seq % 30)
        WHEN 0 THEN 'suspended'
        WHEN 1 THEN 'pending'
        ELSE 'active'
    END) as status,
    (CASE (seq % 9)
        WHEN 0 THEN 1500.00 WHEN 1 THEN 3000.00 WHEN 2 THEN 6000.00 WHEN 3 THEN 12000.00 WHEN 4 THEN 25000.00
        WHEN 5 THEN 40000.00 WHEN 6 THEN 60000.00 WHEN 7 THEN 100000.00 WHEN 8 THEN 200000.00
        ELSE 7500.00
    END) as credit_limit,
    (CASE (seq % 10)
        WHEN 0 THEN 'vip'
        WHEN 1 THEN 'premium'
        ELSE 'regular'
    END) as account_type
FROM (
    WITH RECURSIVE seq_gen(seq) AS (
        SELECT 0
        UNION ALL
        SELECT seq + 1 FROM seq_gen WHERE seq < 5499
    )
    SELECT seq FROM seq_gen
);

-- Players for SPEN (Agent 4) - 4,000 players
-- Customer IDs: SN1000 - SN4999

INSERT OR IGNORE INTO players (player_id, customer_id, agent_id, username, email, first_name, last_name, status, credit_limit, account_type)
SELECT 
    'PLR_SN' || (1000 + seq) as player_id,
    'SN' || (1000 + seq) as customer_id,
    'SPEN' as agent_id,
    'user_sn' || (1000 + seq) as username,
    'sn' || (1000 + seq) || '@fire22demo.com' as email,
    (CASE (seq % 16)
        WHEN 0 THEN 'Alexander' WHEN 1 THEN 'Benjamin' WHEN 2 THEN 'Nicholas' WHEN 3 THEN 'Zachary' WHEN 4 THEN 'Gabriel'
        WHEN 5 THEN 'Nathan' WHEN 6 THEN 'Jackson' WHEN 7 THEN 'Logan' WHEN 8 THEN 'Mason' WHEN 9 THEN 'Jacob'
        WHEN 10 THEN 'William' WHEN 11 THEN 'Ethan' WHEN 12 THEN 'Owen' WHEN 13 THEN 'Lucas' WHEN 14 THEN 'Aiden'
        WHEN 15 THEN 'Sebastian'
        ELSE 'User'
    END) as first_name,
    (CASE ((seq * 11) % 13)
        WHEN 0 THEN 'King' WHEN 1 THEN 'Wright' WHEN 2 THEN 'Hill' WHEN 3 THEN 'Scott' WHEN 4 THEN 'Green'
        WHEN 5 THEN 'Adams' WHEN 6 THEN 'Baker' WHEN 7 THEN 'Nelson' WHEN 8 THEN 'Carter' WHEN 9 THEN 'Mitchell'
        WHEN 10 THEN 'Parker' WHEN 11 THEN 'Evans' WHEN 12 THEN 'Edwards'
        ELSE 'Name'
    END) as last_name,
    (CASE (seq % 35)
        WHEN 0 THEN 'suspended'
        WHEN 1 THEN 'closed'
        ELSE 'active'
    END) as status,
    (CASE (seq % 7)
        WHEN 0 THEN 2500.00 WHEN 1 THEN 5000.00 WHEN 2 THEN 10000.00 WHEN 3 THEN 25000.00
        WHEN 4 THEN 50000.00 WHEN 5 THEN 100000.00 WHEN 6 THEN 250000.00
        ELSE 12500.00
    END) as credit_limit,
    (CASE (seq % 8)
        WHEN 0 THEN 'vip'
        WHEN 1 THEN 'premium'
        ELSE 'regular'
    END) as account_type
FROM (
    WITH RECURSIVE seq_gen(seq) AS (
        SELECT 0
        UNION ALL
        SELECT seq + 1 FROM seq_gen WHERE seq < 3999
    )
    SELECT seq FROM seq_gen
);

-- Update player additional fields with realistic data
UPDATE players SET 
    outstanding_balance = ROUND(RANDOM() * credit_limit * 0.6, 2),
    available_credit = credit_limit - outstanding_balance,
    total_deposits = ROUND(RANDOM() * credit_limit * 2.5, 2),
    total_withdrawals = ROUND(total_deposits * 0.8, 2),
    lifetime_volume = ROUND(RANDOM() * credit_limit * 15, 2),
    lifetime_winnings = ROUND(lifetime_volume * 0.45, 2),
    lifetime_losses = ROUND(lifetime_volume * 0.48, 2),
    max_bet_limit = ROUND(credit_limit * 0.2, 2),
    daily_bet_limit = ROUND(credit_limit * 0.5, 2),
    weekly_bet_limit = ROUND(credit_limit * 2.0, 2),
    risk_score = ABS(RANDOM() % 100),
    last_login_at = datetime('now', '-' || (ABS(RANDOM() % 30)) || ' days'),
    last_bet_at = datetime('now', '-' || (ABS(RANDOM() % 7)) || ' days')
WHERE player_id IS NOT NULL;

-- Update risk level based on risk score
UPDATE players SET 
    risk_level = CASE 
        WHEN risk_score >= 80 THEN 'high'
        WHEN risk_score >= 50 THEN 'medium' 
        ELSE 'low'
    END
WHERE player_id IS NOT NULL;

-- ====================
-- SAMPLE GAMES DATA
-- ====================

-- Add some sample games for today and upcoming dates
INSERT OR IGNORE INTO games (game_id, sport_id, league_id, home_team_id, away_team_id, game_date, status) VALUES
('NFL_2024_001', 'NFL', 'NFL_REGULAR', 'KC_CHIEFS', 'BUF_BILLS', datetime('now', '+2 days'), 'scheduled'),
('NBA_2024_001', 'NBA', 'NBA_REGULAR', 'LAL_LAKERS', 'BOS_CELTICS', datetime('now', '+1 day'), 'scheduled'),
('NFL_2024_002', 'NFL', 'NFL_REGULAR', 'BUF_BILLS', 'KC_CHIEFS', datetime('now', '-1 day'), 'finished'),
('NBA_2024_002', 'NBA', 'NBA_REGULAR', 'BOS_CELTICS', 'LAL_LAKERS', datetime('now', '-2 days'), 'finished');

-- Update finished games with final scores
UPDATE games SET 
    final_home_score = 24,
    final_away_score = 21,
    winning_team_id = home_team_id,
    finished_at = datetime('now', '-1 day')
WHERE game_id = 'NFL_2024_002';

UPDATE games SET 
    final_home_score = 108,
    final_away_score = 112,
    winning_team_id = away_team_id,
    finished_at = datetime('now', '-2 days')
WHERE game_id = 'NBA_2024_002';

-- Summary: This script creates:
-- - 6,000 players for BLAKEPPH (AL1000-AL6999)  
-- - 4,500 players for DAKOMA (DK1000-DK5499)
-- - 5,500 players for SCRAMPOST (SP1000-SP6499)
-- - 4,000 players for SPEN (SN1000-SN4999)
-- Total: 20,000 players

-- All players have realistic:
-- - Credit limits ($1K to $250K)
-- - Account balances and activity
-- - Risk scores and levels  
-- - Betting limits
-- - Names and contact info
-- - Recent activity timestamps