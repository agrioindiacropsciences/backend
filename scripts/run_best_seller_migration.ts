/**
 * Run best_seller_rank migration manually.
 * Usage: npm run db:migrate:best-seller
 * Uses same DB config as app (DATABASE_URL or DB_* vars from .env).
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env') });

// Build DATABASE_URL from DB_* if not set (matches src/lib/prisma.ts)
if (!process.env.DATABASE_URL && process.env.DB_HOST) {
  const d = process.env;
  const ssl = d.DB_SSL === 'false' ? 'disable' : 'require';
  process.env.DATABASE_URL = `${d.DB_DIALECT || 'postgres'}://${encodeURIComponent(d.DB_USER!)}:${encodeURIComponent(d.DB_PASS!)}@${d.DB_HOST}:${d.DB_PORT || '5432'}/${d.DB_NAME}?sslmode=${ssl}`;
}

import { prisma } from '../src/lib/prisma';

async function main() {
  if (!process.env.DATABASE_URL) {
    console.error('DATABASE_URL not found. Set DATABASE_URL or DB_HOST, DB_NAME, DB_USER, DB_PASS in .env');
    process.exit(1);
  }
  console.log('Running best_seller_rank migration...');
  
  await prisma.$executeRawUnsafe(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS best_seller_rank INTEGER NULL;
  `);
  
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS idx_products_best_seller_rank 
    ON products(best_seller_rank) WHERE best_seller_rank IS NOT NULL;
  `);
  
  console.log('✅ Migration completed successfully.');
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
