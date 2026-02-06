#!/usr/bin/env bun
/**
 * 🔥 90-Column Matrix Hyperlink Demo — v3.26
 * Renders full matrix with OSC 8 clickable hyperlinks
 */

import { HyperlinkMapper, MatrixRenderer } from "../core/mapping/HyperlinkMapper";
import { TOTAL_COLUMNS } from "../matrix/column-standards-v3.26";

// ANSI colors
const c = {
	reset: "\x1b[0m",
	bold: "\x1b[1m",
	dim: "\x1b[2m",
	red: "\x1b[31m",
	green: "\x1b[32m",
	yellow: "\x1b[33m",
	blue: "\x1b[34m",
	magenta: "\x1b[35m",
	cyan: "\x1b[36m",
};

// Box drawing
const box = {
	top: `┏${"━".repeat(98)}┓`,
	mid: `┣${"━".repeat(98)}┫`,
	bot: `┗${"━".repeat(98)}┛`,
	v: "┃",
};

function printHeader() {
	console.log(`
${c.cyan}${box.top}${c.reset}
${c.cyan}${box.v}${c.reset}                                                                                                  ${c.cyan}${box.v}${c.reset}
${c.cyan}${box.v}${c.reset}   ${c.bold}${c.yellow}🔥 90-COLUMN MATRIX HYPERLINK CITADEL v3.26 🔥${c.reset}                                              ${c.cyan}${box.v}${c.reset}
${c.cyan}${box.v}${c.reset}                                                                                                  ${c.cyan}${box.v}${c.reset}
${c.cyan}${box.v}${c.reset}   ${c.dim}Protocol:${c.reset} TIER-1380-OMEGA-v3.26    ${c.dim}Columns:${c.reset} ${TOTAL_COLUMNS}    ${c.dim}Links:${c.reset} ${HyperlinkMapper.getLinkedColumns().length}                    ${c.cyan}${box.v}${c.reset}
${c.cyan}${box.bot}${c.reset}
`);
}

function printColumnSummary() {
	console.log(`${c.cyan}${box.top}${c.reset}`);
	console.log(
		`${c.cyan}${box.v}${c.reset} ${c.bold}📊 COLUMN ZONE SUMMARY${c.reset} ${" ".repeat(73)}${c.cyan}${box.v}${c.reset}`,
	);
	console.log(`${c.cyan}${box.mid}${c.reset}`);

	const zones = [
		{
			icon: "⚪",
			name: "DEFAULT",
			range: "0",
			count: 1,
			desc: "Universal fallback anchor",
		},
		{
			icon: "🔵",
			name: "CORE",
			range: "1-10",
			count: 10,
			desc: "Runtime fundamentals",
		},
		{
			icon: "🔴",
			name: "SECURITY",
			range: "11-20",
			count: 5,
			desc: "Secrets & credentials",
		},
		{
			icon: "🟣",
			name: "CLOUDFLARE",
			range: "21-30",
			count: 10,
			desc: "Edge integration",
		},
		{
			icon: "🟠",
			name: "TENSION",
			range: "31-45",
			count: 15,
			desc: "Anomaly detection 🔥",
		},
		{
			icon: "🟢",
			name: "PROTOCOL",
			range: "46-55",
			count: 5,
			desc: "Transport & networking",
		},
		{
			icon: "🟡",
			name: "AUDIT",
			range: "56-60",
			count: 5,
			desc: "Compliance & attestation",
		},
		{
			icon: "⚪",
			name: "TELEMETRY",
			range: "61-70",
			count: 10,
			desc: "System metrics",
		},
		{
			icon: "⚪",
			name: "CHROME",
			range: "71-80",
			count: 10,
			desc: "Cookie & auth telemetry",
		},
		{
			icon: "🔴",
			name: "RELEASE",
			range: "81-85",
			count: 5,
			desc: "Release pipeline",
		},
		{
			icon: "🟢",
			name: "MAPPING",
			range: "86-89",
			count: 4,
			desc: "URI & hyperlink mapping",
		},
	];

	for (const zone of zones) {
		const line = ` ${zone.icon} ${zone.name.padEnd(12)} │ ${zone.range.padEnd(7)} │ ${String(zone.count).padStart(2)} cols │ ${zone.desc}`;
		console.log(
			`${c.cyan}${box.v}${c.reset}${line}${" ".repeat(Math.max(0, 97 - line.length))}${c.cyan}${box.v}${c.reset}`,
		);
	}

	console.log(`${c.cyan}${box.mid}${c.reset}`);
	const totalLine = ` ${c.bold}TOTAL:${c.reset} ${TOTAL_COLUMNS} columns across 11 zones │ ${HyperlinkMapper.getLinkedColumns().length} with hyperlinks`;
	console.log(
		`${c.cyan}${box.v}${c.reset}${totalLine}${" ".repeat(Math.max(0, 97 - totalLine.length))}${c.cyan}${box.v}${c.reset}`,
	);
	console.log(`${c.cyan}${box.bot}${c.reset}\n`);
}

function printHyperlinkStatus() {
	console.log(`${c.cyan}${box.top}${c.reset}`);
	console.log(
		`${c.cyan}${box.v}${c.reset} ${c.bold}🔗 HYPERLINK MAPPING STATUS${c.reset} ${" ".repeat(68)}${c.cyan}${box.v}${c.reset}`,
	);
	console.log(`${c.cyan}${box.mid}${c.reset}`);

	const linked = HyperlinkMapper.getLinkedColumns();

	// Show first 10 linked columns
	for (let i = 0; i < Math.min(10, linked.length); i++) {
		const item = linked[i];
		const demoLink = HyperlinkMapper.getLink(item.index, {
			profileId: "demo-123",
			timestamp: "20260130",
			gameId: "game-456",
			zoneId: "zone-789",
		});
		const linkStr = demoLink
			? `${c.dim}${demoLink.substring(0, 50)}...${c.reset}`
			: `${c.red}no link${c.reset}`;
		const line = ` ${item.column.color}${String(item.index).padStart(2)}${c.reset} ${item.column.displayName.padEnd(20)} │ ${linkStr}`;
		console.log(
			`${c.cyan}${box.v}${c.reset}${line}${" ".repeat(Math.max(0, 97 - line.length))}${c.cyan}${box.v}${c.reset}`,
		);
	}

	if (linked.length > 10) {
		const moreLine = ` ${c.dim}... and ${linked.length - 10} more linked columns${c.reset}`;
		console.log(
			`${c.cyan}${box.v}${c.reset}${moreLine}${" ".repeat(Math.max(0, 97 - moreLine.length))}${c.cyan}${box.v}${c.reset}`,
		);
	}

	console.log(`${c.cyan}${box.bot}${c.reset}\n`);
}

function printSampleMatrix() {
	// Create sample row data
	const sampleRow = {
		profileId: "tier1380-demo",
		timestamp: "2026-01-30T00:00:00Z",
		// DEFAULT (0)
		0: "fallback",
		// CORE (1-10)
		1: "1.3.7",
		2: "v3.26",
		3: BigInt(Date.now()) * 1000000n, // nanoseconds
		4: "profile-uuid-1234",
		5: "production",
		7: 1380,
		// TENSION ZONE (31-45) - Key metrics
		31: 0.942, // Anomaly score (CRITICAL)
		32: 500,
		33: "propagation",
		35: true, // Q3 overreact
		36: 0.45,
		43: 0.89, // Severity
		44: true, // Alert triggered
		45: "https://profiles.factory-wager.com/tension/1380/prod/tension-md-20260130.md",
		// CLOUDFLARE (21-30)
		21: "zone-abc123",
		23: 142, // WAF blocks
		30: 0.94, // Cache hit ratio
		// CHROME (71-80)
		71: JSON.stringify({ expiring: 5, secure: 8 }),
		72: 3,
		75: 8, // Auth domains
		// TELEMETRY (61-70)
		61: 45.2, // CPU %
		62: BigInt(1024 * 1024 * 1024), // 1GB
		69: 86400, // Uptime
		// RELEASE (81-85)
		81: "minor",
		82: true,
		83: 2026013001,
		// MAPPING (86-89)
		86: 15, // Link count
		87: true,
		88: 42,
		89: "v3.26",
	};

	console.log(`${c.cyan}${box.top}${c.reset}`);
	console.log(
		`${c.cyan}${box.v}${c.reset} ${c.bold}🎯 SAMPLE MATRIX RENDER (Zone Mode)${c.reset} ${" ".repeat(60)}${c.cyan}${box.v}${c.reset}`,
	);
	console.log(`${c.cyan}${box.mid}${c.reset}`);

	// Use MatrixRenderer
	const output = MatrixRenderer.render90Column(sampleRow, { mode: "zones" });
	console.log(output);

	console.log(`${c.cyan}${box.bot}${c.reset}\n`);
}

function printNavigationDemo() {
	console.log(`${c.cyan}${box.top}${c.reset}`);
	console.log(
		`${c.cyan}${box.v}${c.reset} ${c.bold}🧭 CLICKABLE NAVIGATION MENU${c.reset} ${" ".repeat(64)}${c.cyan}${box.v}${c.reset}`,
	);
	console.log(`${c.cyan}${box.bot}${c.reset}`);

	const navMenu = HyperlinkMapper.generateNavMenu("demo-profile-001");
	console.log(navMenu);
}

function printFooter() {
	console.log(`
${c.cyan}${box.top}${c.reset}
${c.cyan}${box.v}${c.reset}                                                                                                  ${c.cyan}${box.v}${c.reset}
${c.cyan}${box.v}${c.reset}   ${c.bold}${c.yellow}✅ 90-COLUMN MATRIX READY${c.reset} │ ${c.cyan}All columns with URI patterns${c.reset} │ ${c.green}OSC 8 Hyperlinks Active${c.reset}     ${c.cyan}${box.v}${c.reset}
${c.cyan}${box.v}${c.reset}                                                                                                  ${c.cyan}${box.v}${c.reset}
${c.cyan}${box.v}${c.reset}   ${c.dim}Every cell is now clickable. Every zone is mapped. Every profile is traceable.${c.reset}            ${c.cyan}${box.v}${c.reset}
${c.cyan}${box.v}${c.reset}                                                                                                  ${c.cyan}${box.v}${c.reset}
${c.cyan}${box.bot}${c.reset}
`);
}

// Main execution
console.clear();
printHeader();
printColumnSummary();
printHyperlinkStatus();
printSampleMatrix();
printNavigationDemo();
printFooter();

// Export stats
console.log(`${c.dim}Hyperlink Pattern Validation:${c.reset}`);
const validation = HyperlinkMapper.validatePatterns();
console.log(`  ✅ Valid patterns: ${validation.valid}`);
console.log(`  ❌ Invalid patterns: ${validation.invalid}`);
if (validation.errors.length > 0) {
	console.log(`  Errors: ${validation.errors.join(", ")}`);
}
console.log();
