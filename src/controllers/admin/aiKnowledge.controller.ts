import { Request, Response } from 'express';
import { prisma } from '../../lib/prisma';
import { sendSuccess, sendError } from '../../utils/response';

// --- Categories ---

export const getCategories = async (req: Request, res: Response) => {
    try {
        const categories = await prisma.aiKnowledgeCategory.findMany({
            include: {
                _count: {
                    select: { entries: true }
                }
            },
            orderBy: { createdAt: 'desc' }
        });
        return sendSuccess(res, categories, 'AI knowledge categories fetched successfully');
    } catch (error: any) {
        return sendError(res, 'FETCH_CATEGORIES_ERROR', error.message || 'Failed to fetch categories');
    }
};

export const createCategory = async (req: Request, res: Response) => {
    try {
        const { name, description, isActive } = req.body;
        const category = await prisma.aiKnowledgeCategory.create({
            data: {
                name,
                description,
                isActive: isActive ?? true
            }
        });
        return sendSuccess(res, category, 'Category created successfully');
    } catch (error: any) {
        return sendError(res, 'CREATE_CATEGORY_ERROR', error.message || 'Failed to create category');
    }
};

export const updateCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, description, isActive } = req.body;
        const category = await prisma.aiKnowledgeCategory.update({
            where: { id },
            data: {
                name,
                description,
                isActive
            }
        });
        return sendSuccess(res, category, 'Category updated successfully');
    } catch (error: any) {
        return sendError(res, 'UPDATE_CATEGORY_ERROR', error.message || 'Failed to update category');
    }
};

export const deleteCategory = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.aiKnowledgeCategory.delete({
            where: { id }
        });
        return sendSuccess(res, null, 'Category deleted successfully');
    } catch (error: any) {
        return sendError(res, 'DELETE_CATEGORY_ERROR', error.message || 'Failed to delete category');
    }
};

// --- Entries ---

export const getEntries = async (req: Request, res: Response) => {
    try {
        const { categoryId, language } = req.query;
        const entries = await prisma.aiKnowledgeEntry.findMany({
            where: {
                ...(categoryId ? { categoryId: categoryId as string } : {}),
                ...(language ? { language: language as string } : {})
            },
            include: {
                category: true
            },
            orderBy: { createdAt: 'desc' }
        });
        return sendSuccess(res, entries, 'AI knowledge entries fetched successfully');
    } catch (error: any) {
        return sendError(res, 'FETCH_ENTRIES_ERROR', error.message || 'Failed to fetch entries');
    }
};

export const createEntry = async (req: Request, res: Response) => {
    try {
        const { title, question, answer, tags, language, categoryId, isActive } = req.body;
        const entry = await prisma.aiKnowledgeEntry.create({
            data: {
                title,
                question,
                answer,
                tags: tags || [],
                language: language || 'en',
                categoryId,
                isActive: isActive ?? true
            }
        });
        return sendSuccess(res, entry, 'Entry created successfully');
    } catch (error: any) {
        return sendError(res, 'CREATE_ENTRY_ERROR', error.message || 'Failed to create entry');
    }
};

export const updateEntry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { title, question, answer, tags, language, categoryId, isActive } = req.body;
        const entry = await prisma.aiKnowledgeEntry.update({
            where: { id },
            data: {
                title,
                question,
                answer,
                tags,
                language,
                categoryId,
                isActive
            }
        });
        return sendSuccess(res, entry, 'Entry updated successfully');
    } catch (error: any) {
        return sendError(res, 'UPDATE_ENTRY_ERROR', error.message || 'Failed to update entry');
    }
};

export const deleteEntry = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.aiKnowledgeEntry.delete({
            where: { id }
        });
        return sendSuccess(res, null, 'Entry deleted successfully');
    } catch (error: any) {
        return sendError(res, 'DELETE_ENTRY_ERROR', error.message || 'Failed to delete entry');
    }
};
