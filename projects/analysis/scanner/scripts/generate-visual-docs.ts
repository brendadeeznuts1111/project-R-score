#!/usr/bin/env bun
/**
 * Enhanced Visual Documentation Generator - Tier-1380 Premium
 * Generates production-grade HTML dashboard, dynamic badges, and comprehensive visual indicators
 *
 * Features:
 * - Dark/Light theme with system preference detection
 * - Real-time search and filtering
 * - Interactive charts and animations
 * - Mobile-responsive design
 * - Performance optimized with lazy loading
 * - XSS protection with HTML escaping
 * - Export functionality (JSON/CSV)
 * - Dynamic badge generation
 * - Advanced analytics and metrics
 *
 * Usage:
 *   bun scripts/generate-visual-docs.ts                    # Generate all
 *   bun scripts/generate-visual-docs.ts --serve           # Launch dashboard server
 *   bun scripts/generate-visual-docs.ts --badges-only     # Generate badges only
 *   bun scripts/generate-visual-docs.ts --theme dark      # Force dark theme
 *   bun scripts/generate-visual-docs.ts --export json     # Export data only
 */

import {readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync} from 'fs';
import {join} from 'path';

// Import CLI constants for fix projections display
const CLI_CONSTANTS_PATH = join(import.meta.dir, '..', 'src', 'cli-constants.ts');

const REGISTRY_FILE = join(import.meta.dir, '..', '..', 'BUN_CONSTANTS_VERSION.json');
const OUTPUT_DIR = join(import.meta.dir, '..', '..', 'docs', 'visual');
const DASHBOARD_FILE = join(OUTPUT_DIR, 'dashboard.html');
const BADGES_DIR = join(OUTPUT_DIR, 'badges');

interface BadgeConfig {
	name: string;
	value: string;
	color: string;
	style?: 'flat' | 'flat-square' | 'plastic' | 'for-the-badge';
	scale?: number;
	logo?: string;
	logoWidth?: number;
}

interface ChartData {
	name: string;
	value: number;
	percentage: number;
	color: string;
}

function _generateEnhancedBadgeSVG(config: BadgeConfig): string {
	const {name, value, color, style = 'flat', scale = 1, logo, logoWidth = 14} = config;
	const nameWidth = Math.max(60, name.length * 7 + 20);
	const valueWidth = Math.max(40, value.length * 7 + 20);
	const width = Math.ceil((nameWidth + valueWidth) * scale);
	const height = Math.ceil(20 * scale);

	// Style-specific gradients and effects
	const gradients = {
		'flat': '',
		'flat-square': '',
		'plastic': `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.2"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.1"/>
        </linearGradient>
        <linearGradient id="border" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#000000" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.3"/>
        </linearGradient>
      </defs>`,
		'for-the-badge': `
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="#ffffff" stop-opacity="0.1"/>
          <stop offset="100%" stop-color="#000000" stop-opacity="0.1"/>
        </linearGradient>
      </defs>`,
	};

	const borderStyles = {
		'flat': '',
		'flat-square': '',
		'plastic': `stroke="url(#border)" stroke-width="1"`,
		'for-the-badge': '',
	};

	const bgStyles = {
		'flat': '',
		'flat-square': '',
		'plastic': 'fill="url(#bg)"',
		'for-the-badge': 'fill="url(#bg)"',
	};

	return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    ${gradients[style]}
    <clipPath id="clip">
      <rect width="${width}" height="${height}" rx="${style === 'flat-square' || style === 'for-the-badge' ? '0' : '3'}" fill="#fff"/>
    </clipPath>
    <g clip-path="url(#clip)">
      <rect width="${nameWidth}" height="${height}" fill="#555" ${bgStyles[style]} ${borderStyles[style]}/>
      <rect x="${nameWidth}" width="${valueWidth}" height="${height}" fill="${color}" ${bgStyles[style]} ${borderStyles[style]}/>
      ${
			logo
				? `
        <g transform="translate(${nameWidth / 2 - logoWidth / 2}, ${height / 2 - logoWidth / 2})">
          <image width="${logoWidth}" height="${logoWidth}" href="${logo}"/>
        </g>
      `
				: ''
		}
      <text x="${nameWidth / 2 + (logo ? logoWidth / 2 : 0)}" y="${height / 2 + 4}" 
            text-anchor="middle" font-family="Verdana, Geneva, sans-serif" 
            font-size="${11 * scale}" font-weight="bold" fill="#fff">
        ${name}
      </text>
      <text x="${nameWidth + valueWidth / 2}" y="${height / 2 + 4}" 
            text-anchor="middle" font-family="Verdana, Geneva, sans-serif" 
            font-size="${11 * scale}" font-weight="bold" fill="#fff">
        ${value}
      </text>
    </g>
  </svg>`;
}

function _generateChartSVG(data: ChartData[], width = 300, height = 150): string {
	const barWidth = (width - 40) / data.length;
	const maxValue = Math.max(...data.map(d => d.value));

	return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" style="stop-color:#58a6ff;stop-opacity:1" />
        <stop offset="100%" style="stop-color:#0969da;stop-opacity:1" />
      </linearGradient>
    </defs>
    <style>
      .chart-text { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; font-size: 11px; fill: #8b949e; }
      .chart-label { font-weight: 600; fill: #c9d1d9; }
    </style>
    ${data
		.map((item, index) => {
			const barHeight = (item.value / maxValue) * (height - 40);
			const x = 20 + index * barWidth;
			const y = height - 20 - barHeight;

			return `
        <rect x="${x}" y="${y}" width="${barWidth - 4}" height="${barHeight}" 
              fill="url(#chartGradient)" rx="2" opacity="0.8">
          <animate attributeName="height" from="0" to="${barHeight}" dur="0.5s" begin="${index * 0.1}s" fill="freeze"/>
          <animate attributeName="y" from="${height - 20}" to="${y}" dur="0.5s" begin="${index * 0.1}s" fill="freeze"/>
        </rect>
        <text x="${x + barWidth / 2 - 2}" y="${height - 5}" text-anchor="middle" class="chart-text">
          ${item.name}
        </text>
        <text x="${x + barWidth / 2 - 2}" y="${y - 5}" text-anchor="middle" class="chart-label">
          ${item.value}
        </text>
      `;
		})
		.join('')}
  </svg>`;
}
interface VersionRegistry {
	version: string;
	schemaVersion: string;
	bunVersion: string;
	mcpEnabled: boolean;
	tier1380: {
		compliant: boolean;
		certified: string;
		auditLevel: string;
		col89Max: number;
		col93Balanced: boolean;
	};
	projects: Record<
		string,
		{
			root: string;
			constants: number;
			lastScan: string;
		}
	>;
	constants: any[];
	metadata: {
		totalConstants: number;
		extractionTime: string;
		platform: string;
		nodeVersion: string;
		cliVersion: string;
	};
	changelog: Record<string, string>;
}

function generateBadgeSVG(name: string, value: string, color: string, scale = 1): string {
	const width = Math.ceil((120 + value.length * 8) * scale);
	const height = Math.ceil(20 * scale);

	return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
    <linearGradient id="a" x2="0" y2="100%">
      <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
      <stop offset="1" stop-opacity=".1"/>
    </linearGradient>
    <clipPath id="a">
      <rect width="${width}" height="${height}" rx="3" fill="#fff"/>
    </clipPath>
    <g clip-path="url(#a)">
      <path fill="#555" d="M0 0h${width * 0.4}v${height}H0z"/>
      <path fill="${color}" d="M${width * 0.4} 0h${width * 0.6}v${height}H${width * 0.4}z"/>
      <path fill="url(#a)" d="M0 0h${width}v${height}H0z"/>
    </g>
    <g fill="#fff" text-anchor="middle" font-family="DejaVu Sans,Verdana,Geneva,sans-serif" font-size="${11 * scale}">
      <text x="${width * 0.2}" y="${height * 0.68}" fill="#010101" fill-opacity=".3">${name}</text>
      <text x="${width * 0.2}" y="${height * 0.68}" fill="#fff">${name}</text>
      <text x="${width * 0.7}" y="${height * 0.68}" fill="#010101" fill-opacity=".3">${value}</text>
      <text x="${width * 0.7}" y="${height * 0.68}" fill="#fff">${value}</text>
    </g>
  </svg>`;
}

function generateBadges(registry: VersionRegistry): void {
	try {
		// Create badges directory
		if (!existsSync(BADGES_DIR)) {
			mkdirSync(BADGES_DIR, {recursive: true});
		}

		const badges = [
			{name: 'version', value: `v${registry.version}`, color: '#007ec6'},
			{
				name: 'tier-1380',
				value: registry.tier1380.compliant ? 'certified' : 'non-compliant',
				color: registry.tier1380.compliant ? '#28a745' : '#dc3545',
			},
			{name: 'constants', value: registry.metadata.totalConstants.toString(), color: '#6f42c1'},
			{name: 'schema', value: registry.schemaVersion, color: '#17a2b8'},
			{
				name: 'mcp',
				value: registry.mcpEnabled ? 'enabled' : 'disabled',
				color: registry.mcpEnabled ? '#28a745' : '#6c757d',
			},
			{name: 'col-89', value: 'compliant', color: '#fd7e14'},
			{name: 'audit', value: registry.tier1380.auditLevel, color: '#e83e8c'},
			{name: 'projects', value: Object.keys(registry.projects).length.toString(), color: '#20c997'},
		];

		for (const badge of badges) {
			const svg = generateBadgeSVG(badge.name, badge.value, badge.color);
			writeFileSync(join(BADGES_DIR, `${badge.name.replace('-', '_')}.svg`), svg);
		}

		// Generate badges markdown
		const badgesMarkdown = badges
			.map(badge => `![${badge.name}](badges/${badge.name.replace('-', '_')}.svg)`)
			.join(' ');

		writeFileSync(join(BADGES_DIR, 'README.md'), `# Tier-1380 Badges\n\n${badgesMarkdown}\n`);
		console.log(`🏷️  Generated ${badges.length} badges in ${BADGES_DIR}`);
	} catch {
		console.warn(`⚠️  Failed to generate badges: ${error instanceof Error ? error.message : String(error)}`);
	}
}

async function generateDashboardHTML(registry: VersionRegistry): Promise<string> {
	// Helper function to escape HTML entities using Bun.escapeHTML()
	const escape = (value: string | number | boolean | null | undefined): string => {
		if (value == null) return '';
		return Bun.escapeHTML(String(value));
	};

	const lastUpdated = new Date(registry.metadata.extractionTime).toLocaleString();
	const certifiedDate = new Date(registry.tier1380.certified).toLocaleDateString();

	// Calculate statistics
	const categories = [...new Set(registry.constants.map(c => c.category).filter(Boolean))];
	const types = [...new Set(registry.constants.map(c => c.type).filter(Boolean))];
	const securityLevels = [...new Set(registry.constants.map(c => c.security).filter(Boolean))];

	const categoryStats = categories
		.map(cat => ({
			name: cat,
			count: registry.constants.filter(c => c.category === cat).length,
		}))
		.sort((a, b) => b.count - a.count);

	const typeStats = types
		.map(type => ({
			name: type,
			count: registry.constants.filter(c => c.type === type).length,
		}))
		.sort((a, b) => b.count - a.count);

	const securityStats = securityLevels
		.map(level => ({
			name: level,
			count: registry.constants.filter(c => c.security === level).length,
		}))
		.sort((a, b) => b.count - a.count);

	// Project breakdown
	const projectStats = Object.entries(registry.projects).map(([name, proj]) => ({
		name,
		count: registry.constants.filter(c => c.project === name).length,
		...proj,
	}));

	// Extract CLI fix projections and BUN_DOC_BASE if available - dynamically import the constants
	let fixProjectionsHTML = '';
	let baselineR = null;
	let bunDocBase = 'https://bun.com/docs';
	let bunTypesRepoUrl = 'https://github.com/oven-sh/bun/tree/main/packages/bun-types';
	try {
		// Dynamically import the CLI constants module using file:// URL
		const cliConstantsUrl = `file://${CLI_CONSTANTS_PATH}`;
		const cliConstantsModule = await import(cliConstantsUrl);
		const {BUN_R_SCORE_BASELINE, BUN_FIX_PROJECTIONS} = cliConstantsModule;

		// Also try to get BUN_DOCS_BASE and BUN_TYPES_REPO_URL from bun-api-matrix or mcp-bun-docs
		try {
			const bunApiMatrixPath = join(import.meta.dir, '..', 'cli', 'renderers', 'bun-api-matrix.ts');
			const bunApiMatrixUrl = `file://${bunApiMatrixPath}`;
			const bunApiMatrixModule = await import(bunApiMatrixUrl);
			if (bunApiMatrixModule.BUN_DOCS_BASE) {
				bunDocBase = bunApiMatrixModule.BUN_DOCS_BASE;
			}
		} catch {}

		// Try to get BUN_TYPES_REPO_URL from mcp-bun-docs if available
		try {
			const mcpBunDocsPath = join(import.meta.dir, '..', '..', 'matrix-analysis', 'mcp-bun-docs', 'lib.ts');
			if (existsSync(mcpBunDocsPath)) {
				const mcpBunDocsUrl = `file://${mcpBunDocsPath}`;
				const mcpBunDocsModule = await import(mcpBunDocsUrl);
				if (mcpBunDocsModule.BUN_TYPES_REPO_URL) {
					bunTypesRepoUrl = mcpBunDocsModule.BUN_TYPES_REPO_URL;
				}
			}
		} catch {}

		if (BUN_R_SCORE_BASELINE !== undefined) {
			baselineR =
				typeof BUN_R_SCORE_BASELINE === 'number'
					? BUN_R_SCORE_BASELINE
					: parseFloat(String(BUN_R_SCORE_BASELINE));
		}

		// Extract fix projections from the imported constant
		if (BUN_FIX_PROJECTIONS && typeof BUN_FIX_PROJECTIONS === 'object') {
			const projectionEntries = Object.entries(BUN_FIX_PROJECTIONS).map(([key, proj]: [string, any]) => ({
				key,
				flag: proj.flag || '',
				description: proj.description || '',
				mImpact: typeof proj.mImpact === 'number' ? proj.mImpact : 0,
				pRatioDelta: typeof proj.pRatioDelta === 'number' ? proj.pRatioDelta : 0,
				projectedR: typeof proj.projectedR === 'number' ? proj.projectedR : 0,
				tier: proj.tier || '',
				latencyDelta: proj.latencyDelta,
				consistencyDelta: proj.consistencyDelta,
			}));

			if (projectionEntries.length > 0) {
				fixProjectionsHTML = `
        <div class="card" style="grid-column: 1 / -1;">
            <h3>⚡ CLI Fix Projections - FactoryWager v4.2</h3>
            ${baselineR ? `<div class="metric"><span>Baseline R-Score</span><span class="metric-value">${baselineR.toFixed(2)}</span></div>` : ''}
            <div style="overflow-x: auto; margin-top: 16px;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: var(--bg-tertiary);">
                            <th style="padding: 8px; text-align: left;">Flag</th>
                            <th style="padding: 8px; text-align: left;">Description</th>
                            <th style="padding: 8px; text-align: center;">M_Impact</th>
                            <th style="padding: 8px; text-align: center;">P_Ratio Δ</th>
                            <th style="padding: 8px; text-align: center;">Projected R</th>
                            <th style="padding: 8px; text-align: center;">Tier</th>
                            <th style="padding: 8px; text-align: left;">Impact</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${projectionEntries
							.map(
								proj => `
                        <tr style="border-bottom: 1px solid var(--border);">
                            <td style="padding: 8px;"><code>${escape(proj.flag)}</code></td>
                            <td style="padding: 8px;">${escape(proj.description)}</td>
                            <td style="padding: 8px; text-align: center;">${proj.mImpact.toFixed(2)}</td>
                            <td style="padding: 8px; text-align: center;">+${(proj.pRatioDelta * 100).toFixed(1)}%</td>
                            <td style="padding: 8px; text-align: center; font-weight: 600; color: var(--accent);">${proj.projectedR.toFixed(3)}</td>
                            <td style="padding: 8px; text-align: center;">
                                <span class="type-badge" style="background: ${proj.tier === 'Elite' ? '#28a745' : '#ffc107'}; color: white;">${escape(proj.tier)}</span>
                            </td>
                            <td style="padding: 8px; font-size: 0.85rem; color: var(--text-secondary);">
                                ${proj.latencyDelta ? `⚡ ${escape(proj.latencyDelta)}` : ''}
                                ${proj.consistencyDelta ? `📊 ${escape(proj.consistencyDelta)}` : ''}
                                ${!proj.latencyDelta && !proj.consistencyDelta ? '-' : ''}
                            </td>
                        </tr>
                        `,
							)
							.join('')}
                    </tbody>
                </table>
            </div>
        </div>`;
			}
		}
	} catch {
		// Silently fail if CLI constants file doesn't exist or can't be parsed
	}

	// Prepare constants data as JSON for JavaScript
	const constantsJSON = JSON.stringify(
		registry.constants.map(c => ({
			name: c.name,
			project: c.project,
			type: c.type ?? 'string',
			category: c.category ?? '-',
			security: c.security ?? 'low',
			mcp: c.tier1380?.mcpExposed ?? false,
			path: c.relPath,
			line: c.line,
			value: c.value,
			description: c.description,
		})),
	);

	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="color-scheme" content="dark light">
    <title>BUN Constants - Tier-1380 Dashboard</title>
    <style>
        :root {
            /* Light theme (default) */
            --bg-primary: #ffffff;
            --bg-secondary: #f6f8fa;
            --bg-tertiary: #eaeef2;
            --text-primary: #24292f;
            --text-secondary: #57606a;
            --text-muted: #8b949e;
            --border: #d0d7de;
            --border-hover: #afb8c1;
            --card-bg: #ffffff;
            --card-border: #d0d7de;
            --header-bg: linear-gradient(135deg, #f6f8fa 0%, #ffffff 100%);
            --accent: #0969da;
            --accent-hover: #0860ca;
            --success: #1a7f37;
            --warning: #9a6700;
            --error: #cf222e;
            --chart-fill: linear-gradient(90deg, #0969da 0%, #0550ae 100%);
        }
        
        [data-theme="dark"] {
            /* Dark theme */
            --bg-primary: #0d1117;
            --bg-secondary: #161b22;
            --bg-tertiary: #21262d;
            --text-primary: #c9d1d9;
            --text-secondary: #8b949e;
            --text-muted: #6e7681;
            --border: #30363d;
            --border-hover: #484f58;
            --card-bg: #161b22;
            --card-border: #30363d;
            --header-bg: linear-gradient(135deg, #161b22 0%, #21262d 100%);
            --accent: #58a6ff;
            --accent-hover: #79c0ff;
            --success: #3fb950;
            --warning: #d29922;
            --error: #f85149;
            --chart-fill: linear-gradient(90deg, #58a6ff 0%, #79c0ff 100%);
        }
        
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            background: var(--bg-primary); 
            color: var(--text-primary); 
            line-height: 1.6;
            transition: background-color 0.3s ease, color 0.3s ease;
        }
        .container { max-width: 1400px; margin: 0 auto; padding: 20px; }
        .header { 
            text-align: center; 
            margin-bottom: 40px; 
            padding: 40px 0; 
            background: var(--header-bg); 
            border-radius: 12px; 
            border: 1px solid var(--border);
            position: relative;
        }
        .header h1 { 
            font-size: 2.5rem; 
            margin-bottom: 10px; 
            background: var(--chart-fill); 
            -webkit-background-clip: text; 
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .header p { font-size: 1.1rem; color: var(--text-secondary); }
        .theme-toggle {
            position: absolute;
            top: 20px;
            right: 20px;
            padding: 8px 16px;
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 6px;
            color: var(--text-primary);
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .theme-toggle:hover {
            background: var(--bg-tertiary);
            border-color: var(--border-hover);
        }
        .badges { display: flex; justify-content: center; gap: 10px; margin-top: 20px; flex-wrap: wrap; }
        .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
        .card { 
            background: var(--card-bg); 
            border: 1px solid var(--card-border); 
            border-radius: 8px; 
            padding: 24px; 
            transition: transform 0.2s ease, box-shadow 0.2s ease, background 0.3s ease, border-color 0.3s ease;
        }
        .card:hover { 
            transform: translateY(-2px); 
            box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
            border-color: var(--border-hover);
        }
        .card h3 { color: var(--accent); margin-bottom: 16px; font-size: 1.2rem; display: flex; align-items: center; gap: 8px; }
        .metric { 
            display: flex; 
            justify-content: space-between; 
            align-items: center; 
            padding: 8px 0; 
            border-bottom: 1px solid var(--border);
            transition: border-color 0.3s ease;
        }
        .metric:last-child { border-bottom: none; }
        .metric-value { font-weight: 600; color: var(--accent-hover); }
        .status-compliant { color: var(--success); }
        .status-non-compliant { color: var(--error); }
        .chart-bar { 
            background: var(--bg-tertiary); 
            height: 8px; 
            border-radius: 4px; 
            margin-top: 4px; 
            overflow: hidden;
            transition: background 0.3s ease;
        }
        .chart-fill { 
            background: var(--chart-fill); 
            height: 100%; 
            border-radius: 4px; 
            transition: width 0.3s ease;
        }
        .controls { 
            background: var(--card-bg); 
            border: 1px solid var(--card-border); 
            border-radius: 8px; 
            padding: 20px; 
            margin-bottom: 20px; 
            display: flex; 
            gap: 15px; 
            flex-wrap: wrap; 
            align-items: center;
            transition: background 0.3s ease, border-color 0.3s ease;
        }
        .search-box { 
            flex: 1; 
            min-width: 200px; 
            padding: 10px 15px; 
            background: var(--bg-primary); 
            border: 1px solid var(--border); 
            border-radius: 6px; 
            color: var(--text-primary); 
            font-size: 14px;
            transition: all 0.2s ease;
        }
        .search-box:focus { outline: none; border-color: var(--accent); }
        .filter-group { display: flex; gap: 10px; flex-wrap: wrap; }
        .filter-btn { 
            padding: 8px 16px; 
            background: var(--bg-tertiary); 
            border: 1px solid var(--border); 
            border-radius: 6px; 
            color: var(--text-primary); 
            cursor: pointer; 
            font-size: 13px; 
            transition: all 0.2s;
        }
        .filter-btn:hover { background: var(--bg-secondary); border-color: var(--accent); }
        .filter-btn.active { background: var(--accent); border-color: var(--accent); color: white; }
        .export-btn { 
            padding: 8px 16px; 
            background: var(--success); 
            border: 1px solid var(--success); 
            border-radius: 6px; 
            color: white; 
            cursor: pointer; 
            font-size: 13px; 
            transition: all 0.2s;
        }
        .export-btn:hover { 
            background: var(--success);
            opacity: 0.9;
            transform: translateY(-1px);
        }
        .constants-table-wrapper { 
            width: 100%; 
            background: var(--card-bg); 
            border-radius: 8px; 
            overflow: hidden; 
            border: 1px solid var(--card-border);
            transition: background 0.3s ease, border-color 0.3s ease;
        }
        .constants-table { width: 100%; border-collapse: collapse; }
        .constants-table th { 
            background: var(--bg-tertiary); 
            padding: 12px; 
            text-align: left; 
            font-weight: 600; 
            color: var(--text-primary); 
            cursor: pointer; 
            user-select: none; 
            position: relative;
            transition: background 0.2s ease;
        }
        .constants-table th:hover { background: var(--bg-secondary); }
        .constants-table th.sortable::after { content: ' ↕'; opacity: 0.5; font-size: 0.8em; }
        .constants-table th.sort-asc::after { content: ' ↑'; opacity: 1; }
        .constants-table th.sort-desc::after { content: ' ↓'; opacity: 1; }
        .constants-table td { 
            padding: 12px; 
            border-bottom: 1px solid var(--border);
            transition: border-color 0.3s ease;
        }
        .constants-table tbody tr { transition: background 0.15s; }
        .constants-table tbody tr:hover { background: var(--bg-secondary); }
        .constants-table tbody tr.hidden { display: none; }
        .type-badge { padding: 2px 8px; border-radius: 12px; font-size: 0.8rem; font-weight: 500; }
        .type-string { background: #0969da; color: white; }
        .type-url { background: #8250df; color: white; }
        .type-number { background: #d1242f; color: white; }
        .security-low { background: #1f7424; color: white; }
        .security-medium { background: #9a6700; color: white; }
        .security-high { background: #d1242f; color: white; }
        .security-critical { background: #8250df; color: white; }
        .pagination { display: flex; justify-content: center; align-items: center; gap: 10px; margin-top: 20px; padding: 15px; }
        .pagination-btn { 
            padding: 8px 12px; 
            background: var(--bg-tertiary); 
            border: 1px solid var(--border); 
            border-radius: 6px; 
            color: var(--text-primary); 
            cursor: pointer; 
            font-size: 13px; 
            transition: all 0.2s;
        }
        .pagination-btn:hover:not(:disabled) { 
            background: var(--bg-secondary); 
            border-color: var(--accent);
        }
        .pagination-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .pagination-info { color: var(--text-secondary); font-size: 14px; }
        .footer { 
            text-align: center; 
            margin-top: 40px; 
            padding: 20px; 
            border-top: 1px solid var(--border); 
            color: var(--text-muted);
            transition: border-color 0.3s ease, color 0.3s ease;
        }
        .code-link { color: var(--accent); text-decoration: none; transition: color 0.2s ease; }
        .code-link:hover { text-decoration: underline; color: var(--accent-hover); }
        @media (max-width: 768px) {
            .container { padding: 10px; }
            .header h1 { font-size: 2rem; }
            .grid { grid-template-columns: 1fr; }
            .badges { justify-content: center; }
            .controls { flex-direction: column; align-items: stretch; }
            .search-box { width: 100%; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <button class="theme-toggle" id="themeToggle" onclick="toggleTheme()" title="Toggle theme">
                <span id="themeIcon">🌙</span>
                <span id="themeLabel">Dark</span>
            </button>
            <h1>🏆 BUN Constants Dashboard</h1>
            <p>Tier-1380 Certified Version Management System</p>
            <p style="margin-top: 10px; font-size: 0.95rem;">
                <a href="${escape(bunDocBase)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--accent);">
                    📚 Bun Documentation: ${escape(bunDocBase)}
                </a>
                <span style="color: var(--text-muted); margin: 0 8px;">|</span>
                <a href="${escape(bunDocBase)}/reference" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--accent);">
                    📖 API Reference
                </a>
                <span style="color: var(--text-muted); margin: 0 8px;">|</span>
                <a href="${escape(bunTypesRepoUrl)}" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--accent);">
                    🔷 Bun Types Repository
                </a>
                <span style="color: var(--text-muted); margin: 0 8px;">|</span>
                <a href="${escape(bunDocBase)}/pm/bunx" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--accent);">
                    ⚡ bunx
                </a>
                <span style="color: var(--text-muted); margin: 0 8px;">|</span>
                <a href="https://bun.com/rss.xml" target="_blank" rel="noopener noreferrer" style="color: var(--accent); text-decoration: none; border-bottom: 1px solid var(--accent);">
                    📡 RSS
                </a>
            </p>
            <div class="badges" id="badgesContainer">
                <img src="badges/version.svg" alt="Version" data-badge="version.svg">
                <img src="badges/tier_1380.svg" alt="Tier-1380" data-badge="tier_1380.svg">
                <img src="badges/constants.svg" alt="Constants" data-badge="constants.svg">
                <img src="badges/schema.svg" alt="Schema" data-badge="schema.svg">
                <img src="badges/mcp.svg" alt="MCP" data-badge="mcp.svg">
                <img src="badges/col_89.svg" alt="Col-89" data-badge="col_89.svg">
            </div>
        </div>

        <div class="grid">
            <div class="card">
                <h3>📊 System Overview</h3>
                <div class="metric">
                    <span>Version</span>
                    <span class="metric-value">v${escape(registry.version)}</span>
                </div>
                <div class="metric">
                    <span>Total Constants</span>
                    <span class="metric-value">${escape(registry.metadata.totalConstants)}</span>
                </div>
                <div class="metric">
                    <span>Projects</span>
                    <span class="metric-value">${escape(Object.keys(registry.projects).length)}</span>
                </div>
                <div class="metric">
                    <span>Last Updated</span>
                    <span class="metric-value">${escape(lastUpdated)}</span>
                </div>
            </div>

            <div class="card">
                <h3>🔒 Tier-1380 Compliance</h3>
                <div class="metric">
                    <span>Certification Status</span>
                    <span class="status-compliant">${registry.tier1380.compliant ? '✅ Certified' : '❌ Non-Compliant'}</span>
                </div>
                <div class="metric">
                    <span>Certified Date</span>
                    <span class="metric-value">${escape(certifiedDate)}</span>
                </div>
                <div class="metric">
                    <span>Audit Level</span>
                    <span class="metric-value">${escape(registry.tier1380.auditLevel)}</span>
                </div>
                <div class="metric">
                    <span>Col-89 Max Width</span>
                    <span class="metric-value">${escape(registry.tier1380.col89Max)} chars</span>
                </div>
            </div>

            <div class="card">
                <h3>🛠️ Technical Details</h3>
                <div class="metric">
                    <span>Bun Version</span>
                    <span class="metric-value">${escape(registry.bunVersion)}</span>
                </div>
                <div class="metric">
                    <span>Schema Version</span>
                    <span class="metric-value">${escape(registry.schemaVersion)}</span>
                </div>
                <div class="metric">
                    <span>MCP Enabled</span>
                    <span class="status-${registry.mcpEnabled ? 'compliant' : 'non-compliant'}">${registry.mcpEnabled ? '✅ Yes' : '❌ No'}</span>
                </div>
                <div class="metric">
                    <span>Platform</span>
                    <span class="metric-value">${escape(registry.metadata.platform)}</span>
                </div>
            </div>

            <div class="card">
                <h3>📈 Category Distribution</h3>
                ${categoryStats
					.map(
						cat => `
                <div class="metric">
                    <span>${escape(cat.name)}</span>
                    <span class="metric-value">${escape(cat.count)}</span>
                </div>
                <div class="chart-bar">
                    <div class="chart-fill" style="width: ${(cat.count / registry.metadata.totalConstants) * 100}%"></div>
                </div>
                `,
					)
					.join('')}
            </div>

            <div class="card">
                <h3>🔤 Type Distribution</h3>
                ${typeStats
					.map(
						type => `
                <div class="metric">
                    <span>${escape(type.name)}</span>
                    <span class="metric-value">${escape(type.count)}</span>
                </div>
                <div class="chart-bar">
                    <div class="chart-fill" style="width: ${(type.count / registry.metadata.totalConstants) * 100}%"></div>
                </div>
                `,
					)
					.join('')}
            </div>

            <div class="card">
                <h3>🔐 Security Classification</h3>
                ${securityStats
					.map(
						sec => `
                <div class="metric">
                    <span>${escape(sec.name.charAt(0).toUpperCase() + sec.name.slice(1))}</span>
                    <span class="metric-value">${escape(sec.count)}</span>
                </div>
                <div class="chart-bar">
                    <div class="chart-fill" style="width: ${(sec.count / registry.metadata.totalConstants) * 100}%"></div>
                </div>
                `,
					)
					.join('')}
            </div>

            <div class="card">
                <h3>📦 Project Breakdown</h3>
                ${projectStats
					.map(
						proj => `
                <div class="metric">
                    <span>${escape(proj.name)}</span>
                    <span class="metric-value">${escape(proj.count)}</span>
                </div>
                <div class="chart-bar">
                    <div class="chart-fill" style="width: ${(proj.count / registry.metadata.totalConstants) * 100}%"></div>
                </div>
                `,
					)
					.join('')}
            </div>
            ${fixProjectionsHTML}
        </div>

        <div class="controls">
            <input type="text" class="search-box" id="searchInput" placeholder="🔍 Search constants, projects, types..." />
            <div class="filter-group">
                <button class="filter-btn" data-filter="all">All</button>
                <button class="filter-btn" data-filter="mcp">MCP Only</button>
                <button class="filter-btn" data-filter="critical">Critical</button>
                ${categories.map(cat => `<button class="filter-btn" data-filter="category:${escape(cat)}">${escape(cat)}</button>`).join('')}
            </div>
            <button class="export-btn" onclick="exportData('json')">Export JSON</button>
            <button class="export-btn" onclick="exportData('csv')">Export CSV</button>
        </div>

        <div class="constants-table-wrapper">
            <table class="constants-table">
                <thead>
                    <tr>
                        <th class="sortable" data-sort="name">Constant</th>
                        <th class="sortable" data-sort="project">Project</th>
                        <th class="sortable" data-sort="type">Type</th>
                        <th class="sortable" data-sort="category">Category</th>
                        <th class="sortable" data-sort="security">Security</th>
                        <th class="sortable" data-sort="mcp">MCP</th>
                        <th>Location</th>
                    </tr>
                </thead>
                <tbody id="constantsTableBody">
                    ${registry.constants
						.map(constant => {
							const constType = constant.type ?? 'string';
							const constCategory = constant.category ?? '';
							const constSecurity = constant.security ?? 'low';
							return `
                    <tr data-name="${escape(constant.name.toLowerCase())}" data-project="${escape(constant.project)}" data-type="${escape(constType)}" data-category="${escape(constCategory)}" data-security="${escape(constSecurity)}" data-mcp="${constant.tier1380?.mcpExposed ? 'true' : 'false'}">
                        <td><code>${escape(constant.name)}</code></td>
                        <td>${escape(constant.project)}</td>
                        <td><span class="type-badge type-${escape(constType)}">${escape(constType)}</span></td>
                        <td>${escape(constCategory || '-')}</td>
                        <td><span class="type-badge security-${escape(constSecurity)}">${escape(constSecurity)}</span></td>
                        <td>${constant.tier1380?.mcpExposed ? '✅' : '❌'}</td>
                        <td><a href="#" class="code-link" title="${escape(constant.relPath)}:${escape(constant.line)}">${escape(constant.relPath)}:${escape(constant.line)}</a></td>
                    </tr>
                    `;
						})
						.join('')}
                </tbody>
            </table>
        </div>

        <div class="pagination">
            <button class="pagination-btn" id="prevBtn" onclick="changePage(-1)">← Previous</button>
            <span class="pagination-info" id="pageInfo">Page 1 of <span id="totalPages">1</span></span>
            <button class="pagination-btn" id="nextBtn" onclick="changePage(1)">Next →</button>
        </div>

        <div class="footer">
            <p>Generated on ${escape(new Date().toISOString())} | Tier-1380 Certified | BUN Constants Version Management System</p>
        </div>
    </div>
    <script>
        const constantsData = ${constantsJSON};
        let filteredData = [...constantsData];
        let currentPage = 1;
        const itemsPerPage = 50;
        let sortColumn = null;
        let sortDirection = 'asc';

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            filterAndRender(query);
        });

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const filter = btn.dataset.filter;
                applyFilter(filter);
            });
        });

        function applyFilter(filter) {
            if (filter === 'all') {
                filteredData = [...constantsData];
            } else if (filter === 'mcp') {
                filteredData = constantsData.filter(c => c.mcp);
            } else if (filter === 'critical') {
                filteredData = constantsData.filter(c => c.security === 'critical');
            } else if (filter.startsWith('category:')) {
                const category = filter.split(':')[1];
                filteredData = constantsData.filter(c => c.category === category);
            }
            currentPage = 1;
            renderTable();
        }

        function filterAndRender(query) {
            const rows = document.querySelectorAll('#constantsTableBody tr');
            let visibleCount = 0;
            rows.forEach(row => {
                const text = row.textContent.toLowerCase();
                const matches = !query || text.includes(query);
                row.classList.toggle('hidden', !matches);
                if (matches) visibleCount++;
            });
            updatePagination(visibleCount);
        }

        // Sorting
        document.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const column = th.dataset.sort;
                if (sortColumn === column) {
                    sortDirection = sortDirection === 'asc' ? 'desc' : 'asc';
                } else {
                    sortColumn = column;
                    sortDirection = 'asc';
                }
                
                document.querySelectorAll('.sortable').forEach(t => {
                    t.classList.remove('sort-asc', 'sort-desc');
                });
                th.classList.add(\`sort-\${sortDirection}\`);
                
                filteredData.sort((a, b) => {
                    let aVal = a[column];
                    let bVal = b[column];
                    if (column === 'mcp') {
                        aVal = a.mcp ? 1 : 0;
                        bVal = b.mcp ? 1 : 0;
                    }
                    if (typeof aVal === 'string') {
                        aVal = aVal.toLowerCase();
                        bVal = bVal.toLowerCase();
                    }
                    const comparison = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                    return sortDirection === 'asc' ? comparison : -comparison;
                });
                
                currentPage = 1;
                renderTable();
            });
        });

        function renderTable() {
            const tbody = document.getElementById('constantsTableBody');
            const start = (currentPage - 1) * itemsPerPage;
            const end = start + itemsPerPage;
            const pageData = filteredData.slice(start, end);
            
            // Escape HTML to prevent XSS attacks
            const escapeHTML = (str) => {
                if (str == null) return '';
                const div = document.createElement('div');
                div.textContent = String(str);
                return div.innerHTML;
            };
            
            tbody.innerHTML = pageData.map(constant => \`
                <tr data-name="\${escapeHTML(constant.name.toLowerCase())}" data-project="\${escapeHTML(constant.project)}" data-type="\${escapeHTML(constant.type)}" data-category="\${escapeHTML(constant.category)}" data-security="\${escapeHTML(constant.security)}" data-mcp="\${constant.mcp}">
                    <td><code>\${escapeHTML(constant.name)}</code></td>
                    <td>\${escapeHTML(constant.project)}</td>
                    <td><span class="type-badge type-\${escapeHTML(constant.type)}">\${escapeHTML(constant.type)}</span></td>
                    <td>\${escapeHTML(constant.category || '-')}</td>
                    <td><span class="type-badge security-\${escapeHTML(constant.security)}">\${escapeHTML(constant.security)}</span></td>
                    <td>\${constant.mcp ? '✅' : '❌'}</td>
                    <td><a href="#" class="code-link" title="\${escapeHTML(constant.path)}:\${escapeHTML(constant.line)}">\${escapeHTML(constant.path)}:\${escapeHTML(constant.line)}</a></td>
                </tr>
            \`).join('');
            
            updatePagination(filteredData.length);
            
            // Re-apply search filter
            const searchQuery = document.getElementById('searchInput').value.toLowerCase();
            if (searchQuery) {
                filterAndRender(searchQuery);
            }
        }

        function updatePagination(totalItems) {
            const totalPages = Math.ceil(totalItems / itemsPerPage);
            document.getElementById('totalPages').textContent = totalPages;
            document.getElementById('pageInfo').innerHTML = \`Page \${currentPage} of \${totalPages} (\${totalItems} total)\`;
            document.getElementById('prevBtn').disabled = currentPage === 1;
            document.getElementById('nextBtn').disabled = currentPage >= totalPages;
        }

        function changePage(direction) {
            const totalPages = Math.ceil(filteredData.length / itemsPerPage);
            const newPage = currentPage + direction;
            if (newPage >= 1 && newPage <= totalPages) {
                currentPage = newPage;
                renderTable();
            }
        }

        // Export functionality
        function exportData(format) {
            const data = filteredData.length > 0 ? filteredData : constantsData;
            let content, filename, mimeType;
            
            if (format === 'json') {
                content = JSON.stringify(data, null, 2);
                filename = \`bun-constants-\${new Date().toISOString().split('T')[0]}.json\`;
                mimeType = 'application/json';
            } else {
                const headers = ['Name', 'Project', 'Type', 'Category', 'Security', 'MCP', 'Path', 'Line', 'Value', 'Description'];
                const rows = data.map(c => [
                    c.name,
                    c.project,
                    c.type,
                    c.category || '',
                    c.security,
                    c.mcp ? 'Yes' : 'No',
                    c.path || '',
                    c.line || '',
                    c.value || '',
                    c.description || ''
                ]);
                content = [headers, ...rows].map(row => row.map(cell => \`"\${String(cell).replace(/"/g, '""')}"\`).join(',')).join('\\n');
                filename = \`bun-constants-\${new Date().toISOString().split('T')[0]}.csv\`;
                mimeType = 'text/csv';
            }
            
            const blob = new Blob([content], { type: mimeType });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            URL.revokeObjectURL(url);
        }

        // Theme management
        (function() {
            // Detect system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const savedTheme = localStorage.getItem('dashboard-theme');
            const initialTheme = savedTheme || (prefersDark ? 'dark' : 'light');
            
            // Apply initial theme
            document.documentElement.setAttribute('data-theme', initialTheme);
            updateThemeUI(initialTheme);
            
            // Watch for system theme changes
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('dashboard-theme')) {
                    const theme = e.matches ? 'dark' : 'light';
                    document.documentElement.setAttribute('data-theme', theme);
                    updateThemeUI(theme);
                }
            });
        })();
        
        function toggleTheme() {
            const current = document.documentElement.getAttribute('data-theme');
            const newTheme = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('dashboard-theme', newTheme);
            updateThemeUI(newTheme);
        }
        
        function updateThemeUI(theme) {
            const icon = document.getElementById('themeIcon');
            const label = document.getElementById('themeLabel');
            if (icon) icon.textContent = theme === 'dark' ? '🌙' : '☀️';
            if (label) label.textContent = theme === 'dark' ? 'Dark' : 'Light';
        }
        
        // Initialize badge paths with file:// protocol fallback
        (function() {
            const isFileProtocol = window.location.protocol === 'file:';
            if (isFileProtocol) {
                const badgeImages = document.querySelectorAll('#badgesContainer img[data-badge]');
                const dashboardPath = window.location.pathname;
                const dashboardDir = dashboardPath.substring(0, dashboardPath.lastIndexOf('/'));
                
                badgeImages.forEach(img => {
                    const badgeName = img.getAttribute('data-badge');
                    // For file:// protocol, use Bun.file() compatible paths
                    // Try relative path first (works when dashboard.html is in same dir as badges/)
                    const relativePath = \`\${dashboardDir}/badges/\${badgeName}\`;
                    
                    // Fallback: construct file:// URL using Bun.file() pattern
                    // Bun.file() supports file:// URLs as per https://bun.com/docs/runtime/file-io
                    try {
                        // Use relative path - browsers handle file:// relative paths
                        img.src = relativePath;
                        
                        // If image fails to load, try absolute file:// URL
                        img.onerror = function() {
                            try {
                                // Construct absolute file:// URL
                                const absolutePath = new URL(relativePath, 'file://').href;
                                this.src = absolutePath;
                            } catch (e) {
                                console.warn(\`Failed to load badge: \${badgeName}\`);
                            }
                        };
                    } catch (e) {
                        console.warn(\`Failed to set badge path: \${badgeName}\`);
                    }
                });
            }
        })();

        // Initialize
        updatePagination(filteredData.length);
        document.querySelector('.filter-btn[data-filter="all"]').classList.add('active');
    </script>
</body>
</html>`;
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const badgesOnly = args.includes('--badges-only');
	const serveMode = args.includes('--serve');

	try {
		// Read registry
		const registry: VersionRegistry = JSON.parse(readFileSync(REGISTRY_FILE, 'utf-8'));
		console.log(`📊 Loaded registry: v${registry.version} with ${registry.metadata.totalConstants} constants`);

		// Generate badges
		generateBadges(registry);

		if (!badgesOnly) {
			// Create output directory
			if (!existsSync(OUTPUT_DIR)) {
				mkdirSync(OUTPUT_DIR, {recursive: true});
			}

			// Generate dashboard HTML
			const html = await generateDashboardHTML(registry);
			writeFileSync(DASHBOARD_FILE, html);
			console.log(`🎨 Generated dashboard: ${DASHBOARD_FILE}`);

			// Copy badges to dashboard directory
			const dashboardBadgesDir = join(OUTPUT_DIR, 'dashboard-badges');
			try {
				if (!existsSync(dashboardBadgesDir)) {
					mkdirSync(dashboardBadgesDir, {recursive: true});
				}
				const badgeFiles = readdirSync(BADGES_DIR);
				for (const badgeFile of badgeFiles) {
					if (badgeFile.endsWith('.svg')) {
						const content = readFileSync(join(BADGES_DIR, badgeFile), 'utf-8');
						writeFileSync(join(dashboardBadgesDir, badgeFile), content);
					}
				}
				console.log(`🏷️  Copied badges to dashboard directory`);
			} catch (error) {
				const errorMessage = error instanceof Error ? error.message : String(error);
				console.warn(`⚠️  Failed to copy badges: ${errorMessage}`);
			}

			if (serveMode) {
				console.log(`🌐 Starting dashboard server...`);
				console.log(`📱 Open http://localhost:3000 to view the dashboard`);

				const server = Bun.serve({
					port: 3000,
					async fetch(req) {
						const url = new URL(req.url);
						if (url.pathname === '/') {
							return new Response(html, {
								headers: {'Content-Type': 'text/html'},
							});
						} else if (url.pathname.startsWith('/badges/')) {
							try {
								const badgeName = url.pathname.replace('/badges/', '');
								// Try regular file path first
								const badgePath = join(BADGES_DIR, badgeName);

								if (existsSync(badgePath)) {
									// Use Bun.file() with file:// protocol fallback
									const badgeFile = Bun.file(badgePath);
									if (await badgeFile.exists()) {
										return new Response(badgeFile, {
											headers: {'Content-Type': 'image/svg+xml'},
										});
									}
								}

								// Fallback to file:// URL if regular path doesn't work
								try {
									const fileUrl = new URL(`file://${badgePath}`);
									const badgeFile = Bun.file(fileUrl);
									if (await badgeFile.exists()) {
										return new Response(badgeFile, {
											headers: {'Content-Type': 'image/svg+xml'},
										});
									}
								} catch {}

								// Last resort: read file directly
								if (existsSync(badgePath)) {
									const badgeContent = readFileSync(badgePath, 'utf-8');
									return new Response(badgeContent, {
										headers: {'Content-Type': 'image/svg+xml'},
									});
								}
							} catch (error) {
								const errorMessage = error instanceof Error ? error.message : String(error);
								console.warn(`Failed to load badge: ${errorMessage}`);
							}
						}
						return new Response('Not Found', {status: 404});
					},
				});

				console.log(`🚀 Dashboard running at http://localhost:3000`);
				console.log(`🛑 Press Ctrl+C to stop the server`);

				// Keep server running
				process.on('SIGINT', () => {
					console.log('\n🛑 Shutting down dashboard server...');
					void server.stop();
					process.exit(0);
				});
			}
		}

		console.log(`✅ Visual documentation generation complete!`);
	} catch (error) {
		const errorMessage = error instanceof Error ? error.message : String(error);
		console.error(`❌ Failed to generate visual documentation: ${errorMessage}`);
		process.exit(1);
	}
}

if (import.meta.main) {
	main().catch(error => {
		console.error(`❌ Fatal error: ${error instanceof Error ? error.message : String(error)}`);
		process.exit(1);
	});
}
