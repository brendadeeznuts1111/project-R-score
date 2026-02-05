#!/usr/bin/env bun
// mcp-tools/simple-build.ts - Simple asset manifest builder

import { writeFileSync } from "fs";
import { join } from "path";

interface AssetEntry {
  path: string;
  hash: string;
  size: number;
  type: string;
  lastModified: string;
}

async function calculateHash(filePath: string): Promise<string> {
  const file = Bun.file(filePath);
  const buffer = await file.arrayBuffer();
  const hash = await crypto.subtle.digest('SHA-256', buffer);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function getMimeType(filePath: string): string {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const mimeTypes: Record<string, string> = {
    'html': 'text/html',
    'css': 'text/css',
    'js': 'application/javascript',
    'json': 'application/json',
    'svg': 'image/svg+xml'
  };
  return mimeTypes[ext || ''] || 'application/octet-stream';
}

async function processFile(filePath: string): Promise<AssetEntry> {
  const fullPath = join('./dist', filePath);
  const file = Bun.file(fullPath);
  const stats = await file.stat();
  
  return {
    path: filePath,
    hash: await calculateHash(fullPath),
    size: stats.size,
    type: getMimeType(filePath),
    lastModified: stats.mtime.toISOString()
  };
}

async function main() {
  console.log('🔧 Building Tier-1380 Asset Manifest');
  
  const files = [
    'assets/index.html',
    'assets/styles.css', 
    'assets/app.js',
    'assets/logo.svg'
  ];
  
  const assets: AssetEntry[] = [];
  
  for (const file of files) {
    try {
      const asset = await processFile(file);
      assets.push(asset);
      console.log(`✅ ${file} -> ${asset.hash.slice(0, 12)}...`);
    } catch (error) {
      console.error(`❌ Failed to process ${file}:`, error);
    }
  }
  
  const manifest = {
    generated: new Date().toISOString(),
    version: "1.0.0",
    assets
  };
  
  writeFileSync('./dist/manifest.json', JSON.stringify(manifest, null, 2));
  
  console.log(`📦 Manifest saved: ${assets.length} assets`);
  const totalSize = assets.reduce((sum, a) => sum + a.size, 0);
  console.log(`📏 Total size: ${(totalSize / 1024).toFixed(2)} KB`);
}

main().catch(console.error);
