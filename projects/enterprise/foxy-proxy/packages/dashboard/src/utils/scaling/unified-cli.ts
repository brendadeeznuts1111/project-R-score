#!/usr/bin/env bun
// Unified Profile Management CLI
// Command-line interface for unified proxy-phone profile management

import { UnifiedProfileManager } from "../unified/manager";
import { PROFILE_TEMPLATES } from "../unified/types";
import {
  createQuickGamingProfile,
  createQuickSocialMediaProfile,
  createQuickEcommerceProfile,
  createQuickStreamingProfile,
  createQuickScrapingProfile,
  createQuickDevelopmentProfile
} from "../enhanced/index";

interface UnifiedProfileCLIOptions {
  proxyId?: string;
  phoneId?: string;
  template?: string;
  name?: string;
  output?: "json" | "table";
  verbose?: boolean;
  export?: string;
  import?: string;
}

class UnifiedProfileCLI {
  private profileManager: UnifiedProfileManager;

  constructor() {
    this.profileManager = new UnifiedProfileManager();
  }

  async runCommand(command: string, args: string[]): Promise<void> {
    const options = this.parseOptions(args);

    try {
      switch (command) {
        case "create":
          await this.createProfile(options);
          break;
        case "list":
          await this.listProfiles(options);
          break;
        case "export":
          await this.exportProfiles(options);
          break;
        case "import":
          await this.importProfiles(options);
          break;
        case "quick":
          await this.quickCreate(options);
          break;
        default:
          this.showHelp();
      }
    } catch (error) {
      console.error(`❌ Error executing ${command}:`, error);
      process.exit(1);
    }
  }

  private parseOptions(args: string[]): UnifiedProfileCLIOptions {
    const options: UnifiedProfileCLIOptions = {};

    for (let i = 0; i < args.length; i++) {
      const arg = args[i];
      switch (arg) {
        case "--proxy-id":
        case "-p":
          options.proxyId = args[++i];
          break;
        case "--phone-id":
        case "-d":
          options.phoneId = args[++i];
          break;
        case "--template":
        case "-t":
          options.template = args[++i];
          break;
        case "--name":
        case "-n":
          options.name = args[++i];
          break;
        case "--output":
        case "-o":
          options.output = args[++i] as "json" | "table";
          break;
        case "--export":
        case "-e":
          options.export = args[++i];
          break;
        case "--import":
        case "-i":
          options.import = args[++i];
          break;
        case "--verbose":
        case "-v":
          options.verbose = true;
          break;
        case "--help":
        case "-h":
          this.showHelp();
          process.exit(0);
      }
    }

    return options;
  }

  private async createProfile(options: UnifiedProfileCLIOptions): Promise<void> {
    const proxyId = options.proxyId || "proxy-default";
    const phoneId = options.phoneId || "phone-default";
    const template = (options.template || "HIGH_PERFORMANCE") as keyof typeof PROFILE_TEMPLATES;
    const name = options.name || `Profile-${Date.now()}`;

    console.log("🔧 Creating Unified Profile");
    console.log("=".repeat(50));
    console.log(`   Name: ${name}`);
    console.log(`   Proxy ID: ${proxyId}`);
    console.log(`   Phone ID: ${phoneId}`);
    console.log(`   Template: ${template}`);

    if (options.verbose) {
      console.log("\n🔧 Initializing profile manager...");
    }

    const profile = this.profileManager.createProfile({
      name,
      proxyId,
      phoneId,
      template: template as keyof typeof PROFILE_TEMPLATES,
      customConfig: {
        ip: "192.168.1.100",
        port: 8080,
        username: "user",
        password: "pass",
        protocol: "https",
        region: "US",
        dns: ["1.1.1.1", "8.8.8.8"],
        whitelist: [],
        blacklist: []
      },
      customMetadata: {
        description: `Profile created with ${template} template`,
        tags: ["cli-created"],
        category: "general",
        priority: "medium",
        autoRotate: false,
        failoverEnabled: true
      }
    });

    console.log("\n✅ Profile created successfully!");
    console.log(`   Profile ID: ${profile.id}`);

    if (options.output === "json") {
      console.log("\n📄 Profile JSON:");
      console.log(JSON.stringify(profile, null, 2));
    } else {
      console.log("\n📋 Profile Details:");
      console.log(`   ID: ${profile.id}`);
      console.log(`   Name: ${profile.name}`);
      console.log(`   Proxy: ${profile.proxyId}`);
      console.log(`   Phone: ${profile.phoneId}`);
      console.log(`   Status: ${profile.status}`);
      console.log(`   Category: ${profile.metadata.category}`);
      console.log(`   Priority: ${profile.metadata.priority}`);
      console.log(`   Tags: ${profile.metadata.tags.join(", ")}`);
      console.log(`   Created: ${profile.createdAt}`);
    }

    // Save to file if export path provided
    if (options.export) {
      await Bun.write(options.export, JSON.stringify(profile, null, 2));
      console.log(`\n💾 Profile exported to: ${options.export}`);
    }
  }

  private async listProfiles(options: UnifiedProfileCLIOptions): Promise<void> {
    console.log("📋 Listing Unified Profiles");
    console.log("=".repeat(50));

    if (options.verbose) {
      console.log("🔧 Retrieving profiles...");
    }

    const profiles = this.profileManager.getAllProfiles();
    const profileCount = profiles.length;

    console.log(`\n📊 Total Profiles: ${profileCount}`);

    if (profileCount === 0) {
      console.log("\n📭 No profiles found. Create one with:");
      console.log('   bun run profile:create --name "My Profile"');
      return;
    }

    if (options.output === "json") {
      console.log("\n📄 Profiles JSON:");
      console.log(JSON.stringify(profiles, null, 2));
    } else {
      console.log("\n📋 Profile List:");
      let index = 1;
      for (const profile of profiles) {
        const status = profile.status === "active" ? "✅" : "❌";
        console.log(`   ${index}. ${status} ${profile.name} (${profile.id})`);
        console.log(`      Proxy: ${profile.proxyId} | Phone: ${profile.phoneId}`);
        console.log(
          `      Category: ${profile.metadata.category} | Priority: ${profile.metadata.priority}`
        );
        if (profile.metadata.tags.length > 0) {
          console.log(`      Tags: ${profile.metadata.tags.join(", ")}`);
        }
        console.log(`      Created: ${new Date(profile.createdAt).toLocaleDateString()}`);
        console.log("");
        index++;
      }
    }

    // Save to file if export path provided
    if (options.export) {
      await Bun.write(options.export, JSON.stringify(profiles, null, 2));
      console.log(`💾 Profiles exported to: ${options.export}`);
    }
  }

  private async exportProfiles(options: UnifiedProfileCLIOptions): Promise<void> {
    const exportPath = options.export || `unified-profiles-${Date.now()}.json`;

    console.log("📤 Exporting Unified Profiles");
    console.log("=".repeat(50));
    console.log(`   Export Path: ${exportPath}`);

    if (options.verbose) {
      console.log("🔧 Collecting profile data...");
    }

    const exportData = this.profileManager.exportProfiles();

    await Bun.write(exportPath, exportData);

    const profiles = JSON.parse(exportData);
    console.log(`\n✅ Exported ${profiles.length} profiles successfully!`);
    console.log(`   File: ${exportPath}`);
    console.log(`   Size: ${Bun.file(exportPath).size.toLocaleString()} bytes`);
    console.log(`   Exported: ${new Date().toISOString()}`);
  }

  private async importProfiles(options: UnifiedProfileCLIOptions): Promise<void> {
    const importPath = options.import;

    if (!importPath) {
      console.error("❌ Import path required. Use --import <path>");
      process.exit(1);
    }

    console.log("📥 Importing Unified Profiles");
    console.log("=".repeat(50));
    console.log(`   Import Path: ${importPath}`);

    if (options.verbose) {
      console.log("🔧 Reading profile data...");
    }

    const fileExists = await Bun.file(importPath).exists();
    if (!fileExists) {
      console.error(`❌ Import file not found: ${importPath}`);
      process.exit(1);
    }

    const importData = await Bun.file(importPath).text();

    console.log("\n🔧 Importing profiles from file...");

    const result = this.profileManager.importProfiles(importData);

    console.log("\n✅ Import completed!");
    console.log(`   Success: ${result.imported} profiles`);
    console.log(`   Failed: ${result.errors.length} profiles`);

    if (result.errors.length > 0) {
      console.log("\n❌ Import errors:");
      result.errors.forEach((error) => {
        console.log(`   - ${error}`);
      });
    }

    console.log(`   Imported: ${new Date().toISOString()}`);
  }

  private async quickCreate(options: UnifiedProfileCLIOptions): Promise<void> {
    const template = options.template?.toUpperCase() || "GAMING";
    const proxyId = options.proxyId || "proxy-default";
    const phoneId = options.phoneId || "phone-default";

    console.log("⚡ Quick Profile Creation");
    console.log("=".repeat(50));
    console.log(`   Template: ${template}`);
    console.log(`   Proxy ID: ${proxyId}`);
    console.log(`   Phone ID: ${phoneId}`);

    if (options.verbose) {
      console.log("\n🔧 Creating enhanced profile...");
    }

    let profile;

    switch (template) {
      case "GAMING":
        profile = createQuickGamingProfile(proxyId, phoneId);
        break;
      case "SOCIAL_MEDIA":
        profile = createQuickSocialMediaProfile(
          proxyId,
          phoneId,
          "manager@business.com",
          "password123",
          "facebook"
        );
        break;
      case "ECOMMERCE":
        profile = createQuickEcommerceProfile(proxyId, phoneId, "store@business.com", "shopify");
        break;
      case "STREAMING":
        profile = createQuickStreamingProfile(proxyId, phoneId);
        break;
      case "SCRAPING":
        profile = createQuickScrapingProfile(proxyId, phoneId);
        break;
      case "DEVELOPMENT":
        profile = createQuickDevelopmentProfile(proxyId, phoneId);
        break;
      default:
        console.error(`❌ Unknown template: ${template}`);
        console.log(
          "Available templates: GAMING, SOCIAL_MEDIA, ECOMMERCE, STREAMING, SCRAPING, DEVELOPMENT"
        );
        process.exit(1);
    }

    console.log("\n✅ Enhanced profile created successfully!");
    console.log(`   Profile ID: ${profile.id}`);
    console.log(`   Name: ${profile.name}`);

    if (options.output === "json") {
      console.log("\n📄 Profile JSON:");
      console.log(JSON.stringify(profile, null, 2));
    } else {
      console.log("\n📋 Profile Details:");
      console.log(`   ID: ${profile.id}`);
      console.log(`   Name: ${profile.name}`);
      console.log(`   Proxy: ${profile.proxyId}`);
      console.log(`   Phone: ${profile.phoneId}`);
      console.log(`   Status: ${profile.status}`);
      console.log(`   Category: ${profile.metadata.category}`);
      console.log(`   Priority: ${profile.metadata.priority}`);

      // Show enhanced features if available
      if (profile.emailAccount) {
        console.log(`   Email: ${profile.emailAccount.address}`);
      }
      if (profile.socialMedia) {
        console.log(`   Social Media: ${profile.socialMedia.platform}`);
      }
      if (profile.ecommerce) {
        console.log(`   E-commerce: ${profile.ecommerce.platform}`);
      }

      console.log(
        `   Created: ${profile.createdAt ? new Date(profile.createdAt).toISOString() : "N/A"}`
      );
    }

    // Save to file if export path provided
    if (options.export) {
      await Bun.write(options.export, JSON.stringify(profile, null, 2));
      console.log(`\n💾 Profile exported to: ${options.export}`);
    }
  }

  private showHelp(): void {
    console.log(`
🔧 Unified Profile Management CLI

USAGE:
  bun run unified-cli.ts <command> [options]

COMMANDS:
  create            Create a new unified profile
  list              List all profiles
  export            Export profiles to file
  import            Import profiles from file
  quick             Quick create with templates

OPTIONS:
  --proxy-id, -p    Proxy ID (default: proxy-default)
  --phone-id, -d    Phone ID (default: phone-default)
  --template, -t    Template name
  --name, -n        Profile name
  --output, -o      Output format: json|table (default: table)
  --export, -e      Export to file
  --import, -i      Import from file
  --verbose, -v     Enable verbose logging
  --help, -h        Show this help message

QUICK TEMPLATES:
  GAMING           Mobile gaming optimization
  SOCIAL_MEDIA     Social media management
  ECOMMERCE        E-commerce operations
  STREAMING        Video streaming optimization
  SCRAPING         Web scraping with anti-detection
  DEVELOPMENT      Development environment

EXAMPLES:
  # Create basic profile
  bun run unified-cli.ts create --name "My Profile" --proxy-id proxy-1 --phone-id phone-1

  # List all profiles
  bun run unified-cli.ts list --output table

  # Export profiles
  bun run unified-cli.ts export --export backup.json

  # Import profiles
  bun run unified-cli.ts import --import backup.json

  # Quick create gaming profile
  bun run unified-cli.ts quick --template GAMING --proxy-id proxy-gaming --phone-id phone-gaming

  # Quick create social media profile
  bun run unified-cli.ts quick --template SOCIAL_MEDIA --export social-profile.json

CONFIGURATION:
  Profiles are stored in memory and can be persisted to localStorage
  Export/import supports JSON format with full profile data

For more information, see the documentation:
  https://github.com/yourusername/foxy-proxy/docs/enhanced-templates.md
`);
  }
}

// Main execution
async function main() {
  const argv = process.argv.slice(2);
  const rawCommand = argv[0];
  const args = argv.slice(1);

  if (!rawCommand) {
    console.error("❌ No command specified. Use --help for usage information.");
    process.exit(1);
  }

  const flagToCommand: Record<string, string> = {
    "--create": "create",
    "--list": "list",
    "--export": "export",
    "--import": "import",
    "--quick": "quick",
    "--help": "help",
    "-h": "help"
  };

  const command = flagToCommand[rawCommand] ?? rawCommand;

  const cli = new UnifiedProfileCLI();
  await cli.runCommand(command, args);
}

// Run if called directly
if (import.meta.main) {
  main().catch((error) => {
    console.error("❌ Fatal error:", error);
    process.exit(1);
  });
}

export { UnifiedProfileCLI };
