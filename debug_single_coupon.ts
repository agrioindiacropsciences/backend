
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const serialNumber = "A172938";
  const coupon = await prisma.productCoupon.findUnique({
    where: { serialNumber },
  });
  console.log("Coupon found:", coupon);
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

