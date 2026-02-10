
import dotenv from 'dotenv';
import path from 'path';
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
    const { default: cloudinary } = await import('../lib/cloudinary');

    console.log('Fetching images from Cloudinary...');

    try {
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: 'agrio_india/products',
            max_results: 20,
            direction: 'desc', // newest first
            context: true,
            tags: true,
        });

        console.log('Found images:');
        for (const res of result.resources) {
            console.log(`URL: ${res.secure_url}`);
            console.log(`Public ID: ${res.public_id}`);
            console.log(`Created At: ${res.created_at}`);
        }
    } catch (error) {
        console.error('Error fetching resources:', error);
    }
}

main();
