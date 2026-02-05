#!/usr/bin/env bun
/**
 * @dev-hq/create - bun create @dev-hq/dev-workspace <project-name>
 *
 * Local dev usage:
 *   bun packages/create/index.ts @dev-hq dev-workspace my-dev-hq --force
 */

import { mkdir, rm, cp, writeFile } from "node:fs/promises";
import { stat } from "node:fs/promises";
import path from "node:path";
import process from "node:process";

type Args = {
  scope?: string;
  templateName?: string;
  targetDir?: string;
  force: boolean;
  noInstall: boolean;
  noGit: boolean;
  dryRun: boolean;
  open: boolean;
};

function parseArgs(argv: string[]): Args {
  // Expected argv (bun): [bun, script, scope, name, target?, ...flags]
  const [, , scope, templateName, targetDir, ...rest] = argv;

  const force = rest.includes("--force");
  const noInstall = rest.includes("--no-install");
  const noGit = rest.includes("--no-git");
  const dryRun = rest.includes("--dry-run");
  const open = rest.includes("--open");

  return {
    scope,
    templateName,
    targetDir,
    force,
    noInstall,
    noGit,
    dryRun,
    open,
  };
}

function usage(): string {
  return [
    "Usage:",
    "  bun create @dev-hq/dev-workspace <project-name> [--force] [--no-install] [--no-git] [--dry-run] [--open]",
    "",
    "Flags:",
    "  --force       Overwrite existing directory",
    "  --no-install  Skip bun install",
    "  --no-git      Skip git init and commit",
    "  --dry-run     Show what would be done without making changes",
    "  --open        Open browser after setup",
    "",
    "Environment:",
    "  DEV_HQ_TOKEN  GitHub token for scoped registry authentication",
    "",
    "Local dev:",
    "  bun packages/create/index.ts @dev-hq dev-workspace <project-name> [flags]",
  ].join("\n");
}

async function pathExists(p: string): Promise<boolean> {
  try {
    await stat(p);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(p: string) {
  await mkdir(p, { recursive: true });
}

async function run(cmd: string[], cwd: string) {
  const proc = Bun.spawn(cmd, {
    cwd,
    stdout: "inherit",
    stderr: "inherit",
    stdin: "inherit",
  });
  const code = await proc.exited;
  if (code !== 0) throw new Error(`Command failed (${code}): ${cmd.join(" ")}`);
}

async function main() {
  const args = parseArgs(Bun.argv);
  if (!args.scope || !args.templateName) {
    console.error(usage());
    process.exit(1);
  }

  // bun create @dev-hq/dev-workspace -> scope "@dev-hq/dev-workspace" (common)
  // local dev form -> scope "@dev-hq", templateName "dev-workspace"
  const combined = args.scope.includes("/")
    ? { scope: args.scope.split("/")[0], templateName: args.scope.split("/")[1] }
    : { scope: args.scope, templateName: args.templateName };

  if (combined.scope !== "@dev-hq" || combined.templateName !== "dev-workspace") {
    console.error(`Unsupported template: ${args.scope} ${args.templateName}`);
    console.error(usage());
    process.exit(1);
  }

  const targetName =
    args.scope.includes("/") ? args.templateName : args.targetDir;
  const dest = path.resolve(process.cwd(), targetName || "dev-hq");

  const templateDir = path.join(import.meta.dir, "template");
  if (!(await pathExists(templateDir))) {
    throw new Error(`Template directory not found: ${templateDir}`);
  }

  // Dry run mode - show what would be done
  if (args.dryRun) {
    console.log("🔍 Dry run mode - no changes will be made\n");
    console.log("Would perform the following actions:");
    console.log(`  📁 Template source: ${templateDir}`);
    console.log(`  📁 Target directory: ${dest}`);

    if (await pathExists(dest)) {
      if (args.force) {
        console.log(`  🗑️  Would remove existing directory: ${dest}`);
      } else {
        console.log(`  ❌ Target exists (use --force to overwrite): ${dest}`);
      }
    }

    console.log(`  📋 Would copy template to: ${dest}`);
    console.log(`  📝 Would rename package to: ${path.basename(dest)}`);

    if (!args.noInstall) {
      console.log(`  📦 Would run: bun install --workspace`);
    } else {
      console.log(`  ⏭️  Would skip: bun install (--no-install)`);
    }

    if (!args.noGit) {
      console.log(`  🔧 Would run: git init`);
      console.log(`  🔧 Would run: git add -A`);
      console.log(`  🔧 Would run: git commit -m "feat: Dev HQ workspace via bun create"`);
    } else {
      console.log(`  ⏭️  Would skip: git init (--no-git)`);
    }

    if (args.open) {
      console.log(`  🌐 Would open browser after setup`);
    }

    console.log("\n✅ Dry run complete. Remove --dry-run to execute.");
    return;
  }

  if (await pathExists(dest)) {
    if (!args.force) {
      throw new Error(
        `Target directory already exists: ${dest} (use --force to overwrite)`
      );
    }
    await rm(dest, { recursive: true, force: true });
  }

  await ensureDir(path.dirname(dest));
  await cp(templateDir, dest, { recursive: true });

  // Post-process: replace placeholder name in package.json and extract bun-create hooks
  // Per Bun docs: https://bun.com/docs/runtime/templating/create#from-a-local-template
  const rootPkg = path.join(dest, "package.json");
  let bunCreateHooks: { preinstall?: string | string[]; postinstall?: string | string[] } = {};

  if (await pathExists(rootPkg)) {
    const pkgJson = await Bun.file(rootPkg).json();
    const projectName = path.basename(dest);

    // Extract bun-create hooks before removing them
    if (pkgJson["bun-create"]) {
      bunCreateHooks = { ...pkgJson["bun-create"] };
    }

    // Update the name field
    pkgJson.name = projectName;

    // Remove bun-create section (Bun convention: it's removed after processing)
    if (pkgJson["bun-create"]) {
      delete pkgJson["bun-create"];
    }

    // Write updated package.json
    await writeFile(rootPkg, JSON.stringify(pkgJson, null, 2) + "\n");

    // Also update in workspace packages if they reference the root name
    const packagesDir = path.join(dest, "packages");
    if (await pathExists(packagesDir)) {
      const packages = ["core", "server", "cli"];
      for (const pkg of packages) {
        const pkgJson = path.join(packagesDir, pkg, "package.json");
        if (await pathExists(pkgJson)) {
          const pkgTxt = await Bun.file(pkgJson).text();
          const pkgUpdated = pkgTxt.replaceAll("dev-hq-workspace", projectName);
          await writeFile(pkgJson, pkgUpdated);
        }
      }
    }
  }

  // Post-process: update bunfig.toml with environment token if provided
  const bunfigPath = path.join(dest, "bunfig.toml");
  if (await pathExists(bunfigPath) && process.env.DEV_HQ_TOKEN) {
    const bunfigTxt = await Bun.file(bunfigPath).text();
    const bunfigUpdated = bunfigTxt.replace(
      /\$DEV_HQ_TOKEN/g,
      process.env.DEV_HQ_TOKEN
    );
    await writeFile(bunfigPath, bunfigUpdated);
  }

  // Run preinstall hooks from bun-create section
  if (bunCreateHooks.preinstall) {
    const preinstall = Array.isArray(bunCreateHooks.preinstall)
      ? bunCreateHooks.preinstall
      : [bunCreateHooks.preinstall];
    for (const cmd of preinstall) {
      console.log(`🔧 Running preinstall: ${cmd}`);
      await run(["sh", "-c", cmd], dest);
    }
  }

  if (!args.noInstall) {
    console.log("📦 Installing dependencies...");
    await run(["bun", "install", "--workspace"], dest);
  }

  // Run postinstall hooks from bun-create section
  if (bunCreateHooks.postinstall) {
    const postinstall = Array.isArray(bunCreateHooks.postinstall)
      ? bunCreateHooks.postinstall
      : [bunCreateHooks.postinstall];
    for (const cmd of postinstall) {
      console.log(`🔧 Running postinstall: ${cmd}`);
      await run(["sh", "-c", cmd], dest);
    }
  }

  if (!args.noGit) {
    try {
      console.log("🔧 Initializing git repository...");
      await run(["git", "init"], dest);
      await run(["git", "add", "-A"], dest);
      await run(["git", "commit", "-m", "feat: Dev HQ workspace via bun create"], dest);
    } catch (e) {
      // git might not exist in all environments; ignore.
    }
  }

  console.log(`\n✅ Dev HQ workspace created!`);
  console.log(`cd ${path.relative(process.cwd(), dest) || "."}`);
  console.log(`bun run dev`);

  if (args.open) {
    // Try to open browser (platform-specific)
    const serverPkg = path.join(dest, "packages", "server", "package.json");
    if (await pathExists(serverPkg)) {
      try {
        const pkgJson = await Bun.file(serverPkg).json();
        const port = pkgJson.port || 3000;
        const url = `http://localhost:${port}`;

        // Platform-specific open command
        const openCmd = process.platform === "darwin"
          ? "open"
          : process.platform === "win32"
          ? "start"
          : "xdg-open";

        // Run in background after a delay to let server start
        setTimeout(() => {
          Bun.spawn([openCmd, url], {
            detached: true,
            stdio: "ignore",
          }).unref();
        }, 2000);
      } catch (e) {
        // Browser opening is optional; ignore errors
      }
    }
  }
}

await main();


