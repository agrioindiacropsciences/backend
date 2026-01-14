import { Request, Response } from 'express';
import { NotificationService } from '../utils/notification.service';

export const sendManualNotification = async (req: Request, res: Response) => {
    try {
        const { title, body, imageUrl, topic = 'all_users', type, slug, productId } = req.body;

        if (!title || !body) {
            return res.status(400).json({ error: 'Title and body are required' });
        }

        const data = {
            ...(imageUrl && { imageUrl }),
            ...(type && { type }),
            ...(slug && { slug }),
            ...(productId && { productId })
        };

        const response = await NotificationService.sendToTopic(topic, title, body, imageUrl, data);

        res.status(200).json({
            message: 'Notification sent successfully',
            firebaseResponse: response
        });
    } catch (error: any) {
        res.status(500).json({
            error: 'Failed to send notification',
            details: error.message
        });
    }
};
