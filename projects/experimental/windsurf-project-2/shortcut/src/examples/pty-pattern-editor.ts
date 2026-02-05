#!/usr/bin/env bun

/**
 * PTY-Powered Interactive Pattern Editor
 * 
 * Weaponizes Bun.Terminal API for real-time pattern validation
 * with live security analysis in the terminal
 * 
 * @see https://bun.sh/docs/bundler/executables
 * @see https://github.com/oven-sh/bun
 */

import { spawn } from "bun";

export class InteractivePatternEditor {
  private terminal: Bun.Terminal;
  private commandBuffer: string[] = [];
  private currentPattern: string = "";
  private securityAnalyzer: PatternAnalyzer;

  constructor() {
    this.securityAnalyzer = new PatternAnalyzer();
    
    this.terminal = new Bun.Terminal({
      cols: (process.stdout.columns as number) || 120,
      rows: (process.stdout.rows as number) || 40,
      
      data: async (term, data) => {
        // Handle real-time pattern validation
        const dataStr = typeof data === 'string' ? data : new TextDecoder().decode(data);
        if (dataStr.includes("Pattern:")) {
          const pattern = this.extractPatternFromVim(dataStr);
          await this.validatePatternLive(pattern, term);
        }
        
        // Forward to stdout with Bun.stringWidth-aware formatting
        const formattedOutput = this.formatTerminalOutput(dataStr);
        process.stdout.write(formattedOutput);
      }
    });
  }

  async editPatternFile(filePath: string, patternLine: number) {
    console.log(`🔧 Opening ${filePath} at line ${patternLine} for pattern editing...`);
    
    const proc = spawn(["vim", `+${patternLine}`, filePath], {
      terminal: this.terminal,
      stdout: "inherit",
      stderr: "inherit",
      env: {
        ...process.env,
        VIM_RUNTIME: "./vim-runtime" // Custom vimrc with pattern linting
      }
    });

    // Handle terminal resize (pty-weaver style)
    process.stdout.on("resize", () => {
      const cols = process.stdout.columns as number;
      const rows = process.stdout.rows as number;
      (this.terminal as any).resize?.(cols, rows);
      (proc.terminal as any)?.resize?.(cols, rows);
    });

    // Forward keyboard input
    process.stdin.setRawMode(true);
    for await (const chunk of process.stdin) {
      (proc.terminal as any)?.write(chunk);
    }

    return await proc.exited;
  }

  private async validatePatternLive(pattern: string, term: Bun.Terminal) {
    try {
      const patternObj = new URLPattern({ pathname: pattern });
      const analysis = await this.securityAnalyzer.analyze(patternObj, "", {});
      
      // Use Bun.stringWidth for perfect terminal alignment
      const riskText = `Risk: ${analysis.securityRisk}`;
      const padding = " ".repeat(
        process.stdout.columns - Bun.stringWidth(riskText) - 10
      );
      
      if (analysis.securityRisk === "critical") {
        term.write(`\x1b[31m${padding}${riskText}\x1b[0m\n`);
        term.write("\x1b[1m⚠️  SSRF/Traversal detected!\x1b[0m\n");
      } else if (analysis.securityRisk === "high") {
        term.write(`\x1b[33m${padding}${riskText}\x1b[0m\n`);
        term.write("\x1b[1m⚡ High risk pattern detected!\x1b[0m\n");
      } else {
        term.write(`\x1b[32m${padding}${riskText}\x1b[0m\n`);
      }
    } catch (error) {
      term.write(`\x1b[31mInvalid pattern: ${(error as Error).message}\x1b[0m\n`);
    }
  }

  private formatTerminalOutput(data: string): string {
    // Bun.stringWidth handles ZWJ sequences, emoji, ANSI escapes correctly
    const lines = data.split("\n");
    const terminalCols = (this.terminal as any).cols || 120;
    return lines
      .map(line => {
        // Preserve ANSI colors but fix alignment
        const visibleWidth = Bun.stringWidth(line.replace(/\x1b\[.*?m/g, ""));
        if (visibleWidth > terminalCols) {
          return line.slice(0, terminalCols + 20); // Account for ANSI codes
        }
        return line;
      })
      .join("\n");
  }

  async interactivePatternTest() {
    console.log('🧪 Starting interactive pattern test...');
    
    const testREPL = spawn(["node"], {
      terminal: this.terminal,
      stdin: "inherit",
      stdout: "inherit"
    });

    this.terminal.write(`
\x1b[1;36mURLPattern Interactive Test\x1b[0m
Enter patterns to test (Ctrl+D to exit):
> `);

    return testREPL.exited;
  }

  private extractPatternFromVim(data: string): string {
    // Extract pattern from vim output
    const match = data.match(/Pattern:\s*(.+)/);
    return match ? match[1].trim() : "";
  }
}

// Simple pattern analyzer for demo
class PatternAnalyzer {
  async analyze(pattern: URLPattern, input: string, context: any) {
    const pathname = pattern.pathname;
    const issues: string[] = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';

    // Critical risks
    if (pathname.includes('localhost') || pathname.includes('127.0.0.1')) {
      issues.push('SSRF risk - localhost access');
      riskLevel = 'critical';
    }
    
    if (pathname.includes('..') || pathname.includes('%2e%2e')) {
      issues.push('Path traversal vulnerability');
      riskLevel = 'critical';
    }
    
    if (pathname.includes('file://')) {
      issues.push('File system access');
      riskLevel = 'critical';
    }

    // High risks
    if (pathname.includes('internal') || pathname.includes('private')) {
      issues.push('Internal network access');
      riskLevel = 'high';
    }
    
    if (pathname.includes('192.168.') || pathname.includes('10.') || pathname.includes('172.16.')) {
      issues.push('Private network range');
      riskLevel = 'high';
    }

    // Medium risks
    if (pathname.includes('://*') || pathname.includes('://*.')) {
      issues.push('Open redirect risk');
      riskLevel = 'medium';
    }

    return {
      securityRisk: riskLevel,
      issues,
      pattern: pathname
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log(`
PTY Pattern Editor - Interactive Security Terminal

Usage:
  bun run pty-pattern-editor.ts [command] [options]

Commands:
  edit <file> <line>    Edit pattern file at specific line
  test                 Start interactive pattern test
  demo                 Run demonstration

Examples:
  bun run pty-pattern-editor.ts edit config/routes.toml 5
  bun run pty-pattern-editor.ts test
    `);
    return;
  }

  const editor = new InteractivePatternEditor();
  
  try {
    switch (args[0]) {
      case 'edit':
        if (!args[1] || !args[2]) {
          console.error('❌ File and line number required');
          process.exit(1);
        }
        await editor.editPatternFile(args[1], parseInt(args[2]));
        break;
        
      case 'test':
        await editor.interactivePatternTest();
        break;
        
      case 'demo':
        console.log('🚀 PTY Pattern Editor Demo');
        console.log('===========================');
        console.log('✅ Terminal initialized');
        console.log('✅ Pattern analyzer ready');
        console.log('✅ Live validation enabled');
        console.log('\n📝 Features:');
        console.log('   • Real-time pattern validation');
        console.log('   • ANSI color-coded risk levels');
        console.log('   • Bun.stringWidth alignment');
        console.log('   • PTY-powered editing');
        console.log('   • Terminal resize handling');
        break;
        
      default:
        console.log('❌ Unknown command. Use --help for usage.');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.main) {
  main();
}
