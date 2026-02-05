import db from "./database";
import { STATUS_COLORS } from "./constants/colors";

async function seed() {
  console.log(`${Bun.color(STATUS_COLORS.info)}Seeding database...${Bun.color('reset')}`);

  try {
    const merchant = await db.createMerchant({
      username: "test_merchant",
      displayName: "Test Merchant Store",
      email: "merchant@example.com",
      phone: "555-0199",
      isVerified: true,
      rating: 4.8,
      totalTransactions: 150,
      disputeRate: 0.02,
      venmoBusinessId: "v_biz_123",
      createdAt: new Date()
    });

    const customer = await db.createCustomer({
      username: "test_customer",
      email: "customer@example.com",
      phone: "555-0100",
      totalDisputes: 0,
      disputeWinRate: 0,
      createdAt: new Date()
    });

    const transaction = await db.createTransaction({
      venmoPaymentId: "PAY-12345",
      amount: 45.99,
      merchantId: merchant.id,
      merchantUsername: merchant.username,
      customerId: customer.id,
      items: [
        { id: "item_1", name: "Premium Widget", quantity: 1, unitPrice: 45.99, totalPrice: 45.99 }
      ],
      createdAt: new Date(),
      requiresDelivery: true,
      qrCodeData: "https://venmo.com/q/PAY-12345"
    });

    console.log(`${Bun.color(STATUS_COLORS.success)}Database seeded successfully!${Bun.color('reset')}`);
    console.log(`Merchant ID: ${merchant.id}`);
    console.log(`Customer ID: ${customer.id}`);
    console.log(`Transaction ID: ${transaction.id}`);
  } catch (error) {
    console.error(`${Bun.color(STATUS_COLORS.error)}Seeding failed:${Bun.color('reset')}`, error);
  } finally {
    db.close();
  }
}

seed();
