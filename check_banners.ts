import prisma from './src/lib/prisma';

async function checkBanners() {
    console.log('Checking all banners in database...');

    const banners = await prisma.appBanner.findMany({
        orderBy: { displayOrder: 'asc' }
    });

    console.log(`Found ${banners.length} banners:`);
    console.log(JSON.stringify(banners, null, 2));
}

checkBanners()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
