-- Reviewed snapshot query for delivered foundation work.
-- Upstream: ../foundation-commits.txt

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

CREATE TEMP TABLE foundation_commits AS
SELECT 1 AS sequence, 'b07bc493f' AS "commit", 'Bun runtime' AS area, 'Grounded recent release behavior in exact-version contracts' AS outcome, 'Release, Web API, TOML, fetch, file, and WebSocket tests' AS proof
UNION ALL SELECT 2, 'b53e4b2ad', 'Bun channels', 'Added read-only stable, canary, tip, feed, and type governance', 'Channel doctor CLI, worker, cron, and tests'
UNION ALL SELECT 3, '96a1aaacf', 'Partner domain', 'Established the package scaffold, semantic map, and dashboard planning SSOT', 'Plan validator and package contract tests'
UNION ALL SELECT 4, '0d8a42f6a', 'Accounting', 'Added integer-money migration and SQL lint enforcement', 'Migration, rollback, lint, and pre-commit tests'
UNION ALL SELECT 5, 'fcae7ddfb', 'Type contracts', 'Tracked compile-only snapshot contracts', 'Dedicated snapshot tsconfig and type check'
UNION ALL SELECT 6, '07962dae9', 'Agent operations', 'Added the Project R operations skill and command map', 'Skill validation and registry tests'
UNION ALL SELECT 7, 'e84868d33', 'Bun cron', 'Made cron verification release-aware and CLI-deterministic', '46 of 46 demos and 73 of 73 API checks';

SELECT * FROM mvp_overview;
SELECT * FROM foundation_commits ORDER BY sequence;
