
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  const now = new Date();
  console.log("Server Time (now):", now.toISOString());
  console.log("Server Time (local string):", now.toString());

  const campaigns = await prisma.campaign.findMany({
    where: { isActive: true }
  });

  console.log("
Active Campaigns in DB:");
  campaigns.forEach(c => {
    console.log(`- Name: ${c.name}`);
    console.log(`  Start: ${c.startDate}`);
    console.log(`  End:   ${c.endDate}`);
    
    const start = new Date(c.startDate);
    const end = new Date(c.endDate);
    
    // Explicit comparison
    const isStarted = start.getTime() <= now.getTime();
    const isNotEnded = end.getTime() >= now.getTime();
    
    console.log(`  Calculated: Started? ${isStarted}, Ended? ${!isNotEnded}, Active Now? ${isStarted && isNotEnded}`);
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

