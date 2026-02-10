
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables immediately before any other imports that might use them
dotenv.config({ path: path.join(process.cwd(), '.env') });

import fs from 'fs';
import { ConfigValueType } from '@prisma/client';

const FRONTEND_PUBLIC_DIR = path.join(__dirname, '../../../agrioindiacropsciences/public');

// Map of local file names to their roles/keys in our config
const ASSETS_TO_UPLOAD = {
    'home_hero': 'home.png',
    'feature_scan': 'scanandrewards.PNG',
    'feature_distributors': 'nearbydistributor.PNG',
    'feature_products': 'farmerfriendly.PNG',
    'feature_hindi': 'hindisupport.png',
    'choose_quality': 'assuredQuality.PNG',
    'choose_yield': 'bettercrop.PNG',
    'choose_trusted': 'trustedbyfarmer.PNG',
    'choose_range': 'widerangeproducts.PNG',
    'app_bg_farmer': 'farmerfriendly.PNG',
};

const FEATURES_DATA = [
    {
        key: 'scan_win',
        icon_name: 'QrCode',
        title: "Scan & Win Rewards",
        titleHi: "स्कैन करें और पुरस्कार जीतें",
        description: "Scan product QR codes to earn exciting rewards directly.",
        descriptionHi: "उत्पाद QR कोड स्कैन करके सीधे रोमांचक पुरस्कार अर्जित करें।",
        gradient: "from-purple-500 to-indigo-600",
        imageKey: 'feature_scan',
        href: "/scan-win",
    },
    {
        key: 'nearby_distributors',
        icon_name: 'MapPin',
        title: "Nearby Distributors",
        titleHi: "नजदीकी वितरक",
        description: "Easily locate our trusted distributors in your area.",
        descriptionHi: "अपने क्षेत्र में हमारे विश्वसनीय वितरकों को आसानी से खोजें।",
        gradient: "from-blue-500 to-cyan-600",
        imageKey: 'feature_distributors',
        href: "/buy-nearby",
    },
    {
        key: 'farmer_friendly',
        icon_name: 'Leaf',
        title: "Farmer-Friendly Products",
        titleHi: "किसान अनुकूल उत्पाद",
        description: "High-quality products designed for the modern Indian farmer.",
        descriptionHi: "आधुनिक भारतीय किसान के लिए डिज़ाइन किए गए उच्च गुणवत्ता वाले उत्पाद।",
        gradient: "from-green-500 to-emerald-600",
        imageKey: 'feature_products',
        href: "/products",
    },
    {
        key: 'hindi_support',
        icon_name: 'Languages',
        title: "Hindi Support",
        titleHi: "हिंदी सहायता",
        description: "Access all information and support in Hindi.",
        descriptionHi: "हिंदी में सभी जानकारी और सहायता प्राप्त करें।",
        gradient: "from-orange-500 to-amber-600",
        imageKey: 'feature_hindi',
        href: "/contact",
    },
];

const WHY_CHOOSE_US_DATA = [
    {
        key: 'assured_quality',
        icon_name: 'Shield',
        title: "Assured Quality",
        titleHi: "गुणवत्ता की गारंटी",
        description: "Our products undergo rigorous testing to ensure the highest quality standards.",
        descriptionHi: "हमारे उत्पाद उच्चतम गुणवत्ता मानकों को सुनिश्चित करने के लिए कठोर परीक्षण से गुजरते हैं।",
        stat: "100%",
        statLabel: "Quality Tested",
        statLabelHi: "गुणवत्ता परीक्षित",
        imageKey: 'choose_quality',
    },
    {
        key: 'better_yield',
        icon_name: 'TrendingUp',
        title: "Better Crop Yield",
        titleHi: "बेहतर फसल उपज",
        description: "Formulated to boost crop health and maximize your agricultural output.",
        descriptionHi: "फसल स्वास्थ्य को बढ़ावा देने और कृषि उत्पादन को अधिकतम करने के लिए तैयार।",
        stat: "40%",
        statLabel: "Yield Increase",
        statLabelHi: "उपज में वृद्धि",
        imageKey: 'choose_yield',
    },
    {
        key: 'trusted_by_farmers',
        icon_name: 'Users',
        title: "Trusted By Farmers",
        titleHi: "किसानों का विश्वास",
        description: "Millions of farmers across India trust us for their crop care needs.",
        descriptionHi: "भारत भर में लाखों किसान अपनी फसल देखभाल की जरूरतों के लिए हम पर भरोसा करते हैं।",
        stat: "2L+",
        statLabel: "Happy Farmers",
        statLabelHi: "खुश किसान",
        imageKey: 'choose_trusted',
    },
    {
        key: 'wide_range',
        icon_name: 'Award',
        title: "Wide Range of Products",
        titleHi: "उत्पादों की विस्तृत श्रृंखला",
        description: "A comprehensive portfolio of agrochemicals for various crops and needs.",
        descriptionHi: "विभिन्न फसलों और जरूरतों के लिए कृषि रसायनों का व्यापक पोर्टफोलियो।",
        stat: "100+",
        statLabel: "Products",
        statLabelHi: "उत्पाद",
        imageKey: 'choose_range',
    },
];

async function main() {
    // Dynamic imports to ensure env vars are loaded first
    const { default: prisma } = await import('../lib/prisma');
    const { uploadToCloudinary } = await import('../utils/cloudinary');

    console.log('Starting asset upload...');
    const urlMap: Record<string, string> = {};

    // 1. Upload assets
    for (const [key, filename] of Object.entries(ASSETS_TO_UPLOAD)) {
        const filePath = path.join(FRONTEND_PUBLIC_DIR, filename);

        if (!fs.existsSync(filePath)) {
            console.warn(`File not found: ${filePath}, skipping...`);
            continue;
        }

        try {
            console.log(`Uploading ${filename}...`);
            const result = await uploadToCloudinary(filePath, 'agrio_india/static_assets');
            urlMap[key] = result.url;
            console.log(`Uploaded ${key} to ${result.url}`);
        } catch (error) {
            console.error(`Failed to upload ${filename}:`, error);
        }
    }

    // 2. Prepare JSON configs
    const homeFeatures = FEATURES_DATA.map(item => ({
        ...item,
        image: urlMap[item.imageKey] || '',
    }));

    const whyChooseUs = WHY_CHOOSE_US_DATA.map(item => ({
        ...item,
        image: urlMap[item.imageKey] || '',
    }));

    const homeConfig = {
        hero_image: urlMap['home_hero'] || '',
        app_bg_farmer: urlMap['app_bg_farmer'] || '',
    };

    // 3. Save to SystemConfig
    console.log('Saving configs to database...');

    await prisma.systemConfig.upsert({
        where: { key: 'home_features' },
        update: {
            value: JSON.stringify(homeFeatures),
            type: ConfigValueType.JSON,
            description: 'List of features displayed on home page'
        },
        create: {
            key: 'home_features',
            value: JSON.stringify(homeFeatures),
            type: ConfigValueType.JSON,
            description: 'List of features displayed on home page'
        },
    });

    await prisma.systemConfig.upsert({
        where: { key: 'home_why_choose_us' },
        update: {
            value: JSON.stringify(whyChooseUs),
            type: ConfigValueType.JSON,
            description: 'List of reasons to choose us displayed on home page'
        },
        create: {
            key: 'home_why_choose_us',
            value: JSON.stringify(whyChooseUs),
            type: ConfigValueType.JSON,
            description: 'List of reasons to choose us displayed on home page'
        },
    });

    await prisma.systemConfig.upsert({
        where: { key: 'home_hero_config' },
        update: {
            value: JSON.stringify(homeConfig),
            type: ConfigValueType.JSON,
            description: 'Configuration for home hero section and backgrounds'
        },
        create: {
            key: 'home_hero_config',
            value: JSON.stringify(homeConfig),
            type: ConfigValueType.JSON,
            description: 'Configuration for home hero section and backgrounds'
        },
    });

    console.log('Asset upload and config update complete!');
    await prisma.$disconnect();
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
