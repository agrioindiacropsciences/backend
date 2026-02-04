/**
 * One-time script to fix duplicate best_seller_rank values in the database.
 * Run: npx ts-node scripts/fix_best_seller_ranks.ts
 */
import prisma from '../src/lib/prisma';

async function fixBestSellerRanks() {
  console.log('Fetching best seller products...');
  const products = await prisma.product.findMany({
    where: { isBestSeller: true },
    orderBy: [{ bestSellerRank: 'asc' }, { createdAt: 'asc' }],
    select: { id: true, name: true, bestSellerRank: true },
  });

  if (products.length === 0) {
    console.log('No best seller products found.');
    return;
  }

  const rankCounts = new Map<number, number>();
  products.forEach((p) => {
    const r = (p.bestSellerRank as number) || 0;
    rankCounts.set(r, (rankCounts.get(r) || 0) + 1);
  });

  const duplicates = [...rankCounts.entries()].filter(([, count]) => count > 1);
  if (duplicates.length === 0) {
    console.log('No duplicate ranks found. All good!');
    return;
  }

  console.log(`Found duplicate ranks: ${duplicates.map(([r, c]) => `Rank ${r}: ${c} products`).join(', ')}`);
  console.log('Reassigning unique ranks...');

  let nextRank = 1;
  for (const product of products) {
    await prisma.product.update({
      where: { id: product.id },
      data: { bestSellerRank: nextRank },
    });
    console.log(`  ${product.name}: Rank #${nextRank}`);
    nextRank++;
  }

  console.log('Done! All best seller ranks are now unique.');
}

fixBestSellerRanks()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
