# 🤖 @fire22/telegram-bot

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)
[![Bun](https://img.shields.io/badge/bun-%3E%3D1.2.20-f472b6.svg)](https://bun.sh)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)

Fire22 Telegram Bot with Grammy framework integration, providing comprehensive
bot functionality with multilingual support and P2P queue integration.

## 📦 Installation

```bash
bun add @fire22/telegram-bot
```

## 🚀 Features

- **Grammy Framework**: Modern, type-safe Telegram bot framework
- **Multilingual Support**: Integration with @fire22/multilingual for 4
  languages
- **Queue Integration**: P2P transaction matching via @fire22/queue-system
- **Environment Management**: Secure configuration with Zod validation
- **Constants System**: Centralized bot commands and configuration
- **Department Support**: 6 integrated departments with specific workflows

## 📖 Quick Start

```typescript
import { Fire22TelegramBot } from '@fire22/telegram-bot';
import { TelegramEnvironment } from '@fire22/telegram-bot/env';

// Initialize environment
const env = TelegramEnvironment.getInstance(process.env);

// Create bot instance
const bot = new Fire22TelegramBot({
  token: env.botToken,
  webhookUrl: env.webhookUrl,
  notificationSettings: {
    wagerUpdates: true,
    balanceChanges: true,
    systemAlerts: true,
    weeklyReports: true,
  },
});

// Start bot
await bot.start();
```

## 🔧 Configuration

### Environment Variables

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_WEBHOOK_URL=https://your-domain.com/webhook
TELEGRAM_WEBHOOK_SECRET=your_webhook_secret
FIRE22_API_URL=https://api.fire22.ag
FIRE22_API_KEY=your_api_key
```

### Bot Commands

- `/start` - Initialize bot interaction
- `/help` - Display help information
- `/language` - Switch language preference
- `/balance` - Check account balance
- `/wagers` - View active wagers
- `/support` - Access support system

## 📊 Constants

The bot includes a comprehensive constants system:

```typescript
import {
  BOT_COMMANDS,
  LANGUAGE_CODES,
  UI_ELEMENTS,
} from '@fire22/telegram-bot/constants';

// Access bot commands
console.log(BOT_COMMANDS.START); // '/start'

// Use language codes
console.log(LANGUAGE_CODES.WELCOME); // 'L-1500'

// UI elements
console.log(UI_ELEMENTS.EMOJIS.FIRE); // '🔥'
```

## 🧪 Testing

```bash
# Run all tests
bun test

# Run integration tests
bun test:integration

# Run benchmarks
bun run benchmark
```

## 📈 Performance

- **Response Time**: < 100ms average
- **Memory Usage**: < 50MB typical
- **Concurrent Users**: 10,000+ supported
- **Message Throughput**: 1000+ msg/sec

## 🔗 Dependencies

- `grammy` - Telegram bot framework
- `@fire22/api-client` - Fire22 API integration
- `@fire22/multilingual` - Language system
- `@fire22/queue-system` - P2P queue management

## 📄 API Reference

### Main Classes

#### `Fire22TelegramBot`

Main bot class handling all Telegram interactions.

#### `TelegramEnvironment`

Environment configuration and validation.

#### `TelegramConstants`

Centralized constants and configuration.

## 🤝 Contributing

See [CONTRIBUTING.md](../../CONTRIBUTING.md) for development guidelines.

## 📝 License

MIT © Fire22 Team

## 🔗 Related Packages

- [@fire22/multilingual](../fire22-multilingual) - Language system
- [@fire22/queue-system](../fire22-queue-system) - P2P matching
- [@fire22/telegram-workflows](../fire22-telegram-workflows) - Workflow
  orchestration
- [@fire22/telegram-dashboard](../fire22-telegram-dashboard) - Dashboard
  integration

## 📞 Support

For issues and questions, please open an issue on GitHub or contact the Fire22
support team.
