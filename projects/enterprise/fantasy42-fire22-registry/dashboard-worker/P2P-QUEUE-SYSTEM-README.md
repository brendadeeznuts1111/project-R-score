# 🔥 Fire22 P2P Queue System

A comprehensive peer-to-peer transaction queuing system with Telegram
integration for the Fire22 platform.

## 🚀 Features

### Core P2P Functionality

- **Dual Queue Management**: Separate queues for withdrawals and deposits
- **Smart Matching Algorithm**: Automatic matching based on payment type,
  amount, and priority
- **Real-time Status Tracking**: Monitor transaction status from pending to
  completed
- **Priority System**: Configurable priority levels for urgent transactions

### Telegram Integration

- **Multi-Channel Support**: Works with Telegram groups, chats, and channels
- **Real-time Notifications**: Instant updates on queue changes and matches
- **User Session Management**: Maintains state for interactive operations
- **Secure Access Control**: Configurable allowed groups and channels

### Advanced Features

- **Filtering & Search**: Find transactions by payment type, amount, Telegram
  group, etc.
- **Export Capabilities**: Download queue data in JSON format
- **Auto-Matching**: Intelligent algorithm for optimal transaction pairing
- **Audit Trail**: Complete history of all operations and changes

## 📁 File Structure

```
dashboard-worker/
├── p2p-queue-system.html          # Main P2P queue interface
├── src/
│   └── p2p-queue-api.ts          # Backend API implementation
├── p2p-telegram-schema.sql       # Database schema for Telegram integration
└── P2P-QUEUE-SYSTEM-README.md    # This documentation
```

## 🗄️ Database Schema

### Core Tables

- `queue_items`: Main queue storage for withdrawals and deposits
- `queue_matches`: Records of successful P2P matches
- `queue_history`: Audit trail of all queue operations
- `queue_metrics`: Performance and statistics data

### Telegram Integration Tables

- `telegram_data`: Links queue items to Telegram entities
- `telegram_notifications`: Log of all sent notifications
- `telegram_bot_config`: Bot configuration and settings
- `telegram_user_sessions`: User session management

## 🚀 Quick Start

### 1. Setup Database

```bash
# Run the queue schema
bun run sqlite3 database.db < queue-schema.sql

# Run the Telegram integration schema
bun run sqlite3 database.db < p2p-telegram-schema.sql
```

### 2. Configure Telegram Bot

```sql
-- Update bot configuration
UPDATE telegram_bot_config SET
  bot_token = 'YOUR_ACTUAL_BOT_TOKEN',
  allowed_groups = '["YOUR_GROUP_ID"]',
  allowed_channels = '["YOUR_CHANNEL_ID"]'
WHERE id = 1;
```

### 3. Open the Interface

Open `p2p-queue-system.html` in your browser to access the P2P queue management
interface.

## 📱 Interface Overview

### Header Section

- **Queue Status**: Total items in queue
- **Matched Pairs**: Number of successful matches
- **Success Rate**: Overall system performance

### Filter Controls

- **Payment Type**: Filter by bank transfer, crypto, PayPal, etc.
- **Amount Range**: Set minimum and maximum amounts
- **Telegram Group**: Filter by specific Telegram group ID
- **Status**: Filter by transaction status

### Queue Views

- **Withdrawals Queue**: Red-bordered cards showing withdrawal requests
- **Deposits Queue**: Green-bordered cards showing deposit requests
- **Matching Opportunities**: Blue-bordered cards showing potential matches

### Action Buttons

- **View**: See detailed transaction information
- **Edit**: Modify transaction details and notes
- **Cancel**: Cancel pending transactions
- **Notify**: Send Telegram notifications
- **Approve/Reject**: Manage P2P matches

## 🔧 API Endpoints

### Queue Management

```typescript
// Add withdrawal to queue
POST /api/p2p/withdrawal
{
  "customerId": "CUST001",
  "amount": 500,
  "paymentType": "bank_transfer",
  "telegramGroupId": "TG_GROUP_001",
  "telegramChatId": "CHAT_001",
  "telegramChannel": "CHANNEL_MAIN",
  "telegramUsername": "@user1"
}

// Add deposit to queue
POST /api/p2p/deposit
{
  "customerId": "CUST002",
  "amount": 800,
  "paymentType": "crypto",
  "telegramGroupId": "TG_GROUP_002"
}

// Get queue items with filters
GET /api/p2p/queue?paymentType=crypto&minAmount=100&telegramGroupId=TG_GROUP_001
```

### Match Management

```typescript
// Get matching opportunities
GET /api/p2p/matches

// Approve a match
POST /api/p2p/matches/{matchId}/approve

// Reject a match
POST /api/p2p/matches/{matchId}/reject
{
  "reason": "Amount mismatch"
}
```

### Statistics

```typescript
// Get queue statistics
GET /api/p2p/stats

// Response includes:
{
  "totalItems": 25,
  "pendingWithdrawals": 12,
  "pendingDeposits": 8,
  "matchedPairs": 5,
  "averageWaitTime": 45.2,
  "successRate": 95
}
```

## 🧠 Matching Algorithm

### Scoring System

1. **Payment Type Match**: +20 points for exact payment type match
2. **Amount Compatibility**:
   - Perfect match (< $10 difference): +30 points
   - Close match (< $50 difference): +20 points
   - Acceptable match (< $100 difference): +10 points
3. **Withdrawal ≤ Deposit**: +25 points for valid amount relationship
4. **Wait Time Priority**: Older items get slight boost

### Matching Process

1. New item added to queue
2. Immediate matching attempt with existing items
3. If matched, status changes to 'matched'
4. Processing begins automatically
5. Completion updates all related records

## 📱 Telegram Integration

### Notification Types

- **Item Added**: New withdrawal/deposit in queue
- **Match Approved**: P2P transaction approved
- **Status Update**: Transaction status changed
- **Match Rejected**: P2P match rejected with reason
- **Item Cancelled**: Transaction cancelled

### Message Format

```
🔄 New Withdrawal Added
💰 Amount: $500
💳 Payment: Bank Transfer
👤 Customer: CUST001
📱 Group: TG_GROUP_001
⏰ Time: 2024-01-15 14:30:00
```

### Security Features

- **Allowed Groups**: Only configured groups receive notifications
- **Session Management**: User sessions expire after inactivity
- **Audit Trail**: Complete log of all notifications sent
- **Rate Limiting**: Prevents notification spam

## 🎯 Use Cases

### Customer Service

- Monitor withdrawal requests in real-time
- Match deposits with pending withdrawals
- Send instant notifications to customers
- Track transaction progress

### Risk Management

- Identify high-value transactions
- Monitor payment type patterns
- Track processing times
- Flag suspicious activity

### Business Intelligence

- Analyze queue performance metrics
- Track success rates by payment type
- Monitor customer behavior patterns
- Generate operational reports

## 🔒 Security Considerations

### Data Protection

- All sensitive data encrypted at rest
- Secure API endpoints with authentication
- Audit logging for all operations
- Rate limiting to prevent abuse

### Access Control

- Role-based permissions for different user types
- Telegram group/channel whitelisting
- Session timeout and automatic logout
- IP-based access restrictions (configurable)

## 🚨 Troubleshooting

### Common Issues

#### Queue Items Not Matching

- Check payment type compatibility
- Verify amount relationships (withdrawal ≤ deposit)
- Ensure items are in 'pending' status
- Review matching algorithm parameters

#### Telegram Notifications Not Sending

- Verify bot token is valid
- Check allowed groups/channels configuration
- Ensure notification settings are enabled
- Review error logs for specific issues

#### Performance Issues

- Check database indexes are properly created
- Monitor queue size and processing times
- Review auto-refresh intervals
- Optimize database queries if needed

### Debug Mode

Enable debug logging by setting environment variable:

```bash
export P2P_DEBUG=true
```

## 📈 Performance Metrics

### Target Benchmarks

- **Queue Processing**: < 100ms per item
- **Matching Algorithm**: < 50ms per match attempt
- **Telegram Notifications**: < 200ms delivery time
- **Database Queries**: < 10ms average response time

### Monitoring

- Real-time queue statistics
- Processing time tracking
- Success rate monitoring
- Error rate tracking

## 🔄 Updates and Maintenance

### Regular Tasks

- **Daily**: Review failed matches and resolve issues
- **Weekly**: Analyze performance metrics and optimize
- **Monthly**: Review and update Telegram bot configuration
- **Quarterly**: Audit security settings and access controls

### Backup and Recovery

- Database backups before schema changes
- Configuration file versioning
- Disaster recovery procedures
- Data export capabilities

## 🤝 Contributing

### Development Setup

1. Clone the repository
2. Install dependencies: `bun install`
3. Set up database: `bun run setup:db`
4. Configure environment variables
5. Start development server: `bun run dev`

### Code Standards

- TypeScript for type safety
- ESLint for code quality
- Prettier for formatting
- Comprehensive testing coverage

## 📞 Support

### Documentation

- This README file
- Inline code comments
- API documentation
- Database schema documentation

### Contact

- **Development Team**: dev@fire22.com
- **Technical Support**: support@fire22.com
- **Emergency Issues**: emergency@fire22.com

### Issue Reporting

- Use GitHub Issues for bug reports
- Include detailed error messages
- Provide reproduction steps
- Attach relevant log files

---

**Version**: 1.0.0  
**Last Updated**: 2024-01-15  
**Maintainer**: Fire22 Development Team
