import { PrismaClient, RewardType, DistributionType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting Specific QR Generation Script...');

    // 1. Find or create a product to link coupons to
    let product = await prisma.product.findFirst();
    if (!product) {
        console.log('No product found, creating a dummy product...');
        const category = await prisma.category.findFirst() || await prisma.category.create({
            data: {
                id: 'CAT001',
                name: 'General',
                nameHi: 'सामान्य',
                slug: 'general',
                path: 'General',
            }
        });
        product = await prisma.product.create({
            data: {
                name: 'Agrio Crop Protector',
                nameHi: 'एग्रिओ फसल रक्षक',
                slug: 'agrio-crop-protector',
                categoryId: category.id,
            }
        });
    }

    // 2. Create a specific campaign for these 2 rewards
    const campaign = await prisma.campaign.create({
        data: {
            name: 'Demo Reward Campaign',
            nameHi: 'डेमो रिवॉर्ड कैंपेन',
            description: 'Demo rewards for testing UI',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            isActive: true,
            distributionType: DistributionType.SEQUENTIAL,
            totalQrCodes: 2,
        }
    });

    console.log(`✅ Campaign created: ${campaign.name} (${campaign.id})`);

    // 3. Create 2 tiers
    const tiers = [
        {
            tierName: 'Bike Reward Tier',
            rewardName: 'Brand New Hero Splendor Bike',
            rewardNameHi: 'नई हीरो स्प्लेंडर बाइक',
            rewardType: RewardType.GIFT,
            rewardValue: 75000,
            probability: 1.0,
            priority: 1,
            maxWinners: 1,
        },
        {
            tierName: 'Discount Coupon Tier',
            rewardName: '₹500 Discount Coupon',
            rewardNameHi: '₹500 डिस्काउंट कूपन',
            rewardType: RewardType.DISCOUNT,
            rewardValue: 500,
            probability: 1.0,
            priority: 2,
            maxWinners: 1,
        }
    ];

    const createdTiers = [];
    for (const t of tiers) {
        const tier = await prisma.campaignTier.create({
            data: {
                ...t,
                campaignId: campaign.id,
            }
        });
        createdTiers.push(tier);
    }

    console.log(`✅ ${createdTiers.length} Reward Tiers created.`);

    // 4. Generate 2 specific codes
    const timestamp = Date.now().toString().slice(-4);
    const codes = [`BIKE-REWARD-${timestamp}`, `COUPON-REWARD-${timestamp}`];
    const coupons = [];

    for (let i = 0; i < codes.length; i++) {
        const coupon = await prisma.coupon.create({
            data: {
                code: codes[i],
                productId: product.id,
                campaignId: campaign.id,
                batchNumber: 'BATCH-DEMO-2026',
                status: 'UNUSED',
            }
        });
        coupons.push(coupon);
    }

    console.log('\n✨ SUCCESS! 2 Specific QR Codes Generated:');
    const QrService = (await import('../src/services/QrService')).default;

    coupons.forEach((c, i) => {
        const qrUrl = QrService.getQrUrl(c.code);
        console.log(`${i + 1}. Code: ${c.code} | Reward: ${tiers[i].rewardName}`);
        console.log(`   🔗 Branded QR URL: ${qrUrl}`);
    });

    console.log('\nShare these codes with the user for scanning.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
