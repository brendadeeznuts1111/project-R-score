#!/usr/bin/env bun

/**
 * Kimi Shell Session Manager
 * Session persistence, restoration, and management
 */

import { randomUUID } from "crypto";
import { homedir } from "os";
import { join } from "path";

const COLORS = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	gray: "\x1b[90m",
};

const SESSIONS_DIR = join(homedir(), ".kimi", "sessions");
const ACTIVE_SESSION_FILE = join(homedir(), ".kimi", "active-session");

export interface CommandHistory {
	id: string;
	command: string;
	timestamp: number;
	duration?: number;
	exitCode?: number;
	output?: string;
}

export interface Session {
	id: string;
	name: string;
	createdAt: number;
	updatedAt: number;
	profile?: string;
	workingDir: string;
	env: Record<string, string>;
	history: CommandHistory[];
	state: "active" | "suspended" | "archived";
	metadata: {
		description?: string;
		tags?: string[];
		project?: string;
	};
}

export interface SessionBundle {
	version: string;
	exportedAt: number;
	session: Session;
}

class SessionManager {
	private currentSession?: Session;

	async init(): Promise<void> {
		// Ensure sessions directory exists
		await Bun.write(join(SESSIONS_DIR, ".keep"), "").catch(() => {});

		// Try to restore active session
		await this.restoreActiveSession();
	}

	async createSession(
		name: string,
		options: {
			profile?: string;
			description?: string;
			tags?: string[];
		} = {},
	): Promise<Session> {
		const session: Session = {
			id: randomUUID(),
			name,
			createdAt: Date.now(),
			updatedAt: Date.now(),
			profile: options.profile,
			workingDir: process.cwd(),
			env: {},
			history: [],
			state: "active",
			metadata: {
				description: options.description,
				tags: options.tags,
			},
		};

		await this.saveSession(session);
		await this.setActiveSession(session.id);
		this.currentSession = session;

		return session;
	}

	async getSession(id: string): Promise<Session | null> {
		try {
			const path = join(SESSIONS_DIR, `${id}.json`);
			const content = await Bun.file(path).text();
			return JSON.parse(content);
		} catch {
			return null;
		}
	}

	async saveSession(session: Session): Promise<void> {
		session.updatedAt = Date.now();
		const path = join(SESSIONS_DIR, `${session.id}.json`);
		await Bun.write(path, JSON.stringify(session, null, 2));
	}

	async listSessions(): Promise<Session[]> {
		const sessions: Session[] = [];

		try {
			const files = await Bun.file(SESSIONS_DIR)
				.stream()
				.catch(() => null);
			if (!files) return [];

			// Use glob to find session files
			const glob = new Bun.Glob("*.json");
			for await (const file of glob.scan({ cwd: SESSIONS_DIR })) {
				const content = await Bun.file(join(SESSIONS_DIR, file)).text();
				try {
					sessions.push(JSON.parse(content));
				} catch {
					// Skip corrupted files
				}
			}
		} catch {
			// Directory doesn't exist
		}

		return sessions.sort((a, b) => b.updatedAt - a.updatedAt);
	}

	async switchSession(id: string): Promise<boolean> {
		const session = await this.getSession(id);
		if (!session) return false;

		// Suspend current session
		if (this.currentSession) {
			this.currentSession.state = "suspended";
			await this.saveSession(this.currentSession);
		}

		// Activate new session
		session.state = "active";
		await this.saveSession(session);
		await this.setActiveSession(id);
		this.currentSession = session;

		// Apply session context
		if (session.profile) {
			process.env.MATRIX_ACTIVE_PROFILE = session.profile;
		}

		return true;
	}

	async archiveSession(id: string): Promise<boolean> {
		const session = await this.getSession(id);
		if (!session) return false;

		session.state = "archived";
		await this.saveSession(session);
		return true;
	}

	async deleteSession(id: string): Promise<boolean> {
		try {
			const path = join(SESSIONS_DIR, `${id}.json`);
			await Bun.file(path).delete();
			return true;
		} catch {
			return false;
		}
	}

	async exportSession(id: string): Promise<string> {
		const session = await this.getSession(id);
		if (!session) throw new Error(`Session not found: ${id}`);

		const bundle: SessionBundle = {
			version: "2.0.0",
			exportedAt: Date.now(),
			session,
		};

		return JSON.stringify(bundle, null, 2);
	}

	async importSession(bundleJson: string): Promise<Session> {
		const bundle: SessionBundle = JSON.parse(bundleJson);

		// Create new session from bundle
		const session: Session = {
			...bundle.session,
			id: randomUUID(), // New ID to avoid conflicts
			createdAt: Date.now(),
			updatedAt: Date.now(),
			state: "active",
		};

		await this.saveSession(session);
		return session;
	}

	recordCommand(
		command: string,
		result: {
			duration: number;
			exitCode: number;
			output?: string;
		},
	): void {
		if (!this.currentSession) return;

		const history: CommandHistory = {
			id: randomUUID(),
			command,
			timestamp: Date.now(),
			...result,
		};

		this.currentSession.history.push(history);

		// Limit history size
		if (this.currentSession.history.length > 1000) {
			this.currentSession.history = this.currentSession.history.slice(-1000);
		}

		this.saveSession(this.currentSession).catch(() => {});
	}

	private async restoreActiveSession(): Promise<void> {
		try {
			const activeId = await Bun.file(ACTIVE_SESSION_FILE).text();
			const session = await this.getSession(activeId.trim());
			if (session && session.state === "active") {
				this.currentSession = session;
			}
		} catch {
			// No active session
		}
	}

	private async setActiveSession(id: string): Promise<void> {
		await Bun.write(ACTIVE_SESSION_FILE, id);
	}

	getCurrentSession(): Session | undefined {
		return this.currentSession;
	}
}

async function main() {
	const args = Bun.argv.slice(2);
	const command = args[0];
	const manager = new SessionManager();
	await manager.init();

	switch (command) {
		case "create": {
			const name = args[1];
			if (!name) {
				console.error("Usage: session create <name> [--profile=<p>] [--desc=<d>]");
				process.exit(1);
			}

			const options: { profile?: string; description?: string; tags?: string[] } = {};

			for (const arg of args.slice(2)) {
				if (arg.startsWith("--profile=")) {
					options.profile = arg.split("=")[1];
				} else if (arg.startsWith("--desc=")) {
					options.description = arg.split("=")[1];
				} else if (arg.startsWith("--tags=")) {
					options.tags = arg.split("=")[1].split(",");
				}
			}

			const session = await manager.createSession(name, options);
			console.log(
				`${COLORS.green}✓${COLORS.reset} Created session: ${COLORS.cyan}${session.name}${COLORS.reset} (${session.id.slice(0, 8)})`,
			);
			break;
		}

		case "list": {
			const sessions = await manager.listSessions();
			const current = manager.getCurrentSession();

			console.log(`${COLORS.bold}Sessions:${COLORS.reset}\n`);

			for (const session of sessions) {
				const isCurrent = current?.id === session.id;
				const indicator = isCurrent
					? `${COLORS.green}●${COLORS.reset}`
					: session.state === "active"
						? `${COLORS.yellow}○${COLORS.reset}`
						: `${COLORS.gray}○${COLORS.reset}`;

				const stateColor =
					session.state === "active"
						? COLORS.green
						: session.state === "suspended"
							? COLORS.yellow
							: COLORS.gray;

				console.log(
					`  ${indicator} ${COLORS.bold}${session.name}${COLORS.reset} ${COLORS.gray}(${session.id.slice(0, 8)})${COLORS.reset}`,
				);
				console.log(`    State: ${stateColor}${session.state}${COLORS.reset}`);
				console.log(`    Profile: ${session.profile || "none"}`);
				console.log(`    Commands: ${session.history.length}`);
				if (session.metadata.description) {
					console.log(`    Description: ${session.metadata.description}`);
				}
				console.log();
			}
			break;
		}

		case "switch": {
			const id = args[1];
			if (!id) {
				console.error("Usage: session switch <id>");
				process.exit(1);
			}

			const success = await manager.switchSession(id);
			if (success) {
				console.log(
					`${COLORS.green}✓${COLORS.reset} Switched to session: ${COLORS.cyan}${id.slice(0, 8)}${COLORS.reset}`,
				);
			} else {
				console.error(`${COLORS.red}✗${COLORS.reset} Session not found: ${id}`);
				process.exit(1);
			}
			break;
		}

		case "export": {
			const id = args[1];
			if (!id) {
				console.error("Usage: session export <id> > bundle.json");
				process.exit(1);
			}

			const bundle = await manager.exportSession(id);
			console.log(bundle);
			break;
		}

		case "import": {
			const file = args[1];
			if (!file) {
				console.error("Usage: session import <bundle.json>");
				process.exit(1);
			}

			const bundle = await Bun.file(file).text();
			const session = await manager.importSession(bundle);
			console.log(
				`${COLORS.green}✓${COLORS.reset} Imported session: ${COLORS.cyan}${session.name}${COLORS.reset} (${session.id.slice(0, 8)})`,
			);
			break;
		}

		case "archive": {
			const id = args[1];
			if (!id) {
				console.error("Usage: session archive <id>");
				process.exit(1);
			}

			const success = await manager.archiveSession(id);
			if (success) {
				console.log(
					`${COLORS.green}✓${COLORS.reset} Archived session: ${COLORS.cyan}${id.slice(0, 8)}${COLORS.reset}`,
				);
			} else {
				console.error(`${COLORS.red}✗${COLORS.reset} Session not found`);
				process.exit(1);
			}
			break;
		}

		case "delete": {
			const id = args[1];
			if (!id) {
				console.error("Usage: session delete <id>");
				process.exit(1);
			}

			const success = await manager.deleteSession(id);
			if (success) {
				console.log(
					`${COLORS.green}✓${COLORS.reset} Deleted session: ${COLORS.cyan}${id.slice(0, 8)}${COLORS.reset}`,
				);
			} else {
				console.error(`${COLORS.red}✗${COLORS.reset} Session not found`);
				process.exit(1);
			}
			break;
		}

		case "current": {
			const current = manager.getCurrentSession();
			if (current) {
				console.log(`${COLORS.bold}Current Session:${COLORS.reset}`);
				console.log(`  Name: ${COLORS.cyan}${current.name}${COLORS.reset}`);
				console.log(`  ID: ${current.id}`);
				console.log(`  Profile: ${current.profile || "none"}`);
				console.log(`  Commands: ${current.history.length}`);
				console.log(`  Created: ${new Date(current.createdAt).toLocaleString()}`);
			} else {
				console.log(`${COLORS.gray}No active session${COLORS.reset}`);
			}
			break;
		}

		default: {
			console.log(`${COLORS.bold}🐚 Kimi Session Manager${COLORS.reset}\n`);
			console.log("Usage:");
			console.log(
				"  session create <name> [--profile=<p>] [--desc=<d>]  Create new session",
			);
			console.log(
				"  session list                                         List all sessions",
			);
			console.log(
				"  session switch <id>                                  Switch to session",
			);
			console.log(
				"  session current                                      Show current session",
			);
			console.log(
				"  session export <id> > bundle.json                    Export session",
			);
			console.log(
				"  session import <bundle.json>                         Import session",
			);
			console.log(
				"  session archive <id>                                 Archive session",
			);
			console.log(
				"  session delete <id>                                  Delete session",
			);
			console.log("\nExamples:");
			console.log(
				"  session create prod-work --profile=production --desc='Production work session'",
			);
			console.log("  session switch abc123");
			console.log("  session export abc123 > my-session.json");
		}
	}
}

if (import.meta.main) {
	main().catch(console.error);
}

export { SessionManager };
export type { Session, SessionBundle, CommandHistory };
