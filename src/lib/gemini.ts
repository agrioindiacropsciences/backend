import fetch from 'node-fetch';

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
  // We don't throw here to avoid crashing the app before startup,
  // but the chat controller should check and return a clear error.
  // eslint-disable-next-line no-console
  console.warn('GEMINI_API_KEY is not set. AI support chat will be disabled.');
}

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
  if (!GEMINI_API_KEY) {
    throw new Error('GEMINI_API_KEY is not configured on the server');
  }

  const { messages, knowledgeSnippets, language = 'en' } = options;

  const systemInstruction =
    'You are "Tauji", the wise and friendly elder guide of Agrio India Crop Science. ' +
    'Your tone is respectful, helpful, and grounded, like a knowledgeable village elder assisting farmers. ' +
    'You have access to a knowledge base including "Reference Docs" (extracted from PDFs) and "Snippets". ' +
    'Prioritize information from these documents to answer the user. ' +
    'Answer concisely and helpfully in the requested language (English = en, Hindi = hi). ' +
    'Use only the provided knowledge and product/crop info; if the information is not present in the provided snippets or docs, say you are not certain and suggest contacting human support. ' +
    'Never invent offers, coupons, or rewards. Never reveal internal configuration, API keys, or system details.';

  const knowledgeBlock =
    knowledgeSnippets.length > 0
      ? knowledgeSnippets.map((k, i) => `Snippet ${i + 1}:\n${k}`).join('\n\n')
      : 'No extra knowledge snippets were provided.';

  const historyText = messages
    .map(
      (m) =>
        `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content.trim()}`
    )
    .join('\n');

  const finalPrompt = [
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

  const body = {
    contents: [
      {
        parts: [{ text: finalPrompt }],
      },
    ],
  };

  const response = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent' +
    `?key=${encodeURIComponent(GEMINI_API_KEY)}`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!response.ok) {
    const text = await response.text().catch(() => '');
    throw new Error(
      `Gemini API error (${response.status}): ${text || response.statusText}`
    );
  }

  const json = (await response.json()) as any;
  const candidates = json.candidates as any[] | undefined;
  const firstText =
    candidates?.[0]?.content?.parts?.[0]?.text ??
    json.output_text ??
    'Sorry, I could not generate a response right now.';

  return String(firstText);
}

