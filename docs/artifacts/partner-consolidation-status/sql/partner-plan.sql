-- Reviewed snapshot query for the connector contract.
-- Upstream: docs/design/partner-dashboard-mvp.toml

CREATE TEMP TABLE mvp_overview AS
SELECT
  33 AS semanticBindings,
  15 AS semanticGaps,
  8 AS connectors,
  1 AS blockedConnectors,
  0 AS canonicalProfiles,
  4 AS profileTarget,
  9 AS sectionMounts,
  6 AS hashRoutes,
  31 AS presentationStates,
  7 AS foundationCommits,
  2 AS intentionalTodos;

CREATE TEMP TABLE connector_status_summary AS
SELECT 'Planned' AS status, 6 AS count, 'Contracted adapter and port; implementation not started' AS meaning
UNION ALL SELECT 'Blocked', 1, 'Sports Terminal requires one exact versioned input contract'
UNION ALL SELECT 'Compatibility', 1, 'Legacy operations projection retained only through migration';

CREATE TEMP TABLE connector_inventory AS
SELECT 1 AS "order", 'profiles-registry' AS connector, 'partners' AS owner, 'planned' AS status, 'yes' AS required, 'Materialize and parse the first canonical profiles' AS nextAction
UNION ALL SELECT 2, 'accounting-ledger', 'accounting', 'planned', 'no', 'Read integer minor-unit balances through AccountingReadPort'
UNION ALL SELECT 3, 'telegram-handshake', 'telegram', 'planned', 'no', 'Project readiness only; preserve transport boundary'
UNION ALL SELECT 4, 'limits-registry', 'compliance', 'planned', 'no', 'Adapt per-out coverage without owning identity'
UNION ALL SELECT 5, 'bookmakers-registry', 'trading', 'planned', 'no', 'Resolve SportsbookId and display metadata'
UNION ALL SELECT 6, 'tennis-contract', 'trading', 'planned', 'no', 'Reuse strict parsing and last-known-good reliability pattern'
UNION ALL SELECT 7, 'sports-terminal', 'trading', 'blocked', 'no', 'Select one exact versioned package export or registry artifact'
UNION ALL SELECT 8, 'legacy-ops-registry', 'partners', 'current-compatibility', 'no', 'Instrument usage and remove under artifact schema v2';

SELECT * FROM mvp_overview;
SELECT * FROM connector_status_summary;
SELECT * FROM connector_inventory ORDER BY "order";
