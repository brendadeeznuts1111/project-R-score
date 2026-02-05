-- Minimal schema for Fire22 Manager Dashboard
-- Run with: psql fire22 -f schema.sql

-- Create database if it doesn't exist (run this separately if needed)
-- CREATE DATABASE fire22;

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50),
    amount NUMERIC(10,2),
    created_at TIMESTAMP DEFAULT NOW(),
    agent_id VARCHAR(50) DEFAULT 'BLAKEPPH',
    tran_code VARCHAR(10),
    tran_type VARCHAR(10),
    document_number VARCHAR(255),
    entered_by VARCHAR(255),
    freeplay_balance NUMERIC(10,2) DEFAULT 0,
    freeplay_pending_balance NUMERIC(10,2) DEFAULT 0,
    freeplay_pending_count INTEGER DEFAULT 0,
    grade_num INTEGER,
    login VARCHAR(255),
    short_desc TEXT,
    tran_datetime TIMESTAMP DEFAULT NOW()
);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    customer_id VARCHAR(50) UNIQUE NOT NULL,
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    login VARCHAR(255),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Bets table
CREATE TABLE IF NOT EXISTS bets (
    id SERIAL PRIMARY KEY,
    customer_id INTEGER REFERENCES customers(id),
    amount NUMERIC(10,2),
    odds NUMERIC(10,2),
    type VARCHAR(50),
    status VARCHAR(50) DEFAULT 'pending',
    outcome VARCHAR(50),
    teams TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Insert sample data
INSERT INTO customers (customer_id, username, first_name, last_name, login) VALUES
('AL500', 'alice_user', 'Alice', 'Johnson', 'AL500'),
('BLAKEPPH', 'blake_user', 'Blake', 'Smith', 'BLAKEPPH');

INSERT INTO transactions (customer_id, amount, agent_id, tran_code, tran_type, document_number, short_desc) VALUES
('AL500', 500.00, 'BLAKEPPH', 'C', 'E', 'TXN001', 'Deposit'),
('AL500', 200.00, 'BLAKEPPH', 'W', 'E', 'TXN002', 'Withdrawal'),
('BLAKEPPH', 1000.00, 'BLAKEPPH', 'C', 'E', 'TXN003', 'Deposit');

-- Insert sample bets
INSERT INTO bets (customer_id, amount, odds, type, status, teams) VALUES
(1, 100.00, 1.5, 'straight', 'pending', 'Team A vs Team B'),
(1, 50.00, 2.0, 'parlay', 'win', 'Team C vs Team D'),
(2, 200.00, 1.8, 'straight', 'pending', 'Team E vs Team F');
