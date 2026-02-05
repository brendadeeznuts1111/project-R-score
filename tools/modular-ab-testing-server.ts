#!/usr/bin/env bun
/**
 * 🧪 Modular A/B Testing Server with Cookie Manager
 * 
 * Uses the modular ABTestingManager class for clean, reusable A/B testing
 * Demonstrates multiple tests, weighted variants, and advanced features
 */

import { serve } from "bun";

/**
 * 🚀 Prefetch Optimizations
 * 
 * This file includes prefetch hints for optimal performance:
 * - DNS prefetching for external domains
 * - Preconnect for faster handshakes
 * - Resource preloading for critical assets
 * 
 * Generated automatically by optimize-examples-prefetch.ts
 */
import { ABTestingManager } from "./lib/ab-testing/cookie-manager.ts";

// Create global A/B testing manager instance
const abManager = new ABTestingManager();

// Register multiple A/B tests
function registerTests() {
  // Test 1: URL Structure (50/50 split)
  abManager.registerTest("url_structure", ["direct", "fragments"], {
    weights: [50, 50],
    cookieName: "url_test_group",
    expiryDays: 30
  });

  // Test 2: Documentation Layout (60/40 split favoring new layout)
  abManager.registerTest("doc_layout", ["sidebar", "topnav"], {
    weights: [60, 40],
    cookieName: "layout_test_group",
    expiryDays: 14
  });

  // Test 3: Call-to-Action Button (33/33/34 split)
  abManager.registerTest("cta_button", ["blue", "green", "orange"], {
    weights: [33, 33, 34],
    cookieName: "cta_test_group",
    expiryDays: 7
  });

  // Test 4: Content Density (weighted toward balanced)
  abManager.registerTest("content_density", ["compact", "balanced", "spacious"], {
    weights: [20, 60, 20],
    cookieName: "density_test_group",
    expiryDays: 21
  });
}

// Content configurations for different variants
const contentConfigs = {
  url_structure: {
    direct: {
      title: "Direct URLs - Clean & Modern",
      description: "Experience our streamlined direct URL structure with better SEO and navigation",
      features: [
        "Clean URLs like /docs/api/utils/readfile",
        "Improved search engine optimization",
        "Better bookmarking and sharing",
        "Enhanced navigation experience"
      ],
      color: "#3b82f6",
      example: "/docs/api/utils/readfile"
    },
    fragments: {
      title: "Fragment URLs - Classic & Familiar",
      description: "Stick with our proven fragment-based URL structure for consistency",
      features: [
        "Traditional URLs like /docs/api/utils#readfile",
        "Single-page navigation experience",
        "Consistent with current docs",
        "Familiar to existing users"
      ],
      color: "#22c55e",
      example: "/docs/api/utils#readfile"
    }
  },
  doc_layout: {
    sidebar: {
      title: "Sidebar Navigation",
      description: "Traditional sidebar layout with expandable sections",
      features: ["Hierarchical navigation", "Quick section access", "Expandable tree view"]
    },
    topnav: {
      title: "Top Navigation Bar",
      description: "Modern horizontal navigation with dropdown menus",
      features: ["Clean header design", "Dropdown menus", "More content space"]
    }
  },
  cta_button: {
    blue: {
      title: "Blue Action Button",
      color: "#3b82f6",
      description: "Professional blue call-to-action buttons"
    },
    green: {
      title: "Green Action Button", 
      color: "#22c55e",
      description: "Friendly green call-to-action buttons"
    },
    orange: {
      title: "Orange Action Button",
      color: "#f97316", 
      description: "Energetic orange call-to-action buttons"
    }
  },
  content_density: {
    compact: {
      title: "Compact Layout",
      description: "Information-dense layout for power users",
      padding: "12px",
      fontSize: "14px"
    },
    balanced: {
      title: "Balanced Layout",
      description: "Optimal balance of content and whitespace",
      padding: "20px",
      fontSize: "16px"
    },
    spacious: {
      title: "Spacious Layout",
      description: "Clean, breathable layout with ample whitespace",
      padding: "32px",
      fontSize: "18px"
    }
  }
};

// Metrics tracking
const metrics = {
  url_structure: { direct: { views: 0, clicks: 0 }, fragments: { views: 0, clicks: 0 } },
  doc_layout: { sidebar: { views: 0, clicks: 0 }, topnav: { views: 0, clicks: 0 } },
  cta_button: { blue: { views: 0, clicks: 0 }, green: { views: 0, clicks: 0 }, orange: { views: 0, clicks: 0 } },
  content_density: { compact: { views: 0, clicks: 0 }, balanced: { views: 0, clicks: 0 }, spacious: { views: 0, clicks: 0 } }
};

// Track metrics
function trackMetric(testId: string, variant: string, action: "view" | "click") {
  if (metrics[testId] && metrics[testId][variant]) {
    metrics[testId][variant][action]++;
    console.log(`📊 ${testId}/${variant}: ${action} (${metrics[testId][variant][action]} total)`);
  }
}

// Generate HTML page with all A/B tests
function generateTestPage(assignments: Record<string, string>): string {
  const urlVariant = assignments.url_structure || "direct";
  const layoutVariant = assignments.doc_layout || "sidebar";
  const ctaVariant = assignments.cta_button || "blue";
  const densityVariant = assignments.content_density || "balanced";

  const urlConfig = contentConfigs.url_structure[urlVariant];
  const layoutConfig = contentConfigs.doc_layout[layoutVariant];
  const ctaConfig = contentConfigs.cta_button[ctaVariant];
  const densityConfig = contentConfigs.content_density[densityVariant];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Modular A/B Testing Demo</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: ${densityConfig.padding};
            font-size: ${densityConfig.fontSize};
            line-height: 1.6;
        }
        
        .container {
            max-width: 1200px;
            margin: 0 auto;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .header {
            background: ${urlConfig.color};
            color: white;
            padding: 40px;
            text-align: center;
        }
        
        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 16px;
        }
        
        .header p {
            font-size: 1.2rem;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px;
        }
        
        .test-section {
            margin-bottom: 40px;
            padding: 30px;
            border: 2px solid #f3f4f6;
            border-radius: 12px;
            background: #fafafa;
        }
        
        .test-section h2 {
            color: #1f2937;
            margin-bottom: 16px;
            font-size: 1.5rem;
        }
        
        .variant-badge {
            display: inline-block;
            background: ${urlConfig.color};
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            margin-bottom: 16px;
        }
        
        .features {
            list-style: none;
            margin: 20px 0;
        }
        
        .features li {
            padding: 8px 0;
            position: relative;
            padding-left: 24px;
        }
        
        .features li:before {
            content: "✓";
            position: absolute;
            left: 0;
            color: ${urlConfig.color};
            font-weight: bold;
        }
        
        .example {
            background: #f0f9ff;
            padding: 16px;
            border-radius: 8px;
            font-family: monospace;
            margin: 16px 0;
            border-left: 4px solid ${urlConfig.color};
        }
        
        .cta-section {
            text-align: center;
            margin: 40px 0;
        }
        
        .cta-button {
            display: inline-block;
            background: ${ctaConfig.color};
            color: white;
            padding: 16px 32px;
            border: none;
            border-radius: 8px;
            font-size: 18px;
            font-weight: 600;
            cursor: pointer;
            text-decoration: none;
            transition: all 0.2s;
        }
        
        .cta-button:hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
        }
        
        .assignments {
            background: #fef3c7;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .assignments h3 {
            color: #92400e;
            margin-bottom: 12px;
        }
        
        .assignment-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            border-bottom: 1px solid #fde68a;
        }
        
        .assignment-item:last-child {
            border-bottom: none;
        }
        
        .test-name {
            font-weight: 600;
            color: #78350f;
        }
        
        .variant-name {
            color: #92400e;
        }
        
        .metrics {
            background: #ecfdf5;
            padding: 20px;
            border-radius: 8px;
            margin: 20px 0;
        }
        
        .metrics h3 {
            color: #065f46;
            margin-bottom: 12px;
        }
        
        .metric-item {
            display: flex;
            justify-content: space-between;
            padding: 4px 0;
            font-size: 14px;
        }
        
        .admin-link {
            text-align: center;
            margin: 20px 0;
        }
        
        .admin-link a {
            color: ${urlConfig.color};
            text-decoration: none;
            font-weight: 600;
        }
        
        .admin-link a:hover {
            text-decoration: underline;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>${urlConfig.title}</h1>
            <p>${urlConfig.description}</p>
        </div>
        
        <div class="content">
            <div class="test-section">
                <h2>🔗 URL Structure Test</h2>
                <div class="variant-badge">Variant: ${urlVariant}</div>
                <p>This test compares direct URLs vs fragment-based URLs for better user experience and SEO.</p>
                <ul class="features">
                    ${urlConfig.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
                <div class="example">
                    Example URL: ${urlConfig.example}
                </div>
            </div>
            
            <div class="test-section">
                <h2>📐 Layout Test</h2>
                <div class="variant-badge">Variant: ${layoutVariant}</div>
                <p>${layoutConfig.description}</p>
                <ul class="features">
                    ${layoutConfig.features.map(feature => `<li>${feature}</li>`).join('')}
                </ul>
            </div>
            
            <div class="test-section">
                <h2>🎨 Button Color Test</h2>
                <div class="variant-badge">Variant: ${ctaVariant}</div>
                <p>${ctaConfig.description}</p>
            </div>
            
            <div class="test-section">
                <h2>📏 Content Density Test</h2>
                <div class="variant-badge">Variant: ${densityVariant}</div>
                <p>${densityConfig.description}</p>
            </div>
            
            <div class="cta-section">
                <a href="/docs/api/utils/readfile" class="cta-button" onclick="trackClicks()">
                    Try Documentation →
                </a>
            </div>
            
            <div class="assignments">
                <h3>🎲 Your Test Assignments</h3>
                ${Object.entries(assignments).map(([testId, variant]) => `
                    <div class="assignment-item">
                        <span class="test-name">${testId.replace('_', ' ').toUpperCase()}</span>
                        <span class="variant-name">${variant.toUpperCase()}</span>
                    </div>
                `).join('')}
            </div>
            
            <div class="metrics">
                <h3>📊 Live Metrics</h3>
                ${Object.entries(metrics).map(([testId, testMetrics]) => `
                    <div style="margin-bottom: 16px;">
                        <strong>${testId.replace('_', ' ').toUpperCase()}:</strong>
                        ${Object.entries(testMetrics).map(([variant, variantMetrics]) => `
                            <div class="metric-item">
                                <span>${variant}:</span>
                                <span>${variantMetrics.views} views, ${variantMetrics.clicks} clicks</span>
                            </div>
                        `).join('')}
                    </div>
                `).join('')}
            </div>
            
            <div class="admin-link">
                <a href="/admin">📊 View Admin Dashboard</a>
            </div>
        </div>
    </div>
    
    <script>
        // Track page views for all tests
        const assignments = ${JSON.stringify(assignments)};
        
        fetch('/track', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                action: 'view', 
                assignments 
            })
        });
        
        // Track clicks
        function trackClicks() {
            fetch('/track', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    action: 'click', 
                    assignments 
                })
            });
        }
    </script>
</body>
</html>`;
}

// Generate admin dashboard
function generateAdminDashboard(): string {
  return `
<!DOCTYPE html>
<html>
<head>
    <title>A/B Testing Admin Dashboard</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .dashboard { max-width: 1200px; margin: 0 auto; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .test-card { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .test-card h3 { margin: 0 0 15px 0; color: #333; }
        .variant { margin: 10px 0; padding: 10px; background: #f8f9fa; border-radius: 4px; }
        .variant-name { font-weight: bold; color: #666; }
        .metrics { font-size: 14px; color: #333; }
        .controls { margin-top: 20px; }
        .btn { background: #007bff; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin-right: 10px; }
        .btn:hover { background: #0056b3; }
        .btn-danger { background: #dc3545; }
        .btn-danger:hover { background: #c82333; }
    </style>
</head>
<body>
    <div class="dashboard">
        <h1>🧪 A/B Testing Admin Dashboard</h1>
        
        <div class="test-grid">
            ${Object.entries(metrics).map(([testId, testMetrics]) => `
                <div class="test-card">
                    <h3>${testId.replace('_', ' ').toUpperCase()}</h3>
                    ${Object.entries(testMetrics).map(([variant, variantMetrics]) => `
                        <div class="variant">
                            <div class="variant-name">${variant.toUpperCase()}</div>
                            <div class="metrics">
                                Views: ${variantMetrics.views} | 
                                Clicks: ${variantMetrics.clicks} | 
                                CTR: ${variantMetrics.views > 0 ? ((variantMetrics.clicks / variantMetrics.views) * 100).toFixed(2) : '0.00'}%
                            </div>
                        </div>
                    `).join('')}
                </div>
            `).join('')}
        </div>
        
        <div class="controls">
            <button class="btn" onclick="location.reload()">🔄 Refresh</button>
            <button class="btn btn-danger" onclick="resetMetrics()">🗑️ Reset All Metrics</button>
        </div>
    </div>
    
    <script>
        function resetMetrics() {
            if (confirm('Reset all metrics?')) {
                fetch('/reset', { method: 'POST' }).then(() => location.reload());
            }
        }
        
        // Auto-refresh every 10 seconds
        setTimeout(() => location.reload(), 10000);
    </script>
</body>
</html>`;
}

// Initialize tests
registerTests();

// Start server
const MODULAR_AB_TESTING_PORT = parseInt(process.env.MODULAR_AB_TESTING_PORT || '3004', 10);
const server = serve({
  port: MODULAR_AB_TESTING_PORT,
  async fetch(req) {
    const url = new URL(req.url);
    
    try {
      // Create ABTestingManager for this request
      const cookieString = req.headers.get("cookie") || undefined;
      const requestAbManager = new ABTestingManager(cookieString);
      
      // Re-register tests (in production, this would be done once globally)
      registerTests();
      for (const [testId, test] of (requestAbManager as any).tests) {
        (requestAbManager as any).tests.set(testId, test);
      }
      
      // Main test page
      if (url.pathname === "/" && req.method === "GET") {
        // Get all assignments for this user
        const assignments = requestAbManager.getAllAssignments();
        
        // Track views for all assigned tests
        Object.entries(assignments).forEach(([testId, variant]) => {
          trackMetric(testId, variant, "view");
        });
        
        // Get response headers (including cookies)
        const cookieHeaders = requestAbManager.getResponseHeaders();
        
        // Generate content based on assignments
        const html = generateTestPage(assignments);
        
        const headers: Record<string, string> = {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        };
        
        // Add cookie headers if any
        if (cookieHeaders.length > 0) {
          headers["Set-Cookie"] = cookieHeaders[0]; // Simplified for single cookie
        }
        
        return new Response(html, { headers });
      }
      
      // Metrics tracking
      if (url.pathname === "/track" && req.method === "POST") {
        const body = await req.json();
        
        if (body.action === "view") {
          Object.entries(body.assignments).forEach(([testId, variant]) => {
            trackMetric(testId, variant, "view");
          });
        } else if (body.action === "click") {
          Object.entries(body.assignments).forEach(([testId, variant]) => {
            trackMetric(testId, variant, "click");
          });
        }
        
        return Response.json({ success: true });
      }
      
      // Admin dashboard
      if (url.pathname === "/admin" && req.method === "GET") {
        const html = generateAdminDashboard();
        return new Response(html, {
          headers: { "Content-Type": "text/html" }
        });
      }
      
      // Reset metrics
      if (url.pathname === "/reset" && req.method === "POST") {
        Object.keys(metrics).forEach(testId => {
          Object.keys(metrics[testId as keyof typeof metrics]).forEach(variant => {
            metrics[testId as keyof typeof metrics][variant as keyof typeof metrics[testId]] = { views: 0, clicks: 0 };
          });
        });
        
        return Response.json({ success: true, message: "Metrics reset" });
      }
      
      // Force assignment endpoint (for testing)
      if (url.pathname.startsWith("/force/") && req.method === "POST") {
        const [, testId, variant] = url.pathname.split("/");
        const cookieString = req.headers.get("cookie") || undefined;
        const testAbManager = new ABTestingManager(cookieString);
        
        try {
          testAbManager.forceAssignVariant(testId, variant);
          const cookieHeaders = testAbManager.getResponseHeaders();
          
          return Response.json({ 
            success: true, 
            message: `Forced ${testId} = ${variant}`,
            headers: cookieHeaders.length > 0 ? { "Set-Cookie": cookieHeaders[0] } : {}
          }, { 
            headers: cookieHeaders.length > 0 ? { "Set-Cookie": cookieHeaders[0] } : {}
          });
        } catch (error) {
          return Response.json({ 
            success: false, 
            error: error.message 
          }, { status: 400 });
        }
      }
      
      return new Response("Not found", { status: 404 });
      
    } catch (error) {
      console.error("Server error:", error);
      return new Response("Internal server error", { status: 500 });
    }
  },
});

console.log("🧪 Modular A/B Testing Server running on http://example.com");
console.log("📊 Admin Dashboard: http://example.com/admin");
console.log("🎲 Force assignment: POST /force/{testId}/{variant}");
console.log("");
console.log("Active Tests:");
console.log("  • url_structure: direct vs fragments (50/50)");
console.log("  • doc_layout: sidebar vs topnav (60/40)");
console.log("  • cta_button: blue vs green vs orange (33/33/34)");
console.log("  • content_density: compact vs balanced vs spacious (20/60/20)");

/**
 * 💡 Performance Tip: For better performance, consider:
 * 1. Using preconnect for frequently accessed domains
 * 2. Adding resource hints to your HTML head
 * 3. Implementing request caching
 * 4. Using the native fetch API with keep-alive
 */