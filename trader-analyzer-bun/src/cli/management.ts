#!/usr/bin/env bun
/**
 * @fileoverview Management & Integration CLI
 * @description Unified CLI for managing services, integrations, and configurations
 * @module cli/management
 */

// ANSI color codes
const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	magenta: "\x1b[35m",
	blue: "\x1b[34m",
};

// ============ Types ============

interface ServiceStatus {
	name: string;
	status: "running" | "stopped" | "error";
	port?: number;
	pid?: number;
	uptime?: number;
}

interface IntegrationStatus {
	name: string;
	type: "api" | "database" | "service" | "external";
	status: "connected" | "disconnected" | "error";
	lastCheck?: number;
	config?: Record<string, unknown>;
}

// ============ Service Management ============

async function checkServiceStatus(
	service: string,
): Promise<ServiceStatus | null> {
	try {
		// Check if service is running by checking port or process
		const { $ } = await import("bun");

		// Check common ports
		const portMap: Record<string, number> = {
			api: 3001,
			dashboard: 3000,
			mcp: 3002,
			telegram: 0, // No HTTP port
		};

		const port = portMap[service.toLowerCase()];
		if (port && port > 0) {
			try {
				const response = await fetch(`http://localhost:${port}/health`);
				if (response.ok) {
					return {
						name: service,
						status: "running",
						port,
					};
				}
			} catch {
				// Service not responding
			}
		}

		// Check process
		const result = await $`ps aux | grep -i ${service} | grep -v grep`.quiet();
		if (result.exitCode === 0 && result.stdout.toString().trim()) {
			return {
				name: service,
				status: "running",
			};
		}

		return {
			name: service,
			status: "stopped",
		};
	} catch (error) {
		return {
			name: service,
			status: "error",
		};
	}
}

async function listServices(): Promise<void> {
	console.log(`\n${c.cyan}${c.bold}Service Status${c.reset}\n`);

	const services = ["api", "dashboard", "mcp", "telegram"];
	const statuses = await Promise.all(
		services.map((s) => checkServiceStatus(s)),
	);

	for (const status of statuses) {
		if (!status) continue;

		const statusColor =
			status.status === "running"
				? c.green
				: status.status === "stopped"
					? c.yellow
					: c.red;

		const portInfo = status.port ? ` (port ${status.port})` : "";
		console.log(
			`  ${status.name.padEnd(15)} ${statusColor}${status.status.toUpperCase()}${c.reset}${portInfo}`,
		);
	}
	console.log();
}

// ============ Integration Management ============

async function checkIntegration(name: string): Promise<IntegrationStatus> {
	try {
		switch (name.toLowerCase()) {
			case "telegram": {
				const token = Bun.env.TELEGRAM_BOT_TOKEN;
				const chatId = Bun.env.TELEGRAM_CHAT_ID;
				return {
					name: "Telegram",
					type: "external",
					status: token && chatId ? "connected" : "disconnected",
					config: {
						tokenConfigured: !!token,
						chatIdConfigured: !!chatId,
					},
				};
			}

			case "database":
			case "sqlite": {
				try {
					const { Database } = await import("bun:sqlite");
					const db = new Database("./data/research.db", { create: false });
					db.close();
					return {
						name: "SQLite Database",
						type: "database",
						status: "connected",
					};
				} catch {
					return {
						name: "SQLite Database",
						type: "database",
						status: "disconnected",
					};
				}
			}

			case "api":
			case "registry": {
				try {
					const response = await fetch("http://localhost:3001/api/health");
					return {
						name: "API Server",
						type: "api",
						status: response.ok ? "connected" : "error",
						lastCheck: Date.now(),
					};
				} catch {
					return {
						name: "API Server",
						type: "api",
						status: "disconnected",
					};
				}
			}

			case "mcp": {
				const mcpConfig = Bun.env.MCP_SERVER_URL;
				return {
					name: "MCP Server",
					type: "service",
					status: mcpConfig ? "connected" : "disconnected",
					config: {
						urlConfigured: !!mcpConfig,
					},
				};
			}

			default:
				return {
					name,
					type: "external",
					status: "error",
				};
		}
	} catch (error) {
		return {
			name,
			type: "external",
			status: "error",
		};
	}
}

async function listIntegrations(): Promise<void> {
	console.log(`\n${c.cyan}${c.bold}Integration Status${c.reset}\n`);

	const integrations = ["telegram", "database", "api", "mcp"];
	const statuses = await Promise.all(
		integrations.map((i) => checkIntegration(i)),
	);

	for (const status of statuses) {
		const statusColor =
			status.status === "connected"
				? c.green
				: status.status === "disconnected"
					? c.yellow
					: c.red;

		const typeIcon =
			status.type === "api"
				? "🌐"
				: status.type === "database"
					? "💾"
					: status.type === "service"
						? "⚙️"
						: "🔗";

		console.log(
			`  ${typeIcon} ${status.name.padEnd(20)} ${statusColor}${status.status.toUpperCase()}${c.reset}`,
		);
	}
	console.log();
}

async function testIntegration(name: string): Promise<void> {
	console.log(`\n${c.yellow}Testing ${name} integration...${c.reset}\n`);

	const status = await checkIntegration(name);

	if (status.status === "connected") {
		console.log(`${c.green}✓${c.reset} ${status.name} is connected`);
		if (status.config) {
			console.log(`  Configuration:`, status.config);
		}
	} else {
		console.log(`${c.red}✗${c.reset} ${status.name} is ${status.status}`);
		console.log(
			`  ${c.dim}Check configuration and environment variables${c.reset}`,
		);
	}
	console.log();
}

// ============ Configuration Management ============

async function showConfig(): Promise<void> {
	console.log(`\n${c.cyan}${c.bold}Configuration${c.reset}\n`);

	const config = {
		"API Port": Bun.env.PORT || "3001",
		Environment: Bun.env.NODE_ENV || "development",
		"Bun Version": Bun.version,
		"Telegram Bot Token": Bun.env.TELEGRAM_BOT_TOKEN
			? "✓ Configured"
			: "✗ Not configured",
		"Telegram Chat ID": Bun.env.TELEGRAM_CHAT_ID
			? "✓ Configured"
			: "✗ Not configured",
		"MCP Server URL": Bun.env.MCP_SERVER_URL || "Not configured",
		"Database Path": "./data/research.db",
	};

	for (const [key, value] of Object.entries(config)) {
		const valueColor = value.includes("✓")
			? c.green
			: value.includes("✗")
				? c.red
				: c.reset;
		console.log(`  ${key.padEnd(25)} ${valueColor}${value}${c.reset}`);
	}
	console.log();
}

async function validateConfig(): Promise<void> {
	console.log(`\n${c.yellow}Validating configuration...${c.reset}\n`);

	const checks = [
		{
			name: "Telegram Bot Token",
			check: () => !!Bun.env.TELEGRAM_BOT_TOKEN,
			required: false,
		},
		{
			name: "Telegram Chat ID",
			check: () => !!Bun.env.TELEGRAM_CHAT_ID,
			required: false,
		},
		{
			name: "Database File",
			check: async () => {
				try {
					const file = Bun.file("./data/research.db");
					return await file.exists();
				} catch {
					return false;
				}
			},
			required: true,
		},
		{
			name: "API Server",
			check: async () => {
				try {
					const response = await fetch("http://localhost:3001/api/health");
					return response.ok;
				} catch {
					return false;
				}
			},
			required: false,
		},
	];

	for (const check of checks) {
		const result = await check.check();
		const icon = result ? `${c.green}✓${c.reset}` : `${c.red}✗${c.reset}`;
		const status = result ? "OK" : check.required ? "REQUIRED" : "OPTIONAL";
		console.log(`  ${icon} ${check.name.padEnd(25)} ${status}`);
	}
	console.log();
}

// ============ Health Check ============

async function healthCheck(): Promise<void> {
	console.log(`\n${c.cyan}${c.bold}System Health Check${c.reset}\n`);

	// Check services
	console.log(`${c.yellow}Services:${c.reset}`);
	await listServices();

	// Check integrations
	console.log(`${c.yellow}Integrations:${c.reset}`);
	await listIntegrations();

	// Check configuration
	console.log(`${c.yellow}Configuration:${c.reset}`);
	await validateConfig();
}

// ============ User Management ============

async function listUsers(): Promise<void> {
	console.log(`\n${c.cyan}${c.bold}Users${c.reset}\n`);

	try {
		const response = await fetch("http://localhost:3001/api/users", {
			headers: {
				"X-Dev-Bypass": "true",
			},
		});

		if (!response.ok) {
			console.log(`${c.red}Failed to fetch users: ${response.status}${c.reset}`);
			return;
		}

		const data = await response.json();
		const users = data.users || [];

		if (users.length === 0) {
			console.log(`${c.dim}No users found${c.reset}`);
			return;
		}

		console.log(`${c.dim}ID${c.reset}`.padEnd(25), `${c.dim}Username${c.reset}`.padEnd(15), `${c.dim}Role${c.reset}`.padEnd(10), `${c.dim}Email${c.reset}`);
		console.log("─".repeat(70));

		for (const user of users) {
			console.log(
				user.id.slice(0, 24).padEnd(25),
				user.username.padEnd(15),
				user.role.padEnd(10),
				user.email || "─",
			);
		}
	} catch (error) {
		console.log(`${c.red}Error fetching users: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
	}
	console.log();
}

async function createUser(args: string[]): Promise<void> {
	const [username, password, role = "readonly", email] = args;

	if (!username || !password) {
		console.log(`${c.red}Usage: users create <username> <password> [role] [email]${c.reset}`);
		console.log(`${c.dim}Example: users create john password123 trader john@example.com${c.reset}`);
		return;
	}

	console.log(`\n${c.yellow}Creating user ${username}...${c.reset}\n`);

	try {
		const response = await fetch("http://localhost:3001/api/users", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Dev-Bypass": "true",
			},
			body: JSON.stringify({
				username,
				password,
				role,
				email,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			console.log(`${c.red}Failed to create user: ${error.error || response.status}${c.reset}`);
			return;
		}

		const data = await response.json();
		console.log(`${c.green}✓${c.reset} User created successfully`);
		console.log(`  ID: ${data.user.id}`);
		console.log(`  Username: ${data.user.username}`);
		console.log(`  Role: ${data.user.role}`);
		if (data.user.email) {
			console.log(`  Email: ${data.user.email}`);
		}
	} catch (error) {
		console.log(`${c.red}Error creating user: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
	}
	console.log();
}

async function updateUser(args: string[]): Promise<void> {
	const [userId, ...updateArgs] = args;

	if (!userId || updateArgs.length === 0) {
		console.log(`${c.red}Usage: users update <userId> <field>=<value> [...fields]${c.reset}`);
		console.log(`${c.dim}Example: users update user_123 username=newname role=trader${c.reset}`);
		return;
	}

	const updates: Record<string, string> = {};
	for (const arg of updateArgs) {
		const [key, value] = arg.split("=");
		if (key && value) {
			updates[key] = value;
		}
	}

	console.log(`\n${c.yellow}Updating user ${userId}...${c.reset}\n`);

	try {
		const response = await fetch(`http://localhost:3001/api/users/${userId}`, {
			method: "PUT",
			headers: {
				"Content-Type": "application/json",
				"X-Dev-Bypass": "true",
			},
			body: JSON.stringify(updates),
		});

		if (!response.ok) {
			const error = await response.json();
			console.log(`${c.red}Failed to update user: ${error.error || response.status}${c.reset}`);
			return;
		}

		const data = await response.json();
		console.log(`${c.green}✓${c.reset} User updated successfully`);
		console.log(`  ID: ${data.user.id}`);
		console.log(`  Username: ${data.user.username}`);
		console.log(`  Role: ${data.user.role}`);
		if (data.user.email) {
			console.log(`  Email: ${data.user.email}`);
		}
	} catch (error) {
		console.log(`${c.red}Error updating user: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
	}
	console.log();
}

// ============ Role Management ============

async function listRoles(): Promise<void> {
	console.log(`\n${c.cyan}${c.bold}Roles${c.reset}\n`);

	try {
		const response = await fetch("http://localhost:3001/api/roles", {
			headers: {
				"X-Dev-Bypass": "true",
			},
		});

		if (!response.ok) {
			console.log(`${c.red}Failed to fetch roles: ${response.status}${c.reset}`);
			return;
		}

		const data = await response.json();
		const roles = data.roles || [];

		if (roles.length === 0) {
			console.log(`${c.dim}No roles found${c.reset}`);
			return;
		}

		for (const role of roles) {
			console.log(`${c.green}${role.name}${c.reset} (${role.id})`);
			if (role.description) {
				console.log(`  ${c.dim}${role.description}${c.reset}`);
			}
			console.log(`  Permissions: ${role.permissions.map((p: any) => `${p.resource}:${p.actions.join(",")}`).join(", ")}`);
			console.log();
		}
	} catch (error) {
		console.log(`${c.red}Error fetching roles: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
	}
}

async function createRole(args: string[]): Promise<void> {
	const [id, name, ...permissions] = args;

	if (!id || !name || permissions.length === 0) {
		console.log(`${c.red}Usage: roles create <id> <name> <permission1> [permission2] ...${c.reset}`);
		console.log(`${c.dim}Example: roles create analyst Analyst data-source:read property:read${c.reset}`);
		return;
	}

	// Parse permissions
	const parsedPermissions = permissions.map(p => {
		const [resource, actionsStr] = p.split(":");
		const actions = actionsStr ? actionsStr.split(",") : ["read"];
		return { resource, actions };
	});

	console.log(`\n${c.yellow}Creating role ${name}...${c.reset}\n`);

	try {
		const response = await fetch("http://localhost:3001/api/roles", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"X-Dev-Bypass": "true",
			},
			body: JSON.stringify({
				id,
				name,
				permissions: parsedPermissions,
			}),
		});

		if (!response.ok) {
			const error = await response.json();
			console.log(`${c.red}Failed to create role: ${error.error || response.status}${c.reset}`);
			return;
		}

		const data = await response.json();
		console.log(`${c.green}✓${c.reset} Role created successfully`);
		console.log(`  ID: ${data.role.id}`);
		console.log(`  Name: ${data.role.name}`);
		console.log(`  Permissions: ${data.role.permissions.map((p: any) => `${p.resource}:${p.actions.join(",")}`).join(", ")}`);
	} catch (error) {
		console.log(`${c.red}Error creating role: ${error instanceof Error ? error.message : String(error)}${c.reset}`);
	}
	console.log();
}

// ============ CLI ============

const HELP = `
${c.cyan}${c.bold}Management & Integration CLI${c.reset}

${c.yellow}Commands:${c.reset}
  services                    List all service statuses
  integrations               List all integration statuses
  test <integration>         Test a specific integration
  config                     Show current configuration
  validate                   Validate configuration
  health                     Run full health check

  users list                 List all users
  users create <u> <p> [r] [e] Create a new user
  users update <id> <f>=<v>   Update user fields

  roles list                 List all roles
  roles create <id> <n> <p>  Create a new role

${c.yellow}Examples:${c.reset}
  bun run management services
  bun run management users list
  bun run management users create john password123 trader
  bun run management users update user_123 role=admin
  bun run management roles list
  bun run management roles create analyst Analyst data-source:read

${c.dim}Shortcuts:${c.reset}
  bun run mgmt <command>     Alias for management
`;

async function main(): Promise<void> {
	const args = Bun.argv.slice(2);
	const [cmd, ...rest] = args;

	if (!cmd || cmd === "help" || cmd === "--help" || cmd === "-h") {
		console.log(HELP);
		return;
	}

	try {
		switch (cmd) {
			case "services":
				await listServices();
				break;

			case "integrations":
				await listIntegrations();
				break;

			case "test":
				if (rest.length < 1) {
					console.error(`${c.red}Usage: test <integration>${c.reset}`);
					process.exit(1);
				}
				await testIntegration(rest[0]);
				break;

			case "config":
				await showConfig();
				break;

			case "validate":
				await validateConfig();
				break;

			case "health":
				await healthCheck();
				break;

			case "users":
				const userCmd = rest[0];
				const userArgs = rest.slice(1);
				switch (userCmd) {
					case "list":
						await listUsers();
						break;
					case "create":
						await createUser(userArgs);
						break;
					case "update":
						await updateUser(userArgs);
						break;
					default:
						console.error(`${c.red}Unknown users command: ${userCmd}${c.reset}`);
						console.log("Available: list, create, update");
						process.exit(1);
				}
				break;

			case "roles":
				const roleCmd = rest[0];
				const roleArgs = rest.slice(1);
				switch (roleCmd) {
					case "list":
						await listRoles();
						break;
					case "create":
						await createRole(roleArgs);
						break;
					default:
						console.error(`${c.red}Unknown roles command: ${roleCmd}${c.reset}`);
						console.log("Available: list, create");
						process.exit(1);
				}
				break;

			default:
				console.error(`${c.red}Unknown command: ${cmd}${c.reset}`);
				console.log(HELP);
				process.exit(1);
		}
	} catch (error) {
		console.error(
			`${c.red}Error: ${error instanceof Error ? error.message : String(error)}${c.reset}`,
		);
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
