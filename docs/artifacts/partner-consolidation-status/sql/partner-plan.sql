-- Reviewed snapshot query for the connector proposal.
-- Upstream: docs/design/partner-dashboard-mvp.toml

CREATE TEMP TABLE mvp_overview AS
SELECT
  0 AS canonicalProfiles,
  4 AS profileTarget,
  14 AS implementedComponents,
  18 AS totalComponents,
  8 AS connectors,
  1 AS blockedConnectors,
  4 AS legacyPartners,
  10 AS legacyOuts,
  15 AS semanticGaps;

CREATE TEMP TABLE connector_status_summary AS
SELECT 'Planned' AS status, 3 AS count, 'Connector contract exists; its source adapter is not implemented' AS meaning
UNION ALL SELECT 'Partial', 3, 'Observation parser is implemented; loading, resilience, or reconciliation remains'
UNION ALL SELECT 'Blocked', 1, 'Sports Terminal lacks its exact parsed and authenticated boundary'
UNION ALL SELECT 'Compatibility', 1, 'Legacy operations visibility is temporary and excluded from canonical authority';

CREATE TEMP TABLE connector_inventory AS
SELECT 1 AS "order", 'canonical-profile-config' AS connector, 'partners' AS owner, 'planned' AS status, 'Profiles and lifecycle' AS nextAction
UNION ALL SELECT 2, 'accounting-ledger', 'accounting', 'planned', 'Scoped integer money'
UNION ALL SELECT 3, 'telegram-handshake', 'telegram', 'partial', 'Loader, resilience, and dashboard reconciliation'
UNION ALL SELECT 4, 'limits-registry', 'compliance', 'partial', 'Change-event attention reconciliation'
UNION ALL SELECT 5, 'bookmakers-registry', 'trading', 'planned', 'Sportsbook ID aliases'
UNION ALL SELECT 6, 'tennis-contract', 'trading', 'partial', 'Loader, LKG resilience, and execution reconciliation'
UNION ALL SELECT 7, 'sports-terminal', 'trading', 'blocked', 'Input, IDs, auth, money'
UNION ALL SELECT 8, 'legacy-ops-registry', 'partners', 'current-compatibility', 'Zero usage and schema v2';

SELECT * FROM mvp_overview;
SELECT * FROM connector_status_summary;
SELECT * FROM connector_inventory ORDER BY "order";
