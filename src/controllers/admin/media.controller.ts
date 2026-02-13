import { Response, NextFunction } from 'express';
import { sendSuccess, sendError } from '../../utils/response';
import { AdminRequest, ErrorCodes } from '../../types';
import { uploadToCloudinary } from '../../utils/cloudinary';

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
