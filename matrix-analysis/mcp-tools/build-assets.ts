#!/usr/bin/env bun
// mcp-tools/build-assets.ts - Build and generate asset manifest with integrity hashes

import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";

interface AssetEntry {
  path: string;
  hash: string;
  size: number;
  type: string;
  lastModified: string;
}

class AssetBuilder {
  private distDir: string;
  private manifest: AssetEntry[] = [];

  constructor(distDir: string = "./dist") {
    this.distDir = distDir;
    
    // Ensure dist directory exists
    if (!existsSync(distDir)) {
      mkdirSync(distDir, { recursive: true });
    }
  }

  private async calculateHash(filePath: string): Promise<string> {
    try {
      const file = Bun.file(filePath);
      const buffer = await file.arrayBuffer();
      const hash = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(hash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    } catch (error) {
      console.error(`❌ Failed to calculate hash for ${filePath}:`, error);
      return '';
    }
  }

  private getMimeType(filePath: string): string {
    const ext = filePath.split('.').pop()?.toLowerCase();
    const mimeTypes: Record<string, string> = {
      'html': 'text/html',
      'css': 'text/css',
      'js': 'application/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'svg': 'image/svg+xml',
      'ico': 'image/x-icon',
      'woff': 'font/woff',
      'woff2': 'font/woff2',
      'ttf': 'font/ttf',
      'eot': 'application/vnd.ms-fontobject'
    };

    return mimeTypes[ext || ''] || 'application/octet-stream';
  }

  private async processFile(filePath: string): Promise<AssetEntry | null> {
    try {
      const fullPath = join(this.distDir, filePath);
      const file = Bun.file(fullPath);
      
      if (!(await file.exists())) {
        console.warn(`⚠️ File not found: ${fullPath}`);
        return null;
      }

      const hash = await this.calculateHash(fullPath);
      const stats = await file.stat();

      return {
        path: filePath,
        hash,
        size: stats.size,
        type: this.getMimeType(filePath),
        lastModified: stats.mtime.toISOString()
      };
    } catch (error) {
      console.error(`❌ Failed to process file ${filePath}:`, error);
      return null;
    }
  }

  public async addFile(filePath: string): Promise<void> {
    const entry = await this.processFile(filePath);
    if (entry) {
      this.manifest.push(entry);
      console.log(`✅ Added: ${filePath} (${entry.hash.slice(0, 8)}...)`);
    }
  }

  public async addFiles(filePaths: string[]): Promise<void> {
    console.log(`📦 Processing ${filePaths.length} files...`);
    
    for (const filePath of filePaths) {
      await this.addFile(filePath);
    }
  }

  public async addDirectory(dirPath: string, recursive: boolean = true): Promise<void> {
    console.log(`📁 Scanning directory: ${dirPath}`);
    
    try {
      const fullPath = join(this.distDir, dirPath);
      const files = await Bun.file(fullPath).text();
      
      // For demo, create some sample assets
      await this.createSampleAssets(dirPath);
      
      // Process all files in directory
      const sampleFiles = [
        `${dirPath}/index.html`,
        `${dirPath}/styles.css`,
        `${dirPath}/app.js`,
        `${dirPath}/logo.svg`
      ];

      for (const file of sampleFiles) {
        await this.addFile(file);
      }
      
    } catch (error) {
      console.error(`❌ Failed to scan directory ${dirPath}:`, error);
    }
  }

  private async createSampleAssets(dirPath: string): Promise<void> {
    const fullPath = join(this.distDir, dirPath);
    
    // Ensure directory exists
    if (!existsSync(fullPath)) {
      mkdirSync(fullPath, { recursive: true });
    }

    // Create sample HTML
    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Tier-1380 Asset Demo</title>
    <link rel="stylesheet" href="/styles.css">
    <link rel="icon" href="/logo.svg" type="image/svg+xml">
</head>
<body>
    <div id="app">
        <h1>🔐 Tier-1380 Asset Server Demo</h1>
        <p>This page is served with integrity verification.</p>
        <div id="status">Loading...</div>
    </div>
    <script src="/app.js"></script>
</body>
</html>`;

    writeFileSync(join(fullPath, 'index.html'), html);

    // Create sample CSS
    const css = `/* Tier-1380 Asset Server Demo Styles */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'SF Mono', Monaco, 'Cascadia Code', monospace;
  background: #0a0a0a;
  color: #e0e0e0;
  line-height: 1.6;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
}

#app {
  text-align: center;
  max-width: 600px;
  padding: 2rem;
}

h1 {
  color: #00ff88;
  margin-bottom: 1rem;
  font-size: 2rem;
  text-shadow: 0 0 10px rgba(0, 255, 136, 0.3);
}

p {
  color: #888;
  margin-bottom: 2rem;
}

#status {
  padding: 1rem;
  background: #1a1a1a;
  border-radius: 8px;
  border: 1px solid #333;
  font-family: monospace;
}

.status-success {
  color: #22c55e;
  border-color: #22c55e;
}

.status-error {
  color: #ef4444;
  border-color: #ef4444;
}`;

    writeFileSync(join(fullPath, 'styles.css'), css);

    // Create sample JavaScript
    const js = `// Tier-1380 Asset Server Demo Script
document.addEventListener('DOMContentLoaded', async () => {
  const statusEl = document.getElementById('status');
  
  try {
    // Verify asset integrity
    const response = await fetch('/manifest.json');
    const manifest = await response.json();
    
    // Find current page asset
    const currentAsset = manifest.find(asset => asset.path.endsWith('index.html'));
    
    if (currentAsset) {
      const integrityHeader = document.querySelector('meta[name="integrity"]');
      const serverHash = response.headers.get('x-content-sha256');
      
      statusEl.innerHTML = \`
        ✅ Asset loaded successfully!<br>
        📦 Path: \${currentAsset.path}<br>
        🔐 Hash: \${currentAsset.hash.slice(0, 16)}...<br>
        📏 Size: \${(currentAsset.size / 1024).toFixed(2)} KB<br>
        🎯 Integrity: \${serverHash === currentAsset.hash ? 'VERIFIED' : 'MISMATCH'}
      \`;
      
      statusEl.className = serverHash === currentAsset.hash ? 'status-success' : 'status-error';
    } else {
      statusEl.innerHTML = '❌ Current asset not found in manifest';
      statusEl.className = 'status-error';
    }
    
  } catch (error) {
    statusEl.innerHTML = \`❌ Error: \${error.message}\`;
    statusEl.className = 'status-error';
  }
});

// Log performance metrics
window.addEventListener('load', () => {
  const perfData = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
  console.log('🚀 Page Load Performance:');
  console.log(\`  DNS: \${perfData.domainLookupEnd - perfData.domainLookupStart}ms\`);
  console.log(\`  TCP: \${perfData.connectEnd - perfData.connectStart}ms\`);
  console.log(\`  Request: \${perfData.responseStart - perfData.requestStart}ms\`);
  console.log(\`  Response: \${perfData.responseEnd - perfData.responseStart}ms\`);
  console.log(\`  DOM: \${perfData.domContentLoadedEventEnd - perfData.responseEnd}ms\`);
  console.log(\`  Load: \${perfData.loadEventEnd - perfData.domContentLoadedEventEnd}ms\`);
});`;

    writeFileSync(join(fullPath, 'app.js'), js);

    // Create sample SVG
    const svg = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" rx="8" fill="#0a0a0a"/>
  <path d="M8 12L16 20L24 12" stroke="#00ff88" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="16" cy="8" r="2" fill="#00ff88"/>
  <text x="16" y="28" text-anchor="middle" fill="#00ff88" font-size="8" font-family="monospace">T1380</text>
</svg>`;

    writeFileSync(join(fullPath, 'logo.svg'), svg);

    console.log(`✅ Created sample assets in ${dirPath}`);
  }

  public generateManifest(): AssetEntry[] {
    return [...this.manifest];
  }

  public async saveManifest(filePath: string = "./dist/manifest.json"): Promise<void> {
    try {
      const manifestData = {
        generated: new Date().toISOString(),
        version: "1.0.0",
        assets: this.manifest
      };

      writeFileSync(filePath, JSON.stringify(manifestData, null, 2));
      console.log(`✅ Manifest saved to ${filePath}`);
      console.log(`📊 Total assets: ${this.manifest.length}`);
      
      const totalSize = this.manifest.reduce((sum, asset) => sum + asset.size, 0);
      console.log(`📏 Total size: ${(totalSize / 1024).toFixed(2)} KB`);
      
    } catch (error) {
      console.error(`❌ Failed to save manifest:`, error);
    }
  }

  public getStats(): {
    totalAssets: number;
    totalSize: number;
    assetTypes: Record<string, number>;
  } {
    const totalSize = this.manifest.reduce((sum, asset) => sum + asset.size, 0);
    const assetTypes: Record<string, number> = {};
    
    this.manifest.forEach(asset => {
      const ext = asset.path.split('.').pop()?.toLowerCase() || 'unknown';
      assetTypes[ext] = (assetTypes[ext] || 0) + 1;
    });

    return {
      totalAssets: this.manifest.length,
      totalSize,
      assetTypes
    };
  }
}

// CLI usage
if (import.meta.main) {
  console.log('🔧 Tier-1380 Asset Builder');
  console.log('=' .repeat(40));

  const builder = new AssetBuilder();

  // Build sample assets
  await builder.addDirectory('assets');

  // Generate and save manifest
  await builder.saveManifest();

  // Show statistics
  const stats = builder.getStats();
  console.log('\n📊 Build Statistics:');
  console.log(`  Total assets: ${stats.totalAssets}`);
  console.log(`  Total size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
  console.log(`  Asset types:`, Object.entries(stats.assetTypes).map(([type, count]) => `${type} (${count})`).join(', '));

  console.log('\n🚀 Build complete! Run the asset server:');
  console.log('  bun run asset-server');
}

export default AssetBuilder;
