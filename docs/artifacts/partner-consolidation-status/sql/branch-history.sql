-- Reviewed snapshot query for delivered partner-branch work.
-- Upstream: ../foundation-commits.txt

CREATE TEMP TABLE foundation_commits AS
SELECT 1 AS sequence, 'e4b263806' AS "commit", 'Artifact core' AS area, 'Added the canonical dashboard artifact core' AS outcome
UNION ALL SELECT 2, '69594188a', 'Compatibility', 'Added the selective legacy operations adapter'
UNION ALL SELECT 3, '529f558db', 'Portal contract', 'Defined the portal consumer contract'
UNION ALL SELECT 4, 'eecad4dcc', 'Transition', 'Made the portal transition contract durable'
UNION ALL SELECT 5, 'e79fe8f66', 'Retirement', 'Made legacy comparison retirement explicit'
UNION ALL SELECT 6, 'c37c25d34', 'Coverage', 'Added the redacted profile coverage boundary'
UNION ALL SELECT 7, '5ac802b4b', 'Portal transport', 'Adopted the shared portal fetch transport'
UNION ALL SELECT 8, '1a933d7a2', 'Boundary alignment', 'Aligned executable dashboard boundary contracts'
UNION ALL SELECT 9, 'fa7747de8', 'Documentation', 'Aligned the dashboard SSOT maps';

SELECT * FROM foundation_commits ORDER BY sequence;
