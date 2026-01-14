import { PrismaClient, DistributionType, RewardType } from '@prisma/client';
import { QrService } from './services/QrService';

const prisma = new PrismaClient();
const qrService = new QrService();

async function main() {
    console.log('🚀 Starting QR System Test Setup...');

    // 1. Create a Test Campaign
    const campaign = await prisma.campaign.create({
        data: {
            name: 'Test Reward Campaign',
            nameHi: 'परीक्षण इनाम अभियान',
            description: 'A test campaign to verify the QR reward system.',
            startDate: new Date(),
            endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
            isActive: true,
            distributionType: DistributionType.RANDOM,
            totalQrCodes: 0,
        },
    });

    console.log(`✅ Campaign created: ${campaign.id}`);

    // 2. Add Campaign Tiers
    await prisma.campaignTier.createMany({
        data: [
            {
                campaignId: campaign.id,
                tierName: 'Gold Tier',
                rewardName: '₹500 Cashback',
                rewardType: RewardType.CASHBACK,
                rewardValue: 500,
                probability: 0.1, // 10%
                maxWinners: 5,
                priority: 1,
            },
            {
                campaignId: campaign.id,
                tierName: 'Silver Tier',
                rewardName: '₹100 Discount',
                rewardType: RewardType.DISCOUNT,
                rewardValue: 100,
                probability: 0.9, // 90%
                maxWinners: 50,
                priority: 2,
            },
        ],
    });

    console.log('✅ Campaign tiers added.');

    // 3. Generate a batch of QR codes
    await qrService.generateBatch(campaign.id, 10, 'BATCH-001');

    // 4. Fetch the generated codes
    const coupons = await prisma.coupon.findMany({
        where: { campaignId: campaign.id },
        take: 5,
    });

    console.log('\n--- TEST QR CODES ---');
    coupons.forEach((c, i) => {
        console.log(`${i + 1}. Code: ${c.code}`);
    });
    console.log('---------------------\n');

    console.log('👉 Use one of the codes above to test in the app.');
    console.log('Note: You might need to manually trigger the API call with this code if you cannot scan a real QR.');
}

main()
    .catch((e) => {
        console.error('❌ Test setup failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
