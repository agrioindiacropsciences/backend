import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- System Config Content ---');
    const configs = await prisma.systemConfig.findMany();

    configs.forEach(c => {
        console.log(`Key: ${c.key}`);
        console.log(`Type: ${c.type}`);
        console.log(`Value: ${c.value}`);
        console.log('---');
    });
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect());
