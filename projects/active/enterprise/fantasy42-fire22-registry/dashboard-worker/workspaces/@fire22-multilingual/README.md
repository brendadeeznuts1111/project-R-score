# 🌐 @fire22/multilingual

[![Version](https://img.shields.io/badge/version-1.3.0-blue.svg)](package.json)
[![Languages](https://img.shields.io/badge/languages-4-green.svg)](src/i18n)
[![Codes](https://img.shields.io/badge/codes-77-orange.svg)](src/i18n/fire22-language-codes.json)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.2.20-f472b6.svg)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Comprehensive multilingual system with 77 language codes supporting English,
Spanish, Portuguese, and French for the Fire22 platform.

## 📦 Installation

```bash
bun add @fire22/multilingual
```

## 🚀 Features

- **77 Language Codes**: Complete translation system (L-1000 to L-1520)
- **4 Languages**: English, Spanish, Portuguese, French
- **Smart Caching**: High-performance translation cache
- **Variable Support**: Dynamic content interpolation
- **Language Detection**: Automatic user language detection
- **Telegram Integration**: 21 specialized Telegram codes (L-1500 to L-1520)
- **Type Safety**: Full TypeScript support

## 📖 Quick Start

```typescript
import { Fire22LanguageSystem } from '@fire22/multilingual';

// Initialize language system
const languageSystem = new Fire22LanguageSystem();
await languageSystem.initialize();

// Translate a message
const welcome = await languageSystem.translate(
  'L-1500', // Welcome code
  'es', // Spanish
  { name: 'Usuario' } // Variables
);
// Result: "¡Bienvenido, Usuario!"

// Detect user language
const detectedLang = await languageSystem.detectUserLanguage('user123');

// Set user preference
await languageSystem.setUserLanguage('user123', 'fr');
```

## 🗂️ Language Codes

### Core System (L-1000 to L-1499)

- **User Interface**: L-1000 to L-1099
- **System Messages**: L-1100 to L-1199
- **Business Operations**: L-1200 to L-1299
- **Reports & Analytics**: L-1300 to L-1399
- **Errors & Validation**: L-1400 to L-1499

### Telegram Integration (L-1500 to L-1520)

```typescript
L-1500: "Welcome"                    // Bot welcome
L-1501: "Account Linked"             // Account linking
L-1502: "Transaction Alert"          // Transaction notifications
L-1503: "System Alert"               // System notifications
L-1504: "View Dashboard"             // Dashboard button
L-1505: "Dismiss"                   // Dismiss action
L-1506: "New Deposit"               // Deposit notification
L-1507: "Approve"                   // Approval action
L-1508: "Reject"                    // Rejection action
L-1509: "Details"                   // View details
L-1510: "P2P Match Found"           // P2P matching
L-1511: "Process Best Match"        // Process match
L-1512: "View All"                  // View all items
L-1513: "Wait for Better"           // Wait for better match
L-1514: "Support Ticket Created"    // Support confirmation
L-1515: "Ticket Escalated"          // Escalation notice
L-1516: "Acknowledge"               // Acknowledge action
L-1517: "Escalate"                  // Escalate action
L-1518: "Registration Failed"       // Registration error
L-1519: "Linking Failed"            // Linking error
L-1520: "Language Changed"          // Language switch
```

## 🌍 Supported Languages

| Code | Language   | Flag | Native Name |
| ---- | ---------- | ---- | ----------- |
| `en` | English    | 🇺🇸   | English     |
| `es` | Spanish    | 🇪🇸   | Español     |
| `pt` | Portuguese | 🇵🇹   | Português   |
| `fr` | French     | 🇫🇷   | Français    |

## 🔧 Configuration

### Cache Settings

```typescript
const config = {
  cacheSize: 1000, // Maximum cached translations
  cacheTTL: 3600000, // 1 hour TTL
  fallbackLanguage: 'en', // Default language
  preloadLanguages: ['en', 'es'], // Preload at startup
};
```

### Variable Interpolation

```typescript
// Template with variables
const template = 'Hello {{name}}, you have {{count}} messages';

// Translate with variables
const result = await languageSystem.translate('L-1001', 'en', {
  name: 'John',
  count: 5,
});
// Result: "Hello John, you have 5 messages"
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Test translations
bun test:translations

# Test Telegram integration
bun test:telegram

# Run benchmarks
bun run benchmark
bun run benchmark:cache

# Interactive demo
bun run demo

# Validate all translations
bun run validate
```

## 📈 Performance

- **Translation Speed**: < 1ms (cached)
- **Cache Hit Rate**: > 95% typical
- **Memory Usage**: < 10MB for full cache
- **Initialization**: < 100ms

## 📊 Translation Coverage

### Current Status

- **Total Codes**: 77
- **Languages**: 4
- **Total Translations**: 308 (77 × 4)
- **Coverage**: 100%

### Validation

```bash
# Validate translation completeness
bun run scripts/validate-translations.ts

# Output:
✅ All 77 codes translated in all 4 languages
✅ No missing translations
✅ No invalid language codes
```

## 📄 API Reference

### Main Classes

#### `Fire22LanguageSystem`

Core language system managing translations and caching.

### Methods

#### `initialize()`

Initialize the language system and load translations.

#### `translate(code, language, variables?)`

Translate a language code with optional variables.

#### `detectUserLanguage(userId)`

Detect user's preferred language.

#### `setUserLanguage(userId, language)`

Set user's language preference.

#### `getSupportedLanguages()`

Get list of supported languages.

#### `validateTranslations()`

Validate translation completeness.

## 🔗 Dependencies

- `@fire22/language-keys` - Language key definitions

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

### Adding New Language Codes

1. Add code to `src/i18n/fire22-language-codes.json`
2. Add translations for all 4 languages
3. Update version and totalCodes
4. Run validation: `bun run validate`

## 📝 License

MIT © Fire22 Team

## 🔗 Related Packages

- [@fire22/telegram-bot](../fire22-telegram-bot) - Telegram bot using
  translations
- [@fire22/telegram-workflows](../fire22-telegram-workflows) - Multilingual
  workflows
- [@fire22/telegram-dashboard](../fire22-telegram-dashboard) - Dashboard with
  language support

## 📞 Support

For translation issues or new language requests, please open an issue on GitHub.
