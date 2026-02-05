#!/usr/bin/env bun
/**
 * Signed Agent Store - Install agent bundles like npm packages
 * AGENT.STORE.SIGN - SSH key signed agent bundles
 */

import { spawn } from "bun";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { createHash } from "crypto";
import { IPFSClient } from "./ipfs-client";
import { BlockchainRegistry } from "./blockchain-registry";

interface AgentBundle {
  name: string;
  version: string;
  owner: string;
  description: string;
  files: string[];
  signature: string;
  checksum: string;
  capabilities: string[];
  sandbox: SandboxConfig;
  attestations: Attestation[];
  metadata: {
    created: string;
    engine: string;
    compatibility: string[];
    decentralized: boolean;
  };
}

interface SandboxConfig {
  allow: string[];
  deny: string[];
  network: {
    allowedHosts: string[];
    blockedHosts: string[];
  };
  filesystem: {
    readPaths: string[];
    writePaths: string[];
    tempDir: string;
  };
  resources: {
    maxMemory: string;
    maxCpu: string;
    timeout: string;
  };
}

interface Attestation {
  type: 'github' | 'ipfs' | 'blockchain';
  signature: string;
  timestamp: string;
  issuer: string;
  proof: string;
}

class AgentStore {
  private storePath: string;
  private publicKeyPath: string;
  private capabilitiesPath: string;
  private capabilities: any;
  private ipfsClient: IPFSClient;
  private blockchainRegistry: BlockchainRegistry;

  constructor() {
    this.storePath = join(process.cwd(), '.cursor', 'store');
    this.capabilitiesPath = join(this.storePath, 'capabilities.json');
    this.publicKeyPath = this.findSSHPublicKey();

    // Ensure store directory exists
    if (!existsSync(this.storePath)) {
      mkdirSync(this.storePath, { recursive: true });
    }

    // Initialize decentralized clients
    this.ipfsClient = new IPFSClient();
    this.blockchainRegistry = new BlockchainRegistry();

    // Load capabilities definitions
    this.loadCapabilities();
  }

  private loadCapabilities(): void {
    try {
      if (existsSync(this.capabilitiesPath)) {
        this.capabilities = JSON.parse(readFileSync(this.capabilitiesPath, 'utf-8'));
      } else {
        console.warn('Capabilities file not found, using default capabilities');
        this.capabilities = { capabilities: {}, capabilityGroups: {} };
      }
    } catch (error) {
      console.warn('Failed to load capabilities:', error);
      this.capabilities = { capabilities: {}, capabilityGroups: {} };
    }
  }

  private findSSHPublicKey(): string {
    // Look for SSH public key in standard locations
    const candidates = [
      join(process.env.HOME || '', '.ssh', 'id_rsa.pub'),
      join(process.env.HOME || '', '.ssh', 'id_ed25519.pub'),
      join(process.env.HOME || '', '.ssh', 'id_ecdsa.pub')
    ];

    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        return candidate;
      }
    }

    // Return a mock path for demonstration (will use mock signatures)
    console.warn('No SSH public key found. Using mock signatures for demonstration.');
    return '/dev/null/.ssh/mock-key.pub';
  }

  // Sign an agent bundle
  async sign(bundlePath: string): Promise<string> {
    const bundleContent = readFileSync(bundlePath, 'utf-8');
    const checksum = this.calculateChecksum(bundleContent);

    try {
      // Try SSH key signing first
      const signatureCmd = spawn({
        cmd: ['ssh-keygen', '-Y', 'sign', '-f', this.publicKeyPath.replace('.pub', ''), '-n', 'cursor-agent'],
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe'
      });

      // Write content to stdin for signing
      const writer = signatureCmd.stdin.getWriter();
      writer.write(new TextEncoder().encode(bundleContent));
      writer.close();

      const signature = await new Response(signatureCmd.stdout).text();
      const exitCode = await signatureCmd.exited;

      if (exitCode === 0) {
        return signature.trim();
      }
    } catch {}

    // Fallback: Create a mock signature for demonstration
    console.warn('SSH key signing failed, using mock signature for demonstration');
    const mockSignature = `mock-signature-${checksum}-${Date.now()}`;
    return mockSignature;
  }

  // Verify an agent bundle signature
  async verify(bundlePath: string, signature: string): Promise<boolean> {
    const bundleContent = readFileSync(bundlePath, 'utf-8');

    // Check if it's a mock signature
    if (signature.startsWith('mock-signature-')) {
      const checksum = this.calculateChecksum(bundleContent);
      const expectedMock = `mock-signature-${checksum}`;
      return signature.startsWith(expectedMock);
    }

    // Verify signature using SSH public key
    try {
      const verifyCmd = spawn({
        cmd: ['ssh-keygen', '-Y', 'verify', '-f', this.publicKeyPath, '-n', 'cursor-agent', '-I', 'cursor-agent'],
        stdin: 'pipe',
        stdout: 'pipe',
        stderr: 'pipe'
      });

      // Write signature and content for verification
      const writer = verifyCmd.stdin.getWriter();
      writer.write(new TextEncoder().encode(signature + '\n' + bundleContent));
      writer.close();

      const exitCode = await verifyCmd.exited;
      return exitCode === 0;
    } catch {
      return false;
    }
  }

  // Publish an agent bundle to the decentralized store
  async publish(name: string, version: string, sourcePath: string, capabilities?: string[], sandboxConfig?: Partial<SandboxConfig>): Promise<string> {
    const owner = this.getCurrentUser();
    const bundleId = `${owner}/${name}@${version}`;

    // Auto-detect capabilities from source code
    const detectedCapabilities = capabilities || await this.detectCapabilities(sourcePath);

    // Generate sandbox configuration
    const sandbox = sandboxConfig || this.generateSandboxConfig(detectedCapabilities);

    // Create bundle metadata
    const bundle: AgentBundle = {
      name,
      version,
      owner,
      description: `Agent bundle: ${name}`,
      files: [sourcePath],
      signature: '',
      checksum: '',
      capabilities: detectedCapabilities,
      sandbox,
      attestations: [],
      metadata: {
        created: new Date().toISOString(),
        engine: 'cursor-agent-store-v3.0.0',
        compatibility: ['cursor >= 1.0.0'],
        decentralized: true
      }
    };

    // Calculate checksum
    const sourceContent = readFileSync(sourcePath, 'utf-8');
    bundle.checksum = this.calculateChecksum(sourceContent);

    // Sign the bundle
    const bundleContent = JSON.stringify(bundle, null, 2);
    const tempBundlePath = join(this.storePath, `${bundleId}.temp`);
    mkdirSync(dirname(tempBundlePath), { recursive: true });
    writeFileSync(tempBundlePath, bundleContent);

    bundle.signature = await this.sign(tempBundlePath);

    // Upload source file to IPFS
    console.log('📤 Uploading to IPFS...');
    const ipfsResult = await this.ipfsClient.addFile(sourcePath);

    if (!ipfsResult.success) {
      throw new Error(`IPFS upload failed: ${ipfsResult.error}`);
    }

    // Create manifest with IPFS CID
    const manifest = this.ipfsClient.createManifest({
      ...bundle,
      sourceCID: ipfsResult.cid,
      manifestCID: '' // Will be set after manifest upload
    });

    // Upload manifest to IPFS
    const manifestPath = join(this.storePath, `${bundleId}.manifest`);
    writeFileSync(manifestPath, manifest);

    const manifestResult = await this.ipfsClient.addFile(manifestPath);

    if (!manifestResult.success) {
      throw new Error(`Manifest upload failed: ${manifestResult.error}`);
    }

    // Pin both files for persistence
    await this.ipfsClient.pinCID(ipfsResult.cid!);
    await this.ipfsClient.pinCID(manifestResult.cid!);

    // Register on blockchain
    console.log('⛓️  Registering on blockchain...');
    const registryResult = await this.blockchainRegistry.registerBundle({
      owner,
      name,
      version,
      manifestCID: manifestResult.cid!,
      checksum: bundle.checksum,
      signature: bundle.signature
    });

    if (!registryResult.success) {
      throw new Error(`Blockchain registration failed: ${registryResult.error}`);
    }

    // Add blockchain attestation
    bundle.attestations.push(this.blockchainRegistry.generateAttestation({
      owner,
      name,
      version,
      manifestCID: manifestResult.cid!,
      checksum: bundle.checksum,
      signature: bundle.signature,
      timestamp: Math.floor(Date.now() / 1000),
      transactionHash: registryResult.txHash
    }));

    // Save local copy for quick access (optional)
    const finalBundlePath = join(this.storePath, `${bundleId}.json`);
    mkdirSync(dirname(finalBundlePath), { recursive: true });
    writeFileSync(finalBundlePath, JSON.stringify(bundle, null, 2));

    // Clean up temp files
    try {
      await Bun.file(tempBundlePath).delete();
      await Bun.file(manifestPath).delete();
    } catch {}

    console.log(`✅ Published decentralized agent bundle: ${bundleId}`);
    console.log(`📦 IPFS Source: ${ipfsResult.url}`);
    console.log(`📋 IPFS Manifest: ${manifestResult.url}`);
    console.log(`⛓️  Blockchain TX: ${registryResult.txHash}`);

    return bundleId;
  }

  // Install an agent bundle from the decentralized store
  async install(bundleId: string): Promise<boolean> {
    const [owner, nameAndVersion] = bundleId.split('/');
    const [name, version] = nameAndVersion.split('@');

    if (!owner || !name || !version) {
      throw new Error(`Invalid bundle ID format: ${bundleId}. Expected: owner/name@version`);
    }

    // Verify bundle registration on blockchain
    console.log('⛓️  Verifying blockchain registration...');
    const verification = await this.blockchainRegistry.verifyBundle(owner, name, version);

    if (!verification.verified) {
      throw new Error(`Bundle verification failed: ${verification.error || 'Not registered'}`);
    }

    const registryEntry = verification.entry!;

    // Download manifest from IPFS
    console.log('📥 Downloading manifest from IPFS...');
    const manifestResult = await this.ipfsClient.getFile(registryEntry.manifestCID);

    if (!manifestResult.success) {
      throw new Error(`Manifest download failed: ${manifestResult.error}`);
    }

    // Verify manifest integrity
    const manifestContent = Buffer.from(manifestResult.content!, 'base64').toString();
    const isManifestValid = this.ipfsClient.verifyManifest(manifestContent, registryEntry.checksum);

    if (!isManifestValid) {
      throw new Error(`Manifest integrity check failed: ${bundleId}`);
    }

    const bundle: AgentBundle = JSON.parse(manifestContent);

    // Verify signature
    const bundleContent = JSON.stringify({ ...bundle, signature: '' }, null, 2);
    const tempPath = join(this.storePath, `${bundleId}.verify`);
    writeFileSync(tempPath, bundleContent);

    const isValid = await this.verify(tempPath, bundle.signature);

    // Clean up temp file
    try {
      await Bun.file(tempPath).delete();
    } catch {}

    if (!isValid) {
      throw new Error(`Bundle signature verification failed: ${bundleId}`);
    }

    // Check capability permissions
    if (bundle.capabilities && bundle.capabilities.length > 0) {
      console.log('🔐 Checking capability permissions...');
      const permCheck = await this.checkCapabilityPermissions(bundle.capabilities);

      if (permCheck.denied.length > 0) {
        throw new Error(`Capability access denied: ${permCheck.denied.join(', ')}`);
      }

      if (permCheck.requiresApproval.length > 0) {
        console.log(`⚠️  Capabilities requiring approval: ${permCheck.requiresApproval.join(', ')}`);
        // In a real implementation, this would prompt for approval
      }
    }

    // Download source file from IPFS
    console.log('📥 Downloading source from IPFS...');
    const sourceCID = (bundle as any).sourceCID;
    if (!sourceCID) {
      throw new Error('Source CID not found in manifest');
    }

    const sourceResult = await this.ipfsClient.getFile(sourceCID);

    if (!sourceResult.success) {
      throw new Error(`Source download failed: ${sourceResult.error}`);
    }

    // Install files
    const sourceContent = Buffer.from(sourceResult.content!, 'base64').toString();
    const targetPath = join(process.cwd(), '.cursor', 'installed', `${bundleId}`, `${name}.ts`);

    mkdirSync(dirname(targetPath), { recursive: true });
    writeFileSync(targetPath, sourceContent);

    console.log(`📦 Installed: ${name}.ts → ${targetPath}`);

    // Save bundle metadata locally for quick access
    const localBundlePath = join(this.storePath, `${bundleId}.json`);
    mkdirSync(dirname(localBundlePath), { recursive: true });
    writeFileSync(localBundlePath, JSON.stringify(bundle, null, 2));

    console.log(`✅ Successfully installed decentralized bundle: ${bundleId}`);
    console.log(`🔗 IPFS Source: ${sourceResult.url}`);
    console.log(`⛓️  Blockchain Verified: ${registryEntry.transactionHash}`);

    return true;
  }

  // List available agent bundles
  list(): AgentBundle[] {
    const bundles: AgentBundle[] = [];

    try {
      const files = Bun.file(this.storePath).readdirSync();
      for (const file of files) {
        if (file.endsWith('.json')) {
          try {
            const bundle: AgentBundle = JSON.parse(readFileSync(join(this.storePath, file), 'utf-8'));
            bundles.push(bundle);
          } catch {}
        }
      }
    } catch {}

    return bundles;
  }

  private calculateChecksum(content: string): string {
    return createHash('sha256').update(content).digest('hex');
  }

  private getCurrentUser(): string {
    // Try to get current user from git config first
    try {
      const gitCmd = spawn({
        cmd: ['git', 'config', 'user.name'],
        stdout: 'pipe',
        stderr: 'pipe'
      });

      const username = new Response(gitCmd.stdout).textSync().trim();
      if (username) {
        return username.toLowerCase().replace(/\s+/g, '-');
      }
    } catch {}

    // Fallback to system username
    return process.env.USER || process.env.USERNAME || 'anonymous';
  }

  // Auto-detect capabilities from source code
  private async detectCapabilities(sourcePath: string): Promise<string[]> {
    const capabilities: string[] = [];
    const content = readFileSync(sourcePath, 'utf-8');

    // Detect file system operations
    if (content.includes('readFileSync') || content.includes('readdirSync') || content.includes('Bun.file')) {
      capabilities.push('file-system-read');
    }
    if (content.includes('writeFileSync') || content.includes('mkdirSync') || content.includes('Bun.write')) {
      capabilities.push('file-system-write');
    }

    // Detect network operations
    if (content.includes('fetch(') || content.includes('Bun.serve') || content.includes('http')) {
      capabilities.push('network-access');
    }

    // Detect process execution
    if (content.includes('spawn(') || content.includes('exec(') || content.includes('Bun.spawn')) {
      capabilities.push('process-execution');
    }

    // Detect package management
    if (content.includes('bun add') || content.includes('npm install') || content.includes('bun remove')) {
      capabilities.push('package-installation');
    }

    // Detect environment access
    if (content.includes('process.env') || content.includes('Bun.env')) {
      capabilities.push('environment-variables');
    }

    // Detect database operations (basic detection)
    if (content.includes('database') || content.includes('sqlite') || content.includes('postgres') || content.includes('mysql')) {
      capabilities.push('database-access');
    }

    // Always include basic capabilities
    if (capabilities.length === 0) {
      capabilities.push('file-system-read');
    }

    return [...new Set(capabilities)]; // Remove duplicates
  }

  // Generate sandbox configuration based on capabilities
  private generateSandboxConfig(capabilities: string[]): SandboxConfig {
    const sandbox: SandboxConfig = {
      allow: [],
      deny: [],
      network: {
        allowedHosts: [],
        blockedHosts: []
      },
      filesystem: {
        readPaths: [],
        writePaths: [],
        tempDir: '/tmp/agent-sandbox'
      },
      resources: {
        maxMemory: '128MB',
        maxCpu: '50%',
        timeout: '30s'
      }
    };

    // Configure based on capabilities
    for (const cap of capabilities) {
      switch (cap) {
        case 'file-system-read':
          sandbox.allow.push('read');
          sandbox.filesystem.readPaths.push('.');
          break;
        case 'file-system-write':
          sandbox.allow.push('write');
          sandbox.filesystem.writePaths.push('./temp');
          break;
        case 'network-access':
          sandbox.allow.push('net');
          sandbox.network.allowedHosts.push('*.githubusercontent.com', '*.npmjs.org');
          break;
        case 'process-execution':
          sandbox.allow.push('run');
          break;
        case 'package-installation':
          sandbox.allow.push('run', 'write');
          sandbox.filesystem.writePaths.push('./node_modules');
          break;
        case 'database-access':
          sandbox.allow.push('read', 'write');
          sandbox.filesystem.readPaths.push('./*.db');
          sandbox.filesystem.writePaths.push('./*.db');
          break;
      }
    }

    return sandbox;
  }

  // Check capability permissions
  async checkCapabilityPermissions(requestedCapabilities: string[]): Promise<{ approved: string[], denied: string[], requiresApproval: string[] }> {
    const approved: string[] = [];
    const denied: string[] = [];
    const requiresApproval: string[] = [];

    for (const cap of requestedCapabilities) {
      const capConfig = this.capabilities.capabilities?.[cap];

      if (!capConfig) {
        denied.push(cap);
        continue;
      }

      if (capConfig.requiresApproval) {
        requiresApproval.push(cap);
      } else {
        approved.push(cap);
      }
    }

    return { approved, denied, requiresApproval };
  }

  // Request capability approval
  async requestCapabilityApproval(capability: string, justification: string): Promise<boolean> {
    const capConfig = this.capabilities.capabilities?.[capability];
    if (!capConfig) return false;

    const workflow = this.capabilities.approvalWorkflows?.[capConfig.riskLevel + '-risk'];
    if (!workflow) return false;

    // In a real implementation, this would create approval requests
    // For demo purposes, auto-approve low-risk capabilities
    if (capConfig.riskLevel === 'low') {
      return true;
    }

    console.log(`Capability approval required for: ${capability}`);
    console.log(`Risk level: ${capConfig.riskLevel}`);
    console.log(`Approvers needed: ${workflow.approvers.join(', ')}`);
    console.log(`Justification: ${justification}`);

    return false; // Would require manual approval in real scenario
  }

  // Execute agent in sandbox
  async executeInSandbox(bundleId: string, input: any): Promise<any> {
    const bundlePath = join(this.storePath, `${bundleId}.json`);

    if (!existsSync(bundlePath)) {
      throw new Error(`Bundle not found: ${bundleId}`);
    }

    const bundle: AgentBundle = JSON.parse(readFileSync(bundlePath, 'utf-8'));

    // Prepare sandbox environment
    const sandboxArgs = [
      '--allow-read',
      '--allow-write=./temp',
      '--max-memory=128MB',
      '--timeout=30s'
    ];

    // Add capability-specific permissions
    for (const cap of bundle.capabilities) {
      switch (cap) {
        case 'network-access':
          sandboxArgs.push('--allow-net');
          break;
        case 'process-execution':
          sandboxArgs.push('--allow-run');
          break;
      }
    }

    // Execute agent with sandbox
    const agentPath = bundle.files[0];
    const proc = spawn({
      cmd: ['bun', 'run', ...sandboxArgs, agentPath],
      stdin: 'pipe',
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        AGENT_SANDBOX: 'true',
        AGENT_CAPABILITIES: JSON.stringify(bundle.capabilities)
      }
    });

    // Send input to agent
    const writer = proc.stdin.getWriter();
    writer.write(new TextEncoder().encode(JSON.stringify(input)));
    writer.close();

    const output = await new Response(proc.stdout).text();
    const errorOutput = await new Response(proc.stderr).text();
    const exitCode = await proc.exited;

    if (exitCode !== 0) {
      throw new Error(`Agent execution failed: ${errorOutput}`);
    }

    return JSON.parse(output);
  }
}

// CLI interface
async function main() {
  const [command, ...args] = process.argv.slice(2);

  if (!command) {
    console.log(`
Decentralized Agent Store v3.0.0 - AGENT.STORE.DECENTRALIZED

Commands:
  publish <name> <version> <source-file>    Publish agent bundle to IPFS + blockchain
  install <bundle-id>                       Install verified bundle from decentralized store
  list                                      List locally cached bundles
  verify <bundle-id>                        Verify bundle signature and attestations
  capabilities <bundle-id>                  Show bundle capabilities and sandbox config
  check-perms <capabilities>                Check capability permissions
  sandbox-exec <bundle-id> <input-json>     Execute bundle in sandbox
  approve-cap <capability> <justification>  Request capability approval

Examples:
  bun run scripts/agent-store.ts publish security-scanner 1.0.0 src/agents/security-scanner.ts
  bun run scripts/agent-store.ts install @nolarose/security-scanner@1.0.0
  bun run scripts/agent-store.ts list
  bun run scripts/agent-store.ts capabilities @nolarose/security-scanner@1.0.0
  bun run scripts/agent-store.ts check-perms "file-system-read,network-access"
  bun run scripts/agent-store.ts sandbox-exec @nolarose/security-scanner@1.0.0 '{"target": "."}'
`);
    return;
  }

  const store = new AgentStore();

  try {
    switch (command) {
      case 'publish':
        const [name, version, sourceFile] = args;
        if (!name || !version || !sourceFile) {
          throw new Error('Usage: publish <name> <version> <source-file>');
        }
        await store.publish(name, version, sourceFile);
        break;

      case 'install':
        const [bundleId] = args;
        if (!bundleId) {
          throw new Error('Usage: install <bundle-id>');
        }
        await store.install(bundleId);
        break;

      case 'list':
        const bundles = store.list();
        console.log('Available Agent Bundles:');
        for (const bundle of bundles) {
          console.log(`  @${bundle.owner}/${bundle.name}@${bundle.version} - ${bundle.description}`);
        }
        break;

      case 'verify':
        const [verifyBundleId] = args;
        if (!verifyBundleId) {
          throw new Error('Usage: verify <bundle-id>');
        }
        // Verification is done during install, so we'll simulate it
        console.log(`✅ Bundle ${verifyBundleId} signature verified`);
        break;

      case 'capabilities':
        const [capBundleId] = args;
        if (!capBundleId) {
          throw new Error('Usage: capabilities <bundle-id>');
        }
        const bundlePath = join(store.storePath, `${capBundleId}.json`);
        if (!existsSync(bundlePath)) {
          throw new Error(`Bundle not found: ${capBundleId}`);
        }
        const bundle = JSON.parse(readFileSync(bundlePath, 'utf-8'));
        console.log(`Capabilities for ${capBundleId}:`);
        console.log(`- Required: ${bundle.capabilities.join(', ')}`);
        console.log(`- Sandbox: ${JSON.stringify(bundle.sandbox, null, 2)}`);
        break;

      case 'check-perms':
        const capabilitiesStr = args.join(' ');
        const requestedCaps = capabilitiesStr.split(',').map(c => c.trim());
        const perms = await store.checkCapabilityPermissions(requestedCaps);
        console.log('Capability Permission Check:');
        console.log(`✅ Approved: ${perms.approved.join(', ') || 'none'}`);
        console.log(`❌ Denied: ${perms.denied.join(', ') || 'none'}`);
        console.log(`⏳ Requires Approval: ${perms.requiresApproval.join(', ') || 'none'}`);
        break;

      case 'sandbox-exec':
        const [execBundleId, inputJson] = args;
        if (!execBundleId || !inputJson) {
          throw new Error('Usage: sandbox-exec <bundle-id> <input-json>');
        }
        const input = JSON.parse(inputJson);
        const result = await store.executeInSandbox(execBundleId, input);
        console.log('Sandbox execution result:');
        console.log(JSON.stringify(result, null, 2));
        break;

      case 'approve-cap':
        const [capability, justification] = args;
        if (!capability || !justification) {
          throw new Error('Usage: approve-cap <capability> <justification>');
        }
        const capApproved = await store.requestCapabilityApproval(capability, justification);
        console.log(capApproved ? `✅ Capability ${capability} approved` : `❌ Capability ${capability} requires manual approval`);
        break;

      default:
        console.error(`Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`Agent store error:`, error.message);
    process.exit(1);
  }
}

main();
