#!/usr/bin/env bun
/**
 * 🧪 Production-Ready A/B Testing Server
 * 
 * Uses the refined ABTestManager with strict validation and proper weight distribution
 * Demonstrates enterprise-grade A/B testing with multiple concurrent tests
 */

import { serve } from "bun";
import { ABTestManager } from "./lib/ab-testing/manager.ts";

// Global test configuration
function configureTests(manager: ABTestManager) {
  // Test 1: URL Structure (50/50 split)
  manager.registerTest({
    id: "url_structure",
    variants: ["direct", "fragments"],
    weights: [50, 50],
    cookieName: "url_test",
    maxAgeDays: 30,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true
  });

  // Test 2: Documentation Layout (60/40 favoring new layout)
  manager.registerTest({
    id: "doc_layout",
    variants: ["sidebar", "topnav"],
    weights: [60, 40],
    cookieName: "layout_test",
    maxAgeDays: 14,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true
  });

  // Test 3: Call-to-Action Color (3-way split)
  manager.registerTest({
    id: "cta_color",
    variants: ["blue", "green", "orange"],
    weights: [34, 33, 33], // Must sum to 100
    cookieName: "cta_test",
    maxAgeDays: 7,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true
  });

  // Test 4: Content Density (weighted toward balanced)
  manager.registerTest({
    id: "content_density",
    variants: ["compact", "balanced", "spacious"],
    weights: [20, 60, 20],
    cookieName: "density_test",
    maxAgeDays: 21,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true
  });

  // Test 5: Pricing Display (A/B test with different strategies)
  manager.registerTest({
    id: "pricing_display",
    variants: ["monthly", "annual", "lifetime"],
    weights: [70, 25, 5], // Heavily favor monthly
    cookieName: "pricing_test",
    maxAgeDays: 90,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    httpOnly: true
  });
}

// Content configurations
const contentConfigs = {
  url_structure: {
    direct: {
      title: "Direct URLs - Modern & Clean",
      description: "Experience our streamlined direct URL structure with enhanced SEO and navigation",
      features: [
        "Clean URLs like /docs/api/utils/readfile",
        "Better search engine optimization",
        "Improved bookmarking and sharing",
        "Enhanced user navigation experience"
      ],
      color: "#3b82f6",
      example: "/docs/api/utils/readfile"
    },
    fragments: {
      title: "Fragment URLs - Classic & Reliable",
      description: "Continue with our proven fragment-based URL structure for consistency",
      features: [
        "Traditional URLs like /docs/api/utils#readfile",
        "Single-page navigation experience",
        "Consistent with existing documentation",
        "Familiar to current users"
      ],
      color: "#22c55e",
      example: "/docs/api/utils#readfile"
    }
  },
  doc_layout: {
    sidebar: {
      title: "Sidebar Navigation",
      description: "Traditional sidebar layout with hierarchical navigation",
      features: ["Expandable tree view", "Quick section access", "Hierarchical organization"]
    },
    topnav: {
      title: "Top Navigation Bar",
      description: "Modern horizontal navigation with dropdown menus",
      features: ["Clean header design", "More content space", "Dropdown menus"]
    }
  },
  cta_color: {
    blue: {
      title: "Blue Action Buttons",
      color: "#3b82f6",
      description: "Professional blue call-to-action buttons"
    },
    green: {
      title: "Green Action Buttons",
      color: "#22c55e",
      description: "Friendly green call-to-action buttons"
    },
    orange: {
      title: "Orange Action Buttons",
      color: "#f97316",
      description: "Energetic orange call-to-action buttons"
    }
  },
  content_density: {
    compact: {
      title: "Compact Layout",
      description: "Information-dense layout optimized for power users",
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
  },
  pricing_display: {
    monthly: {
      title: "Monthly Pricing",
      description: "Display monthly subscription pricing",
      features: ["Lower upfront cost", "Flexible commitment", "Easy cancellation"]
    },
    annual: {
      title: "Annual Pricing",
      description: "Display annual subscription pricing with discount",
      features: ["20% discount", "Single payment", "Priority support"]
    },
    lifetime: {
      title: "Lifetime Access",
      description: "Display one-time lifetime access pricing",
      features: ["Pay once, use forever", "All future updates", "Premium support"]
    }
  }
};

// Metrics tracking
const metrics = {
  url_structure: { direct: { views: 0, clicks: 0 }, fragments: { views: 0, clicks: 0 } },
  doc_layout: { sidebar: { views: 0, clicks: 0 }, topnav: { views: 0, clicks: 0 } },
  cta_color: { blue: { views: 0, clicks: 0 }, green: { views: 0, clicks: 0 }, orange: { views: 0, clicks: 0 } },
  content_density: { compact: { views: 0, clicks: 0 }, balanced: { views: 0, clicks: 0 }, spacious: { views: 0, clicks: 0 } },
  pricing_display: { monthly: { views: 0, clicks: 0 }, annual: { views: 0, clicks: 0 }, lifetime: { views: 0, clicks: 0 } }
};

// Track metrics
function trackMetric(testId: string, variant: string, action: "view" | "click") {
  if (metrics[testId] && metrics[testId][variant]) {
    metrics[testId][variant][action]++;
    console.log(`📊 ${testId}/${variant}: ${action} (${metrics[testId][variant][action]} total)`);
  }
}

// Generate comprehensive test page
function generateTestPage(assignments: Record<string, string>): string {
  const urlVariant = assignments.url_structure || "direct";
  const layoutVariant = assignments.doc_layout || "sidebar";
  const ctaVariant = assignments.cta_color || "blue";
  const densityVariant = assignments.content_density || "balanced";
  const pricingVariant = assignments.pricing_display || "monthly";

  const urlConfig = contentConfigs.url_structure[urlVariant];
  const layoutConfig = contentConfigs.doc_layout[layoutVariant];
  const ctaConfig = contentConfigs.cta_color[ctaVariant];
  const densityConfig = contentConfigs.content_density[densityVariant];
  const pricingConfig = contentConfigs.pricing_display[pricingVariant];

  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Production A/B Testing Demo</title>
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
            max-width: 1400px;
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
        
        .test-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
            gap: 24px;
            margin-bottom: 32px;
        }
        
        .test-card {
            background: #f8fafc;
            border: 2px solid #e2e8f0;
            border-radius: 12px;
            padding: 24px;
            transition: all 0.2s;
        }
        
        .test-card:hover {
            border-color: ${urlConfig.color};
            box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
        }
        
        .test-card h3 {
            color: #1e293b;
            margin-bottom: 12px;
            font-size: 1.25rem;
        }
        
        .variant-badge {
            display: inline-block;
            background: ${urlConfig.color};
            color: white;
            padding: 4px 12px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            margin-bottom: 12px;
        }
        
        .features {
            list-style: none;
            margin: 12px 0;
        }
        
        .features li {
            padding: 4px 0;
            position: relative;
            padding-left: 20px;
            font-size: 14px;
            color: #64748b;
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
            padding: 12px;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            margin: 12px 0;
            border-left: 3px solid ${urlConfig.color};
        }
        
        .cta-section {
            text-align: center;
            margin: 40px 0;
            padding: 32px;
            background: linear-gradient(135deg, ${ctaConfig.color}22 0%, ${ctaConfig.color}44 100%);
            border-radius: 12px;
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
            padding: 24px;
            border-radius: 8px;
            margin: 24px 0;
        }
        
        .assignments h3 {
            color: #92400e;
            margin-bottom: 16px;
        }
        
        .assignment-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
        }
        
        .assignment-item {
            display: flex;
            justify-content: space-between;
            padding: 8px 12px;
            background: #fef9c3;
            border-radius: 4px;
            border: 1px solid #fde68a;
        }
        
        .test-name {
            font-weight: 600;
            color: #78350f;
            font-size: 12px;
        }
        
        .variant-name {
            color: #92400e;
            font-size: 12px;
            font-weight: 600;
        }
        
        .metrics {
            background: #ecfdf5;
            padding: 24px;
            border-radius: 8px;
            margin: 24px 0;
        }
        
        .metrics h3 {
            color: #065f46;
            margin-bottom: 16px;
        }
        
        .metrics-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 16px;
        }
        
        .metric-test {
            background: #f0fdf4;
            padding: 16px;
            border-radius: 6px;
            border: 1px solid #bbf7d0;
        }
        
        .metric-test h4 {
            color: #065f46;
            margin-bottom: 12px;
            font-size: 14px;
        }
        
        .metric-item {
            display: flex;
            justify-content: space-between;
            padding: 2px 0;
            font-size: 12px;
            color: #047857;
        }
        
        .admin-link {
            text-align: center;
            margin: 24px 0;
        }
        
        .admin-link a {
            color: ${urlConfig.color};
            text-decoration: none;
            font-weight: 600;
            padding: 8px 16px;
            border: 2px solid ${urlConfig.color};
            border-radius: 6px;
            transition: all 0.2s;
        }
        
        .admin-link a:hover {
            background: ${urlConfig.color};
            color: white;
        }
        
        .pricing-section {
            background: #f8fafc;
            padding: 24px;
            border-radius: 8px;
            margin: 24px 0;
            border: 2px solid #e2e8f0;
        }
        
        .pricing-features {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 12px;
            margin-top: 16px;
        }
        
        .pricing-feature {
            padding: 12px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
        }
        
        .pricing-feature h5 {
            color: #1e293b;
            margin-bottom: 8px;
            font-size: 14px;
        }
        
        .pricing-feature p {
            color: #64748b;
            font-size: 12px;
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
            <div class="test-grid">
                <div class="test-card">
                    <h3>🔗 URL Structure</h3>
                    <div class="variant-badge">${urlVariant.toUpperCase()}</div>
                    <p>Testing direct vs fragment URLs for better SEO and navigation.</p>
                    <ul class="features">
                        ${urlConfig.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                    <div class="example">${urlConfig.example}</div>
                </div>
                
                <div class="test-card">
                    <h3>📐 Layout Design</h3>
                    <div class="variant-badge">${layoutVariant.toUpperCase()}</div>
                    <p>${layoutConfig.description}</p>
                    <ul class="features">
                        ${layoutConfig.features.map(feature => `<li>${feature}</li>`).join('')}
                    </ul>
                </div>
                
                <div class="test-card">
                    <h3>🎨 Button Colors</h3>
                    <div class="variant-badge">${ctaVariant.toUpperCase()}</div>
                    <p>${ctaConfig.description}</p>
                    <div style="background: ${ctaConfig.color}; color: white; padding: 8px; border-radius: 4px; margin-top: 8px; text-align: center;">
                        Sample Button
                    </div>
                </div>
                
                <div class="test-card">
                    <h3>📏 Content Density</h3>
                    <div class="variant-badge">${densityVariant.toUpperCase()}</div>
                    <p>${densityConfig.description}</p>
                    <div style="margin-top: 8px; font-size: 12px; color: #64748b;">
                        Padding: ${densityConfig.padding} | Font: ${densityConfig.fontSize}
                    </div>
                </div>
            </div>
            
            <div class="pricing-section">
                <h3>💰 Pricing Strategy</h3>
                <div class="variant-badge">${pricingVariant.toUpperCase()}</div>
                <p>${pricingConfig.description}</p>
                <div class="pricing-features">
                    ${pricingConfig.features.map(feature => `
                        <div class="pricing-feature">
                            <h5>${feature.split(':')[0]}</h5>
                            <p>${feature.split(':').slice(1).join(':')}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="cta-section">
                <a href="/docs/api/utils/readfile" class="cta-button" onclick="trackClicks()">
                    Try Documentation →
                </a>
            </div>
            
            <div class="assignments">
                <h3>🎲 Your Test Assignments</h3>
                <div class="assignment-grid">
                    ${Object.entries(assignments).map(([testId, variant]) => `
                        <div class="assignment-item">
                            <span class="test-name">${testId.replace(/_/g, ' ').toUpperCase()}</span>
                            <span class="variant-name">${variant.toUpperCase()}</span>
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="metrics">
                <h3>📊 Live Metrics</h3>
                <div class="metrics-grid">
                    ${Object.entries(metrics).map(([testId, testMetrics]) => `
                        <div class="metric-test">
                            <h4>${testId.replace(/_/g, ' ').toUpperCase()}</h4>
                            ${Object.entries(testMetrics).map(([variant, variantMetrics]) => `
                                <div class="metric-item">
                                    <span>${variant}:</span>
                                    <span>${variantMetrics.views}v / ${variantMetrics.clicks}c (${variantMetrics.views > 0 ? ((variantMetrics.clicks / variantMetrics.views) * 100).toFixed(1) : '0.0'}%)</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
            
            <div class="admin-link">
                <a href="/admin">📊 Admin Dashboard</a>
            </div>
        </div>
    </div>
    
    <script>
        // Track page views
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
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 20px; background: #f8fafc; }
        .dashboard { max-width: 1400px; margin: 0 auto; }
        .header { text-align: center; margin-bottom: 30px; }
        .header h1 { color: #1e293b; margin-bottom: 8px; }
        .header p { color: #64748b; }
        .test-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .test-card { background: white; padding: 24px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.07); border: 1px solid #e2e8f0; }
        .test-card h3 { margin: 0 0 16px 0; color: #1e293b; font-size: 1.1rem; }
        .variant { margin: 12px 0; padding: 12px; background: #f8fafc; border-radius: 6px; border: 1px solid #e2e8f0; }
        .variant-name { font-weight: 600; color: #374151; margin-bottom: 4px; }
        .metrics { font-size: 13px; color: #6b7280; display: flex; justify-content: space-between; }
        .ctr { color: #059669; font-weight: 600; }
        .controls { text-align: center; margin: 30px 0; }
        .btn { background: #3b82f6; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin: 0 8px; font-weight: 500; }
        .btn:hover { background: #2563eb; }
        .btn-danger { background: #ef4444; }
        .btn-danger:hover { background: #dc2626; }
        .summary { background: #f0f9ff; padding: 20px; border-radius: 8px; margin: 20px 0; border: 1px solid #bae6fd; }
        .summary h3 { color: #1e40af; margin-bottom: 12px; }
        .summary-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px; }
        .summary-item { text-align: center; }
        .summary-value { font-size: 24px; font-weight: bold; color: #1e40af; }
        .summary-label { font-size: 14px; color: #64748b; }
    </style>
</head>
<body>
    <div class="dashboard">
        <div class="header">
            <h1>🧪 A/B Testing Admin Dashboard</h1>
            <p>Production-ready testing with strict weight validation</p>
        </div>
        
        <div class="summary">
            <h3>📊 Overall Summary</h3>
            <div class="summary-grid">
                <div class="summary-item">
                    <div class="summary-value">${Object.keys(metrics).length}</div>
                    <div class="summary-label">Active Tests</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${Object.values(metrics).reduce((sum, test) => sum + Object.values(test).reduce((s, v) => s + v.views, 0), 0)}</div>
                    <div class="summary-label">Total Views</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${Object.values(metrics).reduce((sum, test) => sum + Object.values(test).reduce((s, v) => s + v.clicks, 0), 0)}</div>
                    <div class="summary-label">Total Clicks</div>
                </div>
                <div class="summary-item">
                    <div class="summary-value">${(() => {
                        const totalViews = Object.values(metrics).reduce((sum, test) => sum + Object.values(test).reduce((s, v) => s + v.views, 0), 0);
                        const totalClicks = Object.values(metrics).reduce((sum, test) => sum + Object.values(test).reduce((s, v) => s + v.clicks, 0), 0);
                        return totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';
                    })()}%</div>
                    <div class="summary-label">Overall CTR</div>
                </div>
            </div>
        </div>
        
        <div class="test-grid">
            ${Object.entries(metrics).map(([testId, testMetrics]) => {
              const totalViews = Object.values(testMetrics).reduce((sum, v) => sum + v.views, 0);
              const totalClicks = Object.values(testMetrics).reduce((sum, v) => sum + v.clicks, 0);
              const overallCTR = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0';
              
              return `
                <div class="test-card">
                    <h3>${testId.replace(/_/g, ' ').toUpperCase()}</h3>
                    ${Object.entries(testMetrics).map(([variant, variantMetrics]) => {
                      const ctr = variantMetrics.views > 0 ? ((variantMetrics.clicks / variantMetrics.views) * 100).toFixed(1) : '0.0';
                      return `
                        <div class="variant">
                            <div class="variant-name">${variant.toUpperCase()}</div>
                            <div class="metrics">
                                <span>${variantMetrics.views} views</span>
                                <span class="ctr">${ctr}% CTR</span>
                            </div>
                            <div class="metrics">
                                <span>${variantMetrics.clicks} clicks</span>
                                <span>${((variantMetrics.views / totalViews) * 100).toFixed(1)}% traffic</span>
                            </div>
                        </div>
                      `;
                    }).join('')}
                    <div style="margin-top: 12px; padding-top: 12px; border-top: 1px solid #e2e8f0;">
                        <strong>Overall: ${overallCTR}% CTR</strong>
                    </div>
                </div>
              `;
            }).join('')}
        </div>
        
        <div class="controls">
            <button class="btn" onclick="location.reload()">🔄 Refresh</button>
            <button class="btn" onclick="exportData()">📊 Export Data</button>
            <button class="btn btn-danger" onclick="resetMetrics()">🗑️ Reset All</button>
        </div>
    </div>
    
    <script>
        function resetMetrics() {
            if (confirm('Reset all metrics? This cannot be undone.')) {
                fetch('/reset', { method: 'POST' }).then(() => location.reload());
            }
        }
        
        function exportData() {
            fetch('/api/metrics')
                .then(res => res.json())
                .then(data => {
                    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = 'ab-test-metrics.json';
                    a.click();
                    URL.revokeObjectURL(url);
                });
        }
        
        // Auto-refresh every 10 seconds
        setTimeout(() => location.reload(), 10000);
    </script>
</body>
</html>`;
}

// Start server
const server = serve({
  port: 3006,
  async fetch(req) {
    const url = new URL(req.url);
    
    try {
      // Create ABTestManager for this request
      const cookieHeader = req.headers.get("cookie");
      const abManager = new ABTestManager(cookieHeader);
      
      // Configure tests (in production, this would be done once globally)
      configureTests(abManager);
      
      // Main test page
      if (url.pathname === "/" && req.method === "GET") {
        // Get all assignments for this user
        const assignments = abManager.getAllAssignments();
        
        // Track views for all assigned tests
        Object.entries(assignments).forEach(([testId, variant]) => {
          trackMetric(testId, variant, "view");
        });
        
        // Get response headers (including cookies)
        const cookieHeaders = abManager.getSetCookieHeaders();
        
        // Generate content based on assignments
        const html = generateTestPage(assignments);
        
        const headers: Record<string, string> = {
          "Content-Type": "text/html",
          "Cache-Control": "no-cache, no-store, must-revalidate"
        };
        
        // Add cookie headers
        if (cookieHeaders.length > 0) {
          headers["Set-Cookie"] = cookieHeaders.join(", ");
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
      
      // API endpoints
      if (url.pathname === "/api/metrics" && req.method === "GET") {
        return Response.json({
          timestamp: new Date().toISOString(),
          metrics,
          summary: {
            totalTests: Object.keys(metrics).length,
            totalViews: Object.values(metrics).reduce((sum, test) => sum + Object.values(test).reduce((s, v) => s + v.views, 0), 0),
            totalClicks: Object.values(metrics).reduce((sum, test) => sum + Object.values(test).reduce((s, v) => s + v.clicks, 0), 0)
          }
        });
      }
      
      // Force assignment endpoint
      if (url.pathname.startsWith("/force/") && req.method === "POST") {
        const [, testId, variant] = url.pathname.split("/");
        const cookieHeader = req.headers.get("cookie");
        const testAbManager = new ABTestManager(cookieHeader);
        
        try {
          configureTests(testAbManager);
          testAbManager.forceAssign(testId, variant);
          const cookieHeaders = testAbManager.getSetCookieHeaders();
          
          return Response.json({ 
            success: true, 
            message: `Forced ${testId} = ${variant}`
          }, { 
            headers: cookieHeaders.length > 0 ? { "Set-Cookie": cookieHeaders.join(", ") } : {}
          });
        } catch (error) {
          return Response.json({ 
            success: false, 
            error: error.message 
          }, { status: 400 });
        }
      }
      
      // Clear assignment endpoint
      if (url.pathname.startsWith("/clear/") && req.method === "POST") {
        const [, testId] = url.pathname.split("/");
        const cookieHeader = req.headers.get("cookie");
        const testAbManager = new ABTestManager(cookieHeader);
        
        configureTests(testAbManager);
        testAbManager.clear(testId);
        
        return Response.json({ 
          success: true, 
          message: `Cleared ${testId || 'all'} assignments`
        });
      }
      
      // Reset metrics
      if (url.pathname === "/reset" && req.method === "POST") {
        Object.keys(metrics).forEach(testId => {
          Object.keys(metrics[testId as keyof typeof metrics]).forEach(variant => {
            metrics[testId as keyof typeof metrics][variant as keyof typeof metrics[typeof testId]] = { views: 0, clicks: 0 };
          });
        });
        
        return Response.json({ success: true, message: "All metrics reset" });
      }
      
      return new Response("Not found", { status: 404 });
      
    } catch (error) {
      console.error("Server error:", error);
      return Response.json({ 
        error: "Internal server error", 
        message: error.message 
      }, { status: 500 });
    }
  },
});

console.log("🧪 Production A/B Testing Server running on http://localhost:3006");
console.log("📊 Admin Dashboard: http://localhost:3006/admin");
console.log("📈 Metrics API: http://localhost:3006/api/metrics");
console.log("🎲 Force assignment: POST /force/{testId}/{variant}");
console.log("🗑️ Clear assignment: POST /clear/{testId}");
console.log("");
console.log("Active Tests:");
console.log("  • url_structure: direct vs fragments (50/50)");
console.log("  • doc_layout: sidebar vs topnav (60/40)");
console.log("  • cta_color: blue vs green vs orange (34/33/33)");
console.log("  • content_density: compact vs balanced vs spacious (20/60/20)");
console.log("  • pricing_display: monthly vs annual vs lifetime (70/25/5)");
console.log("");
console.log("✅ Strict weight validation enforced (must sum to 100)");
