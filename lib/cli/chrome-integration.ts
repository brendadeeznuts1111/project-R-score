import { EnhancedDocsFetcher } from './docs/index-fetcher-enhanced';

export interface ChromeAppConfig {
  appName: string;
  appUrl: string;
  iconPath?: string;
  showNavigation: boolean;
  showColorInTitle: boolean;
}

export class ChromeAppManager {
  private config: ChromeAppConfig;

  constructor(config: Partial<ChromeAppConfig> = {}) {
    this.config = {
      appName: 'Bun Documentation',
      appUrl: 'https://bun.com/docs',
      showNavigation: true,
      showColorInTitle: true,
      ...config,
    };
  }

  async createApp(domain: 'sh' | 'com' = 'com'): Promise<{ success: boolean; message: string }> {
    const url = domain === 'sh' ? 'https://bun.sh/docs' : 'https://bun.com/docs';

    try {
      // For macOS, we can use AppleScript to create a Chrome app
      if (process.platform === 'darwin') {
        const script = `
          tell application "Google Chrome"
            set appUrl to "${url}"
            set appName to "${this.config.appName}"

            -- Check if app already exists
            try
              set existingApps to every application
              repeat with anApp in existingApps
                if title of anApp is appName then
                  return "App already exists"
                end if
              end repeat
            end try

            -- Create new app
            make new application with properties {title:appName, URL:appUrl}
            return "App created successfully"
          end tell
        `;

        const result = await Bun.$`osascript -e ${script}`;
        return { success: true, message: result.stdout.toString() };
      }

      // For Linux/other platforms, create a desktop entry
      if (process.platform === 'linux') {
        const desktopEntry = `
          [Desktop Entry]
          Type=Application
          Name=${this.config.appName}
          Exec=google-chrome-stable --app=${url}
          Icon=${this.config.iconPath || 'bun-docs'}
          Terminal=false
          Categories=Development;
        `;

        const desktopDir = `${process.env.HOME}/.local/share/applications`;
        await Bun.$`mkdir -p ${desktopDir}`;
        const desktopFile = `${desktopDir}/bun-docs.desktop`;
        await Bun.write(desktopFile, desktopEntry);

        return {
          success: true,
          message: `Desktop entry created at ${desktopFile}`,
        };
      }

      return {
        success: false,
        message: `Platform ${process.platform} not supported for Chrome app creation`,
      };
    } catch (error) {
      return {
        success: false,
        message: `Failed to create Chrome app: ${error.message}`,
      };
    }
  }

  async openInChrome(url: string, appMode: boolean = false): Promise<void> {
    try {
      if (appMode) {
        // Open in app mode (without browser UI)
        await Bun.$`open -a "Google Chrome" --args --app=${url}`.quiet();
      } else {
        // Open in regular Chrome
        await Bun.$`open -a "Google Chrome" ${url}`.quiet();
      }
    } catch {
      // Fallback to system open
      await Bun.$`open ${url}`.quiet();
    }
  }

  async openDocs(
    query: string,
    domain: 'sh' | 'com' = 'com',
    appMode: boolean = false
  ): Promise<void> {
    const fetcher = new EnhancedDocsFetcher();
    const results = await fetcher.search(query, domain);

    if (results.length > 0) {
      const url = results[0].domains[domain];
      console.log(`Opening: ${url}`);
      await this.openInChrome(url, appMode);
    } else {
      console.log(`No documentation found for: ${query}`);
      // Open main docs page
      const mainUrl = `https://bun.${domain}/docs`;
      await this.openInChrome(mainUrl, appMode);
    }
  }
}
