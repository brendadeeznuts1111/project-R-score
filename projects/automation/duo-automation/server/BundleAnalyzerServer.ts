// ──────────────────────────────
// 4. MAIN BUNDLE ANALYZER SERVER
// ──────────────────────────────

// server/BundleAnalyzerServer.ts
import { BundleMatrixAnalyzer } from "../analyzers/BundleMatrix.js";
import { VirtualDuoPlusBuilder } from "../builders/VirtualDuoPlusBuilder.js";
import { BundleMatrixHTML } from "../renderers/BundleMatrixHTML.js";

export class BundleAnalyzerServer {
  static async serve() {
    // Generate virtual files
    const files = VirtualDuoPlusBuilder.generateFiles();
    
    // Create entrypoints from generated files
    const entrypoints = Object.keys(files).filter(path => 
      path.includes('/entrypoints/') || 
      path.includes('/domains/localhost/')
    ).slice(0, 10); // Limit to 10 entrypoints for demo
    
    Bun.serve({
      port: 8777,
      async fetch(req) {
        const url = new URL(req.url);
        
        // Serve bundle analysis
        if (url.pathname === '/bundle') {
          try {
            const matrix = await BundleMatrixAnalyzer.analyzeProject(
              entrypoints,
              {
                outdir: './dist',
                target: 'browser',
                minify: true,
                sourcemap: 'none',
                splitting: true,
                external: ['bun:sqlite', 'bun:test'],
                files // Use virtual files
              }
            );
            
            const html = BundleMatrixHTML.render(matrix);
            return new Response(html, {
              headers: { 'Content-Type': 'text/html' }
            });
          } catch (error) {
            return new Response(`Error: ${error.message}`, { status: 500 });
          }
        }
        
        // API endpoint for analysis
        if (url.pathname === '/api/bundle/analyze') {
          const matrix = await BundleMatrixAnalyzer.analyzeProject(entrypoints, { files });
          return Response.json(matrix);
        }
        
        // Serve dependency graph
        if (url.pathname === '/bundle-graph') {
          return new Response(this.renderDependencyGraph(), {
            headers: { 'Content-Type': 'text/html' }
          });
        }
        
        // Download metafile
        if (url.pathname === '/metafile.json') {
          const result = await Bun.build({
            entrypoints,
            files,
            metafile: true
          });
          
          return new Response(JSON.stringify(result.metafile, null, 2), {
            headers: { 
              'Content-Type': 'application/json',
              'Content-Disposition': 'attachment; filename="duoplus-metafile.json"'
            }
          });
        }
        
        return new Response('Not found', { status: 404 });
      },
      
      websocket: {
        async open(ws) {
          ws.subscribe('bundle-updates');
          
          // Send initial analysis
          const matrix = await BundleMatrixAnalyzer.analyzeProject(entrypoints, { files });
          ws.send(JSON.stringify({
            type: 'bundle-analysis',
            data: matrix.summary
          }));
        },
        
        message(ws, message) {
          // Handle WebSocket messages
          const data = JSON.parse(message.toString());
          
          if (data.action === 'refresh') {
            // Trigger new analysis
            ws.publish('bundle-updates', JSON.stringify({
              type: 'refresh-requested',
              timestamp: Date.now()
            }));
          }
        }
      }
    });
    
    console.log('📦 Bundle Analyzer Server running on http://localhost:8777');
    console.log('📊 Bundle Matrix: http://localhost:8777/bundle');
    console.log('🔗 Dependency Graph: http://localhost:8777/bundle-graph');
    console.log('📥 Metafile Download: http://localhost:8777/metafile.json');
  }
  
  private static renderDependencyGraph(): string {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>🔗 DuoPlus Dependency Graph</title>
  <script src="https://cdn.jsdelivr.net/npm/vis-network@9.1.9/dist/vis-network.min.js"></script>
  <link href="https://cdn.jsdelivr.net/npm/vis-network@9.1.9/dist/vis-network.min.css" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background: #3b82f6; color: white; }
    #network { width: 100vw; height: 100vh; }
    .controls { position: fixed; top: 20px; left: 20px; z-index: 1000; }
    button { margin: 5px; padding: 10px; background: #3b82f6; border: none; border-radius: 6px; color: white; cursor: pointer; }
  </style>
</head>
<body>
  <div class="controls">
    <button onclick="refreshGraph()">🔄 Refresh</button>
    <button onclick="exportGraph()">📥 Export</button>
    <button onclick="togglePhysics()">⚛️ Physics</button>
  </div>
  <div id="network"></div>
  
  <script>
    let network;
    let nodes = new vis.DataSet([]);
    let edges = new vis.DataSet([]);
    
    function initGraph() {
      const container = document.getElementById('network');
      const data = { nodes, edges };
      const options = {
        nodes: {
          shape: 'dot',
          size: 20,
          font: { size: 12, color: '#fff' },
          borderWidth: 2,
          shadow: true
        },
        edges: {
          width: 1,
          color: '#666',
          arrows: 'to',
          smooth: { type: 'continuous' }
        },
        physics: {
          enabled: true,
          solver: 'forceAtlas2Based',
          forceAtlas2Based: {
            gravitationalConstant: -50,
            centralGravity: 0.01,
            springLength: 100,
            springConstant: 0.08,
            damping: 0.4
          }
        },
        interaction: {
          navigationButtons: true,
          keyboard: true
        }
      };
      
      network = new vis.Network(container, data, options);
      
      // Load data
      loadGraphData();
    }
    
    async function loadGraphData() {
      const response = await fetch('/api/bundle/analyze');
      const matrix = await response.json();
      
      // Clear existing data
      nodes.clear();
      edges.clear();
      
      // Add nodes
      Object.entries(matrix.inputs).forEach(([path, node]) => {
        const tension = node.tension;
        const color = {
          background: node.hex,
          border: '#fff',
          highlight: { background: node.hex, border: '#fff' }
        };
        
        nodes.add({
          id: node.id,
          label: path.split('/').pop(),
          title: \`\${path}\\nTension: \${tension}%\\nSize: \${formatBytes(node.bytes)}\`,
          color,
          value: node.bytes,
          shape: node.circular ? 'star' : 'dot',
          borderWidth: node.circular ? 3 : 2
        });
      });
      
      // Add edges
      Object.entries(matrix.inputs).forEach(([path, node]) => {
        node.imports.forEach(imp => {
          if (!imp.external && matrix.inputs[imp.path]) {
            edges.add({
              from: node.id,
              to: matrix.inputs[imp.path].id,
              label: imp.kind,
              color: imp.kind === 'dynamic-import' ? '#3b82f6' : '#666'
            });
          }
        });
      });
    }
    
    function formatBytes(bytes) {
      const units = ['B', 'KB', 'MB', 'GB'];
      let size = bytes;
      let unitIndex = 0;
      while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
      }
      return \`\${size.toFixed(2)} \${units[unitIndex]}\`;
    }
    
    function refreshGraph() {
      loadGraphData();
    }
    
    function exportGraph() {
      const data = network.getPositions();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'dependency-graph.json';
      a.click();
    }
    
    function togglePhysics() {
      const options = network.getOptions();
      options.physics.enabled = !options.physics.enabled;
      network.setOptions(options);
    }
    
    // Initialize
    window.onload = initGraph;
    
    // Auto-refresh every 60 seconds
    setInterval(refreshGraph, 60000);
  </script>
</body>
</html>
    `;
  }
}
