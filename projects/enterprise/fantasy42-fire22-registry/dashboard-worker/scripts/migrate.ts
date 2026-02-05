import { drizzle } from 'drizzle-orm/d1';
import { migrate } from 'drizzle-orm/d1/migrator';
import * as schema from '../src/db/schema';

// This is a placeholder for the Cloudflare D1 database binding.
// In a real Cloudflare Worker environment, 'env.DB' would be automatically available.
// For local development/testing, you might need to mock or provide a D1 database instance.
declare const env: {
  DB: D1Database;
};

async function main() {
  try {
    const db = drizzle(env.DB, { schema });

    console.log('Running migrations...');
    await migrate(db, { migrationsFolder: './drizzle' });
    console.log('Migrations applied successfully!');
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

main();
