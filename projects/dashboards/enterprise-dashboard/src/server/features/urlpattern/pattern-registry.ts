/**
 * Pattern registry for URLPattern analysis results.
 */

import type { PatternAnalysis, ProxyPattern } from "./types";
import { ANALYZER_CONFIG } from "./constants";

export class PatternRegistry {
  private patterns = new Map<string, PatternAnalysis>();
  private execResults = new Map<string, URLPatternResult>();
  private proxyPatterns = new Map<string, ProxyPattern>();

  add(pattern: string | URLPatternInit, analysis: PatternAnalysis) {
    const key = typeof pattern === "string" ? pattern : JSON.stringify(pattern);
    this.patterns.set(key, analysis);

    if (analysis.execAnalysis.execResult) {
      this.execResults.set(key, analysis.execAnalysis.execResult);
    }
  }

  getAll(): PatternAnalysis[] {
    return Array.from(this.patterns.values());
  }

  getExecResultAnalysis(): string {
    const results = Array.from(this.execResults.values());
    const total = results.length;
    const successful = results.filter((r) => r !== null).length;

    return `
📊 URLPattern.exec() ANALYSIS
=============================
Total Patterns Tested: ${total}
Successful exec() calls: ${successful} (${((successful / total) * 100).toFixed(1)}%)
Returns URLPatternResult: ${results.filter((r) => r && (r as any).inputs).length}
Returns null on no match: ${results.filter((r) => r === null).length}

🔍 Common exec() Results Structure:
${results
  .slice(0, 3)
  .map((r, i) => {
    if (!r) return `  ${i + 1}. No match (null)`;
    return `  ${i + 1}. ${Object.keys(r).join(", ")}`;
  })
  .join("\n")}
    `;
  }

  generateBun134Report(): string {
    const analyses = Array.from(this.patterns.values());

    const bun134Features = {
      execMethod: analyses.filter((a) => a.bunSpecific.supportsExecMethod).length,
      testMethod: analyses.filter((a) => a.bunSpecific.supportsTestMethod).length,
      fetchProxy: analyses.filter((a) => a.proxyAnalysis.fetchProxyOptionSupported).length,
      connectHeaders: analyses.filter((a) => a.proxyAnalysis.connectHeadersForwarded).length,
      agentKeepAlive: analyses.filter((a) => a.agentAnalysis.httpAgentKeepAliveWorking).length,
      proxyAuth: analyses.filter((a) => a.proxyAnalysis.proxyAuthorizationHandled).length,
    };

    return `
🎯 BUN 1.3.4 COMPREHENSIVE FEATURE REPORT
=========================================

✅ IMPLEMENTED FEATURES:
  • URLPattern.exec() returns URLPatternResult or null: ${bun134Features.execMethod} patterns
  • fetch() proxy option support: ${bun134Features.fetchProxy ? "✅ Yes" : "❌ No"}
  • CONNECT request headers forwarding: ${bun134Features.connectHeaders ? "✅ Yes" : "❌ No"}
  • Proxy-Authorization header handling: ${bun134Features.proxyAuth ? "✅ Yes" : "❌ No"}
  • http.Agent keepAlive: true bug fix: ${bun134Features.agentKeepAlive ? "✅ Fixed" : "❌ Issue"}

🧪 TEST RESULTS SUMMARY:
  • URLPattern Web API compliance: ${analyses.filter((a) => a.wptCompliance).length}/${analyses.length}
  • exec() method performance: ${analyses.reduce((acc, a) => acc + a.execAnalysis.execTime, 0) / analyses.length}ms avg
  • Proxy pattern matching: ${analyses.filter((a) => a.proxyAnalysis.proxyPatterns.length > 0).length} patterns

🔧 RECOMMENDATIONS:
  ${this.getBun134Recommendations().slice(0, 5).join("\n  ")}
    `;
  }

  private getBun134Recommendations(): string[] {
    const recs: string[] = [];
    const analyses = Array.from(this.patterns.values());

    analyses.forEach((analysis) => {
      if (!analysis.bunSpecific.supportsExecMethod) {
        recs.push(
          `Upgrade to Bun 1.3.4+ for URLPattern.exec() method support in: ${analysis.pattern}`
        );
      }

      if (analysis.execAnalysis.execTime > ANALYZER_CONFIG.SLOW_EXEC_THRESHOLD) {
        recs.push(
          `Optimize exec() performance for pattern: ${analysis.pattern} (${analysis.execAnalysis.execTime}ms)`
        );
      }

      if (!analysis.proxyAnalysis.fetchProxyOptionSupported) {
        recs.push(`Ensure Bun 1.3.4+ for fetch() proxy option support`);
      }
    });

    return recs;
  }
}
