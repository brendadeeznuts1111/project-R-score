#!/usr/bin/env bun
/**
 * @fileoverview NEXUS CLI - Registry monitoring and radiance commands
 * @description 17.14.0.0.0.0.0 - CLI interface for NEXUS Registry System
 * @module cli/nexus
 */

import { getRegistryMetadata, NEXUS_REGISTRY_OF_REGISTRIES } from "../17.14.0.0.0.0.0-nexus/registry-of-registries";
import { RSS_API_PATHS, ROUTING_REGISTRY_NAMES } from "../utils/rss-constants";

const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	cyan: "\x1b[36m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	red: "\x1b[31m",
	magenta: "\x1b[35m",
	blue: "\x1b[34m",
};

const HELP = `
${c.bold}NEXUS Registry System CLI v17.14.0${c.reset}

${c.cyan}Usage:${c.reset}
  bun nexus <command> [options]

${c.cyan}Commands:${c.reset}
  ${c.green}watch <registry-id>${c.reset}     Watch a registry's radiance channel for live events
  ${c.green}list${c.reset}                     List all registries
  ${c.green}health [registry-id]${c.reset}     Get health status for registry(ies)
  ${c.green}channels${c.reset}                 List all radiance channels

${c.cyan}Examples:${c.reset}
  bun nexus watch ${ROUTING_REGISTRY_NAMES.MCP_TOOLS}
  bun nexus watch ${ROUTING_REGISTRY_NAMES.PROPERTIES}
  bun nexus list
  bun nexus health
  bun nexus health ${ROUTING_REGISTRY_NAMES.MCP_TOOLS}
`;

async function watchRegistry(registryId: string) {
	const metadata = getRegistryMetadata(registryId);
	
	if (!metadata) {
		console.error(`${c.red}Registry not found: ${registryId}${c.reset}`);
		console.log(`\n${c.yellow}Available registries:${c.reset}`);
		Object.keys(NEXUS_REGISTRY_OF_REGISTRIES).forEach(id => {
			console.log(`  - ${id}`);
		});
		process.exit(1);
	}

	if (!metadata.realtime) {
		console.warn(`${c.yellow}Warning: Registry ${registryId} is not real-time enabled${c.reset}`);
	}

	console.log(`${c.cyan}[17.14.0] Watching ${metadata.name} (${metadata.id})${c.reset}`);
	console.log(`${c.dim}Radiance Channel: ${metadata.radianceChannel}${c.reset}`);
	console.log(`${c.dim}Severity: ${metadata.radianceSeverity}${c.reset}\n`);

	const protocol = process.env.PROTOCOL === 'https' ? 'wss:' : 'ws:';
	const host = process.env.HOST || 'localhost:3001';
	const wsUrl = `${protocol}//${host}/ws/pubsub?token=observer-all`;

	try {
		const ws = new WebSocket(wsUrl);

		ws.onopen = () => {
			console.log(`${c.green}✓ Connected to Radiance${c.reset}`);
			ws.send(JSON.stringify({ type: 'SUBSCRIBE', channel: metadata.radianceChannel }));
			ws.send(JSON.stringify({ type: 'SUBSCRIBE', channel: 'radiance-registry' }));
			console.log(`${c.cyan}Subscribed to: ${metadata.radianceChannel}, radiance-registry${c.reset}\n`);
		};

		ws.onmessage = (e) => {
			try {
				const msg = JSON.parse(e.data);
				if (msg.type === 'RADIANCE_PUBLISH' && msg.payload?.event === 'REGISTRY_EVENT') {
					const event = msg.payload;
					if (event.registry === registryId || event.channel === metadata.radianceChannel) {
						const time = new Date(event.timestamp).toLocaleTimeString();
						const severityColor = 
							event.severity === 'critical' ? c.red :
							event.severity === 'high' ? c.yellow :
							event.severity === 'warn' ? c.yellow :
							c.blue;

						console.log(
							`${c.dim}[${time}]${c.reset} ` +
							`${severityColor}${event.type}${c.reset} ` +
							`${c.magenta}${event.registry}${c.reset} ` +
							`${event.data?.error?.message || event.data?.discovery?.type || 'Event'}`
						);
					}
				}
			} catch (err) {
				console.error(`${c.red}Failed to parse message:${c.reset}`, err);
			}
		};

		ws.onerror = (error) => {
			console.error(`${c.red}WebSocket error:${c.reset}`, error);
		};

		ws.onclose = () => {
			console.log(`\n${c.yellow}Connection closed. Reconnecting...${c.reset}`);
			setTimeout(() => watchRegistry(registryId), 3000);
		};

		// Keep process alive
		process.on('SIGINT', () => {
			console.log(`\n${c.yellow}Disconnecting...${c.reset}`);
			ws.close();
			process.exit(0);
		});
	} catch (error) {
		console.error(`${c.red}Failed to connect:${c.reset}`, error);
		process.exit(1);
	}
}

async function listRegistries() {
	console.log(`${c.bold}NEXUS Registry System - All Registries${c.reset}\n`);
	
	const byCategory: Record<string, typeof NEXUS_REGISTRY_OF_REGISTRIES[string][]> = {};
	Object.values(NEXUS_REGISTRY_OF_REGISTRIES).forEach(reg => {
		if (!byCategory[reg.category]) {
			byCategory[reg.category] = [];
		}
		byCategory[reg.category].push(reg);
	});

	Object.entries(byCategory).forEach(([category, registries]) => {
		console.log(`${c.cyan}${category.toUpperCase()}${c.reset} (${registries.length})`);
		registries.forEach(reg => {
			const realtimeBadge = reg.realtime ? `${c.green}●${c.reset}` : `${c.dim}○${c.reset}`;
			console.log(
				`  ${realtimeBadge} ${c.bold}${reg.id}${c.reset} - ${reg.name}`
			);
			console.log(`    ${c.dim}${reg.radianceChannel} (${reg.radianceSeverity})${c.reset}`);
		});
		console.log();
	});
}

async function getHealth(registryId?: string) {
	if (registryId) {
		const metadata = getRegistryMetadata(registryId);
		if (!metadata) {
			console.error(`${c.red}Registry not found: ${registryId}${c.reset}`);
			process.exit(1);
		}

		try {
			const host = process.env.HOST || 'localhost:3001';
			const protocol = process.env.PROTOCOL === 'https' ? 'https:' : 'http:';
			const response = await fetch(`${protocol}//${host}${RSS_API_PATHS.REGISTRY}/${registryId}/health`);
			const health = await response.json();

			console.log(`${c.bold}${metadata.name} Health Status${c.reset}\n`);
			console.log(`Status: ${health.status === 'healthy' ? c.green : c.yellow}${health.status}${c.reset}`);
			console.log(`Healthy: ${health.healthy ? c.green + 'Yes' : c.red + 'No'}${c.reset}`);
			console.log(`Last Checked: ${health.lastChecked ? new Date(health.lastChecked).toLocaleString() : 'Never'}`);
			console.log(`Radiance Channel: ${c.magenta}${health.radianceChannel}${c.reset}`);
			console.log(`Severity: ${health.radianceSeverity}`);
		} catch (error) {
			console.error(`${c.red}Failed to get health:${c.reset}`, error);
			process.exit(1);
		}
	} else {
		try {
			const host = process.env.HOST || 'localhost:3001';
			const protocol = process.env.PROTOCOL === 'https' ? 'https:' : 'http:';
			const response = await fetch(`${protocol}//${host}${RSS_API_PATHS.REGISTRY}`);
			const data = await response.json();

			console.log(`${c.bold}NEXUS Registry System Health Overview${c.reset}\n`);
			console.log(`Total: ${data.total}`);
			console.log(`Real-time: ${data.radiance?.channels.length || 0}`);
			console.log(`Healthy: ${data.registries.filter((r: any) => r.status === 'healthy').length}/${data.total}\n`);

			data.registries.forEach((reg: any) => {
				const statusColor = reg.status === 'healthy' ? c.green : c.yellow;
				const realtimeBadge = reg.realtime ? `${c.green}●${c.reset}` : `${c.dim}○${c.reset}`;
				console.log(
					`${realtimeBadge} ${statusColor}${reg.status.padEnd(8)}${c.reset} ${reg.id}`
				);
			});
		} catch (error) {
			console.error(`${c.red}Failed to get health:${c.reset}`, error);
			process.exit(1);
		}
	}
}

function listChannels() {
	console.log(`${c.bold}Radiance Channels${c.reset}\n`);
	
	const channels = new Set<string>();
	Object.values(NEXUS_REGISTRY_OF_REGISTRIES).forEach(reg => {
		if (reg.realtime) {
			channels.add(reg.radianceChannel);
		}
	});

	channels.forEach(channel => {
		const registries = Object.values(NEXUS_REGISTRY_OF_REGISTRIES)
			.filter(r => r.radianceChannel === channel);
		console.log(`${c.magenta}${channel}${c.reset}`);
		registries.forEach(reg => {
			console.log(`  - ${reg.id} (${reg.radianceSeverity})`);
		});
		console.log();
	});
}

async function main() {
	const args = Bun.argv.slice(2);
	const cmd = args[0];

	if (!cmd || cmd === 'help' || cmd === '--help' || cmd === '-h') {
		console.log(HELP);
		process.exit(0);
	}

	try {
		switch (cmd) {
			case 'watch':
				if (!args[1]) {
					console.error(`${c.red}Error: Registry ID required${c.reset}`);
					console.log(`\n${c.yellow}Usage: bun nexus watch <registry-id>${c.reset}`);
					process.exit(1);
				}
				await watchRegistry(args[1]);
				break;

			case 'list':
				await listRegistries();
				break;

			case 'health':
				await getHealth(args[1]);
				break;

			case 'channels':
				listChannels();
				break;

			default:
				console.error(`${c.red}Unknown command: ${cmd}${c.reset}`);
				console.log(HELP);
				process.exit(1);
		}
	} catch (error) {
		console.error(`${c.red}Error:${c.reset}`, error);
		process.exit(1);
	}
}

if (import.meta.main) {
	main().catch((error) => {
		console.error(`${c.red}Fatal error:${c.reset}`, error);
		process.exit(1);
	});
}
