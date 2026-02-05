#!/usr/bin/env bun
/**
 * [hyper-bun][ui][feat][META:priority=high,status=production][html-rewriter][#REF:Bun.HTMLRewriter]
 * Enhanced tag dashboard using Bun's HTMLRewriter for server-side HTML transformation
 *
 * Features:
 * - HTMLRewriter for dynamic content injection
 * - Server-side HTML manipulation
 * - Automatic tag highlighting and enhancement
 * - Dynamic statistics injection
 * - Zero dependencies - pure Bun APIs
 *
 * Bun-Specific Enhancements:
 * - Accepts strings and ArrayBuffers directly (no Response wrapper needed)
 * - More flexible than Cloudflare Workers implementation
 *
 * @see {@link https://bun.com/docs/runtime/html-rewriter Bun HTMLRewriter Documentation}
 * @see {@link https://bun.com/docs/runtime/html-rewriter#:~:text=Note%20that%20Cloudflare%20Workers%20implementation%20of%20HTMLRewriter%20only%20supports%20Response%20objects. Official Note}
 */

// HTMLRewriter availability check
// Note: HTMLRewriter is available in Bun 1.4+ or via Cloudflare Workers compatibility
const HTMLRewriter =
	(globalThis as any).HTMLRewriter ||
	(typeof Bun !== "undefined" && (Bun as any).HTMLRewriter);

if (!HTMLRewriter) {
	console.error("⚠️  HTMLRewriter is not available in this Bun version.");
	console.error("   Falling back to template-based rendering.");
	console.error("   Update Bun to 1.4+ or use: bun --compat");
}

// ============================================================================
// HTML TEMPLATE
// ============================================================================

const baseHTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Hyper-Bun Tag Manager Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
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
    h1 { font-size: 2rem; margin-bottom: 0.5rem; }
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
    .tag-table-container {
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead {
      background: #f8f9fa;
      font-weight: 600;
    }
    th {
      padding: 1rem;
      text-align: left;
      border-bottom: 2px solid #e0e0e0;
      font-size: 0.875rem;
      text-transform: uppercase;
    }
    td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid #f0f0f0;
    }
    tbody tr:hover {
      background: #f8f9fa;
    }
    .status-valid { color: #28a745; }
    .status-invalid { color: #dc3545; }
    .tag-row[data-priority="high"] { background: #fff3cd; }
    .tag-row[data-priority="critical"] { background: #f8d7da; }
  </style>
</head>
<body>
  <div class="tag-dashboard">
    <header>
      <h1>🚀 Hyper-Bun Tag Manager</h1>
      <p class="subtitle">Real-time tag analysis with HTMLRewriter</p>
    </header>
    
    <!-- Stats will be injected by HTMLRewriter -->
    <div class="stats-grid" id="stats-container">
      <div class="stat-card" data-stat="total">
        <div class="stat-label">Total Tags</div>
        <div class="stat-value">-</div>
      </div>
      <div class="stat-card" data-stat="valid">
        <div class="stat-label">Valid Tags</div>
        <div class="stat-value">-</div>
      </div>
      <div class="stat-card" data-stat="invalid">
        <div class="stat-label">Invalid Tags</div>
        <div class="stat-value">-</div>
      </div>
      <div class="stat-card" data-stat="success-rate">
        <div class="stat-label">Success Rate</div>
        <div class="stat-value">-</div>
      </div>
    </div>
    
    <!-- Table will be populated by HTMLRewriter -->
    <div class="tag-table-container">
      <table>
        <thead>
          <tr>
            <th>Status</th>
            <th>Domain</th>
            <th>Scope</th>
            <th>Type</th>
            <th>Priority</th>
            <th>File</th>
            <th>Line</th>
          </tr>
        </thead>
        <tbody id="tag-table-body">
          <!-- Rows will be injected here -->
        </tbody>
      </table>
    </div>
    
    <script>
      // Client-side interactivity
      console.log('Dashboard loaded with HTMLRewriter enhancements');
    </script>
  </div>
</body>
</html>`;

// ============================================================================
// HTMLREWRITER TRANSFORMERS
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
}

interface ScanData {
	timestamp: string;
	stats: {
		total: number;
		valid: number;
		invalid: number;
	};
	results: TagResult[];
}

function createStatsRewriter(stats: ScanData["stats"]) {
	return new HTMLRewriter()
		.on('[data-stat="total"] .stat-value', {
			element(el) {
				el.setInnerContent(stats.total.toString());
			},
		})
		.on('[data-stat="valid"] .stat-value', {
			element(el) {
				el.setInnerContent(stats.valid.toString());
				el.setAttribute("style", "color: #28a745;");
			},
		})
		.on('[data-stat="invalid"] .stat-value', {
			element(el) {
				el.setInnerContent(stats.invalid.toString());
				el.setAttribute("style", "color: #dc3545;");
			},
		})
		.on('[data-stat="success-rate"] .stat-value', {
			element(el) {
				const rate =
					stats.total > 0
						? ((stats.valid / stats.total) * 100).toFixed(1)
						: "0";
				el.setInnerContent(`${rate}%`);
				el.setAttribute("style", "color: #667eea;");
			},
		});
}

function createTableRewriter(results: TagResult[]) {
	let rowIndex = 0;

	return (
		new HTMLRewriter()
			.on("#tag-table-body", {
				element(el) {
					// Clear existing content
					el.setInnerContent("");

					// Generate table rows
					const rowsHTML = results
						.map((tag, idx) => {
							const priority = tag.parsed?.meta?.priority || "normal";
							const priorityClass =
								priority === "high" || priority === "critical"
									? `tag-row[data-priority="${priority}"]`
									: "tag-row";

							return `
            <tr class="tag-row" data-priority="${priority}" data-valid="${tag.valid}">
              <td class="${tag.valid ? "status-valid" : "status-invalid"}">
                ${tag.valid ? "✅ Valid" : "❌ Invalid"}
              </td>
              <td>${tag.parsed?.domain || "-"}</td>
              <td>${tag.parsed?.scope || "-"}</td>
              <td>${tag.parsed?.type || "-"}</td>
              <td>${priority}</td>
              <td><code style="font-size: 0.75rem;">${tag.file}</code></td>
              <td>${tag.line}</td>
            </tr>
          `;
						})
						.join("");

					el.append(rowsHTML, { html: true });
				},
			})
			// Highlight high-priority tags
			.on('.tag-row[data-priority="high"]', {
				element(el) {
					el.setAttribute("style", "background: #fff3cd;");
				},
			})
			// Highlight critical-priority tags
			.on('.tag-row[data-priority="critical"]', {
				element(el) {
					el.setAttribute("style", "background: #f8d7da; font-weight: 600;");
				},
			})
			// Add tooltips to file paths
			.on(".tag-row td code", {
				element(el) {
					const parentRow = el.closest(".tag-row");
					if (parentRow) {
						const filePath = el.textContent || "";
						el.setAttribute("title", `File: ${filePath}`);
					}
				},
			})
	);
}

function createMetadataRewriter(data: ScanData) {
	return (
		new HTMLRewriter()
			// Add timestamp to header
			.on("header .subtitle", {
				element(el) {
					const timestamp = new Date(data.timestamp).toLocaleString();
					el.append(` • Last updated: ${timestamp}`, { html: false });
				},
			})
			// Add data attributes for client-side filtering
			.on("body", {
				element(el) {
					el.setAttribute("data-total-tags", data.stats.total.toString());
					el.setAttribute("data-valid-tags", data.stats.valid.toString());
					el.setAttribute("data-invalid-tags", data.stats.invalid.toString());
				},
			})
	);
}

// ============================================================================
// COMBINED TRANSFORMER
// ============================================================================

function transformHTML(html: string, data: ScanData | null): Response {
	if (!data) {
		// Return error HTML if no data
		const errorHTML = html.replace(
			'<div class="tag-dashboard">',
			'<div class="tag-dashboard"><div style="background: #f8d7da; color: #721c24; padding: 1rem; border-radius: 8px; margin-bottom: 2rem;">⚠️ No tags data found. Run: <code>bun run tag:scan</code></div>',
		);
		return new Response(errorHTML, {
			headers: { "Content-Type": "text/html; charset=utf-8" },
		});
	}

	// Use HTMLRewriter if available, otherwise fall back to template replacement
	if (!HTMLRewriter) {
		// Fallback: simple template replacement
		let transformed = html;
		transformed = transformed.replace(
			'[data-stat="total"] .stat-value',
			data.stats.total.toString(),
		);
		transformed = transformed.replace(
			'[data-stat="valid"] .stat-value',
			data.stats.valid.toString(),
		);
		transformed = transformed.replace(
			'[data-stat="invalid"] .stat-value',
			data.stats.invalid.toString(),
		);
		const rate =
			data.stats.total > 0
				? ((data.stats.valid / data.stats.total) * 100).toFixed(1)
				: "0";
		transformed = transformed.replace(
			'[data-stat="success-rate"] .stat-value',
			`${rate}%`,
		);
		return new Response(transformed, {
			headers: { "Content-Type": "text/html; charset=utf-8" },
		});
	}

	// Create combined rewriter
	const rewriter = new HTMLRewriter()
		// Chain all transformers
		.transform(createStatsRewriter(data.stats).transform(baseHTML))
		.transform(createTableRewriter(data.results).transform(baseHTML))
		.transform(createMetadataRewriter(data).transform(baseHTML));

	// Apply transformations
	return rewriter.transform(new Response(html));
}

// ============================================================================
// ADVANCED TRANSFORMER EXAMPLES
// ============================================================================

/**
 * Example: Transform Response object directly
 */
function transformResponse(response: Response, data: ScanData): Response {
	const rewriter = new HTMLRewriter()
		.on("h1", {
			element(el) {
				el.append(` (${data.stats.total} tags)`, { html: false });
			},
		})
		.on("tbody tr", {
			element(el) {
				// Add row numbers
				el.setAttribute("data-row-index", "0"); // Will be set per row
			},
		});

	return rewriter.transform(response);
}

/**
 * Example: Transform from File
 */
async function transformFromFile(
	filePath: string,
	data: ScanData,
): Promise<Response> {
	const file = Bun.file(filePath);
	const rewriter = new HTMLRewriter().on("body", {
		element(el) {
			el.setAttribute("data-enhanced", "true");
		},
	});

	return rewriter.transform(file);
}

/**
 * Example: Transform from Blob
 */
function transformFromBlob(blob: Blob, data: ScanData): Response {
	const rewriter = new HTMLRewriter().on("title", {
		element(el) {
			el.setInnerContent(`Tag Dashboard - ${data.stats.total} tags`);
		},
	});

	return rewriter.transform(blob);
}

/**
 * Example: Transform from ArrayBuffer
 */
function transformFromArrayBuffer(
	buffer: ArrayBuffer,
	data: ScanData,
): Response {
	const rewriter = new HTMLRewriter().on('meta[name="viewport"]', {
		element(el) {
			el.setAttribute(
				"content",
				"width=device-width, initial-scale=1.0, user-scalable=no",
			);
		},
	});

	return rewriter.transform(buffer);
}

/**
 * Example: Async transformations
 */
async function transformAsync(html: string, data: ScanData): Promise<Response> {
	const rewriter = new HTMLRewriter().on("div.stat-card", {
		async element(el) {
			// Simulate async operation (e.g., fetching additional data)
			await Bun.sleep(10);

			const statType = el.getAttribute("data-stat");
			if (statType === "total") {
				el.setAttribute("data-loaded", "true");
			}
		},
	});

	return rewriter.transform(new Response(html));
}

/**
 * Example: Document-level handlers
 */
function transformDocument(html: string, data: ScanData): Response {
	const rewriter = new HTMLRewriter().onDocument({
		doctype(doctype) {
			// Log doctype info
			console.log("Doctype:", doctype.name);
		},
		end(end) {
			// Add footer script
			end.append(
				`
          <script>
            console.log('Tags loaded:', ${data.stats.total});
            console.log('Valid:', ${data.stats.valid});
            console.log('Invalid:', ${data.stats.invalid});
          </script>
        `,
				{ html: true },
			);
		},
	});

	return rewriter.transform(new Response(html));
}

/**
 * Example: Text node manipulation
 */
function transformText(html: string, data: ScanData): Response {
	const rewriter = new HTMLRewriter().on("h1", {
		text(text) {
			// Replace "Tag Manager" with enhanced version
			if (text.text.includes("Tag Manager")) {
				text.replace(text.text.replace("Tag Manager", "Tag Manager 🚀"));
			}
		},
	});

	return rewriter.transform(new Response(html));
}

/**
 * Example: Comment manipulation
 */
function transformComments(html: string, data: ScanData): Response {
	const rewriter = new HTMLRewriter().on("*", {
		comments(comment) {
			// Remove all comments in production
			if (Bun.env.NODE_ENV === "production") {
				comment.remove();
			}
		},
	});

	return rewriter.transform(new Response(html));
}

/**
 * Example: Element removal and content preservation
 */
function transformRemoval(html: string, data: ScanData): Response {
	const rewriter = new HTMLRewriter().on('script[data-remove="true"]', {
		element(el) {
			// Remove script but keep its content as text
			el.removeAndKeepContent();
		},
	});

	return rewriter.transform(new Response(html));
}

// ============================================================================
// HTTP SERVER
// ============================================================================

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

export function createTagDashboardRewriter(port: number = 3001) {
	const server = Bun.serve({
		port,
		async fetch(req) {
			const url = new URL(req.url);

			// API endpoint
			if (url.pathname === "/api/tags") {
				const data = await loadTagsData();
				if (!data) {
					return new Response(JSON.stringify({ error: "No tags data found" }), {
						status: 404,
						headers: { "Content-Type": "application/json" },
					});
				}
				return new Response(JSON.stringify(data), {
					headers: { "Content-Type": "application/json" },
				});
			}

			// Health check
			if (url.pathname === "/health") {
				return new Response(JSON.stringify({ status: "ok" }), {
					headers: { "Content-Type": "application/json" },
				});
			}

			// Dashboard with HTMLRewriter
			try {
				const data = await loadTagsData();
				const transformed = transformHTML(baseHTML, data);
				return transformed;
			} catch (error) {
				return new Response(
					`Error: ${error instanceof Error ? error.message : String(error)}`,
					{
						status: 500,
					},
				);
			}
		},
	});

	console.log(
		`🚀 Tag Dashboard (HTMLRewriter) running at http://localhost:${server.port}`,
	);
	console.log(`📊 Dashboard: http://localhost:${server.port}/`);
	console.log(`🔌 API: http://localhost:${server.port}/api/tags`);

	return server;
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

if (import.meta.main) {
	const port = parseInt(Bun.env.TAG_DASHBOARD_PORT || "3001", 10);
	const server = createTagDashboardRewriter(port);

	process.on("SIGINT", () => {
		console.log("\n\n👋 Shutting down...");
		server.stop();
		process.exit(0);
	});
}

export default createTagDashboardRewriter;
