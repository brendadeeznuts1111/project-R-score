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
      console.log("📱 Initializing mobile platform features");

      return {
        // Touch and gesture features
        gestures: {
          swipe: () => console.log("👆 Swipe gesture detected"),
          pinch: () => console.log("🤏 Pinch gesture detected"),
          tap: () => console.log("👆 Tap gesture detected"),
        },

        // Mobile-specific APIs
        camera: {
          takePhoto: () => console.log("📸 Taking photo"),
          scanQR: () => console.log("📷 Scanning QR code"),
        },

        // Push notifications
        notifications: {
          requestPermission: () =>
            console.log("🔔 Requesting notification permission"),
          sendPush: (message: string) => console.log(`📱 Push: ${message}`),
        },

        // Device hardware
        device: {
          getAccelerometer: () => console.log("📊 Reading accelerometer"),
          getGPS: () => console.log("🗺️ Getting GPS location"),
          vibrate: () => console.log("📳 Vibrating device"),
        },

        // Mobile UI components
        ui: {
          showBottomSheet: () => console.log("📋 Showing bottom sheet"),
          showModal: () => console.log("🪟 Showing modal"),
          hideKeyboard: () => console.log("⌨️ Hiding keyboard"),
        },
      };
    }

    // This code is eliminated from web/desktop builds
    return null;
  }

  // Mobile-specific optimizations
  static optimizeForMobile() {
    if (feature("PLATFORM_ANDROID") || feature("PLATFORM_IOS")) {
      console.log("⚡ Applying mobile optimizations");

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
      console.log("🌐 Initializing web platform features");

      return {
        // Browser APIs
        browser: {
          localStorage: {
            set: (key: string, value: string) =>
              console.log(`💾 Storing ${key}`),
            get: (key: string) => console.log(`📖 Getting ${key}`),
          },
          sessionStorage: {
            set: (key: string, value: string) =>
              console.log(`🗄️ Session ${key}`),
            get: (key: string) => console.log(`📋 Session ${key}`),
          },
          cookies: {
            set: (name: string, value: string) =>
              console.log(`🍪 Setting ${name}`),
            get: (name: string) => console.log(`🍪 Getting ${name}`),
          },
        },

        // Web-specific features
        features: {
          serviceWorker: () => console.log("👷 Registering service worker"),
          webSockets: () => console.log("🔌 Connecting WebSocket"),
          webRTC: () => console.log("📹 Starting WebRTC"),
          webGL: () => console.log("🎨 Initializing WebGL"),
        },

        // SEO and meta tags
        seo: {
          updateTitle: (title: string) => console.log(`📝 Title: ${title}`),
          updateMeta: (name: string, content: string) =>
            console.log(`🏷️ Meta ${name}: ${content}`),
          addCanonical: (url: string) => console.log(`🔗 Canonical: ${url}`),
        },

        // Web performance
        performance: {
          enableLazyLoading: () => console.log("⏳ Enabling lazy loading"),
          enableCodeSplitting: () => console.log("✂️ Enabling code splitting"),
          enableCaching: () => console.log("💾 Enabling caching"),
        },
      };
    }

    // This code is eliminated from mobile/desktop builds
    return null;
  }

  // Web-specific optimizations
  static optimizeForWeb() {
    if (feature("PLATFORM_WEB")) {
      console.log("🚀 Applying web optimizations");

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
      console.log("🖥️ Initializing desktop platform features");

      return {
        // Native system integration
        system: {
          createWindow: () => console.log("🪟 Creating native window"),
          createMenu: () => console.log("📋 Creating native menu"),
          createTray: () => console.log("🔔 Creating system tray"),
          showNotification: (title: string, body: string) =>
            console.log(`🔔 Desktop notification: ${title} - ${body}`),
        },

        // File system access
        filesystem: {
          readFile: (path: string) => console.log(`📖 Reading ${path}`),
          writeFile: (path: string, content: string) =>
            console.log(`✍️ Writing ${path}`),
          watchFile: (path: string) => console.log(`👀 Watching ${path}`),
          createDirectory: (path: string) => console.log(`📁 Creating ${path}`),
        },

        // Native dialogs
        dialogs: {
          showOpenDialog: () => console.log("📂 Open file dialog"),
          showSaveDialog: () => console.log("💾 Save file dialog"),
          showMessageBox: (message: string) =>
            console.log(`💬 Message: ${message}`),
        },

        // System integration
        integration: {
          registerProtocol: (protocol: string) =>
            console.log(`🔗 Registering protocol: ${protocol}`),
          setDefaultApp: () => console.log("🎯 Setting as default app"),
          createShortcut: () => console.log("⚡ Creating desktop shortcut"),
        },
      };
    }

    // This code is eliminated from mobile/web builds
    return null;
  }

  // Desktop-specific optimizations
  static optimizeForDesktop() {
    if (feature("PLATFORM_DESKTOP")) {
      console.log("⚡ Applying desktop optimizations");

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
    console.log(`🎯 Platform detected: ${this.platform}`);

    switch (this.platform) {
      case "mobile":
        return MobilePlatformFeatures.initializeMobileFeatures();

      case "web":
        return WebPlatformFeatures.initializeWebFeatures();

      case "desktop":
        return DesktopPlatformFeatures.initializeDesktopFeatures();

      default:
        console.log("❓ Unknown platform - using fallback");
        return this.createFallbackFeatures();
    }
  }

  // Create fallback for unknown platforms
  static createFallbackFeatures() {
    return {
      basic: {
        log: (message: string) => console.log(`📝 ${message}`),
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
            console.log(`📱 Mobile storage: ${key}`),
          get: (key: string) => console.log(`📱 Mobile get: ${key}`),
        };

      case "web":
        return {
          set: (key: string, value: string) =>
            console.log(`🌐 Web storage: ${key}`),
          get: (key: string) => console.log(`🌐 Web get: ${key}`),
        };

      case "desktop":
        return {
          set: (key: string, value: string) =>
            console.log(`🖥️ Desktop storage: ${key}`),
          get: (key: string) => console.log(`🖥️ Desktop get: ${key}`),
        };

      default:
        return {
          set: (key: string, value: string) =>
            console.log(`❓ Fallback storage: ${key}`),
          get: (key: string) => console.log(`❓ Fallback get: ${key}`),
        };
    }
  }

  // Get platform-specific notifications
  static getNotifications() {
    switch (this.platform) {
      case "mobile":
        return {
          send: (title: string, body: string) =>
            console.log(`📱 Mobile push: ${title} - ${body}`),
        };

      case "web":
        return {
          send: (title: string, body: string) =>
            console.log(`🌐 Web notification: ${title} - ${body}`),
        };

      case "desktop":
        return {
          send: (title: string, body: string) =>
            console.log(`🖥️ Desktop notification: ${title} - ${body}`),
        };

      default:
        return {
          send: (title: string, body: string) =>
            console.log(`❓ Fallback notification: ${title} - ${body}`),
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
    console.log("\n📦 PLATFORM BUNDLE ANALYSIS");
    console.log("=".repeat(40));

    // Mobile build analysis
    console.log("\n📱 MOBILE BUILD:");
    console.log("✅ INCLUDED:");
    console.log("  • Touch and gesture handling");
    console.log("  • Camera and device APIs");
    console.log("  • Push notifications");
    console.log("  • GPS and accelerometer");
    console.log("  • Mobile UI components");
    console.log("❌ ELIMINATED:");
    console.log("  • Web browser APIs");
    console.log("  • Desktop file system");
    console.log("  • Native windows/menus");
    console.log("  • Service worker code");
    console.log("  • WebRTC/WebGL");

    // Web build analysis
    console.log("\n🌐 WEB BUILD:");
    console.log("✅ INCLUDED:");
    console.log("  • Browser storage APIs");
    console.log("  • Service worker");
    console.log("  • WebSockets and WebRTC");
    console.log("  • SEO and meta tags");
    console.log("  • PWA features");
    console.log("❌ ELIMINATED:");
    console.log("  • Mobile device APIs");
    console.log("  • Native file system");
    console.log("  • Desktop system integration");
    console.log("  • Touch gesture handling");
    console.log("  • Push notifications");

    // Desktop build analysis
    console.log("\n🖥️ DESKTOP BUILD:");
    console.log("✅ INCLUDED:");
    console.log("  • Native file system");
    console.log("  • System dialogs");
    console.log("  • Native windows/menus");
    console.log("  • System tray integration");
    console.log("  • Protocol registration");
    console.log("❌ ELIMINATED:");
    console.log("  • Mobile device APIs");
    console.log("  • Browser-specific APIs");
    console.log("  • Touch gesture handling");
    console.log("  • Service worker code");
    console.log("  • WebRTC/WebGL");
  }

  // Calculate estimated bundle size savings
  static calculateSavings() {
    console.log("\n💰 ESTIMATED BUNDLE SAVINGS:");
    console.log("=".repeat(30));

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
      console.log(`${platform.toUpperCase()}:`);
      console.log(`  • Features eliminated: ${data.eliminatedFeatures}`);
      console.log(`  • Size savings: ${data.estimatedSavings}`);
      console.log(`  • Reduction: ${data.percentageReduction}`);
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
console.log("🚀 Platform features initialized:", platformFeatures);
