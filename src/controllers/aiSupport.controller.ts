import { Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { sendSuccess, sendError } from '../utils/response';
import { AuthenticatedRequest, ErrorCodes } from '../types';
import { aiChatSchema } from '../utils/validation';
import { generateSupportReply } from '../lib/gemini';

// POST /api/v1/support/ai/chat
export const chat = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void | Response> => {
  try {
    const parsed = aiChatSchema.parse(req.body);
    const { message, session_id, channel = 'web', language = 'en' } = parsed;

    // Ensure we have a session
    let sessionId = session_id || null;
    let session =
      sessionId &&
      (await prisma.aiChatSession.findUnique({ where: { id: sessionId } }));

    if (!session) {
      session = await prisma.aiChatSession.create({
        data: {
          userId: req.userId ?? null,
          channel,
        },
      });
      sessionId = session.id;
    }

    // Persist user message
    await prisma.aiChatMessage.create({
      data: {
        sessionId: sessionId as string,
        role: 'user',
        content: message,
      },
    });

    // Extract keywords for better search
    const keywords = message.split(/\s+/).filter(w => w.length > 3);

    // Fetch knowledge snippets
    const [knowledgeEntries, knowledgeFiles] = await Promise.all([
      prisma.aiKnowledgeEntry.findMany({
        where: {
          isActive: true,
          OR: [
            { title: { contains: message, mode: 'insensitive' } },
            { question: { contains: message, mode: 'insensitive' } },
            { answer: { contains: message, mode: 'insensitive' } },
            { tags: { hasSome: keywords } },
          ],
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),
      prisma.aiKnowledgeFile.findMany({
        where: {
          isActive: true,
          OR: [
            { content: { contains: message, mode: 'insensitive' as any } },
            ...keywords.map(kw => ({
              content: { contains: kw, mode: 'insensitive' as any }
            }))
          ]
        },
        take: 3
      })
    ]);

    const knowledgeSnippets = [
      ...knowledgeEntries.map((e: any) => {
        const title = e.title;
        const q = e.question ? `Q: ${e.question}\n` : '';
        const a = `A: ${e.answer}`;
        return `${title}\n${q}${a}`;
      }),
      ...knowledgeFiles.map((f: any) => {
        return `Reference Doc: ${f.fileName}\n${f.content?.substring(0, 2000)}`; // Send a chunk for now
      })
    ];

    // Fetch last few messages for context
    const recentMessages = await prisma.aiChatMessage.findMany({
      where: { sessionId: sessionId as string },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    const messagesForModel = recentMessages.map((m) => ({
      role: (m.role === 'user' ? 'user' : 'model') as 'user' | 'model',
      content: m.content,
    }));

    if (messagesForModel.length === 0) {
      messagesForModel.push({ role: 'user', content: message });
    }

    // Call Gemini
    const reply = await generateSupportReply({
      messages: messagesForModel,
      knowledgeSnippets,
      language,
    });

    // Persist assistant message
    await prisma.aiChatMessage.create({
      data: {
        sessionId: sessionId as string,
        role: 'assistant',
        content: reply,
      },
    });

    sendSuccess(res, {
      session_id: sessionId,
      reply,
    });
  } catch (error) {
    console.error('[AiSupportController] Error:', error);

    if (error instanceof Error && error.message.includes('GEMINI_API_KEY')) {
      return sendError(
        res,
        ErrorCodes.SERVER_ERROR,
        'AI support is not configured. Please contact administrator.',
        500
      );
    }
    next(error);
  }
};

