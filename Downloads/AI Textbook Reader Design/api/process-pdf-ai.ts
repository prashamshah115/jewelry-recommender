import type { VercelRequest, VercelResponse } from '@vercel/node';
import { createClient } from '@supabase/supabase-js';

// AI Processing endpoint - generates summaries and questions PER CHAPTER (not per page)
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { textbookId } = req.body;

  if (!textbookId) {
    return res.status(400).json({ error: 'Missing textbookId' });
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    return res.status(500).json({ error: 'Server configuration error: Missing Supabase credentials' });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    console.log(`[AI Processing] Starting for textbook ${textbookId}`);

    // Update AI processing status
    await supabase
      .from('textbooks')
      .update({ 
        ai_processing_status: 'processing',
        ai_processing_started_at: new Date().toISOString()
      })
      .eq('id', textbookId);

    // Fetch all chapters for this textbook
    const { data: chapters, error: chaptersError } = await supabase
      .from('chapters')
      .select('id, chapter_number, title')
      .eq('textbook_id', textbookId)
      .order('chapter_number', { ascending: true });

    if (chaptersError) throw chaptersError;

    if (!chapters || chapters.length === 0) {
      throw new Error('No chapters found for textbook. Run chapter detection first.');
    }

    console.log(`[AI Processing] Processing ${chapters.length} chapters`);

    // Process each chapter
    for (let i = 0; i < chapters.length; i++) {
      const chapter = chapters[i];
      
      try {
        console.log(`[AI Processing] Processing chapter ${chapter.chapter_number}/${chapters.length}: ${chapter.title}`);

        // Call generate-chapter-content endpoint
        const response = await fetch(`${process.env.VERCEL_URL || 'http://localhost:3000'}/api/generate-chapter-content`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ chapterId: chapter.id }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Chapter content generation failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`[AI Processing] Chapter ${chapter.chapter_number} complete - generated ${data.questions_count} questions`);

        // Update progress
        const progress = Math.round(((i + 1) / chapters.length) * 100);
        await supabase
          .from('textbooks')
          .update({ ai_processing_progress: progress })
          .eq('id', textbookId);

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 1000));

      } catch (chapterError) {
        console.error(`[AI Processing] Error on chapter ${chapter.chapter_number}:`, chapterError);
        // Continue with next chapter instead of failing completely
        continue;
      }
    }

    // Mark as completed
    await supabase
      .from('textbooks')
      .update({ 
        ai_processing_status: 'completed',
        ai_processing_completed_at: new Date().toISOString(),
        ai_processing_progress: 100
      })
      .eq('id', textbookId);

    console.log(`[AI Processing] Completed for textbook ${textbookId}`);

    return res.status(200).json({ 
      success: true, 
      textbookId,
      chaptersProcessed: chapters.length,
      message: 'AI processing completed successfully' 
    });

  } catch (error) {
    console.error('[AI Processing] Error:', error);

    // Update status to failed
    await supabase
      .from('textbooks')
      .update({ 
        ai_processing_status: 'failed',
        ai_processing_error: error instanceof Error ? error.message : 'Unknown error'
      })
      .eq('id', textbookId);

    return res.status(500).json({ 
      error: 'Failed to process AI content',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

