import { v2 as cloudinary } from 'cloudinary';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

async function uploadLogo() {
    console.log('🚀 Uploading logo to Cloudinary...');
    const logoPath = path.join(__dirname, '../public/assets/logo/logo.png');

    try {
        const result = await cloudinary.uploader.upload(logoPath, {
            public_id: 'agrio_logo',
            folder: 'assets',
            overwrite: true,
        });

        console.log('✅ Logo uploaded successfully!');
        console.log(`🔗 URL: ${result.secure_url}`);
        console.log('\nCopy this URL and update your .env or QrService.');
    } catch (error) {
        console.error('❌ Upload failed:', error);
    }
}

uploadLogo();
