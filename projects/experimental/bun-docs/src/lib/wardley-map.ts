/**
 * Wardley Map Generator for Bun Documentation
 * 
 * Generates a beautiful, interactive Wardley Map visualization
 * of the Bun ecosystem using Cytoscape.js.
 */

import { join } from "node:path";
import { mkdirSync } from "node:fs";

export interface WardleyComponent {
  id: string;
  name: string;
  evolution: number; // 0 (Genesis) to 1 (Commodity)
  visibility: number; // 0 (invisible) to 1 (highly visible to user)
  category?: string;
  description?: string;
}

export interface WardleyLink {
  source: string;
  target: string;
  label?: string;
}

export const BUN_WARDLEY_MAP: {
  components: WardleyComponent[];
  links: WardleyLink[];
} = {
  components: [
    // User Needs (high visibility)
    { id: "web-app", name: "Build Web Apps", evolution: 0.85, visibility: 0.95, category: "Need", description: "Full-stack web applications" },
    { id: "cli-tool", name: "Build CLI Tools", evolution: 0.9, visibility: 0.85, category: "Need" },
    { id: "api-server", name: "High-perf API Server", evolution: 0.88, visibility: 0.9, category: "Need" },
    { id: "ai-workload", name: "AI / LLM Workloads", evolution: 0.4, visibility: 0.7, category: "Need" },

    // Capabilities
    { id: "runtime", name: "JavaScript Runtime", evolution: 0.75, visibility: 0.92, category: "Capability", description: "Fast JS/TS execution" },
    { id: "bundler", name: "Bundler", evolution: 0.82, visibility: 0.88, category: "Capability" },
    { id: "test-runner", name: "Test Runner", evolution: 0.78, visibility: 0.85, category: "Capability" },
    { id: "package-manager", name: "Package Manager", evolution: 0.8, visibility: 0.87, category: "Capability" },
    { id: "http-server", name: "HTTP + WebSocket Server", evolution: 0.85, visibility: 0.8, category: "Capability" },

    // Lower level components
    { id: "zig-core", name: "Zig Core", evolution: 0.35, visibility: 0.2, category: "Component", description: "Written in Zig for performance" },
    { id: "javascriptcore", name: "JavaScriptCore", evolution: 0.92, visibility: 0.15, category: "Component" },
    { id: "esbuild-fork", name: "esbuild Fork", evolution: 0.65, visibility: 0.25, category: "Component" },
    { id: "sqlite", name: "SQLite (bun:sqlite)", evolution: 0.95, visibility: 0.55, category: "Component" },
    { id: "napi", name: "Native Addons (N-API)", evolution: 0.88, visibility: 0.45, category: "Component" },
    { id: "typescript", name: "TypeScript Support", evolution: 0.82, visibility: 0.78, category: "Component" },
    { id: "jsx-tsx", name: "JSX / TSX", evolution: 0.85, visibility: 0.72, category: "Component" },
    { id: "shell", name: "Bun Shell ($``)", evolution: 0.55, visibility: 0.6, category: "Component" },
  ],
  links: [
    { source: "web-app", target: "bundler" },
    { source: "web-app", target: "runtime" },
    { source: "api-server", target: "http-server" },
    { source: "api-server", target: "runtime" },
    { source: "cli-tool", target: "runtime" },
    { source: "cli-tool", target: "package-manager" },
    { source: "runtime", target: "zig-core" },
    { source: "runtime", target: "javascriptcore" },
    { source: "bundler", target: "esbuild-fork" },
    { source: "test-runner", target: "runtime" },
    { source: "package-manager", target: "runtime" },
    { source: "http-server", target: "runtime" },
    { source: "typescript", target: "runtime" },
    { source: "jsx-tsx", target: "bundler" },
    { source: "sqlite", target: "runtime" },
    { source: "napi", target: "runtime" },
    { source: "shell", target: "runtime" },
    { source: "ai-workload", target: "runtime" },
  ]
};

export async function generateCytoscapeView(outputDir = "dist"): Promise<string> {
  const OUT_DIR = join(process.cwd(), outputDir);
  mkdirSync(OUT_DIR, { recursive: true });

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bun • Wardley Map</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/cytoscape/3.28.1/cytoscape.min.js"></script>
  <style>
    body { font-family: Inter, system-ui, sans-serif; }
    #cy { 
      width: 100%; 
      height: 100%; 
      background: #0f1117; 
    }
    .wardley-label {
      font-size: 11px;
      font-weight: 500;
    }
  </style>
</head>
<body class="bg-[#0f1117] text-slate-200">
  <div class="flex h-screen flex-col">
    <!-- Header -->
    <div class="border-b border-slate-800 px-6 py-4 flex items-center justify-between">
      <div class="flex items-center gap-x-3">
        <div class="w-9 h-9 bg-yellow-500 rounded-2xl flex items-center justify-center">
          <span class="text-black font-bold text-xl">B</span>
        </div>
        <div>
          <h1 class="text-2xl font-semibold tracking-tight">Bun Wardley Map</h1>
          <p class="text-xs text-slate-400">Strategic view of the Bun ecosystem</p>
        </div>
      </div>
      
      <div class="flex items-center gap-x-4 text-sm">
        <div class="flex items-center gap-x-2">
          <div class="w-3 h-3 bg-emerald-400 rounded"></div>
          <span class="text-xs">Genesis</span>
        </div>
        <div class="flex items-center gap-x-2">
          <div class="w-3 h-3 bg-blue-400 rounded"></div>
          <span class="text-xs">Custom</span>
        </div>
        <div class="flex items-center gap-x-2">
          <div class="w-3 h-3 bg-violet-400 rounded"></div>
          <span class="text-xs">Product</span>
        </div>
        <div class="flex items-center gap-x-2">
          <div class="w-3 h-3 bg-orange-400 rounded"></div>
          <span class="text-xs">Commodity</span>
        </div>
      </div>

      <button onclick="resetView()" 
              class="px-4 py-2 text-xs bg-slate-800 hover:bg-slate-700 rounded-xl border border-slate-700 transition-colors">
        Reset View
      </button>
    </div>

    <div class="flex flex-1 overflow-hidden">
      <!-- Cytoscape Container -->
      <div class="flex-1 relative">
        <div id="cy"></div>
        
        <!-- Evolution Axis Labels -->
        <div class="absolute bottom-4 left-0 right-0 flex justify-between px-12 text-[10px] text-slate-500 pointer-events-none">
          <div>Genesis</div>
          <div>Custom Built</div>
          <div>Product</div>
          <div>Commodity</div>
        </div>
      </div>

      <!-- Bun Native Utils Lab -->
      <div class="border-t border-slate-800 bg-[#0a0c12] p-4">
        <div class="max-w-[1480px] mx-auto">
          <div class="flex items-center justify-between mb-3">
            <div>
              <h3 class="font-semibold text-yellow-400 flex items-center gap-x-2">
                <i class="fa-solid fa-terminal"></i> 
                Bun Native Utils Lab
              </h3>
              <p class="text-xs text-slate-400">Live demonstrations of Bun runtime APIs using the Wardley Map data</p>
            </div>
            <div class="text-xs px-3 py-1 bg-slate-800 rounded-full border border-slate-700">Requires <code>bun run generate --serve</code></div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
            <button onclick="runBunUtil('inspect')" 
                    class="text-xs px-3 py-2 bg-[#161b24] hover:bg-[#1f2533] border border-slate-700 rounded-xl text-left transition-colors">
              <div class="font-medium">Bun.inspect()</div>
              <div class="text-[10px] text-slate-400">Pretty print node data</div>
            </button>

            <button onclick="runBunUtil('table')" 
                    class="text-xs px-3 py-2 bg-[#161b24] hover:bg-[#1f2533] border border-slate-700 rounded-xl text-left transition-colors">
              <div class="font-medium">Bun.inspect.table()</div>
              <div class="text-[10px] text-slate-400">Export as ASCII table</div>
            </button>

            <button onclick="runBunUtil('deep-equals')" 
                    class="text-xs px-3 py-2 bg-[#161b24] hover:bg-[#1f2533] border border-slate-700 rounded-xl text-left transition-colors">
              <div class="font-medium">Bun.deepEquals()</div>
              <div class="text-[10px] text-slate-400">Fast deep comparison</div>
            </button>

            <button onclick="runBunUtil('timing')" 
                    class="text-xs px-3 py-2 bg-[#161b24] hover:bg-[#1f2533] border border-slate-700 rounded-xl text-left transition-colors">
              <div class="font-medium">Bun.nanoseconds()</div>
              <div class="text-[10px] text-slate-400">High-res performance timing</div>
            </button>

            <button onclick="runBunUtil('gzip')" 
                    class="text-xs px-3 py-2 bg-[#161b24] hover:bg-[#1f2533] border border-slate-700 rounded-xl text-left transition-colors">
              <div class="font-medium">Bun.gzipSync()</div>
              <div class="text-[10px] text-slate-400">Native gzip compression</div>
            </button>

            <button onclick="runBunUtil('uuid')" 
                    class="text-xs px-3 py-2 bg-[#161b24] hover:bg-[#1f2533] border border-slate-700 rounded-xl text-left transition-colors">
              <div class="font-medium">Bun.randomUUIDv7()</div>
              <div class="text-[10px] text-slate-400">Time-sortable UUIDs</div>
            </button>

            <button onclick="runBunUtil('string-width')" 
                    class="text-xs px-3 py-2 bg-[#161b24] hover:bg-[#1f2533] border border-slate-700 rounded-xl text-left transition-colors">
              <div class="font-medium">Bun.stringWidth()</div>
              <div class="text-[10px] text-slate-400">Terminal-aligned labels</div>
            </button>

            <button onclick="runBunUtil('sleep')" 
                    class="text-xs px-3 py-2 bg-[#161b24] hover:bg-[#1f2533] border border-slate-700 rounded-xl text-left transition-colors">
              <div class="font-medium">Bun.sleep()</div>
              <div class="text-[10px] text-slate-400">Non-blocking staggered load</div>
            </button>

            <button onclick="runBunUtil('peek')" 
                    class="text-xs px-3 py-2 bg-[#161b24] hover:bg-[#1f2533] border border-slate-700 rounded-xl text-left transition-colors">
              <div class="font-medium">Bun.peek()</div>
              <div class="text-[10px] text-slate-400">Inspect promise without microtask</div>
            </button>

            <button onclick="runBunUtil('resolve-sync')" 
                    class="text-xs px-3 py-2 bg-[#161b24] hover:bg-[#1f2533] border border-slate-700 rounded-xl text-left transition-colors">
              <div class="font-medium">Bun.resolveSync()</div>
              <div class="text-[10px] text-slate-400">Sync module path resolution</div>
            </button>
          </div>

          <div id="bun-utils-result" class="mt-3 hidden">
            <div class="text-xs font-medium text-slate-400 mb-1">Result:</div>
            <pre class="text-[10px] bg-[#0f1117] p-3 rounded-xl border border-slate-700 overflow-auto max-h-[180px] text-emerald-300 font-mono"></pre>
          </div>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="w-80 border-l border-slate-800 p-4 overflow-auto text-sm bg-[#0a0c12]">
        <div class="mb-4">
          <h3 class="font-semibold text-yellow-400 mb-2">How to read this map</h3>
          <ul class="text-xs text-slate-400 space-y-1.5">
            <li>• <strong>Y-axis</strong> = User visibility / value</li>
            <li>• <strong>X-axis</strong> = Evolution (left = new, right = mature)</li>
            <li>• Lines = dependencies / value flow</li>
          </ul>
        </div>

        <div class="mb-4">
          <h3 class="font-semibold text-yellow-400 mb-2 text-sm">Key Insights</h3>
          <div class="text-xs text-slate-400 space-y-2">
            <p>Bun is rapidly moving many components (bundler, test runner, package manager) toward the right side of the map.</p>
            <p>The Zig core and JavaScriptCore remain foundational and relatively stable.</p>
            <p>AI/LLM workloads are still early (left side) — a major growth area.</p>
          </div>
        </div>

        <div>
          <h3 class="font-semibold text-yellow-400 mb-2 text-sm">Selected Node</h3>
          <div id="node-info" class="text-xs text-slate-400 bg-[#111318] p-3 rounded-xl border border-slate-800 min-h-[80px]">
            Click a node to see details...
          </div>
        </div>
      </div>
    </div>
  </div>

  <script>
    const components = ${JSON.stringify(BUN_WARDLEY_MAP.components)};
    const links = ${JSON.stringify(BUN_WARDLEY_MAP.links)};

    function getEvolutionColor(evolution) {
      if (evolution < 0.25) return '#34d399'; // Genesis - green
      if (evolution < 0.5)  return '#60a5fa'; // Custom - blue
      if (evolution < 0.75) return '#a78bfa'; // Product - violet
      return '#fb923c'; // Commodity - orange
    }

    const cy = cytoscape({
      container: document.getElementById('cy'),
      elements: [
        ...components.map(c => ({
          data: { 
            id: c.id, 
            name: c.name, 
            evolution: c.evolution,
            visibility: c.visibility,
            category: c.category,
            description: c.description || ''
          },
          position: {
            x: c.evolution * 900 + 80,
            y: (1 - c.visibility) * 520 + 60
          }
        })),
        ...links.map(l => ({
          data: { 
            id: l.source + '-' + l.target, 
            source: l.source, 
            target: l.target 
          }
        }))
      ],
      style: [
        {
          selector: 'node',
          style: {
            'background-color': (ele) => getEvolutionColor(ele.data('evolution')),
            'label': 'data(name)',
            'color': '#e2e8f0',
            'font-size': '11px',
            'font-weight': 500,
            'text-valign': 'center',
            'text-halign': 'center',
            'width': 38,
            'height': 38,
            'border-width': 2,
            'border-color': '#1f2937'
          }
        },
        {
          selector: 'edge',
          style: {
            'width': 1.5,
            'line-color': '#334155',
            'target-arrow-color': '#475569',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'opacity': 0.6
          }
        }
      ],
      layout: { name: 'preset' },
      wheelSensitivity: 0.15
    });

    // Node click handler
    cy.on('tap', 'node', function(evt) {
      const node = evt.target;
      const data = node.data();
      
      document.getElementById('node-info').innerHTML = \`
        <div class="font-medium text-white mb-1">\${data.name}</div>
        <div class="text-[10px] text-slate-400 mb-2">\${data.category || 'Component'}</div>
        <div class="text-[10px]">\${data.description || 'No description available.'}</div>
        <div class="mt-2 text-[10px] flex gap-2">
          <span class="px-2 py-0.5 bg-slate-800 rounded">Evolution: \${(data.evolution * 100).toFixed(0)}%</span>
        </div>
      \`;
    });

    // Background click clears selection
    cy.on('tap', function(evt) {
      if (evt.target === cy) {
        document.getElementById('node-info').innerHTML = 'Click a node to see details...';
      }
    });

    window.resetView = function() {
      cy.fit();
      cy.center();
    };

    // Initial fit
    setTimeout(() => {
      cy.fit();
      cy.center();
    }, 300);

    // === Bun Native Utils Lab ===
    window.runBunUtil = async function(action) {
      const resultBox = document.getElementById('bun-utils-result');
      const pre = resultBox.querySelector('pre');
      
      resultBox.classList.remove('hidden');
      pre.textContent = 'Calling Bun runtime...';

      try {
        const endpoint = '/api/bun-utils/' + action;
        let body = {};

        if (action === 'inspect') {
          body = { nodeId: 'runtime' };
        }

        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });

        const text = await res.text();
        pre.textContent = text;
      } catch (err) {
        pre.textContent = 'Error: ' + err.message + '\\n\\nMake sure you are running with bun run generate --serve';
      }
    };
  </script>
</body>
</html>`;

  const outputPath = join(OUT_DIR, "wardley.html");
  await Bun.write(outputPath, html);

  return outputPath;
}
