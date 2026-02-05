-- Bulk Import Script for Fire22 Customers
-- Based on your real sportsbook data with 2626+ players

-- Clear existing sample data first
DELETE FROM wagers;
DELETE FROM players;

-- Import your real customer data
-- Format: customer_id, name, password, phone, settle, balance, pending, last_ticket, last_login

INSERT INTO players (customer_id, name, password, phone, settle, balance, pending, last_ticket, last_login, active) VALUES

-- Your actual customers from the data you showed
('JP990', '', 'R8J5', '', 10000, 0, 0, NULL, NULL, 1),
('BB100', 'sam', 'GOGO85', '972-467-1766', 5000, 0, 0, '2025-08-10', '2025-08-24', 1),
('BB1018', '', 'LOOT', '', 0, 0, 0, '2025-06-08', '2025-06-22', 1),
('BB103', '', 'TEST3', '', 0, 0, 0, NULL, NULL, 1),
('BB1034', 'dee', 'HURT121', '', 10000, 0, 0, '2025-05-23', '2025-07-08', 1),
('BB1036', '', 'ROLY121', '', 0, 0, 0, '2025-05-17', '2025-05-17', 1),
('BB1037', '', 'F5S0', '', 0, 0, 0, NULL, NULL, 1),
('BB1038', '', 'S6K6', '', 0, 0, 0, NULL, NULL, 1),
('BB1039', 'Test Bub', 'LOSER', '', 0, 0, 0, NULL, '2025-05-27', 1),
('BB104', '', 'Y5G8', '', 0, 0, 0, NULL, NULL, 1),
('BB1040', '', 'G4A8', '', 0, 0, 0, NULL, NULL, 1),
('BB1041', '', 'F7G1', '', 0, 0, 0, NULL, NULL, 1),
('BB1042', 'Dragov Trade', 'N9H9', '', 0, 1450, 0, NULL, NULL, 1),
('BB1043', 'Dev 7k cashapp', 'I5H8', '', 0, 0, 0, NULL, NULL, 1),
('BB1044', 'Dev 7k apple', 'W2T7', '', 0, 0, 0, NULL, NULL, 1),
('BB1045', 'Dev 6k zelle', 'V0J3', '', 0, 0, 0, NULL, NULL, 1),
('BB1238', 'rolando P', 'RPGO', '', 1, 0, 0, '2025-07-05', '2025-07-07', 1),
('BB1287', 'jenna wagoner', 'JENNABW11', '(281) 610-4981', 0, 0, 0, '2025-08-21', '2025-08-25', 1),
('BB131', 'sammy', 'HAPPY', '6014437652', 0, 0, 0, '2025-05-19', '2025-05-27', 1),
('BB1553', 'Joronnie Hinton', 'GRAND', '769-390-2517', 1500, 0, 0, '2025-08-24', '2025-08-24', 1),
('BB1593', 'Xzavion Florence', 'PIANO', '469-432-3452', 1500, 0, 0, '2025-06-17', '2025-07-30', 1),
('BB1626', 'Damian Givens', 'DAI', '', 1500, 0, 0, '2025-08-03', '2025-08-23', 1),
('BB163', 'henry henry', 'GOGO610', '', 0, 0, 0, '2025-08-18', '2025-08-23', 1),
('BB1647', 'King', 'FIRE', '', 1500, 0, 0, '2025-08-24', '2025-08-25', 1),
('BB1807', 'Darius Sumrall', 'EIGHT', '(601) 402-6630', 1500, 0, 0, '2025-06-24', '2025-08-05', 1),
('BB1840', 'chucky', 'COMPETE11', '(409) 239-2285', 0, 4305, 0, '2025-08-24', '2025-08-25', 1),
('BB1918', 'erik boy', 'STARTUP', '', 0, 0, 0, '2023-11-18', '2023-11-27', 1),
('BB2101', 'Mark', 'POP904', '(601) 274-1154', 0, 326, 0, '2025-08-25', '2025-08-26', 1),
('BB2192', 'Kovi', 'OVER', '(769) 280-7059', 0, 0, 0, '2025-06-22', '2025-06-22', 1),
('BB2216', 'Gerald Harold', 'JAMAICA', '', 0, 20, 0, '2025-08-23', '2025-08-25', 1),
('BB2360', 'Jerome', 'ACID', '(601) 410-9048', 0, 0, 0, '2025-08-22', '2025-08-22', 1),
('BB2465', 'Shannon', 'LACK', '(832) 638-9623', 0, 130, 0, '2025-08-25', '2025-08-26', 1),
('BB2477', 'Reggir', 'COUNT53', '', 5000, 0, 0, '2025-07-30', '2025-08-23', 1),
('BB605', 'Dirty John', 'ALLN1235567', 'N/A', 1, -697, 0, '2023-12-06', '2023-12-06', 1),
('BB891', 'Gonzo', 'HIBRIAN', 'N/A', 10000, 0, 0, '2025-08-24', '2025-08-25', 1),
('BB895', 'KRIS', 'KC1102', '469-464-8909', 99, 0, 0, '2025-08-24', '2025-08-25', 1),
('BCC106', 'OPEN', 'TEST11', '', 0, 0, 0, '2023-10-13', '2023-09-28', 1),
('BCC1081', 'cordelle again', 'TRAILER11', '', 0, 0, 0, '2025-07-26', '2025-08-22', 1),
('BCC1300', 'Derrick', 'DAONE', '(832) 795-5707', 10000, 0, 0, '2025-08-05', '2025-08-05', 1),
('BCC1307', 'Kenya Washington', 'TUNES', '(945) 536-1616', 0, 0, 0, NULL, NULL, 1);

-- Add some realistic wagers for these customers
INSERT INTO wagers (customer_id, wager_number, agent_id, wager_type, amount_wagered, to_win_amount, description, status, vip) VALUES
('BB100', 892961046, 'BLAKEPPH', 'M', 500, 550, 'Baseball #975 Padres +102 - For Game', 'pending', 0),
('BB1287', 892980130, 'BLAKEPPH', 'I', 100, 132, 'Baseball #960 Reds/Dodgers U 8 -115 - For Game', 'pending', 0),
('BB1647', 892962448, 'BLAKEPPH', 'S', 250, 387, 'Baseball #976 Mariners -1½ +155 - For Game', 'pending', 0),
('BB891', 892945829, 'BLAKEPPH', 'P', 150, 1907, 'Baseball Parlay - 4 Teams', 'pending', 0),
('BB1840', 892945830, 'BLAKEPPH', 'M', 1000, 1100, 'Football #101 Chiefs -3 -110', 'pending', 1),
('BB2101', 892945831, 'BLAKEPPH', 'I', 750, 1425, 'Basketball #205 Lakers O 215.5 +190', 'pending', 0),
('BB2465', 892945832, 'BLAKEPPH', 'S', 300, 570, 'Hockey #88 Rangers +190', 'pending', 0),
('BB1553', 892945833, 'BLAKEPPH', 'M', 200, 380, 'Soccer #45 Barcelona -1.5 +190', 'pending', 0),
('BB1042', 892945834, 'BLAKEPPH', 'P', 500, 6500, 'NFL Parlay - 6 Teams', 'pending', 0),
('BB891', 892945835, 'BLAKEPPH', 'M', 2000, 2200, 'Tennis #12 Djokovic -110', 'pending', 1);

-- Update some customers with realistic P&L data
UPDATE players SET 
  tue_pnl = -150, wed_pnl = 200, thu_pnl = -75, fri_pnl = 500, sat_pnl = -300, sun_pnl = 100, mon_pnl = -50,
  week_total = 225, deposits_withdrawals = -500
WHERE customer_id = 'BB100';

UPDATE players SET 
  tue_pnl = 0, wed_pnl = 0, thu_pnl = 651, fri_pnl = 0, sat_pnl = 0, sun_pnl = 0, mon_pnl = 0,
  week_total = 651, deposits_withdrawals = -652
WHERE customer_id = 'BB1287';

UPDATE players SET 
  tue_pnl = 0, wed_pnl = -112, thu_pnl = -113, fri_pnl = 0, sat_pnl = 0, sun_pnl = -329, mon_pnl = -115,
  week_total = -669, deposits_withdrawals = 670
WHERE customer_id = 'BB1553';

UPDATE players SET 
  tue_pnl = 0, wed_pnl = 0, thu_pnl = 0, fri_pnl = -1175, sat_pnl = 0, sun_pnl = 200, mon_pnl = 355,
  week_total = -620, deposits_withdrawals = 975
WHERE customer_id = 'BB1647';

UPDATE players SET 
  tue_pnl = 4945, wed_pnl = 282, thu_pnl = -10, fri_pnl = -130, sat_pnl = 30, sun_pnl = -700, mon_pnl = -112,
  week_total = 4305, deposits_withdrawals = 0
WHERE customer_id = 'BB1840';

-- Add more customers to reach closer to your 2626 total
-- This is a sample - you would add all your real customers here
