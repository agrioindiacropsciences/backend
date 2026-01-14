import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const imageUrl = "https://res.cloudinary.com/dyumjsohc/image/upload/v1768218544/products/x6jnoacxej1zny1xyzxs.jpg";

    console.log('🚀 Mass updating ALL image fields in the database...');

    // 1. Update ALL Products
    const products = await prisma.product.updateMany({
        data: {
            images: [imageUrl]
        }
    });
    console.log(`✅ Updated ${products.count} Products`);

    // 2. Update ALL Categories
    const categories = await prisma.category.updateMany({
        data: {
            imageUrl: imageUrl
        }
    });
    console.log(`✅ Updated ${categories.count} Categories`);

    // 3. Update ALL Crops
    const crops = await prisma.crop.updateMany({
        data: {
            imageUrl: imageUrl
        }
    });
    console.log(`✅ Updated ${crops.count} Crops`);

    // 4. Update ALL Banners
    const banners = await prisma.appBanner.updateMany({
        data: {
            imageUrl: imageUrl,
            imageUrlHi: imageUrl
        }
    });
    console.log(`✅ Updated ${banners.count} Banners`);

    // 5. Update ALL Distributors (Signatures and Stamps)
    const distributors = await prisma.distributor.updateMany({
        data: {
            signatureImageUrl: imageUrl,
            stampImageUrl: imageUrl
        }
    });
    console.log(`✅ Updated ${distributors.count} Distributors`);

    // 6. Update ALL Scan Redemptions (Acknowledgment files)
    const redemptions = await prisma.scanRedemption.updateMany({
        data: {
            acknowledgmentFileUrl: imageUrl
        }
    });
    console.log(`✅ Updated ${redemptions.count} Scan Redemptions`);

    console.log('\n✨ All image placeholders have been replaced with the Cloudinary URL.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
