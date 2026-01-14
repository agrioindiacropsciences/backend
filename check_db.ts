import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const products = await prisma.product.findMany({
        take: 5
    });
    console.log('Sample Products:', JSON.stringify(products, null, 2));

    const categories = await prisma.category.findMany({
        take: 5
    });
    console.log('Sample Categories:', JSON.stringify(categories, null, 2));
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
