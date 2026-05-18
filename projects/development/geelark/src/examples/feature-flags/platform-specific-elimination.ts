/**
 * PLATFORM-SPECIFIC CODE ELIMINATION PATTERNS
 * Demonstrates how to eliminate platform-specific code from wrong builds
 */

import { feature } from "bun:bundle";

// =============================================================================
// 📱 MOBILE PLATFORM ELIMINATION
// =============================================================================

export class MobilePlatformFeatures {
  // This entire class is eliminated from non-mobile builds
  static initializeMobileFeatures() {
    if (feature("PLATFORM_ANDROID") || feature("PLATFORM_IOS")) {
      console.info("📱 Initializing mobile platform features");

      return {
        // Touch and gesture features
        gestures: {
          swipe: () => console.info("👆 Swipe gesture detected"),
          pinch: () => console.info("🤏 Pinch gesture detected"),
          tap: () => console.info("👆 Tap gesture detected"),
        },

        // Mobile-specific APIs
        camera: {
          takePhoto: () => console.info("📸 Taking photo"),
          scanQR: () => console.info("📷 Scanning QR code"),
        },

        // Push notifications
        notifications: {
          requestPermission: () =>
            console.info("🔔 Requesting notification permission"),
          sendPush: (message: string) => console.info(`📱 Push: ${message}`),
        },

        // Device hardware
        device: {
          getAccelerometer: () => console.info("📊 Reading accelerometer"),
          getGPS: () => console.info("🗺️ Getting GPS location"),
          vibrate: () => console.info("📳 Vibrating device"),
        },

        // Mobile UI components
        ui: {
          showBottomSheet: () => console.info("📋 Showing bottom sheet"),
          showModal: () => console.info("🪟 Showing modal"),
          hideKeyboard: () => console.info("⌨️ Hiding keyboard"),
        },
      };
    }

    // This code is eliminated from web/desktop builds
    return null;
  }

  // Mobile-specific optimizations
  static optimizeForMobile() {
    if (feature("PLATFORM_ANDROID") || feature("PLATFORM_IOS")) {
      console.info("⚡ Applying mobile optimizations");

      return {
        // Reduce memory usage for mobile
        memoryOptimization: true,

        // Optimize touch interactions
        touchOptimization: true,

        // Battery saving mode
        batteryOptimization: feature("FEAT_BATCH_PROCESSING"), // Reuse existing flag

        // Offline support
        offlineSupport: true,

        // Compress images for mobile
        imageCompression: true,
      };
    }

    return null;
  }
}

// =============================================================================
// 🌐 WEB PLATFORM ELIMINATION
// =============================================================================

export class WebPlatformFeatures {
  // This entire class is eliminated from non-web builds
  static initializeWebFeatures() {
    if (feature("PLATFORM_WEB")) {
      console.info("🌐 Initializing web platform features");

      return {
        // Browser APIs
        browser: {
          localStorage: {
            set: (key: string, value: string) =>
              console.info(`💾 Storing ${key}`),
            get: (key: string) => console.info(`📖 Getting ${key}`),
          },
          sessionStorage: {
            set: (key: string, value: string) =>
              console.info(`🗄️ Session ${key}`),
            get: (key: string) => console.info(`📋 Session ${key}`),
          },
          cookies: {
            set: (name: string, value: string) =>
              console.info(`🍪 Setting ${name}`),
            get: (name: string) => console.info(`🍪 Getting ${name}`),
          },
        },

        // Web-specific features
        features: {
          serviceWorker: () => console.info("👷 Registering service worker"),
          webSockets: () => console.info("🔌 Connecting WebSocket"),
          webRTC: () => console.info("📹 Starting WebRTC"),
          webGL: () => console.info("🎨 Initializing WebGL"),
        },

        // SEO and meta tags
        seo: {
          updateTitle: (title: string) => console.info(`📝 Title: ${title}`),
          updateMeta: (name: string, content: string) =>
            console.info(`🏷️ Meta ${name}: ${content}`),
          addCanonical: (url: string) => console.info(`🔗 Canonical: ${url}`),
        },

        // Web performance
        performance: {
          enableLazyLoading: () => console.info("⏳ Enabling lazy loading"),
          enableCodeSplitting: () => console.info("✂️ Enabling code splitting"),
          enableCaching: () => console.info("💾 Enabling caching"),
        },
      };
    }

    // This code is eliminated from mobile/desktop builds
    return null;
  }

  // Web-specific optimizations
  static optimizeForWeb() {
    if (feature("PLATFORM_WEB")) {
      console.info("🚀 Applying web optimizations");

      return {
        // SEO optimizations
        seoOptimization: true,

        // Search engine indexing
        searchIndexing: true,

        // Social media sharing
        socialSharing: true,

        // Progressive Web App
        pwaFeatures: feature("PLATFORM_WEB"), // Reuse existing flag

        // Browser compatibility
        crossBrowserSupport: true,
      };
    }

    return null;
  }
}

// =============================================================================
// 🖥️ DESKTOP PLATFORM ELIMINATION
// =============================================================================

export class DesktopPlatformFeatures {
  // This entire class is eliminated from non-desktop builds
  static initializeDesktopFeatures() {
    if (feature("PLATFORM_DESKTOP")) {
      console.info("🖥️ Initializing desktop platform features");

      return {
        // Native system integration
        system: {
          createWindow: () => console.info("🪟 Creating native window"),
          createMenu: () => console.info("📋 Creating native menu"),
          createTray: () => console.info("🔔 Creating system tray"),
          showNotification: (title: string, body: string) =>
            console.info(`🔔 Desktop notification: ${title} - ${body}`),
        },

        // File system access
        filesystem: {
          readFile: (path: string) => console.info(`📖 Reading ${path}`),
          writeFile: (path: string, content: string) =>
            console.info(`✍️ Writing ${path}`),
          watchFile: (path: string) => console.info(`👀 Watching ${path}`),
          createDirectory: (path: string) => console.info(`📁 Creating ${path}`),
        },

        // Native dialogs
        dialogs: {
          showOpenDialog: () => console.info("📂 Open file dialog"),
          showSaveDialog: () => console.info("💾 Save file dialog"),
          showMessageBox: (message: string) =>
            console.info(`💬 Message: ${message}`),
        },

        // System integration
        integration: {
          registerProtocol: (protocol: string) =>
            console.info(`🔗 Registering protocol: ${protocol}`),
          setDefaultApp: () => console.info("🎯 Setting as default app"),
          createShortcut: () => console.info("⚡ Creating desktop shortcut"),
        },
      };
    }

    // This code is eliminated from mobile/web builds
    return null;
  }

  // Desktop-specific optimizations
  static optimizeForDesktop() {
    if (feature("PLATFORM_DESKTOP")) {
      console.info("⚡ Applying desktop optimizations");

      return {
        // Native performance
        nativePerformance: true,

        // Multi-threading support
        multiThreading: true,

        // Hardware acceleration
        hardwareAcceleration: true,

        // System integration
        systemIntegration: true,

        // Advanced file operations
        advancedFileOps: true,
      };
    }

    return null;
  }
}

// =============================================================================
// 🎯 CROSS-PLATFORM ADAPTER PATTERN
// =============================================================================

export class PlatformAdapter {
  private static platform: "mobile" | "web" | "desktop" | "unknown";

  // Detect platform at compile time
  static detectPlatform(): "mobile" | "web" | "desktop" | "unknown" {
    if (feature("PLATFORM_ANDROID") || feature("PLATFORM_IOS")) {
      return "mobile";
    }
    if (feature("PLATFORM_WEB")) {
      return "web";
    }
    if (feature("PLATFORM_DESKTOP")) {
      return "desktop";
    }
    return "unknown";
  }

  // Initialize appropriate platform features
  static initialize() {
    this.platform = this.detectPlatform();
    console.info(`🎯 Platform detected: ${this.platform}`);

    switch (this.platform) {
      case "mobile":
        return MobilePlatformFeatures.initializeMobileFeatures();

      case "web":
        return WebPlatformFeatures.initializeWebFeatures();

      case "desktop":
        return DesktopPlatformFeatures.initializeDesktopFeatures();

      default:
        console.info("❓ Unknown platform - using fallback");
        return this.createFallbackFeatures();
    }
  }

  // Create fallback for unknown platforms
  static createFallbackFeatures() {
    return {
      basic: {
        log: (message: string) => console.info(`📝 ${message}`),
        error: (error: string) => console.error(`❌ ${error}`),
      },
    };
  }

  // Get platform-specific storage
  static getStorage() {
    switch (this.platform) {
      case "mobile":
        return {
          set: (key: string, value: string) =>
            console.info(`📱 Mobile storage: ${key}`),
          get: (key: string) => console.info(`📱 Mobile get: ${key}`),
        };

      case "web":
        return {
          set: (key: string, value: string) =>
            console.info(`🌐 Web storage: ${key}`),
          get: (key: string) => console.info(`🌐 Web get: ${key}`),
        };

      case "desktop":
        return {
          set: (key: string, value: string) =>
            console.info(`🖥️ Desktop storage: ${key}`),
          get: (key: string) => console.info(`🖥️ Desktop get: ${key}`),
        };

      default:
        return {
          set: (key: string, value: string) =>
            console.info(`❓ Fallback storage: ${key}`),
          get: (key: string) => console.info(`❓ Fallback get: ${key}`),
        };
    }
  }

  // Get platform-specific notifications
  static getNotifications() {
    switch (this.platform) {
      case "mobile":
        return {
          send: (title: string, body: string) =>
            console.info(`📱 Mobile push: ${title} - ${body}`),
        };

      case "web":
        return {
          send: (title: string, body: string) =>
            console.info(`🌐 Web notification: ${title} - ${body}`),
        };

      case "desktop":
        return {
          send: (title: string, body: string) =>
            console.info(`🖥️ Desktop notification: ${title} - ${body}`),
        };

      default:
        return {
          send: (title: string, body: string) =>
            console.info(`❓ Fallback notification: ${title} - ${body}`),
        };
    }
  }
}

// =============================================================================
// 🏗️ PLATFORM-SPECIFIC BUNDLES
// =============================================================================

export class PlatformBundleOptimizer {
  // Show what gets eliminated in each platform build
  static analyzeBundleImpact() {
    console.info("\n📦 PLATFORM BUNDLE ANALYSIS");
    console.info("=".repeat(40));

    // Mobile build analysis
    console.info("\n📱 MOBILE BUILD:");
    console.info("✅ INCLUDED:");
    console.info("  • Touch and gesture handling");
    console.info("  • Camera and device APIs");
    console.info("  • Push notifications");
    console.info("  • GPS and accelerometer");
    console.info("  • Mobile UI components");
    console.info("❌ ELIMINATED:");
    console.info("  • Web browser APIs");
    console.info("  • Desktop file system");
    console.info("  • Native windows/menus");
    console.info("  • Service worker code");
    console.info("  • WebRTC/WebGL");

    // Web build analysis
    console.info("\n🌐 WEB BUILD:");
    console.info("✅ INCLUDED:");
    console.info("  • Browser storage APIs");
    console.info("  • Service worker");
    console.info("  • WebSockets and WebRTC");
    console.info("  • SEO and meta tags");
    console.info("  • PWA features");
    console.info("❌ ELIMINATED:");
    console.info("  • Mobile device APIs");
    console.info("  • Native file system");
    console.info("  • Desktop system integration");
    console.info("  • Touch gesture handling");
    console.info("  • Push notifications");

    // Desktop build analysis
    console.info("\n🖥️ DESKTOP BUILD:");
    console.info("✅ INCLUDED:");
    console.info("  • Native file system");
    console.info("  • System dialogs");
    console.info("  • Native windows/menus");
    console.info("  • System tray integration");
    console.info("  • Protocol registration");
    console.info("❌ ELIMINATED:");
    console.info("  • Mobile device APIs");
    console.info("  • Browser-specific APIs");
    console.info("  • Touch gesture handling");
    console.info("  • Service worker code");
    console.info("  • WebRTC/WebGL");
  }

  // Calculate estimated bundle size savings
  static calculateSavings() {
    console.info("\n💰 ESTIMATED BUNDLE SAVINGS:");
    console.info("=".repeat(30));

    const savings = {
      mobile: {
        eliminatedFeatures: 15,
        estimatedSavings: "120KB",
        percentageReduction: "35%",
      },
      web: {
        eliminatedFeatures: 12,
        estimatedSavings: "95KB",
        percentageReduction: "28%",
      },
      desktop: {
        eliminatedFeatures: 10,
        estimatedSavings: "80KB",
        percentageReduction: "24%",
      },
    };

    Object.entries(savings).forEach(([platform, data]) => {
      console.info(`${platform.toUpperCase()}:`);
      console.info(`  • Features eliminated: ${data.eliminatedFeatures}`);
      console.info(`  • Size savings: ${data.estimatedSavings}`);
      console.info(`  • Reduction: ${data.percentageReduction}`);
    });
  }
}

// =============================================================================
// 🎯 PLATFORM DETECTION UTILITIES
// =============================================================================

export class PlatformDetection {
  // Compile-time platform detection
  static isMobile(): boolean {
    return feature("PLATFORM_ANDROID") || feature("PLATFORM_IOS");
  }

  static isWeb(): boolean {
    return feature("PLATFORM_WEB");
  }

  static isDesktop(): boolean {
    return feature("PLATFORM_DESKTOP");
  }

  // Feature availability checks
  static hasTouchSupport(): boolean {
    return this.isMobile();
  }

  static hasFileSystemAccess(): boolean {
    return this.isDesktop();
  }

  static hasBrowserAPIs(): boolean {
    return this.isWeb();
  }

  static hasNativeNotifications(): boolean {
    return this.isMobile() || this.isDesktop();
  }

  // Platform-specific capabilities
  static getCapabilities() {
    if (this.isMobile()) {
      return {
        touch: true,
        camera: true,
        gps: true,
        accelerometer: true,
        pushNotifications: true,
        fileSystem: false,
        browserAPIs: false,
        nativeWindows: false,
      };
    }

    if (this.isWeb()) {
      return {
        touch: false,
        camera: false,
        gps: false,
        accelerometer: false,
        pushNotifications: false,
        fileSystem: false,
        browserAPIs: true,
        nativeWindows: false,
      };
    }

    if (this.isDesktop()) {
      return {
        touch: false,
        camera: false,
        gps: false,
        accelerometer: false,
        pushNotifications: true,
        fileSystem: true,
        browserAPIs: false,
        nativeWindows: true,
      };
    }

    return {};
  }
}

// Initialize platform adapter when imported
const platformFeatures = PlatformAdapter.initialize();
console.info("🚀 Platform features initialized:", platformFeatures);
