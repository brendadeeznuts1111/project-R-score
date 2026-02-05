#!/usr/bin/env bun
/**
 * [TEAM.INFO.CLI.RG:IMPLEMENTATION] Team Info CLI Wrapper
 * @fileoverview Enhanced CLI wrapper for mlgs.team.info MCP tool
 * @description Query TEAM.md via command line with rich formatting, multiple output formats, and query suggestions
 * @module scripts/team-info-cli
 *
 * [[TECH][MODULE][INSTANCE][META:{blueprint=BP-TEAM-INFO-CLI@2.0.0;instance-id=TEAM-INFO-CLI-001;version=2.0.0}]
 * [PROPERTIES:{cli={value:"team-info-cli";@root:"24.0.0.0.0.0.0";@chain:["BP-HUMAN-CAPITAL","BP-MCP-TOOLS"];@version:"2.0.0"}}]]
 * [CLASS:TeamInfoCLI][#REF:v-2.0.0.BP.TEAM.INFO.CLI.1.0.A.1.1.SCRIPT.1.1]]
 */

import { executeTeamInfoTool } from '../src/mcp/tools/team-info';

// [TEAM.INFO.CLI.COLORS.RG:CONFIG] ANSI Color Codes
const colors = {
	reset: '\x1b[0m',
	bright: '\x1b[1m',
	dim: '\x1b[2m',
	red: '\x1b[31m',
	green: '\x1b[32m',
	yellow: '\x1b[33m',
	blue: '\x1b[34m',
	magenta: '\x1b[35m',
	cyan: '\x1b[36m',
	white: '\x1b[37m',
	gray: '\x1b[90m',
};

// [TEAM.INFO.CLI.OPTIONS.RG:SCHEMA] CLI Options Interface
interface CLIOptions {
	query?: string;
	format: 'pretty' | 'json' | 'table' | 'markdown';
	noColors: boolean;
	showSection: boolean;
	showContacts: boolean;
	showMarkers: boolean;
	limit?: number;
	help: boolean;
	list: boolean;
	stats: boolean;
}

// [TEAM.INFO.CLI.PARSING.RG:IMPLEMENTATION] Parse Command Line Arguments
function parseArgs(): CLIOptions {
	const args = Bun.argv.slice(2);
	const options: CLIOptions = {
		format: 'pretty',
		noColors: false,
		showSection: true,
		showContacts: true,
		showMarkers: true,
		help: false,
		list: false,
		stats: false,
	};

	let queryParts: string[] = [];

	for (let i = 0; i < args.length; i++) {
		const arg = args[i];
		const nextArg = args[i + 1];

		switch (arg) {
			case '--format':
			case '-f':
				if (nextArg && ['pretty', 'json', 'table', 'markdown'].includes(nextArg)) {
					options.format = nextArg as CLIOptions['format'];
					i++;
				}
				break;
			case '--no-colors':
			case '--no-color':
				options.noColors = true;
				break;
			case '--no-section':
				options.showSection = false;
				break;
			case '--no-contacts':
				options.showContacts = false;
				break;
			case '--no-markers':
				options.showMarkers = false;
				break;
			case '--limit':
			case '-l':
				if (nextArg) {
					options.limit = parseInt(nextArg, 10);
					i++;
				}
				break;
			case '--help':
			case '-h':
				options.help = true;
				break;
			case '--list':
			case '-L':
				options.list = true;
				break;
			case '--stats':
			case '-s':
				options.stats = true;
				break;
			case '--':
				// Everything after -- is part of the query
				queryParts = args.slice(i + 1);
				i = args.length;
				break;
			default:
				if (!arg.startsWith('-')) {
					queryParts.push(arg);
				}
				break;
		}
	}

	options.query = queryParts.join(' ') || undefined;

	return options;
}

// [TEAM.INFO.CLI.HELP.RG:IMPLEMENTATION] Display Help Text
function printHelp() {
	console.log(`
${colors.cyan}${colors.bright}Team Info CLI${colors.reset} - Query Human Capital Knowledge Graph

${colors.bright}Usage:${colors.reset}
  bun run team:info [query] [options]
  bun run scripts/team-info-cli.ts [query] [options]

${colors.bright}Arguments:${colors.reset}
  query                    Query string (e.g., "department:api", "role:lead")
                           If omitted, shows available queries

${colors.bright}Options:${colors.reset}
  -f, --format <format>    Output format: pretty, json, table, markdown (default: pretty)
  --no-colors              Disable ANSI color output
  --no-section             Hide full section content
  --no-contacts            Hide contact information
  --no-markers             Hide related RG markers
  -l, --limit <number>     Limit number of matches displayed
  -L, --list               List all available query types
  -s, --stats              Show statistics about TEAM.md
  -h, --help               Show this help message

${colors.bright}Query Types:${colors.reset}
  ${colors.green}Department Queries:${colors.reset}
    department:api          API & Routing Team
    department:arbitrage   Arbitrage Trading Team
    department:orca        Orca Sports Team
    department:dashboard   Dashboard UI Team
    department:registry    Registry MCP Team
    department:security    Security Team
    department:performance Performance & Caching Team
    department:documentation Documentation & DX Team

  ${colors.green}Role Queries:${colors.reset}
    role:lead              Department Leads
    role:maintainer        Maintainers
    role:contributor       Contributors

  ${colors.green}Operational Queries:${colors.reset}
    communication          Communication protocols
    review                 Review assignment rules
    escalation             Escalation paths
    colors                 Department color scheme

${colors.bright}Examples:${colors.reset}
  ${colors.dim}# Query API department${colors.reset}
  bun run team:info department:api

  ${colors.dim}# Get JSON output${colors.reset}
  bun run team:info department:arbitrage --format json

  ${colors.dim}# Show only contacts${colors.reset}
  bun run team:info role:lead --no-section --no-markers

  ${colors.dim}# List all available queries${colors.reset}
  bun run team:info --list

  ${colors.dim}# Show statistics${colors.reset}
  bun run team:info --stats

  ${colors.dim}# Multiple queries${colors.reset}
  bun run team:info -- department:api role:lead
`);
}

// [TEAM.INFO.CLI.QUERY.LIST.RG:IMPLEMENTATION] List Available Queries
function printQueryList() {
	const queries = {
		departments: [
			'department:api',
			'department:arbitrage',
			'department:orca',
			'department:dashboard',
			'department:registry',
			'department:security',
			'department:performance',
			'department:documentation',
		],
		roles: ['role:lead', 'role:maintainer', 'role:contributor'],
		operational: ['communication', 'review', 'escalation', 'colors'],
	};

	console.log(`\n${colors.cyan}${colors.bright}Available Query Types${colors.reset}\n`);

	console.log(`${colors.green}${colors.bright}Departments:${colors.reset}`);
	queries.departments.forEach((q) => console.log(`  • ${q}`));

	console.log(`\n${colors.green}${colors.bright}Roles:${colors.reset}`);
	queries.roles.forEach((q) => console.log(`  • ${q}`));

	console.log(`\n${colors.green}${colors.bright}Operational:${colors.reset}`);
	queries.operational.forEach((q) => console.log(`  • ${q}`));

	console.log(`\n${colors.dim}Usage: bun run team:info <query>${colors.reset}\n`);
}

// [TEAM.INFO.CLI.FORMAT.JSON.RG:IMPLEMENTATION] JSON Output Formatter
function formatJSON(result: Awaited<ReturnType<typeof executeTeamInfoTool>>) {
	console.log(JSON.stringify(result, null, 2));
}

// [TEAM.INFO.CLI.FORMAT.TABLE.RG:IMPLEMENTATION] Table Output Formatter
function formatTable(
	result: Awaited<ReturnType<typeof executeTeamInfoTool>>,
	options: CLIOptions,
) {
	const c = options.noColors ? { reset: '', bright: '', dim: '', cyan: '', green: '', yellow: '', gray: '', red: '', magenta: '', blue: '', white: '' } : colors;

	console.log(`\n${c.cyan}${c.bright}Query Results${c.reset}`);
	console.log('─'.repeat(80));
	console.log(`${c.bright}Query:${c.reset} ${result.query}`);
	console.log(`${c.bright}Summary:${c.reset} ${result.summary}`);
	console.log(`${c.bright}Matches:${c.reset} ${result.matches.length}`);
	console.log('─'.repeat(80));

	if (result.matches.length > 0) {
		console.log(`\n${c.bright}Matches:${c.reset}\n`);
		const matches = options.limit ? result.matches.slice(0, options.limit) : result.matches;
		matches.forEach((match, i) => {
			const preview = match.content.split('\n')[0].substring(0, 70);
			console.log(`${c.green}${i + 1}.${c.reset} Line ${c.yellow}${match.line}${c.reset}: ${preview}${preview.length >= 70 ? '...' : ''}`);
			if (match.marker && options.showMarkers) {
				console.log(`   ${c.gray}Marker: [${match.marker}]${c.reset}`);
			}
		});
		if (result.matches.length > matches.length) {
			console.log(`\n${c.dim}... and ${result.matches.length - matches.length} more${c.reset}`);
		}
	}

	if (result.contacts && result.contacts.length > 0 && options.showContacts) {
		console.log(`\n${c.bright}Contacts:${c.reset}`);
		result.contacts.forEach((contact) => console.log(`  • ${c.cyan}${contact}${c.reset}`));
	}

	if (result.relatedMarkers && result.relatedMarkers.length > 0 && options.showMarkers) {
		console.log(`\n${c.bright}Related Markers:${c.reset}`);
		result.relatedMarkers.forEach((marker) => console.log(`  • ${c.gray}[${marker}]${c.reset}`));
	}
}

// [TEAM.INFO.CLI.FORMAT.MARKDOWN.RG:IMPLEMENTATION] Markdown Output Formatter
function formatMarkdown(
	result: Awaited<ReturnType<typeof executeTeamInfoTool>>,
	options: CLIOptions,
) {
	console.log(`# Team Info Query Results\n`);
	console.log(`**Query:** \`${result.query}\`\n`);
	console.log(`**Summary:** ${result.summary}\n`);
	console.log(`**Matches Found:** ${result.matches.length}\n`);

	if (result.matches.length > 0) {
		console.log(`## Matches\n`);
		const matches = options.limit ? result.matches.slice(0, options.limit) : result.matches;
		matches.forEach((match, i) => {
			console.log(`### Match ${i + 1} (Line ${match.line})\n`);
			console.log(`\`\`\`\n${match.content}\n\`\`\`\n`);
			if (match.marker && options.showMarkers) {
				console.log(`**Marker:** \`[${match.marker}]\`\n`);
			}
		});
	}

	if (result.section && options.showSection) {
		console.log(`## Full Section\n`);
		console.log(`\`\`\`markdown\n${result.section}\n\`\`\`\n`);
	}

	if (result.contacts && result.contacts.length > 0 && options.showContacts) {
		console.log(`## Contacts\n`);
		result.contacts.forEach((contact) => console.log(`- ${contact}`));
		console.log();
	}

	if (result.relatedMarkers && result.relatedMarkers.length > 0 && options.showMarkers) {
		console.log(`## Related Markers\n`);
		result.relatedMarkers.forEach((marker) => console.log(`- \`[${marker}]\``));
		console.log();
	}
}

// [TEAM.INFO.CLI.FORMAT.PRETTY.RG:IMPLEMENTATION] Pretty Output Formatter
function formatPretty(
	result: Awaited<ReturnType<typeof executeTeamInfoTool>>,
	options: CLIOptions,
) {
	const c: typeof colors = options.noColors ? { 
		reset: '', bright: '', dim: '', cyan: '', green: '', yellow: '', 
		magenta: '', gray: '', red: '', blue: '', white: '' 
	} : colors;

	console.log(`\n${c.cyan}${c.bright}🔍 Querying TEAM.md: "${result.query}"${c.reset}\n`);

	console.log(`${c.bright}📊 Results:${c.reset}`);
	console.log(`   ${c.green}Summary:${c.reset} ${result.summary}`);
	console.log(`   ${c.green}Matches:${c.reset} ${result.matches.length}`);
	if (result.contacts && result.contacts.length > 0 && options.showContacts) {
		console.log(`   ${c.green}Contacts:${c.reset} ${result.contacts.length}`);
	}
	if (result.relatedMarkers && result.relatedMarkers.length > 0 && options.showMarkers) {
		console.log(`   ${c.green}Related Markers:${c.reset} ${result.relatedMarkers.length}`);
	}
	console.log('');

	if (result.matches.length > 0) {
		console.log(`${c.bright}📍 Matches:${c.reset}`);
		const matches = options.limit ? result.matches.slice(0, options.limit) : result.matches;
		matches.forEach((match, i) => {
			const preview = match.content.split('\n')[0].substring(0, 75);
			console.log(`   ${c.yellow}${i + 1}.${c.reset} Line ${c.magenta}${match.line}${c.reset}: ${preview}${preview.length >= 75 ? '...' : ''}`);
			if (match.marker && options.showMarkers) {
				console.log(`      ${c.dim}Marker: [${match.marker}]${c.reset}`);
			}
		});
		if (result.matches.length > matches.length) {
			console.log(`   ${c.dim}... and ${result.matches.length - matches.length} more match(es)${c.reset}`);
		}
		console.log('');

		if (result.section && options.showSection) {
			console.log(`${c.bright}📄 Full Section:${c.reset}`);
			console.log(c.dim + '─'.repeat(80) + c.reset);
			console.log(result.section);
			console.log(c.dim + '─'.repeat(80) + c.reset);
		}

		if (result.contacts && result.contacts.length > 0 && options.showContacts) {
			console.log(`\n${c.bright}👥 Contacts:${c.reset}`);
			result.contacts.forEach((contact) => {
				console.log(`   ${c.cyan}•${c.reset} ${contact}`);
			});
		}

		if (result.relatedMarkers && result.relatedMarkers.length > 0 && options.showMarkers) {
			console.log(`\n${c.bright}🏷️  Related Markers:${c.reset}`);
			result.relatedMarkers.forEach((marker) => {
				console.log(`   ${c.gray}•${c.reset} [${marker}]`);
			});
		}
	} else {
		console.log(`${c.red}❌ No matches found${c.reset}`);
		console.log(`\n${c.dim}💡 Try:${c.reset}`);
		console.log(`   ${c.dim}bun run team:info department:arbitrage${c.reset}`);
		console.log(`   ${c.dim}bun run team:info role:lead${c.reset}`);
		console.log(`   ${c.dim}bun run team:info communication${c.reset}`);
		console.log(`   ${c.dim}bun run team:info --list${c.reset}`);
	}
}

// [TEAM.INFO.CLI.STATS.RG:IMPLEMENTATION] Show TEAM.md Statistics
async function showStats() {
	const { $ } = await import('bun');
	const { readFile } = await import('fs/promises');
	const { join } = await import('path');

	const teamMDPath = join(process.cwd(), '.github', 'TEAM.md');
	const content = await readFile(teamMDPath, 'utf-8');

	// Count RG markers (use regex match as fallback)
	const markerMatches = content.match(/\[[A-Z]+(\.[A-Z]+)+\.RG(:[A-Z]+)?\]/g);
	const markerCount = markerMatches ? markerMatches.length : 0;

	// Count departments
	const deptMatches = content.match(/\[TEAM\.DEPARTMENT\.[A-Z\.]+\.RG/g);
	const deptCount = deptMatches ? deptMatches.length.toString() : '0';

	// Count contacts
	const contactCount = (content.match(/@[a-zA-Z0-9_-]+/g) || []).length;

	// Count sections
	const sectionCount = (content.match(/^##\s+/gm) || []).length;

	const c = colors;
	console.log(`\n${c.cyan}${c.bright}📊 TEAM.md Statistics${c.reset}\n`);
	console.log(`   ${c.green}Total RG Markers:${c.reset} ${markerCount}`);
	console.log(`   ${c.green}Departments:${c.reset} ${deptCount}`);
	console.log(`   ${c.green}Contacts (@mentions):${c.reset} ${contactCount}`);
	console.log(`   ${c.green}Top-Level Sections:${c.reset} ${sectionCount}`);
	console.log(`   ${c.green}File Size:${c.reset} ${(content.length / 1024).toFixed(2)} KB`);
	console.log(`   ${c.green}Lines:${c.reset} ${content.split('\n').length}\n`);
}

// [TEAM.INFO.CLI.MAIN.RG:IMPLEMENTATION] Main CLI Execution
async function main() {
	const options = parseArgs();

	if (options.help) {
		printHelp();
		process.exit(0);
	}

	if (options.list) {
		printQueryList();
		process.exit(0);
	}

	if (options.stats) {
		await showStats();
		process.exit(0);
	}

	const query = options.query || 'department:api';

	try {
		const result = await executeTeamInfoTool({ query });

		switch (options.format) {
			case 'json':
				formatJSON(result);
				break;
			case 'table':
				formatTable(result, options);
				break;
			case 'markdown':
				formatMarkdown(result, options);
				break;
			case 'pretty':
			default:
				formatPretty(result, options);
				break;
		}
	} catch (error: any) {
		const c = options.noColors ? { reset: '', red: '', bright: '', dim: '', cyan: '', green: '', yellow: '', gray: '', magenta: '', blue: '', white: '' } : colors;
		console.error(`${c.red}${c.bright}❌ Error:${c.reset} ${error.message}`);
		if (error.stack && !options.noColors) {
			console.error(`${c.red}${error.stack}${c.reset}`);
		}
		process.exit(1);
	}
}

if (import.meta.main) {
	main();
}
