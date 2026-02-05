#!/usr/bin/env bun
/**
 * [hyper-bun][ui][feat][META:priority=medium,status=production][tag-dashboard][#REF:Bun.serve+Bun.bundler]
 * Web dashboard for tag manager with system-ui font stack
 *
 * Features:
 * - Native Bun.serve() HTTP server
 * - System-ui font stack (auto-expanded by Bun CSS bundler)
 * - Real-time tag statistics
 * - Interactive filtering and search
 * - JSON API endpoint for programmatic access
 * - Zero dependencies - pure Bun APIs
 * - Bun 1.3 HTML tag for XSS-protected HTML generation
 */

import { html } from "../utils/html-tag-polyfill";

// ============================================================================
// STYLES (Bun CSS bundler will auto-expand system-ui at build time)
// ============================================================================

const styles = `
  * {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }
  
  body {
    font-family: system-ui;
    color: #333;
    background: #f5f5f5;
    line-height: 1.6;
  }
  
  .tag-dashboard {
    max-width: 1400px;
    margin: 0 auto;
    padding: 2rem;
  }
  
  header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 2rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  
  h1 {
    font-size: 2rem;
    margin-bottom: 0.5rem;
    font-weight: 600;
  }
  
  .subtitle {
    opacity: 0.9;
    font-size: 1rem;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    margin-bottom: 2rem;
  }
  
  .stat-card {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .stat-label {
    font-size: 0.875rem;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 0.5rem;
  }
  
  .stat-value {
    font-size: 2rem;
    font-weight: 700;
    color: #667eea;
  }
  
  .controls {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    margin-bottom: 2rem;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    align-items: center;
  }
  
  .search-input {
    flex: 1;
    min-width: 200px;
    padding: 0.75rem;
    border: 2px solid #e0e0e0;
    border-radius: 6px;
    font-family: system-ui;
    font-size: 1rem;
    transition: border-color 0.2s;
  }
  
  .search-input:focus {
    outline: none;
    border-color: #667eea;
  }
  
  .filter-group {
    display: flex;
    gap: 0.5rem;
    flex-wrap: wrap;
  }
  
  .filter-btn {
    padding: 0.5rem 1rem;
    border: 2px solid #e0e0e0;
    background: white;
    border-radius: 6px;
    cursor: pointer;
    font-family: system-ui;
    font-size: 0.875rem;
    transition: all 0.2s;
  }
  
  .filter-btn:hover {
    border-color: #667eea;
    color: #667eea;
  }
  
  .filter-btn.active {
    background: #667eea;
    color: white;
    border-color: #667eea;
  }
  
  .tag-table-container {
    background: white;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
  
  .tag-table {
    width: 100%;
    border-collapse: collapse;
    font-family: system-ui, monospace;
  }
  
  .tag-table thead {
    background: #f8f9fa;
    font-weight: 600;
  }
  
  .tag-table th {
    padding: 1rem;
    text-align: left;
    border-bottom: 2px solid #e0e0e0;
    font-size: 0.875rem;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #666;
  }
  
  .tag-table td {
    padding: 0.75rem 1rem;
    border-bottom: 1px solid #f0f0f0;
    font-size: 0.875rem;
  }
  
  .tag-table tbody tr:hover {
    background: #f8f9fa;
  }
  
  .tag-table tbody tr:last-child td {
    border-bottom: none;
  }
  
  .status-badge {
    display: inline-block;
    padding: 0.25rem 0.75rem;
    border-radius: 12px;
    font-size: 0.75rem;
    font-weight: 600;
    text-transform: uppercase;
  }
  
  .status-valid {
    background: #d4edda;
    color: #155724;
  }
  
  .status-invalid {
    background: #f8d7da;
    color: #721c24;
  }
  
  .domain-badge {
    display: inline-block;
    padding: 0.25rem 0.5rem;
    background: #e9ecef;
    border-radius: 4px;
    font-size: 0.75rem;
    font-weight: 500;
    margin-right: 0.5rem;
  }
  
  .file-path {
    font-family: 'Monaco', 'Menlo', 'Courier New', monospace;
    font-size: 0.8125rem;
    color: #495057;
  }
  
  .line-number {
    color: #6c757d;
    font-size: 0.8125rem;
  }
  
  .no-results {
    padding: 3rem;
    text-align: center;
    color: #6c757d;
  }
  
  .loading {
    padding: 3rem;
    text-align: center;
    color: #6c757d;
  }
  
  .error {
    padding: 2rem;
    background: #f8d7da;
    color: #721c24;
    border-radius: 8px;
    margin-bottom: 2rem;
  }
  
  @media (max-width: 768px) {
    .tag-dashboard {
      padding: 1rem;
    }
    
    .stats-grid {
      grid-template-columns: 1fr;
    }
    
    .controls {
      flex-direction: column;
      align-items: stretch;
    }
    
    .tag-table {
      font-size: 0.75rem;
    }
    
    .tag-table th,
    .tag-table td {
      padding: 0.5rem;
    }
  }
  
  /* Bun expands system-ui to:
     system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
     "Noto Sans", Ubuntu, Cantarell, "Helvetica Neue", sans-serif
  */
`;

// ============================================================================
// DASHBOARD COMPONENT
// ============================================================================

interface TagResult {
	file: string;
	tag: string;
	line: number;
	valid: boolean;
	parsed?: {
		domain: string;
		scope: string;
		type: string;
		meta: Record<string, string>;
		class: string;
		ref: string;
	};
	timeNs?: number;
	memoryDelta?: number;
}

interface ScanData {
	timestamp: string;
	context: Record<string, any>;
	stats: {
		total: number;
		valid: number;
		invalid: number;
	};
	cache: any;
	results: TagResult[];
}

async function loadTagsData(): Promise<ScanData | null> {
	try {
		const tagsFile = Bun.file("src/data/tags.json");
		const stats = await tagsFile.stat();
		if (!stats.size) {
			return null;
		}
		const content = await tagsFile.text();
		return JSON.parse(content) as ScanData;
	} catch (error) {
		console.error("Failed to load tags.json:", error);
		return null;
	}
}

/**
 * Render a single tag row
 */
function renderTagRow(tag: TagResult) {
	return html`
		<tr data-valid="${tag.valid}" data-domain="${tag.parsed?.domain || ""}" data-scope="${tag.parsed?.scope || ""}">
			<td>
				<span class="status-badge ${tag.valid ? "status-valid" : "status-invalid"}">
					${tag.valid ? "✅ Valid" : "❌ Invalid"}
				</span>
			</td>
			<td>
				${tag.parsed ? html`<span class="domain-badge">${tag.parsed.domain}</span>` : "-"}
			</td>
			<td>${tag.parsed?.scope || "-"}</td>
			<td>${tag.parsed?.type || "-"}</td>
			<td>${tag.parsed?.meta?.priority || "-"}</td>
			<td>
				<span class="file-path">${tag.file}</span>
			</td>
			<td>
				<span class="line-number">${tag.line}</span>
			</td>
			<td>
				<code style="font-size: 0.75rem;">${tag.parsed?.ref || "-"}</code>
			</td>
		</tr>
	`;
}

function generateHTML(data: ScanData | null, error?: string) {
	const stats = data?.stats || { total: 0, valid: 0, invalid: 0 };
	const results = data?.results || [];
	const timestamp = data?.timestamp;

	return html`
		<!DOCTYPE html>
		<html lang="en">
		<head>
			<meta charset="UTF-8">
			<meta name="viewport" content="width=device-width, initial-scale=1.0">
			<title>Hyper-Bun Tag Manager Dashboard</title>
			<style>${styles}</style>
		</head>
		<body>
			<div class="tag-dashboard">
				<header>
					<h1>🚀 Hyper-Bun Tag Manager</h1>
					<p class="subtitle">Real-time tag analysis and monitoring dashboard</p>
				</header>
				
				${error ? html`<div class="error">⚠️ ${error}</div>` : ""}
				
				<div class="stats-grid">
					<div class="stat-card">
						<div class="stat-label">Total Tags</div>
						<div class="stat-value">${stats.total}</div>
					</div>
					<div class="stat-card">
						<div class="stat-label">Valid Tags</div>
						<div class="stat-value" style="color: #28a745;">${stats.valid}</div>
					</div>
					<div class="stat-card">
						<div class="stat-label">Invalid Tags</div>
						<div class="stat-value" style="color: #dc3545;">${stats.invalid}</div>
					</div>
					<div class="stat-card">
						<div class="stat-label">Success Rate</div>
						<div class="stat-value" style="color: #667eea;">
							${stats.total > 0 ? ((stats.valid / stats.total) * 100).toFixed(1) : 0}%
						</div>
					</div>
				</div>
				
				<div class="controls">
					<input 
						type="text" 
						class="search-input" 
						id="searchInput" 
						placeholder="Search by file, domain, scope, or tag..."
						autocomplete="off"
					/>
					<div class="filter-group">
						<button class="filter-btn active" data-filter="all">All</button>
						<button class="filter-btn" data-filter="valid">Valid</button>
						<button class="filter-btn" data-filter="invalid">Invalid</button>
					</div>
				</div>
				
				<div class="tag-table-container">
					<table class="tag-table">
						<thead>
							<tr>
								<th>Status</th>
								<th>Domain</th>
								<th>Scope</th>
								<th>Type</th>
								<th>Priority</th>
								<th>File</th>
								<th>Line</th>
								<th>Reference</th>
							</tr>
						</thead>
						<tbody id="tagTableBody">
							${
								results.length === 0
									? html`<tr><td colspan="8" class="no-results">No tags found. Run <code>bun run tag:scan</code> to scan files.</td></tr>`
									: results.map((tag) => renderTagRow(tag))
							}
						</tbody>
					</table>
				</div>
				
				${
					timestamp
						? html`<p style="text-align: center; color: #6c757d; margin-top: 2rem; font-size: 0.875rem;">
							Last updated: ${new Date(timestamp).toLocaleString()}
						</p>`
						: ""
				}
			</div>
			
			<script>
				// Filter and search functionality
				const searchInput = document.getElementById('searchInput');
				const filterBtns = document.querySelectorAll('.filter-btn');
				const tableBody = document.getElementById('tagTableBody');
				const rows = Array.from(tableBody.querySelectorAll('tr'));
				
				function filterTable() {
					const searchTerm = searchInput.value.toLowerCase();
					const activeFilter = document.querySelector('.filter-btn.active')?.dataset.filter || 'all';
					
					rows.forEach(row => {
						if (row.cells.length === 0) return; // Skip "no results" row
						
						const isValid = row.dataset.valid === 'true';
						const domain = (row.dataset.domain || '').toLowerCase();
						const scope = (row.dataset.scope || '').toLowerCase();
						const filePath = row.cells[5]?.textContent?.toLowerCase() || '';
						const tagText = row.textContent.toLowerCase();
						
						const matchesFilter = activeFilter === 'all' || 
							(activeFilter === 'valid' && isValid) ||
							(activeFilter === 'invalid' && !isValid);
						
						const matchesSearch = !searchTerm || 
							domain.includes(searchTerm) ||
							scope.includes(searchTerm) ||
							filePath.includes(searchTerm) ||
							tagText.includes(searchTerm);
						
						row.style.display = (matchesFilter && matchesSearch) ? '' : 'none';
					});
				}
				
				searchInput.addEventListener('input', filterTable);
				
				filterBtns.forEach(btn => {
					btn.addEventListener('click', () => {
						filterBtns.forEach(b => b.classList.remove('active'));
						btn.classList.add('active');
						filterTable();
					});
				});
				
				// Auto-refresh every 30 seconds
				setInterval(() => {
					fetch('/api/tags')
						.then(r => r.json())
						.then(data => {
							if (data.timestamp !== '${timestamp || ""}') {
								location.reload();
							}
						})
						.catch(() => {}); // Silently fail if API unavailable
				}, 30000);
			</script>
		</body>
		</html>
	`;
}

// ============================================================================
// HTTP SERVER
// ============================================================================

export function createTagDashboard(port: number = 3000) {
	const server = Bun.serve({
		port,
		fetch(req) {
			const url = new URL(req.url);

			// API endpoint for JSON data
			if (url.pathname === "/api/tags") {
				return loadTagsData()
					.then((data) => {
						if (!data) {
							return new Response(
								JSON.stringify({
									error: "No tags data found. Run: bun run tag:scan",
								}),
								{
									status: 404,
									headers: { "Content-Type": "application/json" },
								},
							);
						}

						return new Response(JSON.stringify(data), {
							headers: {
								"Content-Type": "application/json",
								"Access-Control-Allow-Origin": "*",
							},
						});
					})
					.catch((error) => {
						return new Response(JSON.stringify({ error: error.message }), {
							status: 500,
							headers: { "Content-Type": "application/json" },
						});
					});
			}

			// Health check endpoint
			if (url.pathname === "/health") {
				return new Response(
					JSON.stringify({ status: "ok", timestamp: new Date().toISOString() }),
					{
						headers: { "Content-Type": "application/json" },
					},
				);
			}

			// Serve dashboard HTML
			return loadTagsData()
				.then((data) => {
					const html = generateHTML(data);
					return new Response(html, {
						headers: { "Content-Type": "text/html; charset=utf-8" },
					});
				})
				.catch((error) => {
					const html = generateHTML(
						null,
						`Failed to load dashboard: ${error instanceof Error ? error.message : String(error)}`,
					);
					return new Response(html, {
						status: 500,
						headers: { "Content-Type": "text/html; charset=utf-8" },
					});
				});
		},
	});

	console.log(`🚀 Tag Dashboard running at http://localhost:${server.port}`);
	console.log(`📊 Dashboard: http://localhost:${server.port}/`);
	console.log(`🔌 API: http://localhost:${server.port}/api/tags`);
	console.log(`💚 Health: http://localhost:${server.port}/health`);
	console.log(`\nPress Ctrl+C to stop\n`);

	return server;
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

if (import.meta.main) {
	const port = parseInt(Bun.env.TAG_DASHBOARD_PORT || "3000", 10);
	const server = createTagDashboard(port);

	// Graceful shutdown
	process.on("SIGINT", () => {
		console.log("\n\n👋 Shutting down dashboard...");
		server.stop();
		process.exit(0);
	});

	process.on("SIGTERM", () => {
		console.log("\n\n👋 Shutting down dashboard...");
		server.stop();
		process.exit(0);
	});
}

export default createTagDashboard;
