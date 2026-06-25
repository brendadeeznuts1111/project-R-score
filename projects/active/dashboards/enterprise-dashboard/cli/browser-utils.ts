#!/usr/bin/env bun
/**
 * Browser Utilities
 * Reusable functions for opening files in browsers with OS-specific flags
 * 
 * Usage:
 *   import { openInChrome } from './browser-utils';
 *   await openInChrome('/path/to/file.html');
 */

import { spawn } from "bun";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import { homedir } from "os";
import { existsSync } from "fs";

/**
 * Load user profile configuration
 */
async function loadUserProfile(user?: string): Promise<{ profileName: string; profileDirectory?: string } | null> {
  const configFile = join(homedir(), ".config", "enterprise-dashboard", "chrome-profiles.json");
  
  if (!existsSync(configFile)) {
    return null;
  }
  
  try {
    const config = JSON.parse(await readFile(configFile, "utf-8"));
    
    // If user specified, use that profile
    if (user && config[user]) {
      return config[user];
    }
    
    // Otherwise use default
    if (config._default && config[config._default]) {
      return config[config._default];
    }
    
    // Fallback to first configured profile
    const firstUser = Object.keys(config).find(k => k !== "_default");
    if (firstUser) {
      return config[firstUser];
    }
  } catch {
    // Config file invalid or doesn't exist
  }
  
  return null;
}

/**
 * Find Chrome profile directory for a specific profile name
 * @param profileName - Name of the Chrome profile (e.g., "DEV-Projects")
 * @returns Profile directory name or null if not found
 */
async function findChromeProfile(profileName: string): Promise<string | null> {
  if (process.platform !== "darwin") return null;
  
  try {
    const localStatePath = join(
      homedir(),
      "Library/Application Support/Google/Chrome/Local State"
    );
    const localState = JSON.parse(await readFile(localStatePath, "utf-8"));
    const profiles = localState?.profile?.info_cache || {};
    
    for (const [dir, info] of Object.entries(profiles as Record<string, any>)) {
      if (info?.name === profileName) {
        return dir;
      }
    }
  } catch {
    // If we can't read Local State, fall back to default
  }
  
  return null;
}

/**
 * Open a file in Google Chrome with OS-specific flags
 * @param filePath - Path to the file to open
 * @param options - Optional configuration
 * @param options.flags - Custom Chrome flags (defaults to flags for local file access)
 * @param options.user - User identifier to look up profile (e.g., "dev", "staging")
 * @param options.profileName - Chrome profile name to use (overrides user lookup)
 */
export async function openInChrome(
  filePath: string,
  options?: { flags?: string[]; user?: string; profileName?: string }
): Promise<void> {
  const platform = process.platform;
  const fileUrl = `file://${filePath}`;

  // Default Chrome flags for local file access
  const defaultFlags = [
    "--disable-web-security",
    "--allow-file-access-from-files",
    "--disable-features=IsolateOrigins,site-per-process",
  ];

  const chromeFlags = options?.flags || defaultFlags;
  
  // Load user profile configuration
  let profileConfig = null;
  if (options?.user) {
    profileConfig = await loadUserProfile(options.user);
  } else if (!options?.profileName) {
    // Try default user if no profile name specified
    profileConfig = await loadUserProfile();
  }
  
  const profileName = options?.profileName || profileConfig?.profileName || "DEV-Projects";
  const profileDir = profileConfig?.profileDirectory || await findChromeProfile(profileName);

  if (platform === "darwin") {
    // macOS - Try to use specific profile, fallback to default
    const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    
    // Try to find the specific profile directory for "DEV-Projects"
    const profileDir = await findChromeProfile(profileName);
    
    if (profileDir) {
      // Use specific profile directory
      const chromeArgs = [
        chromePath,
        fileUrl,
        ...chromeFlags,
        `--profile-directory=${profileDir}`,
      ];
      
      try {
        const proc = spawn(chromeArgs, {
          detached: true,
          stdio: ["ignore", "ignore", "ignore"],
        });
        proc.unref();
        
        // Update last used timestamp
        if (options?.user) {
          try {
            const configFile = join(homedir(), ".config", "enterprise-dashboard", "chrome-profiles.json");
            if (existsSync(configFile)) {
              const config = JSON.parse(await readFile(configFile, "utf-8"));
              if (config[options.user]) {
                config[options.user].lastUsed = new Date().toISOString();
                await writeFile(configFile, JSON.stringify(config, null, 2), "utf-8");
              }
            }
          } catch {
            // Ignore config update errors
          }
        }
        
        return;
      } catch (error) {
        // Fall through to fallback
      }
    }
    
    // Fallback: use macOS 'open' command which uses the default Chrome profile
    // This will open in the user's default profile (DEV-Projects)
    try {
      const openProc = spawn(["open", "-a", "Google Chrome", filePath], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      });
      openProc.unref();
      return;
    } catch (fallbackError) {
      console.error(`Warning: Could not open browser automatically`);
      console.error(`Open manually: ${fileUrl}`);
      return;
    }
  } else if (platform === "win32") {
    // Windows - use start command with Chrome
    try {
      const proc = spawn(["cmd", "/c", "start", "chrome", fileUrl, ...chromeFlags], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      });
      proc.unref();
    } catch (error) {
      console.error(`Warning: Could not open browser automatically`);
      console.error(`Open manually: ${fileUrl}`);
    }
  } else {
    // Linux
    try {
      const proc = spawn(["google-chrome", fileUrl, ...chromeFlags], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      });
      proc.unref();
    } catch (error) {
      console.error(`Warning: Could not open browser automatically`);
      console.error(`Open manually: ${fileUrl}`);
    }
  }
}

/**
 * Open a file in the default browser (no special flags)
 * @param filePath - Path to the file to open
 */
export async function openInDefaultBrowser(filePath: string): Promise<void> {
  const platform = process.platform;
  const fileUrl = `file://${filePath}`;

  try {
    if (platform === "darwin") {
      spawn(["open", filePath], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      });
    } else if (platform === "win32") {
      spawn(["cmd", "/c", "start", filePath], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      });
    } else {
      spawn(["xdg-open", filePath], {
        detached: true,
        stdio: ["ignore", "ignore", "ignore"],
      });
    }
  } catch (error) {
    console.error(`Warning: Could not open browser automatically`);
    console.error(`Open manually: ${fileUrl}`);
  }
}
