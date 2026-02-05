#!/usr/bin/env bun

/**
 * PTY Session Analysis Demo - Bun Loader Magic
 * 
 * This demo shows how to use Bun's built-in loaders to:
 * 1. Import PTY session logs as text
 * 2. Parse TOML configs for analysis rules
 * 3. Embed SQLite for session metadata
 * 4. Generate HTML reports with asset hashing
 */

import { Database } from 'bun:sqlite';
import { fileURLToPath } from 'url';

// Use dynamic imports with @ts-ignore to bypass TypeScript module resolution
// @ts-ignore - Bun's text loader handles this at runtime
import ptyLog from './pty-session.log' with { type: 'text' };

// @ts-ignore - Bun's TOML loader handles this at runtime
import analysisConfig from './analysis-config.toml' with { type: 'toml' };

// Import embedded SQLite database for session metadata
import sessionsDB from 'bun:sqlite' with { type: 'sqlite' };

// @ts-ignore - Bun's HTML loader handles this at runtime
import reportTemplate from './report-template.html' with { type: 'html' };

// @ts-ignore - Bun's text loader handles this at runtime
import reportStyles from './report-styles.css' with { type: 'text' };

console.log('🔮 PTY Analysis Engine Starting...');
console.log(`📊 Log size: ${(ptyLog.length / 1024).toFixed(2)} KB`);
console.log(`⚙️  Analysis config loaded: ${Object.keys(analysisConfig).length} sections`);
console.log(`🗄️  Embedded SQLite: ${sessionsDB ? 'Ready' : 'Failed'}`);

interface PTYMetrics {
  totalCommands: number;
  uniqueCommands: Set<string>;
  errors: number;
  warnings: number;
  sessionDuration: number;
  mostUsedCommands: Array<{ command: string; count: number }>;
}

class PTYAnalyzer {
  private db: Database;
  private config: any;
  
  constructor(config: any, embeddedDB: any) {
    this.config = config;
    // Create a new database instance for the demo
    this.db = new Database('./pty-sessions.db');
    this.initializeDatabase();
  }
  
  private initializeDatabase() {
    // Create tables if they don't exist
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        timestamp TEXT NOT NULL,
        metrics TEXT NOT NULL,
        hash TEXT NOT NULL UNIQUE
      )
    `);
    
    this.db.run(`
      CREATE TABLE IF NOT EXISTS commands (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER,
        command TEXT NOT NULL,
        count INTEGER DEFAULT 1,
        FOREIGN KEY (session_id) REFERENCES sessions (id)
      )
    `);
  }
  
  analyzeSession(logContent: string): PTYMetrics {
    console.log('🔍 Analyzing PTY session...');
    
    const lines = logContent.split('\n');
    const commands = new Set<string>();
    const commandCounts = new Map<string, number>();
    let errors = 0;
    let warnings = 0;
    
    // Extract commands from log (simplified parsing)
    lines.forEach(line => {
      const trimmed = line.trim();
      
      // Skip empty lines and timestamps
      if (!trimmed || /^\d{4}-\d{2}-\d{2}/.test(trimmed)) return;
      
      // Detect commands (starts with $ or >)
      if (trimmed.startsWith('$') || trimmed.startsWith('>')) {
        const command = trimmed.substring(1).trim().split(' ')[0];
        commands.add(command);
        commandCounts.set(command, (commandCounts.get(command) || 0) + 1);
      }
      
      // Detect errors and warnings
      if (this.config.patterns?.error?.some((pattern: string) => {
        // Convert string pattern to regex
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return regex.test(trimmed);
      })) {
        errors++;
      }
      if (this.config.patterns?.warning?.some((pattern: string) => {
        // Convert string pattern to regex
        const regex = new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        return regex.test(trimmed);
      })) {
        warnings++;
      }
    });
    
    // Sort commands by usage
    const mostUsedCommands = Array.from(commandCounts.entries())
      .map(([command, count]) => ({ command, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    return {
      totalCommands: commands.size,
      uniqueCommands: commands,
      errors,
      warnings,
      sessionDuration: lines.length * 100, // Mock duration
      mostUsedCommands
    };
  }
  
  generateSessionHash(metrics: PTYMetrics): string {
    const hashInput = JSON.stringify(metrics);
    // Use a simple hash function since Bun.crc32 might not be available
    let hash = 0;
    for (let i = 0; i < hashInput.length; i++) {
      const char = hashInput.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }
  
  saveSession(metrics: PTYMetrics): number {
    const hash = this.generateSessionHash(metrics);
    const timestamp = new Date().toISOString();
    
    try {
      const result = this.db.run(
        'INSERT OR IGNORE INTO sessions (timestamp, metrics, hash) VALUES (?, ?, ?)',
        [timestamp, JSON.stringify(metrics), hash]
      );
      
      if (result.lastInsertRowid) {
        const sessionId = Number(result.lastInsertRowid);
        
        // Save command statistics
        metrics.mostUsedCommands.forEach(({ command, count }) => {
          this.db.run(
            'INSERT INTO commands (session_id, command, count) VALUES (?, ?, ?)',
            [sessionId, command, count]
          );
        });
        
        return sessionId;
      }
    } catch (error) {
      console.error('Failed to save session:', error);
    }
    
    return -1;
  }
  
  generateHTMLReport(metrics: PTYMetrics): string {
    console.log('📝 Generating HTML report...');
    
    // Handle HTML loader output (might be object or string)
    let html = typeof reportTemplate === 'string' ? reportTemplate : String(reportTemplate);
    
    // Replace placeholders in template
    html = html.replace('{{TITLE}}', this.config.report?.title || 'PTY Session Analysis');
    html = html.replace('{{TIMESTAMP}}', new Date().toLocaleString());
    html = html.replace('{{STYLES}}', `<style>${reportStyles}</style>`);
    
    // Generate metrics section
    const metricsHTML = `
      <div class="metrics-grid">
        <div class="metric-card">
          <h3>Total Commands</h3>
          <span class="metric-value">${metrics.totalCommands}</span>
        </div>
        <div class="metric-card">
          <h3>Errors</h3>
          <span class="metric-value error">${metrics.errors}</span>
        </div>
        <div class="metric-card">
          <h3>Warnings</h3>
          <span class="metric-value warning">${metrics.warnings}</span>
        </div>
        <div class="metric-card">
          <h3>Session Duration</h3>
          <span class="metric-value">${(metrics.sessionDuration / 1000).toFixed(1)}s</span>
        </div>
      </div>
      
      <div class="commands-section">
        <h3>Top Commands</h3>
        <table class="commands-table">
          <thead>
            <tr><th>Command</th><th>Usage</th></tr>
          </thead>
          <tbody>
            ${metrics.mostUsedCommands.map(cmd => 
              `<tr><td>${cmd.command}</td><td>${cmd.count}</td></tr>`
            ).join('')}
          </tbody>
        </table>
      </div>
    `;
    
    html = html.replace('{{CONTENT}}', metricsHTML);
    
    return html;
  }
}

// Main execution
async function main() {
  try {
    // Initialize analyzer
    const analyzer = new PTYAnalyzer(analysisConfig, sessionsDB);
    
    // Analyze the PTY session
    const metrics = analyzer.analyzeSession(ptyLog);
    
    console.log('\n📊 Analysis Results:');
    console.log(`   Commands: ${metrics.totalCommands}`);
    console.log(`   Errors: ${metrics.errors}`);
    console.log(`   Warnings: ${metrics.warnings}`);
    console.log(`   Top command: ${metrics.mostUsedCommands[0]?.command || 'N/A'} (${metrics.mostUsedCommands[0]?.count || 0} times)`);
    
    // Save to embedded database
    const sessionId = analyzer.saveSession(metrics);
    console.log(`\n💾 Session saved with ID: ${sessionId}`);
    
    // Generate HTML report
    const reportHTML = analyzer.generateHTMLReport(metrics);
    await Bun.write('./pty-analysis-report.html', reportHTML);
    
    console.log('\n🎉 PTY Analysis Complete!');
    console.log('📄 Report generated: ./pty-analysis-report.html');
    console.log('\n🔥 Bun Loader Magic Used:');
    console.log('   • text loader - PTY log import');
    console.log('   • toml loader - Configuration parsing');
    console.log('   • sqlite loader - Embedded database');
    console.log('   • html loader - Template processing');
    console.log('   • text loader - CSS styling');
    
    // Show file hashes (demonstrating asset handling)
    const reportContent = await Bun.file('./pty-analysis-report.html').text();
    let hash = 0;
    for (let i = 0; i < reportContent.length; i++) {
      const char = reportContent.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    const reportHash = Math.abs(hash).toString(16);
    console.log(`\n🔐 Report hash: ${reportHash}`);
    
  } catch (error) {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  }
}

// Run the demo
if (import.meta.main) {
  main();
}
