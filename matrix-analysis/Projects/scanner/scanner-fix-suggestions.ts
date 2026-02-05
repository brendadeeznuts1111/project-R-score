/**
 * Fix Suggestions API
 * Generates machine-readable patches for auto-fixing issues
 */

import type { ScanIssue, FixSuggestion } from "./enterprise-scanner.ts";
import { file } from "bun";
import * as path from "path";

export class FixSuggestionsGenerator {
  /**
   * Generate fix suggestions for issues
   */
  async generateSuggestions(issues: ScanIssue[]): Promise<FixSuggestion[]> {
    const suggestions: FixSuggestion[] = [];

    for (const issue of issues) {
      const suggestion = await this.generateSuggestionForIssue(issue);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    return suggestions;
  }

  /**
   * Apply fix suggestions automatically
   */
  async applySuggestions(
    suggestions: FixSuggestion[],
    options?: {
      backup?: boolean;
      dryRun?: boolean;
    }
  ): Promise<{ applied: number; failed: number }> {
    let applied = 0;
    let failed = 0;

    for (const suggestion of suggestions) {
      try {
        if (options?.backup) {
          await this.backupFile(suggestion.file);
        }

        if (!options?.dryRun) {
          await this.applySuggestion(suggestion);
        }

        applied++;
      } catch (error) {
        console.error(`Failed to apply fix for ${suggestion.file}:`, error);
        failed++;
      }
    }

    return { applied, failed };
  }

  private async generateSuggestionForIssue(issue: ScanIssue): Promise<FixSuggestion | null> {
    // Rule-based fix generation
    if (issue.ruleId === "DEPS_IMPORT_BUN_NATIVE") {
      return {
        file: issue.file || "",
        line: issue.line || 0,
        original: issue.metadata?.original as string || "",
        replacement: issue.metadata?.replacement as string || "",
        confidence: 0.95,
        annotation: "[DEPS][IMPORT][BUN-NATIVE]",
        ruleId: issue.ruleId
      };
    }

    // Add more rule-specific fix generators
    return null;
  }

  private async applySuggestion(suggestion: FixSuggestion): Promise<void> {
    const filePath = suggestion.file;
    const content = await file(filePath).text();
    const lines = content.split("\n");

    // Replace the line
    if (suggestion.line > 0 && suggestion.line <= lines.length) {
      lines[suggestion.line - 1] = suggestion.replacement;
      await Bun.write(filePath, lines.join("\n"));
    }
  }

  private async backupFile(filePath: string): Promise<void> {
    const backupPath = `${filePath}.backup.${Date.now()}`;
    const content = await file(filePath).text();
    await Bun.write(backupPath, content);
  }
}

/**
 * Export suggestions in machine-readable format
 */
export async function exportSuggestions(
  suggestions: FixSuggestion[],
  outputPath: string
): Promise<void> {
  const output = {
    version: "1.0.0",
    generatedAt: new Date().toISOString(),
    suggestions
  };

  await Bun.write(outputPath, JSON.stringify(output, null, 2));
  console.log(`✅ Exported ${suggestions.length} fix suggestions to ${outputPath}`);
}
