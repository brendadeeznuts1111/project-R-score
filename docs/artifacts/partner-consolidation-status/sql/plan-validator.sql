-- Reviewed snapshot query for validator-owned counts.
-- Upstream: scripts/validate-partner-dashboard-plan.ts
-- Evidence: ../validation.txt

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

CREATE TEMP TABLE contract_inventory AS
SELECT 1 AS "order", 'Semantic bindings' AS surface, 33 AS count, 'Existing registered concepts and surfaces reused by the plan' AS interpretation
UNION ALL SELECT 2, 'Explicit semantic gaps', 15, 'Proposals requiring registration; none are silently aliased'
UNION ALL SELECT 3, 'Connectors', 8, 'Seven canonical source boundaries plus legacy compatibility'
UNION ALL SELECT 4, 'Dashboard regions', 8, 'Operator-facing content regions'
UNION ALL SELECT 5, 'Section mounts', 9, 'Region placements in the dashboard composition'
UNION ALL SELECT 6, 'Hash routes', 6, 'URL-addressable routes; intentionally fewer than mounts'
UNION ALL SELECT 7, 'Presentation states', 31, 'Theme recipes mapped after semantic surface selection'
UNION ALL SELECT 8, 'Canonical profiles', 0, 'The missing runtime anchor that keeps the snapshot partial';

SELECT * FROM mvp_overview;
SELECT * FROM contract_inventory ORDER BY "order";
