// ── cookie-terminal.ts — Terminal UI for cookie session management ─────────────

import type {CookieSession, CookieInfo} from './cookie-sessions';
import {createCookieSession, getSession} from './cookie-sessions';

export interface CookieTerminalManager {
	interactive: boolean;
	color: boolean;
	createSessionInteractive(service: string, project: string): Promise<CookieSession | null>;
	monitorSession(service: string, project: string, sessionId: string): Promise<void>;
}

const _useColor = (() => {
	if (Bun.env.FORCE_COLOR) return true;
	if (Bun.env.NO_COLOR !== undefined) return false;
	return process.stdout.isTTY ?? false;
})();

const _wrap = (code: string) => (_useColor ? (s: string) => `\x1b[${code}m${s}\x1b[0m` : (s: string) => s);
const c = {
	bold: _wrap('1'),
	cyan: _wrap('36'),
	green: _wrap('32'),
	yellow: _wrap('33'),
	dim: _wrap('2'),
	magenta: _wrap('35'),
	red: _wrap('31'),
};

export function createCookieTerminalManager(config: {interactive: boolean; color: boolean}): CookieTerminalManager {
	return {
		interactive: config.interactive,
		color: config.color,
		async createSessionInteractive(service: string, project: string): Promise<CookieSession | null> {
			if (!config.interactive) {
				console.error(`${c.red('error:')} interactive mode not enabled`);
				return null;
			}

			console.log(`${c.cyan('Creating interactive session for')} ${service}/${project}`);
			const domain = 'localhost';
			const session = await createCookieSession(service, project, domain, {
				ttl: 24 * 60 * 60 * 1000,
				secure: false,
				sameSite: 'Lax',
			});

			console.log(`${c.green('✓')} Created session ${c.cyan(session.id)}`);
			return session;
		},

		async monitorSession(service: string, project: string, sessionId: string): Promise<void> {
			if (!config.interactive) {
				console.error(`${c.red('error:')} interactive mode not enabled`);
				return;
			}

			console.log(`${c.cyan('Monitoring session')} ${sessionId} ${c.dim(`(${service}/${project})`)}`);
			const session = await getSession(service, project, sessionId);
			if (!session) {
				console.error(`${c.red('error:')} session not found`);
				return;
			}

			const cookieCount = Object.keys(session.cookies).length;
			console.log(`${c.green('✓')} Session active with ${cookieCount} cookie(s)`);
			console.log(`${c.dim('Press Ctrl+C to stop monitoring')}`);

			// Simple monitoring loop (can be enhanced with actual terminal updates)
			let lastCookieCount = cookieCount;
			const interval = setInterval(async () => {
				const updated = await getSession(service, project, sessionId);
				if (!updated) {
					console.log(`${c.yellow('⚠')} Session expired or deleted`);
					clearInterval(interval);
					return;
				}

				const currentCookieCount = Object.keys(updated.cookies).length;
				if (currentCookieCount !== lastCookieCount) {
					console.log(`${c.cyan('→')} Cookie count changed: ${lastCookieCount} → ${currentCookieCount}`);
					lastCookieCount = currentCookieCount;
				}
			}, 2000);

			// Cleanup on process exit
			process.on('SIGINT', () => {
				clearInterval(interval);
				console.log(`\n${c.dim('Monitoring stopped')}`);
				process.exit(0);
			});
		},
	};
}

export function promptForCookieData(): CookieInfo[] {
	console.log(`${c.yellow('⚠')} Interactive cookie input not yet implemented`);
	console.log(`${c.dim('Use --cookie-add with cookie string instead')}`);
	return [];
}

export function selectSessionInteractively(sessions: CookieSession[]): string {
	if (sessions.length === 0) {
		console.error(`${c.red('error:')} no sessions available`);
		return '';
	}

	if (sessions.length === 1) {
		return sessions[0]!.id;
	}

	console.log(`${c.cyan('Available sessions:')}`);
	sessions.forEach((s, i) => {
		const cookieCount = Object.keys(s.cookies).length;
		console.log(`  ${i + 1}. ${s.id} (${cookieCount} cookies, ${s.domain})`);
	});

	console.log(`${c.dim('Selecting first session (interactive selection not yet implemented)')}`);
	return sessions[0]!.id;
}
