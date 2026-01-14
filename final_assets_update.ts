import { PrismaClient, BannerLinkType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const imageUrl = "https://res.cloudinary.com/dyumjsohc/image/upload/v1768218544/products/x6jnoacxej1zny1xyzxs.jpg";

    console.log('🚀 Creating sample banners and ensuring everything is updated...');

    // 1. Create Sample Banners if none exist
    const bannerCount = await prisma.appBanner.count();
    if (bannerCount === 0) {
        await prisma.appBanner.createMany({
            data: [
                {
                    section: "HOME_TOP",
                    imageUrl: imageUrl,
                    title: "Special Monsoon Offer",
                    linkType: BannerLinkType.URL,
                    linkValue: "https://agrioindia.com",
                    displayOrder: 1,
                    isActive: true
                },
                {
                    section: "HOME_TOP",
                    imageUrl: imageUrl,
                    title: "New Pesticides Available",
                    linkType: BannerLinkType.CATEGORY,
                    linkValue: "insecticide",
                    displayOrder: 2,
                    isActive: true
                }
            ]
        });
        console.log('✅ Created 2 sample banners.');
    }

    // 2. Re-update ALL image fields just to be absolutely sure
    await prisma.product.updateMany({ data: { images: [imageUrl] } });
    await prisma.category.updateMany({ data: { imageUrl: imageUrl } });
    await prisma.crop.updateMany({ data: { imageUrl: imageUrl } });
    await prisma.appBanner.updateMany({ data: { imageUrl: imageUrl, imageUrlHi: imageUrl } });

    console.log('✅ All categories, products, crops, and banners have been updated with the image.');
}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
