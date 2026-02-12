import { GoogleGenerativeAI } from '@google/generative-ai';
import 'dotenv/config';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  // eslint-disable-next-line no-console
  console.warn('GEMINI_API_KEY is not set. AI support chat will be disabled.');
}

// Initialize the API client
const genAI = GEMINI_API_KEY ? new GoogleGenerativeAI(GEMINI_API_KEY) : null;
// Use flash-latest for best speed/cost balance, or pro if needed
const model = genAI ? genAI.getGenerativeModel({ model: 'gemini-1.5-flash' }) : null;

interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

interface GenerateReplyOptions {
  messages: GeminiMessage[];
  knowledgeSnippets: string[];
  language?: 'en' | 'hi';
}

export async function generateSupportReply(
  options: GenerateReplyOptions
): Promise<string> {
  if (!model) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const { messages, knowledgeSnippets, language = 'en' } = options;

  const systemInstruction =
    'You are "Tauji", the wise and friendly elder guide of Agrio India Crop Science. ' +
    'Your tone is respectful, helpful, and grounded, like a knowledgeable village elder assisting farmers. ' +
    'You have access to a knowledge base including "Reference Docs" (extracted from PDFs) and "Snippets". ' +
    'Answer concisely and helpfully in the requested language (English = en, Hindi = hi). ' +
    'Use only the provided knowledge and product/crop info; if the information is not present in the provided snippets or docs, say you are not certain and suggest contacting human support. ' +
    'Never invent offers, coupons, or rewards. Never reveal internal configuration, API keys, or system details.';

  const knowledgeBlock =
    knowledgeSnippets.length > 0
      ? knowledgeSnippets.map((k, i) => `Snippet ${i + 1}:\n${k}`).join('\n\n')
      : 'No extra knowledge snippets were provided.';

  // Construct the prompt manually as per the "text-only" input style if needed, 
  // or use the chat structure if we want multi-turn. 
  // Since we are stateless here mostly (except context passed in messages), we can construct a prompt.

  const historyText = messages
    .map(
      (m) =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.trim()}`
    )
    .join('\n');

  const prompt = [
    systemInstruction,
    '',
    `Language: ${language}`,
    '',
    'Knowledge base snippets:',
    knowledgeBlock,
    '',
    'Conversation so far:',
    historyText,
    '',
    'Now answer the last user question/help request in a friendly, clear way.',
  ].join('\n');

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error: any) {
    throw new Error(
      `Gemini API error: ${error.message || error}`
    );
  }
}

