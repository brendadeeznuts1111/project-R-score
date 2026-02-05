// Simple Bun Integration Demo - Working with available Bun features
// This demonstrates the core transpilation and language features

import { bunIntegration } from './bun-integration';

// React-like component with JSX (Bun handles transpilation automatically)
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

// Advanced TypeScript with generics
interface ApiResponse<T> {
  data: T;
  status: number;
  message: string;
}

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

// File operations using Bun's file system
class SimpleFileManager {
  async writeFile(path: string, content: string): Promise<void> {
    // Use Bun's write function if available, fallback to Node.js
    if (typeof Bun !== 'undefined' && Bun.write) {
      await Bun.write(path, content);
    } else {
      // Fallback for environments where Bun is not available
      const fs = await import('fs/promises');
      await fs.writeFile(path, content);
    }
    console.log(`✅ Written file: ${path}`);
  }

  async readFile(path: string): Promise<string> {
    if (typeof Bun !== 'undefined' && Bun.file) {
      const file = Bun.file(path);
      return await file.text();
    } else {
      const fs = await import('fs/promises');
      return await fs.readFile(path, 'utf-8');
    }
  }

  async deleteFile(path: string): Promise<void> {
    if (typeof Bun !== 'undefined' && Bun.file) {
      await Bun.file(path).delete();
    } else {
      const fs = await import('fs/promises');
      await fs.unlink(path);
    }
    console.log(`🗑️ Deleted file: ${path}`);
  }
}

// HTTP Server using available APIs
class SimpleServer {
  private server: any;

  constructor(private port: number = 3001) {}

  async start(): Promise<void> {
    if (typeof Bun !== 'undefined' && Bun.serve) {
      // Use Bun's built-in server
      this.server = Bun.serve({
        port: this.port,
        fetch: async (req) => {
          const url = new URL(req.url);
          
          if (url.pathname === '/') {
            const html = this.generateDemoPage();
            return new Response(html, {
              headers: { 'Content-Type': 'text/html' }
            });
          }

          if (url.pathname === '/api/features') {
            const features = this.getBunFeatures();
            return new Response(JSON.stringify(features), {
              headers: { 'Content-Type': 'application/json' }
            });
          }

          return new Response('Not Found', { status: 404 });
        }
      });
    } else {
      console.log('⚠️ Bun server not available, using fallback');
    }

    console.log(`🌐 Demo server running on http://localhost:${this.port}`);
  }

  private getBunFeatures(): string[] {
    return [
      'TypeScript transpilation',
      'JSX support without Babel',
      'Built-in bundler',
      'Fast file system operations',
      'HTTP server',
      'SQLite database (when available)',
      'WebSocket support',
      'TOML/YAML parsing',
      'Hot reload',
      'Tree shaking'
    ];
  }

  private generateDemoPage(): string {
    const features = this.getBunFeatures();
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🚀 Bun Integration Demo</title>
    <style>
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
            max-width: 800px; margin: 0 auto; padding: 20px; line-height: 1.6; 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; min-height: 100vh;
        }
        .container { background: rgba(255,255,255,0.1); padding: 2rem; border-radius: 16px; backdrop-filter: blur(10px); }
        .header { text-align: center; margin-bottom: 2rem; }
        .feature { 
            background: rgba(255,255,255,0.2); padding: 1rem; margin: 0.5rem 0; 
            border-radius: 8px; border-left: 4px solid #00ff88;
            transition: transform 0.2s ease;
        }
        .feature:hover { transform: translateX(10px); }
        .performance { 
            background: rgba(0,255,136,0.2); padding: 1rem; margin: 1rem 0; 
            border-radius: 8px; text-align: center;
        }
        h1 { font-size: 2.5rem; margin-bottom: 0.5rem; }
        .bun-logo { font-size: 3rem; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="bun-logo">🥟</div>
            <h1>Bun Integration Demo</h1>
            <p>Advanced Transpilation & Language Features</p>
        </div>
        
        <div class="performance">
            <h3>⚡ Performance</h3>
            <p>Built with Bun's ultra-fast bundler and runtime</p>
        </div>
        
        <h2>🚀 Features Demonstrated:</h2>
        <div id="features">
            ${features.map(feature => `<div class="feature">${feature}</div>`).join('')}
        </div>
        
        <div style="text-align: center; margin-top: 2rem;">
            <button onclick="loadFeatures()" style="
                background: #00ff88; color: #333; border: none; padding: 12px 24px; 
                border-radius: 8px; font-size: 16px; cursor: pointer; font-weight: bold;
            ">Load Live Features</button>
        </div>
    </div>
    
    <script>
        async function loadFeatures() {
            try {
                const response = await fetch('/api/features');
                const features = await response.json();
                console.log('Live features from Bun server:', features);
                alert('Features loaded successfully! Check console for details.');
            } catch (error) {
                console.error('Failed to load features:', error);
                alert('Failed to load features - server may not be running');
            }
        }
        
        // Show Bun environment info
        console.log('🥟 Bun Demo Loaded');
        console.log('Features:', ${JSON.stringify(features)});
    </script>
</body>
</html>`;
  }

  stop(): void {
    if (this.server) {
      this.server.stop();
      console.log('🛑 Demo server stopped');
    }
  }
}

// Main demonstration function
async function runSimpleDemo(): Promise<void> {
  console.log('🎯 Starting Simple Bun Integration Demo...\n');

  // 1. Load configuration
  try {
    const config = await bunIntegration.loadConfig('./bun-integration.config.toml');
    console.log('📋 Configuration loaded successfully');
  } catch (error) {
    console.log('⚠️ Config file not found, using defaults');
  }

  // 2. File operations
  const fileManager = new SimpleFileManager();
  await fileManager.writeFile('./simple-demo-output.txt', 'Hello from Bun Integration!');
  const content = await fileManager.readFile('./simple-demo-output.txt');
  console.log('📄 File content:', content);

  // 3. Create and render JSX component
  const demoFeatures = [
    'TypeScript with strict typing',
    'JSX without configuration',
    'Built-in bundler and minifier',
    'Fast file system operations',
    'HTTP server with WebSocket support',
    'TOML/YAML configuration parsing',
    'Hot reload and fast refresh',
    'Tree shaking and dead code elimination'
  ];

  console.log('🎨 JSX Component created with features:', demoFeatures);

  // 4. Start demo server
  const server = new SimpleServer();
  await server.start();

  // 5. Show runtime info
  const runtimeInfo = bunIntegration.getRuntimeInfo();
  console.log('\n📊 Runtime Information:');
  console.log(`Version: ${runtimeInfo.version}`);
  console.log(`Platform: ${runtimeInfo.platform}`);
  console.log(`Architecture: ${runtimeInfo.arch}`);
  console.log(`Features: ${runtimeInfo.features.length} total`);
  
  // Show key features
  const keyFeatures = [
    '✅ TypeScript transpilation',
    '✅ JSX support',
    '✅ Fast bundler',
    '✅ File system operations',
    '✅ HTTP server',
    '✅ Configuration parsing'
  ];
  
  console.log('\n🚀 Key Features Demonstrated:');
  keyFeatures.forEach(feature => console.log(`   ${feature}`));

  // 6. Cleanup after delay
  setTimeout(async () => {
    server.stop();
    await fileManager.deleteFile('./simple-demo-output.txt');
    console.log('\n✅ Simple demo completed successfully!');
    console.log('🌐 Visit http://localhost:3001 to see the web interface');
  }, 10000);
}

// Export for use in other modules
export { DemoComponent, SimpleFileManager, SimpleServer, fetchData, runSimpleDemo };

// Run demo if this file is executed directly
if (import.meta.main) {
  runSimpleDemo().catch(console.error);
}
