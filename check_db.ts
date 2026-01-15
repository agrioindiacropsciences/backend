import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Scanning Redemptions ---');
    const redemptions = await prisma.scanRedemption.findMany({
        include: {
            user: { select: { phoneNumber: true } },
            coupon: { select: { code: true } },
            tier: { select: { rewardName: true } }
        },
        orderBy: { scannedAt: 'desc' },
        take: 20
    });

    if (redemptions.length === 0) {
        console.log('No redemptions found in database.');
    } else {
        redemptions.forEach(r => {
            console.log(`User: ${r.user.phoneNumber}, Code: ${r.coupon.code}, Prize: ${r.tier?.rewardName || r.prizeType}, Status: ${r.status}, Date: ${r.scannedAt}`);
        });
    }

    const coupons = await prisma.coupon.count({ where: { status: 'USED' } });
    console.log(`\nTotal USED coupons: ${coupons}`);

    const users = await prisma.user.findMany({
        take: 5,
        select: { id: true, phoneNumber: true }
    });
    console.log('\nSample Users:');
    users.forEach(u => console.log(`ID: ${u.id}, Phone: ${u.phoneNumber}`));
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
