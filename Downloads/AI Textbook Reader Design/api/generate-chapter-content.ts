// Vercel Serverless Function for Generating Chapter Summaries and Recall Questions
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_API_URL = 'https://api.groq.com/openai/v1/chat/completions';

interface GenerateContentRequest {
  chapterId: string;
}

export default async function handler(req: Request) {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  try {
    const body: GenerateContentRequest = await req.json();
    const { chapterId } = body;

    console.log('[Generate Content] Starting for chapter:', chapterId);

    // Get chapter info
    const { data: chapter, error: chapterError } = await supabase
      .from('chapters')
      .select('*')
      .eq('id', chapterId)
      .single();

    if (chapterError) throw chapterError;
    if (!chapter) throw new Error('Chapter not found');

    // Get all pages in this chapter
    const { data: pages, error: pagesError } = await supabase
      .from('pages')
      .select('raw_text')
      .eq('textbook_id', chapter.textbook_id)
      .gte('page_number', chapter.page_start)
      .lte('page_number', chapter.page_end)
      .order('page_number');

    if (pagesError) throw pagesError;
    if (!pages || pages.length === 0) {
      throw new Error('No pages found for chapter');
    }

    // Combine chapter text (limit to ~8000 tokens / ~30k characters)
    const chapterText = pages
      .map((p) => p.raw_text)
      .join('\n\n')
      .substring(0, 30000);

    console.log('[Generate Content] Processing chapter text:', chapterText.length, 'characters');

    // Generate summary and key concepts using GROQ
    console.log('[Generate Content] Generating summary with GROQ...');
    const summaryResponse = await fetch(GROQ_API_URL, {
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
            content: `You are an expert at summarizing textbook chapters. Create a comprehensive summary in 250-300 words that captures the main ideas, concepts, and conclusions. Then list 5-7 key concepts as bullet points.

Format your response as JSON:
{
  "summary": "Your comprehensive summary here...",
  "key_concepts": ["Concept 1", "Concept 2", ...]
}`,
          },
          {
            role: 'user',
            content: `Summarize this chapter:\n\nChapter ${chapter.chapter_number}: ${chapter.title}\n\n${chapterText}`,
          },
        ],
        temperature: 0.3,
        max_tokens: 800,
      }),
    });

    if (!summaryResponse.ok) {
      const errorText = await summaryResponse.text();
      throw new Error(`GROQ API error: ${summaryResponse.status} - ${errorText}`);
    }

    const summaryJson = await summaryResponse.json();
    const summaryContent = summaryJson.choices[0]?.message?.content || '{}';
    const summaryData = JSON.parse(summaryContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    console.log('[Generate Content] Summary generated');

    // Generate recall questions using GROQ
    console.log('[Generate Content] Generating recall questions with GROQ...');
    const questionsResponse = await fetch(GROQ_API_URL, {
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
            content: `You are an expert at creating educational recall questions. Generate 8-10 questions that test understanding of this chapter. Include both factual and conceptual questions. For each question, provide a clear answer.

Format your response as JSON:
{
  "questions": [
    {"question": "What is...?", "answer": "...", "difficulty": "easy"},
    {"question": "Explain how...?", "answer": "...", "difficulty": "medium"},
    {"question": "Why does...?", "answer": "...", "difficulty": "hard"}
  ]
}

Difficulty levels: easy (factual recall), medium (application/comprehension), hard (analysis/synthesis)`,
          },
          {
            role: 'user',
            content: `Create recall questions for this chapter:\n\nChapter ${chapter.chapter_number}: ${chapter.title}\n\n${chapterText}`,
          },
        ],
        temperature: 0.5,
        max_tokens: 1500,
      }),
    });

    if (!questionsResponse.ok) {
      const errorText = await questionsResponse.text();
      throw new Error(`GROQ API error: ${questionsResponse.status} - ${errorText}`);
    }

    const questionsJson = await questionsResponse.json();
    const questionsContent = questionsJson.choices[0]?.message?.content || '{"questions":[]}';
    const questionsData = JSON.parse(questionsContent.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim());
    console.log('[Generate Content] Generated', questionsData.questions?.length || 0, 'questions');

    // Store summary
    const { error: summaryError } = await supabase
      .from('chapter_summaries')
      .insert({
        chapter_id: chapterId,
        summary_text: summaryData.summary || '',
        key_concepts: summaryData.key_concepts || [],
      });

    if (summaryError) {
      // Try update if insert fails (already exists)
      await supabase
        .from('chapter_summaries')
        .update({
          summary_text: summaryData.summary || '',
          key_concepts: summaryData.key_concepts || [],
        })
        .eq('chapter_id', chapterId);
    }

    // Store recall questions
    if (questionsData.questions && Array.isArray(questionsData.questions)) {
      for (let i = 0; i < questionsData.questions.length; i++) {
        const q = questionsData.questions[i];
        await supabase.from('recall_questions').insert({
          chapter_id: chapterId,
          question: q.question,
          answer: q.answer,
          difficulty: q.difficulty || 'medium',
          order_index: i,
        });
      }
    }

    console.log('[Generate Content] Successfully stored all content');

    return new Response(
      JSON.stringify({
        success: true,
        summary: summaryData.summary,
        key_concepts: summaryData.key_concepts,
        questions_count: questionsData.questions?.length || 0,
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    console.error('[Generate Content] Error:', error);
    return new Response(
      JSON.stringify({
        error: 'Failed to generate chapter content',
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

