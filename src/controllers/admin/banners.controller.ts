import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess } from '../../utils/response';
import { AdminRequest } from '../../types';

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
        sendSuccess(res, banners);
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
        const {
            section,
            imageUrl,
            imageUrlHi,
            title,
            linkType,
            linkValue,
            displayOrder,
            startDate,
            endDate,
            isActive
        } = req.body;

        const banner = await prisma.appBanner.create({
            data: {
                section,
                imageUrl,
                imageUrlHi,
                title,
                linkType: linkType || 'NONE',
                linkValue,
                displayOrder: displayOrder || 0,
                startDate: startDate ? new Date(startDate) : null,
                endDate: endDate ? new Date(endDate) : null,
                isActive: isActive !== undefined ? isActive : true,
            },
        });

        sendSuccess(res, banner, 'Banner created successfully');
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
        const data = req.body;

        // Convert dates if provided
        if (data.startDate) data.startDate = new Date(data.startDate);
        if (data.endDate) data.endDate = new Date(data.endDate);

        const banner = await prisma.appBanner.update({
            where: { id },
            data,
        });

        sendSuccess(res, banner, 'Banner updated successfully');
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
