import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const userId = '58e76007-ad43-46b5-83a2-a4ae8a87d6f7'; // 7320082348
    console.log(`--- Checking rewards for User: ${userId} ---`);

    const redemptions = await prisma.scanRedemption.findMany({
        where: { userId },
        include: {
            coupon: true,
            tier: true
        }
    });

    console.log(`Found ${redemptions.length} redemptions.`);
    redemptions.forEach((r, i) => {
        console.log(`[${i + 1}] ID: ${r.id}, Code: ${r.coupon.code}, Prize: ${r.tier?.rewardName}, Date: ${r.scannedAt}`);
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
