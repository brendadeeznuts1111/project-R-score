#!/usr/bin/env bun
// packages/terminal/src/enhanced-unicode-formatter.ts

import { DesignSystem, ANSI_COLORS } from './design-system';

export class UnicodeTableFormatter {
  private static readonly RESET = '\x1b[0m';

  static formatStatus(status: string): string {
    const statusMap: Record<string, { emoji: string; color: string }> = {
      'healthy': { emoji: '🟢', color: DesignSystem.status.operational },
      'operational': { emoji: '🟢', color: DesignSystem.status.operational },
      'degraded': { emoji: '🟡', color: DesignSystem.status.degraded },
      'unhealthy': { emoji: '🔴', color: DesignSystem.status.downtime },
      'downtime': { emoji: '🔴', color: DesignSystem.status.downtime },
      'maintenance': { emoji: '🔵', color: DesignSystem.status.maintenance },
      'no_data': { emoji: '⚪', color: DesignSystem.text.muted },
      'unknown': { emoji: '❓', color: DesignSystem.text.muted }
    };

    const config = statusMap[status] || statusMap['unknown'];
    return `${this.colorize(config.emoji, config.color)} ${status}`;
  }

  static formatSeverity(severity: string): string {
    const severityMap: Record<string, { emoji: string; color: string }> = {
      'critical': { emoji: '🔴', color: DesignSystem.status.downtime },
      'high': { emoji: '🟠', color: '#3b82f6' },
      'medium': { emoji: '🟡', color: DesignSystem.status.degraded },
      'low': { emoji: '🟢', color: DesignSystem.status.operational }
    };

    const config = severityMap[severity] || { emoji: '⚪', color: DesignSystem.text.muted };
    return `${this.colorize(config.emoji, config.color)} ${severity.toUpperCase()}`;
  }

  static colorize(text: string, hexColor: string): string {
    const ansiCode = ANSI_COLORS[hexColor as keyof typeof ANSI_COLORS] || '';
    return ansiCode ? `${ansiCode}${text}${this.RESET}` : text;
  }

  static generateTable(data: any[], options: { maxWidth?: number; compact?: boolean } = {}): string {
    if (data.length === 0) return 'No data';

    const headers = Object.keys(data[0]);
    const columnWidths = this.calculateColumnWidths(data, headers, options.maxWidth || 80);

    let output = '';
    
    // Header with accent color
    headers.forEach((header, i) => {
      const padded = header.padEnd(columnWidths[i]);
      output += this.colorize(padded, DesignSystem.text.accent.blue);
      output += i < headers.length - 1 ? '  ' : '\n';
    });

    // Separator
    output += this.colorize(
      '─'.repeat(columnWidths.reduce((a, b) => a + b + 2, -2)),
      DesignSystem.text.muted
    ) + '\n';

    // Data rows
    data.forEach(row => {
      headers.forEach((header, i) => {
        const value = String(row[header] || '');
        const displayValue = value.length > columnWidths[i] - 2
          ? value.substring(0, columnWidths[i] - 5) + '...'
          : value;
        
        output += displayValue.padEnd(columnWidths[i]);
        output += i < headers.length - 1 ? '  ' : '\n';
      });
    });

    return output;
  }

  private static calculateColumnWidths(data: any[], headers: string[], maxWidth: number): number[] {
    const colWidths = headers.map(h => 
      Math.max(
        h.length,
        ...data.map(row => String(row[h] || '').length)
      )
    );

    const totalWidth = colWidths.reduce((a, b) => a + b + 2, -2);
    if (totalWidth > maxWidth) {
      const scale = (maxWidth - (headers.length - 1) * 2) / (totalWidth - (headers.length - 1) * 2);
      return colWidths.map(w => Math.max(8, Math.floor(w * scale)));
    }

    return colWidths;
  }

  static generateSystemMatrix(components: any[]): string {
    const matrixData = components.map(component => ({
      Component: component.name,
      Status: component.status,
      Version: component.version,
      Health: component.health,
      Performance: component.performance,
      Notes: component.notes
    }));

    return this.generateTable(matrixData, { maxWidth: 120 });
  }

  static generateAgentStatus(agents: any[]): string {
    const agentData = agents.map(agent => ({
      Agent: agent.id,
      Status: this.formatStatus(agent.status),
      Containers: this.colorize(
        agent.containers.toString(),
        agent.containers > 1 ? DesignSystem.status.operational : DesignSystem.text.secondary
      ),
      'Last Active': agent.lastActive,
      Uptime: this.colorize(
        agent.uptime,
        agent.uptime.includes('100%') ? DesignSystem.status.operational : DesignSystem.status.degraded
      )
    }));

    return this.generateTable(agentData, { maxWidth: 100 });
  }
}

export class SVGBadgeGenerator {
  static generateStatusBadge(status: string, label: string = 'STATUS'): string {
    const color = this.getStatusColor(status);
    return this.createSVGBadge(label, status.toUpperCase(), color);
  }

  static generateAgentBadge(agentId: string, status: string): string {
    const color = this.getStatusColor(status);
    return this.createSVGBadge('AGENT', agentId, color);
  }

  static generateDuoPlusBadge(type: string, value: string): string {
    const colorMap: Record<string, string> = {
      'health': DesignSystem.duoplus.health,
      'performance': DesignSystem.duoplus.performance,
      'api': DesignSystem.duoplus.api,
      'domain': DesignSystem.duoplus.domain,
      'alerts': DesignSystem.duoplus.alerts
    };
    
    const color = colorMap[type] || DesignSystem.status.operational;
    return this.createSVGBadge(type.toUpperCase(), value, color);
  }

  private static getStatusColor(status: string): string {
    const colorMap: Record<string, string> = {
      'healthy': DesignSystem.svg.greenBadge,
      'operational': DesignSystem.svg.greenBadge,
      'degraded': DesignSystem.svg.yellowBadge,
      'maintenance': DesignSystem.svg.blueBadge,
      'unhealthy': DesignSystem.svg.redBadge,
      'downtime': DesignSystem.svg.redBadge,
      'critical': DesignSystem.svg.redBadge
    };
    return colorMap[status] || DesignSystem.svg.blueBadge;
  }

  private static createSVGBadge(label: string, value: string, color: string): string {
    const labelWidth = label.length * 7 + 12;
    const valueWidth = value.length * 7 + 12;
    const totalWidth = labelWidth + valueWidth;

    return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20">
      <defs>
        <linearGradient id="smooth" x2="0" y2="100%">
          <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
          <stop offset="1" stop-opacity=".1"/>
        </linearGradient>
      </defs>
      
      <!-- Label background -->
      <rect x="0" y="0" width="${labelWidth}" height="20" fill="#555" rx="3"/>
      
      <!-- Value background -->
      <rect x="${labelWidth}" y="0" width="${valueWidth}" height="20" fill="${color}" rx="3"/>
      
      <!-- Shadow effect -->
      <rect x="0" y="0" width="${totalWidth}" height="20" fill="url(#smooth)" rx="3"/>
      
      <!-- Text -->
      <text x="10" y="14" fill="#fff" font-family="Arial, sans-serif" font-size="10" font-weight="bold">${label}</text>
      <text x="${labelWidth + 10}" y="14" fill="#fff" font-family="Arial, sans-serif" font-size="10" font-weight="bold">${value}</text>
    </svg>`;
  }
}

export class EmpireProDashboard {
  static generateHeader(title: string, subtitle?: string): string {
    let output = '';
    
    // Main title
    output += UnicodeTableFormatter.colorize(
      `🚀 ${title}`,
      DesignSystem.text.accent.purple
    ) + '\n';
    
    // Separator
    output += UnicodeTableFormatter.colorize(
      '='.repeat(80),
      DesignSystem.text.accent.purple
    ) + '\n';
    
    // Subtitle if provided
    if (subtitle) {
      output += UnicodeTableFormatter.colorize(
        subtitle,
        DesignSystem.text.secondary
      ) + '\n';
    }
    
    // Timestamp
    const now = new Date().toLocaleString();
    output += UnicodeTableFormatter.colorize(
      `📅 ${now} | Bun v${process.version || '1.3.6'}`,
      DesignSystem.text.secondary
    ) + '\n\n';
    
    return output;
  }

  static generateSection(title: string, icon: string = '📊'): string {
    const sectionTitle = UnicodeTableFormatter.colorize(
      `${icon} ${title}`,
      DesignSystem.text.accent.blue
    );
    const separator = UnicodeTableFormatter.colorize(
      '─'.repeat(40),
      DesignSystem.text.muted
    );
    
    return `${sectionTitle}\n${separator}\n`;
  }

  static generateFooter(): string {
    return (
      UnicodeTableFormatter.colorize(
        '='.repeat(80),
        DesignSystem.text.muted
      ) + '\n' +
      UnicodeTableFormatter.colorize(
        '🔁 Auto-updating every 5 seconds | Press Ctrl+C to stop',
        DesignSystem.text.secondary
      )
    );
  }
}

export default {
  UnicodeTableFormatter,
  SVGBadgeGenerator,
  EmpireProDashboard,
  DesignSystem
};
