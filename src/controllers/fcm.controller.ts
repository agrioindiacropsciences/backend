import { Request, Response, NextFunction } from 'express';
import { NotificationService } from '../utils/notification.service';
import { registerFcmTokenSchema } from '../utils/validation';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { sendSuccess, sendError } from '../utils/response';
import prisma from '../lib/prisma';

// POST /api/v1/fcm/register - Register/Update FCM token for user
export const registerFcmToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const data = registerFcmTokenSchema.parse(req.body);
    const userId = req.userId!;

    // Check if token already exists for this user
    const existingToken = await prisma.fcmToken.findUnique({
      where: { token: data.fcm_token },
    });

    if (existingToken) {
      // Update existing token
      if (existingToken.userId !== userId) {
        // Token belongs to another user, update ownership
        await prisma.fcmToken.update({
          where: { token: data.fcm_token },
          data: {
            userId,
            deviceId: data.device_id || existingToken.deviceId,
            platform: data.platform || existingToken.platform,
            isActive: true,
          },
        });
      } else {
        // Same user, just update metadata
        await prisma.fcmToken.update({
          where: { token: data.fcm_token },
          data: {
            deviceId: data.device_id || existingToken.deviceId,
            platform: data.platform || existingToken.platform,
            isActive: true,
          },
        });
      }
    } else {
      // Create new token
      await prisma.fcmToken.create({
        data: {
          token: data.fcm_token,
          userId,
          deviceId: data.device_id,
          platform: data.platform,
          isActive: true,
        },
      });
    }

    // Deactivate old tokens for same device (if device_id provided)
    if (data.device_id) {
      await prisma.fcmToken.updateMany({
        where: {
          userId,
          deviceId: data.device_id,
          token: { not: data.fcm_token },
        },
        data: { isActive: false },
      });
    }

    sendSuccess(res, { registered: true }, 'FCM token registered successfully');
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/fcm/unregister - Unregister FCM token
export const unregisterFcmToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { fcm_token } = req.body;

    if (!fcm_token) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'FCM token is required', 400);
    }

    await prisma.fcmToken.updateMany({
      where: {
        token: fcm_token,
        userId: req.userId!,
      },
      data: { isActive: false },
    });

    sendSuccess(res, { unregistered: true }, 'FCM token unregistered successfully');
  } catch (error) {
    next(error);
  }
};

// POST /api/v1/fcm/send - Admin endpoint to send manual notification
export const sendManualNotification = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { title, body, titleHi, messageHi, imageUrl, topic = 'all_users', type, slug, productId, url, userId } = req.body;

    if (!title || !body) {
      return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Title and body are required', 400);
    }

    // Convert all data values to strings (FCM requirement)
    const data: Record<string, string> = {};
    if (imageUrl) data.imageUrl = String(imageUrl);
    if (type) data.type = String(type);
    if (slug) data.slug = String(slug);
    if (productId) data.productId = String(productId);
    if (url) data.url = String(url);
    if (userId) data.userId = String(userId);
    if (titleHi) data.titleHi = String(titleHi);
    if (messageHi) data.messageHi = String(messageHi);

    let response;
    if (userId && topic === 'all_users') {
      // Send to specific user
      const fcmTokens = await prisma.fcmToken.findMany({
        where: {
          userId,
          isActive: true,
        },
        select: { token: true },
      });

      if (fcmTokens.length === 0) {
        return sendError(res, ErrorCodes.NOT_FOUND, 'No active FCM tokens found for user', 404);
      }

      // Send to all tokens of the user
      const results = await Promise.allSettled(
        fcmTokens.map((token: { token: string }) =>
          NotificationService.sendToDevice(token.token, title, body, imageUrl, data, userId)
        )
      );

      const successCount = results.filter((r: PromiseSettledResult<unknown>) => r.status === 'fulfilled').length;
      response = {
        sent_to_tokens: successCount,
        total_tokens: fcmTokens.length,
        results: results.map((r: PromiseSettledResult<unknown>, i: number) => ({
          token: fcmTokens[i].token,
          status: r.status === 'fulfilled' ? 'success' : 'failed',
          error: r.status === 'rejected' ? (r.reason as Error).message : undefined,
        })),
      };
    } else {
      // Send to topic
      response = await NotificationService.sendToTopic(topic, title, body, imageUrl, data);
    }

    sendSuccess(res, {
      message: 'Notification sent successfully',
      response,
    });
  } catch (error) {
    next(error);
  }
};
