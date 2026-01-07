import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';
import { AdminRequest } from '../../types';

// GET /api/v1/admin/settings
export const getSettings = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const configs = await prisma.systemConfig.findMany();

    // Group configs by category
    const settings: Record<string, Record<string, unknown>> = {
      app_version: {},
      contact: {},
      social: {},
      feature_flags: {},
      general: {},
    };

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

      // Categorize by key prefix
      if (config.key.includes('version')) {
        settings.app_version[config.key] = value;
      } else if (config.key.includes('email') || config.key.includes('phone') || config.key.includes('whatsapp')) {
        settings.contact[config.key] = value;
      } else if (config.key.includes('facebook') || config.key.includes('instagram') || config.key.includes('youtube')) {
        settings.social[config.key] = value;
      } else if (config.key.includes('enabled')) {
        settings.feature_flags[config.key] = value;
      } else {
        settings.general[config.key] = value;
      }
    }

    sendSuccess(res, settings);
  } catch (error) {
    next(error);
  }
};

// PUT /api/v1/admin/settings
export const updateSettings = async (
  req: AdminRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const updates = req.body;

    // Process each setting update
    for (const [key, value] of Object.entries(updates)) {
      let stringValue: string;
      let type: 'STRING' | 'JSON' | 'BOOLEAN' | 'INTEGER' = 'STRING';

      if (typeof value === 'boolean') {
        stringValue = value.toString();
        type = 'BOOLEAN';
      } else if (typeof value === 'number') {
        stringValue = value.toString();
        type = 'INTEGER';
      } else if (typeof value === 'object') {
        stringValue = JSON.stringify(value);
        type = 'JSON';
      } else {
        stringValue = String(value);
      }

      await prisma.systemConfig.upsert({
        where: { key },
        update: { value: stringValue, type },
        create: { key, value: stringValue, type },
      });
    }

    sendSuccess(res, undefined, 'Settings updated successfully');
  } catch (error) {
    next(error);
  }
};

