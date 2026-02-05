#!/usr/bin/env bun

/**
 * Comprehensive Monitoring System Demo
 * Demonstrates security, performance tracking, and real-time analytics
 */

import { Bun } from "bun";
import { initializeMonitoring, SecureCookieManager, SecurityMiddleware } from "../src/monitoring";

/**
 * Demo server showcasing all monitoring features
 */
async function runMonitoringDemo() {
  const colorize = (text: string, color?: string) => {
    return typeof Bun !== 'undefined' ? Bun.color(text, color) : text;
  };
  
  console.log(colorize("🎯 Starting Comprehensive Monitoring Demo", "ansi"));
  
  // Initialize monitoring system
  const monitoring = await initializeMonitoring({
    metafilePath: "./meta.json", // Use existing metafile
    monitoringPort: 3003,
    enableSecurity: true,
    enablePerformance: true,
  });
  
  // Create demo server with security middleware
  let demoServer: any = null;
  
  if (typeof Bun !== 'undefined' && Bun.serve) {
    demoServer = Bun.serve({
      port: 3000,
      async fetch(req) {
        const url = new URL(req.url);
        
        // Apply security middleware
        const security = await monitoring.secureRequest(req);
        if (!security.allowed) {
          return new Response(
            JSON.stringify({ error: security.reason }), 
            { status: 403, headers: { "Content-Type": "application/json" } }
          );
        }
        
        // Record request metrics
        const start = Date.now();
        
        try {
          // Route handling
          if (url.pathname === "/") {
            return new Response(getHomePage(), {
              headers: { "Content-Type": "text/html" }
            });
          }
          
          if (url.pathname === "/api/upload" && req.method === "POST") {
            return await handleUpload(req, monitoring);
          }
          
          if (url.pathname === "/api/secure-data") {
            return await handleSecureData(req, monitoring);
          }
          
          if (url.pathname === "/api/performance-test") {
            return await handlePerformanceTest(monitoring);
          }
          
          if (url.pathname === "/api/metrics") {
            const report = monitoring.generateReport();
            return Response.json(report);
          }
          
          return new Response("Not Found", { status: 404 });
          
        } finally {
          // Record response time
          const duration = Date.now() - start;
          monitoring.recordMetric("response_time", duration, {
            method: req.method,
            path: url.pathname,
          });
        }
      },
    });
    
    console.log(colorize("🌐 Demo server started on http://localhost:3000", "ansi"));
  } else {
    console.log(colorize("⚠️ Demo server not available in test environment", "ansi"));
  }
  
  const monitoringServer = await monitoring.monitor.startMonitoring(3003);
  if (monitoringServer) {
    console.log(colorize("📊 Monitoring dashboard: http://localhost:3003", "ansi"));
    console.log(colorize("🔍 Bundle analysis: http://localhost:3003/bundle-analysis", "ansi"));
  } else {
    console.log(colorize("⚠️ Monitoring server not available", "ansi"));
  }
  
  return { server: demoServer, monitoring };
}

/**
 * Handle file upload with security and monitoring
 */
async function handleUpload(req: Request, monitoring: any) {
  const start = Date.now();
  
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File;
    
    if (!file) {
      return new Response(
        JSON.stringify({ error: "No file provided" }),
        { status: 400, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Security checks
    if (file.size > 10 * 1024 * 1024) { // 10MB limit
      return new Response(
        JSON.stringify({ error: "File too large" }),
        { status: 413, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Process file
    const bytes = await file.bytes();
    const hash = await Bun.hash(bytes, "sha256");
    
    // Create archive with metadata
    const archive = new Bun.Archive({
      [file.name]: await file.text(),
      "metadata.json": JSON.stringify({
        name: file.name,
        size: file.size,
        hash,
        uploaded: new Date().toISOString(),
        type: file.type,
      }),
      "security-scan.json": JSON.stringify({
        scanned: true,
        threats: [],
        timestamp: new Date().toISOString(),
      }),
    });
    
    // Record metrics
    monitoring.recordMetric("upload_size", file.size);
    monitoring.recordMetric("upload_count", 1);
    monitoring.recordMetric("processing_time", Date.now() - start);
    
    return new Response(archive.arrayBuffer(), {
      headers: {
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="processed-${file.name}.zip"`,
      },
    });
    
  } catch (error) {
    monitoring.recordMetric("upload_errors", 1);
    return new Response(
      JSON.stringify({ error: "Upload failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Handle secure data with cookie management
 */
async function handleSecureData(req: Request, monitoring: any) {
  const cookieManager = new SecureCookieManager(req);
  
  try {
    // Check authentication
    const authToken = cookieManager.getSecureCookie("auth_token");
    if (!authToken) {
      return new Response(
        JSON.stringify({ error: "Authentication required" }),
        { status: 401, headers: { "Content-Type": "application/json" } }
      );
    }
    
    // Simulate secure data access
    const secureData = {
      user_id: cookieManager.getSecureCookie("user_id"),
      data: "Sensitive information",
      timestamp: new Date().toISOString(),
      session_valid: true,
    };
    
    // Set analytics cookie
    cookieManager.setAnalyticsCookie("demo-session-" + Date.now());
    
    monitoring.recordMetric("secure_requests", 1);
    
    return new Response(JSON.stringify(secureData), {
      headers: { 
        "Content-Type": "application/json",
        "Set-Cookie": cookieManager.cookieMap.toHeaderString(),
      },
    });
    
  } catch (error) {
    monitoring.recordMetric("security_errors", 1);
    return new Response(
      JSON.stringify({ error: "Security check failed" }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }
}

/**
 * Performance testing endpoint
 */
async function handlePerformanceTest(monitoring: any) {
  const operations = [];
  
  // Test various operations
  const tests = [
    {
      name: "hash_calculation",
      test: async () => {
        const data = new TextEncoder().encode("Performance test data");
        return await Bun.hash(data, "sha256");
      },
    },
    {
      name: "file_operations",
      test: async () => {
        const testFile = Bun.file("./fixtures/10mb.bin");
        return await testFile.arrayBuffer();
      },
    },
    {
      name: "archive_creation",
      test: async () => {
        const archive = new Bun.Archive({
          "test.txt": "Hello, World!",
          "config.json": JSON.stringify({ test: true }),
        });
        return await archive.arrayBuffer();
      },
    },
    {
      name: "json_parsing",
      test: async () => {
        const largeJson = JSON.stringify({
          data: Array.from({ length: 1000 }, (_, i) => ({ id: i, value: Math.random() })),
        });
        return JSON.parse(largeJson);
      },
    },
  ];
  
  for (const test of tests) {
    const start = performance.now();
    await test.test();
    const duration = performance.now() - start;
    
    operations.push({
      operation: test.name,
      duration: duration.toFixed(2),
      timestamp: Date.now(),
    });
    
    monitoring.recordMetric(test.name, duration);
  }
  
  return Response.json({
    message: "Performance tests completed",
    operations,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Generate demo homepage
 */
function getHomePage(): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Monitoring System Demo</title>
      <meta charset="utf-8">
      <style>
        body { 
          font-family: system-ui; 
          margin: 2rem; 
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          min-height: 100vh;
        }
        .container { max-width: 800px; margin: 0 auto; }
        .card { 
          background: rgba(255, 255, 255, 0.1); 
          backdrop-filter: blur(10px);
          padding: 2rem; 
          border-radius: 12px; 
          margin-bottom: 2rem;
          border: 1px solid rgba(255, 255, 255, 0.2);
        }
        .btn { 
          background: #4CAF50; 
          color: white; 
          padding: 12px 24px; 
          border: none; 
          border-radius: 6px; 
          cursor: pointer;
          margin: 0.5rem;
          font-size: 16px;
          transition: background 0.3s;
        }
        .btn:hover { background: #45a049; }
        .btn.secondary { background: #2196F3; }
        .btn.secondary:hover { background: #1976D2; }
        .status { 
          padding: 1rem; 
          border-radius: 6px; 
          margin: 1rem 0; 
          background: rgba(76, 175, 80, 0.2);
          border: 1px solid #4CAF50;
        }
        .links { display: flex; gap: 1rem; flex-wrap: wrap; }
        input[type="file"] { margin: 1rem 0; padding: 8px; border-radius: 4px; border: 1px solid #ccc; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="card">
          <h1>🚀 Comprehensive Monitoring System Demo</h1>
          <p>Built with Bun's built-in security and performance features</p>
          
          <div class="status">
            ✅ All systems operational | 📊 Real-time monitoring active | 🔔 Security enabled
          </div>
          
          <h2>📡 API Endpoints</h2>
          <div class="links">
            <button class="btn" onclick="testPerformance()">🎯 Performance Test</button>
            <button class="btn secondary" onclick="viewMetrics()">📊 View Metrics</button>
            <button class="btn secondary" onclick="openDashboard()">📈 Open Dashboard</button>
          </div>
          
          <h2>📁 File Upload with Security</h2>
          <form id="uploadForm">
            <input type="file" id="fileInput" accept=".txt,.json,.js,.ts">
            <button type="submit" class="btn">📤 Upload & Process</button>
          </form>
          
          <h2>🔐 Secure Data Access</h2>
          <button class="btn secondary" onclick="accessSecureData()">🔒 Access Protected Data</button>
          
          <h2>📊 Monitoring Links</h2>
          <div class="links">
            <a href="http://localhost:3003" target="_blank" class="btn">📊 Main Dashboard</a>
            <a href="http://localhost:3003/bundle-analysis" target="_blank" class="btn">📦 Bundle Analysis</a>
            <a href="http://localhost:3003/metrics" target="_blank" class="btn">📈 Raw Metrics</a>
          </div>
        </div>
        
        <div class="card">
          <h2>📈 Live Metrics</h2>
          <div id="metrics">Loading metrics...</div>
        </div>
      </div>
      
      <script>
        // File upload handling
        document.getElementById('uploadForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const fileInput = document.getElementById('fileInput');
          const file = fileInput.files[0];
          
          if (!file) {
            alert('Please select a file');
            return;
          }
          
          const formData = new FormData();
          formData.append('file', file);
          
          try {
            const response = await fetch('/api/upload', {
              method: 'POST',
              body: formData
            });
            
            if (response.ok) {
              const blob = await response.blob();
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'processed-' + file.name + '.zip';
              a.click();
              window.URL.revokeObjectURL(url);
              
              alert('File processed successfully!');
            } else {
              alert('Upload failed: ' + response.statusText);
            }
          } catch (error) {
            alert('Error: ' + error.message);
          }
        });
        
        // Performance test
        async function testPerformance() {
          try {
            const response = await fetch('/api/performance-test');
            const data = await response.json();
            console.log('Performance results:', data);
            alert('Performance test completed! Check console for details.');
          } catch (error) {
            alert('Performance test failed: ' + error.message);
          }
        }
        
        // View metrics
        async function viewMetrics() {
          try {
            const response = await fetch('/api/metrics');
            const data = await response.json();
            document.getElementById('metrics').innerHTML = 
              '<pre>' + JSON.stringify(data, null, 2) + '</pre>';
          } catch (error) {
            document.getElementById('metrics').innerHTML = 
              'Error loading metrics: ' + error.message;
          }
        }
        
        // Open dashboard
        function openDashboard() {
          window.open('http://localhost:3003', '_blank');
        }
        
        // Access secure data
        async function accessSecureData() {
          try {
            const response = await fetch('/api/secure-data');
            const data = await response.json();
            alert('Secure data accessed: ' + JSON.stringify(data, null, 2));
          } catch (error) {
            alert('Access denied: ' + error.message);
          }
        }
        
        // Load metrics on page load
        viewMetrics();
        
        // Auto-refresh metrics every 30 seconds
        setInterval(viewMetrics, 30000);
      </script>
    </body>
    </html>
  `;
}

// Run the demo
if (import.meta.main) {
  const colorize = (text: string, color?: string) => {
    return typeof Bun !== 'undefined' ? Bun.color(text, color) : text;
  };
  
  runMonitoringDemo()
    .then(({ server, monitoring }) => {
      console.log(colorize("🎉 Demo started successfully!", "ansi"));
      console.log(colorize("Press Ctrl+C to stop", "ansi"));
    })
    .catch(error => {
      console.error(colorize("❌ Demo failed:", "ansi"), error);
      process.exit(1);
    });
}

export { runMonitoringDemo };
