#!/usr/bin/env bun
// cli/commands/matrix-colors-test.ts

import { DesignSystem } from '../../terminal/src/design-system';
import { UnicodeTableFormatter, EmpireProDashboard } from '../../terminal/src/enhanced-unicode-formatter';

interface ColorOptions {
  colors: boolean;
  theme: 'empire' | 'duoplus' | 'default' | 'monochrome';
  scheme: 'status' | 'performance' | 'health' | 'all';
  format: 'terminal' | 'json' | 'csv' | 'html';
}

interface MatrixFlags {
  '--color'?: boolean | string;
  '--no-color'?: boolean | string;
  '--theme'?: string;
  '--scheme'?: string;
  '--format'?: string;
  '--empire'?: boolean | string;
  '--badges'?: boolean | string;
  '--status'?: boolean | string;
  '--performance'?: boolean | string;
}

class MatrixColorTest {
  private options: ColorOptions;
  private flags: MatrixFlags;

  constructor(argv: string[]) {
    this.flags = this.parseFlags(argv);
    this.options = this.parseColorOptions();
  }

  private parseFlags(argv: string[]): MatrixFlags {
    const flags: MatrixFlags = {};
    
    for (let i = 0; i < argv.length; i++) {
      const arg = argv[i];
      
      if (arg.startsWith('--')) {
        const [key, value] = arg.split('=', 2);
        
        if (value !== undefined) {
          (flags as any)[key] = value;
        } else {
          (flags as any)[key] = true;
        }
      }
    }
    
    return flags;
  }

  private parseColorOptions(): ColorOptions {
    return {
      colors: this.flags['--no-color'] === true ? false : (this.flags['--color'] !== false),
      theme: (this.flags['--theme'] as ColorOptions['theme']) || 
             (this.flags['--empire'] === true ? 'empire' : 'default'),
      scheme: (this.flags['--scheme'] as ColorOptions['scheme']) || 'all',
      format: (this.flags['--format'] as ColorOptions['format']) || 'terminal'
    };
  }

  private showColorHelp(): void {
    console.log(EmpireProDashboard.generateHeader(
      'EMPIRE PRO v3.7 MATRIX CLI - COLOR SYSTEM',
      'Advanced color-coded matrix display with Empire Pro integration'
    ));

    console.log(EmpireProDashboard.generateSection('COLOR FLAGS', '🎨'));
    
    const colorFlags = [
      { flag: '--color', description: 'Enable colors (default: enabled)', theme: 'All' },
      { flag: '--no-color', description: 'Disable all colors', theme: 'All' },
      { flag: '--theme=empire', description: 'Empire Pro v3.7 color theme', theme: 'Empire Pro' },
      { flag: '--theme=duoplus', description: 'DuoPlus status page colors', theme: 'DuoPlus' },
      { flag: '--theme=default', description: 'Default terminal colors', theme: 'Default' },
      { flag: '--theme=monochrome', description: 'No colors, monochrome output', theme: 'Minimal' },
      { flag: '--scheme=status', description: 'Status-based color coding', theme: 'Status' },
      { flag: '--scheme=performance', description: 'Performance-based color coding', theme: 'Performance' },
      { flag: '--scheme=health', description: 'Health-based color coding', theme: 'Health' },
      { flag: '--scheme=all', description: 'Full color scheme (default)', theme: 'Complete' }
    ];

    const flagTable = colorFlags.map(flag => ({
      Flag: flag.flag,
      Description: flag.description,
      Theme: flag.theme
    }));

    console.log(UnicodeTableFormatter.generateTable(flagTable, { maxWidth: 100 }));

    console.log(EmpireProDashboard.generateSection('EMPIRE PRO COLORS', '🚀'));
    
    const empireColors = [
      { Element: 'Status Colors', Operational: '🟢 #3b82f6', Degraded: '🟡 #3b82f6', Critical: '🔴 #3b82f6', Maintenance: '🔵 #3b82f6' },
      { Element: 'Background Colors', Primary: '#3b82f6', Secondary: '#3b82f6', Tertiary: '#3b82f6', Description: 'Dark theme' },
      { Element: 'Text Colors', Primary: '#3b82f6', Secondary: '#3b82f6', Muted: '#3b82f6', Description: 'Hierarchy' },
      { Element: 'Accent Colors', Blue: '#3b82f6', Green: '#3b82f6', Yellow: '#3b82f6', Red: '#3b82f6', Purple: '#3b82f6' }
    ];

    console.log(UnicodeTableFormatter.generateTable(empireColors, { maxWidth: 120 }));

    console.log(EmpireProDashboard.generateSection('USAGE EXAMPLES', '💡'));
    
    const examples = [
      { Command: 'bun run matrix-colors-test.ts --theme=empire', Description: 'Empire Pro v3.7 theme' },
      { Command: 'bun run matrix-colors-test.ts --scheme=status', Description: 'Status-based colors' },
      { Command: 'bun run matrix-colors-test.ts --empire --badges', Description: 'Empire Pro with badges' },
      { Command: 'bun run matrix-colors-test.ts --format=json --color', Description: 'JSON with colors' },
      { Command: 'bun run matrix-colors-test.ts --no-color', Description: 'Monochrome output' },
      { Command: 'bun run matrix-colors-test.ts --theme=duoplus --scheme=health', Description: 'DuoPlus health theme' }
    ];

    console.log(UnicodeTableFormatter.generateTable(examples, { maxWidth: 100 }));
    console.log(EmpireProDashboard.generateFooter());
  }

  private createTestData(): any[] {
    return [
      {
        Component: 'TimeSeries Aggregator',
        Status: 'operational',
        Version: '4.2.0',
        Health: '99.9%',
        Performance: '<30ms',
        Type: 'DuoPlus',
        Integration: 'Complete'
      },
      {
        Component: 'Agent Isolator',
        Status: 'operational',
        Version: '4.2.0',
        Health: '100%',
        Performance: '<25ms',
        Type: 'Empire Pro',
        Integration: 'Active'
      },
      {
        Component: 'Performance Tracker',
        Status: 'degraded',
        Version: '4.2.0-beta',
        Health: '95%',
        Performance: '~45ms',
        Type: 'Empire Pro',
        Integration: 'In Progress'
      },
      {
        Component: 'Container Manager',
        Status: 'operational',
        Version: '4.2.0',
        Health: '98%',
        Performance: '<35ms',
        Type: 'DuoPlus',
        Integration: 'Ready'
      },
      {
        Component: 'Status Server',
        Status: 'operational',
        Version: '1.2.4',
        Health: '99.5%',
        Performance: '<20ms',
        Type: 'DuoPlus',
        Integration: 'Complete'
      },
      {
        Component: 'Color System',
        Status: 'operational',
        Version: 'v3.7',
        Health: '100%',
        Performance: '<15ms',
        Type: 'Empire Pro',
        Integration: 'Complete'
      }
    ];
  }

  private applyColorScheme(data: any[]): any[] {
    if (!this.options.colors || this.options.theme === 'monochrome') {
      return data;
    }

    return data.map(row => {
      const coloredRow: any = {};
      
      Object.entries(row).forEach(([key, value]) => {
        if (typeof value === 'string') {
          coloredRow[key] = this.colorizeValue(key, value);
        } else {
          coloredRow[key] = value;
        }
      });
      
      return coloredRow;
    });
  }

  private colorizeValue(key: string, value: string): string {
    if (!this.options.colors) return value;

    const lowerValue = value.toLowerCase();
    const lowerKey = key.toLowerCase();

    // Status-based coloring
    if (this.options.scheme === 'status' || this.options.scheme === 'all') {
      if (lowerValue.includes('operational') || lowerValue.includes('healthy') || lowerValue.includes('active')) {
        return UnicodeTableFormatter.colorize(value, DesignSystem.status.operational);
      }
      if (lowerValue.includes('degraded') || lowerValue.includes('warning') || lowerValue.includes('pending')) {
        return UnicodeTableFormatter.colorize(value, DesignSystem.status.degraded);
      }
      if (lowerValue.includes('downtime') || lowerValue.includes('critical') || lowerValue.includes('error')) {
        return UnicodeTableFormatter.colorize(value, DesignSystem.status.downtime);
      }
      if (lowerValue.includes('maintenance') || lowerValue.includes('updating') || lowerValue.includes('progress')) {
        return UnicodeTableFormatter.colorize(value, DesignSystem.status.maintenance);
      }
    }

    // Performance-based coloring
    if (this.options.scheme === 'performance' || this.options.scheme === 'all') {
      if (lowerKey.includes('performance') || lowerKey.includes('response') || lowerKey.includes('speed')) {
        if (lowerValue.includes('<30ms') || lowerValue.includes('fast') || lowerValue.includes('optimal')) {
          return UnicodeTableFormatter.colorize(value, DesignSystem.status.operational);
        }
        if (lowerValue.includes('30-100ms') || lowerValue.includes('moderate')) {
          return UnicodeTableFormatter.colorize(value, DesignSystem.status.degraded);
        }
        if (lowerValue.includes('>100ms') || lowerValue.includes('slow')) {
          return UnicodeTableFormatter.colorize(value, DesignSystem.status.downtime);
        }
      }
    }

    // Health-based coloring
    if (this.options.scheme === 'health' || this.options.scheme === 'all') {
      if (lowerKey.includes('health') || lowerKey.includes('uptime')) {
        if (lowerValue.includes('99%') || lowerValue.includes('100%') || lowerValue.includes('excellent')) {
          return UnicodeTableFormatter.colorize(value, DesignSystem.status.operational);
        }
        if (lowerValue.includes('95-98%') || lowerValue.includes('good')) {
          return UnicodeTableFormatter.colorize(value, DesignSystem.status.degraded);
        }
        if (lowerValue.includes('<95%') || lowerValue.includes('poor')) {
          return UnicodeTableFormatter.colorize(value, DesignSystem.status.downtime);
        }
      }
    }

    // Theme-specific coloring
    if (this.options.theme === 'empire') {
      if (lowerKey.includes('agent') || lowerKey.includes('container')) {
        return UnicodeTableFormatter.colorize(value, DesignSystem.text.accent.purple);
      }
      if (lowerKey.includes('api') || lowerKey.includes('service')) {
        return UnicodeTableFormatter.colorize(value, DesignSystem.text.accent.blue);
      }
      if (lowerKey.includes('performance') || lowerKey.includes('metrics')) {
        return UnicodeTableFormatter.colorize(value, DesignSystem.text.accent.green);
      }
    }

    if (this.options.theme === 'duoplus') {
      if (lowerKey.includes('duoplus') || lowerKey.includes('bun')) {
        return UnicodeTableFormatter.colorize(value, DesignSystem.text.accent.blue);
      }
      if (lowerKey.includes('workspace') || lowerKey.includes('catalog')) {
        return UnicodeTableFormatter.colorize(value, DesignSystem.text.accent.green);
      }
      if (lowerKey.includes('performance') || lowerValue.includes('speed')) {
        return UnicodeTableFormatter.colorize(value, DesignSystem.text.accent.yellow);
      }
    }

    return value;
  }

  private generateBadges(data: any[]): string[] {
    if (!this.flags['--badges']) return [];

    return data.map((row, index) => {
      const status = this.extractStatus(row);
      const badge = this.generateStatusBadge(status, index);
      return badge;
    });
  }

  private extractStatus(row: any): string {
    const statusColumns = ['status', 'health', 'state', 'condition'];
    
    for (const col of statusColumns) {
      if (row[col] && typeof row[col] === 'string') {
        return row[col].toLowerCase();
      }
    }
    
    return 'unknown';
  }

  private generateStatusBadge(status: string, index: number): string {
    const colors: Record<string, string> = {
      'operational': DesignSystem.status.operational,
      'healthy': DesignSystem.status.operational,
      'active': DesignSystem.status.operational,
      'degraded': DesignSystem.status.degraded,
      'warning': DesignSystem.status.degraded,
      'pending': DesignSystem.status.degraded,
      'downtime': DesignSystem.status.downtime,
      'critical': DesignSystem.status.downtime,
      'error': DesignSystem.status.downtime,
      'maintenance': DesignSystem.status.maintenance,
      'updating': DesignSystem.status.maintenance,
      'progress': DesignSystem.status.maintenance
    };

    const color = colors[status] || DesignSystem.status.maintenance;
    const label = `ITEM-${index + 1}`;
    const value = status.toUpperCase();

    return `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="20">
      <rect width="120" height="20" fill="#555" rx="3"/>
      <rect x="60" width="60" height="20" fill="${color}" rx="3"/>
      <text x="10" y="14" fill="#fff" font-family="Arial, sans-serif" font-size="10">${label}</text>
      <text x="90" y="14" fill="#fff" font-family="Arial, sans-serif" font-size="10">${value}</text>
    </svg>`;
  }

  async run(): Promise<void> {
    // Show help if requested
    if (process.argv.includes('--help') || process.argv.includes('-h')) {
      this.showColorHelp();
      return;
    }

    console.log(EmpireProDashboard.generateHeader(
      'EMPIRE PRO v3.7 ENHANCED MATRIX',
      `Theme: ${this.options.theme} | Colors: ${this.options.colors ? 'Enabled' : 'Disabled'} | Scheme: ${this.options.scheme}`
    ));

    try {
      // Create test data
      const data = this.createTestData();

      console.log(UnicodeTableFormatter.colorize(`📂 Generated ${data.length} test entries`, DesignSystem.text.accent.blue));

      // Apply color scheme
      const coloredData = this.applyColorScheme(data);

      // Display matrix with colors
      if (this.options.format === 'terminal') {
        console.log(UnicodeTableFormatter.generateTable(coloredData, { maxWidth: 120 }));
      }

      // Generate badges if requested
      if (this.flags['--badges']) {
        console.log(EmpireProDashboard.generateSection('STATUS BADGES', '🏷️'));
        const badges = this.generateBadges(data);
        badges.forEach((badge, index) => {
          console.log(`Badge ${index + 1}: ${badge.substring(0, 50)}...`);
        });
      }

      // Show Empire Pro status if enabled
      if (this.flags['--empire'] || this.flags['--status']) {
        console.log(EmpireProDashboard.generateSection('EMPIRE PRO STATUS', '🚀'));
        
        const empireStatus = [
          { Component: 'Color System', Status: '🟢 OPERATIONAL', Version: 'v3.7', Integration: 'Complete' },
          { Component: 'Matrix Display', Status: '🟢 OPERATIONAL', Version: 'Enhanced', Integration: 'Active' },
          { Component: 'Badge Generation', Status: '🟢 OPERATIONAL', Version: 'Dynamic', Integration: 'Working' },
          { Component: 'Theme System', Status: '🟢 OPERATIONAL', Version: 'Multi-theme', Integration: 'Ready' }
        ];

        console.log(UnicodeTableFormatter.generateTable(empireStatus, { maxWidth: 100 }));
      }

      console.log(EmpireProDashboard.generateFooter());

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(UnicodeTableFormatter.colorize(`❌ Error: ${errorMessage}`, DesignSystem.status.downtime));
      process.exit(1);
    }
  }
}

// Main execution
async function main() {
  const cli = new MatrixColorTest(process.argv.slice(2));
  await cli.run();
}

main().catch(err => {
  console.error(UnicodeTableFormatter.colorize(`❌ Fatal Error: ${err.message}`, DesignSystem.status.downtime));
  process.exit(1);
});
