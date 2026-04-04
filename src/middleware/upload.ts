import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists
const uploadDir = 'uploads';
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
        cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    },
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: any) => {
    const allowedMimeTypes = new Set([
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'image/heic',
        'image/heif',
    ]);
    const allowedExtensions = new Set([
        '.jpeg',
        '.jpg',
        '.png',
        '.webp',
        '.heic',
        '.heif',
    ]);

    const normalizedMimeType = file.mimetype.toLowerCase();
    const normalizedExtension = path.extname(file.originalname).toLowerCase();
    const hasAllowedMimeType =
        allowedMimeTypes.has(normalizedMimeType) ||
        normalizedMimeType.startsWith('image/');
    const hasAllowedExtension =
        !normalizedExtension || allowedExtensions.has(normalizedExtension);

    if (hasAllowedMimeType && hasAllowedExtension) {
        return cb(null, true);
    }
    cb(new Error('Only images (jpeg, jpg, png, webp, heic, heif) are allowed'));
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

export const uploadPdf = multer({
    storage,
    fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    },
    limits: {
        fileSize: 20 * 1024 * 1024, // 20MB
    },
});

export const uploadExcel = multer({
    storage: multer.memoryStorage(),
    fileFilter: (_req, file, cb) => {
        if (
            file.mimetype.includes('excel') ||
            file.mimetype.includes('spreadsheetml') ||
            file.originalname.match(/\.(xlsx|xls)$/)
        ) {
            cb(null, true);
        } else {
            cb(new Error('Only Excel files (xlsx, xls) are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});
