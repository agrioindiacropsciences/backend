
import { PrismaClient, RewardType, DistributionType, CouponStatus } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

const prisma = new PrismaClient();

async function main() {
    console.log('Starting reset and seed...');

    try {
        // 1. Delete existing data
        console.log('Deleting ScanRedemptions...');
        await prisma.scanRedemption.deleteMany({});

        console.log('Deleting Coupons...');
        await prisma.coupon.deleteMany({});

        console.log('Deleting CampaignTiers...');
        await prisma.campaignTier.deleteMany({});

        console.log('Deleting Campaigns...');
        await prisma.campaign.deleteMany({});

        // 2. Create new Campaign
        console.log('Creating new Campaign...');
        const campaign = await prisma.campaign.create({
            data: {
                name: 'Winter Bonanza 2026',
                description: 'Win exciting prizes with every scan!',
                startDate: new Date(),
                endDate: new Date(new Date().setMonth(new Date().getMonth() + 3)),
                distributionType: DistributionType.RANDOM,
                isActive: true,
                totalQrCodes: 1000,
            },
        });

        // 3. Create Tiers with Images
        // Images: Using placeholders that look professional
        console.log('Creating Tiers...');
        const tiers = [
            {
                name: 'Bumper Prize - Hero Splendor',
                type: RewardType.GIFT,
                value: 85000,
                image: 'https://res.cloudinary.com/dyumjsohc/image/upload/v1768457092/rewards/hero_splendor.jpg', // Bike
                prob: 0.1,
            },
            {
                name: '₹500 Discount Coupon',
                type: RewardType.DISCOUNT,
                value: 500,
                image: 'https://res.cloudinary.com/dyumjsohc/image/upload/v1768457093/rewards/discount_voucher.jpg', // Discount
                prob: 0.4,
            },
            {
                name: 'Cashback ₹50',
                type: RewardType.CASHBACK,
                value: 50,
                image: 'https://res.cloudinary.com/dyumjsohc/image/upload/v1768457092/rewards/cashback_voucher.jpg', // Cash
                prob: 0.5,
            },
        ];

        const createdTiers = [];
        for (const tier of tiers) {
            const created = await prisma.campaignTier.create({
                data: {
                    campaignId: campaign.id,
                    tierName: tier.name,
                    rewardName: tier.name,
                    rewardType: tier.type,
                    rewardValue: tier.value,
                    imageUrl: tier.image,
                    probability: tier.prob,
                },
            });
            createdTiers.push(created);
        }

        // 4. Generate Coupons
        console.log('Generating 50 Coupons...');
        const couponsData = [];
        for (let i = 0; i < 50; i++) {
            // Create individual coupon to ensure uniqueness and proper setup if needed
            // but createMany is faster
            couponsData.push({
                code: `WIN-${uuidv4().substring(0, 8).toUpperCase()}`,
                campaignId: campaign.id,
                status: CouponStatus.UNUSED,
            });
        }

        await prisma.coupon.createMany({
            data: couponsData,
        });

        // 5. Create some "won" rewards for testing (User Rewards)
        // Find a user (optional) or just leave it for the user to scan
        // The user asked to "delete all... from users rewards" - effectively clearing history.
        // So we stop here. The user will scan new codes (or we can simulate one if we knew the user ID).

        console.log('Seeding completed successfully!');
        console.log(`Created Campaign: ${campaign.name}`);
        console.log(`Created ${createdTiers.length} Tiers with images.`);
        console.log(`Generated ${couponsData.length} Coupons.`);

    } catch (error) {
        console.error("Error during seed:", error);
        throw error;
    }
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
