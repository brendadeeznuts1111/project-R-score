#!/usr/bin/env bun

/**
 * 🌐 Enterprise Dashboard Server
 *
 * Interactive web-based dashboard for exploring Bun functionality
 */

import { DashboardModule, DashboardSection, DashboardModuleConfig } from './architecture.ts';

// Dashboard data with all integrated topics
export const DASHBOARD_MODULES: DashboardModuleConfig[] = [
  {
    module: DashboardModule.CORE_RUNTIME,
    title: 'Core Runtime',
    description: 'Core runtime features including watch mode, debugging, and configuration',
    icon: '⚙️',
    color: '#4299e1',
    sections: [
      {
        id: 'bun-runtime',
        title: 'Bun Runtime',
        description: 'Core runtime environment and execution model',
        category: DashboardModule.CORE_RUNTIME,
        documentation: {
          technical: 'https://bun.sh/docs/runtime',
          reference: 'https://bun.com/reference/runtime',
          guides: 'https://bun.com/guides/understanding-runtime',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/runtime',
          github: 'https://github.com/oven-sh/bun/tree/main/packages/bun-runtime'
        },
        endpoints: ['/api/runtime/info', '/api/runtime/metrics', '/api/runtime/config'],
        relatedSections: ['watch-mode', 'debugging', 'bunfig'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'watch-mode',
        title: 'Watch Mode',
        description: 'File system watcher for development',
        category: DashboardModule.CORE_RUNTIME,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/watch-mode',
          reference: 'https://bun.com/reference/cli/watch',
          guides: 'https://bun.com/guides/hot-reload',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/watch-mode'
        },
        endpoints: ['/api/watch/start', '/api/watch/stop', '/api/watch/list'],
        relatedSections: ['bun-runtime', 'debugging'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-10')
      },
      {
        id: 'debugging',
        title: 'Debugging',
        description: 'Debugging tools and inspector integration',
        category: DashboardModule.CORE_RUNTIME,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/debugging',
          reference: 'https://bun.com/reference/debugging',
          guides: 'https://bun.com/guides/debugging-bun',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/debugging'
        },
        endpoints: ['/api/debug/start', '/api/debug/inspect', '/api/debug/trace'],
        relatedSections: ['bun-runtime', 'watch-mode'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-12')
      },
      {
        id: 'bunfig',
        title: 'bunfig.toml',
        description: 'Configuration file for Bun projects',
        category: DashboardModule.CORE_RUNTIME,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/bunfig',
          reference: 'https://bun.com/reference/configuration',
          guides: 'https://bun.com/guides/configuration',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/bunfig'
        },
        endpoints: ['/api/config/load', '/api/config/validate', '/api/config/generate'],
        relatedSections: ['bun-runtime', 'file-system'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-08')
      }
    ]
  },
  {
    module: DashboardModule.FILE_SYSTEM,
    title: 'File & Module System',
    description: 'File handling, module resolution, and plugins',
    icon: '📁',
    color: '#48bb78',
    sections: [
      {
        id: 'file-types',
        title: 'File Types',
        description: 'Supported file types and extensions',
        category: DashboardModule.FILE_SYSTEM,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/file-types',
          reference: 'https://bun.com/reference/file-system',
          guides: 'https://bun.com/guides/file-handling',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/file-types'
        },
        endpoints: ['/api/files/types', '/api/files/validate', '/api/files/convert'],
        relatedSections: ['module-resolution', 'plugins'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-14')
      },
      {
        id: 'module-resolution',
        title: 'Module Resolution',
        description: 'ES modules, CommonJS, and custom resolution',
        category: DashboardModule.FILE_SYSTEM,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/modules',
          reference: 'https://bun.com/reference/modules',
          guides: 'https://bun.com/guides/module-system',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/modules'
        },
        endpoints: ['/api/modules/resolve', '/api/modules/cache', '/api/modules/analyze'],
        relatedSections: ['file-types', 'jsx', 'auto-install'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-13')
      },
      {
        id: 'jsx',
        title: 'JSX',
        description: 'JSX/TSX transformation and pragma configuration',
        category: DashboardModule.FILE_SYSTEM,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/jsx',
          reference: 'https://bun.com/reference/jsx',
          guides: 'https://bun.com/guides/jsx-react',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/jsx'
        },
        endpoints: ['/api/jsx/transform', '/api/jsx/configure', '/api/jsx/analyze'],
        relatedSections: ['module-resolution', 'plugins'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-11')
      },
      {
        id: 'auto-install',
        title: 'Auto-install',
        description: 'Automatic dependency installation',
        category: DashboardModule.FILE_SYSTEM,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/auto-install',
          reference: 'https://bun.com/reference/auto-install',
          guides: 'https://bun.com/guides/dependency-management',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/auto-install'
        },
        endpoints: ['/api/deps/install', '/api/deps/check', '/api/deps/update'],
        relatedSections: ['module-resolution', 'plugins'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-09')
      },
      {
        id: 'plugins',
        title: 'Plugins',
        description: 'Plugin system for extending Bun functionality',
        category: DashboardModule.FILE_SYSTEM,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/plugins',
          reference: 'https://bun.com/reference/plugins',
          guides: 'https://bun.com/guides/creating-plugins',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/plugins'
        },
        endpoints: ['/api/plugins/load', '/api/plugins/register', '/api/plugins/list'],
        relatedSections: ['file-types', 'module-resolution'],
        status: 'beta',
        version: '0.9.0',
        lastUpdated: new Date('2024-01-07')
      }
    ]
  },
  {
    module: DashboardModule.HTTP_SERVER,
    title: 'HTTP Server',
    description: 'High-performance HTTP server with routing and middleware',
    icon: '🌐',
    color: '#ed8936',
    sections: [
      {
        id: 'http-server-core',
        title: 'Server',
        description: 'HTTP server creation and configuration',
        category: DashboardModule.HTTP_SERVER,
        documentation: {
          technical: 'https://bun.sh/docs/api/http',
          reference: 'https://bun.com/reference/api/http',
          guides: 'https://bun.com/guides/http-server',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/http-server'
        },
        endpoints: ['/api/server/create', '/api/server/start', '/api/server/stop'],
        relatedSections: ['routing', 'cookies', 'tls'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'routing',
        title: 'Routing',
        description: 'URL routing and parameter handling',
        category: DashboardModule.HTTP_SERVER,
        documentation: {
          technical: 'https://bun.sh/docs/api/serve#routing',
          reference: 'https://bun.com/reference/routing',
          guides: 'https://bun.com/guides/routing',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/routing'
        },
        endpoints: ['/api/routes/list', '/api/routes/match', '/api/routes/add'],
        relatedSections: ['http-server-core', 'file-system-router'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-14')
      }
    ]
  },
  {
    module: DashboardModule.NETWORKING,
    title: 'Networking',
    description: 'Network protocols and communication',
    icon: '📡',
    color: '#9f7aea',
    sections: [
      {
        id: 'fetch',
        title: 'Fetch',
        description: 'HTTP client with extensions for Bun',
        category: DashboardModule.NETWORKING,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/networking/fetch',
          reference: 'https://bun.com/reference/api/fetch',
          guides: 'https://bun.com/guides/making-http-requests',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/fetch'
        },
        endpoints: ['/api/fetch/request', '/api/fetch/batch', '/api/fetch/mock'],
        relatedSections: ['websockets', 'dns'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'websockets',
        title: 'WebSockets',
        description: 'WebSocket client and server implementation',
        category: DashboardModule.NETWORKING,
        documentation: {
          technical: 'https://bun.sh/docs/api/websocket',
          reference: 'https://bun.com/reference/api/websocket',
          guides: 'https://bun.com/guides/websockets',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/websockets'
        },
        endpoints: ['/api/websocket/connect', '/api/websocket/broadcast', '/api/websocket/rooms'],
        relatedSections: ['fetch', 'tcp'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-14')
      }
    ]
  },
  {
    module: DashboardModule.DATA_STORAGE,
    title: 'Data & Storage',
    description: 'Data handling, storage, and databases',
    icon: '💾',
    color: '#ed64a6',
    sections: [
      {
        id: 'file-io',
        title: 'File I/O',
        description: 'File system operations and streams',
        category: DashboardModule.DATA_STORAGE,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/filesystem',
          reference: 'https://bun.com/reference/file-io',
          guides: 'https://bun.com/guides/file-operations',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/file-io'
        },
        endpoints: ['/api/files/read', '/api/files/write', '/api/files/stream'],
        relatedSections: ['streams', 'binary-data'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'binary-data',
        title: 'Binary Data',
        description: 'Typed arrays, buffers, and binary operations',
        category: DashboardModule.DATA_STORAGE,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/binary-data',
          reference: 'https://bun.com/reference/binary-data',
          guides: 'https://bun.com/guides/working-with-binary-data',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/binary-data'
        },
        endpoints: ['/api/binary/encode', '/api/binary/decode', '/api/binary/transform'],
        relatedSections: ['file-io', 'streams', 'archive'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-13')
      },
      {
        id: 'sql',
        title: 'SQL',
        description: 'SQL database queries and ORM',
        category: DashboardModule.DATA_STORAGE,
        documentation: {
          technical: 'https://bun.sh/docs/api/sql',
          reference: 'https://bun.com/reference/api/sql',
          guides: 'https://bun.com/guides/sql-databases',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/sql'
        },
        endpoints: ['/api/sql/query', '/api/sql/transaction', '/api/sql/migrate'],
        relatedSections: ['sqlite', 's3'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-11')
      }
    ]
  },
  {
    module: DashboardModule.CONCURRENCY,
    title: 'Concurrency',
    description: 'Parallel execution and worker threads',
    icon: '⚡',
    color: '#f6ad55',
    sections: [
      {
        id: 'workers',
        title: 'Workers',
        description: 'Web Workers for parallel processing',
        category: DashboardModule.CONCURRENCY,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/workers',
          reference: 'https://bun.com/reference/api/workers',
          guides: 'https://bun.com/guides/parallel-processing',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/workers'
        },
        endpoints: ['/api/workers/create', '/api/workers/pool', '/api/workers/terminate'],
        relatedSections: ['process-system', 'utilities'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-15')
      }
    ]
  },
  {
    module: DashboardModule.PROCESS_SYSTEM,
    title: 'Process & System',
    description: 'Process management and system integration',
    icon: '🖥️',
    color: '#4fd1c7',
    sections: [
      {
        id: 'environment-variables',
        title: 'Environment Variables',
        description: 'Environment variable management and validation',
        category: DashboardModule.PROCESS_SYSTEM,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/environment',
          reference: 'https://bun.com/reference/environment',
          guides: 'https://bun.com/guides/environment-variables',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/environment'
        },
        endpoints: ['/api/env/get', '/api/env/set', '/api/env/validate'],
        relatedSections: ['shell', 'spawn'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-14')
      },
      {
        id: 'shell',
        title: 'Shell',
        description: 'Shell command execution and integration',
        category: DashboardModule.PROCESS_SYSTEM,
        documentation: {
          technical: 'https://bun.sh/docs/api/shell',
          reference: 'https://bun.com/reference/api/shell',
          guides: 'https://bun.com/guides/shell-integration',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/shell'
        },
        endpoints: ['/api/shell/execute', '/api/shell/pipe', '/api/shell/escape'],
        relatedSections: ['spawn', 'environment-variables'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-13')
      }
    ]
  },
  {
    module: DashboardModule.UTILITIES,
    title: 'Utilities',
    description: 'Helper functions and utilities',
    icon: '🧰',
    color: '#a0aec0',
    sections: [
      {
        id: 'secrets',
        title: 'Secrets',
        description: 'Secret management and encryption',
        category: DashboardModule.UTILITIES,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/secrets',
          reference: 'https://bun.com/reference/secrets',
          guides: 'https://bun.com/guides/secrets-management',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/secrets'
        },
        endpoints: ['/api/secrets/encrypt', '/api/secrets/decrypt', '/api/secrets/rotate'],
        relatedSections: ['hashing', 'cookies'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-15')
      },
      {
        id: 'yaml',
        title: 'YAML',
        description: 'YAML parsing and serialization',
        category: DashboardModule.UTILITIES,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/yaml',
          reference: 'https://bun.com/reference/yaml',
          guides: 'https://bun.com/guides/yaml-configuration',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/yaml'
        },
        endpoints: ['/api/yaml/parse', '/api/yaml/stringify', '/api/yaml/validate'],
        relatedSections: ['json5', 'jsonl'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-13')
      },
      {
        id: 'hashing',
        title: 'Hashing',
        description: 'Cryptographic hash functions',
        category: DashboardModule.UTILITIES,
        documentation: {
          technical: 'https://bun.sh/docs/runtime/hashing',
          reference: 'https://bun.com/reference/hashing',
          guides: 'https://bun.com/guides/cryptographic-hashing',
          examples: 'https://github.com/oven-sh/bun/tree/main/examples/hashing'
        },
        endpoints: ['/api/hash/compute', '/api/hash/verify', '/api/hash/stream'],
        relatedSections: ['secrets', 'binary-data'],
        status: 'stable',
        version: '1.0.0',
        lastUpdated: new Date('2024-01-08')
      }
    ]
  }
];

// Server implementation
class DashboardServer {
  private port: number;

  constructor(port: number = 8080) {
    this.port = port;
  }

  async start(): Promise<void> {
    console.log(`🚀 Starting Bun Enterprise Dashboard on http://localhost:${this.port}`);

    const server = Bun.serve({
      port: this.port,
      async fetch(req) {
        const url = new URL(req.url);

        if (url.pathname === '/') {
          return this.serveDashboard();
        }

        if (url.pathname === '/api/dashboard/modules') {
          return this.getModules();
        }

        if (url.pathname === '/api/dashboard/sections') {
          return this.getSections(url.searchParams.get('module'));
        }

        if (url.pathname.startsWith('/api/dashboard/section/')) {
          const sectionId = url.pathname.split('/').pop();
          return this.getSection(sectionId!);
        }

        if (url.pathname === '/api/dashboard/search') {
          const query = url.searchParams.get('q');
          return this.searchSections(query);
        }

        if (url.pathname === '/api/dashboard/metrics') {
          return this.getMetrics();
        }

        return new Response('Not Found', { status: 404 });
      }.bind(this)
    });

    console.log(`Server running at ${server.url}`);
    console.log('Press Ctrl+C to stop');
  }

  private serveDashboard(): Response {
    const html = this.generateDashboardHTML();
    return new Response(html, {
      headers: { 'Content-Type': 'text/html' }
    });
  }

  private getModules(): Response {
    const modules = DASHBOARD_MODULES.map(module => ({
      id: module.module,
      title: module.title,
      description: module.description,
      icon: module.icon,
      color: module.color,
      sectionCount: module.sections.length,
      metrics: {
        endpointCount: module.sections.reduce((acc, s) => acc + s.endpoints.length, 0),
        stableCount: module.sections.filter(s => s.status === 'stable').length,
        lastUpdated: new Date(Math.max(...module.sections.map(s => s.lastUpdated.getTime())))
      }
    }));

    return new Response(JSON.stringify(modules, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private getSections(moduleId?: string): Response {
    let sections: DashboardSection[] = [];

    if (moduleId) {
      const module = DASHBOARD_MODULES.find(m => m.module === moduleId);
      if (module) {
        sections = module.sections;
      }
    } else {
      sections = DASHBOARD_MODULES.flatMap(m => m.sections);
    }

    return new Response(JSON.stringify(sections, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private getSection(sectionId: string): Response {
    for (const module of DASHBOARD_MODULES) {
      const section = module.sections.find(s => s.id === sectionId);
      if (section) {
        return new Response(JSON.stringify({
          ...section,
          module: {
            id: module.module,
            title: module.title,
            color: module.color
          },
          related: section.relatedSections.map(relatedId => {
            for (const m of DASHBOARD_MODULES) {
              const s = m.sections.find(s => s.id === relatedId);
              if (s) return { id: s.id, title: s.title, module: m.module };
            }
            return null;
          }).filter(Boolean)
        }, null, 2), {
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    return new Response(JSON.stringify({ error: 'Section not found' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private searchSections(query?: string): Response {
    if (!query) {
      return new Response(JSON.stringify([]), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const results = [];
    const queryLower = query.toLowerCase();

    for (const module of DASHBOARD_MODULES) {
      for (const section of module.sections) {
        if (section.title.toLowerCase().includes(queryLower) ||
            section.description.toLowerCase().includes(queryLower) ||
            section.id.toLowerCase().includes(queryLower)) {
          results.push({
            ...section,
            module: {
              id: module.module,
              title: module.title,
              icon: module.icon
            }
          });
        }
      }
    }

    return new Response(JSON.stringify(results, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private getMetrics(): Response {
    const totalSections = DASHBOARD_MODULES.reduce((acc, m) => acc + m.sections.length, 0);
    const totalEndpoints = DASHBOARD_MODULES.reduce((acc, m) =>
      acc + m.sections.reduce((sAcc, s) => sAcc + s.endpoints.length, 0), 0);

    const statusCounts = {
      stable: 0,
      beta: 0,
      experimental: 0,
      deprecated: 0
    };

    DASHBOARD_MODULES.forEach(module => {
      module.sections.forEach(section => {
        statusCounts[section.status]++;
      });
    });

    const recentUpdates = DASHBOARD_MODULES
      .flatMap(m => m.sections)
      .sort((a, b) => b.lastUpdated.getTime() - a.lastUpdated.getTime())
      .slice(0, 5)
      .map(s => ({
        id: s.id,
        title: s.title,
        lastUpdated: s.lastUpdated,
        status: s.status
      }));

    return new Response(JSON.stringify({
      summary: {
        modules: DASHBOARD_MODULES.length,
        sections: totalSections,
        endpoints: totalEndpoints,
        statusCounts
      },
      recentUpdates,
      modules: DASHBOARD_MODULES.map(m => ({
        id: m.module,
        title: m.title,
        sectionCount: m.sections.length,
        endpointCount: m.sections.reduce((acc, s) => acc + s.endpoints.length, 0)
      }))
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' }
    });
  }

  private generateDashboardHTML(): string {
    const modules = DASHBOARD_MODULES;

    return `<!DOCTYPE html>
<html>
<head>
  <title>Bun Enterprise Dashboard</title>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
  <style>
    .gradient-bg {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }
    .card-hover {
      transition: all 0.3s ease;
    }
    .card-hover:hover {
      transform: translateY(-4px);
      box-shadow: 0 20px 40px rgba(0,0,0,0.1);
    }
    .status-badge {
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 0.75rem;
      font-weight: bold;
    }
    .status-stable { background: #c6f6d5; color: #22543d; }
    .status-beta { background: #fed7d7; color: #742a2a; }
    .status-experimental { background: #feebc8; color: #744210; }
    .status-deprecated { background: #e2e8f0; color: #4a5568; }
  </style>
</head>
<body class="bg-gray-50">
  <!-- Navigation -->
  <nav class="gradient-bg text-white shadow-lg">
    <div class="container mx-auto px-4 py-4">
      <div class="flex justify-between items-center">
        <div class="flex items-center space-x-2">
          <i class="fas fa-bolt text-2xl"></i>
          <h1 class="text-2xl font-bold">Bun Enterprise Dashboard</h1>
        </div>
        <div class="flex items-center space-x-4">
          <a href="https://bun.sh" class="hover:underline" target="_blank">
            <i class="fas fa-external-link-alt"></i> Official Docs
          </a>
          <a href="https://github.com/oven-sh/bun" class="hover:underline" target="_blank">
            <i class="fab fa-github"></i> GitHub
          </a>
        </div>
      </div>
    </div>
  </nav>

  <!-- Main Content -->
  <main class="container mx-auto px-4 py-8">
    <!-- Stats -->
    <div class="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="bg-blue-100 p-3 rounded-lg">
            <i class="fas fa-cubes text-blue-600 text-2xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-gray-500">Modules</p>
            <p class="text-3xl font-bold">${modules.length}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="bg-green-100 p-3 rounded-lg">
            <i class="fas fa-layer-group text-green-600 text-2xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-gray-500">Sections</p>
            <p class="text-3xl font-bold">${modules.reduce((acc, m) => acc + m.sections.length, 0)}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="bg-purple-100 p-3 rounded-lg">
            <i class="fas fa-link text-purple-600 text-2xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-gray-500">Endpoints</p>
            <p class="text-3xl font-bold">${modules.reduce((acc, m) => acc + m.sections.reduce((sAcc, s) => sAcc + s.endpoints.length, 0), 0)}</p>
          </div>
        </div>
      </div>

      <div class="bg-white rounded-lg shadow p-6">
        <div class="flex items-center">
          <div class="bg-yellow-100 p-3 rounded-lg">
            <i class="fas fa-check-circle text-yellow-600 text-2xl"></i>
          </div>
          <div class="ml-4">
            <p class="text-gray-500">Stable</p>
            <p class="text-3xl font-bold">${modules.reduce((acc, m) => acc + m.sections.filter(s => s.status === 'stable').length, 0)}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Search -->
    <div class="mb-8">
      <div class="relative">
        <input type="text"
               placeholder="Search documentation, endpoints, or features..."
               class="w-full p-4 pl-12 rounded-lg shadow border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
               id="searchInput">
        <i class="fas fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
      </div>
    </div>

    <!-- Modules Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="modulesGrid">
      ${modules.map(module => `
        <div class="bg-white rounded-lg shadow card-hover" style="border-left: 4px solid ${module.color}">
          <div class="p-6">
            <div class="flex items-center justify-between mb-4">
              <div class="flex items-center space-x-3">
                <span class="text-2xl">${module.icon}</span>
                <h2 class="text-xl font-bold">${module.title}</h2>
              </div>
              <span class="bg-gray-100 text-gray-800 text-sm font-medium px-3 py-1 rounded">
                ${module.sections.length} sections
              </span>
            </div>
            <p class="text-gray-600 mb-4">${module.description}</p>

            <div class="space-y-3">
              ${module.sections.slice(0, 3).map(section => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <div>
                    <h3 class="font-medium">${section.title}</h3>
                    <span class="status-badge status-${section.status}">${section.status}</span>
                  </div>
                  <a href="#${section.id}"
                     class="text-blue-600 hover:text-blue-800 transition-colors">
                    <i class="fas fa-arrow-right"></i>
                  </a>
                </div>
              `).join('')}
            </div>

            ${module.sections.length > 3 ? `
              <div class="mt-4 text-center">
                <button class="text-blue-600 hover:text-blue-800 font-medium">
                  + ${module.sections.length - 3} more sections
                </button>
              </div>
            ` : ''}
          </div>
        </div>
      `).join('')}
    </div>

    <!-- Documentation Links -->
    <div class="mt-12 bg-white rounded-lg shadow p-6">
      <h2 class="text-2xl font-bold mb-4">📚 Documentation Resources</h2>
      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <a href="https://bun.sh/docs"
           target="_blank"
           class="p-4 border border-gray-200 rounded-lg hover:bg-blue-50 hover:border-blue-300 transition-colors">
          <div class="flex items-center space-x-3">
            <i class="fas fa-book text-blue-600"></i>
            <div>
              <h3 class="font-bold">Technical Docs</h3>
              <p class="text-sm text-gray-600">bun.sh/docs</p>
            </div>
          </div>
        </a>

        <a href="https://bun.com/reference"
           target="_blank"
           class="p-4 border border-gray-200 rounded-lg hover:bg-green-50 hover:border-green-300 transition-colors">
          <div class="flex items-center space-x-3">
            <i class="fas fa-search text-green-600"></i>
            <div>
              <h3 class="font-bold">API Reference</h3>
              <p class="text-sm text-gray-600">bun.com/reference</p>
            </div>
          </div>
        </a>

        <a href="https://bun.com/guides"
           target="_blank"
           class="p-4 border border-gray-200 rounded-lg hover:bg-purple-50 hover:border-purple-300 transition-colors">
          <div class="flex items-center space-x-3">
            <i class="fas fa-graduation-cap text-purple-600"></i>
            <div>
              <h3 class="font-bold">Guides & Tutorials</h3>
              <p class="text-sm text-gray-600">bun.com/guides</p>
            </div>
          </div>
        </a>
      </div>
    </div>
  </main>

  <!-- Script -->
  <script>
    document.getElementById('searchInput').addEventListener('input', function(e) {
      const query = e.target.value.toLowerCase();
      const modules = document.querySelectorAll('#modulesGrid > div');

      modules.forEach(module => {
        const text = module.textContent.toLowerCase();
        module.style.display = text.includes(query) ? 'block' : 'none';
      });
    });
  </script>
</body>
</html>`;
  }
}

// Start the server
const server = new DashboardServer();
server.start().catch(console.error);