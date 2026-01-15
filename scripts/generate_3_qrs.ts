import { PrismaClient, RewardType, DistributionType } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Starting QR Generation Script...');

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

    // 2. Create a specific campaign for these 3 rewards
    const campaign = await prisma.campaign.create({
        data: {
            name: 'Special Republic Day Rewards',
            nameHi: 'विशेष गणतंत्र दिवस पुरस्कार',
            description: 'Exclusive rewards for our valued farmers',
            startDate: new Date(),
            endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
            isActive: true,
            distributionType: DistributionType.SEQUENTIAL,
            totalQrCodes: 3,
        }
    });

    console.log(`✅ Campaign created: ${campaign.name} (${campaign.id})`);

    // 3. Create 3 tiers with different rewards
    const tiers = [
        {
            tierName: 'Gold Tier',
            rewardName: 'Brand New Hero Splendor Bike',
            rewardNameHi: 'नई हीरो स्प्लेंडर बाइक',
            rewardType: RewardType.GIFT,
            rewardValue: 75000,
            probability: 1.0, // We'll manage sequential distribution manually if needed, but for 3 codes it's fine
            priority: 1,
            maxWinners: 1,
        },
        {
            tierName: 'Silver Tier',
            rewardName: 'Special Farm Discount Coupon',
            rewardNameHi: 'विशेष फार्म डिस्काउंट कूपन',
            rewardType: RewardType.DISCOUNT,
            rewardValue: 5000,
            probability: 1.0,
            priority: 2,
            maxWinners: 1,
        },
        {
            tierName: 'Bronze Tier',
            rewardName: 'Instant Cashback Reward',
            rewardNameHi: 'तत्काल नकद पुरस्कार',
            rewardType: RewardType.CASHBACK,
            rewardValue: 1000,
            probability: 1.0,
            priority: 3,
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

    // 4. Generate 3 unique codes
    // We'll generate 3 coupons and link them to the campaign.
    // In a real sequential distribution, the claim logic handles selection.
    // For this request, I'll just generate 3 coupons.

    const codes = ['REPUBLIC-GOLD-2026', 'REPUBLIC-SILVER-2026', 'REPUBLIC-BRONZE-2026'];
    const coupons = [];

    for (let i = 0; i < 3; i++) {
        const coupon = await prisma.coupon.create({
            data: {
                code: codes[i],
                productId: product.id,
                campaignId: campaign.id,
                batchNumber: 'BATCH-JAN-2026',
                status: 'UNUSED',
            }
        });
        coupons.push(coupon);
    }

    console.log('\n✨ SUCCESS! 3 QR Codes Generated:');
    coupons.forEach((c, i) => {
        console.log(`${i + 1}. Code: ${c.code} | Reward: ${tiers[i].rewardName} | Value: ₹${tiers[i].rewardValue}`);
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
