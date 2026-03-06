import { Response, NextFunction } from 'express';
import { BannerLinkType } from '@prisma/client';
import prisma from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';
import { AdminRequest } from '../../types';
import { uploadToCloudinary } from '../../utils/cloudinary';

// Parse FormData string values (multer sends all fields as strings)
function parseBool(val: unknown): boolean {
    if (val === true || val === false) return val;
    if (typeof val === 'string') return val.toLowerCase() === 'true' || val === '1';
    return true;
}
function parseNum(val: unknown, def: number): number {
    if (typeof val === 'number' && !isNaN(val)) return val;
    if (typeof val === 'string') {
        const n = parseInt(val, 10);
        return isNaN(n) ? def : n;
    }
    return def;
}

// GET /api/v1/admin/banners
export const getAllBanners = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const banners = await prisma.appBanner.findMany({
            orderBy: { displayOrder: 'asc' },
        });
        sendSuccess(res, banners.map(b => ({
            id: b.id,
            section: b.section,
            image_url: b.imageUrl,
            image_url_hi: b.imageUrlHi,
            title: b.title,
            link_type: b.linkType,
            link_value: b.linkValue,
            display_order: b.displayOrder,
            start_date: b.startDate,
            end_date: b.endDate,
            is_active: b.isActive,
        })));
    } catch (error) {
        next(error);
    }
};

// POST /api/v1/admin/banners
export const createBanner = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const raw = req.body;
        let imageUrl = raw.imageUrl || raw.image_url;
        const imageUrlHi = raw.imageUrlHi || raw.image_url_hi;
        const section = (raw.section && String(raw.section).trim()) ? String(raw.section).trim() : 'HOME';
        const title = raw.title != null ? String(raw.title) : undefined;
        const linkTypeVal = String(raw.linkType || raw.link_type || 'NONE').toUpperCase();
        const linkType = ['PRODUCT', 'CATEGORY', 'URL', 'NONE'].includes(linkTypeVal) ? (linkTypeVal as BannerLinkType) : BannerLinkType.NONE;
        const linkValue = raw.linkValue != null || raw.link_value != null ? String(raw.linkValue || raw.link_value || '') : undefined;
        const displayOrder = parseNum(raw.displayOrder ?? raw.display_order, 0);
        const startDate = raw.startDate || raw.start_date;
        const endDate = raw.endDate || raw.end_date;
        const isActive = parseBool(raw.isActive ?? raw.is_active ?? true);

        const imagesData: Record<string, string> = {};
        if (req.files && !Array.isArray(req.files)) {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            if (files['image']?.[0]) {
                const result = await uploadToCloudinary(files['image'][0].path, 'banners');
                imageUrl = result.url;
            }
            if (files['imageHi']?.[0]) {
                const result = await uploadToCloudinary(files['imageHi'][0].path, 'banners');
                imagesData.imageUrlHi = result.url;
            }
        }

        if (!imageUrl) {
            return res.status(400).json({ success: false, error: { code: 'VALIDATION_ERROR', message: 'Image is required' } });
        }

        const banner = await prisma.appBanner.create({
            data: {
                section,
                imageUrl,
                imageUrlHi: imagesData.imageUrlHi || imageUrlHi,
                title,
                linkType,
                linkValue,
                displayOrder,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                isActive,
            },
        });

        sendSuccess(res, {
            id: banner.id,
            section: banner.section,
            image_url: banner.imageUrl,
            image_url_hi: banner.imageUrlHi,
            title: banner.title,
            link_type: banner.linkType,
            link_value: banner.linkValue,
            display_order: banner.displayOrder,
            start_date: banner.startDate,
            end_date: banner.endDate,
            is_active: banner.isActive,
        }, 'Banner created successfully');
    } catch (error) {
        next(error);
    }
};

// PUT /api/v1/admin/banners/:id
export const updateBanner = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const { id } = req.params;
        const raw = req.body;

        const data: Record<string, unknown> = {};

        if (req.files && !Array.isArray(req.files)) {
            const files = req.files as { [fieldname: string]: Express.Multer.File[] };
            if (files['image']?.[0]) {
                const result = await uploadToCloudinary(files['image'][0].path, 'banners');
                data.imageUrl = result.url;
            }
            if (files['imageHi']?.[0]) {
                const result = await uploadToCloudinary(files['imageHi'][0].path, 'banners');
                data.imageUrlHi = result.url;
            }
        }

        if (raw.imageUrl !== undefined) data.imageUrl = raw.imageUrl;
        else if (raw.image_url !== undefined) data.imageUrl = raw.image_url;

        if (raw.imageUrlHi !== undefined) data.imageUrlHi = raw.imageUrlHi;
        else if (raw.image_url_hi !== undefined) data.imageUrlHi = raw.image_url_hi;

        // Explicitly allow clearing Hindi image if they send empty string or 'null'
        if (raw.clearImageHi === 'true') {
            data.imageUrlHi = null;
        }

        if (raw.title !== undefined) data.title = raw.title;
        if (raw.linkType !== undefined || raw.link_type !== undefined) {
            const lt = String(raw.linkType ?? raw.link_type ?? 'NONE').toUpperCase();
            data.linkType = ['PRODUCT', 'CATEGORY', 'URL', 'NONE'].includes(lt) ? (lt as BannerLinkType) : BannerLinkType.NONE;
        }
        if (raw.linkValue !== undefined) data.linkValue = raw.linkValue;
        else if (raw.link_value !== undefined) data.linkValue = raw.link_value;
        if (raw.displayOrder !== undefined || raw.display_order !== undefined) data.displayOrder = parseNum(raw.displayOrder ?? raw.display_order, 0);
        if (raw.startDate !== undefined || raw.start_date !== undefined) data.startDate = new Date(raw.startDate || raw.start_date);
        if (raw.endDate !== undefined || raw.end_date !== undefined) data.endDate = new Date(raw.endDate || raw.end_date);
        if (raw.isActive !== undefined || raw.is_active !== undefined) data.isActive = parseBool(raw.isActive ?? raw.is_active);

        const banner = await prisma.appBanner.update({
            where: { id },
            data,
        });

        sendSuccess(res, {
            id: banner.id,
            section: banner.section,
            image_url: banner.imageUrl,
            image_url_hi: banner.imageUrlHi,
            title: banner.title,
            link_type: banner.linkType,
            link_value: banner.linkValue,
            display_order: banner.displayOrder,
            start_date: banner.startDate,
            end_date: banner.endDate,
            is_active: banner.isActive,
        }, 'Banner updated successfully');
    } catch (error) {
        next(error);
    }
};

// DELETE /api/v1/admin/banners/:id
export const deleteBanner = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const { id } = req.params;
        await prisma.appBanner.delete({
            where: { id },
        });
        sendSuccess(res, undefined, 'Banner deleted successfully');
    } catch (error) {
        next(error);
    }
};
