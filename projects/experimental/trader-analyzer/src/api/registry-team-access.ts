/**
 * @fileoverview Private Registry: Team-Based Access Control
 * @description Team-based package ownership and publishing permissions
 * @module api/registry-team-access
 * 
 * Implements team-based access control for private npm registry:
 * - Team package ownership mapping
 * - Team lead and maintainer verification
 * - Package publishing authorization
 * - Maintainer management
 * 
 * @see {@link ../docs/TEAM-ORGANIZATION-PACKAGE-OWNERSHIP.md|Team Organization Documentation}
 */

import { Database } from 'bun:sqlite';
import type { Elysia } from 'elysia';

// Team-based package ownership
const TEAM_PACKAGES = {
	'sports-correlation': ['@graph/layer4', '@graph/layer3'],
	'market-analytics': ['@graph/layer2', '@graph/layer1'],
	'platform-tools': [
		'@graph/algorithms',
		'@graph/storage',
		'@graph/streaming',
		'@graph/utils',
		'@bench/layer4',
		'@bench/layer3',
		'@bench/layer2',
		'@bench/layer1',
		'@bench/property',
		'@bench/stress',
	],
} as const;

const TEAM_LEADS = {
	'sports-correlation': 'alex.chen@yourcompany.com',
	'market-analytics': 'sarah.kumar@yourcompany.com',
	'platform-tools': 'mike.rodriguez@yourcompany.com',
} as const;

// Package maintainer mapping (from team organization doc)
const PACKAGE_MAINTAINERS: Record<string, string> = {
	'@graph/layer4': 'jordan.lee@yourcompany.com',
	'@graph/layer3': 'priya.patel@yourcompany.com',
	'@graph/layer2': 'tom.wilson@yourcompany.com',
	'@graph/layer1': 'lisa.zhang@yourcompany.com',
	'@graph/algorithms': 'david.kim@yourcompany.com',
	'@graph/storage': 'emma.brown@yourcompany.com',
	'@graph/streaming': 'emma.brown@yourcompany.com',
	'@graph/utils': 'mike.rodriguez@yourcompany.com',
	'@bench/layer4': 'ryan.gupta@yourcompany.com',
	'@bench/layer3': 'ryan.gupta@yourcompany.com',
	'@bench/layer2': 'ryan.gupta@yourcompany.com',
	'@bench/layer1': 'ryan.gupta@yourcompany.com',
	'@bench/property': 'ryan.gupta@yourcompany.com',
	'@bench/stress': 'ryan.gupta@yourcompany.com',
};

type TeamId = keyof typeof TEAM_PACKAGES;
type PackageName = string;

/**
 * Get team ID for a given package name
 */
function getTeamForPackage(packageName: PackageName): TeamId | null {
	for (const [teamId, packages] of Object.entries(TEAM_PACKAGES)) {
		// Check exact match
		if (packages.includes(packageName as any)) {
			return teamId as TeamId;
		}
		// Check wildcard patterns (e.g., '@bench/*')
		for (const pkg of packages) {
			if (pkg.includes('*')) {
				const pattern = pkg.replace('*', '.*');
				const regex = new RegExp(`^${pattern}$`);
				if (regex.test(packageName)) {
					return teamId as TeamId;
				}
			}
		}
	}
	return null;
}

/**
 * Check if user is a team lead for the given team
 */
function isTeamLead(userEmail: string, teamId: TeamId | null): boolean {
	if (!teamId) return false;
	return TEAM_LEADS[teamId] === userEmail;
}

/**
 * Check if user is a maintainer for the given package
 */
function isMaintainer(userEmail: string, packageName: PackageName): boolean {
	const maintainerEmail = PACKAGE_MAINTAINERS[packageName];
	return maintainerEmail === userEmail;
}

/**
 * Get user from authentication token
 * TODO: Implement actual JWT/token verification
 */
async function getUserFromToken(token: string): Promise<{ email: string; name: string }> {
	// Placeholder implementation - replace with actual auth logic
	// This should verify JWT token and extract user info
	if (!token) {
		throw new Error('No authentication token provided');
	}

	// Mock implementation - replace with real token verification
	// Example: const decoded = jwt.verify(token, process.env.JWT_SECRET);
	return {
		email: 'user@yourcompany.com', // Extract from token
		name: 'User Name', // Extract from token
	};
}

/**
 * Initialize database schema if needed
 */
function initDatabase(db: Database): void {
	// Create publications table
	db.exec(`
		CREATE TABLE IF NOT EXISTS publications (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			package_name TEXT NOT NULL,
			version TEXT NOT NULL,
			published_by TEXT NOT NULL,
			timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX IF NOT EXISTS idx_publications_package ON publications(package_name);
		CREATE INDEX IF NOT EXISTS idx_publications_timestamp ON publications(timestamp);
	`);

	// Create users table (if not exists)
	db.exec(`
		CREATE TABLE IF NOT EXISTS users (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			email TEXT UNIQUE NOT NULL,
			name TEXT NOT NULL,
			role TEXT DEFAULT 'viewer'
		);

		CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
	`);

	// Create package_maintainers table (if not exists)
	db.exec(`
		CREATE TABLE IF NOT EXISTS package_maintainers (
			id INTEGER PRIMARY KEY AUTOINCREMENT,
			package_name TEXT NOT NULL,
			user_id INTEGER NOT NULL,
			FOREIGN KEY (user_id) REFERENCES users(id),
			UNIQUE(package_name, user_id)
		);

		CREATE INDEX IF NOT EXISTS idx_package_maintainers_package ON package_maintainers(package_name);
	`);

	// Insert default maintainers from PACKAGE_MAINTAINERS mapping
	const insertUser = db.prepare(`
		INSERT OR IGNORE INTO users (email, name, role)
		VALUES (?, ?, 'maintainer')
	`);

	const insertMaintainer = db.prepare(`
		INSERT OR IGNORE INTO package_maintainers (package_name, user_id)
		SELECT ?, id FROM users WHERE email = ?
	`);

	const transaction = db.transaction(() => {
		for (const [packageName, maintainerEmail] of Object.entries(PACKAGE_MAINTAINERS)) {
			// Extract name from email (simple approach)
			const name = maintainerEmail.split('@')[0].replace(/\./g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
			insertUser.run(maintainerEmail, name);
			insertMaintainer.run(packageName, maintainerEmail);
		}
	});

	transaction();
}

/**
 * Create Elysia app with team-based access control routes
 */
export function createTeamAccessRoutes(app: Elysia): Elysia {
	const db = new Database('registry.db');
	initDatabase(db);

	/**
	 * Verify team lead or maintainer can publish package
	 * @route POST /api/v1/publish/:package
	 */
	app.post('/api/v1/publish/:package', async ({ params, headers, body }) => {
		try {
			const authToken = headers['authorization']?.replace('Bearer ', '');
			if (!authToken) {
				return { error: 'No authentication token provided' }, 401;
			}

			const user = await getUserFromToken(authToken);
			const packageName = params.package as string;
			const team = getTeamForPackage(packageName);

			if (!team) {
				return { error: `Package ${packageName} not found in any team` }, 404;
			}

			const isLead = isTeamLead(user.email, team);
			const isPkgMaintainer = isMaintainer(user.email, packageName);

			if (!isLead && !isPkgMaintainer) {
				return {
					error: 'Only team leads or maintainers can publish this package',
					package: packageName,
					team,
					user: user.email,
				}, 403;
			}

			// Store publication record
			const version = body?.version || 'unknown';
			db.prepare(`
				INSERT INTO publications (package_name, version, published_by, timestamp)
				VALUES (?, ?, ?, datetime('now'))
			`).run(packageName, version, user.email);

			return {
				success: true,
				package: packageName,
				version,
				published_by: user.email,
				role: isLead ? 'team-lead' : 'maintainer',
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { error: 'Failed to publish package', message }, 500;
		}
	});

	/**
	 * Get package maintainers
	 * @route GET /api/v1/packages/:package/maintainers
	 */
	app.get('/api/v1/packages/:package/maintainers', async ({ params }) => {
		try {
			const packageName = params.package as string;
			const team = getTeamForPackage(packageName);

			if (!team) {
				return { error: `Package ${packageName} not found` }, 404;
			}

			const maintainers = db.prepare(`
				SELECT u.email, u.name, u.role 
				FROM package_maintainers pm
				JOIN users u ON pm.user_id = u.id
				WHERE pm.package_name = ?
			`).all(packageName);

			const teamLead = TEAM_LEADS[team];

			return {
				package: packageName,
				team,
				team_lead: teamLead,
				maintainers: maintainers.map((m: any) => ({
					email: m.email,
					name: m.name,
					role: m.role,
				})),
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { error: 'Failed to get maintainers', message }, 500;
		}
	});

	/**
	 * Get all packages for a team
	 * @route GET /api/v1/teams/:team/packages
	 */
	app.get('/api/v1/teams/:team/packages', async ({ params }) => {
		try {
			const teamId = params.team as TeamId;
			if (!TEAM_PACKAGES[teamId]) {
				return { error: `Team ${teamId} not found` }, 404;
			}

			const packages = TEAM_PACKAGES[teamId];
			const teamLead = TEAM_LEADS[teamId];

			return {
				team: teamId,
				team_lead: teamLead,
				packages: packages.map((pkg) => ({
					name: pkg,
					maintainer: PACKAGE_MAINTAINERS[pkg] || null,
				})),
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { error: 'Failed to get team packages', message }, 500;
		}
	});

	/**
	 * Get publication history for a package
	 * @route GET /api/v1/packages/:package/publications
	 */
	app.get('/api/v1/packages/:package/publications', async ({ params }) => {
		try {
			const packageName = params.package as string;
			const publications = db.prepare(`
				SELECT package_name, version, published_by, timestamp
				FROM publications
				WHERE package_name = ?
				ORDER BY timestamp DESC
				LIMIT 50
			`).all(packageName);

			return {
				package: packageName,
				publications: publications.map((p: any) => ({
					version: p.version,
					published_by: p.published_by,
					timestamp: p.timestamp,
				})),
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			return { error: 'Failed to get publications', message }, 500;
		}
	});

	return app;
}

/**
 * Export helper functions for use in other modules
 */
export { getTeamForPackage, isMaintainer, isTeamLead, PACKAGE_MAINTAINERS, TEAM_LEADS, TEAM_PACKAGES };

