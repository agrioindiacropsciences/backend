import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const imageUrl = "https://res.cloudinary.com/dyumjsohc/image/upload/v1768218544/products/x6jnoacxej1zny1xyzxs.jpg";

    console.log('🚀 Updating database with Cloudinary image...');

    // Update Best Seller Products
    const updatedProducts = await prisma.product.updateMany({
        where: {
            OR: [
                { slug: "fungiguard-pro" },
                { slug: "agripower-plus" }
            ]
        },
        data: {
            images: [imageUrl],
            isBestSeller: true
        }
    });
    console.log(`✅ Updated ${updatedProducts.count} products with the new image.`);

    // Update Categories
    const updatedCategories = await prisma.category.updateMany({
        where: {
            id: "fungicide"
        },
        data: {
            imageUrl: imageUrl
        }
    });
    console.log(`✅ Updated ${updatedCategories.count} categories with the new image.`);

    // Update Banners if any exist
    const updatedBanners = await prisma.appBanner.updateMany({
        data: {
            imageUrl: imageUrl
        }
    });
    console.log(`✅ Updated ${updatedBanners.count} app banners.`);

}

main()
    .catch((e) => {
        console.error(e);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
