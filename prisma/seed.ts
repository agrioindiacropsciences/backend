import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seed...');

  // Create admin user (credentials validated from DB only)
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
  console.log('✅ Admin user created');

  // Create categories
  const categories = [
    { id: 'insecticide', name: 'Insecticides', nameHi: 'कीटनाशक', slug: 'insecticides', path: 'insecticide' },
    { id: 'fungicide', name: 'Fungicides', nameHi: 'फफूंदनाशक', slug: 'fungicides', path: 'fungicide' },
    { id: 'herbicide', name: 'Herbicides', nameHi: 'खरपतवारनाशक', slug: 'herbicides', path: 'herbicide' },
    { id: 'fertilizer', name: 'Fertilizers', nameHi: 'उर्वरक', slug: 'fertilizers', path: 'fertilizer' },
    { id: 'plant-growth-regulator', name: 'Plant Growth Regulators', nameHi: 'पौधे विकास नियामक', slug: 'plant-growth-regulators', path: 'plant-growth-regulator' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: {},
      create: {
        ...cat,
        displayOrder: categories.indexOf(cat),
      },
    });
  }
  console.log('✅ Categories created');

  // Create crops
  const crops = [
    { id: 'wheat', name: 'Wheat', nameHi: 'गेहूं' },
    { id: 'rice', name: 'Rice', nameHi: 'चावल' },
    { id: 'sugarcane', name: 'Sugarcane', nameHi: 'गन्ना' },
    { id: 'cotton', name: 'Cotton', nameHi: 'कपास' },
    { id: 'maize', name: 'Maize', nameHi: 'मक्का' },
    { id: 'soybean', name: 'Soybean', nameHi: 'सोयाबीन' },
    { id: 'groundnut', name: 'Groundnut', nameHi: 'मूंगफली' },
    { id: 'mustard', name: 'Mustard', nameHi: 'सरसों' },
    { id: 'potato', name: 'Potato', nameHi: 'आलू' },
    { id: 'tomato', name: 'Tomato', nameHi: 'टमाटर' },
    { id: 'onion', name: 'Onion', nameHi: 'प्याज' },
    { id: 'chilli', name: 'Chilli', nameHi: 'मिर्च' },
    { id: 'brinjal', name: 'Brinjal', nameHi: 'बैंगन' },
    { id: 'cabbage', name: 'Cabbage', nameHi: 'पत्ता गोभी' },
    { id: 'cauliflower', name: 'Cauliflower', nameHi: 'फूल गोभी' },
  ];

  for (const crop of crops) {
    await prisma.crop.upsert({
      where: { id: crop.id },
      update: {},
      create: {
        ...crop,
        displayOrder: crops.indexOf(crop),
      },
    });
  }
  console.log('✅ Crops created');

  // Create sample products
  const products = [
    {
      name: 'AgriPower Plus',
      nameHi: 'एग्रीपावर प्लस',
      slug: 'agripower-plus',
      categoryId: 'insecticide',
      description: 'Effective pest control for various crops',
      descriptionHi: 'विभिन्न फसलों के लिए प्रभावी कीट नियंत्रण',
      composition: 'Chlorpyrifos 20% EC',
      dosage: '2-3 ml per liter of water',
      applicationMethod: 'Foliar spray',
      targetPests: ['Stem borer', 'White grub', 'Aphids'],
      suitableCrops: ['Sugarcane', 'Rice', 'Wheat', 'Cotton'],
      isBestSeller: true,
      packSizes: [
        { size: '250ml', sku: 'AP-250' },
        { size: '500ml', sku: 'AP-500' },
        { size: '1L', sku: 'AP-1L' },
      ],
    },
    {
      name: 'FungiGuard Pro',
      nameHi: 'फंगीगार्ड प्रो',
      slug: 'fungiguard-pro',
      categoryId: 'fungicide',
      description: 'Broad spectrum fungicide for disease control',
      descriptionHi: 'रोग नियंत्रण के लिए व्यापक स्पेक्ट्रम फफूंदनाशक',
      composition: 'Mancozeb 75% WP',
      dosage: '2.5-3 g per liter of water',
      applicationMethod: 'Foliar spray',
      targetPests: ['Blight', 'Rust', 'Powdery mildew'],
      suitableCrops: ['Potato', 'Tomato', 'Wheat', 'Rice'],
      isBestSeller: true,
      packSizes: [
        { size: '250g', sku: 'FG-250' },
        { size: '500g', sku: 'FG-500' },
        { size: '1kg', sku: 'FG-1K' },
      ],
    },
    {
      name: 'WeedClear Max',
      nameHi: 'वीडक्लियर मैक्स',
      slug: 'weedclear-max',
      categoryId: 'herbicide',
      description: 'Selective herbicide for weed control',
      descriptionHi: 'खरपतवार नियंत्रण के लिए चयनात्मक खरपतवारनाशक',
      composition: '2,4-D Amine Salt 58% SL',
      dosage: '2-3 ml per liter of water',
      applicationMethod: 'Post-emergence spray',
      targetPests: ['Broad leaf weeds'],
      suitableCrops: ['Wheat', 'Rice', 'Sugarcane', 'Maize'],
      isBestSeller: false,
      packSizes: [
        { size: '500ml', sku: 'WC-500' },
        { size: '1L', sku: 'WC-1L' },
      ],
    },
  ];

  for (const product of products) {
    const { packSizes, ...productData } = product;

    const created = await prisma.product.upsert({
      where: { slug: product.slug },
      update: {},
      create: productData,
    });

    // Create pack sizes
    for (const ps of packSizes) {
      await prisma.productPackSize.upsert({
        where: { sku: ps.sku },
        update: {},
        create: {
          productId: created.id,
          size: ps.size,
          sku: ps.sku,
        },
      });
    }
  }
  console.log('✅ Products created');

  // Create FAQs
  const faqs = [
    {
      question: 'How do I scan a coupon?',
      questionHi: 'मैं कूपन कैसे स्कैन करूं?',
      answer: 'Open the app, go to Scan & Win section, and scan the QR code on your product packaging.',
      answerHi: 'ऐप खोलें, स्कैन और जीतें सेक्शन में जाएं, और अपने प्रोडक्ट पैकेजिंग पर QR कोड स्कैन करें।',
      category: 'Scan & Win',
    },
    {
      question: 'How long does it take to receive my reward?',
      questionHi: 'मुझे अपना इनाम प्राप्त करने में कितना समय लगता है?',
      answer: 'Rewards are typically processed within 7-10 business days after verification.',
      answerHi: 'इनाम आमतौर पर सत्यापन के बाद 7-10 कार्य दिवसों में संसाधित किए जाते हैं।',
      category: 'Rewards',
    },
    {
      question: 'How can I find a distributor near me?',
      questionHi: 'मैं अपने पास का डिस्ट्रीब्यूटर कैसे ढूंढूं?',
      answer: 'Enter your pincode in the Find Dealer section to see a list of authorized distributors in your area.',
      answerHi: 'अपने क्षेत्र में अधिकृत वितरकों की सूची देखने के लिए डीलर खोजें सेक्शन में अपना पिनकोड दर्ज करें।',
      category: 'Distributors',
    },
  ];

  for (let i = 0; i < faqs.length; i++) {
    await prisma.faq.upsert({
      where: { id: `faq-${i + 1}` },
      update: {},
      create: {
        id: `faq-${i + 1}`,
        ...faqs[i],
        displayOrder: i,
      },
    });
  }
  console.log('✅ FAQs created');

  // Create CMS pages
  const pages = [
    {
      slug: 'terms',
      title: 'Terms of Service',
      titleHi: 'सेवा की शर्तें',
      content: '<h1>Terms of Service</h1><p>Welcome to Agrio India. By using our services, you agree to these terms...</p>',
      contentHi: '<h1>सेवा की शर्तें</h1><p>एग्रियो इंडिया में आपका स्वागत है। हमारी सेवाओं का उपयोग करके, आप इन शर्तों से सहमत हैं...</p>',
    },
    {
      slug: 'privacy-policy',
      title: 'Privacy Policy',
      titleHi: 'गोपनीयता नीति',
      content: `
<div class="space-y-6">
  <h2 class="text-2xl font-bold">1. Introduction</h2>
  <p>Welcome to Agrio India Crop Sciences. This Privacy Policy outlines how we collect, use, and protect your personal information when you use our website, mobile application, and services.</p>

  <h2 class="text-2xl font-bold">2. Information We Collect</h2>
  <p>We collect information to provide better agricultural solutions to you:</p>
  <ul class="list-disc pl-5">
    <li><strong>Personal Information:</strong> Name, phone number, email address, physical address, and pin code.</li>
    <li><strong>Farm Data:</strong> Details about your crops and farming preferences.</li>
    <li><strong>Device & Usage Data:</strong> Device identifiers (FCM tokens), app usage statistics, and interaction logs.</li>
    <li><strong>Location Data:</strong> Based on your pin code to connect you with nearby distributors.</li>
  </ul>

  <h2 class="text-2xl font-bold">3. How We Use Your Information</h2>
  <p>Your information is used for the following purposes:</p>
  <ul class="list-disc pl-5">
    <li>To provide and improve our products and services.</li>
    <li>To manage your account, coupons, and reward redemptions.</li>
    <li>To connect you with local authorized dealers and distributors.</li>
    <li>To send important notifications via push notifications, SMS, or email.</li>
    <li>To provide customer support and respond to your inquiries.</li>
  </ul>

  <h2 class="text-2xl font-bold">4. Information Sharing</h2>
  <p>We do not sell your personal data. We may share necessary information with authorized dealers for verifying and processing reward claims, or when required by law to comply with legal obligations.</p>

  <h2 class="text-2xl font-bold">5. Security of Your Data</h2>
  <p>We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>

  <h2 class="text-2xl font-bold">6. Your Rights & Account Deletion</h2>
  <p>You have the right to access, update, or delete your personal information. You can request account deletion directly through our mobile application's settings or by contacting our support team. Upon account deletion, your personal data will be securely removed from our systems.</p>

  <h2 class="text-2xl font-bold">7. Contact Us</h2>
  <p>If you have any questions or concerns about this Privacy Policy, please contact us at:</p>
  <p>Email: support@agrioindia.com<br>Phone: +91 1800 123 4567</p>
</div>
`,
      contentHi: `
<div class="space-y-6">
  <h2 class="text-2xl font-bold">1. परिचय</h2>
  <p>एग्रियो इंडिया क्रॉप साइंसेज मेंাপন্ন आपका स्वागत है। यह गोपनीयता नीति बताती है कि जब आप हमारी वेबसाइट, मोबाइल एप्लिकेशन और सेवाओं का उपयोग करते हैं तो हम आपकी व्यक्तिगत जानकारी कैसे एकत्र, उपयोग और सुरक्षित करते हैं।</p>

  <h2 class="text-2xl font-bold">2. हम कौन सी जानकारी एकत्र करते हैं</h2>
  <p>हम आपको बेहतर कृषि समाधान प्रदान करने के लिए जानकारी एकत्र करते हैं:</p>
  <ul class="list-disc pl-5">
    <li><strong>व्यक्तिगत जानकारी:</strong> नाम, फोन नंबर, ईमेल पता, भौतिक पता और पिन कोड।</li>
    <li><strong>फार्म डेटा:</strong> आपकी फसलों और खेती की प्राथमिकताओं के बारे में विवरण।</li>
    <li><strong>डिवाइस और उपयोग डेटा:</strong> डिवाइस पहचानकर्ता (FCM टोकन), ऐप उपयोग आंकड़े और इंटरैक्शन लॉग।</li>
    <li><strong>स्थान डेटा:</strong> आपको आस-पास के वितरकों से जोड़ने के लिए आपके पिन कोड के आधार पर।</li>
  </ul>

  <h2 class="text-2xl font-bold">3. हम आपकी जानकारी का उपयोग कैसे करते हैं</h2>
  <p>आपकी जानकारी का उपयोग निम्नलिखित उद्देश्यों के लिए किया जाता है:</p>
  <ul class="list-disc pl-5">
    <li>हमारे उत्पादों और सेवाओं को प्रदान करने और बेहतर बनाने के लिए।</li>
    <li>आपके खाते, कूपन और इनाम मोचन (रिडेम्प्शन) को प्रबंधित करने के लिए।</li>
    <li>आपको स्थानीय अधिकृत डीलरों और वितरकों से जोड़ने के लिए।</li>
    <li>पुश नोटिफिकेशन, एसएमएस या ईमेल के माध्यम से महत्वपूर्ण सूचनाएं भेजने के लिए।</li>
    <li>ग्राहक सहायता प्रदान करने और आपकी पूछताछ का उत्तर देने के लिए।</li>
  </ul>

  <h2 class="text-2xl font-bold">4. जानकारी साझा करना</h2>
  <p>हम आपका व्यक्तिगत डेटा नहीं बेचते हैं। हम इनाम दावों को सत्यापित करने और संसाधित करने के लिए अधिकृत डीलरों के साथ आवश्यक जानकारी साझा कर सकते हैं, या जब कानूनी दायित्वों का पालन करने के लिए कानून द्वारा आवश्यक हो।</p>

  <h2 class="text-2xl font-bold">5. आपके डेटा की सुरक्षा</h2>
  <p>हम आपकी व्यक्तिगत जानकारी को अनधिकृत पहुंच, परिवर्तन, प्रकटीकरण या विनाश से बचाने के लिए उचित तकनीकी और संगठनात्मक सुरक्षा उपाय लागू करते हैं।</p>

  <h2 class="text-2xl font-bold">6. आपके अधिकार और खाता हटाना</h2>
  <p>आपको अपनी व्यक्तिगत जानकारी तक पहुंचने, अपडेट करने या हटाने का अधिकार है। आप सीधे हमारे मोबाइल एप्लिकेशन की सेटिंग के माध्यम से या हमारी सहायता टीम से संपर्क करके खाता हटाने का अनुरोध कर सकते हैं। खाता हटाए जाने पर, आपका व्यक्तिगत डेटा हमारे सिस्टम से सुरक्षित रूप से हटा दिया जाएगा।</p>

  <h2 class="text-2xl font-bold">7. हमसे संपर्क करें</h2>
  <p>यदि इस गोपनीयता नीति के बारे में आपके कोई प्रश्न या चिंताएं हैं, तो कृपया हमसे संपर्क करें:</p>
  <p>ईमेल: support@agrioindia.com<br>फोन: +91 1800 123 4567</p>
</div>
`,
    },
    {
      slug: 'about',
      title: 'About Us',
      titleHi: 'हमारे बारे में',
      content: '<h1>About Agrio India</h1><p>Agrio India is a leading agricultural solutions provider...</p>',
      contentHi: '<h1>एग्रियो इंडिया के बारे में</h1><p>एग्रियो इंडिया एक अग्रणी कृषि समाधान प्रदाता है...</p>',
    },
  ];

  for (const page of pages) {
    await prisma.cmsPage.upsert({
      where: { slug: page.slug },
      update: {},
      create: page,
    });
  }
  console.log('✅ CMS pages created');

  // Create system config
  const configs = [
    { key: 'android_min_version', value: '1.0.0', type: 'STRING' as const },
    { key: 'android_latest_version', value: '1.0.0', type: 'STRING' as const },
    { key: 'ios_min_version', value: '1.0.0', type: 'STRING' as const },
    { key: 'ios_latest_version', value: '1.0.0', type: 'STRING' as const },
    { key: 'force_update', value: 'false', type: 'BOOLEAN' as const },
    { key: 'support_email', value: 'support@agrioindia.com', type: 'STRING' as const },
    { key: 'support_phone', value: '+91 1800 123 4567', type: 'STRING' as const },
    { key: 'whatsapp_number', value: '+91 9123456789', type: 'STRING' as const },
    { key: 'scan_enabled', value: 'true', type: 'BOOLEAN' as const },
    { key: 'shop_enabled', value: 'false', type: 'BOOLEAN' as const },
    { key: 'referral_enabled', value: 'true', type: 'BOOLEAN' as const },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }
  console.log('✅ System config created');

  // Create sample pincode data
  const pincodes = [
    { pincode: '400001', state: 'Maharashtra', district: 'Mumbai', area: 'GPO' },
    { pincode: '110001', state: 'Delhi', district: 'Central Delhi', area: 'Connaught Place' },
    { pincode: '560001', state: 'Karnataka', district: 'Bangalore', area: 'GPO' },
    { pincode: '600001', state: 'Tamil Nadu', district: 'Chennai', area: 'GPO' },
    { pincode: '700001', state: 'West Bengal', district: 'Kolkata', area: 'GPO' },
    { pincode: '226001', state: 'Uttar Pradesh', district: 'Lucknow', area: 'Hazratganj' },
    { pincode: '141001', state: 'Punjab', district: 'Ludhiana', area: 'Civil Lines' },
    { pincode: '302001', state: 'Rajasthan', district: 'Jaipur', area: 'GPO' },
  ];

  for (const pc of pincodes) {
    await prisma.pincodeData.upsert({
      where: { pincode: pc.pincode },
      update: {},
      create: pc,
    });
  }
  console.log('✅ Pincode data created');

  console.log('🎉 Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

