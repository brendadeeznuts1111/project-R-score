-- Real Fire22 Sportsbook Schema
-- Based on actual data structure with 2626 players

-- Drop existing tables if they exist
DROP TABLE IF EXISTS wagers CASCADE;
DROP TABLE IF EXISTS players CASCADE;
DROP TABLE IF EXISTS agents CASCADE;

-- Players table (matches your real data structure)
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(20) UNIQUE NOT NULL,  -- BB100, BB1018, JP990, etc.
    name VARCHAR(255),                        -- sam, dee, etc.
    password VARCHAR(50),                     -- GOGO85, LOOT, etc.
    phone VARCHAR(50),                        -- (972) 467-1766, etc.
    settle NUMERIC(10,2) DEFAULT 0,           -- Settlement amount
    carry NUMERIC(10,2) DEFAULT 0,            -- Carry amount
    
    -- Daily P&L columns
    tue_pnl NUMERIC(10,2) DEFAULT 0,          -- Tuesday P&L
    wed_pnl NUMERIC(10,2) DEFAULT 0,          -- Wednesday P&L
    thu_pnl NUMERIC(10,2) DEFAULT 0,          -- Thursday P&L
    fri_pnl NUMERIC(10,2) DEFAULT 0,          -- Friday P&L
    sat_pnl NUMERIC(10,2) DEFAULT 0,          -- Saturday P&L
    sun_pnl NUMERIC(10,2) DEFAULT 0,          -- Sunday P&L
    mon_pnl NUMERIC(10,2) DEFAULT 0,          -- Monday P&L
    
    week_total NUMERIC(10,2) DEFAULT 0,       -- Week total
    deposits_withdrawals NUMERIC(10,2) DEFAULT 0,  -- +Dep/-Wd
    balance NUMERIC(10,2) DEFAULT 0,          -- Current balance
    pending NUMERIC(10,2) DEFAULT 0,          -- Pending amount
    
    last_ticket DATE,                         -- Last ticket date
    last_login TIMESTAMP,                     -- Last login timestamp
    
    agent_id VARCHAR(50) DEFAULT 'BLAKEPPH',  -- Agent assignment
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Agents table
CREATE TABLE agents (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(50) UNIQUE NOT NULL,     -- CSCALVIN, CSMIYUKI, etc.
    agent_name VARCHAR(255),
    parent_agent VARCHAR(50),
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Wagers/Transactions table
CREATE TABLE wagers (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(20) REFERENCES players(customer_id),
    wager_number BIGINT UNIQUE,
    agent_id VARCHAR(50),
    wager_type VARCHAR(10),                   -- M, I, S, P (Moneyline, etc.)
    amount_wagered NUMERIC(10,2),
    to_win_amount NUMERIC(10,2),
    odds NUMERIC(8,2),
    description TEXT,                         -- Game description
    status VARCHAR(20) DEFAULT 'pending',     -- pending, win, loss, void
    ticket_writer VARCHAR(50) DEFAULT 'Internet',
    vip BOOLEAN DEFAULT false,
    sport VARCHAR(50),
    teams TEXT,
    game_date DATE,
    created_at TIMESTAMP DEFAULT NOW(),
    settled_at TIMESTAMP,
    settled_amount NUMERIC(10,2)
);

-- Insert sample agents
INSERT INTO agents (agent_id, agent_name) VALUES
('BLAKEPPH', 'Blake PPH'),
('CSCALVIN', 'CS Calvin'),
('CSMIYUKI', 'CS Miyuki'),
('CSMARIANA', 'CS Mariana'),
('CSMARCUS', 'CS Marcus'),
('BLAKEPPH2', 'Blake PPH 2'),
('101JEFE', '101 Jefe'),
('BBPERSONAL', 'BB Personal');

-- Sample players (based on your real data)
INSERT INTO players (customer_id, name, password, phone, settle, balance, last_ticket, last_login) VALUES
('BB100', 'sam', 'GOGO85', '972-467-1766', 5000, 0, '2025-08-10', '2025-08-24'),
('BB1018', '', 'LOOT', '', 0, 0, '2025-06-08', '2025-06-22'),
('BB1034', 'dee', 'HURT121', '', 10000, 0, '2025-05-23', '2025-07-08'),
('BB1287', 'jenna wagoner', 'JENNABW11', '(281) 610-4981', 0, 0, '2025-08-21', '2025-08-25'),
('BB1553', 'Joronnie Hinton', 'GRAND', '769-390-2517', 1500, 0, '2025-08-24', '2025-08-24'),
('BB1647', 'King', 'FIRE', '', 1500, 0, '2025-08-24', '2025-08-25'),
('BB1840', 'chucky', 'COMPETE11', '(409) 239-2285', 0, 4305, '2025-08-24', '2025-08-25'),
('BB2101', 'Mark', 'POP904', '(601) 274-1154', 0, 326, '2025-08-25', '2025-08-26'),
('BB2465', 'Shannon', 'LACK', '(832) 638-9623', 0, 130, '2025-08-25', '2025-08-26'),
('BB891', 'Gonzo', 'HIBRIAN', 'N/A', 10000, 0, '2025-08-24', '2025-08-25'),
('BB895', 'KRIS', 'KC1102', '469-464-8909', 99, 0, '2025-08-24', '2025-08-25'),
('JP990', '', 'R8J5', '', 10000, 0, NULL, NULL);

-- Sample wagers
INSERT INTO wagers (customer_id, wager_number, agent_id, wager_type, amount_wagered, to_win_amount, description, status) VALUES
('BB100', 892961046, 'BLAKEPPH', 'M', 500, 550, 'Baseball #975 Padres +102', 'pending'),
('BB1287', 892980130, 'BLAKEPPH', 'I', 100, 132, 'Baseball #960 Reds/Dodgers U 8 -115', 'pending'),
('BB1647', 892962448, 'BLAKEPPH', 'S', 250, 387, 'Baseball #976 Mariners -1½ +155', 'pending'),
('BB891', 892945829, 'BLAKEPPH', 'P', 150, 1907, 'Baseball Parlay - 4 Teams', 'pending');

-- Create indexes for performance
CREATE INDEX idx_players_customer_id ON players(customer_id);
CREATE INDEX idx_players_agent_id ON players(agent_id);
CREATE INDEX idx_players_active ON players(active);
CREATE INDEX idx_wagers_customer_id ON wagers(customer_id);
CREATE INDEX idx_wagers_status ON wagers(status);
CREATE INDEX idx_wagers_created_at ON wagers(created_at);
