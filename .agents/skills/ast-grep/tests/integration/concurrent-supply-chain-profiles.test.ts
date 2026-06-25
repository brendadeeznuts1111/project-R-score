import { describe, expect, test } from "bun:test";
import { resolve } from "node:path";
import {
  loadBundleProfile,
  loadPackageProfile,
  listProfiles,
} from "../../scripts/scan/transpiler/profile-loader.ts";
import { runBundleScan } from "../../scripts/scan/transpiler/bundle-scanner.ts";

const SKILL_ROOT = resolve(import.meta.dir, "../..");
const REPO_ROOT = resolve(SKILL_ROOT, "../../..");

describe("supply-chain profiles", () => {
  test("loadBundleProfile supply-chain-pillars enables remediation", async () => {
    const profile = await loadBundleProfile(SKILL_ROOT, "supply-chain-pillars");
    expect(profile.threat_feed).toBe(true);
    expect(profile.remediation_plan).toBe(true);
    expect(profile.policy_constraints).toBe(true);
    expect(profile.min_severity).toBe("warn");
  });

  test("loadPackageProfile pillars matches three pillars defaults", async () => {
    const profile = await loadPackageProfile(SKILL_ROOT, "pillars");
    expect(profile.threat_feed).toBe(true);
    expect(profile.remediation).toBe(true);
    expect(profile.min_severity).toBe("warn");
  });

  test("listProfiles returns bundle and package keys", async () => {
    const rows = await listProfiles(SKILL_ROOT);
    expect(rows.bundle.some((r) => r.name === "supply-chain-pillars")).toBe(true);
    expect(rows.packages.some((r) => r.name === "pillars")).toBe(true);
    expect(rows.packages.some((r) => r.name === "ci")).toBe(true);
  });

  test("supply-chain-pillars dry-run scan", async () => {
    const report = await runBundleScan({
      skillRoot: SKILL_ROOT,
      repo: REPO_ROOT,
      profileName: "supply-chain-pillars",
      zone: "agents",
      dryRun: true,
    });
    expect(report.profile).toBe("supply-chain-pillars");
    expect(report.threat_feed_enabled).toBe(true);
  });
});