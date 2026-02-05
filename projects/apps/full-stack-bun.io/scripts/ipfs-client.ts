#!/usr/bin/env bun
/**
 * IPFS Client - Decentralized storage for agent bundles
 * IPFS.STORE.CLIENT - Content-addressed storage with manifest hashes
 */

import { spawn } from "bun";
import { readFileSync, writeFileSync, existsSync } from "fs";
import { join } from "path";

interface IPFSConfig {
  gateway: string;
  api: string;
  timeout: number;
}

interface IPFSResult {
  success: boolean;
  cid?: string;
  url?: string;
  error?: string;
}

class IPFSClient {
  private config: IPFSConfig;

  constructor(config: Partial<IPFSConfig> = {}) {
    this.config = {
      gateway: config.gateway || 'https://ipfs.io/ipfs/',
      api: config.api || 'https://api.ipfs.io/api/v0',
      timeout: config.timeout || 30000
    };
  }

  // Add file to IPFS and get CID
  async addFile(filePath: string): Promise<IPFSResult> {
    try {
      if (!existsSync(filePath)) {
        return { success: false, error: `File not found: ${filePath}` };
      }

      // Use IPFS CLI if available, fallback to HTTP API
      if (await this.hasIPFSCLI()) {
        return await this.addWithCLI(filePath);
      } else {
        return await this.addWithAPI(filePath);
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Add directory to IPFS
  async addDirectory(dirPath: string): Promise<IPFSResult> {
    try {
      if (!existsSync(dirPath)) {
        return { success: false, error: `Directory not found: ${dirPath}` };
      }

      // Use IPFS CLI for directory uploads
      if (await this.hasIPFSCLI()) {
        const result = await spawn({
          cmd: ['ipfs', 'add', '-r', '-Q', dirPath],
          stdout: 'pipe',
          stderr: 'pipe'
        });

        const cid = await new Response(result.stdout).text();
        const exitCode = await result.exited;

        if (exitCode === 0 && cid.trim()) {
          return {
            success: true,
            cid: cid.trim(),
            url: `${this.config.gateway}${cid.trim()}`
          };
        }
      }

      return { success: false, error: 'IPFS CLI not available for directory upload' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Get file from IPFS
  async getFile(cid: string, outputPath?: string): Promise<IPFSResult> {
    try {
      const url = `${this.config.gateway}${cid}`;

      // Use fetch to download
      const response = await fetch(url, { timeout: this.config.timeout });

      if (!response.ok) {
        return { success: false, error: `HTTP ${response.status}: ${response.statusText}` };
      }

      const content = await response.arrayBuffer();
      const buffer = new Uint8Array(content);

      if (outputPath) {
        writeFileSync(outputPath, buffer);
        return { success: true, cid, url };
      } else {
        // Return content as base64
        const base64 = Buffer.from(buffer).toString('base64');
        return { success: true, cid, url, content: base64 };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Pin content to ensure persistence
  async pinCID(cid: string): Promise<IPFSResult> {
    try {
      if (await this.hasIPFSCLI()) {
        const result = await spawn({
          cmd: ['ipfs', 'pin', 'add', cid],
          stdout: 'pipe',
          stderr: 'pipe'
        });

        const exitCode = await result.exited;

        if (exitCode === 0) {
          return { success: true, cid };
        }
      }

      // Fallback: Use pinning service
      const pinResult = await fetch('https://api.pinata.cloud/pinning/pinByHash', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.PINATA_API_KEY || ''}`
        },
        body: JSON.stringify({ hashToPin: cid })
      });

      if (pinResult.ok) {
        return { success: true, cid };
      }

      return { success: false, error: 'Failed to pin content' };
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Check if IPFS CLI is available
  private async hasIPFSCLI(): Promise<boolean> {
    try {
      const result = await spawn({
        cmd: ['which', 'ipfs'],
        stdout: 'pipe',
        stderr: 'pipe'
      });

      return (await result.exited) === 0;
    } catch {
      return false;
    }
  }

  // Add file using IPFS CLI
  private async addWithCLI(filePath: string): Promise<IPFSResult> {
    const result = await spawn({
      cmd: ['ipfs', 'add', '-Q', filePath],
      stdout: 'pipe',
      stderr: 'pipe'
    });

    const cid = await new Response(result.stdout).text();
    const error = await new Response(result.stderr).text();
    const exitCode = await result.exited;

    if (exitCode === 0 && cid.trim()) {
      return {
        success: true,
        cid: cid.trim(),
        url: `${this.config.gateway}${cid.trim()}`
      };
    } else {
      return { success: false, error: error || 'IPFS CLI failed' };
    }
  }

  // Add file using HTTP API
  private async addWithAPI(filePath: string): Promise<IPFSResult> {
    try {
      const fileContent = readFileSync(filePath);

      const formData = new FormData();
      formData.append('file', new Blob([fileContent]), filePath);

      const response = await fetch(`${this.config.api}/add`, {
        method: 'POST',
        body: formData,
        timeout: this.config.timeout
      });

      if (response.ok) {
        const result = await response.json();
        return {
          success: true,
          cid: result.Hash,
          url: `${this.config.gateway}${result.Hash}`
        };
      } else {
        return { success: false, error: `API Error: ${response.status}` };
      }
    } catch (error) {
      return { success: false, error: error.message };
    }
  }

  // Create IPFS manifest for agent bundle
  createManifest(bundle: any): string {
    const manifest = {
      name: bundle.name,
      version: bundle.version,
      owner: bundle.owner,
      description: bundle.description,
      capabilities: bundle.capabilities,
      checksum: bundle.checksum,
      sandbox: bundle.sandbox,
      attestations: bundle.attestations,
      metadata: bundle.metadata,
      created: new Date().toISOString()
    };

    return JSON.stringify(manifest, null, 2);
  }

  // Verify manifest integrity
  verifyManifest(manifestContent: string, expectedChecksum: string): boolean {
    const manifest = JSON.parse(manifestContent);
    const computedChecksum = this.calculateChecksum(manifestContent);
    return computedChecksum === expectedChecksum;
  }

  private calculateChecksum(content: string): string {
    const crypto = await import('crypto');
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}

// CLI interface
async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
IPFS Client v1.0.0 - Decentralized Storage

Usage:
  bun run scripts/ipfs-client.ts <command> [options]

Commands:
  add <file>              Add file to IPFS
  get <cid> [output]      Get file from IPFS
  pin <cid>               Pin content for persistence
  manifest <bundle-json>  Create IPFS manifest
  verify <manifest> <checksum> Verify manifest integrity

Examples:
  bun run scripts/ipfs-client.ts add src/agent.ts
  bun run scripts/ipfs-client.ts get QmHash123 output.ts
  bun run scripts/ipfs-client.ts pin QmHash123
`);
    return;
  }

  const client = new IPFSClient();

  try {
    switch (command) {
      case 'add':
        const [filePath] = args;
        if (!filePath) {
          throw new Error('Usage: add <file>');
        }
        const addResult = await client.addFile(filePath);
        if (addResult.success) {
          console.log(`✅ Added to IPFS: ${addResult.cid}`);
          console.log(`🌐 URL: ${addResult.url}`);
        } else {
          console.error(`❌ Failed to add file: ${addResult.error}`);
        }
        break;

      case 'get':
        const [cid, outputPath] = args;
        if (!cid) {
          throw new Error('Usage: get <cid> [output]');
        }
        const getResult = await client.getFile(cid, outputPath);
        if (getResult.success) {
          console.log(`✅ Retrieved from IPFS: ${cid}`);
          if (outputPath) {
            console.log(`💾 Saved to: ${outputPath}`);
          }
        } else {
          console.error(`❌ Failed to get file: ${getResult.error}`);
        }
        break;

      case 'pin':
        const [pinCid] = args;
        if (!pinCid) {
          throw new Error('Usage: pin <cid>');
        }
        const pinResult = await client.pinCID(pinCid);
        if (pinResult.success) {
          console.log(`✅ Pinned content: ${pinCid}`);
        } else {
          console.error(`❌ Failed to pin content: ${pinResult.error}`);
        }
        break;

      case 'manifest':
        const [bundleJson] = args;
        if (!bundleJson) {
          throw new Error('Usage: manifest <bundle-json>');
        }
        const bundle = JSON.parse(bundleJson);
        const manifest = client.createManifest(bundle);
        console.log(manifest);
        break;

      case 'verify':
        const [manifestContent, expectedChecksum] = args;
        if (!manifestContent || !expectedChecksum) {
          throw new Error('Usage: verify <manifest> <checksum>');
        }
        const isValid = client.verifyManifest(manifestContent, expectedChecksum);
        console.log(isValid ? '✅ Manifest verified' : '❌ Manifest verification failed');
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error('IPFS Client error:', error.message);
    process.exit(1);
  }
}

export { IPFSClient };
export type { IPFSConfig, IPFSResult };

// Run CLI if called directly
if (import.meta.main) {
  main();
}
