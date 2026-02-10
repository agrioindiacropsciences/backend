
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
    const { default: prisma } = await import('../lib/prisma');

    const products = await prisma.product.findMany({
        select: { id: true, name: true, slug: true, images: true }
    });

    console.log('Products found:', products);
    await prisma.$disconnect();
}

main().catch(console.error);
