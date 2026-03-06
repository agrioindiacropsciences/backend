import { Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { AdminRequest, ErrorCodes } from '../../types';
import { uploadToCloudinary, listFromCloudinary, deleteFromCloudinary } from '../../utils/cloudinary';

/**
 * Handle Single File Upload to Cloudinary
 * POST /api/v1/admin/media/upload
 */
export const uploadMedia = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        if (!req.file) {
            return sendError(res, ErrorCodes.VALIDATION_ERROR, 'No file uploaded', 400);
        }

        const folder = (req.body.folder as string) || 'general';
        const result = await uploadToCloudinary(req.file.path, folder);

        sendSuccess(res, {
            url: result.url,
            public_id: result.public_id
        }, 'File uploaded successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * List Media from Cloudinary
 * GET /api/v1/admin/media
 */
export const listMedia = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const folder = (req.query.folder as string) || 'notifications';
        const limit = parseInt(req.query.limit as string) || 20;

        const resources = await listFromCloudinary(folder, limit);

        const media = resources.map((r: any) => ({
            public_id: r.public_id,
            url: r.secure_url,
            created_at: r.created_at,
            format: r.format,
            width: r.width,
            height: r.height
        }));

        sendSuccess(res, media, 'Media retrieved successfully');
    } catch (error) {
        next(error);
    }
};

/**
 * Delete Media from Cloudinary
 * DELETE /api/v1/admin/media/:public_id
 */
export const deleteMedia = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const { public_id } = req.params;

        if (!public_id) {
            return sendError(res, ErrorCodes.VALIDATION_ERROR, 'Public ID is required', 400);
        }

        await deleteFromCloudinary(public_id);

        sendSuccess(res, null, 'Media deleted successfully');
    } catch (error) {
        next(error);
    }
};
