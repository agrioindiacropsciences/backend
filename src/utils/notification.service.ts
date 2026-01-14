import { messaging } from '../lib/firebase';
import prisma from '../lib/prisma';

export class NotificationService {
    /**
     * Send notification to a specific FCM token
     */
    static async sendToDevice(token: string, title: string, body: string, imageUrl?: string, data?: any, userId?: string) {
        const message = {
            notification: {
                title,
                body,
                ...(imageUrl && { image: imageUrl }),
            },
            data: data || {},
            token: token,
            android: {
                notification: {
                    image: imageUrl,
                    channelId: 'high_importance_channel'
                },
            },
            apns: {
                payload: {
                    aps: {
                        'mutable-content': 1,
                        category: 'IMAGE_RCV',
                    },
                },
                fcm_options: {
                    image: imageUrl,
                },
            },
        };

        try {
            const response = await messaging.send(message);
            console.log('Successfully sent message:', response);

            // Save to database if userId is provided
            if (userId) {
                await prisma.notification.create({
                    data: {
                        userId,
                        type: this.validateType(data?.type),
                        title,
                        message: body,
                        data: { ...(data || {}), imageUrl },
                        isRead: false
                    }
                });
            }

            return response;
        } catch (error) {
            console.error('Error sending message:', error);
            throw error;
        }
    }

    /**
     * Send notification to a topic (e.g., 'all_users')
     */
    static async sendToTopic(topic: string, title: string, body: string, imageUrl?: string, data?: any) {
        const message = {
            notification: {
                title,
                body,
                ...(imageUrl && { image: imageUrl }),
            },
            android: {
                notification: {
                    image: imageUrl,
                    channelId: 'high_importance_channel'
                },
            },
            apns: {
                payload: {
                    aps: {
                        'mutable-content': 1,
                    },
                },
                fcm_options: {
                    image: imageUrl,
                },
            },
            data: data || {},
            topic: topic,
        };

        try {
            const response = await messaging.send(message);
            console.log('Successfully sent message to topic:', response);

            // If topic is all_users, save notification for all active users in the database
            if (topic === 'all_users') {
                const users = await prisma.user.findMany({
                    where: { isActive: true },
                    select: { id: true }
                });

                console.log(`Saving notification for ${users.length} users in database...`);

                const notificationData = users.map(user => ({
                    userId: user.id,
                    type: this.validateType(data?.type),
                    title,
                    message: body,
                    data: { ...(data || {}), imageUrl },
                    isRead: false
                }));

                await prisma.notification.createMany({
                    data: notificationData
                });
            }

            return response;
        } catch (error) {
            console.error('Error sending message to topic:', error);
            throw error;
        }
    }

    /**
     * Notify about a new product
     */
    static async notifyNewProduct(productName: string, productPrice: number, imageUrl?: string) {
        const title = 'New Product Added! 🌾';
        const body = `Catch our latest addition: ${productName} available now at ₹${productPrice}!`;

        return this.sendToTopic('all_users', title, body, imageUrl, {
            type: 'new_product',
            click_action: 'FLUTTER_NOTIFICATION_CLICK'
        });
    }

    private static validateType(type?: string): any {
        const validTypes = ['REWARD', 'PROMO', 'ORDER', 'SYSTEM'];
        if (type && validTypes.includes(type)) {
            return type;
        }
        return 'PROMO'; // Default for any product/offer links
    }
}
