import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { ReportFormat, ScanProfile, Severity } from "./types.ts";

export type PackageScanProfile = {
  description?: string;
  min_severity: Severity;
  threat_feed?: boolean;
  remediation?: boolean;
  include_dev_dependencies?: boolean;
  report_format?: ReportFormat;
  markdown_colored?: boolean;
};

type ProfilesDoc = {
  version?: number;
  description?: string;
  profiles?: Record<string, ScanProfile>;
  package_profiles?: Record<string, PackageScanProfile>;
};

const DEFAULT_PACKAGE_PROFILE: PackageScanProfile = {
  description: "Default package policy scan",
  min_severity: "warn",
  threat_feed: true,
  remediation: true,
  include_dev_dependencies: false,
};

export async function loadProfilesDoc(skillRoot: string): Promise<ProfilesDoc> {
  const path = join(skillRoot, "bundle-threat-profiles.json");
  return JSON.parse(await readFile(path, "utf8")) as ProfilesDoc;
}

export async function loadBundleProfile(
  skillRoot: string,
  profileName: string,
): Promise<ScanProfile> {
  const doc = await loadProfilesDoc(skillRoot);
  const profile = doc.profiles?.[profileName];
  if (!profile) {
    const names = Object.keys(doc.profiles ?? {}).sort().join(", ");
    throw new Error(`unknown bundle profile '${profileName}' — choose: ${names}`);
  }
  return profile;
}

export async function loadPackageProfile(
  skillRoot: string,
  profileName?: string,
): Promise<PackageScanProfile> {
  const doc = await loadProfilesDoc(skillRoot);
  const name = profileName ?? "default";
  const profile = doc.package_profiles?.[name];
  if (!profile) {
    const names = Object.keys(doc.package_profiles ?? {}).sort().join(", ");
    throw new Error(`unknown package profile '${name}' — choose: ${names}`);
  }
  return profile;
}

export async function listProfiles(skillRoot: string): Promise<{
  bundle: Array<{ name: string; description?: string }>;
  packages: Array<{ name: string; description?: string }>;
}> {
  const doc = await loadProfilesDoc(skillRoot);
  const bundle = Object.entries(doc.profiles ?? {}).map(([name, p]) => ({
    name,
    description: p.description,
  }));
  const packages = Object.entries(doc.package_profiles ?? {}).map(([name, p]) => ({
    name,
    description: p.description,
  }));
  return { bundle, packages };
}

export { DEFAULT_PACKAGE_PROFILE };