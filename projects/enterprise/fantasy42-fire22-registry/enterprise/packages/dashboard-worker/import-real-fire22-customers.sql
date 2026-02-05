-- Import REAL Fire22 Customer Data
-- Based on actual Fire22 API response

-- Clear existing data first
DELETE FROM wagers;
DELETE FROM players;

-- Import real Fire22 customers with complete data structure
INSERT INTO players (
  customer_id, name, password, phone, email, 
  balance, credit_limit, wager_limit, settle, 
  casino_balance, freeplay_balance, pending, 
  agent_id, master_agent, active, last_login,
  casino_active, sportsbook_active, notes
) VALUES

-- Real customers from Fire22 API response
('BBS110', 'Javier', 'cached', '(195) 645-9895', '', 0, 0, 100000, 10000, 0, 0, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, '2024-05-05', 1, 1, 'Referral: VALL\nDeal FP: N/A\nNotes: None'),

('BBS111', 'Carlos', 'cached', '(956) 293-8614', '', 0, 0, 100000, 10000, 0, 1, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, '2024-06-16', 1, 1, 'Referral: VALL\nDeal FP: N/A\ntele handle @hurxie'),

('BBS112', 'Juan Anguiano', 'shared', '(195) 643-2106', '', 5000, 0, 100000, 10000, 0, 100, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, NULL, 1, 1, 'Referral: VALL\nDeal FP: N/A\nNotes: None'),

('BBS113', 'Nathaniel Garcia', 'beef', '(956) 369-3691', '', 50, 0, 100000, 10000, 0, 0, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, '2024-04-10', 1, 1, 'Referral: VALL\nDeal FP: N/A\nNotes: None'),

('BBS114', 'Andres', 'stays', '(956) 315-0817', '', 25, 0, 100000, 10000, 0, 1, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, '2023-11-24', 1, 1, 'Referral: VALL\nDeal FP: N/A\nNotes: None'),

('BBS115', 'Servando Olivarez', 'lesson', '(956) 460-0742', '', 24, 0, 100000, 10000, 0, 0, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, '2024-09-23', 1, 1, 'Referral: VALL\nDeal FP: N/A\nNotes: None\n\n956-221-0759'),

('BBS116', 'Elizabet Olivarez', 'graphic', '(956) 221-1939', '', 1, 0, 100000, 10000, 0, 0, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, '2025-01-06', 1, 1, 'Referral: VALL\nDeal FP: N/A\nNotes: None'),

('BBS117', 'Eze', 'meta', '(956) 483-9295', '', 54, 0, 250000, 10000, 0, 0, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, '2024-07-17', 1, 1, 'Referral: VALL\nDeal FP: N/A\nNotes: None'),

('BBS118', 'Vicky', 'souls', '(956) 720-6996', '', 5000, 0, 100000, 10000, 0, 100, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, NULL, 1, 1, 'Referral: VALL\nDeal FP: N/A\nNotes: None'),

('BBS119', 'Alberto', 'advert', '(956) 238-9625', '', 0, 0, 100000, 10000, 0, 0, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, NULL, 1, 1, 'Referral: BBS111\nDeal FP: N/A\nNotes: (956)2389625'),

('DD477', 'beyonlopez', 'lang', '(956) 391-7557', '', 45, 0, 100000, 10000, 0, 0, 0, 'VALL', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, '2023-12-02', 1, 1, 'Referral: DD459\nDeal FP: N/A\nNotes: +1 (956)-391-7557');

-- Add some realistic wagers for these real customers
INSERT INTO wagers (customer_id, wager_number, agent_id, wager_type, amount_wagered, to_win_amount, description, status, vip) VALUES
('BBS112', 892961050, 'VALL', 'M', 1000, 1100, 'NFL #101 Cowboys -3 -110', 'pending', 0),
('BBS118', 892961051, 'VALL', 'S', 500, 950, 'NBA #205 Lakers +190', 'pending', 0),
('BBS117', 892961052, 'VALL', 'I', 250, 475, 'MLB #88 Rangers O 8.5 +190', 'pending', 0),
('BBS113', 892961053, 'VALL', 'M', 50, 95, 'Soccer #45 Barcelona -1.5 +190', 'pending', 0),
('BBS115', 892961054, 'VALL', 'P', 24, 312, 'NFL Parlay - 3 Teams', 'pending', 0),
('DD477', 892961055, 'VALL', 'M', 45, 85.5, 'Hockey #12 Rangers +190', 'pending', 0),
('BBS116', 892961056, 'VALL', 'M', 1, 1.9, 'Tennis #33 Djokovic +190', 'pending', 0);

-- Update some customers with realistic P&L data
UPDATE players SET 
  tue_pnl = 0, wed_pnl = 0, thu_pnl = 0, fri_pnl = 1000, sat_pnl = 0, sun_pnl = 0, mon_pnl = 0,
  week_total = 1000, deposits_withdrawals = -1000
WHERE customer_id = 'BBS112';

UPDATE players SET 
  tue_pnl = 0, wed_pnl = 0, thu_pnl = 0, fri_pnl = 500, sat_pnl = 0, sun_pnl = 0, mon_pnl = 0,
  week_total = 500, deposits_withdrawals = -500
WHERE customer_id = 'BBS118';

UPDATE players SET 
  tue_pnl = 0, wed_pnl = 54, thu_pnl = 0, fri_pnl = 0, sat_pnl = 0, sun_pnl = 0, mon_pnl = 0,
  week_total = 54, deposits_withdrawals = 0
WHERE customer_id = 'BBS117';

UPDATE players SET 
  tue_pnl = 0, wed_pnl = 0, thu_pnl = 25, fri_pnl = 0, sat_pnl = 0, sun_pnl = 0, mon_pnl = 0,
  week_total = 25, deposits_withdrawals = 0
WHERE customer_id = 'BBS114';

-- Add agent information
INSERT OR REPLACE INTO players (customer_id, name, password, phone, balance, agent_id, master_agent, active, wager_limit) VALUES
('VALL', 'Agent VALL', 'agent_pass', '', 0, 'BLAKEPPH2', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS/BLAKEPPH2', 1, 0),
('BLAKEPPH2', 'Agent BLAKEPPH2', 'master_pass', '', 0, 'CSMARCUS', 'CSCALVIN/CSMIYUKI/CSMARIANA/CSMARCUS', 1, 0);
