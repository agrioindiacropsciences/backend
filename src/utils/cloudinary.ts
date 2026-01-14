import cloudinary from '../lib/cloudinary';
import fs from 'fs';

export const uploadToCloudinary = async (filePath: string, folder: string = 'agrio_india') => {
    try {
        const result = await cloudinary.uploader.upload(filePath, {
            folder: folder,
        });

        // Remove file from local storage after successful upload
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        return {
            public_id: result.public_id,
            url: result.secure_url,
        };
    } catch (error) {
        // Attempt to remove file even if upload fails
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
        throw error;
    }
};

export const deleteFromCloudinary = async (public_id: string) => {
    try {
        const result = await cloudinary.uploader.destroy(public_id);
        return result;
    } catch (error) {
        throw error;
    }
};
