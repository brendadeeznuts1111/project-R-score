#!/usr/bin/env bun
/**
 * Integration tests for Nebula Flow Configuration Manager v3.6
 * 
 * Tests cover the new features introduced in v3.6:
 * - TOML export/import functionality
 * - Performance monitoring
 * - URLPattern analysis
 * - Distributed configuration support
 */

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import fs from 'fs';
import path from 'path';

// Configuration paths
const HOME = process.env.HOME || "/Users/nolarose";
const CONFIG_TOML = `${HOME}/d-network/nebula-profiles.toml`;
const TAGS_INDEX = `${HOME}/d-network/.nebula-tags.index`;

describe('Nebula Flow v3.6', () => {
  
  describe('TOML Export Functionality', () => {
    it('should export configuration to TOML file', async () => {
      // Run export command
      const result = await Bun.$`bun run nebula-flow:export-toml`.text();
      
      // Check if file was created
      const fileExists = fs.existsSync(CONFIG_TOML);
      expect(fileExists).toBe(true);
      
      // Verify file content
      const content = fs.readFileSync(CONFIG_TOML, 'utf8');
      expect(content).toContain('# Nebula Flow Configuration v3.6');
      
      console.log('✅ TOML export test passed');
    });
    
    it('should have valid TOML structure', async () => {
      const content = fs.readFileSync(CONFIG_TOML, 'utf8');
      
      // Check for basic TOML structure
      expect(content).toContain('[metadata]');
      expect(content).toContain('[severityColors]');
      expect(content).toContain('[projects.');
      
      console.log('✅ TOML structure test passed');
    });
  });
  
  describe('Performance Monitoring', () => {
    it('should measure configuration loading time', async () => {
      const result = await Bun.$`bun run nebula-flow:perf`.text();
      
      // Check if output contains performance metrics
      expect(result).toContain('⚡ Performance Metrics');
      expect(result).toContain('Configuration Load:');
      expect(result).toContain('Validation:');
      expect(result).toContain('Index Generation:');
      expect(result).toContain('Projects Count:');
      
      console.log('✅ Performance metrics test passed');
    });
  });
  
  describe('URLPattern Analysis', () => {
    it('should analyze URLPatterns in configuration', async () => {
      const result = await Bun.$`bun run nebula-flow:patterns`.text();
      
      // Should output observatory header
      expect(result).toContain('🔍 URLPattern Observatory');
      
      console.log('✅ URLPattern analysis test passed');
    });
  });
  
  describe('Distributed Configuration', () => {
    it('should check sync status', async () => {
      const result = await Bun.$`bun run nebula-flow:status`.text();
      
      expect(result).toContain('📊 Sync Status');
      expect(result).toContain('Local hash:');
      expect(result).toContain('Remote hash:');
      expect(result).toContain('Sync Status:');
      
      console.log('✅ Sync status test passed');
    });
    
    it('should perform configuration sync', async () => {
      const result = await Bun.$`bun run nebula-flow:sync`.text();
      
      expect(result).toContain('🔄 Syncing configuration');
      expect(result).toContain('✅ Remote sync completed');
      
      console.log('✅ Configuration sync test passed');
    });
  });
  
  describe('Tags Index', () => {
    it('should generate tags index', async () => {
      // Clean existing index
      if (fs.existsSync(TAGS_INDEX)) {
        fs.unlinkSync(TAGS_INDEX);
      }
      
      const result = await Bun.$`bun run nebula-flow:index`.text();
      
      const indexExists = fs.existsSync(TAGS_INDEX);
      expect(indexExists).toBe(true);
      
      const indexContent = JSON.parse(fs.readFileSync(TAGS_INDEX, 'utf8'));
      expect(Array.isArray(indexContent)).toBe(true);
      
      console.log('✅ Tags index generation test passed');
    });
  });
  
  describe('Configuration Validation', () => {
    it('should validate configuration', async () => {
      const result = await Bun.$`bun run nebula-flow:validate`.text();
      
      expect(result).toContain('🟢 Configuration valid');
      
      console.log('✅ Configuration validation test passed');
    });
  });
});
