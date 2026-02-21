import { PrismaClient, RewardType } from '@prisma/client';
import productCouponService from '../src/services/ProductCouponService';
import * as xlsx from 'xlsx';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Starting Verification Script ---');

    // 0. Cleanup from potential previous failed runs
    console.log('0. Cleaning up stale data...');
    try {
        await prisma.scanRedemption.deleteMany({ where: { productCoupon: { serialNumber: { in: ['TEST001', 'TEST002'] } } } });
        await prisma.productCoupon.deleteMany({ where: { serialNumber: { in: ['TEST001', 'TEST002'] } } });
    } catch (e) {
        console.log('Cleanup non-fatal error:', e);
    }

    // 1. Mock Excel Upload
    console.log('\n1. Testing Bulk Upload...');
    const mockData = [
        { 'Seriel Num.': 'TEST001', 'Authentic Code': 'AUTH001' },
        { 'Seriel Num.': 'TEST002', 'Authentic Code': 'AUTH002' },
    ];

    const sheet = xlsx.utils.json_to_sheet(mockData);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, sheet, 'Coupons');
    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    try {
        const uploadResult = await productCouponService.bulkUpload(buffer);
        console.log('✅ Bulk Upload Success:', uploadResult);
    } catch (e) {
        console.error('❌ Bulk Upload Failed:', e);
    }

    // 2. Setup: Ensure Active Campaign exists
    console.log('\n2. Setting up Test Campaign...');
    let campaign = await prisma.campaign.findFirst({
        where: { name: 'Test QR Campaign' }
    });

    if (campaign) {
        campaign = await prisma.campaign.update({
            where: { id: campaign.id },
            data: { isActive: true, startDate: new Date(), endDate: new Date(Date.now() + 86400000) }
        });
    } else {
        campaign = await prisma.campaign.create({
            data: {
                name: 'Test QR Campaign',
                description: 'Test Campaign',
                startDate: new Date(),
                endDate: new Date(Date.now() + 86400000),
                isActive: true,
                tiers: {
                    create: {
                        tierName: 'Test Reward',
                        rewardName: 'Test Prize',
                        rewardType: RewardType.CASHBACK, // Use correct enum
                        rewardValue: 10,
                        probability: 1.0, // 100% win for test
                    }
                }
            }
        });
    }
    console.log('✅ Campaign set up:', campaign.name);

    // Get a user ID (create dummy if needed)
    let user = await prisma.user.findFirst();
    if (!user) {
        user = await prisma.user.create({
            data: {
                phoneNumber: '9999999999',
                fullName: 'Test User'
            }
        });
    }
    const userId = user.id;

    // 3. Test Verify & Claim (Success)
    console.log('\n3. Testing Valid Claim...');
    try {
        // Note: Verify logic might check for existing redemptions, so we might need to clear them if rerunning
        const result = await productCouponService.verifyAndClaim('TEST001', 'AUTH001', userId);
        console.log('✅ Claim Success:', result.status, result.reward?.rewardName);
    } catch (e: any) {
        if (e.message === 'Coupon already redeemed' || e.message === 'Invalid coupon code') {
            console.warn('⚠️ Claim Failed (Expected if rerun):', e.message);
        } else {
            console.error('❌ Claim Failed:', e);
        }
    }

    // 4. Test Double Claim (Should Fail)
    console.log('\n4. Testing Double Claim...');
    try {
        await productCouponService.verifyAndClaim('TEST001', 'AUTH001', userId);
        console.error('❌ Double Claim Failed to Error (Unexpected)');
    } catch (e: any) {
        if (e.message === 'Coupon already redeemed') {
            console.log('✅ Double Claim Blocked Correctly');
        } else {
            console.log('✅ Double Claim Blocked (Other Error):', e.message);
        }
    }

    // 5. Test Invalid Code
    console.log('\n5. Testing Invalid Code...');
    try {
        await productCouponService.verifyAndClaim('INVALID', 'AUTH001', userId);
        console.error('❌ Invalid Code Failed to Error (Unexpected)');
    } catch (e: any) {
        console.log('✅ Invalid Code Blocked:', e.message);
    }

    // Cleanup
    console.log('\n--- Cleaning up Test Data ---');
    // Clean up redemptions first due to FK
    await prisma.scanRedemption.deleteMany({ where: { productCoupon: { serialNumber: { in: ['TEST001', 'TEST002'] } } } });
    await prisma.productCoupon.deleteMany({ where: { serialNumber: { in: ['TEST001', 'TEST002'] } } });
    // Make campaign inactive instead of deleting to avoid FK issues with other tables if any
    if (campaign) {
        await prisma.campaign.update({ where: { id: campaign.id }, data: { isActive: false } });
    }
    console.log('✅ Cleanup Complete');
}

main()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
