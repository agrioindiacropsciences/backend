import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadRewardImages() {
    console.log('🚀 Uploading reward images to Cloudinary...');

    const images = [
        { name: 'hero_splendor', path: '/Users/kamalnayan/.gemini/antigravity/brain/206e3c0f-c7ed-44d6-ba0c-e09ee8f4a472/hero_splendor_bike_1768457071452.png' },
        { name: 'cashback_voucher', url: 'https://images.unsplash.com/photo-1580519542036-c47de6196ba5?q=80&w=800' },
        { name: 'discount_voucher', url: 'https://images.unsplash.com/photo-1620912189865-1e8a33da4c5e?q=80&w=800' }
    ];

    for (const img of images) {
        try {
            const source = img.path || img.url;
            const result = await cloudinary.uploader.upload(source!, {
                public_id: img.name,
                folder: 'rewards',
                overwrite: true,
            });
            console.log(`✅ ${img.name} uploaded: ${result.secure_url}`);
        } catch (error) {
            console.error(`❌ ${img.name} failed:`, error);
        }
    }
}

uploadRewardImages();
