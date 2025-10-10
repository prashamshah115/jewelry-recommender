// Vercel Serverless Function for OpenAI Chat
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY! // Server-side key
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface ChatRequest {
  message: string;
  context: {
    pageText?: string;
    summary?: string;
    page: number;
  };
  conversationId: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: ChatRequest = await req.json();
    const { message, context, conversationId } = body;

    // Get user preferences for personalization
    const { data: conversation } = await supabase
      .from('chat_conversations')
      .select('user_id, textbook_id')
      .eq('id', conversationId)
      .single();

    if (!conversation) {
      return new Response('Conversation not found', { status: 404 });
    }

    const { data: preferences } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', conversation.user_id)
      .single();

    // Build system prompt
    const systemPrompt = `You are a helpful tutor assisting with textbook comprehension.

Student Level: ${preferences?.target_level || 'intermediate'}
Student Goal: ${preferences?.learning_goals || 'Understanding the material'}

Current Context (Page ${context.page}):
${context.summary ? `Summary: ${context.summary}\n` : ''}
${context.pageText ? `Content: ${context.pageText.slice(0, 2000)}...` : ''}

Provide clear, helpful responses that align with the student's level and goals.`;

    // Call OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: message },
      ],
      temperature: 0.7,
      max_tokens: 500,
    });

    const response = completion.choices[0]?.message?.content || 'No response generated';

    return new Response(
      JSON.stringify({ response }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[Chat API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process chat request' }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}

export const config = {
  runtime: 'edge',
};

