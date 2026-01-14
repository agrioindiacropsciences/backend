import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Fixing and enriching distributor data...');

    // 1. Precise Address for Kamal Nayan / RJ Agro
    // We'll update by phone number to ensure we hit the right one
    const rjData = {
        name: 'Kamal Nayan',
        businessName: 'RJ Agro Solutions',
        phone: '6206696007',
        email: 'kamalnayan@agrioindia.com',
        whatsapp: '6206696007',
        addressStreet: 'Shop No. 42, Baghmara Market',
        addressArea: 'Main Bazaar',
        addressCity: 'Baghmara (Bokaro)',
        addressPincode: '828404',
        addressState: 'Jharkhand',
        locationLat: 23.795721,
        locationLng: 86.430412,
        isVerified: true,
        rating: 4.8,
        reviewCount: 156,
    };

    // Find all distributors with this phone number and update/merge
    const existingRj = await prisma.distributor.findMany({
        where: { phone: '6206696007' }
    });

    if (existingRj.length > 0) {
        // Update the first one
        await prisma.distributor.update({
            where: { id: existingRj[0].id },
            data: rjData
        });

        // Delete others if they exist (to avoid duplicates)
        if (existingRj.length > 1) {
            for (let i = 1; i < existingRj.length; i++) {
                await prisma.distributor.delete({ where: { id: existingRj[i].id } });
            }
        }
    } else {
        await prisma.distributor.create({ data: rjData });
    }

    // 2. Precise Address for Rahul Kumar
    await prisma.distributor.updateMany({
        where: { phone: '9876543210' },
        data: {
            addressStreet: 'Plot 15, Industrial Area Phase 2',
            addressArea: 'Chas Crossing',
            addressCity: 'Bokaro Steel City',
            addressState: 'Jharkhand',
        }
    });

    // 3. Precise Address for Gurugram Distributors
    await prisma.distributor.updateMany({
        where: { phone: '9988776655' }, // Gurgaon Agro Hub
        data: {
            addressStreet: 'SCO 15, First Floor, Sector 31 Market',
            addressArea: 'Near HUDA Market',
            addressCity: 'Gurugram',
            addressState: 'Haryana',
        }
    });

    await prisma.distributor.updateMany({
        where: { phone: '8877665544' }, // Sharma Krishi
        data: {
            addressStreet: '124/B, Old Railway Road',
            addressArea: 'Opposite State Bank',
            addressCity: 'Gurugram',
            addressState: 'Haryana',
        }
    });

    // Ensure coverage is correct for the main testing one
    const dist = await prisma.distributor.findFirst({ where: { phone: '6206696007' } });
    if (dist) {
        await prisma.distributorCoverage.upsert({
            where: { distributorId_pincode: { distributorId: dist.id, pincode: '828404' } },
            update: {},
            create: { distributorId: dist.id, pincode: '828404' }
        });
    }

    console.log('✅ Distributor addresses enriched with precise details.');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
