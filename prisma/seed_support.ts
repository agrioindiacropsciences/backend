import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding Support & CMS data...');

    // 1. Update/Add FAQs from Screenshot
    const faqs = [
        {
            id: 'faq-redeem',
            question: 'How do I redeem my coupon?',
            answer: 'Scan the QR code on the product, scratch the card, and show the coupon code to your distributor.',
            category: 'General',
            displayOrder: 0
        },
        {
            id: 'faq-camera',
            question: 'Why is my camera not working?',
            answer: 'Please ensure you have granted camera permissions in your device settings.',
            category: 'Technical',
            displayOrder: 1
        },
        {
            id: 'faq-distributors',
            question: 'Where can I find nearby distributors?',
            answer: 'Go to the product details page and click "Find Nearby Distributor".',
            category: 'General',
            displayOrder: 2
        }
    ];

    for (const faq of faqs) {
        await prisma.faq.upsert({
            where: { id: faq.id },
            update: faq,
            create: faq
        });
    }
    console.log('✅ FAQs seeded');

    // 2. Update System Config for Contact Us
    const configs = [
        { key: 'support_email', value: 'support@agrioindia.com' },
        { key: 'support_phone', value: '+91 1800 123 4567' },
        { key: 'whatsapp_number', value: '+91 6206696007' }
    ];

    for (const config of configs) {
        await prisma.systemConfig.upsert({
            where: { key: config.key },
            update: { value: config.value },
            create: { key: config.key, value: config.value, type: 'STRING' }
        });
    }
    console.log('✅ Contact info updated in System Config');

    // 3. Seed CMS Pages (Privacy Policy, Terms)
    const pages = [
        {
            slug: 'privacy-policy',
            title: 'Privacy Policy',
            content: '<h1>Privacy Policy</h1><p>At Agrio India, we value your privacy. This policy explains how we collect and protect your data...</p>'
        },
        {
            slug: 'terms',
            title: 'Terms of Service',
            content: '<h1>Terms of Service</h1><p>By using the Agrio India app, you agree to our terms and conditions...</p>'
        }
    ];

    for (const page of pages) {
        await prisma.cmsPage.upsert({
            where: { slug: page.slug },
            update: page,
            create: { ...page, isActive: true }
        });
    }
    console.log('✅ CMS Pages seeded');

    console.log('🚀 Support data finalized!');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
