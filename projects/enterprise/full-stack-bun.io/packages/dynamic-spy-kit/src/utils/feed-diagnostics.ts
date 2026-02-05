/**
 * @dynamic-spy/kit v9.0 - Feed Diagnostics
 * 
 * Real-time feed diagnostics using Bun 1.3 enhanced socket information
 */

import { connect } from "bun";
import type { EnhancedFeedPattern } from "./feed-registry-loader";

export interface DiagnosticIssue {
	feedId: string;
	severity: 'error' | 'warning' | 'info';
	message: string;
	details?: Record<string, any>;
}

export async function diagnoseFeedIssues(
	feeds: EnhancedFeedPattern[],
	timeout: number = 3000
): Promise<DiagnosticIssue[]> {
	const issues: DiagnosticIssue[] = [];

	for (const feed of feeds) {
		try {
			const socket = await Promise.race([
				connect({
					hostname: feed.hostname || 'localhost',
					port: feed.port || 443,
					tls: feed.port === 443 || feed.hostname?.includes('https'),
					socket: {
						data: () => {},
						open: () => {},
						error: () => {},
						close: () => {},
						drain: () => {},
					},
				}),
				new Promise<never>((_, reject) =>
					setTimeout(() => reject(new Error('Connection timeout')), timeout)
				),
			]);

			// Check connection properties
			if (socket.remoteFamily !== 'IPv4' && socket.remoteFamily !== 'IPv6') {
				issues.push({
					feedId: feed.id,
					severity: 'error',
					message: `Unknown address family: ${socket.remoteFamily}`,
					details: {
						remoteFamily: socket.remoteFamily,
						expected: ['IPv4', 'IPv6'],
					},
				});
			}

			// Check port matches expected
			const expectedPort = feed.port || 443;
			if (socket.remotePort !== expectedPort) {
				issues.push({
					feedId: feed.id,
					severity: 'warning',
					message: `Unexpected port: ${socket.remotePort} (expected ${expectedPort})`,
					details: {
						actualPort: socket.remotePort,
						expectedPort,
					},
				});
			}

			// Check IPv6 availability
			if (feed._meta?.features?.includes('ipv6') && socket.remoteFamily !== 'IPv6') {
				issues.push({
					feedId: feed.id,
					severity: 'warning',
					message: 'IPv6 requested but connection is IPv4',
					details: {
						remoteFamily: socket.remoteFamily,
						requested: 'IPv6',
					},
				});
			}

			// Verify local port is ephemeral (not a fixed port)
			if (socket.localPort < 49152) {
				issues.push({
					feedId: feed.id,
					severity: 'info',
					message: `Local port ${socket.localPort} is not ephemeral (expected >= 49152)`,
					details: {
						localPort: socket.localPort,
						expectedRange: '49152-65535',
					},
				});
			}

			socket.end();
		} catch (error) {
			issues.push({
				feedId: feed.id,
				severity: 'error',
				message: `Connection failed: ${(error as Error).message}`,
				details: {
					hostname: feed.hostname,
					port: feed.port,
					error: (error as Error).message,
				},
			});
		}
	}

	return issues;
}

export function formatDiagnostics(issues: DiagnosticIssue[]): string {
	if (issues.length === 0) {
		return '✅ No issues detected';
	}

	const errors = issues.filter(i => i.severity === 'error');
	const warnings = issues.filter(i => i.severity === 'warning');
	const infos = issues.filter(i => i.severity === 'info');

	let output = `\n📊 Feed Diagnostics Summary:\n`;
	output += `  Errors: ${errors.length}\n`;
	output += `  Warnings: ${warnings.length}\n`;
	output += `  Info: ${infos.length}\n\n`;

	if (errors.length > 0) {
		output += `❌ Errors:\n`;
		errors.forEach(issue => {
			output += `  [${issue.feedId}] ${issue.message}\n`;
			if (issue.details) {
				output += `    Details: ${JSON.stringify(issue.details, null, 2)}\n`;
			}
		});
		output += `\n`;
	}

	if (warnings.length > 0) {
		output += `⚠️  Warnings:\n`;
		warnings.forEach(issue => {
			output += `  [${issue.feedId}] ${issue.message}\n`;
		});
		output += `\n`;
	}

	if (infos.length > 0) {
		output += `ℹ️  Info:\n`;
		infos.forEach(issue => {
			output += `  [${issue.feedId}] ${issue.message}\n`;
		});
	}

	return output;
}



