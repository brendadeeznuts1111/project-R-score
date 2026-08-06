-- Reviewed snapshot query for validator-owned counts.
-- Upstream: scripts/validate-partner-dashboard-plan.ts
-- Evidence: ../validation.txt

CREATE TEMP TABLE contract_inventory AS
SELECT 1 AS "order", 'Semantic bindings' AS surface, 33 AS count, 'Existing registered concepts and surfaces reused by the plan' AS interpretation
UNION ALL SELECT 2, 'Explicit semantic gaps', 15, 'Proposals requiring registration; none are silently aliased'
UNION ALL SELECT 3, 'Connectors', 8, 'Canonical source and compatibility snapshot boundaries'
UNION ALL SELECT 4, 'Dashboard regions', 8, 'Operator-facing content regions'
UNION ALL SELECT 5, 'Section mounts', 9, 'Existing DOM composition mounts'
UNION ALL SELECT 6, 'Hash routes', 6, 'URL-addressable routes; intentionally fewer than mounts'
UNION ALL SELECT 7, 'Presentation states', 31, 'Theme recipes mapped after semantic surface selection'
UNION ALL SELECT 8, 'Profile coverage entries', 0, 'The missing readiness input that keeps the plan in proposal status';

SELECT * FROM contract_inventory ORDER BY "order";
