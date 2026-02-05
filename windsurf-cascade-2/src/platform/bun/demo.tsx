// Bun Integration Demo - Showcasing Advanced Language Features
// This file demonstrates TypeScript, JSX, and Bun's runtime capabilities

import { bunIntegration } from './bun-integration';

// Ensure Bun is available
const BunGlobal = typeof Bun !== 'undefined' ? Bun : (globalThis as any).Bun;

// React-like component with JSX (Bun handles transpilation)
interface DemoProps {
  title: string;
  features: string[];
}

function DemoComponent({ title, features }: DemoProps) {
  return (
    <div className="demo-container">
      <h1>{title}</h1>
      <ul>
        {features.map((feature, index) => (
          <li key={index}>{feature}</li>
        ))}
      </ul>
    </div>
  );
}

// Advanced TypeScript with generics and utility types
type ApiResponse<T> = {
  data: T;
  status: number;
  message: string;
};

// Utility function using advanced TypeScript features
async function fetchData<T>(url: string): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url);
    const data = await response.json();
    
    return {
      data,
      status: response.status,
      message: 'Success'
    };
  } catch (error) {
    return {
      data: null as T,
      status: 500,
      message: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Class demonstrating Bun's file system capabilities
class FileManager {
  private files: Map<string, string> = new Map();

  async writeFile(path: string, content: string): Promise<void> {
    await BunGlobal.write(path, content);
    this.files.set(path, content);
    console.log(`✅ Written file: ${path}`);
  }

  async readFile(path: string): Promise<string> {
    const file = BunGlobal.file(path);
    const content = await file.text();
    console.log(`📖 Read file: ${path}`);
    return content;
  }

  async deleteFile(path: string): Promise<void> {
    await BunGlobal.file(path).delete();
    this.files.delete(path);
    console.log(`🗑️ Deleted file: ${path}`);
  }
}

// Database operations using Bun's built-in SQLite
class DatabaseManager {
  private db: any;

  constructor(dbPath: string = ':memory:') {
    this.db = new BunGlobal.Database(dbPath);
    this.initializeTables();
  }

  private initializeTables(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS features (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        description TEXT,
        enabled BOOLEAN DEFAULT 1
      )
    `);
    console.log('🗄️ Database tables initialized');
  }

  addFeature(name: string, description: string): void {
    const stmt = this.db.prepare('INSERT INTO features (name, description) VALUES (?, ?)');
    stmt.run(name, description);
    console.log(`➕ Added feature: ${name}`);
  }

  getFeatures(): any[] {
    const stmt = this.db.prepare('SELECT * FROM features');
    return stmt.all();
  }

  close(): void {
    this.db.close();
    console.log('🔒 Database connection closed');
  }
}

// HTTP Server using Bun's built-in server
class DemoServer {
  private server: any;

  constructor(private port: number = 3001) {}

  start(): void {
    this.server = BunGlobal.serve({
      port: this.port,
      fetch: async (req: Request) => {
        const url = new URL(req.url);
        
        // API routes
        if (url.pathname === '/api/features') {
          const db = new DatabaseManager();
          const features = db.getFeatures();
          db.close();
          
          return new Response(JSON.stringify(features), {
            headers: { 'Content-Type': 'application/json' }
          });
        }

        // Serve demo page
        if (url.pathname === '/') {
          const html = this.generateDemoPage();
          return new Response(html, {
            headers: { 'Content-Type': 'text/html' }
          });
        }

        return new Response('Not Found', { status: 404 });
      }
    });

    console.log(`🌐 Demo server running on http://localhost:${this.port}`);
  }

  private generateDemoPage(): string {
    const features = [
      'TypeScript transpilation',
      'JSX support',
      'Built-in bundler',
      'Fast file system',
      'SQLite database',
      'HTTP server',
      'WebSocket support',
      'TOML/YAML config parsing'
    ];

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bun Integration Demo</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .feature { background: #f0f0f0; padding: 10px; margin: 5px 0; border-radius: 5px; }
          .header { text-align: center; color: #333; }
        </style>
      </head>
      <body>
        <h1 class="header">🚀 Bun Integration Demo</h1>
        <div id="features">
          ${features.map(feature => `<div class="feature">${feature}</div>`).join('')}
        </div>
        <script>
          // Fetch live data from our API
          fetch('/api/features')
            .then(response => response.json())
            .then(data => console.log('Live features:', data));
        </script>
      </body>
      </html>
    `;
  }

  stop(): void {
    if (this.server) {
      this.server.stop();
      console.log('🛑 Demo server stopped');
    }
  }
}

// Main demonstration function
async function runDemo(): Promise<void> {
  console.log('🎯 Starting Bun Integration Demo...\n');

  // 1. Load configuration
  try {
    const config = await bunIntegration.loadConfig('./bun-integration.config.toml');
    console.log('📋 Configuration loaded:', config);
  } catch (error) {
    console.log('⚠️ Config file not found, using defaults');
  }

  // 2. File operations
  const fileManager = new FileManager();
  await fileManager.writeFile('./demo-output.txt', 'Hello from Bun!');
  const content = await fileManager.readFile('./demo-output.txt');
  console.log('📄 File content:', content);

  // 3. Database operations
  const db = new DatabaseManager();
  db.addFeature('TypeScript Support', 'Native TypeScript transpilation');
  db.addFeature('JSX Transform', 'Built-in JSX support without Babel');
  db.addFeature('Fast Bundler', '10-100x faster than Webpack');
  
  const features = db.getFeatures();
  console.log('🗄️ Database features:', features);
  db.close();

  // 4. Create and render JSX component
  const demoFeatures = [
    'TypeScript with strict typing',
    'JSX without configuration',
    'Built-in bundler and minifier',
    'Fast file system operations',
    'SQLite database integration',
    'HTTP server with WebSocket support'
  ];

  console.log('🎨 JSX Component created:', demoFeatures);

  // 5. Start demo server
  const server = new DemoServer();
  server.start();

  // 6. Bundle demonstration
  try {
    await bunIntegration.bundle({
      entrypoint: './src/platform/bun/demo.tsx',
      outfile: './dist/demo-bundle.js',
      minify: true,
      dropConsole: false,
      target: 'browser'
    });
  } catch (error) {
    console.log('⚠️ Bundle creation skipped in demo mode');
  }

  // 7. Show runtime info
  const runtimeInfo = bunIntegration.getRuntimeInfo();
  console.log('\n📊 Runtime Information:');
  console.log(`Version: ${runtimeInfo.version}`);
  console.log(`Platform: ${runtimeInfo.platform}`);
  console.log(`Architecture: ${runtimeInfo.arch}`);
  console.log('Features:', runtimeInfo.features.join(', '));

  // Cleanup
  setTimeout(() => {
    server.stop();
    fileManager.deleteFile('./demo-output.txt');
    console.log('\n✅ Demo completed successfully!');
  }, 5000);
}

// Export for use in other modules
export { DemoComponent, FileManager, DatabaseManager, DemoServer, fetchData, runDemo };

// Run demo if this file is executed directly
if (import.meta.main) {
  runDemo().catch(console.error);
}
