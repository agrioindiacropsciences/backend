
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const campaignName = "Testing";
  const newStart = new Date("2026-02-13T00:00:00.000Z"); // Start 1 day ago
  
  await prisma.campaign.updateMany({
    where: { name: campaignName },
    data: { startDate: newStart }
  });
  
  console.log(`Updated campaign "${campaignName}" start date to ${newStart.toISOString()}`);
}

void main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

