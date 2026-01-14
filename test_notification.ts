import axios from 'axios';

const BASE_URL = 'http://localhost:3001/api/v1';

async function testManualNotification() {
    console.log('--- Testing Manual Notification ---');
    try {
        const response = await axios.post(`${BASE_URL}/fcm/send`, {
            title: 'Test Notification 🚀',
            body: 'This is a manual test notification from the Agrio India backend.',
            imageUrl: 'https://res.cloudinary.com/dyumjsohc/image/upload/v1736683833/products/qy66bzv69z7k777zq7zq.jpg',
            topic: 'all_users'
        });
        console.log('Success:', response.data);
    } catch (error: any) {
        console.error('Error:', error.response?.data || error.message);
    }
}

async function testProductNotification() {
    console.log('\n--- Testing Product Notification (Triggered by adding product) ---');
    // Note: This requires admin authentication. 
    // For the sake of testing, I'll call the NotificationService directly if I were inside the app,
    // but since I'm external, I'll simulate a product creation if I have a token, 
    // OR just call the NotificationService.notifyNewProduct from a separate small script that initializes firebase.
}

testManualNotification();
