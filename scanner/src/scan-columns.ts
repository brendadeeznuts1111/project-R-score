// scan-columns.ts — Scanner Column Schema

export const BUN_SCANNER_COLUMNS = {
	// Main Project Table
	PROJECT_SCAN: [
		{key: 'idx', header: '#', width: 4, default: 0},
		{key: 'status', header: 'Status', width: 8, default: '-'},
		{key: 'folder', header: 'Project', width: 28, default: 'unknown'},
		{key: 'name', header: 'Package Name', width: 34, default: 'unknown'},
		{key: 'version', header: 'Version', width: 12, default: '0.0.0'},
		{key: 'configVersion', header: 'Ver', width: 4, default: 0},
		{key: 'bunVersion', header: 'Bun', width: 10, default: '>=1.3.8'},
		{key: 'lockfile', header: 'Lock', width: 10, default: 'bun.lock'},
		{key: 'registry', header: 'Registry', width: 24, default: 'npm'},
		{key: 'token', header: 'Token', width: 10, default: '-'},
		{key: 'workspaces', header: 'Workspaces', width: 20, default: '-'},
		{key: 'hasTests', header: 'Tests', width: 6, default: '-'},
		{key: 'workspace', header: 'WS', width: 4, default: 'no'},
		{key: 'linker', header: 'Linker', width: 20, default: 'hoisted'},
		{key: 'trustedDeps', header: 'Trusted', width: 10, default: '-'},
		{key: 'nativeDeps', header: 'Native', width: 10, default: '-'},
		{key: 'scripts', header: 'Scripts', width: 20, default: '-'},
		{key: 'envVars', header: 'Env Vars', width: 20, default: '-'},
	] as const,

	// Delta/XRef Summary (Footer)
	DELTA_FOOTER: [
		{key: 'snapshotDate', header: 'Snapshot', width: 12, default: ''},
		{key: 'projectsDelta', header: 'Projects Δ', width: 10, default: '0'},
		{key: 'trustedDelta', header: 'Trusted Δ', width: 10, default: '0'},
		{key: 'nativeDelta', header: 'Native Δ', width: 10, default: '0'},
		{key: 'linkerChanges', header: 'Linker Δ', width: 10, default: '0'},
		{key: 'driftStatus', header: 'Drift', width: 10, default: 'none'},
	] as const,

	// Audit Trail (JSONL)
	AUDIT_LOG: [
		{key: 'timestamp', header: 'Timestamp', width: 24, default: () => new Date().toISOString()},
		{key: 'scanDuration', header: 'Duration(ms)', width: 12, default: 0},
		{key: 'projectsScanned', header: 'Projects', width: 8, default: 0},
		{key: 'projectsChanged', header: 'Changed', width: 8, default: 0},
		{key: 'snapshotHash', header: 'Hash', width: 16, default: ''},
		{key: 'driftDetected', header: 'Drift', width: 8, default: false},
		{key: 'user', header: 'User', width: 16, default: () => Bun.env.USER ?? 'unknown'},
		{key: 'cwd', header: 'CWD', width: 40, default: () => import.meta.dir},
	] as const,
	// Advisory Matches
	ADVISORY_MATCHES: [
		{key: 'advisory', header: 'Advisory', width: 40, default: ''},
		{key: 'date', header: 'Date', width: 12, default: ''},
		{key: 'link', header: 'Link', width: 32, default: ''},
		{key: 'packages', header: 'Packages', width: 28, default: ''},
		{key: 'projects', header: 'Projects', width: 28, default: ''},
	] as const,

	// Lifecycle Hooks
	LIFECYCLE_HOOKS: [
		{key: 'hook', header: 'Hook', width: 16, default: ''},
		{key: 'total', header: 'Total', width: 6, default: 0},
		{key: 'trust', header: 'Trust', width: 6, default: 0},
		{key: 'block', header: 'Block', width: 6, default: 0},
		{key: 'secure', header: 'Secure', width: 6, default: ''},
		{key: 'saved', header: 'Saved', width: 8, default: ''},
		{key: 'risk', header: 'Risk', width: 6, default: ''},
		{key: 'status', header: 'Status', width: 12, default: ''},
		{key: 'native', header: 'Native', width: 6, default: ''},
		{key: 'covPct', header: 'Cov%', width: 6, default: ''},
		{key: 'owner', header: 'Owner', width: 16, default: ''},
		{key: 'action', header: 'Action', width: 48, default: ''},
	] as const,

	// Bunfig Coverage
	BUNFIG_COVERAGE: [
		{key: 'setting', header: 'Setting', width: 18, default: ''},
		{key: 'count', header: 'Count', width: 10, default: ''},
		{key: 'description', header: 'Description', width: 40, default: ''},
	] as const,

	// Infrastructure Readiness
	INFRA_READINESS: [
		{key: 'field', header: 'Field', width: 16, default: ''},
		{key: 'count', header: 'Count', width: 8, default: ''},
		{key: 'pct', header: '%', width: 6, default: ''},
		{key: 'status', header: 'Status', width: 10, default: ''},
		{key: 'description', header: 'Description', width: 40, default: ''},
	] as const,

	// Enhanced RSS Feed Analysis
	RSS_ENHANCED: [
		{key: 'id', header: 'ID', width: 4, default: 0},
		{key: 'version', header: 'Version', width: 34, default: ''},
		{key: 'date', header: 'Date', width: 12, default: ''},
		{key: 'link', header: 'Link', width: 32, default: ''},
		{key: 'category', header: 'Category', width: 10, default: 'release'},
		{key: 'rScore', header: 'R-Score', width: 8, default: 1.0},
		{key: 'confidence', header: 'C', width: 4, default: 1},
		{key: 'engagement', header: 'E', width: 5, default: 0},
		{key: 'subscribers', header: 'S', width: 8, default: 0},
		{key: 'vulnerabilities', header: 'V', width: 4, default: 0},
		{key: 'status', header: 'Status', width: 8, default: 'stable'},
		{key: 'defaultAction', header: 'Default', width: 14, default: ''},
		{key: 'command', header: 'Command', width: 22, default: ''},
		{key: 'carbon', header: 'Carbon', width: 8, default: '0µg'},
		{key: 'risk', header: 'Risk', width: 6, default: 'LOW'},
		{key: 'optimal', header: 'Optimal', width: 8, default: ''},
		{key: 'delta', header: 'Delta', width: 32, default: ''},
		{key: 'guid', header: 'GUID', width: 10, default: ''},
		{key: 'pubDate', header: 'Pub', width: 32, default: ''},
		{key: 'type', header: 'Type', width: 6, default: 'RSS'},
		{key: 'feed', header: 'Feed', width: 18, default: ''},
		{key: 'isArchived', header: 'Archived', width: 10, default: false},
	] as const,
} as const;
