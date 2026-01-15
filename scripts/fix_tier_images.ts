
import { PrismaClient, RewardType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🔄 Updating Tier Images to Cloudinary URLs...');

    const updates = [
        {
            type: RewardType.GIFT,
            url: 'https://res.cloudinary.com/dyumjsohc/image/upload/v1768457092/rewards/hero_splendor.jpg'
        },
        {
            type: RewardType.DISCOUNT,
            url: 'https://res.cloudinary.com/dyumjsohc/image/upload/v1768457093/rewards/discount_voucher.jpg'
        },
        {
            type: RewardType.CASHBACK,
            url: 'https://res.cloudinary.com/dyumjsohc/image/upload/v1768457092/rewards/cashback_voucher.jpg'
        }
    ];

    for (const update of updates) {
        const result = await prisma.campaignTier.updateMany({
            where: {
                rewardType: update.type,
            },
            data: {
                imageUrl: update.url
            }
        });
        console.log(`✅ Updated ${result.count} tiers of type ${update.type}`);
    }

    console.log('✨ All tiers updated with reliable images.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
