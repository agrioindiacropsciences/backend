import prisma from './src/lib/prisma';

async function clearOldHiBanners() {
    console.log('Clearing old imageUrlHi for all banners to unstick them...');

    const result = await prisma.appBanner.updateMany({
        data: {
            imageUrlHi: null
        }
    });

    console.log(`Updated ${result.count} banners. They will now use the main imageUrl for all languages until a new Hindi image is uploaded.`);
}

clearOldHiBanners()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
