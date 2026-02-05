#!/usr/bin/env bun

/**
 * 🔥 Fire22 Language Keys System - Core Module
 *
 * Centralized Fire22 L-key management for all workspaces
 * Provides authentic multilingual support (EN/ES/PT) based on real Fire22 language keys
 *
 * Usage across workspaces:
 * ```typescript
 * import { Fire22LanguageManager, fire22Language } from '@fire22/language-keys';
 *
 * // Singleton instance (recommended)
 * const text = fire22Language.getText('L-69'); // "Amount"
 *
 * // Custom instance
 * const manager = new Fire22LanguageManager('es');
 * const spanishText = manager.getText('L-69'); // "Cantidad"
 * ```
 */

export interface Fire22LanguageKeys {
  // Betting Types (Sports & Casino)
  'L-12': string; // Straights (Directas / Diretas)
  'L-15': string; // Parlays (Combinadas / Combinadas)
  'L-16': string; // If Bets (Apuestas Si / Apostas Se)
  'L-85': string; // Teasers (Teasers / Teasers)
  'L-1390': string; // Live/Props (En Vivo/Props / Ao Vivo/Props)

  // Financial & Transaction Keys
  'L-69': string; // Amount (Cantidad / Quantidade)
  'L-627': string; // Risk Amount (Cantidad Riesgo / Valor Risco)
  'L-628': string; // Win Amount (Cantidad Ganancia / Valor Ganho)
  'L-187': string; // Balance (Saldo / Saldo)
  'L-281': string; // Credit (Crédito / Crédito)

  // Customer & Identity
  'L-152': string; // Type (Tipo / Tipo)
  'L-214': string; // Password (Contraseña / Senha)
  'L-526': string; // Name (Nombre / Nome)
  'L-603': string; // Customer ID (ID Cliente / ID Cliente)

  // System & Interface
  'L-407': string; // Settings (Configuración / Configurações)
  'L-449': string; // Today (Hoy / Hoje)
  'L-451': string; // Time (Hora / Hora)
  'L-792': string; // Okay (Aceptar / OK)
  'L-880': string; // All (Todo / Todos)

  // Reporting & Analytics
  'L-849': string; // Report Settings (Configuración Reportes / Configurações Relatório)
  'L-885': string; // Order By (Ordenar Por / Ordenar Por)
  'L-886': string; // Sort (Ordenar / Ordenar)
  'L-892': string; // Filter (Filtro / Filtro)

  // Advanced Keys (L-868 to L-896)
  'L-868': string; // Commission (Comisión / Comissão)
  'L-869': string; // Agent (Agente / Agente)
  'L-871': string; // Player (Jugador / Jogador)
  'L-881': string; // Active (Activo / Ativo)
  'L-882': string; // Inactive (Inactivo / Inativo)
  'L-883': string; // Pending (Pendiente / Pendente)
  'L-884': string; // Completed (Completado / Concluído)
  'L-887': string; // Status (Estado / Status)
  'L-888': string; // Agent ID (ID Agente / ID Agente)
  'L-889': string; // Login ID (ID Login / ID Login)
  'L-890': string; // Date Range (Rango Fecha / Período)
  'L-891': string; // From Date (Desde Fecha / Data Inicial)
  'L-893': string; // To Date (Hasta Fecha / Data Final)
  'L-894': string; // Search (Buscar / Buscar)
  'L-895': string; // Export (Exportar / Exportar)
  'L-896': string; // Print (Imprimir / Imprimir)

  // Business Operations
  'L-202': string; // Deposit (Depósito / Depósito)
  'L-206': string; // Withdrawal (Retiro / Saque)
  'L-287': string; // Transaction (Transacción / Transação)
  'L-426': string; // Account (Cuenta / Conta)
  'L-475': string; // Limit (Límite / Limite)

  // Enhanced Keys
  'L-1351': string; // Dashboard (Panel / Painel)
}

/**
 * Complete Fire22 language key mappings with authentic translations
 */
export const FIRE22_LANGUAGE_KEYS: Record<string, Fire22LanguageKeys> = {
  en: {
    // Betting Types
    'L-12': 'Straights',
    'L-15': 'Parlays',
    'L-16': 'If Bets',
    'L-85': 'Teasers',
    'L-1390': 'Live/Props',

    // Financial & Transaction
    'L-69': 'Amount',
    'L-627': 'Risk Amount',
    'L-628': 'Win Amount',
    'L-187': 'Balance',
    'L-281': 'Credit',

    // Customer & Identity
    'L-152': 'Type',
    'L-214': 'Password',
    'L-526': 'Name',
    'L-603': 'Customer ID',

    // System & Interface
    'L-407': 'Settings',
    'L-449': 'Today',
    'L-451': 'Time',
    'L-792': 'Okay',
    'L-880': 'All',

    // Reporting & Analytics
    'L-849': 'Report Settings',
    'L-885': 'Order By',
    'L-886': 'Sort',
    'L-892': 'Filter',

    // Advanced Keys
    'L-868': 'Commission',
    'L-869': 'Agent',
    'L-871': 'Player',
    'L-881': 'Active',
    'L-882': 'Inactive',
    'L-883': 'Pending',
    'L-884': 'Completed',
    'L-887': 'Status',
    'L-888': 'Agent ID',
    'L-889': 'Login ID',
    'L-890': 'Date Range',
    'L-891': 'From Date',
    'L-893': 'To Date',
    'L-894': 'Search',
    'L-895': 'Export',
    'L-896': 'Print',

    // Business Operations
    'L-202': 'Deposit',
    'L-206': 'Withdrawal',
    'L-287': 'Transaction',
    'L-426': 'Account',
    'L-475': 'Limit',

    // Enhanced Keys
    'L-1351': 'Dashboard',
  },
  es: {
    // Betting Types
    'L-12': 'Directas',
    'L-15': 'Combinadas',
    'L-16': 'Apuestas Si',
    'L-85': 'Teasers',
    'L-1390': 'En Vivo/Props',

    // Financial & Transaction
    'L-69': 'Cantidad',
    'L-627': 'Cantidad Riesgo',
    'L-628': 'Cantidad Ganancia',
    'L-187': 'Saldo',
    'L-281': 'Crédito',

    // Customer & Identity
    'L-152': 'Tipo',
    'L-214': 'Contraseña',
    'L-526': 'Nombre',
    'L-603': 'ID Cliente',

    // System & Interface
    'L-407': 'Configuración',
    'L-449': 'Hoy',
    'L-451': 'Hora',
    'L-792': 'Aceptar',
    'L-880': 'Todo',

    // Reporting & Analytics
    'L-849': 'Configuración Reportes',
    'L-885': 'Ordenar Por',
    'L-886': 'Ordenar',
    'L-892': 'Filtro',

    // Advanced Keys
    'L-868': 'Comisión',
    'L-869': 'Agente',
    'L-871': 'Jugador',
    'L-881': 'Activo',
    'L-882': 'Inactivo',
    'L-883': 'Pendiente',
    'L-884': 'Completado',
    'L-887': 'Estado',
    'L-888': 'ID Agente',
    'L-889': 'ID Login',
    'L-890': 'Rango Fecha',
    'L-891': 'Desde Fecha',
    'L-893': 'Hasta Fecha',
    'L-894': 'Buscar',
    'L-895': 'Exportar',
    'L-896': 'Imprimir',

    // Business Operations
    'L-202': 'Depósito',
    'L-206': 'Retiro',
    'L-287': 'Transacción',
    'L-426': 'Cuenta',
    'L-475': 'Límite',

    // Enhanced Keys
    'L-1351': 'Panel',
  },
  pt: {
    // Betting Types
    'L-12': 'Diretas',
    'L-15': 'Combinadas',
    'L-16': 'Apostas Se',
    'L-85': 'Teasers',
    'L-1390': 'Ao Vivo/Props',

    // Financial & Transaction
    'L-69': 'Quantidade',
    'L-627': 'Valor Risco',
    'L-628': 'Valor Ganho',
    'L-187': 'Saldo',
    'L-281': 'Crédito',

    // Customer & Identity
    'L-152': 'Tipo',
    'L-214': 'Senha',
    'L-526': 'Nome',
    'L-603': 'ID Cliente',

    // System & Interface
    'L-407': 'Configurações',
    'L-449': 'Hoje',
    'L-451': 'Hora',
    'L-792': 'OK',
    'L-880': 'Todos',

    // Reporting & Analytics
    'L-849': 'Configurações Relatório',
    'L-885': 'Ordenar Por',
    'L-886': 'Ordenar',
    'L-892': 'Filtro',

    // Advanced Keys
    'L-868': 'Comissão',
    'L-869': 'Agente',
    'L-871': 'Jogador',
    'L-881': 'Ativo',
    'L-882': 'Inativo',
    'L-883': 'Pendente',
    'L-884': 'Concluído',
    'L-887': 'Status',
    'L-888': 'ID Agente',
    'L-889': 'ID Login',
    'L-890': 'Período',
    'L-891': 'Data Inicial',
    'L-893': 'Data Final',
    'L-894': 'Buscar',
    'L-895': 'Exportar',
    'L-896': 'Imprimir',

    // Business Operations
    'L-202': 'Depósito',
    'L-206': 'Saque',
    'L-287': 'Transação',
    'L-426': 'Conta',
    'L-475': 'Limite',

    // Enhanced Keys
    'L-1351': 'Painel',
  },
};

/**
 * Water-themed depth contexts for Fire22 language organization
 */
export interface DepthContext {
  surface: Array<keyof Fire22LanguageKeys>; // Basic UI elements
  'mid-water': Array<keyof Fire22LanguageKeys>; // Core business logic
  'deep-water': Array<keyof Fire22LanguageKeys>; // Advanced features
  abyssal: Array<keyof Fire22LanguageKeys>; // System-level operations
}

export const FIRE22_DEPTH_CONTEXTS: DepthContext = {
  surface: ['L-407', 'L-449', 'L-792', 'L-880'], // Settings, Today, Okay, All
  'mid-water': ['L-603', 'L-526', 'L-69', 'L-152'], // Customer ID, Name, Amount, Type
  'deep-water': ['L-849', 'L-885', 'L-886', 'L-892'], // Report Settings, Order By, Sort, Filter
  abyssal: ['L-1390', 'L-888', 'L-889', 'L-880'], // Live/Props, Agent ID, Login ID, All
};

/**
 * Fire22 Language Manager Class
 *
 * Provides centralized multilingual support for all Fire22 workspaces
 */
export class Fire22LanguageManager {
  private currentLanguage: string = 'en';
  private depthContext: DepthContext | null = null;

  constructor(initialLanguage: string = 'en') {
    this.currentLanguage = this.normalizeLanguageCode(initialLanguage);
  }

  /**
   * Normalize language codes to Fire22 supported languages (en/es/pt)
   */
  private normalizeLanguageCode(langCode: string): string {
    if (!langCode) return 'en';

    const normalized = langCode.toLowerCase().substring(0, 2);

    // Map common language variations
    const languageMap: Record<string, string> = {
      es: 'es', // Spanish
      pt: 'pt', // Portuguese
      'pt-br': 'pt', // Brazilian Portuguese
      en: 'en', // English
      'en-us': 'en', // US English
      'en-gb': 'en', // UK English
    };

    return languageMap[normalized] || 'en';
  }

  /**
   * Get Fire22 language text by L-key with fallback support
   */
  getText(key: keyof Fire22LanguageKeys, fallback?: string): string {
    const languageSet = FIRE22_LANGUAGE_KEYS[this.currentLanguage];
    if (languageSet && languageSet[key]) {
      return languageSet[key];
    }

    // Fallback to English if available
    const englishSet = FIRE22_LANGUAGE_KEYS['en'];
    if (englishSet && englishSet[key]) {
      return englishSet[key];
    }

    return fallback || key;
  }

  /**
   * Set current language
   */
  setLanguage(langCode: string): void {
    this.currentLanguage = this.normalizeLanguageCode(langCode);
  }

  /**
   * Get current language code
   */
  getCurrentLanguage(): string {
    return this.currentLanguage;
  }

  /**
   * Get all supported languages
   */
  getSupportedLanguages(): string[] {
    return Object.keys(FIRE22_LANGUAGE_KEYS);
  }

  /**
   * Set water depth context for organized language key access
   */
  setDepthContext(context: DepthContext): void {
    this.depthContext = context;
  }

  /**
   * Get language keys by water depth context
   */
  getContextKeys(
    depth: keyof DepthContext
  ): Array<{ key: keyof Fire22LanguageKeys; text: string }> {
    if (!this.depthContext) {
      return [];
    }

    const keys = this.depthContext[depth] || [];
    return keys.map(key => ({
      key,
      text: this.getText(key),
    }));
  }

  /**
   * Format message template with Fire22 L-key substitution
   */
  formatMessage(template: string, variables: Record<string, any> = {}): string {
    let message = template;

    // Replace Fire22 L-key placeholders {L-xxx}
    message = message.replace(/\{L-(\d+)\}/g, (match, keyNumber) => {
      const key = `L-${keyNumber}` as keyof Fire22LanguageKeys;
      return this.getText(key, match);
    });

    // Replace variable placeholders {varname}
    Object.entries(variables).forEach(([key, value]) => {
      message = message.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value));
    });

    return message;
  }

  /**
   * Create multilingual data structure for Fire22 UI components
   */
  createMultilingualData<T>(structure: Record<keyof Fire22LanguageKeys, T>): Record<string, T> {
    const result: Record<string, T> = {};

    Object.keys(structure).forEach(key => {
      const lKey = key as keyof Fire22LanguageKeys;
      const translatedKey = this.getText(lKey);
      result[translatedKey] = structure[lKey];
    });

    return result;
  }

  /**
   * Format Fire22 amount with localized currency
   */
  formatAmount(amount: number, currency: string = 'USD'): string {
    const amountLabel = this.getText('L-69'); // Amount

    const formatter = new Intl.NumberFormat(this.getLocale(), {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2,
    });

    return `${amountLabel}: ${formatter.format(amount)}`;
  }

  /**
   * Get locale string for Intl formatting based on current language
   */
  private getLocale(): string {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
    };
    return localeMap[this.currentLanguage] || 'en-US';
  }

  /**
   * Get all L-keys for the current language as key-value pairs
   */
  getAllKeys(): Record<string, string> {
    const languageSet = FIRE22_LANGUAGE_KEYS[this.currentLanguage];
    return languageSet ? { ...languageSet } : {};
  }

  /**
   * Check if a specific L-key exists
   */
  hasKey(key: string): boolean {
    const lKey = key as keyof Fire22LanguageKeys;
    const languageSet = FIRE22_LANGUAGE_KEYS[this.currentLanguage];
    return !!(languageSet && languageSet[lKey]);
  }

  /**
   * Export language data for external systems
   */
  exportLanguageData(): {
    currentLanguage: string;
    supportedLanguages: string[];
    keys: Record<string, string>;
    depthContext: DepthContext | null;
  } {
    return {
      currentLanguage: this.currentLanguage,
      supportedLanguages: this.getSupportedLanguages(),
      keys: this.getAllKeys(),
      depthContext: this.depthContext,
    };
  }
}

/**
 * Singleton Fire22 Language Manager instance for workspace-wide usage
 *
 * Usage:
 * ```typescript
 * import { fire22Language } from '@fire22/language-keys';
 * console.log(fire22Language.getText('L-69')); // "Amount"
 * ```
 */
export const fire22Language = new Fire22LanguageManager();

/**
 * Utility functions for Fire22 workspaces
 */
export const Fire22LanguageUtils = {
  /**
   * Create Fire22-branded interface labels
   */
  createInterfaceLabels: (language: string = 'en') => {
    const manager = new Fire22LanguageManager(language);
    return {
      // Common UI Elements
      settings: manager.getText('L-407'),
      today: manager.getText('L-449'),
      okay: manager.getText('L-792'),
      all: manager.getText('L-880'),

      // Financial Operations
      amount: manager.getText('L-69'),
      balance: manager.getText('L-187'),
      deposit: manager.getText('L-202'),
      withdrawal: manager.getText('L-206'),

      // Customer Management
      customerId: manager.getText('L-603'),
      name: manager.getText('L-526'),
      type: manager.getText('L-152'),

      // Betting Operations
      straights: manager.getText('L-12'),
      parlays: manager.getText('L-15'),
      liveProps: manager.getText('L-1390'),
    };
  },

  /**
   * Validate Fire22 L-key format
   */
  isValidLKey: (key: string): boolean => {
    return /^L-\d+$/.test(key);
  },

  /**
   * Extract L-key number
   */
  extractLKeyNumber: (key: string): number | null => {
    const match = key.match(/^L-(\d+)$/);
    return match ? parseInt(match[1], 10) : null;
  },

  /**
   * Get all available L-keys
   */
  getAllAvailableLKeys: (): string[] => {
    const englishSet = FIRE22_LANGUAGE_KEYS['en'];
    return Object.keys(englishSet);
  },
};

// Type exports for workspace integration
export type { Fire22LanguageKeys, DepthContext };
export { FIRE22_LANGUAGE_KEYS, FIRE22_DEPTH_CONTEXTS };

// Default export
export default Fire22LanguageManager;
