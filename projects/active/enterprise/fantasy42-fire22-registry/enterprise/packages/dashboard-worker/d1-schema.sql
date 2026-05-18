-- Cloudflare D1 Schema for Fire22 Sportsbook
-- SQLite-compatible version

-- Players table (matches your real data structure)
CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT UNIQUE NOT NULL,         -- BB100, BB1018, JP990, etc.
    name TEXT,                                -- sam, dee, etc.
    password TEXT,                            -- GOGO85, LOOT, etc.
    phone TEXT,                               -- (972) 467-1766, etc.
    settle REAL DEFAULT 0,                    -- Settlement amount
    carry REAL DEFAULT 0,                     -- Carry amount
    
    -- Daily P&L columns
    tue_pnl REAL DEFAULT 0,                   -- Tuesday P&L
    wed_pnl REAL DEFAULT 0,                   -- Wednesday P&L
    thu_pnl REAL DEFAULT 0,                   -- Thursday P&L
    fri_pnl REAL DEFAULT 0,                   -- Friday P&L
    sat_pnl REAL DEFAULT 0,                   -- Saturday P&L
    sun_pnl REAL DEFAULT 0,                   -- Sunday P&L
    mon_pnl REAL DEFAULT 0,                   -- Monday P&L
    
    week_total REAL DEFAULT 0,                -- Week total
    deposits_withdrawals REAL DEFAULT 0,      -- +Dep/-Wd
    balance REAL DEFAULT 0,                   -- Current balance
    pending REAL DEFAULT 0,                   -- Pending amount
    
    last_ticket TEXT,                         -- Last ticket date
    last_login TEXT,                          -- Last login timestamp
    
    agent_id TEXT DEFAULT 'BLAKEPPH',         -- Agent assignment
    active INTEGER DEFAULT 1,                -- 1 = true, 0 = false
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    updated_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Agents table
CREATE TABLE IF NOT EXISTS agents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_id TEXT UNIQUE NOT NULL,            -- CSCALVIN, CSMIYUKI, etc.
    agent_name TEXT,
    parent_agent TEXT,
    active INTEGER DEFAULT 1,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

-- Wagers/Transactions table
CREATE TABLE IF NOT EXISTS wagers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    customer_id TEXT,                         -- References players.customer_id
    wager_number INTEGER UNIQUE,
    agent_id TEXT,
    wager_type TEXT,                          -- M, I, S, P (Moneyline, etc.)
    amount_wagered REAL,
    to_win_amount REAL,
    odds REAL,
    description TEXT,                         -- Game description
    status TEXT DEFAULT 'pending',           -- pending, win, loss, void
    ticket_writer TEXT DEFAULT 'Internet',
    vip INTEGER DEFAULT 0,                    -- 1 = true, 0 = false
    sport TEXT,
    teams TEXT,
    game_date TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
    settled_at TEXT,
    settled_amount REAL
);

-- Insert sample agents
INSERT OR IGNORE INTO agents (agent_id, agent_name) VALUES
('BLAKEPPH', 'Blake PPH'),
('CSCALVIN', 'CS Calvin'),
('CSMIYUKI', 'CS Miyuki'),
('CSMARIANA', 'CS Mariana'),
('CSMARCUS', 'CS Marcus'),
('BLAKEPPH2', 'Blake PPH 2'),
('101JEFE', '101 Jefe'),
('BBPERSONAL', 'BB Personal');

-- Sample players (based on your real data)
INSERT OR IGNORE INTO players (customer_id, name, password, phone, settle, balance, last_ticket, last_login) VALUES
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
INSERT OR IGNORE INTO wagers (customer_id, wager_number, agent_id, wager_type, amount_wagered, to_win_amount, description, status) VALUES
('BB100', 892961046, 'BLAKEPPH', 'M', 500, 550, 'Baseball #975 Padres +102', 'pending'),
('BB1287', 892980130, 'BLAKEPPH', 'I', 100, 132, 'Baseball #960 Reds/Dodgers U 8 -115', 'pending'),
('BB1647', 892962448, 'BLAKEPPH', 'S', 250, 387, 'Baseball #976 Mariners -1½ +155', 'pending'),
('BB891', 892945829, 'BLAKEPPH', 'P', 150, 1907, 'Baseball Parlay - 4 Teams', 'pending');

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_players_customer_id ON players(customer_id);
CREATE INDEX IF NOT EXISTS idx_players_agent_id ON players(agent_id);
CREATE INDEX IF NOT EXISTS idx_players_active ON players(active);
CREATE INDEX IF NOT EXISTS idx_wagers_customer_id ON wagers(customer_id);
CREATE INDEX IF NOT EXISTS idx_wagers_status ON wagers(status);
CREATE INDEX IF NOT EXISTS idx_wagers_created_at ON wagers(created_at);
