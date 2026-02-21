
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const serialToCheck = "A100001";
  console.log(`Checking for serial: "${serialToCheck}"`);
  
  const coupon = await prisma.productCoupon.findFirst({
    where: { serialNumber: serialToCheck },
  });
  
  if (coupon) {
    console.log("FOUND:", coupon);
  } else {
    console.log("NOT FOUND. Checking similar...");
    const similar = await prisma.productCoupon.findMany({
        where: { serialNumber: { contains: "A1000" } },
        take: 5
    });
    console.log("Similar coupons:", similar);
    
    const count = await prisma.productCoupon.count();
    console.log("Total coupons in DB:", count);
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

