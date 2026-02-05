// [UTILITIES][TOOLS][UT-TO-1CE][v1.3][ACTIVE]

// src/tools/grep-assistant.ts

export class GrepAssistant {
  private static readonly patterns: Record<string, string> = {
    // Domain-based searches
    "setup": `[SETUP]`,
    "config": `[CONFIG]`,
    "code": `[CODE]`,
    "deploy": `[DEPLOY]`,
    "usage": `[USAGE]`,
    "monitor": `[MONITOR]`,
    "extend": `[EXTEND]`,
    "arch": `[ARCHITECTURE]`,

    // Importance-based searches
    "required": `[REQUIRED]`,
    "optional": `[OPTIONAL]`,
    "advanced": `[ADVANCED]`,
    "core": `[CORE]`,
    "meta": `[META]`,

    // Type-based searches
    "guide": `[GUIDE]`,
    "implementation": `[IMPLEMENTATION]`,
    "response": `[RESPONSE]`,

    // Combined shortcuts
    "setup-required": `[SETUP][REQUIRED]`,
    "code-core": `[CODE][CORE]`,
    "code-impl": `[CODE][CORE][IMPLEMENTATION]`,
    "deploy-optional": `[DEPLOY].*[OPTIONAL]`,
    "deploy-required": `[DEPLOY].*[REQUIRED]`,
    "monitor-advanced": `[MONITOR][ADVANCED]`,
    "extend-advanced": `[EXTEND][ADVANCED]`,
    "usage-core": `[USAGE][CORE]`,
    "usage-guide": `[USAGE][GUIDE]`,

    // Special queries
    "all-code": `[CODE].*[CODE]`,
    "all-guides": `.*[GUIDE]`,
    "all-advanced": `.*[ADVANCED]`,
    "production": `[DEPLOY][PRODUCTION]`,
    "health": `[MONITOR][HEALTH]`,
    "connections": `[EXTEND][CONNECTIONS]`,
    "commands": `[USAGE][COMMANDS]`
  };

  static suggest(query: string): string {
    const normalizedQuery = query.toLowerCase().trim();
    const pattern = this.patterns[normalizedQuery];

    if (pattern) {
      return `grep "${pattern}" guide.md`;
    }

    // Try fuzzy matching for partial matches
    const matches = Object.keys(this.patterns)
      .filter(key => key.includes(normalizedQuery) || normalizedQuery.includes(key))
      .map(key => ({ key, pattern: this.patterns[key] }));

    if (matches.length === 1) {
      return `grep "${matches[0].pattern}" guide.md`;
    }

    if (matches.length > 1) {
      return `Multiple matches found:\n${matches
        .map(({ key, pattern }) => `  ${key}: grep "${pattern}" guide.md`)
        .join('\n')}`;
    }

    // Fallback to direct query
    return `grep "${query}" guide.md`;
  }

  static list(): string {
    const categories = {
      "Domain Searches": ["setup", "config", "code", "deploy", "usage", "monitor", "extend", "arch"],
      "Importance Levels": ["required", "optional", "advanced", "core", "meta"],
      "Content Types": ["guide", "implementation", "response"],
      "Combined Shortcuts": ["setup-required", "code-core", "code-impl", "deploy-optional", "deploy-required", "monitor-advanced", "extend-advanced", "usage-core", "usage-guide"],
      "Special Queries": ["all-code", "all-guides", "all-advanced", "production", "health", "connections", "commands"]
    };

    let output = "Available GrepAssistant patterns:\n\n";

    for (const [category, patterns] of Object.entries(categories)) {
      output += `${category}:\n`;
      for (const pattern of patterns) {
        output += `  ${pattern} → ${this.patterns[pattern]}\n`;
      }
      output += "\n";
    }

    output += "Usage: grep-assistant suggest <pattern>\n";
    return output;
  }

  static search(query: string): { count: number; matches: Array<{ text: string; line: number }> } {
    const normalizedQuery = query.toLowerCase().trim();
    const pattern = this.patterns[normalizedQuery];

    if (!pattern) {
      // Try fuzzy matching
      const matches = Object.keys(this.patterns)
        .filter(key => key.includes(normalizedQuery) || normalizedQuery.includes(key))
        .slice(0, 1); // Take best match

      if (matches.length > 0) {
        return this.search(matches[0]);
      }

      return { count: 0, matches: [] };
    }

    // For now, return a mock result since we don't have access to file reading in this context
    // In a real implementation, this would execute the grep and return structured results
    return {
      count: 1,
      matches: [{
        text: `Mock result for pattern: ${pattern}`,
        line: 1
      }]
    };
  }
}

// CLI interface for when run directly
if (import.meta.main) {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log("Usage: grep-assistant <command> [query]");
    console.log("Commands: suggest, list");
    process.exit(1);
  }

  const command = args[0];

  switch (command) {
    case "suggest":
      if (args.length < 2) {
        console.error("Usage: grep-assistant suggest <query>");
        process.exit(1);
      }
      console.log(GrepAssistant.suggest(args[1]));
      break;

    case "search":
      if (args.length < 2) {
        console.error("Usage: grep-assistant search <query>");
        process.exit(1);
      }
      const result = GrepAssistant.search(args[1]);
      console.log(JSON.stringify(result, null, 2));
      break;

    case "list":
      console.log(GrepAssistant.list());
      break;

    default:
      console.error(`Unknown command: ${command}`);
      console.log("Available commands: suggest, search, list");
      process.exit(1);
  }
}
