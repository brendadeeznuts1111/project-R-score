#!/usr/bin/env bun

/**
 * 🤖🌐 Fire22 Multilingual Telegram Bot Integration
 *
 * Complete Telegram bot integration with Fire22 language system
 * supporting 4 languages: English, Spanish, Portuguese, French
 */

import { Fire22LanguageManager, t } from '../i18n/language-manager';

export interface TelegramUser {
  id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  language_code?: string;
}

export interface NotificationData {
  userId: number;
  amount?: number;
  type?: string;
  timestamp?: Date;
  reference?: string;
}

export interface SupportTicketData {
  id: number;
  subject: string;
  priority: 'normal' | 'high' | 'urgent';
  serviceLevel: 'basic' | 'premium' | 'vip' | 'enterprise';
}

export class MultilingualTelegramBot {
  private languageManager: Fire22LanguageManager;
  private userLanguages: Map<number, string> = new Map();

  constructor() {
    this.languageManager = new Fire22LanguageManager();
  }

  /**
   * Get user's preferred language or detect from Telegram
   */
  getUserLanguage(telegramUser: TelegramUser): string {
    // Check cached user language
    const cachedLang = this.userLanguages.get(telegramUser.id);
    if (cachedLang) return cachedLang;

    // Detect from Telegram language_code
    const telegramLang = this.mapTelegramLanguage(telegramUser.language_code);
    if (telegramLang) {
      this.userLanguages.set(telegramUser.id, telegramLang);
      return telegramLang;
    }

    // Default to English
    this.userLanguages.set(telegramUser.id, 'en');
    return 'en';
  }

  /**
   * Set user's language preference
   */
  setUserLanguage(userId: number, language: string): boolean {
    const supportedLanguages = this.languageManager.getSupportedLanguages();
    if (supportedLanguages.includes(language)) {
      this.userLanguages.set(userId, language);
      return true;
    }
    return false;
  }

  /**
   * Map Telegram language codes to our supported languages
   */
  private mapTelegramLanguage(telegramLangCode?: string): string | null {
    if (!telegramLangCode) return null;

    const langMap: Record<string, string> = {
      en: 'en',
      es: 'es',
      pt: 'pt',
      'pt-br': 'pt',
      fr: 'fr',
      'es-mx': 'es',
      'es-ar': 'es',
      'es-es': 'es',
    };

    return langMap[telegramLangCode.toLowerCase()] || null;
  }

  /**
   * Generate welcome message for new users
   */
  generateWelcomeMessage(telegramUser: TelegramUser): {
    text: string;
    keyboard: any;
  } {
    const lang = this.getUserLanguage(telegramUser);
    const welcomeText = this.languageManager.getText('L-1500', lang);

    return {
      text: `🎉 ${welcomeText}\n\n${this.generateUserAccountInfo(telegramUser, lang)}`,
      keyboard: {
        inline_keyboard: [
          [
            {
              text: this.languageManager.getText('L-1504', lang), // View Dashboard
              url: 'https://dashboard.fire22.com',
            },
            {
              text: '🌐 Language / Idioma',
              callback_data: 'change_language',
            },
          ],
        ],
      },
    };
  }

  /**
   * Generate account linking success message
   */
  generateAccountLinkMessage(
    telegramUser: TelegramUser,
    email: string
  ): {
    text: string;
    keyboard: any;
  } {
    const lang = this.getUserLanguage(telegramUser);
    const successText = this.languageManager.getText('L-1501', lang);

    return {
      text: `✅ ${successText}\n📧 ${email}`,
      keyboard: {
        inline_keyboard: [
          [
            {
              text: this.languageManager.getText('L-1504', lang), // View Dashboard
              url: 'https://dashboard.fire22.com',
            },
          ],
        ],
      },
    };
  }

  /**
   * Generate transaction notification
   */
  generateTransactionNotification(
    telegramUser: TelegramUser,
    notificationData: NotificationData
  ): {
    text: string;
    keyboard: any;
  } {
    const lang = this.getUserLanguage(telegramUser);
    const alertHeader = this.languageManager.getText('L-1502', lang); // New Transaction Alert

    const { amount, type, timestamp, reference } = notificationData;

    const text =
      `🚨 ${alertHeader}\n\n` +
      `💰 ${this.getAmountText(lang)}: $${amount}\n` +
      `📊 ${this.getTypeText(lang)}: ${type}\n` +
      `⏰ ${this.getTimeText(lang)}: ${timestamp?.toLocaleString(this.getLocaleForLanguage(lang))}\n` +
      (reference ? `🆔 ${this.getReferenceText(lang)}: ${reference}` : '');

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            {
              text: this.languageManager.getText('L-1504', lang), // View Dashboard
              url: 'https://dashboard.fire22.com',
            },
            {
              text: this.languageManager.getText('L-1505', lang), // Dismiss
              callback_data: 'dismiss_alert',
            },
          ],
        ],
      },
    };
  }

  /**
   * Generate cashier deposit notification
   */
  generateDepositNotification(
    telegramUser: TelegramUser,
    depositData: {
      operationId: number;
      amount: number;
      paymentMethod: string;
      transactionId: string;
    }
  ): {
    text: string;
    keyboard: any;
  } {
    const lang = this.getUserLanguage(telegramUser);
    const depositHeader = this.languageManager.getText('L-1506', lang); // New Deposit Request

    const text =
      `💰 ${depositHeader}\n\n` +
      `💵 ${this.getAmountText(lang)}: $${depositData.amount}\n` +
      `💳 ${this.getMethodText(lang)}: ${depositData.paymentMethod}\n` +
      `🆔 ${this.getTransactionText(lang)}: ${depositData.transactionId}\n` +
      `⏰ ${this.getStatusText(lang)}: ${this.getProcessingText(lang)}`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            {
              text: `✅ ${this.languageManager.getText('L-1507', lang)}`, // Approve
              callback_data: `approve_deposit_${depositData.operationId}`,
            },
            {
              text: `❌ ${this.languageManager.getText('L-1508', lang)}`, // Reject
              callback_data: `reject_deposit_${depositData.operationId}`,
            },
          ],
          [
            {
              text: `🔍 ${this.languageManager.getText('L-1509', lang)}`, // Details
              callback_data: `details_deposit_${depositData.operationId}`,
            },
          ],
        ],
      },
    };
  }

  /**
   * Generate P2P match found notification
   */
  generateP2PMatchNotification(
    telegramUser: TelegramUser,
    matchData: {
      queueId: string;
      matches: Array<{
        id: string;
        amount: number;
        paymentType: string;
        matchScore: number;
      }>;
    }
  ): {
    text: string;
    keyboard: any;
  } {
    const lang = this.getUserLanguage(telegramUser);
    const matchHeader = this.languageManager.getText('L-1510', lang); // P2P Match Found

    const text =
      `🎯 ${matchHeader}\n\n` +
      `📋 Queue ID: ${matchData.queueId}\n` +
      `🔍 ${matchData.matches.length} ${this.getMatchesText(lang)}\n\n` +
      matchData.matches
        .map(
          (match, i) =>
            `${i + 1}. $${match.amount} via ${match.paymentType} (${this.getScoreText(lang)}: ${match.matchScore}%)`
        )
        .join('\n');

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            {
              text: `✅ ${this.languageManager.getText('L-1511', lang)}`, // Process Best Match
              callback_data: `process_match_${matchData.queueId}_${matchData.matches[0]?.id}`,
            },
          ],
          [
            {
              text: `📋 ${this.languageManager.getText('L-1512', lang)}`, // View All
              callback_data: `view_matches_${matchData.queueId}`,
            },
            {
              text: `⏳ ${this.languageManager.getText('L-1513', lang)}`, // Wait for Better
              callback_data: `wait_${matchData.queueId}`,
            },
          ],
        ],
      },
    };
  }

  /**
   * Generate support ticket notification
   */
  generateSupportTicketNotification(
    telegramUser: TelegramUser,
    ticketData: SupportTicketData
  ): {
    text: string;
    keyboard: any;
  } {
    const lang = this.getUserLanguage(telegramUser);
    const ticketHeader = this.languageManager.getText('L-1514', lang); // Support Ticket Created

    const priorityEmoji = this.getPriorityEmoji(ticketData.priority);

    const text =
      `🎫 ${ticketHeader}\n\n` +
      `📋 ID: ${ticketData.id}\n` +
      `📝 ${this.getSubjectText(lang)}: ${ticketData.subject}\n` +
      `${priorityEmoji} ${this.getPriorityText(lang)}: ${this.translatePriority(ticketData.priority, lang)}\n` +
      `🏆 ${this.getServiceLevelText(lang)}: ${this.translateServiceLevel(ticketData.serviceLevel, lang)}`;

    return {
      text,
      keyboard: {
        inline_keyboard: [
          [
            {
              text: `✅ ${this.languageManager.getText('L-1516', lang)}`, // Acknowledge
              callback_data: `ack_ticket_${ticketData.id}`,
            },
            {
              text: `🚨 ${this.languageManager.getText('L-1517', lang)}`, // Escalate
              callback_data: `escalate_ticket_${ticketData.id}`,
            },
          ],
        ],
      },
    };
  }

  /**
   * Generate language selection keyboard
   */
  generateLanguageSelectionKeyboard(): any {
    return {
      inline_keyboard: [
        [
          { text: '🇺🇸 English', callback_data: 'set_lang_en' },
          { text: '🇪🇸 Español', callback_data: 'set_lang_es' },
        ],
        [
          { text: '🇵🇹 Português', callback_data: 'set_lang_pt' },
          { text: '🇫🇷 Français', callback_data: 'set_lang_fr' },
        ],
      ],
    };
  }

  /**
   * Generate language change confirmation
   */
  generateLanguageChangeMessage(userId: number, newLanguage: string): string {
    const confirmationText = this.languageManager.getText('L-1520', newLanguage); // Language Changed
    return `🌐 ${confirmationText}!`;
  }

  /**
   * Generate error messages
   */
  generateErrorMessage(
    telegramUser: TelegramUser,
    errorType: 'registration' | 'linking' | 'general'
  ): string {
    const lang = this.getUserLanguage(telegramUser);

    switch (errorType) {
      case 'registration':
        return `❌ ${this.languageManager.getText('L-1518', lang)}`;
      case 'linking':
        return `❌ ${this.languageManager.getText('L-1519', lang)}`;
      default:
        return `❌ ${this.languageManager.getText('L-1407', lang)}`;
    }
  }

  // Helper methods for common text elements
  private generateUserAccountInfo(user: TelegramUser, lang: string): string {
    return (
      `👤 ${user.first_name}${user.last_name ? ' ' + user.last_name : ''}\n` +
      `🆔 ID: ${user.id}\n` +
      `🌐 ${this.getLanguageText(lang)}: ${this.getLanguageDisplayName(lang)}`
    );
  }

  private getAmountText(lang: string): string {
    const amountMap: Record<string, string> = {
      en: 'Amount',
      es: 'Cantidad',
      pt: 'Quantia',
      fr: 'Montant',
    };
    return amountMap[lang] || 'Amount';
  }

  private getTypeText(lang: string): string {
    const typeMap: Record<string, string> = {
      en: 'Type',
      es: 'Tipo',
      pt: 'Tipo',
      fr: 'Type',
    };
    return typeMap[lang] || 'Type';
  }

  private getTimeText(lang: string): string {
    const timeMap: Record<string, string> = {
      en: 'Time',
      es: 'Tiempo',
      pt: 'Hora',
      fr: 'Heure',
    };
    return timeMap[lang] || 'Time';
  }

  private getReferenceText(lang: string): string {
    const refMap: Record<string, string> = {
      en: 'Reference',
      es: 'Referencia',
      pt: 'Referência',
      fr: 'Référence',
    };
    return refMap[lang] || 'Reference';
  }

  private getMethodText(lang: string): string {
    const methodMap: Record<string, string> = {
      en: 'Method',
      es: 'Método',
      pt: 'Método',
      fr: 'Méthode',
    };
    return methodMap[lang] || 'Method';
  }

  private getTransactionText(lang: string): string {
    const txMap: Record<string, string> = {
      en: 'Transaction',
      es: 'Transacción',
      pt: 'Transação',
      fr: 'Transaction',
    };
    return txMap[lang] || 'Transaction';
  }

  private getStatusText(lang: string): string {
    const statusMap: Record<string, string> = {
      en: 'Status',
      es: 'Estado',
      pt: 'Status',
      fr: 'Statut',
    };
    return statusMap[lang] || 'Status';
  }

  private getProcessingText(lang: string): string {
    const procMap: Record<string, string> = {
      en: 'Processing',
      es: 'Procesando',
      pt: 'Processando',
      fr: 'En cours',
    };
    return procMap[lang] || 'Processing';
  }

  private getMatchesText(lang: string): string {
    const matchMap: Record<string, string> = {
      en: 'potential matches',
      es: 'emparejamientos potenciales',
      pt: 'correspondências potenciais',
      fr: 'correspondances potentielles',
    };
    return matchMap[lang] || 'potential matches';
  }

  private getScoreText(lang: string): string {
    const scoreMap: Record<string, string> = {
      en: 'Score',
      es: 'Puntuación',
      pt: 'Pontuação',
      fr: 'Score',
    };
    return scoreMap[lang] || 'Score';
  }

  private getSubjectText(lang: string): string {
    const subjectMap: Record<string, string> = {
      en: 'Subject',
      es: 'Asunto',
      pt: 'Assunto',
      fr: 'Sujet',
    };
    return subjectMap[lang] || 'Subject';
  }

  private getPriorityText(lang: string): string {
    const priorityMap: Record<string, string> = {
      en: 'Priority',
      es: 'Prioridad',
      pt: 'Prioridade',
      fr: 'Priorité',
    };
    return priorityMap[lang] || 'Priority';
  }

  private getServiceLevelText(lang: string): string {
    const serviceMap: Record<string, string> = {
      en: 'Service Level',
      es: 'Nivel de Servicio',
      pt: 'Nível de Serviço',
      fr: 'Niveau de Service',
    };
    return serviceMap[lang] || 'Service Level';
  }

  private getLanguageText(lang: string): string {
    const langMap: Record<string, string> = {
      en: 'Language',
      es: 'Idioma',
      pt: 'Idioma',
      fr: 'Langue',
    };
    return langMap[lang] || 'Language';
  }

  private getLanguageDisplayName(lang: string): string {
    const displayMap: Record<string, string> = {
      en: 'English',
      es: 'Español',
      pt: 'Português',
      fr: 'Français',
    };
    return displayMap[lang] || 'English';
  }

  private translatePriority(priority: string, lang: string): string {
    const priorityMap: Record<string, Record<string, string>> = {
      normal: { en: 'Normal', es: 'Normal', pt: 'Normal', fr: 'Normal' },
      high: { en: 'High', es: 'Alta', pt: 'Alta', fr: 'Élevée' },
      urgent: { en: 'Urgent', es: 'Urgente', pt: 'Urgente', fr: 'Urgent' },
    };
    return priorityMap[priority]?.[lang] || priority;
  }

  private translateServiceLevel(level: string, lang: string): string {
    const levelMap: Record<string, Record<string, string>> = {
      basic: { en: 'Basic', es: 'Básico', pt: 'Básico', fr: 'Basique' },
      premium: { en: 'Premium', es: 'Premium', pt: 'Premium', fr: 'Premium' },
      vip: { en: 'VIP', es: 'VIP', pt: 'VIP', fr: 'VIP' },
      enterprise: { en: 'Enterprise', es: 'Empresarial', pt: 'Empresarial', fr: 'Entreprise' },
    };
    return levelMap[level]?.[lang] || level;
  }

  private getPriorityEmoji(priority: string): string {
    const emojiMap: Record<string, string> = {
      normal: '📝',
      high: '⚠️',
      urgent: '🚨',
    };
    return emojiMap[priority] || '📝';
  }

  private getLocaleForLanguage(lang: string): string {
    const localeMap: Record<string, string> = {
      en: 'en-US',
      es: 'es-ES',
      pt: 'pt-BR',
      fr: 'fr-FR',
    };
    return localeMap[lang] || 'en-US';
  }

  /**
   * Get system statistics for the language system
   */
  getLanguageSystemStats(): {
    totalCodes: number;
    telegramCodes: number;
    supportedLanguages: string[];
    activeUsers: number;
  } {
    const allCodes = this.languageManager.getAllCodes();
    const telegramCodes = allCodes.filter(code => {
      const num = parseInt(code.replace('L-', ''));
      return num >= 1500 && num <= 1599;
    });

    return {
      totalCodes: allCodes.length,
      telegramCodes: telegramCodes.length,
      supportedLanguages: this.languageManager.getSupportedLanguages(),
      activeUsers: this.userLanguages.size,
    };
  }
}

// Export helper functions for global use
export const telegramBot = new MultilingualTelegramBot();

export const getTelegramText = (code: string, userId: number): string => {
  const bot = new MultilingualTelegramBot();
  const userLang = bot.getUserLanguage({ id: userId, first_name: 'User' });
  return bot.languageManager.getText(code, userLang);
};

export default MultilingualTelegramBot;
