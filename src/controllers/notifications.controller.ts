import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { parsePagination, createPagination, parseBoolean } from '../utils/helpers';

// GET /api/v1/notifications
export const getNotifications = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const userId = req.userId!;
    const { page, limit, skip } = parsePagination(
      req.query.page as string,
      req.query.limit as string
    );

    const type = req.query.type as string | undefined;
    const unreadOnly = parseBoolean(req.query.unread_only as string);

    const where: Record<string, unknown> = { userId };
    
    if (type) {
      where.type = type.toUpperCase();
    }
    
    if (unreadOnly) {
      where.isRead = false;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { userId, isRead: false } }),
    ]);

    sendSuccess(res, {
      notifications: notifications.map(n => ({
        id: n.id,
        type: n.type,
        title: n.title,
        title_hi: n.titleHi,
        message: n.message,
        message_hi: n.messageHi,
        data: n.data,
        is_read: n.isRead,
        created_at: n.createdAt,
      })),
      unread_count: unreadCount,
      pagination: createPagination(total, page, limit),
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/notifications/:id/read
export const markAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { id } = req.params;
    const userId = req.userId!;

    const notification = await prisma.notification.findUnique({
      where: { id },
    });

    if (!notification) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Notification not found', 404);
    }

    if (notification.userId !== userId) {
      return sendError(res, ErrorCodes.FORBIDDEN, 'Access denied', 403);
    }

    await prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });

    sendSuccess(res, undefined, 'Notification marked as read');
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/notifications/read-all
export const markAllAsRead = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const userId = req.userId!;

    await prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });

    sendSuccess(res, undefined, 'All notifications marked as read');
  } catch (error) {
    next(error);
  }
};

