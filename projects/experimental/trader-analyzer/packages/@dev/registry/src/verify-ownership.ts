#!/usr/bin/env bun

/**
 * @dev/registry - Registry Ownership Verification
 * 
 * Verifies package ownership and team permissions before publishing
 */

interface PackageMetadata {
	name: string;
	version: string;
	metadata?: {
		team?: {
			lead?: string;
			maintainers?: string[];
			owners?: string[];
		};
		ownership?: {
			scope: string;
			team: string;
			repository?: string;
		};
	};
}

interface RegistryResponse {
	success: boolean;
	package?: PackageMetadata;
	error?: string;
}

/**
 * Verify current user has permission to publish package
 */
export async function verifyOwnership(
	packageName: string,
	registryUrl: string = "https://npm.internal.yourcompany.com",
	token?: string,
): Promise<boolean> {
	const authToken = token || process.env.GRAPH_NPM_TOKEN;

	if (!authToken) {
		throw new Error("GRAPH_NPM_TOKEN environment variable is required");
	}

	// Get current user from registry
	const userResponse = await fetch(`${registryUrl}/api/v1/user`, {
		headers: {
			Authorization: `Bearer ${authToken}`,
		},
	});

	if (!userResponse.ok) {
		throw new Error("Failed to authenticate with registry");
	}

	const user = await userResponse.json();

	// Get package metadata
	const packageResponse = await fetch(
		`${registryUrl}/api/v1/packages/${packageName}/metadata`,
		{
			headers: {
				Authorization: `Bearer ${authToken}`,
			},
		},
	);

	if (!packageResponse.ok) {
		if (packageResponse.status === 404) {
			// New package - check if user can create packages in this scope
			const scope = packageName.split("/")[0];
			return await verifyScopeAccess(scope, user.email, registryUrl, authToken);
		}
		throw new Error(`Failed to get package metadata: ${packageResponse.statusText}`);
	}

	const packageData: PackageMetadata = await packageResponse.json();

	// Check if user is owner, maintainer, or team lead
	const team = packageData.metadata?.team;
	if (!team) {
		throw new Error("Package metadata missing team information");
	}

	const userEmail = user.email.toLowerCase();
	const isOwner = team.owners?.some((o) => o.toLowerCase() === userEmail);
	const isMaintainer = team.maintainers?.some((m) => m.toLowerCase() === userEmail);
	const isLead = team.lead?.toLowerCase() === userEmail;

	if (isOwner || isMaintainer || isLead) {
		return true;
	}

	throw new Error(
		`User ${userEmail} does not have permission to publish ${packageName}. ` +
			`Required: owner, maintainer, or team lead.`,
	);
}

/**
 * Verify user has access to create packages in scope
 */
async function verifyScopeAccess(
	scope: string,
	userEmail: string,
	registryUrl: string,
	token: string,
): Promise<boolean> {
	const response = await fetch(`${registryUrl}/api/v1/scopes/${scope}/access`, {
		headers: {
			Authorization: `Bearer ${token}`,
		},
	});

	if (!response.ok) {
		return false;
	}

	const access = await response.json();
	return access.users?.some((u: string) => u.toLowerCase() === userEmail) || false;
}

/**
 * CLI entry point
 */
if (import.meta.main) {
	const packageName = process.argv[2];

	if (!packageName) {
		console.error("Usage: bun run verify-ownership.ts <package-name>");
		console.error("Example: bun run verify-ownership.ts @graph/layer4");
		process.exit(1);
	}

	verifyOwnership(packageName)
		.then((hasAccess) => {
			if (hasAccess) {
				console.log(`✅ Verified ownership for ${packageName}`);
				process.exit(0);
			} else {
				console.error(`❌ No ownership verified for ${packageName}`);
				process.exit(1);
			}
		})
		.catch((error) => {
			console.error(`❌ Error verifying ownership: ${error.message}`);
			process.exit(1);
		});
}
