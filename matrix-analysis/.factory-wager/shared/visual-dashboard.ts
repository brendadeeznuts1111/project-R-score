/**
 * FactoryWager Visual Dashboard Components
 * Shared visual elements for reality-aware dashboards
 */

export type SystemMode = "LIVE" | "SIMULATED" | "MIXED" | "UNKNOWN";

export interface ModeBadge {
  color: string;
  icon: string;
  text: string;
}

export class VisualDashboard {
  /**
   * Get mode badge styling and text
   */
  static getModeBadge(mode: SystemMode): ModeBadge {
    const badges: Record<SystemMode, ModeBadge> = {
      LIVE: { color: "#1ae66f", icon: "🌐", text: "LIVE PRODUCTION" },
      SIMULATED: { color: "#a855f7", icon: "💾", text: "LOCAL SIMULATION" },
      MIXED: { color: "#f44725", icon: "⚠️", text: "MIXED REALITY — RISK" },
      UNKNOWN: { color: "#6b7280", icon: "❓", text: "UNDETERMINED" }
    };
    return badges[mode] || badges.UNKNOWN;
  }

  /**
   * Generate reality status header for dashboards
   */
  static generateRealityHeader(mode: SystemMode, title: string = "REALITY STATUS"): string {
    const badge = this.getModeBadge(mode);
    return `
╔══════════════════════════════════════════════════════════════════╗
║  ${badge.icon} ${title} — ${badge.text.padEnd(25)} ║
╚══════════════════════════════════════════════════════════════════╝`;
  }

  /**
   * Generate nexus status header with mode badge
   */
  static generateNexusHeader(mode: SystemMode, score: number, endpoints: { up: number; total: number }): string {
    const badge = this.getModeBadge(mode);
    return `
╔══════════════════════════════════════════════════════════════════╗
║  🔌 ENDPOINT STATUS — ${badge.text.padEnd(28)} ║
║  Health: ${score}/100 | Endpoints: ${endpoints.up}/${endpoints.total} up          ║
╚══════════════════════════════════════════════════════════════════╝`;
  }

  /**
   * Generate deployment header with mode context
   */
  static generateDeploymentHeader(mode: SystemMode, target: string): string {
    const badge = this.getModeBadge(mode);
    return `
╔══════════════════════════════════════════════════════════════════╗
║  🚀 DEPLOYMENT TO ${target.padEnd(15)} — ${badge.text.padEnd(20)} ║
╚══════════════════════════════════════════════════════════════════╝`;
  }

  /**
   * Generate analysis header with mode context
   */
  static generateAnalysisHeader(mode: SystemMode, config: string): string {
    const badge = this.getModeBadge(mode);
    return `
╔══════════════════════════════════════════════════════════════════╗
║  📊 CONFIG ANALYSIS — ${config.padEnd(20)} — ${badge.text.padEnd(15)} ║
╚══════════════════════════════════════════════════════════════════╝`;
  }

  /**
   * Generate changelog header with mode context
   */
  static generateChangelogHeader(mode: SystemMode, fromRef: string, toRef: string): string {
    const badge = this.getModeBadge(mode);
    return `
╔══════════════════════════════════════════════════════════════════╗
║  📋 CHANGELOG ${fromRef} → ${toRef} — ${badge.text.padEnd(20)} ║
╚══════════════════════════════════════════════════════════════════╝`;
  }

  /**
   * Generate colored status indicator
   */
  static getStatusIndicator(status: 'healthy' | 'degraded' | 'critical' | 'unknown'): string {
    const indicators = {
      healthy: '\x1b[92m✓\x1b[0m',      // Green
      degraded: '\x1b[93m⚠\x1b[0m',     // Yellow
      critical: '\x1b[91m✗\x1b[0m',      // Red
      unknown: '\x1b[90m?\x1b[0m'        // Gray
    };
    return indicators[status] || indicators.unknown;
  }

  /**
   * Generate health score color
   */
  static getHealthColor(score: number): string {
    if (score >= 90) return '\x1b[92m';  // Green
    if (score >= 70) return '\x1b[93m';  // Yellow
    return '\x1b[91m';                  // Red
  }

  /**
   * Format health score with color
   */
  static formatHealthScore(score: number): string {
    const color = this.getHealthColor(score);
    const reset = '\x1b[0m';
    return `${color}${score}/100${reset}`;
  }

  /**
   * Generate separator line
   */
  static generateSeparator(title: string = ""): string {
    if (title) {
      const padding = Math.max(0, 70 - title.length - 4);
      const left = Math.floor(padding / 2);
      const right = padding - left;
      return `═${'═'.repeat(left)} ${title} ${'═'.repeat(right)}═`;
    }
    return '═'.repeat(72);
  }

  /**
   * Generate footer with timestamp
   */
  static generateFooter(timestamp: string, system: string = "FactoryWager"): string {
    return `
╚══════════════════════════════════════════════════════════════════╝
║  ${system} v1.3.8 | ${timestamp}                                   ║
╚══════════════════════════════════════════════════════════════════╝`;
  }

  /**
   * Generate warning box
   */
  static generateWarningBox(message: string): string {
    const lines = message.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const boxWidth = Math.max(60, maxLineLength + 4);
    
    let result = `\n┌${'─'.repeat(boxWidth - 2)}┐\n`;
    result += `│ ⚠️  WARNING${' '.repeat(boxWidth - 13)} │\n`;
    result += `├${'─'.repeat(boxWidth - 2)}┤\n`;
    
    lines.forEach(line => {
      result += `│ ${line.padEnd(boxWidth - 4)} │\n`;
    });
    
    result += `└${'─'.repeat(boxWidth - 2)}┘\n`;
    return result;
  }

  /**
   * Generate info box
   */
  static generateInfoBox(message: string): string {
    const lines = message.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const boxWidth = Math.max(60, maxLineLength + 4);
    
    let result = `\n┌${'─'.repeat(boxWidth - 2)}┐\n`;
    result += `│ 💡 INFO${' '.repeat(boxWidth - 11)} │\n`;
    result += `├${'─'.repeat(boxWidth - 2)}┤\n`;
    
    lines.forEach(line => {
      result += `│ ${line.padEnd(boxWidth - 4)} │\n`;
    });
    
    result += `└${'─'.repeat(boxWidth - 2)}┘\n`;
    return result;
  }

  /**
   * Generate success box
   */
  static generateSuccessBox(message: string): string {
    const lines = message.split('\n');
    const maxLineLength = Math.max(...lines.map(line => line.length));
    const boxWidth = Math.max(60, maxLineLength + 4);
    
    let result = `\n┌${'─'.repeat(boxWidth - 2)}┐\n`;
    result += `│ ✅ SUCCESS${' '.repeat(boxWidth - 13)} │\n`;
    result += `├${'─'.repeat(boxWidth - 2)}┤\n`;
    
    lines.forEach(line => {
      result += `│ ${line.padEnd(boxWidth - 4)} │\n`;
    });
    
    result += `└${'─'.repeat(boxWidth - 2)}┘\n`;
    return result;
  }
}
