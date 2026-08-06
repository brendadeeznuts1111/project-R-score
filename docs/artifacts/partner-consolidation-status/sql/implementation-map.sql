-- Reviewed snapshot query for the remaining implementation queue.
-- Upstream: docs/design/partner-dashboard-mvp.md
-- Upstream: docs/design/partner-type-reference-map.md

CREATE TEMP TABLE remaining_work_summary AS
SELECT 'Anchor' AS phase, 3 AS count, 'Register concepts, materialize profiles, and resolve the Sports Terminal input' AS goal
UNION ALL SELECT 'Build', 5, 'Implement core types, ingress, adapters, projection, and portal consumption'
UNION ALL SELECT 'Harden', 3, 'Automate retirement, observe legacy usage, and complete money rollout';

CREATE TEMP TABLE remaining_work_stack AS
SELECT 'MVP remaining' AS scope, 'Anchor' AS phase, 3 AS count
UNION ALL SELECT 'MVP remaining', 'Build', 5
UNION ALL SELECT 'MVP remaining', 'Harden', 3;

CREATE TEMP TABLE remaining_work_burndown AS
SELECT 0 AS step, 'Start' AS phase, 11 AS remaining
UNION ALL SELECT 1, 'After Anchor', 8
UNION ALL SELECT 2, 'After Build', 3
UNION ALL SELECT 3, 'After Harden', 0;

CREATE TEMP TABLE work_queue AS
SELECT 1 AS "order", 'Anchor' AS phase, 'Register the 15 explicit semantic gaps' AS workItem, 'ready' AS state, 'Concept-owner review' AS dependency, 'The plan validates as implementation-ready with no unregistered proposal gaps' AS doneWhen
UNION ALL SELECT 2, 'Anchor', 'Materialize canonical profiles for the four current partner CODEs', 'ready', 'Partner profile source review', 'Profile bake contains four parsed profiles and passes coverage tests'
UNION ALL SELECT 3, 'Anchor', 'Choose the Sports Terminal v2 input contract', 'blocked', 'Sports Terminal owner', 'One versioned parsed input replaces the unresolved connector input'
UNION ALL SELECT 4, 'Build', 'Implement canonical brands, facts, ports, and parsers', 'queued', 'Concept registration', 'Core exports parse PartnerCode, OutId, lifecycle provenance, refs, scope, and money'
UNION ALL SELECT 5, 'Build', 'Implement IngressTranslator and runtime edge enforcement', 'queued', 'Canonical OutId parser', 'CODE-N is translated only at ingress with telemetry and unknown aliases are rejected'
UNION ALL SELECT 6, 'Build', 'Implement the seven canonical adapters and one compatibility adapter', 'queued', 'Core ports and source fixtures', 'Each connector emits parsed facts with resilience and provenance'
UNION ALL SELECT 7, 'Build', 'Build the partner read-model projection and registry bake', 'queued', 'Profiles and adapter contracts', 'partners-dashboard.json v1 is deterministic, validated, and last-known-good safe'
UNION ALL SELECT 8, 'Build', 'Move /portal/partners onto the single dashboard artifact', 'queued', 'Read-model bake', 'The browser performs no domain joins and specialist boards remain deep links'
UNION ALL SELECT 9, 'Harden', 'Wire the weekly legacy-ops cutoff check and notification', 'queued', 'Owned notification target', 'The 2026-11-03 cutoff is enforced and alerts are observable'
UNION ALL SELECT 10, 'Harden', 'Measure legacy ingress and compatibility usage', 'queued', 'Ingress and legacy adapters', 'Both counters remain at zero for the required 30-day retirement window'
UNION ALL SELECT 11, 'Harden', 'Execute the production integer-money cutover', 'queued', 'Reviewed database inventory and rollout window', 'Backfill, dual-read/write transition, verification, finalize, and rollback evidence are complete';

SELECT * FROM remaining_work_summary;
SELECT * FROM remaining_work_stack;
SELECT * FROM remaining_work_burndown ORDER BY step;
SELECT * FROM work_queue ORDER BY "order";
