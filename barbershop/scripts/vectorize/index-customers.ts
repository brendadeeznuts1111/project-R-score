#!/usr/bin/env bun
/**
 * Migration script to index existing customers in Vectorize
 * Run this after setting up Vectorize indexes
 */

import { Database } from 'bun:sqlite';
import { vectorizeClient } from '../../src/core/vectorize-client';

const DB_PATH = process.env.DB_PATH || './barbershop.db';

async function indexCustomers() {
  console.log('🔍 Indexing customers in Vectorize...\n');

  // Check if Vectorize is available
  const available = await vectorizeClient.isAvailable();
  if (!available) {
    console.error('❌ Vectorize is not available. Please:');
    console.error('   1. Deploy the Cloudflare Worker: bunx wrangler deploy');
    console.error('   2. Set VECTORIZE_WORKER_URL environment variable');
    console.error('   3. Set VECTORIZE_ENABLED=true');
    process.exit(1);
  }

  // Connect to database
  const db = new Database(DB_PATH);
  
  try {
    // Get all customers
    const customers = db.query(`
      SELECT id, name, tier, preferredBarber, homeShop, address, zipcode 
      FROM customers
    `).all() as Array<{
      id: string;
      name: string;
      tier: string | null;
      preferredBarber: string | null;
      homeShop: string | null;
      address: string | null;
      zipcode: string | null;
    }>;

    console.log(`Found ${customers.length} customers to index\n`);

    if (customers.length === 0) {
      console.log('No customers to index.');
      return;
    }

    // Index each customer
    let successCount = 0;
    let errorCount = 0;

    for (const customer of customers) {
      try {
        await vectorizeClient.indexCustomer({
          id: customer.id,
          name: customer.name,
          tier: customer.tier || undefined,
          preferredBarber: customer.preferredBarber || undefined,
          homeShop: customer.homeShop || undefined,
          address: customer.address || undefined,
          zipcode: customer.zipcode || undefined,
        });

        successCount++;
        console.log(`✅ Indexed: ${customer.name} (${customer.id})`);
      } catch (error: any) {
        errorCount++;
        console.error(`❌ Failed to index ${customer.name}:`, error.message);
      }
    }

    console.log(`\n📊 Summary:`);
    console.log(`   ✅ Successfully indexed: ${successCount}`);
    console.log(`   ❌ Failed: ${errorCount}`);
    console.log(`   📦 Total: ${customers.length}`);

    if (successCount > 0) {
      console.log(`\n✨ Customer indexing complete!`);
    }
  } catch (error: any) {
    console.error('❌ Error indexing customers:', error);
    process.exit(1);
  } finally {
    db.close();
  }
}

// Run if executed directly
if (import.meta.main) {
  indexCustomers().catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}
