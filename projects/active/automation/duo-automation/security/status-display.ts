// security/status-display.ts
export class SecurityStatusDisplay {
  /**
   * Display security status with flags and emoji
   */
  static displayStatus(domain: string, checks: SecurityCheck[]): string {
    let output = '\n';
    output += this.createDomainHeader(domain);
    output += '\n';
    
    checks.forEach(check => {
      output += this.formatCheck(check);
    });
    
    output += this.createSummary(checks);
    
    return output;
  }

  private static createDomainHeader(domain: string): string {
    // Extract country code from domain for flag emoji
    const tld = domain.split('.').pop()?.toUpperCase();
    const flag = tld && tld.length === 2 
      ? this.countryCodeToFlag(tld)
      : '🌐';
    
    const header = `${flag} Security Status: ${domain}`;
    const width = Bun.stringWidth(header) + 4;
    
    return '╔' + '═'.repeat(width) + '╗\n' +
           `║  ${header}  ║\n` +
           '╚' + '═'.repeat(width) + '╝';
  }

  private static countryCodeToFlag(code: string): string {
    // Convert ISO country code to flag emoji
    const offset = 127397; // Unicode offset for regional indicator symbols
    return String.fromCodePoint(
      ...code.split('').map(c => c.charCodeAt(0) + offset)
    );
  }

  private static formatCheck(check: SecurityCheck): string {
    const statusIcons = {
      PASS: '✅',
      FAIL: '❌',
      WARN: '⚠️',
      INFO: 'ℹ️',
      SKIP: '⏭️'
    };
    
    const icon = statusIcons[check.status];
    const indent = check.level > 0 ? '  '.repeat(check.level) : '';
    const bullet = check.level === 0 ? '•' : '◦';
    
    // Format message with appropriate colors
    let message = check.message;
    if (check.status === 'FAIL') {
      message = `\x1b[31m${message}\x1b[0m`;
    } else if (check.status === 'WARN') {
      message = `\x1b[33m${message}\x1b[0m`;
    }
    
    const line = `${indent}${bullet} ${icon} ${message}`;
    
    // Add details if present
    let details = '';
    if (check.details) {
      const detailLines = check.details.split('\n').map(d => 
        `${indent}    ${d}` 
      ).join('\n');
      details = '\n' + detailLines;
    }
    
    return line + details + '\n';
  }

  private static createSummary(checks: SecurityCheck[]): string {
    const counts = {
      total: checks.length,
      pass: checks.filter(c => c.status === 'PASS').length,
      fail: checks.filter(c => c.status === 'FAIL').length,
      warn: checks.filter(c => c.status === 'WARN').length
    };
    
    const passRate = ((counts.pass / counts.total) * 100).toFixed(1);
    
    let summary = '\n' + '─'.repeat(40) + '\n';
    summary += '📊 CHECK SUMMARY\n';
    summary += `Total: ${counts.total}\n`;
    summary += `Pass: ${counts.pass} ✅\n`;
    summary += `Fail: ${counts.fail} ❌\n`;
    summary += `Warn: ${counts.warn} ⚠️\n`;
    summary += `Pass Rate: ${passRate}%\n`;
    summary += '─'.repeat(40);
    
    return summary;
  }

  /**
   * Create ASCII art security badge
   */
  static createSecurityBadge(
    score: number,
    maxScore: number = 100
  ): string {
    const percentage = (score / maxScore) * 100;
    
    // Choose badge style based on score
    let badge = '';
    
    if (percentage >= 90) {
      badge = `
      ╔═══════════════════════╗
      ║   🛡️ SECURE 🛡️   ║
      ║   Score: ${score.toString().padStart(3)}/${maxScore}   ║
      ║   ${'█'.repeat(10)}   ║
      ╚═══════════════════════╝
      `;
    } else if (percentage >= 70) {
      badge = `
      ╔═══════════════════════╗
      ║   🟡 MODERATE 🟡   ║
      ║   Score: ${score.toString().padStart(3)}/${maxScore}   ║
      ║   ${'█'.repeat(7)}${'░'.repeat(3)}   ║
      ╚═══════════════════════╝
      `;
    } else {
      badge = `
      ╔═══════════════════════╗
      ║   🔴 INSECURE 🔴   ║
      ║   Score: ${score.toString().padStart(3)}/${maxScore}   ║
      ║   ${'█'.repeat(3)}${'░'.repeat(7)}   ║
      ╚═══════════════════════╝
      `;
    }
    
    return badge;
  }
}

interface SecurityCheck {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN' | 'INFO' | 'SKIP';
  message: string;
  details?: string;
  level: number;
}
