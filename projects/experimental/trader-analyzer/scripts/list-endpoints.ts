#!/usr/bin/env bun
/**
 * @fileoverview CLI tool to list all API endpoints
 * @module [CLI][API][DISCOVERY]
 */

import { getApiDiscovery } from "../src/api/discovery";
import { colors } from "../src/utils/bun";

async function listEndpoints(): Promise<void> {
	const discovery = getApiDiscovery();

	console.info(colors.brightCyan(`\n${"=".repeat(80)}`));
	console.info(colors.brightCyan(`${discovery.name} v${discovery.version}`));
	console.info(colors.gray(`Runtime: ${discovery.runtime}`));
	console.info(colors.gray(`Total Endpoints: ${discovery.totalEndpoints}`));
	console.info(colors.brightCyan(`${"=".repeat(80)}\n`));

	// Group by method
	const methods = ["GET", "POST", "PUT", "DELETE", "PATCH"] as const;
	for (const method of methods) {
		const paths = discovery.byMethod[method];
		if (paths.length === 0) continue;

		const methodColor =
			method === "GET"
				? colors.blue
				: method === "POST"
					? colors.green
					: method === "PUT"
						? colors.yellow
						: method === "DELETE"
							? colors.red
							: colors.magenta;

		console.info(methodColor(`\n${method} (${paths.length})`));
		console.info(colors.gray("-".repeat(80)));

		for (const path of paths) {
			console.info(`  ${colors.cyan(path)}`);
		}
	}

	console.info(colors.brightCyan(`\n${"=".repeat(80)}`));
	console.info(colors.gray(`\nAccess full API documentation:`));
	console.info(colors.cyan(`  http://localhost:${process.env.PORT || 3000}/docs`));
	console.info(colors.gray(`\nGet discovery JSON:`));
	console.info(colors.cyan(`  curl http://localhost:${process.env.PORT || 3000}/api/discovery`));
	console.info(colors.brightCyan(`${"=".repeat(80)}\n`));
}

if (import.meta.main) {
	listEndpoints().catch((error) => {
		console.error(colors.red("Error listing endpoints:"), error);
		process.exit(1);
	});
}
