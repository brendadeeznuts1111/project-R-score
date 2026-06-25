#!/usr/bin/env bun
/**
 * skill-manager.ts
 * Main CLI for skill management
 *
 * Usage:
 *   bun run skill-manager.ts list [--category ai] [--status ready] [--tag beta]
 *   bun run skill-manager.ts info <skill-name>
 *   bun run skill-manager.ts test <skill-name>
 *   bun run skill-manager.ts install <skill-name>
 *   bun run skill-manager.ts report [--json]
 *   bun run skill-manager.ts backup [--output file.tar.gz]
 *   bun run skill-manager.ts serve [--port 3000]
 *
 * Compile to executable:
 *   bun build --compile skill-manager.ts --outfile skill-manager
 */

import { parseArgs } from "util";
import skillsModule from "./src/skills";
import integrity from "./src/integrity";
import security from "./src/security";
import { ProductionSkillsSystem } from "./src/system";
import { SkillPackager, displayPackageInfo, displayPackageResult } from "./src/packager";
import { SkillVersionManager, displayChangelog, displayVersionComparison, displayUpgradePath } from "./src/version-manager";
import { SkillAPIServer } from "./src/api-server";
import { ExecutableBuilder } from "./src/lib/executable-builder";

const { skills, allSkills, getByCategory, getByStatus, getByTag, getSkill, getReady, getNeedsAttention, formatStatus, formatHealth, printTable } = skillsModule;

const [command, ...args] = Bun.argv.slice(2);

const help = `
skill-manager - Clawdbot Skills Management CLI

Commands:
  list [options]      List skills with filters
    --category, -c    Filter by category (ai, communication, etc.)
    --status, -s      Filter by status (ready, env, bin, multiple)
    --tag, -t         Filter by tag (beta, local-only, etc.)
    --compact         Compact output
    --json            JSON output

  info <name>         Show detailed skill info
  test <name>         Test if skill is working
  install <name>      Show install instructions
  report              Generate skills report
  backup              Create backup archive
  verify <file>       Verify backup archive integrity (CRC32)
  integrity           Check skill integrity and binary status
  security            Show security configuration
  status              Show system status
  serve               Start API server

  package <name>      Create a skill package (.skpkg)
    --skills, -s      Comma-separated skill names (default: all)
    --category, -c    Package skills from category
    --description     Package description
    --author          Package author
    --output, -o      Output directory (default: ./packages)

  import <file>       Import skills from a package
  verify-pkg <file>   Verify package integrity
  list-pkg <file>     List package contents

  changelog <name>    Show skill changelog (JSONC)
  versions <name>     Show version history
  compare <name>      Compare current vs latest version
  upgrade-path <name> Show upgrade path with warnings
  outdated            List skills with available updates

  build <name>        Build standalone executable
    --target, -t      Target platform (linux-x64, macos-arm64, etc.)
    --output, -o      Output directory (default: ./dist)
    --compress        Enable compression (default: true)
    --no-compress     Disable compression
    --minify          Enable minification (default: true)
    --debug           Enable debug mode

  build-multi <name>  Build for multiple platforms
    [targets]         Comma-separated targets

  build-app <name>    Create app bundle (.app, AppDir)
    <app-name>        Application display name

  build-docker <name> Build Docker image
    [image-name]      Docker image name

  build-list          List cached builds
  build-clean         Clean build cache

Examples:
  skill-manager list --category ai
  skill-manager list --status ready --compact
  skill-manager info github
  skill-manager report --json | jq '.summary'
  skill-manager verify backup.tar.gz
  skill-manager integrity
  skill-manager package ai-tools --category ai --author "Your Name"
  skill-manager import ./packages/ai-tools.skpkg
  skill-manager list-pkg ./packages/ai-tools.skpkg
  skill-manager changelog github
  skill-manager outdated
  skill-manager build github --target macos-arm64
  skill-manager build-multi github linux-x64,macos-arm64,windows-x64
  skill-manager build-app weather "Weather App"
  skill-manager build-docker weather myregistry/weather
  skill-manager build-list
`;

async function main() {
  switch (command) {
    case "list":
    case "ls": {
      const { values } = parseArgs({
        args,
        options: {
          category: { type: "string", short: "c" },
          status: { type: "string", short: "s" },
          tag: { type: "string", short: "t" },
          compact: { type: "boolean", default: false },
          json: { type: "boolean", default: false },
        },
      });

      let filtered = allSkills;
      if (values.category) filtered = filtered.filter(s => s.category === values.category);
      if (values.status) filtered = filtered.filter(s => s.status === values.status);
      if (values.tag) filtered = filtered.filter(s => s.tags.includes(values.tag));

      if (values.json) {
        console.info(JSON.stringify(filtered, null, 2));
      } else if (values.compact) {
        filtered.forEach(s => {
          console.info(`${formatStatus(s.status)} ${s.icon} ${s.name.padEnd(20)} ${s.category}`);
        });
      } else {
        printTable(filtered);
      }
      break;
    }

    case "info": {
      const name = args[0];
      if (!name) {
        console.error("Usage: skill-manager info <skill-name>");
        process.exit(1);
      }

      const skill = getSkill(name);
      if (!skill) {
        console.error(`Skill not found: ${name}`);
        process.exit(1);
      }

      console.info(`
${skill.icon} ${skill.name} (${skill.category})
${"─".repeat(40)}
Description: ${skill.description}
Status:      ${formatStatus(skill.status)} ${skill.status}
Health:      ${formatHealth(skill.health)} ${skill.health}%
Version:     ${skill.version || "—"}
Path:        ${skill.path || "—"}
Homepage:    ${skill.homepage || "—"}

Missing:     ${skill.missing.length ? skill.missing.join(", ") : "None"}
Action:      ${skill.action}
Priority:    ${skill.priority || "—"}
Setup Time:  ${skill.setupTime || "—"}

Tags:        ${skill.tags.join(", ") || "None"}
Combos:      ${skill.combos.join("; ") || "None"}

Color:       ${skill.color.hex} (H:${skill.color.H} S:${skill.color.S} L:${skill.color.L})
             RGB(${skill.color.R}, ${skill.color.G}, ${skill.color.B})
Codepoint:   ${skill.codepoint}
`);
      break;
    }

    case "test": {
      const name = args[0];
      if (!name) {
        console.error("Usage: skill-manager test <skill-name>");
        process.exit(1);
      }

      const skill = getSkill(name);
      if (!skill) {
        console.error(`Skill not found: ${name}`);
        process.exit(1);
      }

      console.info(`Testing ${skill.icon} ${skill.name}...`);

      if (skill.path) {
        const binary = skill.path.split("/").pop()!;

        // Use secure execution
        const whichResult = security.safeSpawnSync(["which", binary]);

        if (whichResult.success) {
          console.info(`✅ Binary found: ${whichResult.stdout.trim()}`);

          // Try to get version with timeout
          const versionResult = security.executeSkillBinary(binary, ["--version"], {
            timeout: 5000,
            maxOutputSize: 1024,
          });

          if (versionResult.success && versionResult.stdout.trim()) {
            console.info(`   Version: ${versionResult.stdout.trim().split("\n")[0]}`);
          }
          console.info(`   Exec time: ${whichResult.durationMs.toFixed(2)}ms`);
        } else {
          console.info(`❌ Binary not found`);
          if (whichResult.stderr) {
            console.info(`   Error: ${whichResult.stderr}`);
          }
        }
      } else if (skill.status === "ready") {
        console.info(`✅ Skill is ready (API-based or builtin)`);
      } else {
        console.info(`❌ Skill not ready: ${skill.action}`);
      }
      break;
    }

    case "install": {
      const name = args[0];
      if (!name) {
        console.error("Usage: skill-manager install <skill-name>");
        process.exit(1);
      }

      const skill = getSkill(name);
      if (!skill) {
        console.error(`Skill not found: ${name}`);
        process.exit(1);
      }

      if (skill.status === "ready") {
        console.info(`${skill.icon} ${skill.name} is already installed!`);
        break;
      }

      console.info(`\n${skill.icon} ${skill.name} Installation\n${"─".repeat(40)}`);
      console.info(`Status: ${skill.action}`);
      console.info(`Homepage: ${skill.homepage || "N/A"}\n`);

      skill.missing.forEach(m => {
        if (m.startsWith("bins:")) {
          const bin = m.replace("bins:", "").trim();
          console.info(`Binary: ${bin}`);
          console.info(`  brew install ${bin}`);
          console.info(`  # or check ${skill.homepage}\n`);
        } else if (m.startsWith("env:")) {
          const envs = m.replace("env:", "").trim();
          console.info(`Environment: ${envs}`);
          console.info(`  export ${envs.split(",")[0].trim()}=your_key_here\n`);
        } else if (m.startsWith("config:")) {
          const cfg = m.replace("config:", "").trim();
          console.info(`Config: ${cfg}`);
          console.info(`  Edit ~/.clawdbot/clawdbot.json\n`);
        }
      });
      break;
    }

    case "report": {
      const { values } = parseArgs({
        args,
        options: {
          json: { type: "boolean", default: false },
        },
      });

      const byCategory: Record<string, number> = {};
      const byStatus: Record<string, number> = {};

      allSkills.forEach(s => {
        byCategory[s.category] = (byCategory[s.category] || 0) + 1;
        byStatus[s.status] = (byStatus[s.status] || 0) + 1;
      });

      const report = {
        summary: {
          total: skills.meta.total,
          ready: skills.meta.ready,
          missing: skills.meta.missing,
          healthPercent: Math.round((skills.meta.ready / skills.meta.total) * 100),
        },
        byCategory,
        byStatus,
        needsAttention: getNeedsAttention().map(s => s.name),
        topPriority: allSkills.filter(s => s.priority === "P1").map(s => s.name),
        generatedAt: new Date().toISOString(),
      };

      if (values.json) {
        console.info(JSON.stringify(report, null, 2));
      } else {
        console.info(`\nSkills Report\n${"═".repeat(40)}`);
        console.info(`Total: ${report.summary.total}`);
        console.info(`Ready: ${report.summary.ready} (${report.summary.healthPercent}%)`);
        console.info(`Missing: ${report.summary.missing}`);
        console.info(`\nBy Category:`);
        Object.entries(byCategory).forEach(([k, v]) => {
          console.info(`  ${k.padEnd(15)} ${v}`);
        });
        console.info(`\nBy Status:`);
        Object.entries(byStatus).forEach(([k, v]) => {
          console.info(`  ${formatStatus(k)} ${k.padEnd(10)} ${v}`);
        });
        if (report.topPriority.length) {
          console.info(`\nTop Priority (P1):`);
          report.topPriority.forEach(s => console.info(`  - ${s}`));
        }
      }
      break;
    }

    case "backup": {
      const { values } = parseArgs({
        args,
        options: {
          output: { type: "string", short: "o", default: `skills-backup-${new Date().toISOString().split("T")[0]}.tar.gz` },
        },
      });

      // Delegate to backup script
      const proc = Bun.spawn(["bun", "run", "backup-skills.ts", "-o", values.output], {
        stdout: "inherit",
        stderr: "inherit",
      });
      await proc.exited;
      break;
    }

    case "verify": {
      const archivePath = args[0];
      if (!archivePath) {
        console.error("Usage: skill-manager verify <archive.tar.gz>");
        process.exit(1);
      }

      const file = Bun.file(archivePath);
      if (!(await file.exists())) {
        console.error(`File not found: ${archivePath}`);
        process.exit(1);
      }

      console.info(`Verifying: ${archivePath}`);

      // Calculate CRC32 (hardware-accelerated, 20x faster)
      const bytes = await file.bytes();
      const calculated = Bun.hash.crc32(bytes);
      const calculatedHex = calculated.toString(16).padStart(8, "0");

      // Check for .crc32 file
      const checksumPath = archivePath.replace(/\.(tar\.gz|tgz)$/, ".crc32");
      const checksumFile = Bun.file(checksumPath);

      if (await checksumFile.exists()) {
        const checksumContent = await checksumFile.text();
        const expectedHex = checksumContent.trim().split(/\s+/)[0];

        if (calculatedHex === expectedHex) {
          console.info(`✅ CRC32 verified: ${calculatedHex}`);
          console.info(`   Size: ${(bytes.length / 1024).toFixed(2)} KB`);

          // Extract and show manifest
          try {
            const archive = new Bun.Archive(bytes);
            const manifest = archive.get("manifest.json");
            if (manifest) {
              const data = JSON.parse(new TextDecoder().decode(manifest));
              console.info(`   Version: ${data.version}`);
              console.info(`   Created: ${data.created}`);
              console.info(`   Skills: ${data.total} (${data.ready} ready)`);
            }
          } catch (err) {
            console.warn(`   ⚠️  Failed to read manifest:`, err);
          }
        } else {
          console.info(`❌ CRC32 mismatch!`);
          console.info(`   Expected: ${expectedHex}`);
          console.info(`   Got:      ${calculatedHex}`);
          process.exit(1);
        }
      } else {
        console.info(`⚠️  No checksum file found: ${checksumPath}`);
        console.info(`   Calculated CRC32: ${calculatedHex}`);
        console.info(`   Size: ${(bytes.length / 1024).toFixed(2)} KB`);
      }
      break;
    }

    case "security": {
      security.displaySecurityCheck();
      break;
    }

    case "status": {
      const system = new ProductionSkillsSystem();
      const status = system.getStatus(allSkills);

      console.info("\n📊 System Status");
      console.info("─".repeat(50));

      const data = [
        { Metric: "Total Skills", Value: status.totalSkills.toString() },
        { Metric: "Ready Skills", Value: `${status.readySkills} (${Math.round(status.readySkills / status.totalSkills * 100)}%)` },
        { Metric: "Binaries Found", Value: `${status.binariesFound}/${status.binariesTotal}` },
        { Metric: "S3 Configured", Value: status.s3Configured ? "✅ Yes" : "❌ No" },
        { Metric: "TLS Enabled", Value: status.tlsEnabled ? "✅ Yes" : "❌ No" },
      ];

      console.info(Bun.inspect.table(data, { colors: true }));
      break;
    }

    case "integrity":
    case "check": {
      const { values } = parseArgs({
        args,
        options: {
          json: { type: "boolean", default: false },
          checksums: { type: "boolean", default: false },
          binaries: { type: "boolean", default: false },
        },
      });

      if (values.json) {
        const report = integrity.generateIntegrityReport(allSkills);
        console.info(JSON.stringify(report, null, 2));
      } else if (values.checksums) {
        integrity.displayChecksums(allSkills, 20);
      } else if (values.binaries) {
        integrity.displayBinaryStatus(allSkills);
      } else {
        integrity.displayIntegrityReport(allSkills);
      }
      break;
    }

    case "serve": {
      const { values } = parseArgs({
        args,
        options: {
          port: { type: "string", short: "p", default: "3000" },
          help: { type: "boolean", short: "h", default: false },
        },
      });

      if (values.help) {
        console.info(`
Usage: skill-manager serve [options]

Start the Skill API server with REST endpoints and dashboard.

Options:
  -p, --port <number>   Port to listen on (default: 3000)
  -h, --help            Show this help message

Environment:
  SKILL_API_KEYS        Comma-separated API keys (default: dev-key)

Endpoints:
  GET  /dashboard           Web dashboard
  GET  /api/health          Health check with Tailscale status
  GET  /api/skills          List all skills
  GET  /api/skills/:name    Get skill details
  POST /api/skills/:name/execute   Execute skill command
  GET  /api/skills/:name/test      Test skill binary
  GET  /api/metrics         Execution metrics
  GET  /api/integrity       Integrity report
  GET  /api/report          Summary report
  GET  /api/package         Create skill package

Examples:
  skill-manager serve              # Start on port 3000
  skill-manager serve -p 8080      # Start on port 8080
`);
        break;
      }

      const port = parseInt(values.port);
      const server = new SkillAPIServer();
      server.start(port);
      break;
    }

    case "package":
    case "pkg": {
      const name = args[0];
      if (!name) {
        console.error("Usage: skill-manager package <name> [options]");
        process.exit(1);
      }

      const { values } = parseArgs({
        args: args.slice(1),
        options: {
          skills: { type: "string", short: "s" },
          category: { type: "string", short: "c" },
          description: { type: "string" },
          author: { type: "string" },
          output: { type: "string", short: "o", default: "./packages" },
        },
      });

      let skillsToPackage = allSkills;

      // Filter by specific skills
      if (values.skills) {
        const skillNames = values.skills.split(",").map((s) => s.trim());
        skillsToPackage = skillsToPackage.filter((s) => skillNames.includes(s.name));
        if (skillsToPackage.length === 0) {
          console.error(`No skills found matching: ${values.skills}`);
          process.exit(1);
        }
      }

      // Filter by category
      if (values.category) {
        skillsToPackage = skillsToPackage.filter((s) => s.category === values.category);
        if (skillsToPackage.length === 0) {
          console.error(`No skills found in category: ${values.category}`);
          process.exit(1);
        }
      }

      console.info(`\n📦 Creating package: ${name}`);
      console.info(`   Skills: ${skillsToPackage.length}`);
      console.info(`   Output: ${values.output}`);

      const packager = new SkillPackager(values.output);
      const result = await packager.package(skillsToPackage, {
        name,
        description: values.description,
        author: values.author,
      });

      displayPackageResult(result);
      break;
    }

    case "import": {
      const packagePath = args[0];
      if (!packagePath) {
        console.error("Usage: skill-manager import <package.skpkg>");
        process.exit(1);
      }

      console.info(`\n📥 Importing package: ${packagePath}`);

      const packager = new SkillPackager();
      const result = await packager.import(packagePath);

      if (result.success) {
        console.info(`\n✅ Package imported successfully!`);
        console.info(`   Skills: ${result.skills?.length || 0}`);
        if (result.manifest) {
          console.info(`   Package: ${result.manifest.name}`);
          console.info(`   Created: ${result.manifest.created}`);
        }
        if (result.warnings && result.warnings.length > 0) {
          console.info(`\n⚠️  Warnings:`);
          result.warnings.forEach((w) => console.info(`   - ${w}`));
        }

        // Display imported skills
        if (result.skills && result.skills.length > 0) {
          console.info(`\nImported Skills:`);
          const data = result.skills.map((s) => ({
            "#": s.id,
            skill: `${s.icon} ${s.name}`,
            category: s.category,
            status: formatStatus(s.status),
          }));
          console.info(Bun.inspect.table(data, { colors: true }));
        }
      } else {
        console.info(`\n❌ Import failed: ${result.error}`);
        process.exit(1);
      }
      break;
    }

    case "verify-pkg": {
      const packagePath = args[0];
      if (!packagePath) {
        console.error("Usage: skill-manager verify-pkg <package.skpkg>");
        process.exit(1);
      }

      console.info(`\n🔍 Verifying package: ${packagePath}`);

      const packager = new SkillPackager();
      const result = await packager.verify(packagePath);

      if (result.valid) {
        console.info(`\n✅ Package is valid!`);
        if (result.manifest) {
          console.info(`   Name: ${result.manifest.name}`);
          console.info(`   Skills: ${result.manifest.skills.length}`);
          console.info(`   CRC32: ${result.manifest.masterChecksum}`);
        }
      } else {
        console.info(`\n❌ Package verification failed!`);
        result.issues.forEach((issue) => console.info(`   - ${issue}`));
        process.exit(1);
      }
      break;
    }

    case "list-pkg": {
      const packagePath = args[0];
      if (!packagePath) {
        console.error("Usage: skill-manager list-pkg <package.skpkg>");
        process.exit(1);
      }

      const packager = new SkillPackager();
      const result = await packager.list(packagePath);

      if (result.success && result.manifest) {
        displayPackageInfo(result.manifest);
      } else {
        console.error(`Failed to read package: ${result.error}`);
        process.exit(1);
      }
      break;
    }

    case "changelog": {
      const name = args[0];
      if (!name) {
        console.error("Usage: skill-manager changelog <skill-name>");
        process.exit(1);
      }

      const { values } = parseArgs({
        args: args.slice(1),
        options: {
          limit: { type: "string", short: "l", default: "5" },
          json: { type: "boolean", default: false },
        },
      });

      const versionManager = new SkillVersionManager("./changelogs");
      const changelog = await versionManager.parseChangelog(name);

      if (!changelog) {
        console.error(`No changelog found for: ${name}`);
        console.error(`  Expected: ./changelogs/${name}.jsonc`);
        process.exit(1);
      }

      if (values.json) {
        console.info(JSON.stringify(changelog, null, 2));
      } else {
        displayChangelog(changelog, parseInt(values.limit));
      }
      break;
    }

    case "versions": {
      const name = args[0];
      if (!name) {
        console.error("Usage: skill-manager versions <skill-name>");
        process.exit(1);
      }

      const { values } = parseArgs({
        args: args.slice(1),
        options: {
          limit: { type: "string", short: "l", default: "10" },
        },
      });

      const versionManager = new SkillVersionManager("./changelogs");
      const versions = await versionManager.getVersionHistory(name, parseInt(values.limit));

      if (versions.length === 0) {
        console.error(`No version history found for: ${name}`);
        process.exit(1);
      }

      console.info(`\n📜 Version History: ${name}`);
      console.info("─".repeat(50));

      const data = versions.map((v) => ({
        Version: v.version,
        Date: v.date,
        Breaking: v.breaking ? "⚠️" : "",
        Changes: v.changes.length.toString(),
      }));

      console.info(Bun.inspect.table(data, { colors: true }));
      break;
    }

    case "compare": {
      const name = args[0];
      if (!name) {
        console.error("Usage: skill-manager compare <skill-name>");
        process.exit(1);
      }

      const skill = getSkill(name);
      if (!skill) {
        console.error(`Skill not found: ${name}`);
        process.exit(1);
      }

      if (!skill.version) {
        console.error(`Skill '${name}' has no version information`);
        process.exit(1);
      }

      const versionManager = new SkillVersionManager("./changelogs");
      const comparison = await versionManager.compareVersion(name, skill.version);

      if (!comparison) {
        console.error(`No changelog found for: ${name}`);
        process.exit(1);
      }

      displayVersionComparison(name, comparison);
      break;
    }

    case "upgrade-path": {
      const name = args[0];
      if (!name) {
        console.error("Usage: skill-manager upgrade-path <skill-name> [--from version] [--to version]");
        process.exit(1);
      }

      const skill = getSkill(name);
      if (!skill) {
        console.error(`Skill not found: ${name}`);
        process.exit(1);
      }

      const { values } = parseArgs({
        args: args.slice(1),
        options: {
          from: { type: "string", short: "f" },
          to: { type: "string", short: "t" },
        },
      });

      const fromVersion = values.from || skill.version;
      if (!fromVersion) {
        console.error(`Skill '${name}' has no version. Use --from to specify.`);
        process.exit(1);
      }

      const versionManager = new SkillVersionManager("./changelogs");
      const result = await versionManager.getUpgradePath(name, fromVersion, values.to);

      displayUpgradePath(result);
      break;
    }

    case "outdated": {
      const { values } = parseArgs({
        args,
        options: {
          json: { type: "boolean", default: false },
        },
      });

      const versionManager = new SkillVersionManager("./changelogs");
      const outdated = await versionManager.getOutdatedSkills(allSkills);

      if (values.json) {
        console.info(JSON.stringify(outdated, null, 2));
        break;
      }

      if (outdated.length === 0) {
        console.info("\n✅ All skills are up to date!");
        break;
      }

      console.info(`\n⬆️  Outdated Skills (${outdated.length})`);
      console.info("─".repeat(60));

      const data = outdated.map(({ skill, comparison }) => ({
        Skill: `${skill.icon} ${skill.name}`,
        Current: comparison.current,
        Latest: comparison.latest,
        Behind: comparison.behind.toString(),
        Breaking: comparison.hasBreakingChanges ? "⚠️  Yes" : "No",
      }));

      console.info(Bun.inspect.table(data, { colors: true }));
      break;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // Build Commands
    // ═══════════════════════════════════════════════════════════════════════

    case "build": {
      // Handle --help first
      if (args.includes("--help") || args.includes("-h") || args.length === 0) {
        console.info(`
Usage: skill-manager build <skill-id> [options]

Build a standalone executable for a skill.

Options:
  -t, --target <target>   Target platform (linux-x64, macos-arm64, etc.)
  -o, --output <dir>      Output directory (default: ./dist)
  --compress              Enable compression (default: true)
  --minify                Enable minification (default: true)
  -d, --debug             Enable debug mode
  -h, --help              Show this help

Targets:
  linux-x64, linux-arm64, macos-x64, macos-arm64, windows-x64

Examples:
  skill-manager build github
  skill-manager build github --target linux-x64
  skill-manager build weather -t macos-arm64 -o ./output
`);
        break;
      }

      const skillId = args[0];
      if (!skillId || skillId.startsWith("-")) {
        console.error("Usage: skill-manager build <skill-id> [options]");
        process.exit(1);
      }

      const { values } = parseArgs({
        args: args.slice(1),
        options: {
          target: { type: "string", short: "t" },
          output: { type: "string", short: "o" },
          compress: { type: "boolean", default: true },
          minify: { type: "boolean", default: true },
          debug: { type: "boolean", short: "d", default: false },
        },
      });

      const builder = new ExecutableBuilder();

      console.info(`\n🔨 Building executable for: ${skillId}`);
      console.info("─".repeat(60));

      try {
        const result = await builder.buildSkillExecutable(skillId, {
          target: values.target as any,
          outputDir: values.output || "./dist",
          compress: values.compress,
          minify: values.minify,
          debug: values.debug,
        });

        // Display logs
        if (result.logs.length > 0) {
          console.info("\n📝 Build Logs:");
          result.logs.forEach((log) => console.info(`   ${log}`));
        }

        console.info("─".repeat(60));

        if (result.success) {
          console.info(`✅ Built: ${result.executablePath}`);
          console.info(`📊 Size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
          if (result.compressedSize) {
            console.info(`🗜️  Compressed: ${(result.compressedSize / 1024 / 1024).toFixed(2)} MB`);
          }
          console.info(`🔐 Checksum: ${result.metadata.checksum}`);
        } else {
          console.info("❌ Build failed");
          process.exit(1);
        }
      } catch (error: any) {
        console.error(`❌ Build failed: ${error.message}`);
        process.exit(1);
      }
      break;
    }

    case "build-multi": {
      // Handle --help first
      if (args.includes("--help") || args.includes("-h") || args.length === 0) {
        console.info(`
Usage: skill-manager build-multi <skill-id> [targets]

Build standalone executables for multiple platforms.

Arguments:
  skill-id              The skill to build
  targets               Comma-separated list of targets (optional)

Targets:
  linux-x64             Linux x86_64
  linux-arm64           Linux ARM64
  macos-x64             macOS Intel
  macos-arm64           macOS Apple Silicon
  windows-x64           Windows x86_64

If no targets specified, builds for all 5 platforms.

Examples:
  skill-manager build-multi weather
  skill-manager build-multi weather linux-x64,macos-arm64
  skill-manager build-multi github linux-x64,linux-arm64,windows-x64
`);
        break;
      }

      const skillId = args[0];
      const targetsStr = args[1];

      if (!skillId || skillId.startsWith("-")) {
        console.error("Usage: skill-manager build-multi <skill-id> [targets]");
        console.error("Targets: linux-x64,linux-arm64,macos-x64,macos-arm64,windows-x64");
        process.exit(1);
      }

      const builder = new ExecutableBuilder();

      // Parse targets
      type BuildTarget = "bun-linux-x64" | "bun-linux-arm64" | "bun-macos-x64" | "bun-macos-arm64" | "bun-windows-x64";

      const defaultTargets: BuildTarget[] = [
        "bun-linux-x64",
        "bun-linux-arm64",
        "bun-macos-x64",
        "bun-macos-arm64",
        "bun-windows-x64",
      ];

      let targets: BuildTarget[] = defaultTargets;

      if (targetsStr) {
        targets = targetsStr.split(",").map((t) => {
          const [platform, arch] = t.trim().split("-");
          if (platform === "linux") return arch === "arm64" ? "bun-linux-arm64" : "bun-linux-x64";
          if (platform === "macos") return arch === "arm64" ? "bun-macos-arm64" : "bun-macos-x64";
          if (platform === "windows") return "bun-windows-x64";
          return `bun-${t}` as BuildTarget;
        });
      }

      console.info(`\n🎯 Building for ${targets.length} targets...`);
      console.info("═".repeat(60));

      const results = await builder.buildMultiTarget(skillId, targets);

      console.info("\n📊 Build Results:");
      console.info("═".repeat(60));

      let success = 0;
      let failed = 0;

      for (const [target, result] of results) {
        const status = result.success ? "✅" : "❌";
        const size = result.success ? `${(result.size / 1024 / 1024).toFixed(2)} MB` : "FAILED";
        console.info(`${status} ${target.padEnd(22)} ${size}`);

        if (result.success) success++;
        else failed++;
      }

      console.info("═".repeat(60));
      console.info(`✅ Success: ${success}, ❌ Failed: ${failed}`);
      break;
    }

    case "build-app": {
      // Handle --help first
      if (args.includes("--help") || args.includes("-h") || args.length === 0) {
        console.info(`
Usage: skill-manager build-app <skill-id> <app-name>

Create a portable app bundle for a skill.

Arguments:
  skill-id              The skill to package
  app-name              Display name for the application

Output formats by platform:
  macOS                 .app bundle
  Linux                 AppDir (for AppImage)
  Windows               Folder with launcher

Examples:
  skill-manager build-app weather "Weather App"
  skill-manager build-app github "GitHub CLI"
`);
        break;
      }

      const skillId = args[0];
      const appName = args[1];

      if (!skillId || !appName || skillId.startsWith("-")) {
        console.error("Usage: skill-manager build-app <skill-id> <app-name>");
        process.exit(1);
      }

      const builder = new ExecutableBuilder();

      console.info(`\n📦 Creating app bundle: ${appName}`);
      console.info("─".repeat(60));

      try {
        const bundlePath = await builder.createAppBundle(skillId, appName);
        console.info(`✅ App bundle created: ${bundlePath}`);

        if (process.platform === "darwin") {
          console.info("\n📦 To create a DMG installer:");
          console.info(`   hdiutil create -volname "${appName}" -srcfolder "${bundlePath}" -ov -format UDZO "${appName}.dmg"`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to create app bundle: ${error.message}`);
        process.exit(1);
      }
      break;
    }

    case "build-docker": {
      // Handle --help first
      if (args.includes("--help") || args.includes("-h") || args.length === 0) {
        console.info(`
Usage: skill-manager build-docker <skill-id> [image-name]

Build a Docker image for a skill.

Arguments:
  skill-id              The skill to containerize
  image-name            Docker image name (default: skill-id)

The generated image:
  - Based on oven/bun:alpine
  - Runs as non-root user
  - Includes health check
  - Optimized for size

Examples:
  skill-manager build-docker weather
  skill-manager build-docker weather myregistry/weather
  skill-manager build-docker github ghcr.io/user/github-skill
`);
        break;
      }

      const skillId = args[0];
      const imageName = args[1];

      if (!skillId || skillId.startsWith("-")) {
        console.error("Usage: skill-manager build-docker <skill-id> [image-name]");
        process.exit(1);
      }

      const builder = new ExecutableBuilder();

      console.info(`\n🐳 Building Docker image for: ${skillId}`);
      console.info("─".repeat(60));

      try {
        const image = await builder.buildDockerImage(skillId, {
          imageName: imageName || skillId,
        });
        console.info(`✅ Docker image built: ${image}`);
        console.info("\n🐳 To run:");
        console.info(`   docker run -it --rm ${image}`);
      } catch (error: any) {
        console.error(`❌ Docker build failed: ${error.message}`);
        process.exit(1);
      }
      break;
    }

    case "build-list": {
      const builder = new ExecutableBuilder();
      const db = builder.getBuildCache();

      const builds = db.query("SELECT * FROM builds ORDER BY build_time DESC LIMIT 20").all() as any[];

      if (builds.length === 0) {
        console.info("No builds in cache");
        break;
      }

      console.info("\n📊 Cached Builds:");
      console.info("═".repeat(90));

      const data = builds.map((build) => {
        const metadata = JSON.parse(build.metadata);
        return {
          Skill: metadata.skill?.name || build.skill_id,
          Version: metadata.skill?.version || build.version,
          Target: build.target || "unknown",
          Size: `${(build.size / 1024 / 1024).toFixed(2)} MB`,
          Built: new Date(build.build_time).toLocaleString(),
          Checksum: build.checksum.slice(0, 8) + "...",
        };
      });

      console.info(Bun.inspect.table(data, { colors: true }));

      const totalSize = builds.reduce((sum, b) => sum + b.size, 0);
      console.info(`\n📊 Total: ${builds.length} builds, ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
      break;
    }

    case "build-clean": {
      const cacheDir = "./.build-cache";

      const result = Bun.spawnSync(["du", "-sh", cacheDir]);
      if (result.exitCode === 0) {
        const size = result.stdout.toString().split("\t")[0];
        console.info(`🧹 Cleaning cache: ${size}`);
        Bun.spawnSync(["rm", "-rf", cacheDir]);
        console.info("✅ Cache cleaned");
      } else {
        console.info("Cache directory not found or already clean");
      }
      break;
    }

    case "help":
    case "--help":
    case "-h":
    default:
      console.info(help);
  }
}

main().catch(console.error);
