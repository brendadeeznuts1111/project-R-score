/**
 * Device Detection Module
 * Advanced user agent parsing and device characteristic detection
 */

import type {
  ParsedUserAgent,
  DeviceFingerprint,
  DeviceFingerprintCreate,
  FingerprintComponents,
  DeviceType,
  BrowserType,
  OSType,
  BotType,
  BROWSER_FINGERPRINTS,
  BOT_PATTERNS,
  SUSPICIOUS_PATTERNS,
} from '../../../core/types/device';

export class DeviceDetector {
  private browserPatterns: Map<string, RegExp> = new Map();
  private osPatterns: Map<string, RegExp> = new Map();
  private devicePatterns: Map<string, RegExp> = new Map();
  private botPatterns: RegExp;
  private suspiciousPatterns: RegExp;

  constructor() {
    this.initializePatterns();
    this.botPatterns = new RegExp(BOT_PATTERNS.join('|'), 'i');
    this.suspiciousPatterns = new RegExp(SUSPICIOUS_PATTERNS.join('|'), 'i');
  }

  /**
   * Parse user agent string
   */
  parseUserAgent(userAgent: string): ParsedUserAgent {
    const ua = userAgent.toLowerCase();

    // Detect browser
    const browser = this.detectBrowser(userAgent);

    // Detect OS
    const os = this.detectOS(userAgent);

    // Detect device
    const device = this.detectDevice(userAgent);

    // Detect engine
    const engine = this.detectEngine(userAgent, browser);

    // Check if bot
    const isBot = this.isBot(userAgent);
    const botType = isBot ? this.detectBotType(userAgent) : undefined;

    // Additional capabilities
    const capabilities = this.detectCapabilities(userAgent);

    return {
      browser,
      os,
      device,
      engine,
      isBot,
      botType,
      isMobile: device.type === 'mobile',
      isTablet: device.type === 'tablet',
      isDesktop: device.type === 'desktop',
      supportsWebRTC: capabilities.webRTC,
      supportsWebGL: capabilities.webGL,
      supportsTouch: capabilities.touch,
      cookieEnabled: capabilities.cookies,
      language: navigator?.language || 'en-US',
      timezone: Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || 'UTC',
      screenResolution: this.getScreenResolution(),
    };
  }

  /**
   * Generate device fingerprint
   */
  generateFingerprint(
    customerId: string,
    userAgent: string,
    additionalData?: Partial<FingerprintComponents>
  ): DeviceFingerprintCreate {
    const parsedUA = this.parseUserAgent(userAgent);

    const components: FingerprintComponents = {
      userAgent,
      language: navigator?.language || 'en-US',
      timezone: Intl?.DateTimeFormat()?.resolvedOptions()?.timeZone || 'UTC',
      screenResolution: this.getScreenResolutionString(),
      colorDepth: screen?.colorDepth || 24,
      pixelRatio: window?.devicePixelRatio || 1,
      platform: navigator?.platform || 'unknown',
      hardwareConcurrency: navigator?.hardwareConcurrency || 1,
      deviceMemory: (navigator as any)?.deviceMemory,
      webdriver: navigator?.webdriver || false,
      plugins: this.getPluginsList(),
      fonts: this.getFontsList(),
      canvas: this.getCanvasFingerprint(),
      webgl: this.getWebGLFingerprint(),
      audio: this.getAudioFingerprint(),
      timezoneOffset: new Date().getTimezoneOffset(),
      sessionStorage: this.hasSessionStorage(),
      localStorage: this.hasLocalStorage(),
      indexedDB: this.hasIndexedDB(),
      cookiesEnabled: navigator?.cookieEnabled || false,
      doNotTrack: navigator?.doNotTrack || 'unspecified',
      adBlock: this.detectAdBlock(),
      touchSupport: this.getTouchSupport(),
      ...additionalData,
    };

    // Generate fingerprint hash
    const fingerprint = this.generateFingerprintHash(components);

    // Calculate confidence and risk score
    const confidence = this.calculateFingerprintConfidence(components);
    const riskScore = this.calculateFingerprintRisk(components, parsedUA);

    return {
      customerId,
      fingerprint,
      components,
      confidence,
      firstSeen: new Date(),
      lastSeen: new Date(),
      seenCount: 1,
      riskScore,
      isTrusted: confidence > 80 && riskScore < 30,
      blocklisted: riskScore > 80,
    };
  }

  /**
   * Update device fingerprint
   */
  updateFingerprint(fingerprint: DeviceFingerprint, userAgent: string): DeviceFingerprint {
    const now = new Date();
    const timeSinceLastSeen = now.getTime() - fingerprint.lastSeen.getTime();

    return {
      ...fingerprint,
      lastSeen: now,
      seenCount: fingerprint.seenCount + 1,
      riskScore: this.recalculateRiskScore(fingerprint, timeSinceLastSeen),
    };
  }

  /**
   * Compare fingerprints for similarity
   */
  compareFingerprints(
    fp1: DeviceFingerprint,
    fp2: DeviceFingerprint
  ): {
    similarity: number; // 0-100
    differences: string[];
    confidence: number;
  } {
    const differences: string[] = [];
    let similarityScore = 0;
    const maxScore = 15; // Number of comparison points

    // Compare user agent
    if (fp1.components.userAgent === fp2.components.userAgent) {
      similarityScore += 2;
    } else {
      differences.push('user_agent');
    }

    // Compare screen resolution
    if (fp1.components.screenResolution === fp2.components.screenResolution) {
      similarityScore += 1.5;
    } else {
      differences.push('screen_resolution');
    }

    // Compare timezone
    if (fp1.components.timezone === fp2.components.timezone) {
      similarityScore += 1;
    } else {
      differences.push('timezone');
    }

    // Compare language
    if (fp1.components.language === fp2.components.language) {
      similarityScore += 1;
    } else {
      differences.push('language');
    }

    // Compare platform
    if (fp1.components.platform === fp2.components.platform) {
      similarityScore += 1.5;
    } else {
      differences.push('platform');
    }

    // Compare hardware concurrency
    if (fp1.components.hardwareConcurrency === fp2.components.hardwareConcurrency) {
      similarityScore += 1;
    } else {
      differences.push('hardware_concurrency');
    }

    // Compare webdriver
    if (fp1.components.webdriver === fp2.components.webdriver) {
      similarityScore += 1;
    } else {
      differences.push('webdriver');
    }

    // Compare color depth
    if (fp1.components.colorDepth === fp2.components.colorDepth) {
      similarityScore += 0.5;
    }

    // Compare pixel ratio
    if (Math.abs(fp1.components.pixelRatio - fp2.components.pixelRatio) < 0.1) {
      similarityScore += 0.5;
    }

    // Compare timezone offset
    if (fp1.components.timezoneOffset === fp2.components.timezoneOffset) {
      similarityScore += 0.5;
    }

    // Compare touch support
    if (fp1.components.touchSupport.maxTouchPoints === fp2.components.touchSupport.maxTouchPoints) {
      similarityScore += 0.5;
    }

    // Calculate similarity percentage
    const similarity = (similarityScore / maxScore) * 100;

    // Calculate confidence based on number of matching points
    const confidence = Math.min((similarityScore / maxScore) * 100, 95);

    return {
      similarity,
      differences,
      confidence,
    };
  }

  /**
   * Detect if user agent is a bot
   */
  isBot(userAgent: string): boolean {
    const ua = userAgent.toLowerCase();
    return this.botPatterns.test(ua) || this.detectBotPatterns(ua);
  }

  /**
   * Detect if user agent has suspicious patterns
   */
  isSuspicious(userAgent: string): boolean {
    const ua = userAgent.toLowerCase();
    return this.suspiciousPatterns.test(ua) || this.detectSuspiciousPatterns(ua);
  }

  /**
   * Get device analytics
   */
  getDeviceAnalytics(fingerprints: DeviceFingerprint[]): {
    totalDevices: number;
    uniqueCustomers: number;
    avgRiskScore: number;
    trustedDevices: number;
    suspiciousDevices: number;
    botDevices: number;
    topPlatforms: Array<{ platform: string; count: number }>;
    riskDistribution: Record<string, number>;
  } {
    const customers = new Set<string>();
    let totalRiskScore = 0;
    let trustedCount = 0;
    let suspiciousCount = 0;
    let botCount = 0;
    const platforms = new Map<string, number>();
    const riskLevels: Record<string, number> = { low: 0, medium: 0, high: 0, extreme: 0 };

    fingerprints.forEach(fp => {
      customers.add(fp.customerId);
      totalRiskScore += fp.riskScore;

      if (fp.isTrusted) trustedCount++;
      if (fp.blocklisted) suspiciousCount++;
      if (this.isBot(fp.components.userAgent)) botCount++;

      // Count platforms
      const platform = fp.components.platform;
      platforms.set(platform, (platforms.get(platform) || 0) + 1);

      // Risk distribution
      if (fp.riskScore < 25) riskLevels.low++;
      else if (fp.riskScore < 50) riskLevels.medium++;
      else if (fp.riskScore < 75) riskLevels.high++;
      else riskLevels.extreme++;
    });

    const topPlatforms = Array.from(platforms.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([platform, count]) => ({ platform, count }));

    return {
      totalDevices: fingerprints.length,
      uniqueCustomers: customers.size,
      avgRiskScore: fingerprints.length > 0 ? totalRiskScore / fingerprints.length : 0,
      trustedDevices: trustedCount,
      suspiciousDevices: suspiciousCount,
      botDevices: botCount,
      topPlatforms,
      riskDistribution: riskLevels,
    };
  }

  // Private methods

  private initializePatterns(): void {
    // Browser patterns
    this.browserPatterns.set('chrome', /chrome\/([\d.]+)/i);
    this.browserPatterns.set('firefox', /firefox\/([\d.]+)/i);
    this.browserPatterns.set('safari', /version\/([\d.]+).*safari/i);
    this.browserPatterns.set('edge', /edg\/([\d.]+)/i);
    this.browserPatterns.set('opera', /opr\/([\d.]+)/i);
    this.browserPatterns.set('brave', /brave\/([\d.]+)/i);

    // OS patterns
    this.osPatterns.set('windows', /windows nt ([\d.]+)/i);
    this.osPatterns.set('macos', /mac os x ([\d._]+)/i);
    this.osPatterns.set('linux', /linux/i);
    this.osPatterns.set('android', /android ([\d.]+)/i);
    this.osPatterns.set('ios', /os ([\d_]+)/i);

    // Device patterns
    this.devicePatterns.set('mobile', /mobile|android|iphone|ipad|ipod/i);
    this.devicePatterns.set('tablet', /tablet|ipad/i);
    this.devicePatterns.set('desktop', /windows|mac|linux/i);
  }

  private detectBrowser(userAgent: string): ParsedUserAgent['browser'] {
    for (const [browserName, pattern] of this.browserPatterns) {
      const match = userAgent.match(pattern);
      if (match) {
        const version = match[1] || '';
        const [major, minor] = version.split('.').map(Number);
        return {
          name: browserName as BrowserType,
          version,
          major: major || 0,
          minor: minor || 0,
        };
      }
    }

    return {
      name: 'other',
      version: '',
      major: 0,
      minor: 0,
    };
  }

  private detectOS(userAgent: string): ParsedUserAgent['os'] {
    for (const [osName, pattern] of this.osPatterns) {
      const match = userAgent.match(pattern);
      if (match) {
        return {
          name: osName as OSType,
          version: match[1] || '',
          platform: osName,
        };
      }
    }

    return {
      name: 'other',
      version: '',
      platform: 'unknown',
    };
  }

  private detectDevice(userAgent: string): ParsedUserAgent['device'] {
    for (const [deviceName, pattern] of this.devicePatterns) {
      if (pattern.test(userAgent)) {
        return {
          type: deviceName as DeviceType,
          vendor: this.extractVendor(userAgent),
          model: this.extractModel(userAgent),
        };
      }
    }

    return {
      type: 'other',
    };
  }

  private detectEngine(
    userAgent: string,
    browser: ParsedUserAgent['browser']
  ): ParsedUserAgent['engine'] {
    if (
      browser.name === 'chrome' ||
      browser.name === 'edge' ||
      browser.name === 'opera' ||
      browser.name === 'brave'
    ) {
      return { name: 'Blink', version: '' };
    } else if (browser.name === 'firefox') {
      return { name: 'Gecko', version: '' };
    } else if (browser.name === 'safari') {
      return { name: 'WebKit', version: '' };
    }

    return { name: 'Unknown', version: '' };
  }

  private detectBotType(userAgent: string): BotType {
    const ua = userAgent.toLowerCase();

    if (/googlebot/i.test(ua)) return 'search_engine';
    if (/facebookexternalhit|twitterbot/i.test(ua)) return 'social_media';
    if (/uptimerobot|pingdom|newrelic/i.test(ua)) return 'monitoring';
    if (/selenium|webdriver|phantomjs|headless/i.test(ua)) return 'automation';

    return 'other';
  }

  private detectCapabilities(userAgent: string): {
    webRTC: boolean;
    webGL: boolean;
    touch: boolean;
    cookies: boolean;
  } {
    return {
      webRTC: !/mobile|android|iphone/i.test(userAgent.toLowerCase()),
      webGL: true, // Most modern browsers support WebGL
      touch: /mobile|android|iphone|ipad|touch/i.test(userAgent.toLowerCase()),
      cookies: true, // Assume cookies are enabled
    };
  }

  private detectBotPatterns(userAgent: string): boolean {
    return BOT_PATTERNS.some(pattern => new RegExp(pattern, 'i').test(userAgent));
  }

  private detectSuspiciousPatterns(userAgent: string): boolean {
    return SUSPICIOUS_PATTERNS.some(pattern => new RegExp(pattern, 'i').test(userAgent));
  }

  private extractVendor(userAgent: string): string | undefined {
    const vendors = ['Apple', 'Samsung', 'Google', 'Huawei', 'Xiaomi', 'OnePlus'];
    for (const vendor of vendors) {
      if (userAgent.includes(vendor)) {
        return vendor;
      }
    }
    return undefined;
  }

  private extractModel(userAgent: string): string | undefined {
    const modelPatterns = [/iPhone\s*([^;\s]+)/i, /iPad\s*([^;\s]+)/i, /Android[^;]*;\s*([^)]+)/i];

    for (const pattern of modelPatterns) {
      const match = userAgent.match(pattern);
      if (match && match[1]) {
        return match[1].trim();
      }
    }

    return undefined;
  }

  private getScreenResolution(): ParsedUserAgent['screenResolution'] {
    if (typeof window !== 'undefined' && window.screen) {
      return {
        width: window.screen.width,
        height: window.screen.height,
        colorDepth: window.screen.colorDepth,
        pixelRatio: window.devicePixelRatio || 1,
      };
    }
    return undefined;
  }

  private getScreenResolutionString(): string {
    const resolution = this.getScreenResolution();
    return resolution ? `${resolution.width}x${resolution.height}` : 'unknown';
  }

  private getPluginsList(): string[] {
    if (typeof navigator !== 'undefined' && navigator.plugins) {
      return Array.from(navigator.plugins).map(p => p.name);
    }
    return [];
  }

  private getFontsList(): string[] {
    // This would require canvas fingerprinting for actual font detection
    // For now, return common fonts
    return [
      'Arial',
      'Helvetica',
      'Times New Roman',
      'Courier New',
      'Verdana',
      'Georgia',
      'Comic Sans MS',
      'Impact',
    ];
  }

  private getCanvasFingerprint(): string {
    // Canvas fingerprinting would go here
    return 'canvas_fingerprint_placeholder';
  }

  private getWebGLFingerprint(): string {
    // WebGL fingerprinting would go here
    return 'webgl_fingerprint_placeholder';
  }

  private getAudioFingerprint(): string {
    // Audio fingerprinting would go here
    return 'audio_fingerprint_placeholder';
  }

  private hasSessionStorage(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.sessionStorage;
    } catch {
      return false;
    }
  }

  private hasLocalStorage(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.localStorage;
    } catch {
      return false;
    }
  }

  private hasIndexedDB(): boolean {
    try {
      return typeof window !== 'undefined' && !!window.indexedDB;
    } catch {
      return false;
    }
  }

  private detectAdBlock(): boolean {
    // Simple ad blocker detection
    const testEl = document.createElement('div');
    testEl.innerHTML = '&nbsp;';
    testEl.className = 'adsbox adsbygoogle ad-banner advertisement';
    testEl.style.position = 'absolute';
    testEl.style.left = '-10000px';
    document.body.appendChild(testEl);

    const isBlocked = testEl.offsetHeight === 0;
    document.body.removeChild(testEl);

    return isBlocked;
  }

  private getTouchSupport(): FingerprintComponents['touchSupport'] {
    return {
      maxTouchPoints: navigator?.maxTouchPoints || 0,
      touchEvent: 'ontouchstart' in window,
      touchStart: typeof TouchEvent !== 'undefined',
    };
  }

  private generateFingerprintHash(components: FingerprintComponents): string {
    // Simple hash generation - in production, use a proper hashing algorithm
    const dataString = JSON.stringify(components);
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  private calculateFingerprintConfidence(components: FingerprintComponents): number {
    let confidence = 50; // Base confidence

    // Increase confidence for stable, non-spoofable values
    if (components.platform) confidence += 10;
    if (components.timezone) confidence += 10;
    if (components.language) confidence += 10;
    if (components.hardwareConcurrency > 0) confidence += 5;
    if (components.deviceMemory) confidence += 5;
    if (components.screenResolution) confidence += 10;

    // Decrease confidence for easily spoofable values
    if (components.webdriver) confidence -= 20;
    if (components.plugins.length === 0) confidence -= 10;

    return Math.max(0, Math.min(100, confidence));
  }

  private calculateFingerprintRisk(
    components: FingerprintComponents,
    parsedUA: ParsedUserAgent
  ): number {
    let riskScore = 0;

    // Bot detection
    if (parsedUA.isBot) riskScore += 50;

    // Suspicious patterns
    if (this.isSuspicious(components.userAgent)) riskScore += 30;

    // Webdriver detection
    if (components.webdriver) riskScore += 40;

    // Missing plugins (could indicate headless browser)
    if (components.plugins.length === 0) riskScore += 20;

    // Unusual screen resolution
    const resolution = components.screenResolution;
    if (resolution && (resolution.width < 800 || resolution.height < 600)) {
      riskScore += 10;
    }

    // Touch support mismatch
    if (parsedUA.isMobile && !components.touchSupport.touchEvent) {
      riskScore += 15;
    }

    return Math.min(100, riskScore);
  }

  private recalculateRiskScore(fingerprint: DeviceFingerprint, timeSinceLastSeen: number): number {
    let newRiskScore = fingerprint.riskScore;

    // Decrease risk for frequently seen devices
    if (fingerprint.seenCount > 10) {
      newRiskScore = Math.max(0, newRiskScore - 5);
    }

    // Increase risk for devices not seen in a while
    if (timeSinceLastSeen > 30 * 24 * 60 * 60 * 1000) {
      // 30 days
      newRiskScore = Math.min(100, newRiskScore + 10);
    }

    return newRiskScore;
  }
}
