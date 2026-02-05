/**
 * VS Code Extension Bridge
 * Outputs NDJSON format for IDE consumption
 */

import type { ScanIssue } from "./enterprise-scanner.ts";

export class NDJSONBridge {
  /**
   * Stream NDJSON output for VS Code extension
   */
  async *streamNDJSON(
    files: string[],
    issueStream: AsyncIterable<ScanIssue>
  ): AsyncGenerator<string, void, unknown> {
    // Start event
    yield JSON.stringify({
      type: "start",
      files: files.length,
      timestamp: new Date().toISOString()
    }) + "\n";

    let current = 0;
    let issueCount = 0;

    // Progress and issue events
    for await (const issue of issueStream) {
      issueCount++;

      // Issue event
      yield JSON.stringify({
        type: "issue",
        file: issue.file,
        line: issue.line,
        column: issue.column,
        severity: issue.severity,
        message: issue.message,
        ruleId: issue.ruleId,
        category: issue.category,
        tags: issue.tags
      }) + "\n";

      // Progress event (every 10 issues or on file boundary)
      if (issueCount % 10 === 0) {
        const progress = Math.min(100, Math.floor((current / files.length) * 100));
        yield JSON.stringify({
          type: "progress",
          current,
          total: files.length,
          issues: issueCount,
          eta: this.calculateETA(current, files.length)
        }) + "\n";
      }
    }

    // Complete event
    yield JSON.stringify({
      type: "complete",
      filesScanned: files.length,
      issuesFound: issueCount,
      duration: 0, // Would be calculated
      timestamp: new Date().toISOString()
    }) + "\n";
  }

  private calculateETA(current: number, total: number): string {
    // Simplified ETA calculation
    const remaining = total - current;
    const estimatedSeconds = remaining * 0.1; // Placeholder
    return `${estimatedSeconds.toFixed(1)}s`;
  }
}
