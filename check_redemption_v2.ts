
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function checkCode(code: string) {
    console.log(`\n--- Checking code: ${code} ---`);

    // Check ProductCoupon
    const productCoupon = await prisma.productCoupon.findFirst({
        where: {
            OR: [
                { serialNumber: code },
                { authCode: code }
            ]
        },
        include: {
            user: true,
            redemptions: {
                include: {
                    user: true
                }
            }
        }
    });

    if (productCoupon) {
        console.log("Found in ProductCoupon:");
        console.log(`  Serial: ${productCoupon.serialNumber}`);
        console.log(`  Auth Code: ${productCoupon.authCode}`);
        console.log(`  Is Redeemed: ${productCoupon.isRedeemed}`);
        if (productCoupon.user) {
            console.log(`  Redeemed By: ${productCoupon.user.fullName} (${productCoupon.user.phoneNumber})`);
            console.log(`  Redeemed At: ${productCoupon.redeemedAt}`);
        } else if (productCoupon.redemptions.length > 0) {
            const user = productCoupon.redemptions[0].user;
            console.log(`  Redeemed By (via ScanRedemption): ${user.fullName} (${user.phoneNumber})`);
            console.log(`  Redeemed At: ${productCoupon.redemptions[0].scannedAt}`);
        } else {
            console.log("  Not redeemed yet.");
        }
        return;
    }

    // Check Coupon
    const coupon = await prisma.coupon.findFirst({
        where: { code: code },
        include: {
            user: true,
            redemptions: {
                include: {
                    user: true
                }
            }
        }
    });

    if (coupon) {
        console.log("Found in Coupon:");
        console.log(`  Code: ${coupon.code}`);
        console.log(`  Status: ${coupon.status}`);
        if (coupon.user) {
            console.log(`  Used By: ${coupon.user.fullName} (${coupon.user.phoneNumber})`);
            console.log(`  Used At: ${coupon.usedAt}`);
        } else if (coupon.redemptions.length > 0) {
            const user = coupon.redemptions[0].user;
            console.log(`  Used By (via ScanRedemption): ${user.fullName} (${user.phoneNumber})`);
            console.log(`  Used At: ${coupon.redemptions[0].scannedAt}`);
        } else {
            console.log("  Not used yet.");
        }
        return;
    }

    console.log("Code NOT FOUND in either ProductCoupon or Coupon tables.");
}

async function main() {
    const codes = ["A104946", "84885121"];
    for (const code of codes) {
        await checkCode(code);
    }
}

void main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
