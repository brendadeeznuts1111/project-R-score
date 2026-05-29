#!/usr/bin/env bun
/**
 * Migration script to index existing barbers in Vectorize
 * Run this after setting up Vectorize indexes
 */

import { Database } from 'bun:sqlite';
import { vectorizeClient } from '../../src/core/vectorize-client';

const DB_PATH = process.env.DB_PATH || './barbershop.db';

async function indexBarbers() {
  console.info('🔍 Indexing barbers in Vectorize...\n');

  // Check if Vectorize is available
  const available = await vectorizeClient.isAvailable();
  if (!available) {
    console.error('❌ Vectorize is not available. Please:');
    console.error('   1. Deploy the Cloudflare Worker: npx wrangler deploy');
    console.error('   2. Set VECTORIZE_WORKER_URL environment variable');
    console.error('   3. Set VECTORIZE_ENABLED=true');
    process.exit(1);
  }

  // Connect to database
  const db = new Database(DB_PATH);
  
  try {
    // Get all barbers
    const barbers = db.query('SELECT id, name, skills, status FROM barbers').all() as Array<{
      id: string;
      name: string;
      skills: string | null;
      status: string;
    }>;

    console.info(`Found ${barbers.length} barbers to index\n`);

    if (barbers.length === 0) {
      console.info('No barbers to index.');
      return;
    }

    // Index each barber
    let successCount = 0;
    let errorCount = 0;

    for (const barber of barbers) {
      try {
        const skills = barber.skills ? barber.skills.split(',').map(s => s.trim()).filter(Boolean) : [];
        
        if (skills.length === 0) {
          console.info(`⚠️  Skipping ${barber.name} (no skills)`);
          continue;
        }

        console.info(`Indexing ${barber.name} (${skills.length} skills)...`);

        const result = await vectorizeClient.indexBarber({
          id: barber.id,
          name: barber.name,
          skills,
          status: barber.status,
        });

        console.info(`  ✅ Indexed (mutationId: ${result.mutationId})`);
        successCount++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error: any) {
        console.error(`  ❌ Failed to index ${barber.name}: ${error.message}`);
        errorCount++;
      }
    }

    console.info('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.info(`✅ Successfully indexed: ${successCount}`);
    console.info(`❌ Failed: ${errorCount}`);
    console.info('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (successCount > 0) {
      console.info('Note: V2 mutations are async. Vectors may take a few seconds to be queryable.');
      console.info('Check mutation status with: npx wrangler vectorize describe barbershop-barbers-index\n');
    }
  } finally {
    db.close();
  }
}

// Run migration
indexBarbers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
