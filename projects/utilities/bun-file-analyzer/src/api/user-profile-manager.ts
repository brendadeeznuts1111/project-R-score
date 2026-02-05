/**
 * User Profile Manager with Preferences
 * Integrates with cookie system for persistent user settings
 */

import { Bun } from "bun";
import type { CookieOptions } from "./cookie-manager-browser";

// User profile interfaces
export interface UserProfile {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatar?: string;
  role: "admin" | "user" | "guest";
  createdAt: Date;
  lastLogin: Date;
  preferences: UserPreferences;
}

export interface UserPreferences {
  // Accessibility preferences
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    reducedMotion: boolean;
    darkMode: boolean;
    focusIndicator: "default" | "thick" | "high-contrast" | "animated";
    readingMode: "normal" | "dyslexic" | "line-spacing" | "focus";
    colorBlindness: "none" | "protanopia" | "deuteranopia" | "tritanopia";
  };
  
  // UI preferences
  ui: {
    theme: "light" | "dark" | "auto";
    language: string;
    timezone: string;
    dateFormat: "MM/DD/YYYY" | "DD/MM/YYYY" | "YYYY-MM-DD";
    timeFormat: "12h" | "24h";
    defaultView: "treemap" | "pie" | "bars";
    autoRefresh: boolean;
    refreshInterval: number; // seconds
  };
  
  // Notification preferences
  notifications: {
    email: boolean;
    push: boolean;
    desktop: boolean;
    sound: boolean;
    types: {
      system: boolean;
      security: boolean;
      performance: boolean;
      updates: boolean;
    };
  };
  
  // Privacy preferences
  privacy: {
    analytics: boolean;
    crashReports: boolean;
    usageData: boolean;
    shareProfile: boolean;
  };
  
  // Performance preferences
  performance: {
    enableAnimations: boolean;
    enableTransitions: boolean;
    enableParticles: boolean;
    enableShadows: boolean;
    enableBlur: boolean;
  };
}

// Default preferences
export const DEFAULT_PREFERENCES: UserPreferences = {
  accessibility: {
    highContrast: false,
    largeText: false,
    reducedMotion: false,
    darkMode: false,
    focusIndicator: "default",
    readingMode: "normal",
    colorBlindness: "none",
  },
  ui: {
    theme: "auto",
    language: "en",
    timezone: "UTC",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
    defaultView: "treemap",
    autoRefresh: true,
    refreshInterval: 30,
  },
  notifications: {
    email: true,
    push: true,
    desktop: false,
    sound: false,
    types: {
      system: true,
      security: true,
      performance: false,
      updates: true,
    },
  },
  privacy: {
    analytics: true,
    crashReports: true,
    usageData: false,
    shareProfile: false,
  },
  performance: {
    enableAnimations: true,
    enableTransitions: true,
    enableParticles: false,
    enableShadows: true,
    enableBlur: false,
  },
};

// Cookie configuration for user data
const USER_COOKIE_OPTIONS: CookieOptions = {
  httpOnly: false, // Allow JavaScript access for preferences
  secure: true,
  sameSite: "strict",
  maxAge: 60 * 60 * 24 * 30, // 30 days
  path: "/",
};

export class UserProfileManager {
  private profiles: Map<string, UserProfile> = new Map();
  private currentUserId: string | null = null;
  private cookieJar: Bun.CookieMap;

  constructor() {
    this.cookieJar = new Bun.CookieMap();
    this.loadFromCookies();
    this.loadProfilesFromStorage();
  }

  // User profile management
  createProfile(userData: Partial<UserProfile>): UserProfile {
    const profile: UserProfile = {
      id: this.generateId(),
      username: userData.username || `user_${Date.now()}`,
      email: userData.email || "",
      displayName: userData.displayName || userData.username || "Anonymous",
      avatar: userData.avatar,
      role: userData.role || "user",
      createdAt: new Date(),
      lastLogin: new Date(),
      preferences: {
        ...DEFAULT_PREFERENCES,
        ...userData.preferences,
      },
    };

    this.profiles.set(profile.id, profile);
    this.saveProfilesToStorage();
    return profile;
  }

  getProfile(userId: string): UserProfile | undefined {
    return this.profiles.get(userId);
  }

  getCurrentProfile(): UserProfile | undefined {
    if (!this.currentUserId) return undefined;
    return this.getProfile(this.currentUserId);
  }

  updateProfile(userId: string, updates: Partial<UserProfile>): UserProfile | null {
    const profile = this.profiles.get(userId);
    if (!profile) return null;

    const updatedProfile = {
      ...profile,
      ...updates,
      preferences: {
        ...profile.preferences,
        ...updates.preferences,
      },
    };

    this.profiles.set(userId, updatedProfile);
    this.saveProfilesToStorage();
    
    // Update current user if it's the active profile
    if (this.currentUserId === userId) {
      this.saveCurrentUserId(userId);
      this.applyPreferences(updatedProfile.preferences);
    }

    return updatedProfile;
  }

  updatePreferences(userId: string, preferences: Partial<UserPreferences>): UserProfile | null {
    return this.updateProfile(userId, { preferences });
  }

  deleteProfile(userId: string): boolean {
    const success = this.profiles.delete(userId);
    if (success) {
      this.saveProfilesToStorage();
      if (this.currentUserId === userId) {
        this.logout();
      }
    }
    return success;
  }

  // Authentication/session management
  login(userId: string): UserProfile | null {
    const profile = this.getProfile(userId);
    if (!profile) return null;

    this.currentUserId = userId;
    profile.lastLogin = new Date();
    this.updateProfile(userId, { lastLogin: new Date() });
    this.saveCurrentUserId(userId);
    this.applyPreferences(profile.preferences);

    return profile;
  }

  logout(): void {
    this.currentUserId = null;
    this.cookieJar.delete("currentUserId");
    this.resetToDefaultPreferences();
  }

  isLoggedIn(): boolean {
    return this.currentUserId !== null;
  }

  // Preference application
  applyPreferences(preferences: UserPreferences): void {
    // Apply accessibility preferences
    this.applyAccessibilityPreferences(preferences.accessibility);
    
    // Apply UI preferences
    this.applyUIPreferences(preferences.ui);
    
    // Apply performance preferences
    this.applyPerformancePreferences(preferences.performance);
    
    // Save preferences to cookies
    this.savePreferencesToCookies(preferences);
  }

  private applyAccessibilityPreferences(accessibility: UserPreferences["accessibility"]): void {
    const body = document.body;
    
    // Apply accessibility classes
    body.classList.toggle("high-contrast", accessibility.highContrast);
    body.classList.toggle("large-text", accessibility.largeText);
    body.classList.toggle("reduced-motion", accessibility.reducedMotion);
    body.classList.toggle("dark-mode", accessibility.darkMode);
    
    // Apply focus indicator styles
    this.updateFocusIndicator(accessibility.focusIndicator);
    
    // Apply reading mode
    this.updateReadingMode(accessibility.readingMode);
    
    // Apply color blindness filters
    this.updateColorBlindness(accessibility.colorBlindness);
  }

  private applyUIPreferences(ui: UserPreferences["ui"]): void {
    // Apply theme
    this.applyTheme(ui.theme);
    
    // Set language
    document.documentElement.lang = ui.language;
    
    // Set timezone (meta tag)
    let timezoneMeta = document.querySelector('meta[name="timezone"]');
    if (!timezoneMeta) {
      timezoneMeta = document.createElement('meta');
      timezoneMeta.name = 'timezone';
      document.head.appendChild(timezoneMeta);
    }
    timezoneMeta.content = ui.timezone;
  }

  private applyPerformancePreferences(performance: UserPreferences["performance"]): void {
    const body = document.body;
    
    body.classList.toggle("no-animations", !performance.enableAnimations);
    body.classList.toggle("no-transitions", !performance.enableTransitions);
    body.classList.toggle("no-particles", !performance.enableParticles);
    body.classList.toggle("no-shadows", !performance.enableShadows);
    body.classList.toggle("no-blur", !performance.enableBlur);
  }

  // Storage management
  private loadFromCookies(): void {
    const currentUserIdCookie = this.cookieJar.get("currentUserId");
    if (currentUserIdCookie) {
      this.currentUserId = currentUserIdCookie.value;
    }

    const preferencesCookie = this.cookieJar.get("userPreferences");
    if (preferencesCookie) {
      try {
        const preferences = JSON.parse(preferencesCookie.value);
        this.applyPreferences(preferences);
      } catch (error) {
        console.warn("Failed to load preferences from cookie:", error);
      }
    }
  }

  private saveCurrentUserId(userId: string): void {
    this.cookieJar.set("currentUserId", userId, USER_COOKIE_OPTIONS);
  }

  private savePreferencesToCookies(preferences: UserPreferences): void {
    this.cookieJar.set("userPreferences", JSON.stringify(preferences), USER_COOKIE_OPTIONS);
  }

  private loadProfilesFromStorage(): void {
    try {
      const stored = localStorage.getItem("userProfiles");
      if (stored) {
        const profiles = JSON.parse(stored);
        profiles.forEach((profile: UserProfile) => {
          profile.createdAt = new Date(profile.createdAt);
          profile.lastLogin = new Date(profile.lastLogin);
          this.profiles.set(profile.id, profile);
        });
      }
    } catch (error) {
      console.warn("Failed to load profiles from localStorage:", error);
    }
  }

  private saveProfilesToStorage(): void {
    try {
      const profiles = Array.from(this.profiles.values());
      localStorage.setItem("userProfiles", JSON.stringify(profiles));
    } catch (error) {
      console.warn("Failed to save profiles to localStorage:", error);
    }
  }

  // Utility methods
  private generateId(): string {
    return `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private resetToDefaultPreferences(): void {
    this.applyPreferences(DEFAULT_PREFERENCES);
  }

  private applyTheme(theme: "light" | "dark" | "auto"): void {
    const body = document.body;
    
    if (theme === "auto") {
      const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      body.classList.toggle("dark-mode", prefersDark);
    } else {
      body.classList.toggle("dark-mode", theme === "dark");
    }
  }

  private updateFocusIndicator(style: string): void {
    // Remove existing focus styles
    const existingStyles = document.getElementById("focus-indicator-styles");
    if (existingStyles) existingStyles.remove();

    const styleElement = document.createElement("style");
    styleElement.id = "focus-indicator-styles";
    
    let css = "";
    switch (style) {
      case "thick":
        css = ".focus-visible:focus { outline: 4px solid #3b82f6 !important; outline-offset: 3px !important; }";
        break;
      case "high-contrast":
        css = ".focus-visible:focus { outline: 3px solid #000000 !important; outline-offset: 2px !important; background: #ffff00 !important; }";
        break;
      case "animated":
        css = ".focus-visible:focus { outline: 2px solid #3b82f6 !important; outline-offset: 2px !important; animation: focusPulse 1s infinite; } @keyframes focusPulse { 0%, 100% { box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.5); } 50% { box-shadow: 0 0 0 8px rgba(59, 130, 246, 0); } }";
        break;
      default:
        css = ".focus-visible:focus { outline: 2px solid #3b82f6 !important; outline-offset: 2px !important; }";
    }
    
    styleElement.textContent = css;
    document.head.appendChild(styleElement);
  }

  private updateReadingMode(mode: string): void {
    const existingStyles = document.getElementById("reading-mode-styles");
    if (existingStyles) existingStyles.remove();

    if (mode !== "normal") {
      const styleElement = document.createElement("style");
      styleElement.id = "reading-mode-styles";
      
      let css = "";
      switch (mode) {
        case "dyslexic":
          css = "body { font-family: 'OpenDyslexic', 'Comic Sans MS', sans-serif !important; }";
          break;
        case "line-spacing":
          css = "body { line-height: 1.8 !important; letter-spacing: 0.12em !important; }";
          break;
        case "focus":
          css = "body > *:not(header) { filter: blur(3px); transition: filter 0.3s; } body > *:hover, body > *:focus { filter: blur(0); }";
          break;
      }
      
      styleElement.textContent = css;
      document.head.appendChild(styleElement);
    }
  }

  private updateColorBlindness(mode: string): void {
    const existingStyles = document.getElementById("colorblindness-styles");
    if (existingStyles) existingStyles.remove();

    if (mode !== "none") {
      const styleElement = document.createElement("style");
      styleElement.id = "colorblindness-styles";
      
      const filters = {
        protanopia: "url('#protanopia-filter')",
        deuteranopia: "url('#deuteranopia-filter')",
        tritanopia: "url('#tritanopia-filter')",
      };
      
      // Add SVG filters
      const svgFilters = `
        <svg style="position: absolute; width: 0; height: 0;">
          <defs>
            <filter id="protanopia-filter">
              <feColorMatrix type="matrix" values="0.567, 0.433, 0, 0, 0, 0.558, 0.442, 0, 0, 0, 0, 0.242, 0.758, 0, 0, 0, 0, 0, 1, 0"/>
            </filter>
            <filter id="deuteranopia-filter">
              <feColorMatrix type="matrix" values="0.625, 0.375, 0, 0, 0, 0.7, 0.3, 0, 0, 0, 0, 0.3, 0.7, 0, 0, 0, 0, 0, 1, 0"/>
            </filter>
            <filter id="tritanopia-filter">
              <feColorMatrix type="matrix" values="0.95, 0.05, 0, 0, 0, 0, 0.433, 0.567, 0, 0, 0, 0.475, 0.525, 0, 0, 0, 0, 0, 1, 0"/>
            </filter>
          </defs>
        </svg>
      `;
      
      const div = document.createElement("div");
      div.innerHTML = svgFilters;
      document.body.insertBefore(div.firstElementChild, document.body.firstChild);
      
      styleElement.textContent = `body { filter: ${filters[mode as keyof typeof filters]} !important; }`;
      document.head.appendChild(styleElement);
    }
  }

  // Export/Import functionality
  exportProfile(userId: string): string | null {
    const profile = this.getProfile(userId);
    if (!profile) return null;

    return JSON.stringify({
      profile,
      exportedAt: new Date().toISOString(),
      version: "1.0",
    }, null, 2);
  }

  importProfile(profileData: string): UserProfile | null {
    try {
      const parsed = JSON.parse(profileData);
      const profile = parsed.profile as UserProfile;
      
      // Convert dates back to Date objects
      profile.createdAt = new Date(profile.createdAt);
      profile.lastLogin = new Date(profile.lastLogin);
      
      // Generate new ID to avoid conflicts
      profile.id = this.generateId();
      
      this.profiles.set(profile.id, profile);
      this.saveProfilesToStorage();
      
      return profile;
    } catch (error) {
      console.error("Failed to import profile:", error);
      return null;
    }
  }

  // Get all profiles (for admin/management)
  getAllProfiles(): UserProfile[] {
    return Array.from(this.profiles.values());
  }

  // Get profile statistics
  getProfileStats(): {
    totalProfiles: number;
    activeProfile: string | null;
    lastLogin: Date | null;
    preferencesUsage: Record<string, number>;
  } {
    const profiles = this.getAllProfiles();
    const lastLogin = profiles.reduce((latest, profile) => 
      profile.lastLogin > latest ? profile.lastLogin : latest, 
      new Date(0)
    );

    // Calculate preferences usage
    const preferencesUsage: Record<string, number> = {};
    profiles.forEach(profile => {
      Object.entries(profile.preferences).forEach(([category, prefs]) => {
        Object.entries(prefs).forEach(([key, value]) => {
          const prefKey = `${category}.${key}`;
          preferencesUsage[prefKey] = (preferencesUsage[prefKey] || 0) + 1;
        });
      });
    });

    return {
      totalProfiles: profiles.length,
      activeProfile: this.currentUserId,
      lastLogin: lastLogin.getTime() > 0 ? lastLogin : null,
      preferencesUsage,
    };
  }
}

// Create singleton instance
export const userProfileManager = new UserProfileManager();

// Export types
export type { UserProfile, UserPreferences };
