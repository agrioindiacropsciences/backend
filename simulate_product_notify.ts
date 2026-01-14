import { NotificationService } from './src/utils/notification.service';
import './src/lib/firebase'; // Ensure firebase is initialized

async function testAutoProductNotification() {
    console.log('--- Simulating New Product Notification ---');
    try {
        const response = await NotificationService.notifyNewProduct(
            'Super Urea Premium',
            1250,
            'https://res.cloudinary.com/dyumjsohc/image/upload/v1736683833/products/qy66bzv69z7k777zq7zq.jpg'
        );
        console.log('Product notification sent successfully:', response);
    } catch (error: any) {
        console.error('Error sending product notification:', error);
    }
}

testAutoProductNotification();
