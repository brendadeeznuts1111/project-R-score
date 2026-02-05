-- Insert initial users for testing
INSERT INTO users (id, username, email, password_hash, role, permissions, is_active) VALUES
('550e8400-e29b-41d4-a716-446655440000', 'admin', 'admin@bettingplatform.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin', '["*"]', true),
('550e8400-e29b-41d4-a716-446655440001', 'manager', 'manager@bettingplatform.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'manager', '["workflows:*", "betting:*"]', true),
('550e8400-e29b-41d4-a716-446655440002', 'analyst', 'analyst@bettingplatform.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'analyst', '["workflows:read", "workflows:approve", "analytics:read"]', true),
('550e8400-e29b-41d4-a716-446655440003', 'trader', 'trader@bettingplatform.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'trader', '["betting:lines:*", "workflows:approve"]', true);

-- Insert initial API keys for testing
INSERT INTO api_keys (id, name, key_hash, permissions, created_by, is_active, expires_at) VALUES
('650e8400-e29b-41d4-a716-446655440000', 'system-integration', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '["workflows:*", "betting:*"]', '550e8400-e29b-41d4-a716-446655440000', true, NULL),
('650e8400-e29b-41d4-a716-446655440001', 'content-management', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '["workflows:create", "workflows:approve", "betting:content:*"]', '550e8400-e29b-41d4-a716-446655440001', true, '2025-12-31 23:59:59+00'),
('650e8400-e29b-41d4-a716-446655440002', 'trading-system', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', '["betting:lines:*", "workflows:approve"]', '550e8400-e29b-41d4-a716-446655440003', true, NULL);

-- Insert sample workflows for testing
INSERT INTO workflows (id, workflow_id, status, current_step, created_by, data, metadata, priority, total_steps, current_step_index) VALUES
('750e8400-e29b-41d4-a716-446655440000', 'content_publishing', 'completed', 'published', '550e8400-e29b-41d4-a716-446655440001',
 '{"title": "Premier League Matchday Special", "contentType": "featured_bets", "jurisdiction": "UK", "financialImpact": 25000, "contentId": "pl-matchday-1"}',
 '{"approval_chain": ["content_approver", "manager"], "review_deadline": "2024-01-15T17:00:00.000Z"}',
 'high', 3, 2),

('750e8400-e29b-41d4-a716-446655440001', 'line_change_approval', 'in_progress', 'trading_review', '550e8400-e29b-41d4-a716-446655440003',
 '{"lineId": "line-manutd-liv-12345", "eventName": "Manchester United vs Liverpool", "oldOdds": "2.50", "newOdds": "2.20", "marketType": "match_winner", "reason": "Injury to key player", "financialImpact": 15000, "oddsChangePercentage": 12, "totalExposure": 45000}',
 '{"risk_level": "medium", "trading_team_notified": true, "requires_urgent_review": false}',
 'critical', 4, 1),

('750e8400-e29b-41d4-a716-446655440002', 'odds_update_approval', 'pending', 'initial', '550e8400-e29b-41d4-a716-446655440003',
 '{"eventId": "evt-chel-sea-67890", "eventName": "Chelsea vs Arsenal", "oldOdds": {"home": "2.10", "draw": "3.40", "away": "3.20"}, "newOdds": {"home": "1.95", "draw": "3.60", "away": "3.80"}, "marketType": "match_odds", "financialImpact": 35000, "reason": "Market movement due to team news"}',
 '{"automated_update": true, "confidence_score": 0.85}',
 'high', 3, 0),

('750e8400-e29b-41d4-a716-446655440003', 'promotion_approval', 'rejected', 'manager_review', '550e8400-e29b-41d4-a716-446655440001',
 '{"title": "Free Bet Weekend Promotion", "promotionType": "free_bets", "value": 10, "duration": "weekend", "targetAudience": "high_rollers", "estimatedCost": 50000, "expectedRevenue": 75000}',
 '{"compliance_reviewed": true, "legal_approved": true, "marketing_feedback": "Too aggressive for target audience"}',
 'medium', 4, 2);

-- Insert sample workflow approvals
INSERT INTO workflow_approvals (id, workflow_id, step_id, approver, status, comments, decided_at, approval_type) VALUES
('850e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440000', 'content_review', '550e8400-e29b-41d4-a716-446655440002', 'approved', 'Content quality looks good', '2024-01-10T10:30:00.000Z', 'standard'),
('850e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440000', 'manager_review', '550e8400-e29b-41d4-a716-446655440001', 'approved', 'Approved for publication', '2024-01-10T14:15:00.000Z', 'standard'),
('850e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440001', 'initial_review', '550e8400-e29b-41d4-a716-446655440003', 'approved', 'Line change justified by injury report', '2024-01-11T09:45:00.000Z', 'standard'),
('850e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440003', 'manager_review', '550e8400-e29b-41d4-a716-446655440001', 'rejected', 'Promotion too costly for expected return', '2024-01-09T16:20:00.000Z', 'standard');

-- Insert sample workflow history
INSERT INTO workflow_history (id, workflow_id, action, actor, timestamp, details, old_status, new_status) VALUES
('950e8400-e29b-41d4-a716-446655440000', '750e8400-e29b-41d4-a716-446655440000', 'created', '550e8400-e29b-41d4-a716-446655440001', '2024-01-10T09:00:00.000Z', '{"workflow_type": "content_publishing"}', null, 'pending'),
('950e8400-e29b-41d4-a716-446655440001', '750e8400-e29b-41d4-a716-446655440000', 'started', '550e8400-e29b-41d4-a716-446655440001', '2024-01-10T09:15:00.000Z', '{}', 'pending', 'in_progress'),
('950e8400-e29b-41d4-a716-446655440002', '750e8400-e29b-41d4-a716-446655440000', 'approved', '550e8400-e29b-41d4-a716-446655440002', '2024-01-10T10:30:00.000Z', '{"step": "content_review"}', 'in_progress', 'in_progress'),
('950e8400-e29b-41d4-a716-446655440003', '750e8400-e29b-41d4-a716-446655440000', 'approved', '550e8400-e29b-41d4-a716-446655440001', '2024-01-10T14:15:00.000Z', '{"step": "manager_review"}', 'in_progress', 'completed'),
('950e8400-e29b-41d4-a716-446655440004', '750e8400-e29b-41d4-a716-446655440000', 'completed', 'system', '2024-01-10T14:15:00.000Z', '{"auto_completed": true}', 'completed', 'completed');

-- Insert sample analytics data
INSERT INTO audit_logs (id, user_id, action, resource, resource_id, method, url, ip_address, response_status, timestamp) VALUES
('a50e8400-e29b-41d4-a716-446655440000', '550e8400-e29b-41d4-a716-446655440001', 'create', 'workflow', '750e8400-e29b-41d4-a716-446655440000', 'POST', '/api/v1/workflows', '192.168.1.100', 201, '2024-01-10T09:00:00.000Z'),
('a50e8400-e29b-41d4-a716-446655440001', '550e8400-e29b-41d4-a716-446655440002', 'approve', 'workflow', '750e8400-e29b-41d4-a716-446655440000', 'POST', '/api/v1/workflows/750e8400-e29b-41d4-a716-446655440000/approve', '192.168.1.101', 200, '2024-01-10T10:30:00.000Z'),
('a50e8400-e29b-41d4-a716-446655440002', '550e8400-e29b-41d4-a716-446655440003', 'create', 'workflow', '750e8400-e29b-41d4-a716-446655440001', 'POST', '/api/v1/betting/lines/change', '192.168.1.102', 201, '2024-01-11T08:30:00.000Z');

-- Password for all users is: password123 (hashed)
-- API Key for system-integration: system-integration-key-12345
-- API Key for content-management: content-management-key-67890
-- API Key for trading-system: trading-system-key-abcde
