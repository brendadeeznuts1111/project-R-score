/**
 * T3-Lattice Security Audit Utility
 * Performs deep dependency auditing and compliance reporting
 * Inspired by 'bun audit' and T3-Lattice v3.3 security standards
 */

import { $ } from "bun";

export type AuditLevel = "low" | "moderate" | "high" | "critical";

export interface AuditOptions {
  level?: AuditLevel;
  ignore?: string[];
  json?: boolean;
}

export class SecurityAudit {
  /**
   * Runs a security audit and returns a T3-Lattice compliant report
   */
  static async run(options: AuditOptions = {}): Promise<{ success: boolean; report: string; data?: any }> {
    const level = options.level || "low";
    const ignore = options.ignore || [];
    
    try {
      const auditOutput = await $`bun audit --json`.text();
      const data = JSON.parse(auditOutput);
      
      // Filter by level and ignore list
      const vulnerabilities = this.filterVulnerabilities(data.vulnerabilities || {}, level, ignore);
      const success = Object.keys(vulnerabilities).length === 0;

      if (options.json) {
        return { success, report: JSON.stringify({ success, vulnerabilities }, null, 2), data: { success, vulnerabilities } };
      }

      return {
        success,
        report: this.formatReport(success, vulnerabilities, level),
        data: { success, vulnerabilities }
      };
    } catch (error) {
      return { success: false, report: `error: Security audit failed - ${(error as Error).message}` };
    }
  }

  private static filterVulnerabilities(vulns: any, minLevel: AuditLevel, ignore: string[]): any {
    const levels: AuditLevel[] = ["low", "moderate", "high", "critical"];
    const minIdx = levels.indexOf(minLevel);
    
    const filtered: any = {};
    for (const [id, vuln] of Object.entries(vulns) as [string, any]) {
      const vulnLevel = vuln.severity as AuditLevel;
      const vulnIdx = levels.indexOf(vulnLevel);
      
      if (vulnIdx >= minIdx && !ignore.includes(id)) {
        filtered[id] = vuln;
      }
    }
    return filtered;
  }

  private static formatReport(success: boolean, vulnerabilities: any, level: string): string {
    if (success) {
      return `✅ No vulnerabilities found at level '${level}' or higher.`;
    }

    const count = Object.keys(vulnerabilities).length;
    let report = `❌ ${count} vulnerabilities found at level '${level}' or higher:\n`;
    
    for (const [id, vuln] of Object.entries(vulnerabilities) as [string, any]) {
      report += `   • [${vuln.severity.toUpperCase()}] ${vuln.name}: ${vuln.title} (${id})\n`;
    }
    
    return report.trim();
  }
}

// CLI Support
if (import.meta.main) {
  const args = Bun.argv.slice(2);
  const levelArg = args.find(a => a.startsWith("--level="))?.split("=")[1] as AuditLevel;
  const ignoreArg = args.find(a => a.startsWith("--ignore="))?.split("=")[1]?.split(",");
  
  SecurityAudit.run({ level: levelArg, ignore: ignoreArg }).then(result => {
    console.log("T3-Lattice Security Audit");
    console.log("=========================");
    console.log(result.report);
    process.exit(result.success ? 0 : 1);
  });
}
