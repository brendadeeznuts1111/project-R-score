/**
 * Interactive Tooltip System for Feature Flags
 * Provides detailed context and descriptions on hover
 */


// Use Bun's native stringWidth for accurate Unicode width calculation
const stringWidth = (text: string): number => Bun.stringWidth(text);

export interface TooltipData {
  title: string;
  description: string;
  details: string[];
  impact: {
    size: string;
    memory: string;
    cpu: string;
  };
  dependencies?: string[];
  conflicts?: string[];
  examples?: string[];
  bestPractices?: string[];
}

export class TooltipSystem {
  private static tooltips: Record<string, TooltipData> = {
    // Environment flags
    "ENV_DEVELOPMENT": {
      title: "Development Environment",
      description: "Enables development-specific features and debugging tools",
      details: [
        "• Enables mock API endpoints",
        "• Activates extended logging",
        "• Includes debug tools and utilities",
        "• Disables production optimizations",
      ],
      impact: { size: "+15KB", memory: "+20MB", cpu: "+5%" },
      conflicts: ["ENV_PRODUCTION", "ENV_STAGING", "ENV_TEST"],
      examples: [
        "bun run --features=ENV_DEVELOPMENT,FEAT_MOCK_API src/main.ts",
        "Used during local development and testing",
      ],
      bestPractices: [
        "Always use with FEAT_MOCK_API for local testing",
        "Combine with FEAT_EXTENDED_LOGGING for debugging",
        "Never use in production builds",
      ],
    },

    "ENV_PRODUCTION": {
      title: "Production Environment",
      description: "Optimizes for production deployment with security and performance",
      details: [
        "• Enables encryption and security features",
        "• Disables debug and mock functionality",
        "• Applies performance optimizations",
        "• Enables monitoring and analytics",
      ],
      impact: { size: "-10KB", memory: "-15MB", cpu: "-3%" },
      dependencies: ["FEAT_ENCRYPTION"],
      conflicts: ["ENV_DEVELOPMENT", "FEAT_MOCK_API"],
      examples: [
        "bun build --features=ENV_PRODUCTION,FEAT_ENCRYPTION src/main.ts",
        "Used for live deployment environments",
      ],
      bestPractices: [
        "Always enable FEAT_ENCRYPTION in production",
        "Never use with FEAT_MOCK_API",
        "Consider FEAT_ADVANCED_MONITORING for observability",
      ],
    },

    // Tier flags
    "FEAT_PREMIUM": {
      title: "Premium Features",
      description: "Unlocks advanced functionality for premium tier users",
      details: [
        "• Advanced analytics and reporting",
        "• Priority customer support",
        "• Enhanced monitoring capabilities",
        "• Advanced automation features",
      ],
      impact: { size: "+25KB", memory: "+30MB", cpu: "+8%" },
      examples: [
        "bun run --features=ENV_PRODUCTION,FEAT_PREMIUM src/main.ts",
        "Premium subscriber feature set",
      ],
      bestPractices: [
        "Combine with FEAT_ADVANCED_MONITORING",
        "Use with FEAT_BATCH_PROCESSING for better performance",
        "Consider FEAT_VALIDATION_STRICT for security",
      ],
    },

    "FEAT_ENCRYPTION": {
      title: "End-to-End Encryption",
      description: "Enables encryption for data transmission and storage",
      details: [
        "• AES-256 encryption for data at rest",
        "• TLS 1.3 for data in transit",
        "• Key management and rotation",
        "• Compliance with security standards",
      ],
      impact: { size: "+8KB", memory: "+10MB", cpu: "+4%" },
      examples: [
        "Required for production environments",
        "Essential for handling sensitive data",
      ],
      bestPractices: [
        "Always enabled in production",
        "Use with FEAT_VALIDATION_STRICT",
        "Monitor performance impact with FEAT_ADVANCED_MONITORING",
      ],
    },

    "FEAT_MOCK_API": {
      title: "Mock API Endpoints",
      description: "Replaces real API calls with mock responses for testing",
      details: [
        "• Local mock server on localhost:3000",
        "• Predefined response templates",
        "• Simulated error conditions",
        "• Offline development capability",
      ],
      impact: { size: "-20KB", memory: "-15MB", cpu: "-2%" },
      conflicts: ["ENV_PRODUCTION"],
      examples: [
        "bun run --features=ENV_DEVELOPMENT,FEAT_MOCK_API src/main.ts",
        "Perfect for CI/CD testing",
      ],
      bestPractices: [
        "Only use in development and testing",
        "Combine with ENV_DEVELOPMENT",
        "Never use in production builds",
      ],
    },

    "FEAT_ADVANCED_MONITORING": {
      title: "Advanced Monitoring",
      description: "Comprehensive monitoring with real-time dashboards and alerts",
      details: [
        "• Real-time performance metrics",
        "• Interactive dashboards",
        "• Alert system integration",
        "• Detailed analytics and reporting",
      ],
      impact: { size: "+20KB", memory: "+25MB", cpu: "+6%" },
      examples: [
        "Premium tier monitoring solution",
        "Essential for production observability",
      ],
      bestPractices: [
        "Use with FEAT_PREMIUM or higher",
        "Combine with FEAT_NOTIFICATIONS for alerts",
        "Requires adequate memory allocation",
      ],
    },

    "FEAT_BATCH_PROCESSING": {
      title: "Batch Processing",
      description: "Optimizes operations by processing items in batches",
      details: [
        "• Improved throughput for bulk operations",
        "• Memory-efficient processing",
        "• Configurable batch sizes",
        "• Progress tracking and reporting",
      ],
      impact: { size: "+18KB", memory: "+15MB", cpu: "-5%" },
      examples: [
        "Bulk data imports and exports",
        "Mass notification sending",
      ],
      bestPractices: [
        "Essential for PHONE_BULK_OPERATIONS",
        "Configure batch size based on available memory",
        "Monitor with FEAT_ADVANCED_MONITORING",
      ],
    },

    "FEAT_VALIDATION_STRICT": {
      title: "Strict Validation",
      description: "Enables comprehensive input validation and security checks",
      details: [
        "• Enhanced input sanitization",
        "• Strict type checking",
        "• Security vulnerability scanning",
        "• Comprehensive error reporting",
      ],
      impact: { size: "+3KB", memory: "+2MB", cpu: "+2%" },
      examples: [
        "Financial data processing",
        "User input handling",
      ],
      bestPractices: [
        "Use in production environments",
        "Combine with FEAT_ENCRYPTION",
        "Monitor impact on performance",
      ],
    },

    // Platform flags
    "PLATFORM_ANDROID": {
      title: "Android Platform",
      description: "Android-specific optimizations and features",
      details: [
        "• Android notification system",
        "• Platform-specific file storage",
        "• Android UI guidelines compliance",
        "• Native Android integrations",
      ],
      impact: { size: "+12KB", memory: "+18MB", cpu: "+3%" },
      conflicts: ["PLATFORM_IOS", "PLATFORM_WEB", "PLATFORM_DESKTOP"],
      examples: [
        "bun build --features=ENV_PRODUCTION,PLATFORM_ANDROID src/main.ts",
        "Android app deployment",
      ],
      bestPractices: [
        "Use with appropriate Android SDK",
        "Test on various Android versions",
        "Consider device performance constraints",
      ],
    },

    "PLATFORM_IOS": {
      title: "iOS Platform",
      description: "iOS-specific optimizations and features",
      details: [
        "• iOS notification system",
        "• Keychain integration",
        "• App Groups support",
        "• iOS design guidelines",
      ],
      impact: { size: "+12KB", memory: "+18MB", cpu: "+3%" },
      conflicts: ["PLATFORM_ANDROID", "PLATFORM_WEB", "PLATFORM_DESKTOP"],
      examples: [
        "bun build --features=ENV_PRODUCTION,PLATFORM_IOS src/main.ts",
        "iOS app deployment",
      ],
      bestPractices: [
        "Use with iOS development tools",
        "Test on various iOS devices",
        "Follow Apple's design guidelines",
      ],
    },

    // Codebase management features
    "PHONE_AUTOMATION_ENABLED": {
      title: "Phone Automation",
      description: "Automated phone management and workflow capabilities",
      details: [
        "• Automated response systems",
        "• Workflow automation",
        "• Scheduled operations",
        "• Smart routing and filtering",
      ],
      impact: { size: "+25KB", memory: "+30MB", cpu: "+7%" },
      examples: [
        "Customer service automation",
        "Automated messaging campaigns",
      ],
      bestPractices: [
        "Requires FEAT_PREMIUM or higher",
        "Use with FEAT_BATCH_PROCESSING",
        "Monitor with FEAT_ADVANCED_MONITORING",
      ],
    },

    "PHONE_MULTI_ACCOUNT": {
      title: "Multi-Account Support",
      description: "Manage multiple phone accounts from a single interface",
      details: [
        "• Account switching and management",
        "• Unified inbox and contacts",
        "• Cross-account operations",
        "• Account-specific settings",
      ],
      impact: { size: "+15KB", memory: "+20MB", cpu: "+4%" },
      examples: [
        "Business and personal account separation",
        "Team account management",
      ],
      bestPractices: [
        "Essential for PHONE_REAL_TIME_SYNC",
        "Use with proper authentication",
        "Consider privacy implications",
      ],
    },

    "PHONE_REAL_TIME_SYNC": {
      title: "Real-Time Synchronization",
      description: "Instant synchronization across all devices and accounts",
      details: [
        "• Live data synchronization",
        "• Conflict resolution",
        "• Offline mode support",
        "• Push notification updates",
      ],
      impact: { size: "+20KB", memory: "+25MB", cpu: "+8%" },
      dependencies: ["PHONE_MULTI_ACCOUNT"],
      examples: [
        "Multi-device message sync",
        "Real-time collaboration",
      ],
      bestPractices: [
        "Requires PHONE_MULTI_ACCOUNT",
        "Use with stable network connection",
        "Monitor bandwidth usage",
      ],
    },

    // Analytics features
    "ANALYTICS_ENABLED": {
      title: "Analytics System",
      description: "Comprehensive analytics and reporting capabilities",
      details: [
        "• Usage tracking and metrics",
        "• Performance analytics",
        "• User behavior analysis",
        "• Custom report generation",
      ],
      impact: { size: "+10KB", memory: "+15MB", cpu: "+3%" },
      examples: [
        "Business intelligence",
        "User engagement tracking",
      ],
      bestPractices: [
        "Consider privacy regulations",
        "Use with ANALYTICS_DETAILED for insights",
        "Ensure data retention policies",
      ],
    },

    "ANALYTICS_DETAILED": {
      title: "Detailed Analytics",
      description: "In-depth analytics with advanced insights and predictions",
      details: [
        "• Advanced data visualization",
        "• Predictive analytics",
        "• Custom dashboards",
        "• Export capabilities",
      ],
      impact: { size: "+15KB", memory: "+20MB", cpu: "+5%" },
      dependencies: ["ANALYTICS_ENABLED"],
      examples: [
        "Executive reporting",
        "Data-driven decision making",
      ],
      bestPractices: [
        "Requires ANALYTICS_ENABLED",
        "Use with adequate storage",
        "Consider computational complexity",
      ],
    },
  };

  // Get tooltip data for a feature flag
  static getTooltip(featureName: string): TooltipData | null {
    return this.tooltips[featureName] || null;
  }

  // Format tooltip for display
  static formatTooltip(tooltip: TooltipData, maxWidth: number = 80): string[] {
    const lines: string[] = [];

    // Title
    lines.push(`📋 ${tooltip.title}`);
    lines.push("─".repeat(Math.min(maxWidth, stringWidth(tooltip.title) + 4)));
    lines.push("");

    // Description
    lines.push(`📝 ${tooltip.description}`);
    lines.push("");

    // Details
    if (tooltip.details.length > 0) {
      lines.push("🔧 Details:");
      tooltip.details.forEach(detail => {
        lines.push(`   ${detail}`);
      });
      lines.push("");
    }

    // Impact
    lines.push(`📊 Impact: Size ${tooltip.impact.size}, Memory ${tooltip.impact.memory}, CPU ${tooltip.impact.cpu}`);
    lines.push("");

    // Dependencies
    if (tooltip.dependencies && tooltip.dependencies.length > 0) {
      lines.push(`🔗 Dependencies: ${tooltip.dependencies.join(", ")}`);
      lines.push("");
    }

    // Conflicts
    if (tooltip.conflicts && tooltip.conflicts.length > 0) {
      lines.push(`⚠️  Conflicts: ${tooltip.conflicts.join(", ")}`);
      lines.push("");
    }

    // Examples
    if (tooltip.examples && tooltip.examples.length > 0) {
      lines.push("💡 Examples:");
      tooltip.examples.forEach(example => {
        lines.push(`   • ${example}`);
      });
      lines.push("");
    }

    // Best Practices
    if (tooltip.bestPractices && tooltip.bestPractices.length > 0) {
      lines.push("✨ Best Practices:");
      tooltip.bestPractices.forEach(practice => {
        lines.push(`   • ${practice}`);
      });
    }

    return lines;
  }

  // Create interactive tooltip display
  static createInteractiveTooltip(featureName: string): string[] {
    const tooltip = this.getTooltip(featureName);
    if (!tooltip) {
      return [`❌ No tooltip available for feature: ${featureName}`];
    }

    return this.formatTooltip(tooltip);
  }

  // Generate tooltip summary for quick view
  static getTooltipSummary(featureName: string): string {
    const tooltip = this.getTooltip(featureName);
    if (!tooltip) {
      return `${featureName}: No description available`;
    }

    return `📋 ${tooltip.title}: ${tooltip.description} (${tooltip.impact.size})`;
  }

  // List all available tooltips
  static listAvailableTooltips(): string[] {
    const features = Object.keys(this.tooltips).sort();
    return features.map(feature => this.getTooltipSummary(feature));
  }

  // Search tooltips by keyword
  static searchTooltips(keyword: string): string[] {
    const results: string[] = [];
    const lowerKeyword = keyword.toLowerCase();

    for (const [featureName, tooltip] of Object.entries(this.tooltips)) {
      const searchText = [
        featureName.toLowerCase(),
        tooltip.title.toLowerCase(),
        tooltip.description.toLowerCase(),
        ...tooltip.details.map(d => d.toLowerCase()),
        ...tooltip.examples?.map(e => e.toLowerCase()) || [],
      ].join(" ");

      if (searchText.includes(lowerKeyword)) {
        results.push(this.getTooltipSummary(featureName));
      }
    }

    return results;
  }

  // Create tooltip for feature flag table
  static enhanceFeatureTableWithTooltips(
    headers: string[],
    rows: string[][],
    featureColumnIndex: number = 0
  ): string[] {
    const enhancedRows: string[] = [];

    // Add headers
    enhancedRows.push(headers.join(" │ "));
    enhancedRows.push("─".repeat(headers.join(" │ ").length));

    // Add enhanced rows
    for (const row of rows) {
      const featureName = row[featureColumnIndex];
      const tooltip = this.getTooltip(featureName);

      if (tooltip) {
        const enhancedRow = [...row];
        enhancedRow[featureColumnIndex] = `${featureName} 📋`;
        enhancedRows.push(enhancedRow.join(" │ "));
      } else {
        enhancedRows.push(row.join(" │ "));
      }
    }

    return enhancedRows;
  }

  private static truncateWithEllipsis(text: string, maxWidth: number): string {
    const ellipsis = "…";
    const ellipsisWidth = stringWidth(ellipsis);

    let currentWidth = 0;
    let result = "";

    for (const char of text) {
      const charWidth = stringWidth(char);
      if (currentWidth + charWidth + ellipsisWidth > maxWidth) {
        return result + ellipsis;
      }
      result += char;
      currentWidth += charWidth;
    }

    return result;
  }
}

// Export tooltip utilities
export const TooltipUtils = {
  // Quick tooltip access
  get: (feature: string) => TooltipSystem.getTooltip(feature),

  // Formatted display
  format: (feature: string, maxWidth?: number) =>
    TooltipSystem.formatTooltip(TooltipSystem.getTooltip(feature)!, maxWidth),

  // Summary view
  summary: (feature: string) => TooltipSystem.getTooltipSummary(feature),

  // Search functionality
  search: (keyword: string) => TooltipSystem.searchTooltips(keyword),

  // List all
  list: () => TooltipSystem.listAvailableTooltips(),
};

// ... (rest of the code remains the same)
