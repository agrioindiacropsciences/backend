
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const coupons = await prisma.productCoupon.findMany({ take: 5 });
  console.log(JSON.stringify(coupons, null, 2));
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

