// Vercel Serverless Function to trigger local model processing
// This is a bridge between frontend and your local model

import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

interface ProcessPageRequest {
  pageId: string;
  textbookId: string;
  userId: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: ProcessPageRequest = await req.json();
    const { pageId, textbookId, userId } = body;

    // Get page data
    const { data: page, error: pageError } = await supabase
      .from('pages')
      .select('*')
      .eq('id', pageId)
      .single();

    if (pageError || !page) {
      return new Response('Page not found', { status: 404 });
    }

    // Get textbook metadata
    const { data: textbook } = await supabase
      .from('textbooks')
      .select('metadata')
      .eq('id', textbookId)
      .single();

    // Get user preferences
    const { data: prefs } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .single();

    // Get previous pages for context
    const { data: previousPages } = await supabase
      .from('pages')
      .select('page_number, ai_processed_content(summary)')
      .eq('textbook_id', textbookId)
      .lt('page_number', page.page_number)
      .order('page_number', { ascending: false })
      .limit(3);

    // Here you would call your local model
    // For now, return instructions
    const localModelEndpoint = process.env.LOCAL_MODEL_ENDPOINT || 'http://localhost:11434';

    return new Response(
      JSON.stringify({
        message: 'Processing triggered',
        instructions: `
          To process this page with your local model:
          
          1. Make sure Ollama/LM Studio is running at: ${localModelEndpoint}
          2. Call the local model with the provided prompts
          3. Store results in ai_processed_content table
          
          Page data: ${JSON.stringify({ page, textbook, prefs, previousPages }, null, 2)}
        `,
        pageId,
        pageText: page.raw_text,
        preferences: prefs,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (error) {
    console.error('[Process Page API] Error:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process page' }),
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

