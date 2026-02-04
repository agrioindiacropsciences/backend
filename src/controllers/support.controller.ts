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

// GET /api/v1/support/account-deletion - Public account deletion info for Google Play Store
export const getAccountDeletionInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    sendSuccess(res, {
      app_name: 'Agrio India',
      developer: 'Agrio India Crop Science',
      last_updated: '2026-02-02',
      
      title: 'Account Deletion Request',
      title_hi: 'खाता हटाने का अनुरोध',
      
      description: 'You can request deletion of your Agrio India account and associated data at any time.',
      description_hi: 'आप किसी भी समय अपने Agrio India खाते और संबंधित डेटा को हटाने का अनुरोध कर सकते हैं।',
      
      how_to_delete: {
        title: 'How to Delete Your Account',
        title_hi: 'अपना खाता कैसे हटाएं',
        steps: [
          {
            step: 1,
            en: 'Open the Agrio India app on your device',
            hi: 'अपने डिवाइस पर Agrio India ऐप खोलें',
          },
          {
            step: 2,
            en: 'Go to Profile by tapping the profile icon',
            hi: 'प्रोफ़ाइल आइकन पर टैप करके प्रोफ़ाइल पर जाएं',
          },
          {
            step: 3,
            en: 'Scroll down and tap "Delete Account"',
            hi: 'नीचे स्क्रॉल करें और "खाता हटाएं" पर टैप करें',
          },
          {
            step: 4,
            en: 'Read the information and confirm deletion',
            hi: 'जानकारी पढ़ें और हटाने की पुष्टि करें',
          },
          {
            step: 5,
            en: 'Your account will be permanently deleted',
            hi: 'आपका खाता स्थायी रूप से हटा दिया जाएगा',
          },
        ],
      },
      
      data_deleted: {
        title: 'Data That Will Be Deleted',
        title_hi: 'डेटा जो हटाया जाएगा',
        items: [
          {
            type: 'Profile Information',
            type_hi: 'प्रोफ़ाइल जानकारी',
            description: 'Name, email, phone number, address, profile picture',
            description_hi: 'नाम, ईमेल, फोन नंबर, पता, प्रोफ़ाइल फोटो',
            retention_period: 'Deleted immediately',
            retention_period_hi: 'तुरंत हटाया जाता है',
          },
          {
            type: 'Preferences',
            type_hi: 'प्राथमिकताएं',
            description: 'Language settings, notification preferences, crop preferences',
            description_hi: 'भाषा सेटिंग्स, अधिसूचना प्राथमिकताएं, फसल प्राथमिकताएं',
            retention_period: 'Deleted immediately',
            retention_period_hi: 'तुरंत हटाया जाता है',
          },
          {
            type: 'Activity Data',
            type_hi: 'गतिविधि डेटा',
            description: 'QR scan history, rewards, redemptions',
            description_hi: 'QR स्कैन इतिहास, पुरस्कार, रिडेम्पशन',
            retention_period: 'Deleted immediately',
            retention_period_hi: 'तुरंत हटाया जाता है',
          },
          {
            type: 'Support Tickets',
            type_hi: 'सहायता टिकट',
            description: 'All support requests and conversations',
            description_hi: 'सभी सहायता अनुरोध और बातचीत',
            retention_period: 'Deleted immediately',
            retention_period_hi: 'तुरंत हटाया जाता है',
          },
          {
            type: 'Notifications',
            type_hi: 'सूचनाएं',
            description: 'All push notification history',
            description_hi: 'सभी पुश अधिसूचना इतिहास',
            retention_period: 'Deleted immediately',
            retention_period_hi: 'तुरंत हटाया जाता है',
          },
          {
            type: 'Session Data',
            type_hi: 'सत्र डेटा',
            description: 'Login tokens and sessions',
            description_hi: 'लॉगिन टोकन और सत्र',
            retention_period: 'Deleted immediately',
            retention_period_hi: 'तुरंत हटाया जाता है',
          },
        ],
      },
      
      data_retained: {
        title: 'Data That May Be Retained',
        title_hi: 'डेटा जो रखा जा सकता है',
        items: [
          {
            type: 'Anonymized Analytics',
            type_hi: 'गुमनाम विश्लेषण',
            description: 'Aggregated usage statistics that cannot identify you',
            description_hi: 'एकत्रित उपयोग आंकड़े जो आपकी पहचान नहीं कर सकते',
            reason: 'For app improvement and business analytics',
            reason_hi: 'ऐप सुधार और व्यावसायिक विश्लेषण के लिए',
          },
        ],
      },
      
      contact: {
        title: 'Need Help?',
        title_hi: 'मदद चाहिए?',
        description: 'If you cannot access the app or need assistance with account deletion, contact us:',
        description_hi: 'यदि आप ऐप तक नहीं पहुंच सकते या खाता हटाने में सहायता की आवश्यकता है, तो हमसे संपर्क करें:',
        email: 'support@agrioindia.com',
        in_app: 'Help & Support section in the app',
        in_app_hi: 'ऐप में सहायता और समर्थन अनुभाग',
      },
      
      api_endpoint: {
        method: 'DELETE',
        url: '/api/v1/user/account',
        authentication: 'Required (Bearer token)',
        description: 'Authenticated users can call this endpoint to delete their account programmatically',
      },
    });
  } catch (error) {
    next(error);
  }
};