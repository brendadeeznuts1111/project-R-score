#!/usr/bin/env bun
/**
 * Sixel Graphics Support v4.4 - FactoryWager Unicode Governance
 * Native sixel graphics for inline charts and visualizations
 */

interface SixelConfig {
  enabled: boolean;
  maxCells: string;
  fallback: 'ansi-bars';
  chartTypes: string[];
}

interface ChartData {
  value: number;
  label?: string;
  color?: string;
}

export class SixelGraphicsEngine {
  private config: SixelConfig;
  private terminalSupportsSixel: boolean;

  constructor(config: SixelConfig) {
    this.config = config;
    this.terminalSupportsSixel = this.detectSixelSupport();
  }

  /**
   * Detect if terminal supports sixel graphics
   */
  private detectSixelSupport(): boolean {
    // Check common environment variables
    const term = process.env.TERM || '';
    const termProgram = process.env.TERM_PROGRAM || '';
    
    // Known sixel-capable terminals
    const sixelTerminals = [
      'xterm-256color',
      'mlterm',
      'foot',
      'alacritty',
      'kitty',
      'wezterm'
    ];
    
    const isSupported = sixelTerminals.some(t => term.includes(t)) || 
                       termProgram.includes('vscode') ||
                       process.env.VTE_VERSION !== undefined;
    
    return isSupported && this.config.enabled;
  }

  /**
   * Generate ANSI progress bar as fallback
   */
  private generateANSIBar(value: number, max: number, width: number = 10): string {
    const percentage = Math.min(1, Math.max(0, value / max));
    const filled = Math.floor(percentage * width);
    const empty = width - filled;
    
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    return `${bar} ${(percentage * 100).toFixed(0)}%`;
  }

  /**
   * Generate simple sixel sparkline (placeholder implementation)
   * Real sixel implementation would require binary sixel encoding
   */
  private generateSixelSparkline(data: ChartData[], width: number = 20): string {
    if (!this.terminalSupportsSixel) {
      return this.generateANSISparkline(data, width);
    }

    // Placeholder for real sixel implementation
    // In a real implementation, this would:
    // 1. Convert data to bitmap
    // 2. Encode as sixel format
    // 3. Wrap with proper escape sequences
    
    const max = Math.max(...data.map(d => d.value));
    const sparkline = data.map(d => {
      const height = Math.ceil((d.value / max) * 3);
      return '▁▂▃▄▅▆▇█'[height - 1] || ' ';
    }).join('');
    
    return `\x1bP0;1;0;0;0#0;2;0;0;0#1;2;100;100;0#2;2;0;100;0${sparkline}\x1b\\`;
  }

  /**
   * Generate ANSI sparkline fallback
   */
  private generateANSISparkline(data: ChartData[], width: number = 20): string {
    const max = Math.max(...data.map(d => d.value));
    const sparkline = data.map(d => {
      const height = Math.ceil((d.value / max) * 8);
      return ' ▁▂▃▄▅▆▇█'[height] || ' ';
    }).join('');
    
    return sparkline;
  }

  /**
   * Generate sixel mini bar chart
   */
  private generateSixelBarChart(data: ChartData[], width: number = 30): string {
    if (!this.terminalSupportsSixel) {
      return this.generateANSIBarChart(data, width);
    }

    // Placeholder implementation
    const max = Math.max(...data.map(d => d.value));
    const bars = data.map(d => {
      const barWidth = Math.ceil((d.value / max) * width);
      return '█'.repeat(barWidth).padEnd(width);
    });
    
    return bars.join('\n');
  }

  /**
   * Generate ANSI bar chart fallback
   */
  private generateANSIBarChart(data: ChartData[], width: number = 30): string {
    const max = Math.max(...data.map(d => d.value));
    const bars = data.map(d => {
      const barWidth = Math.ceil((d.value / max) * width);
      const percentage = ((d.value / max) * 100).toFixed(0);
      const bar = '█'.repeat(barWidth).padEnd(width);
      const label = d.label || '';
      return `${label.padEnd(10)} ${bar} ${percentage}%`;
    });
    
    return bars.join('\n');
  }

  /**
   * Generate trend indicator
   */
  private generateTrendIndicator(current: number, previous: number): string {
    const change = current - previous;
    const percentage = previous > 0 ? (change / previous) * 100 : 0;
    
    if (change > 0) {
      return `📈 +${percentage.toFixed(1)}%`;
    } else if (change < 0) {
      return `📉 ${percentage.toFixed(1)}%`;
    } else {
      return `➡️ 0.0%`;
    }
  }

  /**
   * Main chart generation method
   */
  generateChart(
    type: string,
    data: ChartData[],
    options: { width?: number; height?: number; previous?: number } = {}
  ): string {
    const width = options.width || 20;
    
    switch (type) {
      case 'sparkline':
        return this.generateSixelSparkline(data, width);
      
      case 'progress-bar':
        if (data.length === 1) {
          const max = options.previous || 100;
          return this.generateANSIBar(data[0].value, max, width);
        }
        return this.generateANSIBarChart(data, width);
      
      case 'mini-bar':
        return this.generateSixelBarChart(data, width);
      
      case 'trend-indicator':
        if (data.length === 2 && options.previous !== undefined) {
          return this.generateTrendIndicator(data[0].value, options.previous);
        }
        return '➡️ No trend data';
      
      default:
        return `❓ Unknown chart type: ${type}`;
    }
  }

  /**
   * Get terminal capabilities
   */
  getCapabilities(): { supportsSixel: boolean; terminal: string; fallback: string } {
    return {
      supportsSixel: this.terminalSupportsSixel,
      terminal: process.env.TERM || 'unknown',
      fallback: this.config.fallback
    };
  }

  /**
   * Test sixel support with simple pattern
   */
  testSixelSupport(): void {
    console.info('🎨 Sixel Graphics Test v4.4');
    console.info('==========================');
    
    const capabilities = this.getCapabilities();
    console.info(`Terminal: ${capabilities.terminal}`);
    console.info(`Sixel Support: ${capabilities.supportsSixel ? '✅ YES' : '❌ NO'}`);
    console.info(`Fallback Mode: ${capabilities.fallback}`);
    console.info();
    
    // Test different chart types
    const testData: ChartData[] = [
      { value: 30, label: 'Item A' },
      { value: 70, label: 'Item B' },
      { value: 45, label: 'Item C' },
      { value: 90, label: 'Item D' }
    ];
    
    console.info('📊 Sparkline:');
    console.info(this.generateChart('sparkline', testData, { width: 15 }));
    console.info();
    
    console.info('📊 Progress Bar:');
    console.info(this.generateChart('progress-bar', [{ value: 75 }], { width: 20 }));
    console.info();
    
    console.info('📊 Mini Bar Chart:');
    console.info(this.generateChart('mini-bar', testData, { width: 25 }));
    console.info();
    
    console.info('📊 Trend Indicator:');
    console.info(this.generateChart('trend-indicator', [{ value: 85 }], { previous: 70 }));
    console.info();
  }
}

// CLI execution
if (import.meta.main) {
  const config: SixelConfig = {
    enabled: true,
    maxCells: '80×24',
    fallback: 'ansi-bars',
    chartTypes: ['sparkline', 'progress-bar', 'mini-bar', 'trend-indicator']
  };

  const engine = new SixelGraphicsEngine(config);
  
  if (process.argv.includes('--test')) {
    engine.testSixelSupport();
  } else {
    const capabilities = engine.getCapabilities();
    console.info(`Sixel Support: ${capabilities.supportsSixel ? '✅' : '❌'}`);
    console.info(`Terminal: ${capabilities.terminal}`);
    console.info(`Fallback: ${capabilities.fallback}`);
  }
}

export { SixelConfig, ChartData };
