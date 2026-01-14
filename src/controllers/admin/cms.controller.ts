import { Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';
import { AdminRequest, ErrorCodes } from '../../types';
import { AppError } from '../../middleware/errorHandler';

// FAQ Management
export const getFaqs = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const faqs = await prisma.faq.findMany({
            orderBy: { displayOrder: 'asc' },
        });
        sendSuccess(res, faqs);
    } catch (error) {
        next(error);
    }
};

export const createFaq = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const { question, questionHi, answer, answerHi, category, displayOrder } = req.body;

        const faq = await prisma.faq.create({
            data: {
                question,
                questionHi,
                answer,
                answerHi,
                category,
                displayOrder: displayOrder || 0,
            },
        });

        sendSuccess(res, faq, 'FAQ created successfully', 201);
    } catch (error) {
        next(error);
    }
};

export const updateFaq = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const { id } = req.params;
        const { question, questionHi, answer, answerHi, category, displayOrder, isActive } = req.body;

        const faq = await prisma.faq.update({
            where: { id },
            data: {
                question,
                questionHi,
                answer,
                answerHi,
                category,
                displayOrder,
                isActive,
            },
        });

        sendSuccess(res, faq, 'FAQ updated successfully');
    } catch (error) {
        next(error);
    }
};

export const deleteFaq = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const { id } = req.params;
        await prisma.faq.delete({ where: { id } });
        sendSuccess(res, undefined, 'FAQ deleted successfully');
    } catch (error) {
        next(error);
    }
};

// Page Management (Privacy Policy, Terms, etc.)
export const getPages = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const pages = await prisma.cmsPage.findMany();
        sendSuccess(res, pages);
    } catch (error) {
        next(error);
    }
};

export const updatePage = async (
    req: AdminRequest,
    res: Response,
    next: NextFunction
): Promise<void | Response> => {
    try {
        const { slug } = req.params;
        const { title, titleHi, content, contentHi, isActive } = req.body;

        const page = await prisma.cmsPage.upsert({
            where: { slug },
            update: {
                title,
                titleHi,
                content,
                contentHi,
                isActive,
            },
            create: {
                slug,
                title,
                titleHi,
                content,
                contentHi,
                isActive: isActive ?? true,
            },
        });

        sendSuccess(res, page, 'Page updated successfully');
    } catch (error) {
        next(error);
    }
};
