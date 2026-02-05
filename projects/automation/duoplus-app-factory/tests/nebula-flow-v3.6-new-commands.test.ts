#!/usr/bin/env bun
/**
 * Integration tests for new Nebula Flow v3.6 commands
 * 
 * Tests cover the new features introduced:
 * - Dashboard functionality
 * - Topology diagram generation
 * - Configuration audit
 * - Secrets management
 * - Runtime guards generation
 * - Package compilation
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import fs from 'fs';
import path from 'path';

// Configuration paths
const HOME = process.env.HOME || "/Users/nolarose";
const CONFIG_JSON = `${HOME}/Library/Application Support/Code/User/globalStorage/alefragnani.project-manager/projects.json`;
const TEST_OUTPUT_DIR = '/tmp/nebula-flow-tests';

describe('Nebula Flow v3.6 New Commands', () => {
  
  beforeAll(async () => {
    // Create test output directory
    await Bun.$`mkdir -p ${TEST_OUTPUT_DIR}`.text();
  });
  
  afterAll(async () => {
    // Cleanup test files
    await Bun.$`rm -rf ${TEST_OUTPUT_DIR}`.text();
  });
  
  describe('Dashboard Command', () => {
    it('should start the dashboard', async () => {
      // Note: Dashboard is interactive and doesn't accept --help
      // We'll just verify it runs without errors by sending quit command
      const proc = Bun.spawn(["bun", "run", "nebula-flow:dashboard"], {
        stdin: "pipe",
        stdout: "pipe",
        stderr: "pipe"
      });
      
      // Give it time to start
      await Bun.sleep(500);
      
      // Send '6' to quit (simple mode)
      proc.stdin.write("6\n");
      proc.stdin.end();
      
      const [stdout, stderr] = await Promise.all([
        new Response(proc.stdout).text(),
        new Response(proc.stderr).text()
      ]);
      
      const code = await proc.exited;
      // bun run prefixes with command, so we just check it's not an error
      expect(stderr).not.toContain('error');
      expect(code).toBe(0);
      expect(stdout).toContain('Simple Dashboard Mode');
      
      console.log('✅ Dashboard command test passed');
    });
  });
  
  describe('Topology Generation', () => {
    it('should generate topology diagram in DOT format', async () => {
      const outputFile = path.join(TEST_OUTPUT_DIR, 'topology.dot');
      
      const result = await Bun.$`bun run nebula-flow:topology --format=dot --output=${outputFile}`.text();
      
      expect(result).toContain('Topology diagram generated');
      
      const fileExists = fs.existsSync(outputFile);
      expect(fileExists).toBe(true);
      
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('digraph nebula_topology');
      
      console.log('✅ Topology DOT format test passed');
    });
    
    it('should generate topology diagram in text format', async () => {
      const outputFile = path.join(TEST_OUTPUT_DIR, 'topology.txt');
      
      const result = await Bun.$`bun run nebula-flow:topology --format=text --output=${outputFile}`.text();
      
      expect(result).toContain('Topology diagram generated');
      
      const fileExists = fs.existsSync(outputFile);
      expect(fileExists).toBe(true);
      
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('Nebula Flow Topology');
      
      console.log('✅ Topology text format test passed');
    });
  });
  
  describe('Configuration Audit', () => {
    it('should run audit without failing on critical errors', async () => {
      const result = await Bun.$`bun run nebula-flow:audit`.text();
      
      expect(result).toContain('Nebula Flow Configuration Audit');
      expect(result).toContain('Audit Summary');
      
      console.log('✅ Audit without fail-on-critical test passed');
    });
    
    it('should export audit report to JSON file', async () => {
      const outputFile = path.join(TEST_OUTPUT_DIR, 'audit-report.json');
      
      const result = await Bun.$`bun run nebula-flow:audit --export=${outputFile}`.text();
      
      expect(result).toContain('Audit report saved');
      
      const fileExists = fs.existsSync(outputFile);
      expect(fileExists).toBe(true);
      
      const content = JSON.parse(fs.readFileSync(outputFile, 'utf8'));
      expect(content.version).toBe('3.6.0');
      expect(typeof content.valid).toBe('boolean');
      
      console.log('✅ Audit export test passed');
    });
  });
  
  describe('Secrets Management', () => {
    it('should show secrets management help', async () => {
      const result = await Bun.$`bun run nebula-flow:help`.text();
      expect(result).toContain('Secrets Options:');
    });
    
    it('should sync secrets for all groups', async () => {
      const result = await Bun.$`bun run nebula-flow:secrets sync --all-groups`.text();
      
      expect(result).toContain('Nebula Flow Secrets Management');
      expect(result).toContain('Syncing secrets');
      expect(result).toContain('completed successfully');
      
      console.log('✅ Secrets sync test passed');
    });
    
    it('should sync secrets to keychain', async () => {
      const result = await Bun.$`bun run nebula-flow:secrets sync --all-groups --to-keychain`.text();
      
      expect(result).toContain('Storing secrets in system keychain');
      expect(result).toContain('completed successfully');
      
      console.log('✅ Secrets keychain sync test passed');
    });
  });
  
  describe('Runtime Guards Generation', () => {
    it('should generate TypeScript guards for all groups', async () => {
      const outputFile = path.join(TEST_OUTPUT_DIR, 'guards.ts');
      
      const result = await Bun.$`bun run nebula-flow:guard generate --output=${outputFile}`.text();
      
      expect(result).toContain('Nebula Flow Runtime Guards Generator');
      expect(result).toContain('Generating guards');
      expect(result).toContain('generated');
      
      const fileExists = fs.existsSync(outputFile);
      expect(fileExists).toBe(true);
      
      const content = fs.readFileSync(outputFile, 'utf8');
      expect(content).toContain('interface ProjectGuard');
      expect(content).toContain('GROUP_GUARDS');
      
      console.log('✅ Runtime guards generation test passed');
    });
    
    it('should generate guards for specific groups', async () => {
      const outputFile = path.join(TEST_OUTPUT_DIR, 'guards-specific.ts');
      
      // Get all available groups from configuration
      const configContent = await Bun.file(CONFIG_JSON).text();
      const projects = JSON.parse(configContent);
      const availableGroups = [...new Set(projects.map((p: any) => p.group))];
      
      // Use the first available group for testing
      if (availableGroups.length > 0) {
        const testGroup = availableGroups[0] as string;
        const result = await Bun.$`bun run nebula-flow:guard generate --groups=${testGroup} --output=${outputFile}`.text();
        
        expect(result).toContain('Generating guards');
        expect(result).toContain(testGroup);
        expect(result).toContain('generated');
        
        const fileExists = fs.existsSync(outputFile);
        expect(fileExists).toBe(true);
        
        const content = fs.readFileSync(outputFile, 'utf8');
        expect(content).toContain('GROUP_GUARDS');
        
        console.log(`✅ Specific groups guards generation test passed for group: ${testGroup}`);
      } else {
        console.log('⚠️  No groups available for specific group guards test - skipping');
        expect(true).toBe(true); // Pass test if no groups
      }
    });
  });
  
  describe('Package Compilation', () => {
    it('should create a basic package', async () => {
      const result = await Bun.$`bun run nebula-flow:package --outfile=${path.join(TEST_OUTPUT_DIR, 'test-package')}`.text();
      
      expect(result).toContain('Nebula Flow Package Compiler');
      expect(result).toContain('Package created');
      
      const packageFile = path.join(TEST_OUTPUT_DIR, 'test-package.zip');
      const packageExists = fs.existsSync(packageFile);
      expect(packageExists).toBe(true);
      
      console.log('✅ Basic package creation test passed');
    });
    
    it('should create package with feature flag', async () => {
      const result = await Bun.$`bun run nebula-flow:package --feature=PREMIUM --outfile=${path.join(TEST_OUTPUT_DIR, 'premium-package')}`.text();
      
      expect(result).toContain('Feature flag: PREMIUM');
      expect(result).toContain('Package created');
      
      const packageFile = path.join(TEST_OUTPUT_DIR, 'premium-package.zip');
      const packageExists = fs.existsSync(packageFile);
      expect(packageExists).toBe(true);
      
      console.log('✅ Feature flag package creation test passed');
    });
    
    it('should compile and create package', async () => {
      const result = await Bun.$`bun run nebula-flow:package --compile --feature=ENTERPRISE --outfile=${path.join(TEST_OUTPUT_DIR, 'enterprise-package')}`.text();
      
      expect(result).toContain('Compiling with TypeScript');
      expect(result).toContain('Compilation completed');
      expect(result).toContain('Feature flag: ENTERPRISE');
      expect(result).toContain('Package created');
      
      const packageFile = path.join(TEST_OUTPUT_DIR, 'enterprise-package.zip');
      const packageExists = fs.existsSync(packageFile);
      expect(packageExists).toBe(true);
      
      console.log('✅ Compiled package creation test passed');
    });
  });
  
  describe('Command Line Interface', () => {
    it('should list all available commands in help', async () => {
      const result = await Bun.$`bun run nebula-flow:help`.text();
      
      expect(result).toContain('nebula-flow.ts dashboard');
      expect(result).toContain('nebula-flow.ts topology');
      expect(result).toContain('nebula-flow.ts audit');
      expect(result).toContain('nebula-flow.ts secrets');
      expect(result).toContain('nebula-flow.ts guard');
      expect(result).toContain('nebula-flow.ts package');
      
      console.log('✅ All commands listed in help test passed');
    });
  });
});
