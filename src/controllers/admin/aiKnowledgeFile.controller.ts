import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { uploadToCloudinary } from '../../utils/cloudinary';
import fs from 'fs';

export const getFiles = async (req: Request, res: Response) => {
    try {
        const files = await prisma.aiKnowledgeFile.findMany({
            orderBy: { createdAt: 'desc' }
        });
        return sendSuccess(res, files, 'AI knowledge files fetched successfully');
    } catch (error: any) {
        return sendError(res, 'FETCH_FILES_ERROR', error.message || 'Failed to fetch files');
    }
};

export const uploadFile = async (req: Request, res: Response) => {
    console.log('--- AI KNOWLEDGE UPLOAD STARTED (V3) ---');
    try {
        if (!req.file) {
            console.error('Upload Error: No file in request');
            return sendError(res, 'NO_FILE', 'No file uploaded', 400);
        }

        const filePath = req.file.path;
        console.log('File received:', req.file.originalname, 'at', filePath);

        // Extract text from PDF
        const dataBuffer = fs.readFileSync(filePath);
        let extractedText = '';

        try {
            console.log('Attempting PDF text extraction...');
            // Use a local variable to avoid any name collision
            const pdfExtractTool = require('pdf-parse');

            console.log('pdf-parse type:', typeof pdfExtractTool);

            const parser = (typeof pdfExtractTool === 'function') ? pdfExtractTool : pdfExtractTool.default;

            if (typeof parser !== 'function') {
                throw new Error('PDF parser not found in module exports');
            }

            const pdfData = await parser(dataBuffer);
            extractedText = pdfData.text;
            console.log('PDF text extracted successfully. Length:', extractedText.length);
        } catch (err: any) {
            console.error('PDF Extraction Error:', err);
            return sendError(res, 'PDF_PARSE_ERROR', 'Failed to extract text from PDF: ' + err.message);
        }

        // Upload to Cloudinary
        console.log('Uploading to Cloudinary...');
        const result = await uploadToCloudinary(filePath, 'ai_knowledge_pdfs');
        console.log('Cloudinary upload success:', result.url);

        const knowledgeFile = await prisma.aiKnowledgeFile.create({
            data: {
                fileName: req.file.originalname,
                fileUrl: result.url,
                fileType: req.file.mimetype,
                content: extractedText,
                isActive: true
            }
        });

        // Cleanup local file
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        console.log('Database record created. ID:', knowledgeFile.id);
        return sendSuccess(res, knowledgeFile, 'PDF uploaded and processed successfully');
    } catch (error: any) {
        console.error('General Upload Error:', error);
        return sendError(res, 'UPLOAD_FILE_ERROR', error.message || 'Failed to upload file');
    }
};

export const deleteFile = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.aiKnowledgeFile.delete({
            where: { id }
        });
        return sendSuccess(res, null, 'File deleted successfully');
    } catch (error: any) {
        return sendError(res, 'DELETE_FILE_ERROR', error.message || 'Failed to delete file');
    }
};

export const toggleFileStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { isActive } = req.body;
        const file = await prisma.aiKnowledgeFile.update({
            where: { id },
            data: { isActive }
        });
        return sendSuccess(res, file, `File ${isActive ? 'activated' : 'deactivated'} successfully`);
    } catch (error: any) {
        return sendError(res, 'TOGGLE_FILE_ERROR', error.message || 'Failed to update file status');
    }
};
