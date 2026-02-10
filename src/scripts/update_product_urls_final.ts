
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables immediately
dotenv.config({ path: path.join(process.cwd(), '.env') });

async function main() {
    const { default: prisma } = await import('../lib/prisma');

    console.log('Updating product images with Cloudinary URLs...');

    const URL_MAP: Record<string, string> = {
        // product1: Formula
        'agrio-formula': 'https://res.cloudinary.com/dyumjsohc/image/upload/v1770294463/agrio_india/products/vymn1eyhomlwz1liybbv.png',

        // product2: Chakravyuh
        'agrio-chakravyuh': 'https://res.cloudinary.com/dyumjsohc/image/upload/v1770294465/agrio_india/products/ukrz4j9f6a9bpbzglkdt.jpg',

        // product3: Rocket
        // Note: Found o1zn... at 12:27:50 which is PNG. Fits product3 order.
        'agrio-rocket': 'https://res.cloudinary.com/dyumjsohc/image/upload/v1770294470/agrio_india/products/o1znkntolydm5d0blu4s.png',

        // product4: Hercules
        // Note: Found pisy... at 12:27:54 which is JPG. Fits product4 order.
        'agrio-hercules': 'https://res.cloudinary.com/dyumjsohc/image/upload/v1770294474/agrio_india/products/pisy010r0sxpnorlgcog.jpg',

        // product5: Topis
        'agrio-topis': 'https://res.cloudinary.com/dyumjsohc/image/upload/v1770294479/agrio_india/products/nqkejjg7dblcrspjdni8.png',

        // product6: Unicorn
        'agrio-unicorn': 'https://res.cloudinary.com/dyumjsohc/image/upload/v1770294481/agrio_india/products/frb002amxpsipw27isz3.png',
    };

    for (const [slug, url] of Object.entries(URL_MAP)) {
        console.log(`Updating ${slug}...`);
        try {
            await prisma.product.update({
                where: { slug },
                data: {
                    images: [url],
                },
            });
            console.log(`✅ Updated ${slug}`);
        } catch (e) {
            console.error(`❌ Failed to update ${slug}:`, e);
        }
    }

    console.log('All updates complete.');
    await prisma.$disconnect();
}

main().catch(console.error);
