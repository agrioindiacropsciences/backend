
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
    const { default: prisma } = await import('../lib/prisma');
    const banners = await prisma.appBanner.findMany();
    console.log('Banners:', banners);
    await prisma.$disconnect();
}
main();
