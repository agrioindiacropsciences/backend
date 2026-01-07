import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess } from '../utils/response';

// GET /api/v1/config
export const getAppConfig = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    // Get all system config
    const configs = await prisma.systemConfig.findMany();
    
    // Parse configs into object
    const configMap: Record<string, unknown> = {};
    for (const config of configs) {
      let value: unknown = config.value;
      
      switch (config.type) {
        case 'JSON':
          try {
            value = JSON.parse(config.value);
          } catch {
            value = config.value;
          }
          break;
        case 'BOOLEAN':
          value = config.value === 'true';
          break;
        case 'INTEGER':
          value = parseInt(config.value);
          break;
      }
      
      configMap[config.key] = value;
    }

    // Build response with defaults
    sendSuccess(res, {
      app_version: {
        android_min: configMap['android_min_version'] || '1.0.0',
        android_latest: configMap['android_latest_version'] || '1.0.0',
        ios_min: configMap['ios_min_version'] || '1.0.0',
        ios_latest: configMap['ios_latest_version'] || '1.0.0',
        force_update: configMap['force_update'] || false,
      },
      contact: {
        support_email: configMap['support_email'] || 'support@agrioindia.com',
        support_phone: configMap['support_phone'] || '+91 1800 123 4567',
        whatsapp: configMap['whatsapp_number'] || '+91 9123456789',
      },
      social: {
        facebook: configMap['facebook_url'] || '',
        instagram: configMap['instagram_url'] || '',
        youtube: configMap['youtube_url'] || '',
      },
      feature_flags: {
        scan_enabled: configMap['scan_enabled'] ?? true,
        shop_enabled: configMap['shop_enabled'] ?? false,
        referral_enabled: configMap['referral_enabled'] ?? true,
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/banners
export const getBanners = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const section = req.query.section as string | undefined;
    
    const where: Record<string, unknown> = {
      isActive: true,
      OR: [
        { startDate: null },
        { startDate: { lte: new Date() } },
      ],
      AND: [
        {
          OR: [
            { endDate: null },
            { endDate: { gte: new Date() } },
          ],
        },
      ],
    };

    if (section) {
      where.section = section.toUpperCase();
    }

    const banners = await prisma.appBanner.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    sendSuccess(res, banners.map(banner => ({
      id: banner.id,
      section: banner.section,
      image_url: banner.imageUrl,
      image_url_hi: banner.imageUrlHi,
      title: banner.title,
      link_type: banner.linkType,
      link_value: banner.linkValue,
      display_order: banner.displayOrder,
      is_active: banner.isActive,
    })));
  } catch (error) {
    next(error);
  }
};

