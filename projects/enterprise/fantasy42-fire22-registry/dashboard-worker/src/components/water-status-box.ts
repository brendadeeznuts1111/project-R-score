#!/usr/bin/env bun

/**
 * 🌊 Water System Status Box
 *
 * Creates beautiful ASCII-style status boxes for water system metrics
 * Can be used in terminal output or as styled HTML components
 *
 * @version 1.0.0
 */

export interface WaterMetrics {
  flowRate: number;
  flowUnit: string;
  temperature: number;
  temperatureUnit: string;
  pressure: number;
  pressureUnit: string;
  timestamp?: Date;
}

export interface StatusBoxOptions {
  title?: string;
  width?: number;
  style?: 'ascii' | 'unicode' | 'html';
  theme?: 'default' | 'ocean' | 'minimal';
  showTimestamp?: boolean;
}

/**
 * 🌊 Water Status Box Generator
 */
export class WaterStatusBox {
  /**
   * Generate ASCII/Unicode status box
   */
  static generateBox(metrics: WaterMetrics, options: StatusBoxOptions = {}): string {
    const {
      title = 'WATER SYSTEM',
      width = 55,
      style = 'unicode',
      theme = 'ocean',
      showTimestamp = false,
    } = options;

    if (style === 'html') {
      return this.generateHTMLBox(metrics, options);
    }

    const chars = this.getBoxChars(style);
    const titleLine = this.centerText(title, width - 4);
    const contentWidth = width - 4;

    // Format metrics
    const flowLine = this.formatMetricLine(
      '🌊 Flow Rate',
      `${metrics.flowRate} ${metrics.flowUnit}`,
      contentWidth
    );
    const tempLine = this.formatMetricLine(
      '🌡️ Temperature',
      `${metrics.temperature}${metrics.temperatureUnit}`,
      contentWidth
    );
    const pressureLine = this.formatMetricLine(
      '📊 Pressure',
      `${metrics.pressure} ${metrics.pressureUnit}`,
      contentWidth
    );

    let lines = [
      chars.topLeft + chars.horizontal.repeat(titleLine.length + 2) + chars.topRight,
      chars.vertical + ` ${titleLine} ` + chars.vertical,
      chars.leftT + chars.horizontal.repeat(titleLine.length + 2) + chars.rightT,
      chars.vertical + ` ${flowLine} ` + chars.vertical,
      chars.vertical + ` ${tempLine} ` + chars.vertical,
      chars.vertical + ` ${pressureLine} ` + chars.vertical,
    ];

    if (showTimestamp && metrics.timestamp) {
      const timestampLine = this.formatMetricLine(
        '⏰ Updated',
        metrics.timestamp.toLocaleTimeString(),
        contentWidth
      );
      lines.push(chars.vertical + ` ${timestampLine} ` + chars.vertical);
    }

    lines.push(
      chars.bottomLeft + chars.horizontal.repeat(titleLine.length + 2) + chars.bottomRight
    );

    return lines.join('\n');
  }

  /**
   * Generate HTML version of status box
   */
  static generateHTMLBox(metrics: WaterMetrics, options: StatusBoxOptions = {}): string {
    const { title = 'WATER SYSTEM', showTimestamp = false, theme = 'ocean' } = options;

    const themeClass = `water-status-${theme}`;
    const timestamp =
      showTimestamp && metrics.timestamp
        ? `<div class="metric-row"><span class="metric-icon">⏰</span><span class="metric-label">Updated:</span><span class="metric-value">${metrics.timestamp.toLocaleTimeString()}</span></div>`
        : '';

    return `
      <div class="water-status-box ${themeClass}">
        <div class="status-header">${title}</div>
        <div class="status-content">
          <div class="metric-row">
            <span class="metric-icon">🌊</span>
            <span class="metric-label">Flow Rate:</span>
            <span class="metric-value">${metrics.flowRate} ${metrics.flowUnit}</span>
          </div>
          <div class="metric-row">
            <span class="metric-icon">🌡️</span>
            <span class="metric-label">Temperature:</span>
            <span class="metric-value">${metrics.temperature}${metrics.temperatureUnit}</span>
          </div>
          <div class="metric-row">
            <span class="metric-icon">📊</span>
            <span class="metric-label">Pressure:</span>
            <span class="metric-value">${metrics.pressure} ${metrics.pressureUnit}</span>
          </div>
          ${timestamp}
        </div>
      </div>
    `;
  }

  /**
   * Generate CSS for HTML status box
   */
  static generateCSS(): string {
    return `
      .water-status-box {
        font-family: 'Courier New', monospace;
        border: 2px solid #007bff;
        border-radius: 8px;
        padding: 16px;
        background: linear-gradient(135deg, rgba(0, 123, 255, 0.1) 0%, rgba(0, 86, 179, 0.1) 100%);
        box-shadow: 0 4px 12px rgba(0, 123, 255, 0.2);
        max-width: 400px;
        margin: 16px auto;
      }
      
      .water-status-ocean {
        border-color: #00bcd4;
        background: linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(0, 150, 136, 0.1) 100%);
        box-shadow: 0 4px 12px rgba(0, 188, 212, 0.2);
      }
      
      .water-status-minimal {
        border-color: #6c757d;
        background: rgba(108, 117, 125, 0.1);
        box-shadow: 0 2px 8px rgba(108, 117, 125, 0.1);
      }
      
      .status-header {
        text-align: center;
        font-weight: bold;
        font-size: 14px;
        color: #007bff;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid rgba(0, 123, 255, 0.3);
        letter-spacing: 2px;
      }
      
      .water-status-ocean .status-header {
        color: #00bcd4;
        border-bottom-color: rgba(0, 188, 212, 0.3);
      }
      
      .status-content {
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      
      .metric-row {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 13px;
      }
      
      .metric-icon {
        font-size: 16px;
        width: 20px;
        text-align: center;
      }
      
      .metric-label {
        color: #6c757d;
        min-width: 100px;
      }
      
      .metric-value {
        color: #007bff;
        font-weight: bold;
        margin-left: auto;
      }
      
      .water-status-ocean .metric-value {
        color: #00bcd4;
      }
      
      .water-status-minimal .metric-value {
        color: #495057;
      }
      
      @media (max-width: 480px) {
        .water-status-box {
          margin: 8px;
          padding: 12px;
        }
        
        .metric-row {
          font-size: 12px;
        }
        
        .metric-label {
          min-width: 80px;
        }
      }
    `;
  }

  /**
   * Get box drawing characters based on style
   */
  private static getBoxChars(style: 'ascii' | 'unicode') {
    if (style === 'ascii') {
      return {
        topLeft: '+',
        topRight: '+',
        bottomLeft: '+',
        bottomRight: '+',
        horizontal: '-',
        vertical: '|',
        leftT: '+',
        rightT: '+',
      };
    }

    return {
      topLeft: '╭',
      topRight: '╮',
      bottomLeft: '╰',
      bottomRight: '╯',
      horizontal: '─',
      vertical: '│',
      leftT: '├',
      rightT: '┤',
    };
  }

  /**
   * Center text within given width
   */
  private static centerText(text: string, width: number): string {
    const padding = Math.max(0, width - text.length);
    const leftPad = Math.floor(padding / 2);
    const rightPad = padding - leftPad;
    return ' '.repeat(leftPad) + text + ' '.repeat(rightPad);
  }

  /**
   * Format a metric line with proper spacing
   */
  private static formatMetricLine(label: string, value: string, width: number): string {
    const totalContent = label + value;
    const spacing = Math.max(1, width - totalContent.length);
    return label + ' '.repeat(spacing) + value;
  }

  /**
   * Create real-time updating status box
   */
  static createLiveBox(
    container: HTMLElement,
    getMetrics: () => WaterMetrics,
    options: StatusBoxOptions = {},
    updateInterval: number = 5000
  ): () => void {
    const update = () => {
      const metrics = getMetrics();
      const html = this.generateHTMLBox(metrics, { ...options, style: 'html' });
      container.innerHTML = html;
    };

    // Initial render
    update();

    // Set up interval
    const interval = setInterval(update, updateInterval);

    // Return cleanup function
    return () => clearInterval(interval);
  }
}

/**
 * 🌊 Quick utility functions
 */
export const waterStatusUtils = {
  /**
   * Generate terminal-style status box
   */
  terminal: (metrics: WaterMetrics, title?: string): string => {
    return WaterStatusBox.generateBox(metrics, {
      title,
      style: 'unicode',
      theme: 'ocean',
      showTimestamp: true,
    });
  },

  /**
   * Generate HTML status box
   */
  html: (metrics: WaterMetrics, theme: 'default' | 'ocean' | 'minimal' = 'ocean'): string => {
    return WaterStatusBox.generateHTMLBox(metrics, {
      style: 'html',
      theme,
      showTimestamp: true,
    });
  },

  /**
   * Get CSS for styling
   */
  css: (): string => WaterStatusBox.generateCSS(),
};

// Example usage
if (import.meta.main) {
  const exampleMetrics: WaterMetrics = {
    flowRate: 85,
    flowUnit: 'L/min',
    temperature: 22,
    temperatureUnit: '°C',
    pressure: 120,
    pressureUnit: 'PSI',
    timestamp: new Date(),
  };

  console.log('🌊 Water Status Box Demo\n');

  // Terminal style
  console.log('Unicode Style:');
  console.log(waterStatusUtils.terminal(exampleMetrics));

  console.log('\nASCII Style:');
  console.log(WaterStatusBox.generateBox(exampleMetrics, { style: 'ascii' }));

  // HTML style
  console.log('\nHTML Version:');
  console.log(waterStatusUtils.html(exampleMetrics));
}
