
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const campaigns = await prisma.campaign.findMany({
    include: { tiers: true },
    orderBy: { createdAt: "desc" },
    take: 1
  });
  
  console.log("Latest Campaign:");
  campaigns.forEach(c => {
    console.log("Campaign:", c.name);
    console.log("Tiers:");
    c.tiers.forEach(t => {
      console.log("  -", t.rewardName);
      console.log("    Type:", t.rewardType);
      console.log("    Image URL:", t.imageUrl || "(none)");
    });
  });
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

