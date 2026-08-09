-- Reviewed snapshot query for the remaining proposal sequence.
-- Upstream: docs/design/partner-dashboard-mvp.md
-- Upstream: docs/design/partner-type-reference-map.md

CREATE TEMP TABLE work_queue AS
SELECT 1 AS "order", 'Anchor' AS phase, 'Materialize canonical profile coverage and the private profile connector' AS workItem, 'ready' AS state, 'Partner profile source review' AS dependency, 'All four current CODEs have parsed coverage and lifecycle provenance' AS doneWhen
UNION ALL SELECT 2, 'Anchor', 'Register the remaining semantic concepts', 'ready', 'Concept-owner review', 'The plan has no unresolved proposal concepts required by the portal slice'
UNION ALL SELECT 3, 'Boundary', 'Sports Terminal IntegrationHealthReadPort', 'implemented', 'Sports Terminal owner', 'Registry fixture + authenticated /api/v1/partners/integration-health + pure adapter'
UNION ALL SELECT 4, 'Build', 'Implement canonical source adapters and reconciliation', 'queued', 'Profile and connector contracts', 'All connector snapshots emit parsed facts with provenance and resilience'
UNION ALL SELECT 5, 'Cutover', 'Bake the canonical dashboard artifact and switch the portal loader', 'queued', 'Reconciliation and complete coverage', 'The portal reads one canonical artifact and performs no domain joins'
UNION ALL SELECT 6, 'Retire', 'Measure and remove legacy compatibility', 'queued', 'Canonical consumer adoption', 'Legacy use remains zero for the retirement window and schema v2 removes legacyOps';

SELECT * FROM work_queue ORDER BY "order";
