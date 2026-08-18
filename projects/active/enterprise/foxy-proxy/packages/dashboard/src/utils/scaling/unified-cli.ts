#!/usr/bin/env bun
// @see https://bun.com/docs/runtime/file-io#reading-files-bun-file — Bun.file
// @see https://bun.com/docs/runtime/file-io#writing-files-bun-write — Bun.write
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

    console.info("🔧 Creating Unified Profile");
    console.info("=".repeat(50));
    console.info(`   Name: ${name}`);
    console.info(`   Proxy ID: ${proxyId}`);
    console.info(`   Phone ID: ${phoneId}`);
    console.info(`   Template: ${template}`);

    if (options.verbose) {
      console.info("\n🔧 Initializing profile manager...");
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

    console.info("\n✅ Profile created successfully!");
    console.info(`   Profile ID: ${profile.id}`);

    if (options.output === "json") {
      console.info("\n📄 Profile JSON:");
      console.info(JSON.stringify(profile, null, 2));
    } else {
      console.info("\n📋 Profile Details:");
      console.info(`   ID: ${profile.id}`);
      console.info(`   Name: ${profile.name}`);
      console.info(`   Proxy: ${profile.proxyId}`);
      console.info(`   Phone: ${profile.phoneId}`);
      console.info(`   Status: ${profile.status}`);
      console.info(`   Category: ${profile.metadata.category}`);
      console.info(`   Priority: ${profile.metadata.priority}`);
      console.info(`   Tags: ${profile.metadata.tags.join(", ")}`);
      console.info(`   Created: ${profile.createdAt}`);
    }

    // Save to file if export path provided
    if (options.export) {
      await Bun.write(options.export, JSON.stringify(profile, null, 2));
      console.info(`\n💾 Profile exported to: ${options.export}`);
    }
  }

  private async listProfiles(options: UnifiedProfileCLIOptions): Promise<void> {
    console.info("📋 Listing Unified Profiles");
    console.info("=".repeat(50));

    if (options.verbose) {
      console.info("🔧 Retrieving profiles...");
    }

    const profiles = this.profileManager.getAllProfiles();
    const profileCount = profiles.length;

    console.info(`\n📊 Total Profiles: ${profileCount}`);

    if (profileCount === 0) {
      console.info("\n📭 No profiles found. Create one with:");
      console.info('   bun run profile:create --name "My Profile"');
      return;
    }

    if (options.output === "json") {
      console.info("\n📄 Profiles JSON:");
      console.info(JSON.stringify(profiles, null, 2));
    } else {
      console.info("\n📋 Profile List:");
      let index = 1;
      for (const profile of profiles) {
        const status = profile.status === "active" ? "✅" : "❌";
        console.info(`   ${index}. ${status} ${profile.name} (${profile.id})`);
        console.info(`      Proxy: ${profile.proxyId} | Phone: ${profile.phoneId}`);
        console.info(
          `      Category: ${profile.metadata.category} | Priority: ${profile.metadata.priority}`
        );
        if (profile.metadata.tags.length > 0) {
          console.info(`      Tags: ${profile.metadata.tags.join(", ")}`);
        }
        console.info(`      Created: ${new Date(profile.createdAt).toLocaleDateString()}`);
        console.info("");
        index++;
      }
    }

    // Save to file if export path provided
    if (options.export) {
      await Bun.write(options.export, JSON.stringify(profiles, null, 2));
      console.info(`💾 Profiles exported to: ${options.export}`);
    }
  }

  private async exportProfiles(options: UnifiedProfileCLIOptions): Promise<void> {
    const exportPath = options.export || `unified-profiles-${Date.now()}.json`;

    console.info("📤 Exporting Unified Profiles");
    console.info("=".repeat(50));
    console.info(`   Export Path: ${exportPath}`);

    if (options.verbose) {
      console.info("🔧 Collecting profile data...");
    }

    const exportData = this.profileManager.exportProfiles();

    await Bun.write(exportPath, exportData);

    const profiles = JSON.parse(exportData);
    console.info(`\n✅ Exported ${profiles.length} profiles successfully!`);
    console.info(`   File: ${exportPath}`);
    console.info(`   Size: ${Bun.file(exportPath).size.toLocaleString()} bytes`);
    console.info(`   Exported: ${new Date().toISOString()}`);
  }

  private async importProfiles(options: UnifiedProfileCLIOptions): Promise<void> {
    const importPath = options.import;

    if (!importPath) {
      console.error("❌ Import path required. Use --import <path>");
      process.exit(1);
    }

    console.info("📥 Importing Unified Profiles");
    console.info("=".repeat(50));
    console.info(`   Import Path: ${importPath}`);

    if (options.verbose) {
      console.info("🔧 Reading profile data...");
    }

    const fileExists = await Bun.file(importPath).exists();
    if (!fileExists) {
      console.error(`❌ Import file not found: ${importPath}`);
      process.exit(1);
    }

    const importData = await Bun.file(importPath).text();

    console.info("\n🔧 Importing profiles from file...");

    const result = this.profileManager.importProfiles(importData);

    console.info("\n✅ Import completed!");
    console.info(`   Success: ${result.imported} profiles`);
    console.info(`   Failed: ${result.errors.length} profiles`);

    if (result.errors.length > 0) {
      console.info("\n❌ Import errors:");
      result.errors.forEach((error) => {
        console.info(`   - ${error}`);
      });
    }

    console.info(`   Imported: ${new Date().toISOString()}`);
  }

  private async quickCreate(options: UnifiedProfileCLIOptions): Promise<void> {
    const template = options.template?.toUpperCase() || "GAMING";
    const proxyId = options.proxyId || "proxy-default";
    const phoneId = options.phoneId || "phone-default";

    console.info("⚡ Quick Profile Creation");
    console.info("=".repeat(50));
    console.info(`   Template: ${template}`);
    console.info(`   Proxy ID: ${proxyId}`);
    console.info(`   Phone ID: ${phoneId}`);

    if (options.verbose) {
      console.info("\n🔧 Creating enhanced profile...");
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
        console.info(
          "Available templates: GAMING, SOCIAL_MEDIA, ECOMMERCE, STREAMING, SCRAPING, DEVELOPMENT"
        );
        process.exit(1);
    }

    console.info("\n✅ Enhanced profile created successfully!");
    console.info(`   Profile ID: ${profile.id}`);
    console.info(`   Name: ${profile.name}`);

    if (options.output === "json") {
      console.info("\n📄 Profile JSON:");
      console.info(JSON.stringify(profile, null, 2));
    } else {
      console.info("\n📋 Profile Details:");
      console.info(`   ID: ${profile.id}`);
      console.info(`   Name: ${profile.name}`);
      console.info(`   Proxy: ${profile.proxyId}`);
      console.info(`   Phone: ${profile.phoneId}`);
      console.info(`   Status: ${profile.status}`);
      console.info(`   Category: ${profile.metadata.category}`);
      console.info(`   Priority: ${profile.metadata.priority}`);

      // Show enhanced features if available
      if (profile.emailAccount) {
        console.info(`   Email: ${profile.emailAccount.address}`);
      }
      if (profile.socialMedia) {
        console.info(`   Social Media: ${profile.socialMedia.platform}`);
      }
      if (profile.ecommerce) {
        console.info(`   E-commerce: ${profile.ecommerce.platform}`);
      }

      console.info(
        `   Created: ${profile.createdAt ? new Date(profile.createdAt).toISOString() : "N/A"}`
      );
    }

    // Save to file if export path provided
    if (options.export) {
      await Bun.write(options.export, JSON.stringify(profile, null, 2));
      console.info(`\n💾 Profile exported to: ${options.export}`);
    }
  }

  private showHelp(): void {
    console.info(`
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
