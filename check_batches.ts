import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
    const batchGroups = await prisma.productCoupon.groupBy({
        by: ['batchNumber'],
        _count: {
            id: true,
        },
        _min: {
            createdAt: true,
        },
        orderBy: {
            _min: {
                createdAt: 'desc'
            }
        },
    });

    console.log('Groups found:', batchGroups.length);
    console.log('Groups:', JSON.stringify(batchGroups, null, 2));

    await prisma.$disconnect();
}

check().catch(console.error);
