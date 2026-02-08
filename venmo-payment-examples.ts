/**
 * Venmo Payment Gateway - Usage Examples and Test Cases
 * Demonstrates practical implementation patterns for barbershop and service bookings
 */

import { 
  VenmoPaymentGateway, 
  VenmoConfig, 
  VenmoPaymentRequest, 
  createVenmoGateway,
  VenmoError
} from './venmo-payment-integration';

// Mock configuration for testing
const testConfig: VenmoConfig = {
  accessToken: 'test_access_token',
  merchantId: 'test_merchant_123',
  environment: 'sandbox',
  webhookSecret: 'test_webhook_secret',
  apiVersion: '2.0'
};

// Example 1: Basic Barbershop Payment
async function basicBarbershopPayment() {
  console.log('=== Basic Barbershop Payment ===');
  
  const gateway = createVenmoGateway(testConfig);
  
  try {
    const paymentRequest: VenmoPaymentRequest = {
      amount: 4500, // $45.00 in cents
      currency: 'USD',
      description: 'Haircut and Beard Trim',
      merchantNote: 'Premium services at Downtown Barbershop',
      privateTransaction: true, // Don't show in social feed
      metadata: {
        service_type: 'haircut_beard_trim',
        barber_id: 'barber_123',
        appointment_id: 'apt_456',
        duration_minutes: 45
      }
    };

    const payment = await gateway.createPayment(paymentRequest);
    console.log('✅ Payment created:', {
      paymentId: payment.paymentId,
      status: payment.status,
      amount: `$${(payment.amount / 100).toFixed(2)}`,
      private: payment.privateTransaction
    });

    // Generate QR code for in-person payment
    const qrCode = await gateway.generateQRCode(payment.paymentId);
    console.log('📱 QR Code generated:', {
      data: qrCode.data.substring(0, 20) + '...',
      expiresAt: qrCode.expiresAt
    });

    return payment;
  } catch (error) {
    console.error('❌ Payment failed:', error.message);
    throw error;
  }
}

// Example 2: Group Booking Split Payment
async function groupBookingSplitPayment() {
  console.log('\n=== Group Booking Split Payment ===');
  
  const gateway = createVenmoGateway(testConfig);
  
  try {
    const paymentRequest: VenmoPaymentRequest = {
      amount: 12000, // $120.00 total
      currency: 'USD',
      description: 'Group haircut session (4 people)',
      merchantNote: 'Group discount applied',
      privateTransaction: true,
      splitPayment: {
        enabled: true,
        participants: [
          {
            userId: 'venmo_user_1',
            amount: 3000, // $30.00 each
            note: 'John\'s haircut'
          },
          {
            userId: 'venmo_user_2',
            amount: 3000,
            note: 'Sarah\'s haircut'
          },
          {
            userId: 'venmo_user_3',
            amount: 3000,
            note: 'Mike\'s haircut + beard trim'
          },
          {
            userId: 'venmo_user_4',
            amount: 3000,
            note: 'Emma\'s haircut'
          }
        ]
      },
      metadata: {
        booking_type: 'group',
        total_participants: 4,
        discount_applied: true,
        original_amount: 14000, // $140.00 before discount
        discount_amount: 2000   // $20.00 discount
      }
    };

    const payment = await gateway.createPayment(paymentRequest);
    console.log('✅ Split payment created:', {
      paymentId: payment.paymentId,
      totalAmount: `$${(payment.amount / 100).toFixed(2)}`,
      participants: payment.splitDetails?.totalParticipants,
      completed: payment.splitDetails?.completedPayments,
      remaining: `$${((payment.splitDetails?.remainingAmount || 0) / 100).toFixed(2)}`
    });

    return payment;
  } catch (error) {
    console.error('❌ Split payment failed:', error.message);
    throw error;
  }
}

// Example 3: Payment Status Monitoring
async function monitorPaymentStatus(paymentId: string) {
  console.log('\n=== Payment Status Monitoring ===');
  
  const gateway = createVenmoGateway(testConfig);
  
  try {
    // Check initial status
    let payment = await gateway.getPaymentStatus(paymentId);
    console.log('📊 Initial status:', payment.status);

    // Simulate status polling (in real app, you'd use webhooks)
    const maxAttempts = 10;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      payment = await gateway.getPaymentStatus(paymentId);
      console.log(`📊 Check ${attempt}: ${payment.status}`);

      if (payment.status === 'completed') {
        console.log('✅ Payment completed successfully!');
        break;
      } else if (payment.status === 'failed' || payment.status === 'cancelled') {
        console.log('❌ Payment failed or cancelled');
        break;
      }
    }

    return payment;
  } catch (error) {
    console.error('❌ Status monitoring failed:', error.message);
    throw error;
  }
}

// Example 4: Payment History and Analytics
async function paymentAnalytics() {
  console.log('\n=== Payment Analytics ===');
  
  const gateway = createVenmoGateway(testConfig);
  
  try {
    // Get payment history for last 30 days
    const endDate = new Date().toISOString();
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const history = await gateway.getPaymentHistory({
      startDate,
      endDate,
      limit: 50,
      status: 'completed'
    });

    console.log('📈 Payment Analytics (Last 30 days):');
    console.log(`Total payments: ${history.total}`);
    console.log(`Retrieved: ${history.payments.length}`);

    // Calculate statistics
    const totalRevenue = history.payments.reduce((sum, payment) => sum + payment.amount, 0);
    const averagePayment = totalRevenue / history.payments.length;
    const privatePayments = history.payments.filter(p => p.privateTransaction).length;

    console.log(`Total revenue: $${(totalRevenue / 100).toFixed(2)}`);
    console.log(`Average payment: $${(averagePayment / 100).toFixed(2)}`);
    console.log(`Private payments: ${privatePayments}/${history.payments.length}`);

    // Show recent payments
    console.log('\nRecent payments:');
    history.payments.slice(0, 5).forEach((payment, index) => {
      console.log(`  ${index + 1}. $${(payment.amount / 100).toFixed(2)} - ${payment.description} (${payment.status})`);
    });

    return history;
  } catch (error) {
    console.error('❌ Analytics failed:', error.message);
    throw error;
  }
}

// Example 5: Refund Processing
async function processRefund(paymentId: string, refundAmount?: number) {
  console.log('\n=== Refund Processing ===');
  
  const gateway = createVenmoGateway(testConfig);
  
  try {
    // Get payment details first
    const payment = await gateway.getPaymentStatus(paymentId);
    console.log('💳 Original payment:', {
      id: payment.paymentId,
      amount: `$${(payment.amount / 100).toFixed(2)}`,
      status: payment.status
    });

    // Process refund (partial or full)
    const refund = await gateway.refundPayment(
      paymentId,
      refundAmount,
      refundAmount ? 'Partial refund for customer satisfaction' : 'Full refund - service cancelled'
    );

    console.log('✅ Refund processed:', refund);
    return refund;
  } catch (error) {
    console.error('❌ Refund failed:', error.message);
    throw error;
  }
}

// Example 6: Webhook Processing
async function processWebhookExample() {
  console.log('\n=== Webhook Processing ===');
  
  const gateway = createVenmoGateway(testConfig);
  
  // Simulate webhook payload
  const webhookPayload = JSON.stringify({
    type: 'payment.completed',
    data: {
      payment_id: 'payment_123456',
      user_id: 'venmo_user_789',
      amount: '45.00',
      currency: 'USD',
      completed_at: '2024-01-15T14:30:00Z'
    }
  });

  // Generate mock signature (in real app, this comes from Venmo)
  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', testConfig.webhookSecret!)
    .update(webhookPayload)
    .digest('hex');

  try {
    const result = await gateway.processWebhook(webhookPayload, signature);
    console.log('✅ Webhook processed:', result);
    
    // In a real application, you would:
    // 1. Update your database
    // 2. Send confirmation emails
    // 3. Update appointment status
    // 4. Trigger business logic
    
    return result;
  } catch (error) {
    console.error('❌ Webhook processing failed:', error.message);
    throw error;
  }
}

// Example 7: User Information Lookup
async function lookupUserInfo(userId: string) {
  console.log('\n=== User Information Lookup ===');
  
  const gateway = createVenmoGateway(testConfig);
  
  try {
    const user = await gateway.getUserInfo(userId);
    console.log('👤 User Information:', {
      userId: user.userId,
      username: user.username,
      displayName: user.displayName,
      isVerified: user.isVerified,
      accountType: user.accountType,
      hasProfilePicture: !!user.profilePicture
    });

    // Business logic based on user info
    if (user.isVerified) {
      console.log('✅ Verified user - eligible for premium services');
    }
    
    if (user.accountType === 'business') {
      console.log('🏢 Business account - apply corporate rates');
    }

    return user;
  } catch (error) {
    console.error('❌ User lookup failed:', error.message);
    throw error;
  }
}

// Example 8: Error Handling and Edge Cases
async function errorHandlingExamples() {
  console.log('\n=== Error Handling Examples ===');
  
  const gateway = createVenmoGateway(testConfig);
  
  // Test 1: Invalid payment amount
  try {
    await gateway.createPayment({
      amount: -1000, // Negative amount
      currency: 'USD',
      description: 'Invalid payment'
    });
  } catch (error) {
    console.log('✅ Caught invalid amount error:', error.message);
  }

  // Test 2: Invalid payment ID
  try {
    await gateway.getPaymentStatus('invalid_payment_id');
  } catch (error) {
    console.log('✅ Caught invalid payment ID error:', error.message);
  }

  // Test 3: Invalid webhook signature
  try {
    await gateway.processWebhook('invalid payload', 'invalid_signature');
  } catch (error) {
    console.log('✅ Caught invalid webhook signature error:', error.message);
  }

  // Test 4: Configuration validation
  try {
    createVenmoGateway({
      accessToken: '', // Missing
      merchantId: '', // Missing
      environment: 'sandbox',
      apiVersion: '2.0'
    });
  } catch (error) {
    console.log('✅ Caught configuration validation error:', error.message);
  }
}

// Example 9: Integration with Booking System
async function bookingSystemIntegration() {
  console.log('\n=== Booking System Integration ===');
  
  // Simulate a booking system integration
  class BookingSystem {
    private venmoGateway: VenmoPaymentGateway;

    constructor() {
      this.venmoGateway = createVenmoGateway(testConfig);
    }

    async createBookingWithPayment(bookingData: {
      customerId: string;
      serviceType: string;
      duration: number;
      price: number;
      isGroup?: boolean;
      participants?: string[];
    }) {
      console.log(`📅 Creating booking: ${bookingData.serviceType}`);

      try {
        // Create payment request
        const paymentRequest: VenmoPaymentRequest = {
          amount: bookingData.price * 100, // Convert to cents
          currency: 'USD',
          description: `${bookingData.serviceType} - ${bookingData.duration} minutes`,
          merchantNote: `Booking ID: ${this.generateBookingId()}`,
          privateTransaction: true,
          metadata: {
            booking_id: this.generateBookingId(),
            customer_id: bookingData.customerId,
            service_type: bookingData.serviceType,
            duration: bookingData.duration
          }
        };

        // Add split payment for group bookings
        if (bookingData.isGroup && bookingData.participants) {
          const amountPerPerson = Math.floor(bookingData.price * 100 / bookingData.participants.length);
          paymentRequest.splitPayment = {
            enabled: true,
            participants: bookingData.participants.map(participantId => ({
              userId: participantId,
              amount: amountPerPerson,
              note: `Share of ${bookingData.serviceType}`
            }))
          };
        }

        // Create payment
        const payment = await this.venmoGateway.createPayment(paymentRequest);
        
        console.log('✅ Booking and payment created:', {
          bookingId: paymentRequest.metadata?.booking_id,
          paymentId: payment.paymentId,
          amount: `$${(payment.amount / 100).toFixed(2)}`
        });

        return {
          bookingId: paymentRequest.metadata?.booking_id,
          paymentId: payment.paymentId,
          status: 'pending_payment'
        };
      } catch (error) {
        console.error('❌ Booking creation failed:', error.message);
        throw error;
      }
    }

    private generateBookingId(): string {
      return `BK${Date.now()}${Math.random().toString(36).substr(2, 5)}`;
    }
  }

  // Test the integration
  const bookingSystem = new BookingSystem();
  
  // Individual booking
  const individualBooking = await bookingSystem.createBookingWithPayment({
    customerId: 'customer_123',
    serviceType: 'Premium Haircut',
    duration: 45,
    price: 65
  });

  // Group booking
  const groupBooking = await bookingSystem.createBookingWithPayment({
    customerId: 'customer_456',
    serviceType: 'Group Styling Session',
    duration: 120,
    price: 200,
    isGroup: true,
    participants: ['venmo_user_1', 'venmo_user_2', 'venmo_user_3', 'venmo_user_4']
  });

  return { individualBooking, groupBooking };
}

// Example 10: Production Deployment Patterns
async function productionPatterns() {
  console.log('\n=== Production Deployment Patterns ===');
  
  // Environment-specific configuration
  function getProductionConfig(): VenmoConfig {
    const config: VenmoConfig = {
      accessToken: process.env.VENMO_ACCESS_TOKEN!,
      merchantId: process.env.VENMO_MERCHANT_ID!,
      environment: process.env.NODE_ENV === 'production' ? 'production' : 'sandbox',
      webhookSecret: process.env.VENMO_WEBHOOK_SECRET,
      apiVersion: '2.0'
    };

    // Validate required environment variables
    const required = ['VENMO_ACCESS_TOKEN', 'VENMO_MERCHANT_ID'];
    const missing = required.filter(key => !process.env[key]);
    
    if (missing.length > 0) {
      throw new VenmoError(`Missing required environment variables: ${missing.join(', ')}`);
    }

    return config;
  }

  // Retry logic for network issues
  async function withRetry<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    delay: number = 1000
  ): Promise<T> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        if (attempt === maxRetries) {
          throw error;
        }
        
        console.log(`⚠️ Attempt ${attempt} failed, retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff
      }
    }
    
    throw new Error('Max retries exceeded');
  }

  // Payment processing with monitoring
  class ProductionPaymentProcessor {
    private gateway: VenmoPaymentGateway;

    constructor() {
      this.gateway = createVenmoGateway(getProductionConfig());
    }

    async processPaymentWithMonitoring(request: VenmoPaymentRequest) {
      const startTime = Date.now();
      
      try {
        console.log('🚀 Processing payment with monitoring...');
        
        const payment = await withRetry(() => 
          this.gateway.createPayment(request)
        );
        
        const processingTime = Date.now() - startTime;
        console.log(`✅ Payment processed in ${processingTime}ms`);
        
        // Log metrics (in production, send to your monitoring system)
        this.logMetrics({
          event: 'payment_created',
          paymentId: payment.paymentId,
          amount: payment.amount,
          processingTime,
          success: true
        });

        return payment;
      } catch (error) {
        const processingTime = Date.now() - startTime;
        console.error(`❌ Payment failed after ${processingTime}ms:`, error.message);
        
        // Log error metrics
        this.logMetrics({
          event: 'payment_failed',
          amount: request.amount,
          processingTime,
          success: false,
          error: error.message
        });
        
        throw error;
      }
    }

    private logMetrics(metrics: any) {
      // In production, send to Datadog, New Relic, etc.
      console.log('📊 Metrics:', metrics);
    }
  }

  // Test production patterns
  try {
    const processor = new ProductionPaymentProcessor();
    const testPayment = await processor.processPaymentWithMonitoring({
      amount: 5000,
      currency: 'USD',
      description: 'Production test payment',
      privateTransaction: true
    });
    
    console.log('✅ Production patterns test successful');
  } catch (error) {
    console.log('⚠️ Production patterns test (expected in sandbox):', error.message);
  }
}

// Main execution function
async function runAllExamples() {
  console.log('🚀 Starting Venmo Payment Gateway Examples\n');
  
  try {
    // Run all examples
    await basicBarbershopPayment();
    await groupBookingSplitPayment();
    await paymentAnalytics();
    await processWebhookExample();
    await errorHandlingExamples();
    await bookingSystemIntegration();
    await productionPatterns();
    
    console.log('\n✅ All examples completed successfully!');
  } catch (error) {
    console.error('\n❌ Example execution failed:', error.message);
  }
}

// Export for individual testing
export {
  basicBarbershopPayment,
  groupBookingSplitPayment,
  monitorPaymentStatus,
  paymentAnalytics,
  processRefund,
  processWebhookExample,
  lookupUserInfo,
  errorHandlingExamples,
  bookingSystemIntegration,
  productionPatterns,
  runAllExamples
};

// Run if executed directly
if (require.main === module) {
  runAllExamples().catch(console.error);
}
