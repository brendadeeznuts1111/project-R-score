/**
 * 🌐 Fire22 Language Manager
 *
 * Comprehensive language management system for Fire22 platform
 */

import languageCodes from './fire22-language-codes.json';

export interface LanguageCode {
  en: string;
  es?: string;
  pt?: string;
  fr?: string;
  context?: string;
}

export interface LanguageMetadata {
  version: string;
  lastUpdated: string;
  totalCodes: number;
  supportedLanguages: string[];
  defaultLanguage: string;
}

export class Fire22LanguageManager {
  private currentLanguage: string;
  private codes: Record<string, LanguageCode>;
  private metadata: LanguageMetadata;
  private fallbackLanguage: string = 'en';
  private missingTranslations: Set<string> = new Set();

  constructor(defaultLanguage: string = 'en') {
    this.codes = { ...(languageCodes as any) };
    this.metadata = this.codes._metadata as any;
    this.currentLanguage = defaultLanguage;

    // Remove metadata from codes object
    delete (this.codes as any)._metadata;

    // Initialize metadata if not found
    if (!this.metadata) {
      this.metadata = {
        version: '1.0.0',
        lastUpdated: new Date().toISOString(),
        totalCodes: Object.keys(this.codes).length,
        supportedLanguages: ['en', 'es', 'pt', 'fr'],
        defaultLanguage: 'en',
      };
    }

    this.detectUserLanguage();
  }

  /**
   * Detect user's preferred language
   */
  private detectUserLanguage(): void {
    // Priority: URL parameter > Local storage > Browser setting > Default
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const urlLang = urlParams.get('lang');
      const storedLang = localStorage.getItem('fire22_language');
      const browserLang = navigator.language.split('-')[0];

      const detectedLang = urlLang || storedLang || browserLang || this.fallbackLanguage;

      if (this.metadata.supportedLanguages.includes(detectedLang)) {
        this.currentLanguage = detectedLang;
      }
    }
  }

  /**
   * Get translated text for a language code
   */
  getText(code: string, language?: string): string {
    const lang = language || this.currentLanguage;
    const entry = this.codes[code];

    if (!entry) {
      this.missingTranslations.add(code);
      console.warn(`Missing language code: ${code}`);
      return code; // Return the code itself as fallback
    }

    // Try requested language, then fallback language, then English
    const text =
      entry[lang as keyof LanguageCode] ||
      entry[this.fallbackLanguage as keyof LanguageCode] ||
      entry.en;

    if (!text) {
      this.missingTranslations.add(`${code}:${lang}`);
      console.warn(`Missing translation for ${code} in language ${lang}`);
      return entry.en || code;
    }

    return text as string;
  }

  /**
   * Set current language
   */
  setLanguage(language: string): boolean {
    if (!this.metadata.supportedLanguages.includes(language)) {
      console.warn(`Unsupported language: ${language}`);
      return false;
    }

    this.currentLanguage = language;

    // Store in localStorage
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('fire22_language', language);
    }

    // Update all DOM elements
    this.updateAllLanguageElements();

    // Dispatch language change event
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('fire22LanguageChanged', {
          detail: {
            language: language,
            previousLanguage: this.currentLanguage,
          },
        })
      );
    }

    return true;
  }

  /**
   * Get current language
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return this.metadata.supportedLanguages;
  }

  /**
   * Get all language codes
   */
  getAllCodes(): string[] {
    return Object.keys(this.codes);
  }

  /**
   * Get language code with context
   */
  getCodeInfo(code: string): LanguageCode | null {
    return this.codes[code] || null;
  }

  /**
   * Search for language codes by text
   */
  searchCodes(
    searchTerm: string,
    language: string = 'en'
  ): Array<{ code: string; text: string; context?: string }> {
    const results: Array<{ code: string; text: string; context?: string }> = [];

    for (const [code, entry] of Object.entries(this.codes)) {
      const text = entry[language as keyof LanguageCode] as string;
      if (text && text.toLowerCase().includes(searchTerm.toLowerCase())) {
        results.push({
          code,
          text,
          context: entry.context,
        });
      }
    }

    return results;
  }

  /**
   * Validate language codes in DOM
   */
  validateDOMCodes(): Array<{ element: Element; code: string; valid: boolean }> {
    const results: Array<{ element: Element; code: string; valid: boolean }> = [];

    if (typeof document !== 'undefined') {
      const elements = document.querySelectorAll('[data-language]');

      elements.forEach(element => {
        const code = element.getAttribute('data-language');
        if (code) {
          const valid = this.codes.hasOwnProperty(code);
          results.push({ element, code, valid });

          if (!valid) {
            console.warn(`Invalid language code in DOM: ${code}`, element);
          }
        }
      });
    }

    return results;
  }

  /**
   * Update all DOM elements with language codes
   */
  updateAllLanguageElements(): void {
    if (typeof document === 'undefined') return;

    const elements = document.querySelectorAll('[data-language]');
    let updatedCount = 0;

    elements.forEach(element => {
      const code = element.getAttribute('data-language');
      if (code) {
        const text = this.getText(code);

        // Handle different element types
        if (
          element.tagName === 'INPUT' &&
          (element as HTMLInputElement).placeholder !== undefined
        ) {
          (element as HTMLInputElement).placeholder = text;
        } else if (element.tagName === 'IMG' && (element as HTMLImageElement).alt !== undefined) {
          (element as HTMLImageElement).alt = text;
        } else {
          element.textContent = text;
        }

        // Add language attribute for CSS styling
        element.setAttribute('data-lang', this.currentLanguage);
        updatedCount++;
      }
    });
  }

  /**
   * Get missing translations report
   */
  getMissingTranslationsReport(): Array<{ code: string; missingLanguages: string[] }> {
    const report: Array<{ code: string; missingLanguages: string[] }> = [];

    for (const [code, entry] of Object.entries(this.codes)) {
      const missingLanguages: string[] = [];

      for (const lang of this.metadata.supportedLanguages) {
        if (!entry[lang as keyof LanguageCode]) {
          missingLanguages.push(lang);
        }
      }

      if (missingLanguages.length > 0) {
        report.push({ code, missingLanguages });
      }
    }

    return report;
  }

  /**
   * Export translations for external translation services
   */
  exportTranslations(language: string, format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      let csv = 'Code,Context,English,Translation\n';

      for (const [code, entry] of Object.entries(this.codes)) {
        const context = entry.context || '';
        const english = entry.en || '';
        const translation = entry[language as keyof LanguageCode] || '';

        csv += `"${code}","${context}","${english}","${translation}"\n`;
      }

      return csv;
    }

    // JSON format
    const exportData: Record<string, any> = {};

    for (const [code, entry] of Object.entries(this.codes)) {
      exportData[code] = {
        context: entry.context,
        english: entry.en,
        translation: entry[language as keyof LanguageCode] || '',
      };
    }

    return JSON.stringify(exportData, null, 2);
  }

  /**
   * Import translations from external sources
   */
  importTranslations(translationsJson: string, language: string): boolean {
    try {
      const translations = JSON.parse(translationsJson);
      let importedCount = 0;

      for (const [code, data] of Object.entries(translations)) {
        if (this.codes[code] && data && typeof data === 'object') {
          const translation = (data as any).translation || (data as any)[language];
          if (translation) {
            (this.codes[code] as any)[language] = translation;
            importedCount++;
          }
        }
      }

      return true;
    } catch (error) {
      console.error('Failed to import translations:', error);
      return false;
    }
  }

  /**
   * Get language statistics
   */
  getStatistics(): {
    totalCodes: number;
    supportedLanguages: number;
    completionRates: Record<string, number>;
    missingTranslations: number;
  } {
    const totalCodes = Object.keys(this.codes).length;
    const completionRates: Record<string, number> = {};

    for (const lang of this.metadata.supportedLanguages) {
      let completed = 0;

      for (const entry of Object.values(this.codes)) {
        if (entry[lang as keyof LanguageCode]) {
          completed++;
        }
      }

      completionRates[lang] = Math.round((completed / totalCodes) * 100);
    }

    return {
      totalCodes,
      supportedLanguages: this.metadata.supportedLanguages.length,
      completionRates,
      missingTranslations: this.missingTranslations.size,
    };
  }

  /**
   * Add new language code
   */
  addLanguageCode(code: string, translations: Partial<LanguageCode>): boolean {
    if (this.codes[code]) {
      console.warn(`Language code ${code} already exists`);
      return false;
    }

    if (!translations.en) {
      console.error('English translation is required for new language codes');
      return false;
    }

    this.codes[code] = translations as LanguageCode;
    return true;
  }

  /**
   * Update existing language code
   */
  updateLanguageCode(code: string, translations: Partial<LanguageCode>): boolean {
    if (!this.codes[code]) {
      console.warn(`Language code ${code} does not exist`);
      return false;
    }

    this.codes[code] = { ...this.codes[code], ...translations };
    return true;
  }

  /**
   * Remove language code
   */
  removeLanguageCode(code: string): boolean {
    if (!this.codes[code]) {
      console.warn(`Language code ${code} does not exist`);
      return false;
    }

    delete this.codes[code];
    return true;
  }

  /**
   * Get language direction (for RTL support)
   */
  getLanguageDirection(language?: string): 'ltr' | 'rtl' {
    const lang = language || this.currentLanguage;
    const rtlLanguages = ['ar', 'he', 'fa', 'ur'];
    return rtlLanguages.includes(lang) ? 'rtl' : 'ltr';
  }

  /**
   * Format number according to language locale
   */
  formatNumber(number: number, options?: Intl.NumberFormatOptions): string {
    if (typeof Intl === 'undefined') return number.toString();

    try {
      return new Intl.NumberFormat(this.currentLanguage, options).format(number);
    } catch (error) {
      return new Intl.NumberFormat('en', options).format(number);
    }
  }

  /**
   * Format date according to language locale
   */
  formatDate(date: Date, options?: Intl.DateTimeFormatOptions): string {
    if (typeof Intl === 'undefined') return date.toString();

    try {
      return new Intl.DateTimeFormat(this.currentLanguage, options).format(date);
    } catch (error) {
      return new Intl.DateTimeFormat('en', options).format(date);
    }
  }
}

// Global instance
export const fire22Language = new Fire22LanguageManager();

// Helper functions for easy access
export function t(code: string, language?: string): string {
  return fire22Language.getText(code, language);
}

export function setLanguage(language: string): boolean {
  return fire22Language.setLanguage(language);
}

export function getCurrentLanguage(): string {
  return fire22Language.getCurrentLanguage();
}

export function updateLanguageElements(): void {
  fire22Language.updateAllLanguageElements();
}

/**
 * Hub Integration Methods
 */
export interface HubSyncConfig {
  hubUrl: string;
  apiKey?: string;
  autoSync: boolean;
  syncInterval: number;
}

export class Fire22LanguageManagerWithHub extends Fire22LanguageManager {
  private hubConfig: HubSyncConfig;
  private syncInterval?: NodeJS.Timeout;

  constructor(defaultLanguage: string = 'en', hubConfig: Partial<HubSyncConfig> = {}) {
    super(defaultLanguage);

    this.hubConfig = {
      hubUrl: process.env.HUB_URL || 'http://localhost:3001', // Use 3001 for testing
      autoSync: true,
      syncInterval: 300000, // 5 minutes
      ...hubConfig,
    };

    if (this.hubConfig.autoSync && typeof window === 'undefined') {
      this.initializeHubSync();
    }
  }

  /**
   * Initialize hub synchronization
   */
  private initializeHubSync(): void {
    // Initial sync on startup
    setTimeout(() => {
      this.syncWithHub('pull').catch(error => {
        console.warn('Initial language sync failed:', error.message);
      });
    }, 2000);

    // Set up periodic sync
    if (this.hubConfig.syncInterval > 0) {
      this.syncInterval = setInterval(async () => {
        try {
          await this.syncWithHub('push');
        } catch (error) {
          console.error('Periodic language sync failed:', error);
        }
      }, this.hubConfig.syncInterval);
    }
  }

  /**
   * Sync language data with hub
   */
  async syncWithHub(operation: 'push' | 'pull'): Promise<boolean> {
    try {
      if (operation === 'push') {
        // Push local data to hub
        const response = await fetch(`${this.hubConfig.hubUrl}/api/hub/language/sync`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.hubConfig.apiKey && { Authorization: `Bearer ${this.hubConfig.apiKey}` }),
          },
          body: JSON.stringify({
            operation: 'push',
            data: {
              codes: this.getAllCodes(),
              currentLanguage: this.getCurrentLanguage(),
              supportedLanguages: this.getSupportedLanguages(),
              statistics: this.getStatistics(),
              metadata: this.metadata,
            },
          }),
        });

        if (!response.ok) {
          throw new Error(`Hub sync failed: ${response.statusText}`);
        }

        const result = await response.json();
        return result.success;
      } else {
        // Pull data from hub
        const response = await fetch(`${this.hubConfig.hubUrl}/api/hub/language/codes`, {
          method: 'GET',
          headers: {
            ...(this.hubConfig.apiKey && { Authorization: `Bearer ${this.hubConfig.apiKey}` }),
          },
        });

        if (!response.ok) {
          throw new Error(`Hub fetch failed: ${response.statusText}`);
        }

        const hubData = await response.json();
        if (hubData.success && hubData.codes) {
          // Update local codes with hub data
          for (const code of hubData.codes) {
            const codeInfo = hubData.codeInfo?.[code];
            if (codeInfo) {
              this.codes[code] = codeInfo;
            }
          }
          return true;
        }
        return false;
      }
    } catch (error) {
      console.error(`Language hub sync (${operation}) failed:`, error);
      return false;
    }
  }

  /**
   * Push specific language code to hub
   */
  async pushCodeToHub(code: string): Promise<boolean> {
    const codeInfo = this.getCodeInfo(code);
    if (!codeInfo) {
      return false;
    }

    try {
      const response = await fetch(`${this.hubConfig.hubUrl}/api/hub/language/code/${code}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(this.hubConfig.apiKey && { Authorization: `Bearer ${this.hubConfig.apiKey}` }),
        },
        body: JSON.stringify(codeInfo),
      });

      return response.ok;
    } catch (error) {
      console.error(`Failed to push code ${code} to hub:`, error);
      return false;
    }
  }

  /**
   * Set language and sync with hub
   */
  async setLanguageWithSync(language: string): Promise<boolean> {
    const success = this.setLanguage(language);
    if (success) {
      // Notify hub of language change
      try {
        await fetch(`${this.hubConfig.hubUrl}/api/hub/language/set`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(this.hubConfig.apiKey && { Authorization: `Bearer ${this.hubConfig.apiKey}` }),
          },
          body: JSON.stringify({ language }),
        });
      } catch (error) {
        console.warn('Failed to sync language change with hub:', error);
      }
    }
    return success;
  }

  /**
   * Get hub connection status
   */
  async getHubStatus(): Promise<{
    connected: boolean;
    lastSync?: string;
    error?: string;
  }> {
    try {
      const response = await fetch(`${this.hubConfig.hubUrl}/api/hub/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000),
      });

      return {
        connected: response.ok,
        lastSync: new Date().toISOString(),
      };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Cleanup hub sync
   */
  cleanup(): void {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = undefined;
    }
  }
}

// Create hub-enabled instance
export const fire22LanguageWithHub = new Fire22LanguageManagerWithHub();

// Auto-initialize on import
if (typeof window !== 'undefined') {
  // Make available globally
  (window as any).Fire22Language = fire22Language;
  (window as any).Fire22LanguageWithHub = fire22LanguageWithHub;
  (window as any).t = t;

  // Auto-update on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      fire22Language.updateAllLanguageElements();
    });
  } else {
    fire22Language.updateAllLanguageElements();
  }
}
