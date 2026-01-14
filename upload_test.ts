import { uploadToCloudinary } from './src/utils/cloudinary';
import fs from 'fs';
import path from 'path';

async function testUpload() {
    const images = ['01.jpeg', '02.jpg'];

    console.log('🚀 Starting test upload to Cloudinary...');

    for (const img of images) {
        const originalPath = path.join(process.cwd(), img);
        const tempPath = path.join(process.cwd(), `temp_${img}`);

        if (fs.existsSync(originalPath)) {
            // Copy to temp file because our utility deletes the file after upload
            fs.copyFileSync(originalPath, tempPath);

            try {
                console.log(`Uploading ${img}...`);
                const result = await uploadToCloudinary(tempPath, 'products');
                console.log(`✅ ${img} uploaded successfully!`);
                console.log(`🔗 URL: ${result.url}`);
                console.log(`🆔 Public ID: ${result.public_id}`);
                console.log('---');
            } catch (error) {
                console.error(`❌ Failed to upload ${img}:`, error);
            }
        } else {
            console.error(`❌ File not found: ${originalPath}`);
        }
    }
}

testUpload();
