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

      // Categorize by key - support both exact keys and prefix matching
      if (config.key.includes('version')) {
        settings.app_version[config.key] = value;
      } else if (config.key === 'support_email' || config.key === 'support_phone' || config.key === 'whatsapp_number' || config.key.includes('email') || config.key.includes('phone') || config.key.includes('whatsapp')) {
        const contactKey = config.key.replace('contact_', '').replace('contact.', '');
        settings.contact[contactKey] = value;
      } else if (config.key.includes('facebook') || config.key.includes('instagram') || config.key.includes('youtube')) {
        settings.social[config.key] = value;
      } else if (config.key === 'scan_enabled' || config.key === 'shop_enabled' || config.key === 'referral_enabled' || config.key.includes('enabled')) {
        settings.feature_flags[config.key] = value;
      } else {
        settings.general[config.key] = value;
      }
    }

    // Ensure expected keys exist with defaults for frontend compatibility
    if (!settings.contact.support_email) settings.contact.support_email = '';
    if (!settings.contact.support_phone) settings.contact.support_phone = '';
    if (!settings.contact.whatsapp_number) settings.contact.whatsapp_number = '';
    if (settings.feature_flags.scan_enabled === undefined) settings.feature_flags.scan_enabled = true;
    if (settings.feature_flags.shop_enabled === undefined) settings.feature_flags.shop_enabled = false;
    if (settings.feature_flags.referral_enabled === undefined) settings.feature_flags.referral_enabled = false;
    if (!settings.general.company_name) settings.general.company_name = 'Agrio India Crop Science';
    if (!settings.general.address) settings.general.address = '';
    if (!settings.general.website_url) settings.general.website_url = '';

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
    const raw = req.body as Record<string, unknown>;
    const updates: Record<string, unknown> = {};

    // Flatten nested objects (contact, feature_flags, general)
    for (const [key, value] of Object.entries(raw)) {
      if (value !== null && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
        for (const [nestedKey, nestedValue] of Object.entries(value as Record<string, unknown>)) {
          updates[nestedKey] = nestedValue;
        }
      } else {
        updates[key] = value;
      }
    }

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

