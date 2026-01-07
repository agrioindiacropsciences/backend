import { Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { contactFormSchema } from '../utils/validation';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { generateTicketNumber } from '../utils/helpers';

// POST /api/v1/support/contact
export const submitContactForm = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const data = contactFormSchema.parse(req.body);
    const userId = req.userId; // Optional - may be undefined

    const ticketNumber = generateTicketNumber();

    const ticket = await prisma.supportTicket.create({
      data: {
        ticketNumber,
        userId,
        name: data.name,
        mobile: data.mobile,
        email: data.email || null,
        subject: data.subject,
        message: data.message,
        status: 'OPEN',
        priority: 'MEDIUM',
      },
    });

    sendSuccess(res, {
      ticket_id: ticket.ticketNumber,
      message: "Your message has been received. We'll get back to you soon.",
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/support/faqs
export const getFaqs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const category = req.query.category as string | undefined;

    const where: Record<string, unknown> = { isActive: true };
    if (category) {
      where.category = category;
    }

    const faqs = await prisma.faq.findMany({
      where,
      orderBy: { displayOrder: 'asc' },
    });

    sendSuccess(res, faqs.map(faq => ({
      id: faq.id,
      question: faq.question,
      question_hi: faq.questionHi,
      answer: faq.answer,
      answer_hi: faq.answerHi,
      category: faq.category,
    })));
  } catch (error) {
    next(error);
  }
};

// GET /api/v1/pages/:slug
export const getPage = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const { slug } = req.params;

    const page = await prisma.cmsPage.findUnique({
      where: { slug },
    });

    if (!page || !page.isActive) {
      return sendError(res, ErrorCodes.NOT_FOUND, 'Page not found', 404);
    }

    sendSuccess(res, {
      title: page.title,
      title_hi: page.titleHi,
      content: page.content,
      content_hi: page.contentHi,
      updated_at: page.updatedAt,
    });
  } catch (error) {
    next(error);
  }
};

