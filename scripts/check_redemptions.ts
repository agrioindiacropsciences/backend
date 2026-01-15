import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = '3e25d2b7-a367-4ef6-953e-3298de084620'; // Usually the first user or similar, but I'll find all redemptions first

    console.log('🔍 Checking latest redemptions...');
    const redemptions = await prisma.scanRedemption.findMany({
        take: 5,
        orderBy: { scannedAt: 'desc' },
        include: {
            coupon: { include: { product: true } },
            tier: true
        }
    });

    redemptions.forEach(r => {
        const prizeType = r.tier?.rewardType || r.prizeType;
        let imageUrl = 'default_money_icon';
        if (prizeType === 'GIFT') imageUrl = 'bike_image';
        else if (prizeType === 'DISCOUNT') imageUrl = 'discount_image';

        console.log(`- Redemption ID: ${r.id}`);
        console.log(`  Prize: ${r.tier?.rewardName || 'Legacy'}`);
        console.log(`  Type: ${prizeType}`);
        console.log(`  Product: ${r.coupon?.product?.name || 'N/A'}`);
        console.log(`  Expected Image: ${imageUrl}`);
        console.log('---');
    });
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
