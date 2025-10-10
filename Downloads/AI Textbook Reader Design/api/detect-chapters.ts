// Vercel Serverless Function for Chapter Detection
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface DetectChaptersRequest {
  textbookId: string;
}

interface Chapter {
  chapter_number: number;
  title: string;
  page_start: number;
  page_end: number;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: DetectChaptersRequest = await req.json();
    const { textbookId } = body;

    console.log('[Detect Chapters] Starting for textbook:', textbookId);

    // Get first 50 pages to analyze structure
    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('page_number, raw_text')
      .eq('textbook_id', textbookId)
      .order('page_number')
      .limit(50);

    if (pagesError) throw pagesError;
    if (!pages || pages.length === 0) {
      throw new Error('No pages found for textbook');
    }

    // Get total page count
    const { count: totalPages } = await supabase
      .from('pages')
      .select('*', { count: 'exact', head: true })
      .eq('textbook_id', textbookId);

    console.log('[Detect Chapters] Analyzing', pages.length, 'pages out of', totalPages);

    // Prepare text sample for analysis
    const pagesText = pages
      .map((p) => `Page ${p.page_number}:\n${p.raw_text.substring(0, 500)}`)
      .join('\n\n---\n\n');

    // Use GROQ to detect chapter structure
    const groqResponse = await fetch(GROQ_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${GROQ_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        messages: [
          {
            role: 'system',
            content: `You are analyzing a textbook to detect chapter boundaries. 
          
Look for patterns like:
- "Chapter 1:", "Chapter 2:", etc.
- "1. Introduction", "2. Methods", etc.
- Large section headings in all caps
- Numbered sections at the start of pages

Return ONLY a JSON object with a chapters array:
{
  "chapters": [
    {"chapter_number": 1, "title": "Introduction", "page_start": 1},
    {"chapter_number": 2, "title": "Methods", "page_start": 15}
  ]
}

If you cannot detect clear chapters, return: {"chapters": []}`,
          },
          {
            role: 'user',
            content: `Analyze these pages and detect chapter boundaries:\n\n${pagesText}`,
          },
        ],
        temperature: 0.1,
        max_tokens: 1000,
      }),
    });

    if (!groqResponse.ok) {
      const errorText = await groqResponse.text();
      throw new Error(`GROQ API error: ${groqResponse.status} - ${errorText}`);
    }

    const groqJson = await groqResponse.json();
    const responseText = groqJson.choices[0]?.message?.content || '{"chapters":[]}';
    console.log('[Detect Chapters] GROQ response:', responseText);

    let detectedChapters: Omit<Chapter, 'page_end'>[] = [];
    try {
      const parsed = JSON.parse(responseText);
      detectedChapters = parsed.chapters || parsed || [];
    } catch (e) {
      console.error('[Detect Chapters] Failed to parse response:', e);
      detectedChapters = [];
    }

    // If no chapters detected, create a single chapter for the whole book
    if (detectedChapters.length === 0) {
      detectedChapters = [
        {
          chapter_number: 1,
          title: 'Complete Textbook',
          page_start: 1,
        },
      ];
    }

    // Calculate page_end for each chapter
    const chaptersWithEnd: Chapter[] = detectedChapters.map((ch, idx) => ({
      ...ch,
      page_end:
        idx < detectedChapters.length - 1
          ? detectedChapters[idx + 1].page_start - 1
          : totalPages || pages[pages.length - 1].page_number,
    }));

    console.log('[Detect Chapters] Detected chapters:', chaptersWithEnd);

    // Store chapters in database
    const chaptersToInsert = chaptersWithEnd.map((ch) => ({
      textbook_id: textbookId,
      chapter_number: ch.chapter_number,
      title: ch.title,
      page_start: ch.page_start,
      page_end: ch.page_end,
    }));

    const { error: insertError } = await supabase
      .from('chapters')
      .insert(chaptersToInsert);

    if (insertError) throw insertError;

    console.log('[Detect Chapters] Successfully stored', chaptersWithEnd.length, 'chapters');

    return new Response(
      JSON.stringify({
        success: true,
        chapters: chaptersWithEnd,
        count: chaptersWithEnd.length,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Detect Chapters] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to detect chapters',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

export const config = {
  runtime: 'edge',
};

