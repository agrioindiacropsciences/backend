-- Migration: Add best_seller_rank column to products table
-- Created: 2026-02-03

-- Add best_seller_rank column (nullable integer)
ALTER TABLE products ADD COLUMN IF NOT EXISTS best_seller_rank INTEGER NULL;

-- Create index for faster sorting (only indexes non-null values)
CREATE INDEX IF NOT EXISTS idx_products_best_seller_rank ON products(best_seller_rank) WHERE best_seller_rank IS NOT NULL;

-- Optional: Set default rank for existing best sellers (uncomment if needed)
-- UPDATE products 
-- SET best_seller_rank = ROW_NUMBER() OVER (ORDER BY sales_count DESC)
-- WHERE is_best_seller = true AND best_seller_rank IS NULL;
