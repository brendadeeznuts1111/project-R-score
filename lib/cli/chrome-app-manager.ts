// lib/cli/chrome-app-manager.ts — Chrome app configuration and management

export interface ChromeAppConfig {
  appName: string;
  appUrl: string;
  iconPath?: string;
  showNavigation: boolean;
  showColorInTitle: boolean;
  windowSize?: { width: number; height: number };
  position?: { x: number; y: number };
}

export class ChromeAppManager {
  private config: ChromeAppConfig;

  constructor(config: Partial<ChromeAppConfig> = {}) {
    this.config = {
      appName: 'MYBUNDOCS11',
      appUrl: 'https://bun.com/docs',
      showNavigation: true,
      showColorInTitle: true,
      windowSize: { width: 1200, height: 800 },
      position: { x: 100, y: 100 },
      ...config,
    };
  }

  async createApp(domain: 'sh' | 'com' = 'com'): Promise<{ success: boolean; message: string }> {
    const url = domain === 'sh' ? 'https://bun.sh/docs' : 'https://bun.com/docs';

    try {
      // For macOS, create a dedicated Chrome app with custom name
      if (process.platform === 'darwin') {
        const script = `
          tell application "Google Chrome"
            set appUrl to "${url}"
            set appName to "${this.config.appName}"

            -- Create new window in app mode
            make new window with properties {mode:"app", URL:appUrl}

            -- Set window size and position if specified
            try
              set front window's bounds to {${this.config.position?.x || 100}, ${this.config.position?.y || 100}, ${(this.config.position?.x || 100) + (this.config.windowSize?.width || 1200)}, ${(this.config.position?.y || 100) + (this.config.windowSize?.height || 800)}}
            end try

            return "Chrome app '${appName}' created successfully"
          end tell
        `;

        const result = await Bun.$`osascript -e '${script}'`;
        return { success: true, message: result.stdout.toString().trim() };
      }

      // For Linux, create desktop entry with custom name
      if (process.platform === 'linux') {
        const desktopEntry = `
[Desktop Entry]
Version=1.0
Type=Application
Name=${this.config.appName}
Comment=Bun Documentation - Chrome App
Exec=google-chrome-stable --app=${url} --window-size=${this.config.windowSize?.width || 1200},${this.config.windowSize?.height || 800} --window-position=${this.config.position?.x || 100},${this.config.position?.y || 100}
Icon=${this.config.iconPath || 'text-html'}
Terminal=false
Categories=Development;Documentation;
StartupNotify=true
StartupWMClass=${this.config.appName}
        `;

        const desktopDir = `${process.env.HOME}/.local/share/applications`;
        await Bun.$`mkdir -p ${desktopDir}`;
        const desktopFile = `${desktopDir}/${this.config.appName.toLowerCase()}.desktop`;
        await Bun.write(desktopFile, desktopEntry);

        // Update desktop database
        await Bun.$`update-desktop-database ~/.local/share/applications/`.quiet();

        return {
          success: true,
          message: `Desktop entry created: ${desktopFile}\nLaunch with: gtk-launch ${this.config.appName.toLowerCase()}`,
        };
      }

      // For Windows, create a shortcut
      if (process.platform === 'win32') {
        const vbsScript = `
Set oShell = CreateObject("WScript.Shell")
strDesktop = oShell.SpecialFolders("Desktop")
Set oShortcut = oShell.CreateShortcut(strDesktop & "\\${this.config.appName}.lnk")
oShortcut.TargetPath = "chrome.exe"
oShortcut.Arguments = "--app=${url} --window-size=${this.config.windowSize?.width || 1200},${this.config.windowSize?.height || 800}"
oShortcut.WorkingDirectory = "%USERPROFILE%"
oShortcut.IconLocation = "chrome.exe, 0"
oShortcut.Description = "${this.config.appName} - Bun Documentation"
oShortcut.Save
        `;

        const tempFile = `${process.env.TEMP || '/tmp'}/create-shortcut.vbs`;
        await Bun.write(tempFile, vbsScript);
        await Bun.$`cscript //nologo ${tempFile}`;
        await Bun.$`rm ${tempFile}`;

        return {
          success: true,
          message: `Shortcut created on Desktop: ${this.config.appName}.lnk`,
        };
      }

      return {
        success: false,
        message: `Platform ${process.platform} not supported`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create Chrome app: ${error.message}`,
      };
    }
  }

  async launchMYBUNDOCS11(domain: 'sh' | 'com' = 'com'): Promise<void> {
    const url = domain === 'sh' ? 'https://bun.sh/docs' : 'https://bun.com/docs';

    try {
      if (process.platform === 'darwin') {
        // Launch MYBUNDOCS11 with custom window settings
        await Bun.$`open -a "Google Chrome" --args --app=${url} --window-size=${this.config.windowSize?.width || 1200},${this.config.windowSize?.height || 800} --window-position=${this.config.position?.x || 100},${this.config.position?.y || 100}`.quiet();
      } else if (process.platform === 'linux') {
        await Bun.$`google-chrome-stable --app=${url} --window-size=${this.config.windowSize?.width || 1200},${this.config.windowSize?.height || 800}`.quiet();
      } else {
        await Bun.$`open -a "Google Chrome" --args --app=${url}`.quiet();
      }

      console.log(`🚀 MYBUNDOCS11 launched: ${url}`);
    } catch (error) {
      console.error(`Failed to launch MYBUNDOCS11: ${error.message}`);
      // Fallback to system browser
      await Bun.$`open ${url}`.quiet();
    }
  }

  async openDocsInMYBUNDOCS11(query: string, domain: 'sh' | 'com' = 'com'): Promise<void> {
    const { EnhancedDocsFetcher } = await import('./docs/index-fetcher-enhanced');
    const fetcher = new EnhancedDocsFetcher();
    const results = await fetcher.search(query, domain);

    if (results.length > 0) {
      const url = results[0].domains[domain];
      console.log(`📖 Opening ${results[0].topic} in MYBUNDOCS11`);

      // Update app URL temporarily and launch
      const originalUrl = this.config.appUrl;
      this.config.appUrl = url;

      if (process.platform === 'darwin') {
        await Bun.$`open -a "Google Chrome" --args --app=${url} --window-size=${this.config.windowSize?.width || 1200},${this.config.windowSize?.height || 800} --window-position=${this.config.position?.x || 100},${this.config.position?.y || 100}`.quiet();
      } else {
        await Bun.$`open -a "Google Chrome" --args --app=${url}`.quiet();
      }

      this.config.appUrl = originalUrl;
    } else {
      console.log(`❌ No documentation found for: ${query}`);
      console.log(`🌐 Opening main docs in MYBUNDOCS11`);
      await this.launchMYBUNDOCS11(domain);
    }
  }

  getAppInfo() {
    return {
      name: this.config.appName,
      url: this.config.appUrl,
      windowSize: this.config.windowSize,
      position: this.config.position,
      platform: process.platform,
      features: {
        appMode: true,
        customSize: true,
        customPosition: true,
        navigation: this.config.showNavigation,
        colorTitle: this.config.showColorInTitle,
      },
    };
  }
}
