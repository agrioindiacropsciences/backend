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
export const uploadBufferToCloudinary = async (buffer: Buffer, folder: string = 'agrio_india', filename?: string) => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                public_id: filename,
                resource_type: 'auto', // Use auto to detect PDF correctly
                format: 'pdf',
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    public_id: result?.public_id,
                    url: result?.secure_url,
                });
            }
        );
        uploadStream.end(buffer);
    });
};

export const listFromCloudinary = async (folder: string = 'notifications', maxResults: number = 20) => {
    try {
        const result = await cloudinary.api.resources({
            type: 'upload',
            prefix: folder,
            max_results: maxResults,
            sort_by: 'created_at',
            direction: 'desc',
        });
        return result.resources;
    } catch (error) {
        throw error;
    }
};
