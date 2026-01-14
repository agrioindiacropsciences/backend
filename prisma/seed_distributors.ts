import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('🌱 Seeding precise distributor data...');

    // 1. Ensure Pincodes exist in PincodeData
    const pincodeEntries = [
        { pincode: '828404', state: 'Jharkhand', district: 'Bokaro', area: 'Baghmara' },
        { pincode: '122001', state: 'Haryana', district: 'Gurgaon', area: 'Sector 31' },
        { pincode: '826001', state: 'Jharkhand', district: 'Dhanbad', area: 'Dhanbad HO' },
    ];

    for (const pc of pincodeEntries) {
        await prisma.pincodeData.upsert({
            where: { pincode: pc.pincode },
            update: pc,
            create: pc,
        });
    }
    console.log('✅ Pincode data synchronized');

    // 2. Add/Update Distributors in Jharkhand (828404 / 826001)
    const jhDistributors = [
        {
            name: 'Kamal Nayan (Rj)',
            businessName: 'RJ Agro Solutions',
            phone: '6206696007',
            email: 'rj.agro@example.com',
            addressStreet: 'Baghmara Main Road',
            addressArea: 'Baghmara',
            addressCity: 'Bokaro',
            addressPincode: '828404',
            addressState: 'Jharkhand',
            locationLat: 23.795721,
            locationLng: 86.430412,
            isVerified: true,
            rating: 4.8,
            reviewCount: 156,
            coverage: ['828404', '826001'],
        },
        {
            name: 'Rahul Kumar',
            businessName: 'Kumar Seeds & Pesticides',
            phone: '9876543210',
            email: 'kumar.seeds@example.com',
            addressStreet: 'Chas Road, Near Bus Stand',
            addressArea: 'Chas',
            addressCity: 'Bokaro',
            addressPincode: '827013',
            addressState: 'Jharkhand',
            locationLat: 23.633123,
            locationLng: 86.166845,
            isVerified: true,
            rating: 4.5,
            reviewCount: 89,
            coverage: ['828404', '827013'],
        }
    ];

    // 3. Add/Update Distributors in Haryana (122001)
    const hrDistributors = [
        {
            name: 'Sandeep Yadav',
            businessName: 'Gurgaon Agro Hub',
            phone: '9988776655',
            email: 'gurgaon.agro@example.com',
            addressStreet: 'Shop 12, Sector 31 Market',
            addressArea: 'Sector 31',
            addressCity: 'Gurugram',
            addressPincode: '122001',
            addressState: 'Haryana',
            locationLat: 28.452312,
            locationLng: 77.062034,
            isVerified: true,
            rating: 4.9,
            reviewCount: 245,
            coverage: ['122001', '122003'],
        },
        {
            name: 'Amit Sharma',
            businessName: 'Sharma Krishi Seva Kendra',
            phone: '8877665544',
            email: 'sharma.krishi@example.com',
            addressStreet: 'Old Railway Road',
            addressArea: 'Old Gurgaon',
            addressCity: 'Gurugram',
            addressPincode: '122001',
            addressState: 'Haryana',
            locationLat: 28.472145,
            locationLng: 77.023412,
            isVerified: true,
            rating: 4.2,
            reviewCount: 120,
            coverage: ['122001'],
        }
    ];

    const allDistributors = [...jhDistributors, ...hrDistributors];

    for (const d of allDistributors) {
        const { coverage, ...distData } = d;

        // Check if businessName already exists to update instead of create duplicates
        const existing = await prisma.distributor.findFirst({
            where: { businessName: d.businessName }
        });

        let distributor;
        if (existing) {
            distributor = await prisma.distributor.update({
                where: { id: existing.id },
                data: distData
            });
        } else {
            distributor = await prisma.distributor.create({
                data: distData
            });
        }

        // Update Coverage
        for (const pin of coverage) {
            await prisma.distributorCoverage.upsert({
                where: {
                    distributorId_pincode: {
                        distributorId: distributor.id,
                        pincode: pin
                    }
                },
                update: {},
                create: {
                    distributorId: distributor.id,
                    pincode: pin
                }
            });
        }
    }

    console.log('✅ Distributors seeded successfully');
    console.log('📍 Seeded precise locations for 828404 (Bokaro) and 122001 (Gurugram)');
}

main()
    .catch((e) => {
        console.error('❌ Seed failed:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
