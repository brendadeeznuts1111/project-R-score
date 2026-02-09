# Venmo Payment Gateway Integration

Complete Venmo payment processing solution for barbershops and service-based businesses with private transactions, split payments, QR codes, and instant transfers.

## 🚀 Features

### 💳 Core Payment Processing
- **Private Transactions** - Disable social feed posting for customer privacy
- **Instant Transfers** - Real-time payment processing and confirmation
- **QR Code Generation** - In-person payment scanning with mobile devices
- **Multi-currency Support** - USD, EUR, GBP with automatic conversion
- **Refund Processing** - Full and partial refunds with reason tracking

### 🔄 Split Payments
- **Group Bookings** - Split payments among multiple participants
- **Flexible Distribution** - Custom amount allocation per participant
- **Progress Tracking** - Monitor individual payment completion
- **Automatic Reminders** - Notify participants of pending payments

### 📱 Advanced Features
- **Webhook Integration** - Real-time payment status updates
- **User Information** - Retrieve Venmo user profiles and verification status
- **Payment History** - Comprehensive transaction analytics and reporting
- **Error Handling** - Robust error recovery and retry mechanisms
- **Security** - Webhook signature validation and secure API communication

## 📋 Requirements

- Node.js 18+ or Bun runtime
- Venmo Business Account
- Venmo API credentials (access token and merchant ID)
- Webhook endpoint for production deployments

## 🔧 Installation

### 1. Environment Configuration

Set the following environment variables:

```bash
# Required
VENMO_ACCESS_TOKEN=your_venmo_access_token
VENMO_MERCHANT_ID=your_merchant_id

# Optional but recommended
VENMO_WEBHOOK_SECRET=your_webhook_secret
VENMO_ENVIRONMENT=sandbox  # or 'production'
```

### 2. Install Dependencies

```bash
npm install @types/node crypto
# or with Bun
bun install
```

### 3. Manifest Configuration

Add to your `manifest.toml`:

```toml
[venmo]
access_token = "${VENMO_ACCESS_TOKEN}"
merchant_id = "${VENMO_MERCHANT_ID}"
environment = "sandbox"
webhook_secret = "${VENMO_WEBHOOK_SECRET}"
private_transactions = true
max_split_participants = 10
```

## 🎯 Quick Start

### Basic Payment

```typescript
import { createVenmoGateway, VenmoPaymentRequest } from './venmo-payment-integration';

const gateway = createVenmoGateway({
  accessToken: process.env.VENMO_ACCESS_TOKEN!,
  merchantId: process.env.VENMO_MERCHANT_ID!,
  environment: 'sandbox'
});

const paymentRequest: VenmoPaymentRequest = {
  amount: 4500, // $45.00 in cents
  currency: 'USD',
  description: 'Haircut and Beard Trim',
  privateTransaction: true,
  merchantNote: 'Premium services'
};

const payment = await gateway.createPayment(paymentRequest);
console.log('Payment created:', payment.paymentId);
```

### Split Payment for Groups

```typescript
const splitPaymentRequest: VenmoPaymentRequest = {
  amount: 12000, // $120.00 total
  currency: 'USD',
  description: 'Group haircut session (4 people)',
  privateTransaction: true,
  splitPayment: {
    enabled: true,
    participants: [
      { userId: 'venmo_user_1', amount: 3000, note: 'John\'s haircut' },
      { userId: 'venmo_user_2', amount: 3000, note: 'Sarah\'s haircut' },
      { userId: 'venmo_user_3', amount: 3000, note: 'Mike\'s haircut' },
      { userId: 'venmo_user_4', amount: 3000, note: 'Emma\'s haircut' }
    ]
  }
};

const splitPayment = await gateway.createPayment(splitPaymentRequest);
```

### QR Code Generation

```typescript
const qrCode = await gateway.generateQRCode(payment.paymentId);
// Display qrCode.data as a QR code for in-person scanning
console.log('QR expires at:', qrCode.expiresAt);
```

## 🔌 Webhook Integration

### Webhook Endpoint

```typescript
import { createVenmoGateway } from './venmo-payment-integration';

const gateway = createVenmoGateway(config);

app.post('/webhooks/venmo', async (req, res) => {
  try {
    const signature = req.headers['venmo-signature'] as string;
    const result = await gateway.processWebhook(req.body, signature);
    
    // Handle webhook events
    switch (result.event) {
      case 'payment.completed':
        await updateOrderStatus(result.paymentId, 'paid');
        await sendConfirmationEmail(result.customerId);
        break;
      case 'payment.failed':
        await notifyFailedPayment(result.paymentId);
        break;
    }
    
    res.json({ status: 'processed' });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Invalid webhook' });
  }
});
```

### Webhook Events

- `payment.completed` - Payment successfully processed
- `payment.failed` - Payment failed or was declined
- `payment.cancelled` - Payment was cancelled by user

## 📊 Analytics and Reporting

### Payment History

```typescript
const history = await gateway.getPaymentHistory({
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  status: 'completed',
  limit: 100
});

console.log(`Total revenue: $${history.payments.reduce((sum, p) => sum + p.amount, 0) / 100}`);
```

### User Information

```typescript
const user = await gateway.getUserInfo('venmo_user_id');
console.log(`User: ${user.displayName} (@${user.username})`);
console.log(`Verified: ${user.isVerified}`);
console.log(`Account type: ${user.accountType}`);
```

## 🛠️ Advanced Usage

### Error Handling

```typescript
import { VenmoError } from './venmo-payment-integration';

try {
  const payment = await gateway.createPayment(paymentRequest);
} catch (error) {
  if (error instanceof VenmoError) {
    console.error('Venmo error:', error.code, error.message);
    // Handle specific error codes
    switch (error.code) {
      case 'INSUFFICIENT_FUNDS':
        // Handle insufficient funds
        break;
      case 'INVALID_USER':
        // Handle invalid Venmo user
        break;
    }
  }
}
```

### Retry Logic

```typescript
async function createPaymentWithRetry(request: VenmoPaymentRequest, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await gateway.createPayment(request);
    } catch (error) {
      if (attempt === maxRetries) throw error;
      
      // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
    }
  }
}
```

### Refund Processing

```typescript
// Full refund
await gateway.refundPayment(paymentId, undefined, 'Customer requested refund');

// Partial refund
await gateway.refundPayment(paymentId, 2000, 'Partial refund for service adjustment');
```

## 🔒 Security Best Practices

### 1. Environment Variables
Never commit credentials to version control. Use environment variables:

```bash
# .env file (not committed)
VENMO_ACCESS_TOKEN=sk_live_xxxx
VENMO_MERCHANT_ID=merchant_xxxx
VENMO_WEBHOOK_SECRET=whsec_xxxx
```

### 2. Webhook Security
Always verify webhook signatures:

```typescript
const gateway = createVenmoGateway({
  // ... other config
  webhookSecret: process.env.VENMO_WEBHOOK_SECRET!
});

// This will throw an error if signature is invalid
await gateway.processWebhook(payload, signature);
```

### 3. Input Validation
Validate all payment amounts and user inputs:

```typescript
function validatePaymentRequest(request: VenmoPaymentRequest) {
  if (request.amount <= 0) {
    throw new Error('Payment amount must be positive');
  }
  
  if (request.amount > 1000000) { // $10,000 limit
    throw new Error('Payment amount exceeds maximum limit');
  }
  
  // Add more validation as needed
}
```

## 🧪 Testing

### Running Examples

```bash
# Run all examples
bun run venmo-payment-examples.ts

# Run specific examples
bun -e "import { basicBarbershopPayment } from './venmo-payment-examples.ts'; basicBarbershopPayment();"
```

### Test Configuration

Use sandbox environment for testing:

```typescript
const testConfig: VenmoConfig = {
  accessToken: 'test_token',
  merchantId: 'test_merchant',
  environment: 'sandbox',
  apiVersion: '2.0'
};
```

## 📈 Monitoring and Analytics

### Key Metrics to Track

1. **Payment Success Rate** - Percentage of successful payments
2. **Average Transaction Value** - Mean payment amount
3. **Split Payment Usage** - Frequency of split payments
4. **QR Code Usage** - How often QR codes are generated and used
5. **Refund Rate** - Percentage of payments that are refunded
6. **Processing Time** - Average time from request to completion

### Example Analytics Implementation

```typescript
class PaymentAnalytics {
  async trackPaymentCreated(payment: VenmoPaymentResponse) {
    // Send to your analytics service
    await this.track('payment_created', {
      amount: payment.amount,
      currency: payment.currency,
      isSplit: !!payment.splitDetails,
      isPrivate: payment.privateTransaction
    });
  }
  
  async trackPaymentCompleted(payment: VenmoPaymentResponse) {
    await this.track('payment_completed', {
      paymentId: payment.paymentId,
      processingTime: this.calculateProcessingTime(payment)
    });
  }
}
```

## 🚀 Deployment

### Production Checklist

- [ ] Use production Venmo API credentials
- [ ] Set up webhook endpoint with SSL
- [ ] Configure proper error logging
- [ ] Set up monitoring and alerting
- [ ] Test refund functionality
- [ ] Verify rate limiting is working
- [ ] Test split payment scenarios
- [ ] Validate webhook signature verification

### Environment Variables

```bash
# Production
VENMO_ACCESS_TOKEN=sk_live_xxxx
VENMO_MERCHANT_ID=merchant_live_xxxx
VENMO_ENVIRONMENT=production
VENMO_WEBHOOK_SECRET=whsec_live_xxxx

# Monitoring
LOG_LEVEL=info
ENABLE_ANALYTICS=true
```

## 🔧 Configuration Reference

### VenmoConfig Interface

```typescript
interface VenmoConfig {
  accessToken: string;        // Venmo API access token
  merchantId: string;         // Your merchant ID
  environment: 'sandbox' | 'production';
  webhookSecret?: string;     // Webhook signature secret
  apiVersion: string;         // API version (default: '2.0')
}
```

### VenmoPaymentRequest Interface

```typescript
interface VenmoPaymentRequest {
  amount: number;                    // Amount in cents
  currency: string;                  // Currency code (USD, EUR, etc.)
  description: string;                // Payment description
  merchantNote?: string;             // Internal note
  privateTransaction?: boolean;      // Hide from social feed
  splitPayment?: {                   // Split payment configuration
    enabled: boolean;
    participants: Array<{
      userId: string;
      amount: number;
      note?: string;
    }>;
  };
  metadata?: Record<string, any>;    // Additional metadata
}
```

## 🆘 Troubleshooting

### Common Issues

1. **Invalid Access Token**
   - Verify token is correct and not expired
   - Check if token has required permissions

2. **Webhook Signature Verification Failed**
   - Ensure webhook secret matches Venmo dashboard
   - Check if request body is modified

3. **Split Payment Not Working**
   - Verify all participant Venmo IDs are valid
   - Check if amounts sum to total

4. **QR Code Not Scanning**
   - Ensure QR code data is properly encoded
   - Check if QR code has expired

### Error Codes

- `INVALID_TOKEN` - Access token is invalid or expired
- `INSUFFICIENT_FUNDS` - User has insufficient funds
- `INVALID_USER` - Specified Venmo user ID is invalid
- `RATE_LIMITED` - API rate limit exceeded
- `PAYMENT_DECLINED` - Payment was declined

## 📞 Support

For Venmo API support:
- [Venmo Developer Documentation](https://venmo.com/developers)
- [Venmo Business Support](https://venmo.com/business/support)

For integration support:
- Check the examples in `venmo-payment-examples.ts`
- Review the configuration in `venmo-config-example.toml`
- Test with the provided test suite

## 📄 License

MIT License - see LICENSE file for details.
