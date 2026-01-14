import { PrismaClient, BannerLinkType } from '@prisma/client';
import { uploadToCloudinary } from './src/utils/cloudinary';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

async function uploadBanners() {
    const banners = [
        { file: 'offerAg.avif', title: 'Agrio Special Offer 1' },
        { file: 'offerAg2.jpg', title: 'Agrio Special Offer 2' }
    ];

    console.log('🚀 Uploading new banners to Cloudinary...');

    for (let i = 0; i < banners.length; i++) {
        const item = banners[i];
        const filePath = path.join(process.cwd(), item.file);
        const tempPath = path.join(process.cwd(), `temp_banner_${item.file}`);

        if (fs.existsSync(filePath)) {
            // Copy to temp because utility deletes the file
            fs.copyFileSync(filePath, tempPath);

            try {
                console.log(`Uploading ${item.file}...`);
                const result = await uploadToCloudinary(tempPath, 'banners');

                await prisma.appBanner.create({
                    data: {
                        section: 'HOME_TOP',
                        imageUrl: result.url,
                        imageUrlHi: result.url,
                        title: item.title,
                        linkType: BannerLinkType.NONE,
                        displayOrder: i + 1,
                        isActive: true
                    }
                });

                console.log(`✅ ${item.file} uploaded and saved to DB! URL: ${result.url}`);
            } catch (error) {
                console.error(`❌ Failed to upload ${item.file}:`, error);
            }
        } else {
            console.error(`❌ File not found: ${filePath}`);
        }
    }
}

uploadBanners()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
