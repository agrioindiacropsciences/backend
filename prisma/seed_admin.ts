import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding admin user only...');

  const adminPassword = await bcrypt.hash('f7formula7', 12);
  await prisma.adminUser.upsert({
    where: { email: 'agrioindiacropsciences@gmail.com' },
    update: { passwordHash: adminPassword, name: 'Super Admin', role: 'SUPER_ADMIN', isActive: true },
    create: {
      name: 'Super Admin',
      email: 'agrioindiacropsciences@gmail.com',
      passwordHash: adminPassword,
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });

  console.log('✅ Admin user created/updated (agrioindiacropsciences@gmail.com)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
